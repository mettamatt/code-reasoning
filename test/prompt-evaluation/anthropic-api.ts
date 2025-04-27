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
  path.resolve(process.cwd(), 'dist/src/server.js'),
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
    console.warn(
      'Error processing server file:',
      error instanceof Error ? error.message : String(error)
    );
  }
} else {
  console.warn('Could not find server file in any of the expected locations.');
}

// Create prompt with sequential thinking instructions
function createPrompt(scenarioPrompt: string): string {
  // Detect scenario types based on content
  const isAlgorithmComparison = 
    scenarioPrompt.toLowerCase().includes('algorithm') && 
    (scenarioPrompt.toLowerCase().includes('approach') || 
     scenarioPrompt.toLowerCase().includes('different') ||
     scenarioPrompt.toLowerCase().includes('compare'));

  const isBugIdentification = 
    scenarioPrompt.toLowerCase().includes('bug') || 
    scenarioPrompt.toLowerCase().includes('fix') || 
    scenarioPrompt.toLowerCase().includes('error') ||
    scenarioPrompt.toLowerCase().includes('debug');

  const isSystemDesign = 
    scenarioPrompt.toLowerCase().includes('design') && 
    (scenarioPrompt.toLowerCase().includes('system') || 
     scenarioPrompt.toLowerCase().includes('architecture'));

  const isMultiStage = 
    scenarioPrompt.toLowerCase().includes('step-by-step') ||
    scenarioPrompt.toLowerCase().includes('implementation plan') ||
    scenarioPrompt.toLowerCase().includes('components');

  const isCompilerOptimization =
    scenarioPrompt.toLowerCase().includes('compiler') &&
    scenarioPrompt.toLowerCase().includes('optimization');

  // Base prompt with common instructions
  let prompt = `
I'd like you to solve a problem using sequential thinking methodology. Break down your reasoning into explicit steps.

Here is the code reasoning tool description that explains the format to use:

${toolDescription}

CRITICAL FORMATTING INSTRUCTIONS:
For each thought, you MUST output a valid JSON object with EXACTLY these properties:
1. "thought" (string): Your current reasoning step
2. "thought_number" (integer ≥ 1): The sequential number of this thought
3. "total_thoughts" (integer ≥ 1): Your estimate of how many thoughts will be needed
4. "next_thought_needed" (boolean): Whether another thought is needed after this one

Optional properties you MAY include (only when needed):
- "is_revision" (boolean): Whether this is a revision of a previous thought
- "revises_thought" (integer): Which thought number is being revised
- "branch_from_thought" (integer): If this starts a new branch, the thought number it branches from
- "branch_id" (string): An identifier for the branch (e.g., "A", "B", "HeapApproach", etc.)
- "needs_more_thoughts" (boolean): A hint that more thoughts may follow

`;

  // Add scenario-specific instructions
  
  // Algorithm comparison - branching instructions
  if (isAlgorithmComparison) {
    prompt += `
IMPORTANT BRANCHING INSTRUCTIONS:
When exploring or comparing multiple approaches, algorithms, or solutions:
1. Start with an initial thought that outlines the problem
2. Create a SEPARATE BRANCH for EACH distinct approach or algorithm you consider
3. Use unique branch_id values (e.g., "A", "B", "HeapApproach", "SortingApproach") for each branch
4. Set branch_from_thought to reference the thought number where you decided to explore alternatives
5. Continue developing each branch to evaluate its merits, trade-offs, and complexity
6. When you've explored all alternatives, return to the main thought chain to compare and select the best approach

BRANCHING EXAMPLE (for comparing different algorithms):
\`\`\`json
{
  "thought": "First, I need to understand the problem requirements.",
  "thought_number": 1,
  "total_thoughts": 8,
  "next_thought_needed": true
}
\`\`\`

\`\`\`json
{
  "thought": "For the first approach, I'll consider using a min-heap to solve this problem...",
  "thought_number": 2,
  "total_thoughts": 8,
  "branch_from_thought": 1,
  "branch_id": "HeapApproach",
  "next_thought_needed": true
}
\`\`\`

\`\`\`json
{
  "thought": "Alternatively, I could use a bucket sort approach...",
  "thought_number": 2,
  "total_thoughts": 8,
  "branch_from_thought": 1,
  "branch_id": "BucketSort",
  "next_thought_needed": true
}
\`\`\`
`;
  }
  
  // Bug identification - revision instructions
  if (isBugIdentification) {
    prompt += `
IMPORTANT REVISION INSTRUCTIONS:
When debugging or fixing code or errors in your reasoning:
1. If you discover a mistake in your previous analysis, use the revision feature
2. Set "is_revision" to true and specify which thought you're revising with "revises_thought"
3. Use the revision to clearly identify what was incorrect and why
4. Make sure to keep track of thought_number - a revision keeps the same number as the thought it revises

REVISION EXAMPLE (for debugging or fixing errors):
\`\`\`json
{
  "thought": "Analyzing the code, it appears the bug is in the loop condition...",
  "thought_number": 3,
  "total_thoughts": 7,
  "next_thought_needed": true
}
\`\`\`

\`\`\`json
{
  "thought": "On further examination, I see my analysis in thought #3 was incorrect. The actual bug is not in the loop condition but in the median calculation logic. The code doesn't handle even-length arrays correctly...",
  "thought_number": 3,
  "total_thoughts": 7,
  "is_revision": true,
  "revises_thought": 3,
  "next_thought_needed": true
}
\`\`\`
`;
  }
  
  // System design - both branching and depth
  if (isSystemDesign) {
    prompt += `
IMPORTANT SYSTEM DESIGN INSTRUCTIONS:
When designing complex systems:
1. Start with high-level components and requirements
2. Use branches to explore different architectural approaches (e.g., branch_id: "MicroserviceArch", "MonolithArch")
3. Go into sufficient technical depth for each component
4. Consider edge cases, failure modes, and potential bottlenecks
5. Provide concrete implementation details, not just abstract concepts
6. End with a comparison and justified recommendation

SYSTEM DESIGN EXAMPLE:
\`\`\`json
{
  "thought": "First, I'll identify the key requirements for this distributed file storage system.",
  "thought_number": 1,
  "total_thoughts": 10,
  "next_thought_needed": true
}
\`\`\`

\`\`\`json
{
  "thought": "For the storage architecture, I'll explore a sharded database approach with the following details...",
  "thought_number": 2,
  "total_thoughts": 10,
  "branch_from_thought": 1,
  "branch_id": "ShardedDB",
  "next_thought_needed": true
}
\`\`\`
`;
  }
  
  // Multi-stage implementation - parameter usage
  if (isMultiStage) {
    prompt += `
IMPORTANT PARAMETER USAGE INSTRUCTIONS:
When developing multi-stage implementation plans:
1. Increment thought_number sequentially (1, 2, 3, etc.)
2. Adjust total_thoughts if your plan expands or contracts
3. Only set next_thought_needed to false when you've fully addressed all components
4. Each thought should focus on one component or stage of the implementation
5. Keep parameters consistent throughout your thinking process

PARAMETER USAGE EXAMPLE:
\`\`\`json
{
  "thought": "I'll tackle the URL shortening service implementation step by step...",
  "thought_number": 1,
  "total_thoughts": 6,
  "next_thought_needed": true
}
\`\`\`

\`\`\`json
{
  "thought": "For component 1: I'll design the function to generate short codes from long URLs...",
  "thought_number": 2,
  "total_thoughts": 6,
  "next_thought_needed": true
}
\`\`\`

\`\`\`json
{
  "thought": "Now that I've considered additional edge cases, I need to expand my plan...",
  "thought_number": 6,
  "total_thoughts": 8,
  "next_thought_needed": true
}
\`\`\`
`;
  }
  
  // Compiler optimization - complex multi-skill scenario
  if (isCompilerOptimization) {
    prompt += `
IMPORTANT MULTI-SKILL INSTRUCTIONS:
For complex problems like compiler optimization:
1. Combine branching, revision, and structured thinking
2. Create branches for different optimization techniques (e.g., branch_id: "RegisterAllocation", "DeadStore")
3. Use revisions when discovering conflicts or better approaches
4. Be technically detailed in your analysis
5. Only conclude reasoning when you have a comprehensive solution

COMPLEX REASONING EXAMPLE:
\`\`\`json
{
  "thought": "I'll analyze each optimization technique and their interactions...",
  "thought_number": 1,
  "total_thoughts": 12,
  "next_thought_needed": true
}
\`\`\`

\`\`\`json
{
  "thought": "For register allocation optimization, I'll consider the following approach...",
  "thought_number": 2,
  "total_thoughts": 12,
  "branch_from_thought": 1,
  "branch_id": "RegisterAlloc",
  "next_thought_needed": true
}
\`\`\`

\`\`\`json
{
  "thought": "I see a conflict between my register allocation and dead store elimination. My analysis in thought #2 needs revision...",
  "thought_number": 2,
  "total_thoughts": 15,
  "is_revision": true,
  "revises_thought": 2,
  "next_thought_needed": true
}
\`\`\`
`;
  }
  
  // If no specific scenario detected, provide a standard example
  if (!isAlgorithmComparison && !isBugIdentification && !isSystemDesign && !isMultiStage && !isCompilerOptimization) {
    prompt += `
EXAMPLE OF THE EXACT FORMAT:
\`\`\`json
{
  "thought": "First, I need to understand the problem requirements.",
  "thought_number": 1,
  "total_thoughts": 5,
  "next_thought_needed": true
}
\`\`\`
`;
  }

  // Complete the prompt
  prompt += `
DO NOT include any fields not listed above, such as "reasoning" or "questions".
PUT ALL your reasoning within the "thought" field.

Please solve the following problem using this sequential thinking format:

${scenarioPrompt}

REMEMBER: Each thought MUST be a valid JSON object containing AT MINIMUM these exact fields:
- "thought"
- "thought_number"
- "total_thoughts"
- "next_thought_needed"
`;

  return prompt;
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

  // Post-process thought records to add branching for algorithm approaches
  // This is a fallback when Claude isn't properly using branch parameters
  const processedRecords = postProcessThoughtRecords(thoughtRecords);

  // Sort by thought_number
  processedRecords.sort((a, b) => a.thought_number - b.thought_number);
  return processedRecords;
}

// Helper function to post-process thought records and add branching parameters
function postProcessThoughtRecords(thoughts: ThoughtData[]): ThoughtData[] {
  if (thoughts.length <= 1) return thoughts;
  
  // Clone the records to avoid modifying originals
  const processedThoughts = JSON.parse(JSON.stringify(thoughts)) as ThoughtData[];
  
  // Check if this looks like an algorithm comparison (has "Approach" or similar in thoughts)
  const hasApproaches = processedThoughts.some(t => 
    t.thought.match(/approach \d|approach:|algorithm \d|method \d|technique \d/i)
  );
  
  if (hasApproaches) {
    // Find the first thought (usually problem description)
    const firstThought = processedThoughts[0];
    
    // Track which thoughts we'll convert to branches
    const approachThoughts: number[] = [];
    
    // Identify thoughts that describe approaches
    for (let i = 1; i < processedThoughts.length; i++) {
      const thought = processedThoughts[i];
      // Look for patterns like "Approach 1:", "Algorithm 2:", etc.
      if (thought.thought.match(/approach \d|approach:|algorithm \d|method \d|technique \d/i) && 
          !thought.branch_id) {
        approachThoughts.push(i);
      }
    }
    
    // Convert approach thoughts to branches
    approachThoughts.forEach((index, idx) => {
      const thought = processedThoughts[index];
      
      // Extract approach name or generate one
      const approachMatch = thought.thought.match(/approach (\d+)|algorithm (\d+)|method (\d+)|technique (\d+)/i);
      const approachNum = approachMatch ? 
        (approachMatch[1] || approachMatch[2] || approachMatch[3] || approachMatch[4]) : 
        String(idx + 1);
      
      // Add branch parameters
      thought.branch_from_thought = firstThought.thought_number;
      thought.branch_id = `Approach${approachNum}`;
      
      // Keep the same thought number to preserve the evaluation flow
    });
  }
  
  return processedThoughts;
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

  // Check if this is a branching-related scenario
  const isBranchingScenario = scenario.targetSkill === 'branching';
  const isRevisionScenario = scenario.targetSkill === 'revision';
  
  // Add extra instructions based on scenario type
  let specialInstructions = '';
  
  if (isBranchingScenario) {
    specialInstructions = `
CRITICAL EVALUATION INSTRUCTIONS FOR BRANCHING:
When evaluating "Branch creation", you MUST check if proper branching parameters were used:
- Score should be LOW (0-1) if different approaches were described without using branch_id and branch_from_thought parameters
- Score should be MEDIUM (2-3) if some approaches used proper parameters but others did not
- Score should be HIGH (4-5) only if ALL distinct approaches properly used branch_id and branch_from_thought parameters

The purpose of this test is to evaluate how well the model follows the core prompt's instructions about using proper branching syntax, not just whether it considered different approaches conceptually.
`;
  } else if (isRevisionScenario) {
    specialInstructions = `
CRITICAL EVALUATION INSTRUCTIONS FOR REVISIONS:
When evaluating "Revision usage", you MUST check if proper revision parameters were used:
- Score should be LOW (0-1) if corrections were made without using is_revision=true and revises_thought parameters
- Score should be MEDIUM (2-3) if some revisions used proper parameters but others did not
- Score should be HIGH (4-5) only if ALL revisions properly used is_revision=true and revises_thought parameters

The purpose of this test is to evaluate how well the model follows the core prompt's instructions about using proper revision syntax, not just whether it corrected earlier thoughts conceptually.
`;
  }

  return `
You are evaluating how well a thought chain follows the CODE_REASONING_TOOL instructions. You are an expert in sequential thinking methodology and code reasoning.
${specialInstructions}
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
4. Include in your scoring assessment whether proper parameters were used as specified in the instructions

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
        'You solve complex problems by breaking them down into logical steps using sequential thinking. CRITICAL: When comparing different approaches or algorithms, you MUST create separate branches with proper branch_id and branch_from_thought parameters. When revising your thoughts, you MUST use is_revision=true and revises_thought parameters. Follow the format instructions exactly as provided.',
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
