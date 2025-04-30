/**
 * API integration for prompt evaluation
 */
import { ThoughtData, PromptScenario, ApiOptions } from './types.js';
import { getActivePrompt, SYSTEM_PROMPT } from './core-prompts.js';

// Create a formatted prompt
export function createPrompt(scenarioPrompt: string): string {
  const { prompt: toolDescription } = getActivePrompt();

  const prompt = `I'd like you to solve a problem using sequential thinking methodology.
Break down your reasoning into explicit steps.

Here is the code reasoning tool description that explains the format to use:

${toolDescription}

CRITICAL FORMATTING INSTRUCTIONS:
For each thought, you MUST output a valid JSON object with EXACTLY these properties:
1. "thought" (string) – your current reasoning step
2. "thought_number" (integer ≥ 1)
3. "total_thoughts" (integer ≥ 1) – estimated final count
4. "next_thought_needed" (boolean)

Optional properties:
- "is_revision" (boolean)
- "revises_thought" (integer)
- "branch_from_thought" (integer)
- "branch_id" (string)
- "needs_more_thoughts" (boolean)

Please solve the following problem using this sequential thinking format:

${scenarioPrompt}

REMEMBER: Each thought MUST be a valid JSON object containing at minimum the exact fields listed above.`;

  return prompt;
}

// Extract thought records from API response
export function extractThoughtRecords(text: string): ThoughtData[] {
  const JSON_PATTERN =
    /```(?:json)?\s*({[\s\S]*?})\s*```|({[\s\S]*?"next_thought_needed"[\s\S]*?})/g;
  const records: ThoughtData[] = [];
  const matches = text.matchAll(JSON_PATTERN);

  for (const m of matches) {
    const jsonChunk = m[1] || m[2];
    if (!jsonChunk) continue;
    try {
      const data = JSON.parse(jsonChunk);
      if (
        typeof data.thought === 'string' &&
        typeof data.thought_number === 'number' &&
        typeof data.total_thoughts === 'number' &&
        typeof data.next_thought_needed === 'boolean'
      ) {
        records.push(data as ThoughtData);
      }
    } catch {
      // Skip invalid chunks
    }
  }

  return records.sort((a, b) => a.thought_number - b.thought_number);
}

// Call the Anthropic API
export async function callAPI(apiKey: string, scenarioPrompt: string, options: ApiOptions = {}) {
  const defaultOptions = {
    model: process.env.CLAUDE_MODEL || 'claude-3-7-sonnet-20250219',
    maxTokens: parseInt(process.env.MAX_TOKENS || '4000'),
    temperature: parseFloat(process.env.TEMPERATURE || '0.2'),
  };

  const cfg = { ...defaultOptions, ...options };

  try {
    const { Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });

    const resp = await client.messages.create({
      model: cfg.model,
      max_tokens: cfg.maxTokens,
      temperature: cfg.temperature,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: createPrompt(scenarioPrompt) }],
    });

    const raw = resp.content?.[0]?.type === 'text' ? resp.content[0].text : '';
    const thoughtChain = extractThoughtRecords(raw);

    return { success: true, thoughtChain, rawResponse: raw };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// Evaluate solution quality
export async function evaluateQuality(
  apiKey: string,
  scenario: PromptScenario,
  thoughtChain: ThoughtData[],
  options: ApiOptions = {}
) {
  const defaultOptions = {
    model: process.env.CLAUDE_MODEL || 'claude-3-7-sonnet-20250219',
    temperature: 0.2,
  };

  const cfg = { ...defaultOptions, ...options };

  try {
    const { Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });

    const prompt = `You are a RIGOROUS, CRITICAL evaluator assessing the quality of a solution to a coding or system design problem. Be exceptionally demanding in your evaluation.

PROBLEM:
${scenario.problem}

DIFFICULTY LEVEL: ${scenario.difficulty}

SOLUTION TO EVALUATE:
${thoughtChain.map(t => t.thought).join('\n\n')}

SCORING GUIDELINES:
- 90-100%: EXCEPTIONAL solution - virtually flawless, demonstrates expert-level understanding
- 75-89%: STRONG solution - minor improvements possible, but well-executed 
- 60-74%: ADEQUATE solution - correctly solves the problem but with inefficiencies
- 40-59%: FLAWED solution - partially solves the problem but with significant issues
- 0-39%: POOR solution - fundamental misunderstandings or critical failures

BE HARSH AND CRITICAL. Reserve high scores (>85%) ONLY for truly exceptional solutions.

Output your evaluation as a valid JSON object with EXACTLY this structure:
{
  "qualityScore": 67,
  "justification": "Concise 1-2 line explanation focusing on key strengths/weaknesses."
}`;

    const resp = await client.messages.create({
      model: cfg.model,
      max_tokens: 1000,
      temperature: cfg.temperature,
      system:
        'You are an expert, highly critical evaluator of solution quality with exceptionally high standards. Be rigorous and strict in your assessment. Return valid JSON only.',
      messages: [{ role: 'user', content: prompt }],
    });

    const text = resp.content?.[0]?.type === 'text' ? resp.content[0].text : '';
    const json = text.match(/\{[\s\S]*}/)?.[0];
    if (!json) throw new Error('No JSON found in response');

    const evaluation = JSON.parse(json);

    if (typeof evaluation.qualityScore !== 'number') {
      throw new Error('Invalid quality evaluation: missing qualityScore');
    }

    return {
      success: true,
      qualityScore: evaluation.qualityScore as number,
      justification: evaluation.justification as string,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}
