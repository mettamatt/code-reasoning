/**
 * Core evaluation functions for prompt assessment
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  PromptScenario,
  ScenarioEvaluation,
  ThoughtData,
  EvaluationScore,
  EvaluationOptions,
  ObjectiveMetrics,
  PROMPT_TEST_SCENARIOS,
} from './types.js';
import { getPaths, getMainFailureReason } from './utils.js';
import { evaluateThoughtChainWithAPI } from '../anthropic-api.js';
import { getObjectiveMetrics } from './automated-metrics.js';

/**
 * Evaluate a thought chain against a scenario using automated evaluation
 */
export async function evaluateThoughtChain(
  scenario: PromptScenario,
  thoughts: ThoughtData[],
  options: EvaluationOptions = {}
): Promise<ScenarioEvaluation> {
  // Get API key
  const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('API key is required for automated evaluation');
  }

  console.log('\n----- AUTOMATED EVALUATION -----');

  // Get objective metrics
  console.log('Calculating objective metrics...');
  const objectiveMetrics = getObjectiveMetrics(thoughts);

  // Log some basic metrics
  console.log('\nThought Chain Analysis:');
  console.log(`- Total thoughts: ${objectiveMetrics.structureMetrics.totalThoughts}`);
  console.log(
    `- Uses revisions: ${objectiveMetrics.structureMetrics.revisionCount > 0 ? 'Yes' : 'No'}`
  );
  console.log(`- Number of branches: ${objectiveMetrics.structureMetrics.branchCount}`);
  console.log(`- Completion status: ${objectiveMetrics.structureMetrics.completionStatus}`);
  console.log(`- Parameter usage score: ${objectiveMetrics.parameterUsageScore}/100`);

  if (objectiveMetrics.validationResults.errors.length > 0) {
    console.log('\nValidation errors:');
    objectiveMetrics.validationResults.errors.forEach(err => console.log(`- ${err}`));
  }

  // Check for automatic failure conditions based on target skill
  let autoFailure = false;
  let autoFailureReason = '';

  if (
    scenario.targetSkill === 'revision' &&
    objectiveMetrics.structureMetrics.revisionCount === 0
  ) {
    autoFailure = true;
    autoFailureReason = 'AUTOMATIC FAILURE: Revision test requires use of is_revision parameter';
    console.log(`\n${autoFailureReason}`);
  } else if (
    scenario.targetSkill === 'branching' &&
    objectiveMetrics.structureMetrics.branchCount === 0
  ) {
    autoFailure = true;
    autoFailureReason = 'AUTOMATIC FAILURE: Branching test requires use of branch_id parameter';
    console.log(`\n${autoFailureReason}`);
  } else if (
    scenario.targetSkill === 'multiple' &&
    objectiveMetrics.structureMetrics.branchCount === 0 &&
    objectiveMetrics.structureMetrics.revisionCount === 0
  ) {
    autoFailure = true;
    autoFailureReason =
      'AUTOMATIC FAILURE: Multiple skills test requires use of both branch_id and is_revision parameters';
    console.log(`\n${autoFailureReason}`);
  } else if (
    scenario.targetSkill === 'parameters' &&
    objectiveMetrics.validationResults.errors.length > 0
  ) {
    autoFailure = true;
    autoFailureReason = 'AUTOMATIC FAILURE: Parameters test requires no validation errors';
    console.log(`\n${autoFailureReason}`);
  }

  if (autoFailure) {
    return createFailureEvaluation(
      scenario,
      thoughts,
      objectiveMetrics,
      options,
      autoFailureReason
    );
  }

  // Run API-based evaluation
  console.log('\nSending to Anthropic API for evaluation...');
  const apiEvaluation = await evaluateThoughtChainWithAPI(apiKey, scenario, thoughts, {
    model: options.model,
    maxTokens: options.maxTokens,
    temperature: options.temperature,
    retryCount: options.retryCount || 2,
  });

  if (!apiEvaluation.success || !apiEvaluation.evaluation) {
    const errorMsg = `API evaluation failed: ${apiEvaluation.error || 'Unknown error'}`;
    console.error(errorMsg);

    if (!options.forceAutomated) {
      throw new Error(errorMsg);
    } else {
      console.log('Continuing with objective metrics only due to forceAutomated option');
      // Create a placeholder evaluation with just objective metrics
      return createPlaceholderEvaluation(scenario, thoughts, objectiveMetrics, options, errorMsg);
    }
  }

  // Convert API evaluation to ScenarioEvaluation format
  const scores: EvaluationScore[] = apiEvaluation.evaluation.scores.map(score => {
    // Find the matching criterion
    const criterion = scenario.evaluationCriteria.find(
      c => c.criterion.toLowerCase().replace(/\s+/g, '-') === score.criterionId
    );

    return {
      criterionId: score.criterionId,
      criterion: criterion?.criterion || score.criterionId,
      score: score.score,
      maxScore: score.maxScore,
      justification: score.justification,
    };
  });

  // Calculate weighted scores - 70% parameter usage, 30% content quality
  const apiScore = apiEvaluation.evaluation.percentageScore;
  const parameterScore = objectiveMetrics.parameterUsageScore;
  const adjustedPercentage = Math.round(apiScore * 0.3 + parameterScore * 0.7);

  // Adjust total score based on the weighted percentage
  const maxPossible = apiEvaluation.evaluation.maxPossibleScore;
  const adjustedTotal = Math.round((adjustedPercentage / 100) * maxPossible);

  // Create the evaluation result with adjusted scores
  const evaluation: ScenarioEvaluation = {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    evaluator: 'automated',
    modelId: options.model || 'claude-3-7-sonnet-20250219',
    promptVariation: options.promptVariation || 'baseline',
    date: new Date().toISOString(),
    thoughtChain: thoughts,
    scores,
    totalScore: adjustedTotal,
    maxPossibleScore: maxPossible,
    percentageScore: adjustedPercentage,
    comments: `${apiEvaluation.evaluation.overallComments}\n\nParameter usage score: ${parameterScore}/100\nContent quality score: ${apiScore}%\nFinal weighted score (30% content, 70% parameters): ${adjustedPercentage}%`,
    objectiveMetrics,
  };

  console.log('\nAutomated evaluation complete.');
  console.log(`Content quality score: ${apiScore}%`);
  console.log(`Parameter usage score: ${parameterScore}%`);
  console.log(`Final weighted score (30% content, 70% parameters): ${adjustedPercentage}%`);

  return evaluation;
}

/**
 * Helper function for creating a placeholder evaluation when API fails
 */
function createPlaceholderEvaluation(
  scenario: PromptScenario,
  thoughts: ThoughtData[],
  objectiveMetrics: ObjectiveMetrics,
  options: EvaluationOptions,
  errorMessage: string
): ScenarioEvaluation {
  // Create placeholder scores based on objectives only
  const scores: EvaluationScore[] = scenario.evaluationCriteria.map(criterion => ({
    criterionId: criterion.criterion.toLowerCase().replace(/\s+/g, '-'),
    criterion: criterion.criterion,
    score: 0, // Zero score due to API failure
    maxScore: criterion.maxScore,
    justification: 'API evaluation failed',
  }));

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    evaluator: 'automated-fallback',
    modelId: options.model || 'claude-3-7-sonnet-20250219',
    promptVariation: options.promptVariation || 'baseline',
    date: new Date().toISOString(),
    thoughtChain: thoughts,
    scores,
    totalScore: 0,
    maxPossibleScore: scenario.evaluationCriteria.reduce((sum, c) => sum + c.maxScore, 0),
    percentageScore: 0,
    comments: `Automated evaluation failed with error: ${errorMessage}. Only objective metrics available.`,
    objectiveMetrics,
  };
}

/**
 * Function for creating an automatic failure evaluation when critical parameters are missing
 */
function createFailureEvaluation(
  scenario: PromptScenario,
  thoughts: ThoughtData[],
  objectiveMetrics: ObjectiveMetrics,
  options: EvaluationOptions,
  reason: string
): ScenarioEvaluation {
  // Create scores with all zeros due to automatic failure
  const scores: EvaluationScore[] = scenario.evaluationCriteria.map(criterion => ({
    criterionId: criterion.criterion.toLowerCase().replace(/\s+/g, '-'),
    criterion: criterion.criterion,
    score: 0,
    maxScore: criterion.maxScore,
    justification: reason,
  }));

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    evaluator: 'automated',
    modelId: options.model || 'claude-3-7-sonnet-20250219',
    promptVariation: options.promptVariation || 'baseline',
    date: new Date().toISOString(),
    thoughtChain: thoughts,
    scores,
    totalScore: 0,
    maxPossibleScore: scenario.evaluationCriteria.reduce((sum, c) => sum + c.maxScore, 0),
    percentageScore: 0,
    comments: reason,
    objectiveMetrics,
  };
}

/**
 * Produce a markdown file summarising ALL stored evaluations in **one table**:
 *
 * | Scenario | Score | Main Failure Reason |
 *
 * If `verbose=true`, the original long report is appended inside a `<details>` block so it
 * does not clutter the default view.
 */
export async function generateReport({ verbose = false }: { verbose?: boolean } = {}): Promise<void> {
  const { evaluationsDir, resultsDir } = getPaths();

  // ── 1 · Gather evaluation JSON files ───────────────────────────────────────────
  const files = fs.readdirSync(resultsDir).filter(f => f.endsWith('.json'));
  if (!files.length) {
    console.log('No evaluations found. Run some evaluations first.');
    return;
  }

  const evals: ScenarioEvaluation[] = files.map(f =>
    JSON.parse(fs.readFileSync(path.join(resultsDir, f), 'utf8'))
  );

  // ── 2 · Build concise markdown ────────────────────────────────────────────────
  let md = '# Prompt-Evaluation Summary\n\n';
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += '| Scenario | Score | Main Failure Reason |\n';
  md += '|----------|-------|----------------------|\n';

  let total = 0;
  evals.forEach(e => {
    total += e.percentageScore;
    md += `| ${e.scenarioName} | ${e.percentageScore}% | ${getMainFailureReason(e)} |\n`;
  });

  const avg = Math.round(total / evals.length);
  md = `**Overall average:** ${avg}%\n\n` + md;

  // ── 3 · Optionally append the verbose narrative under a collapsible section ───
  if (verbose) {
    // Re-use the old implementation by lazy-loading to avoid circular import
    const { generateVerboseReport } = await import('./verbose-report.js');
    md += '\n<details><summary>Full breakdown</summary>\n\n';
    md += generateVerboseReport(evals); // returns a big markdown string
    md += '\n</details>\n';
  }

  // ── 4 · Persist to disk ───────────────────────────────────────────────────────
  const outFile = path.join(evaluationsDir, `prompt-summary-${Date.now()}.md`);
  fs.writeFileSync(outFile, md);
  console.log(`Report written to ${outFile}`);
}
