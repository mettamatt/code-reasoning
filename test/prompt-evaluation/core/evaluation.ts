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
import { getPaths } from './utils.js';
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
 * Generate a report from all evaluations
 */
export function generateReport(): void {
  const { evaluationsDir, resultsDir } = getPaths();

  // Get all evaluation files
  const evaluationFiles = fs.readdirSync(resultsDir).filter(file => file.endsWith('.json'));

  if (evaluationFiles.length === 0) {
    console.log('No evaluations found. Run some evaluations first.');
    return;
  }

  // Read and parse all evaluations
  const evaluations: ScenarioEvaluation[] = evaluationFiles.map(file => {
    const filePath = path.join(resultsDir, file);
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  });

  // Group by model and prompt variation
  const groupedEvals: Record<string, Record<string, ScenarioEvaluation[]>> = {};

  evaluations.forEach(evaluation => {
    if (!groupedEvals[evaluation.modelId]) {
      groupedEvals[evaluation.modelId] = {};
    }

    if (!groupedEvals[evaluation.modelId][evaluation.promptVariation]) {
      groupedEvals[evaluation.modelId][evaluation.promptVariation] = [];
    }

    groupedEvals[evaluation.modelId][evaluation.promptVariation].push(evaluation);
  });

  // Generate report
  let report = '# Prompt Effectiveness Evaluation Report\n\n';
  report += `Generated on: ${new Date().toISOString()}\n\n`;

  // Overall stats
  report += '## Overall Statistics\n\n';
  report += `Total evaluations: ${evaluations.length}\n`;
  report += `Models evaluated: ${Object.keys(groupedEvals).length}\n`;
  report += `Prompt variations: ${
    Object.values(groupedEvals)
      .flatMap(v => Object.keys(v))
      .filter((v, i, a) => a.indexOf(v) === i).length
  }\n\n`;

  // Model comparisons
  report += '## Model Comparisons\n\n';
  report += '| Model | Prompt Variation | Avg Score | Scenarios Evaluated |\n';
  report += '|-------|-----------------|-----------|---------------------|\n';

  Object.entries(groupedEvals).forEach(([modelId, variations]) => {
    Object.entries(variations).forEach(([variation, evals]) => {
      const avgScore = Math.round(
        evals.reduce((sum, e) => sum + e.percentageScore, 0) / evals.length
      );
      const scenarioCount = evals.length;
      report += `| ${modelId} | ${variation} | ${avgScore}% | ${scenarioCount} |\n`;
    });
  });

  report += '\n';

  // Detailed breakdown by skill
  report += '## Skill Breakdown\n\n';

  const skillTypes = ['branching', 'revision', 'parameters', 'depth', 'completion', 'multiple'];

  skillTypes.forEach(skill => {
    report += `### ${skill.charAt(0).toUpperCase() + skill.slice(1)} Skill\n\n`;
    report += '| Model | Prompt Variation | Avg Score |\n';
    report += '|-------|-----------------|----------|\n';

    Object.entries(groupedEvals).forEach(([modelId, variations]) => {
      Object.entries(variations).forEach(([variation, evals]) => {
        // Filter evaluations for this skill
        const skillEvals = evals.filter(evaluation => {
          const scenario = PROMPT_TEST_SCENARIOS.find(s => s.id === evaluation.scenarioId);
          return (
            scenario?.targetSkill === skill ||
            (skill === 'multiple' && scenario?.targetSkill === 'multiple')
          );
        });

        if (skillEvals.length > 0) {
          const avgScore = Math.round(
            skillEvals.reduce((sum, e) => sum + e.percentageScore, 0) / skillEvals.length
          );
          report += `| ${modelId} | ${variation} | ${avgScore}% |\n`;
        }
      });
    });

    report += '\n';
  });

  // Save report
  const reportPath = path.join(evaluationsDir, `prompt-effectiveness-report-${Date.now()}.md`);
  fs.writeFileSync(reportPath, report);
  console.log(`\nReport generated: ${reportPath}`);
}
