/**
 * Anthropic API integration for prompt evaluation
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ThoughtData, PromptScenario } from './core/index.js';

// Types for evaluation response
interface EvaluationScore {
  criterionId: string;
  score: number;
  maxScore: number;
  justification: string;
}

interface EvaluationResult {
  scores: EvaluationScore[];
  overallComments: string;
  totalScore: number;
  maxPossibleScore: number;
  percentageScore: number;
}

interface EvaluationResponse {
  success: boolean;
  evaluation?: EvaluationResult;
  rawResponse?: string;
  error?: string;
}

// Get CODE_REASONING_TOOL description from server.ts or server.js
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find the tool description from the server file in various possible locations
let toolDescription = '';
const possiblePaths = [
  // When running from TypeScript source
  path.join(__dirname, '../../src/server.ts'),
  // When running from compiled JavaScript
  path.join(__dirname, '../../src/server.js'),
  // Common compiled paths
  path.join(__dirname, '../../../dist/src/server.js'),
  // Absolute paths from project root
  path.resolve(process.cwd(), 'src/server.ts'),
  path.resolve(process.cwd(), 'dist/src/server.js')
];

// Try each possible path until we find the server file
let serverContent = '';
for (const serverPath of possiblePaths) {
  try {
    if (fs.existsSync(serverPath)) {
      serverContent = fs.readFileSync(serverPath, 'utf8');
      // Found a valid file, no need to check others
      break;
    }
  } catch (error) {
    // Silently continue to the next path
  }
}

// Extract the tool description if we found a server file
if (serverContent) {
  try {
    const match = serverContent.match(/description: `([\s\S]+?)`/);
    if (match && match[1]) {
      toolDescription = match[1].trim();
    } else {
      console.warn('Could not extract tool description from server file.');
    }
  } catch (error) {
    console.warn('Error processing server file:', error instanceof Error ? error.message : String(error));
  }
} else {
  console.warn('Could not find server file in any of the expected locations.');
}

// Create prompt with sequential thinking instructions
function createPrompt(scenarioPrompt: string): string {
  return `
I'd like you to solve a problem using sequential thinking methodology. Break down your reasoning into explicit steps.

Here is the code reasoning tool description that explains the format to use:

${toolDescription}

Please solve the following problem using this sequential thinking format:

${scenarioPrompt}

For each thought, output a valid JSON object with the specified properties.
`;
}

// Extract thought records from response
function extractThoughtRecords(responseText: string): ThoughtData[] {
  const thoughtRecords: ThoughtData[] = [];

  // Try multiple patterns to find JSON objects
  const patterns = [
    // Standard JSON objects
    /{[\s\S]*?"thought"[\s\S]*?"thought_number"[\s\S]*?"total_thoughts"[\s\S]*?"next_thought_needed"[\s\S]*?}/g,
    // JSON inside code blocks
    /```(?:json)?\s*({[\s\S]*?"thought"[\s\S]*?"thought_number"[\s\S]*?"total_thoughts"[\s\S]*?"next_thought_needed"[\s\S]*?})\s*```/g,
  ];

  for (const pattern of patterns) {
    const matches = responseText.match(pattern) || [];
    for (const match of matches) {
      try {
        // Extract the JSON part if it's in a code block
        const jsonText = match.startsWith('```')
          ? match.replace(/```(?:json)?\s*([\s\S]*?)\s*```/, '$1')
          : match;

        const data = JSON.parse(jsonText);

        // Validate required fields
        if (
          typeof data.thought === 'string' &&
          typeof data.thought_number === 'number' &&
          typeof data.total_thoughts === 'number' &&
          typeof data.next_thought_needed === 'boolean'
        ) {
          thoughtRecords.push({
            thought: data.thought,
            thought_number: data.thought_number,
            total_thoughts: data.total_thoughts,
            next_thought_needed: data.next_thought_needed,
            is_revision: data.is_revision,
            revises_thought: data.revises_thought,
            branch_from_thought: data.branch_from_thought,
            branch_id: data.branch_id,
            needs_more_thoughts: data.needs_more_thoughts,
          });
        }
      } catch (error) {
        console.warn('Failed to parse thought record:', match);
      }
    }
  }

  // Sort by thought_number
  thoughtRecords.sort((a, b) => a.thought_number - b.thought_number);
  return thoughtRecords;
}

// Interface for API options
interface ApiOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  retryCount?: number;
}

/**
 * Create evaluation prompt for Claude to evaluate a thought chain
 */
function createEvaluationPrompt(scenario: PromptScenario, thoughtChain: ThoughtData[]): string {
  // Format the criteria for the prompt
  const formattedCriteria = scenario.evaluationCriteria
    .map((c, i) => `${i + 1}. ${c.criterion} (max ${c.maxScore} points): ${c.description}`)
    .join('\n');

  // Format the CODE_REASONING_TOOL description
  const toolRef =
    toolDescription.length > 0
      ? `\nREFERENCE - CODE_REASONING_TOOL DESCRIPTION:\n${toolDescription.substring(0, 500)}...\n`
      : '';

  return `
You are evaluating how well a thought chain follows the CODE_REASONING_TOOL instructions. You are an expert in sequential thinking methodology and code reasoning.

PROBLEM:
${scenario.problem}

TARGET SKILL: ${scenario.targetSkill}

EVALUATION CRITERIA:
${formattedCriteria}

THOUGHT CHAIN TO EVALUATE:
${JSON.stringify(thoughtChain, null, 2)}
${toolRef}

Your task is to evaluate the thought chain based on the criteria above. For each criterion:
1. Assign a score from 0 to the maximum score
2. Provide a brief justification for your score that highlights specific strengths or weaknesses
3. Be objective and consistent in your scoring

FORMAT YOUR RESPONSE AS A VALID JSON OBJECT:
{
  "scores": [
    {
      "criterionId": "${scenario.evaluationCriteria[0].criterion.toLowerCase().replace(/\s+/g, '-')}",
      "score": number,
      "maxScore": ${scenario.evaluationCriteria[0].maxScore},
      "justification": "Your justification here"
    },
    // Include all criteria
  ],
  "overallComments": "Your overall assessment of the thought chain",
  "totalScore": number,
  "maxPossibleScore": number,
  "percentageScore": number
}

Do not include any text outside the JSON object. Ensure that your JSON is valid and correctly formatted.
`;
}

/**
 * Evaluate a thought chain using the Anthropic API
 */
export async function evaluateThoughtChainWithAPI(
  apiKey: string,
  scenario: PromptScenario,
  thoughtChain: ThoughtData[],
  options: ApiOptions = {}
): Promise<EvaluationResponse> {
  const model = options.model || 'claude-3-7-sonnet-20250219';
  const maxTokens = options.maxTokens || 4000;
  // Lower temperature for more consistent evaluation
  const temperature = options.temperature || 0.2;
  const retryCount = options.retryCount || 2;

  let attempts = 0;

  while (attempts <= retryCount) {
    attempts++;

    try {
      // Create evaluation prompt
      const evaluationPrompt = createEvaluationPrompt(scenario, thoughtChain);

      // Dynamic import of Anthropic SDK
      const { Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey });

      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system:
          'You are an expert at evaluating code-reasoning thought chains. Provide evaluations as valid JSON objects.',
        messages: [{ role: 'user', content: evaluationPrompt }],
      });

      // Safely extract text from response
      let responseText = '';
      if (response.content && response.content.length > 0) {
        const content = response.content[0];
        if ('text' in content) {
          responseText = content.text;
        }
      }

      // Extract JSON using regex in case there's additional text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        if (attempts <= retryCount) {
          console.log(
            `Could not extract JSON from evaluation response. Retry attempt ${attempts}/${retryCount}`
          );
          continue;
        }
        throw new Error('Could not extract JSON from evaluation response');
      }

      let evaluation: EvaluationResult;

      try {
        evaluation = JSON.parse(jsonMatch[0]);
      } catch (parseError: unknown) {
        if (attempts <= retryCount) {
          console.log(
            `Invalid JSON in evaluation response. Retry attempt ${attempts}/${retryCount}`
          );
          continue;
        }
        throw new Error(
          `Invalid JSON in evaluation response: ${parseError instanceof Error ? parseError.message : String(parseError)}`
        );
      }

      // Validate evaluation structure
      if (!evaluation.scores || !Array.isArray(evaluation.scores)) {
        if (attempts <= retryCount) {
          console.log(
            `Invalid evaluation result structure. Retry attempt ${attempts}/${retryCount}`
          );
          continue;
        }
        throw new Error('Invalid evaluation result structure');
      }

      // Validate that all criteria have been evaluated
      if (evaluation.scores.length !== scenario.evaluationCriteria.length) {
        if (attempts <= retryCount) {
          console.log(
            `Incomplete evaluation: expected ${scenario.evaluationCriteria.length} criteria, got ${evaluation.scores.length}. Retry attempt ${attempts}/${retryCount}`
          );
          continue;
        }
        throw new Error(
          `Incomplete evaluation: expected ${scenario.evaluationCriteria.length} criteria, got ${evaluation.scores.length}`
        );
      }

      // Successfully processed evaluation
      return {
        success: true,
        evaluation,
        rawResponse: responseText,
      };
    } catch (error: unknown) {
      if (attempts <= retryCount) {
        console.log(
          `API error: ${error instanceof Error ? error.message : String(error)}. Retry attempt ${attempts}/${retryCount}`
        );
        // Add exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts - 1)));
        continue;
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // If we reach here, all retry attempts failed
  return {
    success: false,
    error: `Failed after ${retryCount} retry attempts`,
  };
}

// Send scenario to Claude and extract thought chain
export async function evaluateWithAPI(apiKey: string, scenario: string, options: ApiOptions = {}) {
  const model = options.model || 'claude-3-7-sonnet-20250219';
  const maxTokens = options.maxTokens || 8000;
  const temperature = options.temperature || 0.7;

  try {
    // Dynamic import of Anthropic SDK
    const { Anthropic } = await import('@anthropic-ai/sdk');

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system:
        'You solve complex problems by breaking them down into logical steps using sequential thinking.',
      messages: [{ role: 'user', content: createPrompt(scenario) }],
    });

    // Safely extract text from response
    let responseText = '';
    if (response.content && response.content.length > 0) {
      const content = response.content[0];
      if ('text' in content) {
        responseText = content.text;
      }
    }

    const thoughtChain = extractThoughtRecords(responseText);

    return {
      success: true,
      thoughtChain,
      rawResponse: responseText,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
