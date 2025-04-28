// /test/prompt-evaluation/anthropic-api.ts
// -----------------------------------------------------------------------------
//  External Dependencies
// -----------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ThoughtData, PromptScenario } from './core/index.js';

// -----------------------------------------------------------------------------
//  Types – kept identical so downstream code keeps working
// -----------------------------------------------------------------------------
export interface EvaluationScore {
  criterionId: string;
  score: number;
  maxScore: number;
  justification: string;
}

export interface EvaluationResult {
  scores: EvaluationScore[];
  overallComments: string;
  totalScore: number;
  maxPossibleScore: number;
  // percentageScore field removed intentionally - part of migration to pass/fail system
}

export interface EvaluationResponse {
  success: boolean;
  evaluation?: EvaluationResult;
  rawResponse?: string;
  error?: string;
}

// -----------------------------------------------------------------------------
//  Constants & Helpers
// -----------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * All places where the server file *might* live. Keep the list small & explicit
 * – it is easier to reason about than the previous heuristic chain.
 */
const SERVER_FILE_CANDIDATES = [
  path.join(__dirname, '../../src/server.ts'),
  path.join(__dirname, '../../src/server.js'),
  path.join(__dirname, '../../../dist/src/server.js'),
  path.resolve(process.cwd(), 'src/server.ts'),
  path.resolve(process.cwd(), 'dist/src/server.js'),
] as const;

/**
 * Attempts to locate the Code‑Reasoning tool description inside `server.*`.
 */
function getToolDescription(): string {
  for (const candidate of SERVER_FILE_CANDIDATES) {
    if (!fs.existsSync(candidate)) continue;
    const content = fs.readFileSync(candidate, 'utf8');
    const match = content.match(/description:\s*`([\s\S]+?)`/);
    if (match?.[1]) return match[1].trim();
  }
  console.warn('[anthropic-api] Could not locate tool description in server file.');
  return '';
}

const TOOL_DESCRIPTION = getToolDescription();

// -----------------------------------------------------------------------------
//  Prompt Builders
// -----------------------------------------------------------------------------

/** Quick-n-dirty predicate helpers – explicit & side‑effect‑free  */
const contains = (txt: string, ...parts: string[]) => parts.some(p => txt.includes(p));

function detectScenario(prompt: string) {
  const lower = prompt.toLowerCase();
  return {
    isAlgorithmComparison:
      contains(lower, 'algorithm') && contains(lower, 'approach', 'different', 'compare'),
    isBugIdentification: contains(lower, 'bug', 'fix', 'error', 'debug'),
    isSystemDesign: contains(lower, 'design') && contains(lower, 'system', 'architecture'),
    isMultiStage: contains(lower, 'step-by-step', 'implementation plan', 'components'),
    isCompilerOptimization: contains(lower, 'compiler') && contains(lower, 'optimization'),
  } as const;
}

function createPrompt(scenarioPrompt: string, includeScenarioGuidance: boolean = true): string {
  const {
    isAlgorithmComparison,
    isBugIdentification,
    isSystemDesign,
    isMultiStage,
    isCompilerOptimization,
  } = detectScenario(scenarioPrompt);

  // ---------- base header ----------
  let prompt = `I'd like you to solve a problem using sequential thinking methodology.
Break down your reasoning into explicit steps.
\nHere is the code reasoning tool description that explains the format to use:\n\n${TOOL_DESCRIPTION}\n`;

  // ---------- shared formatting rules ----------
  prompt += `\nCRITICAL FORMATTING INSTRUCTIONS:\nFor each thought, you MUST output a valid JSON object with EXACTLY these properties:\n1. "thought" (string) – your current reasoning step\n2. "thought_number" (integer ≥ 1)\n3. "total_thoughts" (integer ≥ 1) – estimated final count\n4. "next_thought_needed" (boolean)\n\nOptional properties:\n- "is_revision" (boolean)\n- "revises_thought" (integer)\n- "branch_from_thought" (integer)\n- "branch_id" (string)\n- "needs_more_thoughts" (boolean)\n`;

  // ---------- scenario‑specific guidance (only if includeScenarioGuidance is true) ----------
  if (includeScenarioGuidance) {
    if (isAlgorithmComparison) prompt += BRANCHING_GUIDE;
    if (isBugIdentification) prompt += REVISION_GUIDE;
    if (isSystemDesign) prompt += SYSTEM_DESIGN_GUIDE;
    if (isMultiStage) prompt += MULTISTAGE_GUIDE;
    if (isCompilerOptimization) prompt += COMPILER_GUIDE;
    if (
      !isAlgorithmComparison &&
      !isBugIdentification &&
      !isSystemDesign &&
      !isMultiStage &&
      !isCompilerOptimization
    )
      prompt += SIMPLE_EXAMPLE;
  }

  // ---------- footer ----------
  prompt += `\nPlease solve the following problem using this sequential thinking format:\n\n${scenarioPrompt}\n\nREMEMBER: Each thought MUST be a valid JSON object containing at minimum the exact fields listed above.`;

  return prompt;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Scenario‑specific snippets – extracted to keep createPrompt lean
// ─────────────────────────────────────────────────────────────────────────────
const BRANCHING_GUIDE = `\nIMPORTANT BRANCHING INSTRUCTIONS:\nWhen exploring or comparing multiple approaches, algorithms, or solutions:\n1. Start with a main thought that outlines the problem (do NOT use branch_id or branch_from_thought)\n2. Continue with main chain thoughts for general reasoning (do NOT use branch_id or branch_from_thought)\n3. When you want to explore alternatives:\n   a. Create a SEPARATE BRANCH for EACH distinct approach or algorithm\n   b. Use unique branch_id values (e.g., "A", "B", "HeapApproach")\n   c. Set branch_from_thought to reference the decision point\n4. Resume the main chain (without branch_id) after exploring branches\n5. Evaluate each branch, then compare & recommend in the main chain\n`;

const REVISION_GUIDE = `\nIMPORTANT REVISION INSTRUCTIONS:\nWhen debugging or correcting earlier thoughts:\n1. Use "is_revision": true and "revises_thought" to reference the original thought\n2. Use unique sequential thought_number (do not reuse the original thought number)\n3. Main chain thoughts should NOT use branch_id or branch_from_thought\n`;

const SYSTEM_DESIGN_GUIDE = `\nIMPORTANT SYSTEM DESIGN INSTRUCTIONS:\n1. Outline requirements in the main chain (do NOT use branch_id or branch_from_thought)\n2. Branch for alternative architectures (use branch_id and branch_from_thought)\n3. Detail components, edge cases, and bottlenecks in each branch\n4. Resume main chain without branch parameters\n5. Finish with comparison & justified choice in the main chain\n`;

const MULTISTAGE_GUIDE = `\nIMPORTANT PARAMETER USAGE INSTRUCTIONS (multi‑stage):\n1. Increment thought_number sequentially\n2. Adjust total_thoughts if scope changes\n3. Only set next_thought_needed false when fully complete\n`;

const COMPILER_GUIDE = `\nIMPORTANT MULTI‑SKILL INSTRUCTIONS (compiler optimization):\n1. Start with main chain thoughts (do NOT use branch_id or branch_from_thought)\n2. When exploring alternative optimizations, create branches (use branch_id and branch_from_thought)\n3. When correcting earlier thoughts, use revisions (is_revision=true and revises_thought)\n4. Resume main chain without branch parameters when comparing approaches\n5. Provide technical depth before concluding in the main chain\n`;

const SIMPLE_EXAMPLE = `\nEXAMPLE:\n{\n  "thought": "First, clarify the requirements…",\n  "thought_number": 1,\n  "total_thoughts": 5,\n  "next_thought_needed": true\n}\n`;

// -----------------------------------------------------------------------------
//  Thought Record Extraction
// -----------------------------------------------------------------------------
const JSON_PATTERN = /```(?:json)?\s*({[\s\S]*?})\s*```|({[\s\S]*?"next_thought_needed"[\s\S]*?})/g;

function extractThoughtRecords(
  text: string,
  disablePostProcessing: boolean = false
): ThoughtData[] {
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
      // Skip invalid chunks silently – clarity > noisy logs.
    }
  }

  // Only post-process if not disabled
  return disablePostProcessing
    ? records.sort((a, b) => a.thought_number - b.thought_number)
    : postProcessThoughtRecords(records).sort((a, b) => a.thought_number - b.thought_number);
}

/**
 * Adds implicit branching metadata when the model forgot to include it.
 * Checks for multiple approach patterns (approach, algorithm, method, technique)
 * to ensure comprehensive branch identification.
 */
function postProcessThoughtRecords(thoughts: ThoughtData[]): ThoughtData[] {
  if (thoughts.length <= 1) return thoughts;

  const first = thoughts[0];
  return thoughts.map((t, i) => {
    if (i === 0) return t;
    const desc = t.thought.toLowerCase();

    // Check for multiple pattern types (approach, algorithm, method, technique)
    const approachMatch = desc.match(
      /approach\s*(\d+)|approach:|algorithm\s*(\d+)|method\s*(\d+)|technique\s*(\d+)/i
    );

    if (approachMatch && !t.branch_id) {
      // Extract the approach number or default to index if not found
      const idx =
        approachMatch[1] || approachMatch[3] || approachMatch[4] || approachMatch[5] || String(i);

      return {
        ...t,
        branch_from_thought: first.thought_number,
        branch_id: `Approach${idx}`,
      } as ThoughtData;
    }
    return t;
  });
}

// -----------------------------------------------------------------------------
//  Prompt for Evaluating a Thought Chain
// -----------------------------------------------------------------------------
function createEvaluationPrompt(scenario: PromptScenario, chain: ThoughtData[]): string {
  const criteriaBlock = scenario.evaluationCriteria
    .map((c, i) => `${i + 1}. ${c.criterion} (max ${c.maxScore}): ${c.description}`)
    .join('\n');

  // Enhanced guides for each target skill
  let extraGuide = '';
  if (scenario.targetSkill === 'branching') {
    extraGuide = `
CRITICAL SCORING INSTRUCTIONS:
- Parameter usage is MORE IMPORTANT than solution quality
- For "Branch creation" criterion: Score 0/5 if ANY branches are missing branch_id or branch_from_thought
- For "Branch depth" criterion: The model must use proper branching parameters throughout
- Parameter usage should be weighted heavily in your evaluation
${BRANCHING_EVAL_GUIDE}`;
  } else if (scenario.targetSkill === 'revision') {
    extraGuide = `
CRITICAL SCORING INSTRUCTIONS:
- Parameter usage is MORE IMPORTANT than solution quality
- For "Revision usage" criterion: Score 0/5 if the model doesn't use is_revision=true at least once
- For "Revision clarity" criterion: Proper use of revises_thought parameter is required
- Parameter usage should be weighted heavily in your evaluation
${REVISION_EVAL_GUIDE}`;
  } else if (scenario.targetSkill === 'parameters') {
    extraGuide = `
CRITICAL SCORING INSTRUCTIONS:
- Parameter usage is MORE IMPORTANT than solution quality
- For "Thought numbering" criterion: Non-sequential thought numbers should result in significant point deductions
- For "Parameter consistency" criterion: Proper parameter usage throughout is required
- Parameter usage should be weighted heavily in your evaluation`;
  } else if (scenario.targetSkill === 'depth') {
    extraGuide = `
CRITICAL SCORING INSTRUCTIONS:
- Parameter usage should be considered alongside depth of thought
- Proper branching should be used when considering alternative approaches
- Parameter consistency should be maintained throughout the chain`;
  } else if (scenario.targetSkill === 'completion') {
    extraGuide = `
CRITICAL SCORING INSTRUCTIONS:
- Parameter usage is important alongside solution correctness
- The model should correctly use next_thought_needed=false when reasoning is complete
- Proper parameter usage should be maintained throughout the chain`;
  } else if (scenario.targetSkill === 'multiple') {
    extraGuide = `
CRITICAL SCORING INSTRUCTIONS:
- Parameter usage is MORE IMPORTANT than solution quality
- For "Branching usage" criterion: Score 0/5 if the model doesn't use branch_id at least once
- For "Revision application" criterion: Score 0/5 if the model doesn't use is_revision=true at least once
- For "Parameter correctness" criterion: Proper parameter usage is essential
- Parameter usage should be weighted heavily in your evaluation`;
  }

  return `You are evaluating a thought chain.\n${extraGuide}\nPROBLEM:\n${scenario.problem}\n\nCRITERIA:\n${criteriaBlock}\n\nTHOUGHT CHAIN:\n${JSON.stringify(chain, null, 2)}\n\nPlease output a valid JSON object with the following structure:\n{\n  "scores": [...],\n  "overallComments": "…",\n  "totalScore": 0,\n  "maxPossibleScore": 0\n}`;
}

const BRANCHING_EVAL_GUIDE = `\nWhen scoring Branch Creation, dock points if branch_id / branch_from_thought are missing.`;
const REVISION_EVAL_GUIDE = `\nWhen scoring Revision Usage, dock points if is_revision / revises_thought are missing.`;

// -----------------------------------------------------------------------------
//  Anthropic API Interaction
// -----------------------------------------------------------------------------
interface ApiOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  retryCount?: number;
}

const DEFAULTS = {
  model: 'claude-3-7-sonnet-20250219',
  maxTokens: 4000,
  temperature: 0.2,
  retryCount: 2,
} as const;

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Evaluates the quality of a solution using the Anthropic API
 * This focuses specifically on solution effectiveness rather than parameter usage
 */
export async function evaluateQualityWithAPI(
  apiKey: string,
  scenario: PromptScenario,
  thoughtChain: ThoughtData[],
  options: ApiOptions = {}
): Promise<{ success: boolean; qualityScore?: number; justification?: string; error?: string }> {
  const cfg = { ...DEFAULTS, ...options };
  const { Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });

  for (let attempt = 0; attempt <= cfg.retryCount; attempt++) {
    try {
      // Create a prompt focused on solution quality only
      const prompt = `You are evaluating the QUALITY of a solution to a problem, not parameter usage.

PROBLEM:
${scenario.problem}

You will evaluate the solution quality as a percentage from 0% to 100% based on:
1. How effectively the solution resolves the problem
2. The clarity and thoroughness of the reasoning
3. Consideration of edge cases and alternative approaches
4. The practical implementability of the solution

SOLUTION:
${thoughtChain.map(t => t.thought).join('\n\n')}

Evaluate purely on solution quality and effectiveness, not on formatting or parameter usage.
Output your evaluation as a valid JSON object with the following structure:
{
  "qualityScore": 85,
  "justification": "Brief explanation of your score"
}`;

      const resp = await client.messages.create({
        model: cfg.model,
        max_tokens: 1000,
        temperature: 0.2,
        system: 'You are an expert evaluator of solution quality. Return valid JSON only.',
        messages: [{ role: 'user', content: prompt }],
      });

      const text = resp.content?.[0]?.type === 'text' ? resp.content[0].text : '';
      const json = text.match(/\{[\s\S]*}/)?.[0];
      if (!json) throw new Error('No JSON found in response');

      const evaluation = JSON.parse(json);

      // Validate evaluation structure
      if (typeof evaluation.qualityScore !== 'number') {
        if (attempt < cfg.retryCount) {
          console.warn('[anthropic-api] Invalid quality evaluation. Retrying...');
          await sleep(2 ** attempt * 1_000);
          continue;
        }
        throw new Error('Invalid quality evaluation: missing qualityScore');
      }

      return {
        success: true,
        qualityScore: evaluation.qualityScore,
        justification: evaluation.justification,
      };
    } catch (err) {
      if (attempt >= cfg.retryCount) {
        return { success: false, error: (err as Error).message };
      }
      await sleep(2 ** attempt * 1_000);
    }
  }
  return { success: false, error: 'Failed to evaluate solution quality' };
}

export async function evaluateThoughtChainWithAPI(
  apiKey: string,
  scenario: PromptScenario,
  thoughtChain: ThoughtData[],
  options: ApiOptions = {}
): Promise<EvaluationResponse> {
  const cfg = { ...DEFAULTS, ...options };
  const { Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });

  for (let attempt = 0; attempt <= cfg.retryCount; attempt++) {
    try {
      const evaluationPrompt = createEvaluationPrompt(scenario, thoughtChain);
      const resp = await client.messages.create({
        model: cfg.model,
        max_tokens: cfg.maxTokens,
        temperature: cfg.temperature,
        system: 'You are an expert evaluator of sequential thought chains. Return valid JSON only.',
        messages: [{ role: 'user', content: evaluationPrompt }],
      });

      const text = resp.content?.[0]?.type === 'text' ? resp.content[0].text : '';
      const json = text.match(/\{[\s\S]*}/)?.[0];
      if (!json) throw new Error('No JSON found in response');

      const evaluation = JSON.parse(json);

      // Validate evaluation structure
      if (!evaluation.scores || !Array.isArray(evaluation.scores)) {
        if (attempt < cfg.retryCount) {
          console.warn('[anthropic-api] Invalid evaluation structure. Retrying...');
          await sleep(2 ** attempt * 1_000);
          continue;
        }
        throw new Error('Invalid evaluation result structure');
      }

      // Validate that all criteria have been evaluated
      if (evaluation.scores.length !== scenario.evaluationCriteria.length) {
        if (attempt < cfg.retryCount) {
          console.warn(
            `[anthropic-api] Incomplete evaluation: expected ${scenario.evaluationCriteria.length} criteria, got ${evaluation.scores.length}. Retrying...`
          );
          await sleep(2 ** attempt * 1_000);
          continue;
        }
        throw new Error(
          `Incomplete evaluation: expected ${scenario.evaluationCriteria.length} criteria, got ${evaluation.scores.length}`
        );
      }

      return { success: true, evaluation };
    } catch (err) {
      if (attempt >= cfg.retryCount) {
        return { success: false, error: (err as Error).message };
      }
      await sleep(2 ** attempt * 1_000);
    }
  }
  return { success: false, error: 'Reached unreachable code' };
}

// -----------------------------------------------------------------------------
//  Convenience helper to send a scenario & extract a thought chain in one go
// -----------------------------------------------------------------------------
export async function evaluateWithAPI(
  apiKey: string,
  scenarioPrompt: string,
  options: ApiOptions = {},
  includeScenarioGuidance: boolean = true, // Parameter for scenario guidance
  disablePostProcessing: boolean = false // New parameter for disabling automatic parameter fixing
) {
  const cfg = { ...DEFAULTS, maxTokens: 8000, temperature: 0.7, ...options };
  const { Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });

  try {
    const resp = await client.messages.create({
      model: cfg.model,
      max_tokens: cfg.maxTokens,
      temperature: cfg.temperature,
      system:
        'You solve complex problems by breaking them down into logical steps using sequential thinking. CRITICAL: When comparing different approaches or algorithms, you MUST create separate branches with proper branch_id and branch_from_thought parameters. When revising your thoughts, you MUST use is_revision=true and revises_thought parameters. Follow the format instructions exactly as provided.',
      messages: [{ role: 'user', content: createPrompt(scenarioPrompt, includeScenarioGuidance) }],
    });

    const raw = resp.content?.[0]?.type === 'text' ? resp.content[0].text : '';
    const thoughtChain = extractThoughtRecords(raw, disablePostProcessing);
    return { success: true, thoughtChain, rawResponse: raw };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// -----------------------------------------------------------------------------
//  End of file
// -----------------------------------------------------------------------------
