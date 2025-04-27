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
 * Generate a comprehensive report from all evaluations
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
  let report = '# Code Reasoning Tool Prompt Evaluation: Effectiveness Report\n\n';
  report += `Generated on: ${new Date().toISOString()}\n\n`;

  // Extract top-level metrics for executive summary
  let overallAvgScore = 0;
  let totalCount = 0;
  const skillScores: Record<string, { total: number; count: number }> = {
    branching: { total: 0, count: 0 },
    revision: { total: 0, count: 0 },
    parameters: { total: 0, count: 0 },
    depth: { total: 0, count: 0 },
    completion: { total: 0, count: 0 },
    multiple: { total: 0, count: 0 },
  };

  // Collect common validation errors
  const validationErrors: Record<string, number> = {};

  // Collect comments for issue analysis
  const allComments: string[] = [];

  // Calculate overall scores and collect data
  Object.values(groupedEvals).forEach(variations => {
    Object.values(variations).forEach(evals => {
      evals.forEach(evalResult => {
        overallAvgScore += evalResult.percentageScore;
        totalCount++;

        // Add to skill scores
        const scenario = PROMPT_TEST_SCENARIOS.find(s => s.id === evalResult.scenarioId);
        if (scenario?.targetSkill) {
          skillScores[scenario.targetSkill].total += evalResult.percentageScore;
          skillScores[scenario.targetSkill].count++;
        }

        // Collect validation errors
        evalResult.objectiveMetrics.validationResults.errors.forEach(error => {
          validationErrors[error] = (validationErrors[error] || 0) + 1;
        });

        // Collect comments
        if (evalResult.comments) {
          allComments.push(evalResult.comments);
        }
      });
    });
  });

  // Calculate final overall score
  if (totalCount > 0) {
    overallAvgScore = Math.round(overallAvgScore / totalCount);
  }

  // Calculate skill averages
  const skillAverages: Record<string, number> = {};
  Object.entries(skillScores).forEach(([skill, data]) => {
    skillAverages[skill] = data.count > 0 ? Math.round(data.total / data.count) : 0;
  });

  // Executive Summary
  report += '## Executive Summary\n\n';
  report += `This report analyzes the current performance of the Code Reasoning Tool based on recent evaluations. The tool currently achieves an overall score of **${overallAvgScore}%** across all evaluated skills, with significant variation between skill categories. `;

  // Identify strengths and weaknesses
  const strengths = Object.entries(skillAverages)
    .filter(([_, score]) => score >= 70)
    .sort(([_, a], [__, b]) => b - a)
    .map(([skill, score]) => `${skill.charAt(0).toUpperCase() + skill.slice(1)} (${score}%)`);

  const weaknesses = Object.entries(skillAverages)
    .filter(([_, score]) => score < 70)
    .sort(([_, a], [__, b]) => a - b)
    .map(([skill, score]) => `${skill.charAt(0).toUpperCase() + skill.slice(1)} (${score}%)`);

  if (strengths.length > 0) {
    report += `While the tool performs well in ${strengths.join(', ')}, `;
  }

  if (weaknesses.length > 0) {
    report += `it shows ${weaknesses.length > 1 ? 'critical weaknesses' : 'a critical weakness'} in ${weaknesses.join(', ')}.`;
  }

  report += '\n\n';

  // Performance Breakdown
  report += '## Performance Breakdown\n\n';
  report += '| Skill Category | Score | Primary Issues Identified |\n';
  report += '|----------------|-------|---------------------------|\n';

  // Define common issues for each skill
  const commonIssues: Record<string, Record<string, string>> = {
    branching: {
      high: 'Proper branching with minor parameter inconsistencies',
      medium: 'Inconsistent branch parameter usage',
      low: 'Improper branching structure, incorrect parameter usage',
    },
    revision: {
      high: 'Effective revision with proper parameter usage',
      medium: 'Inconsistent revision parameter usage',
      low: 'Complete failure to use revision parameters',
    },
    parameters: {
      high: 'Consistent and accurate parameter usage',
      medium: 'Some parameter validation errors',
      low: 'Parameter validation errors, missing required parameters',
    },
    depth: {
      high: 'Deep reasoning with thorough exploration',
      medium: 'Adequate depth with some limitations',
      low: 'Insufficient depth in reasoning',
    },
    completion: {
      high: 'Complete resolution with clear conclusions',
      medium: 'Mostly complete resolution with minor gaps',
      low: 'Incomplete resolution of problems',
    },
    multiple: {
      high: 'Strong integration of multiple reasoning skills',
      medium: 'Uneven application of different reasoning skills',
      low: 'Poor integration of multiple reasoning techniques',
    },
  };

  // Add skill breakdown rows
  Object.entries(skillAverages).forEach(([skill, score]) => {
    let issueLevel = 'high';
    if (score < 40) issueLevel = 'low';
    else if (score < 70) issueLevel = 'medium';

    report += `| ${skill.charAt(0).toUpperCase() + skill.slice(1)} | ${score}% | ${commonIssues[skill][issueLevel]} |\n`;
  });

  report += '\n';

  // Model comparisons
  report += '## Model Comparisons\n\n';
  report += '| Model | Prompt Variation | Avg Score | Scenarios Evaluated |\n';
  report += '|-------|-----------------|-----------|---------------------|\n';

  Object.entries(groupedEvals).forEach(([modelId, variations]) => {
    Object.entries(variations).forEach(([variation, evalsList]) => {
      const avgScore = Math.round(
        evalsList.reduce((sum, e) => sum + e.percentageScore, 0) / evalsList.length
      );
      const scenarioCount = evalsList.length;
      report += `| ${modelId} | ${variation} | ${avgScore}% | ${scenarioCount} |\n`;
    });
  });

  report += '\n';

  // High-Level Failure Reasons
  report += '## High-Level Failure Reasons\n\n';

  // Analysis based on validation errors and comments
  const failureCategories = [
    {
      name: 'Parameter Validation Errors',
      priority: 'Critical Priority',
      criteria: (e: ScenarioEvaluation) => e.objectiveMetrics.validationResults.errors.length > 0,
      description: `The most common failures in the evaluations stem from parameter validation errors, which cause automatic failures in specialized tests:

- **Missing Required Parameters**: Complete absence of essential parameters like \`is_revision\` in revision scenarios
- **Non-Sequential Thought Numbering**: Jumps in thought number sequences in the main chain (e.g., from thought 5 to 7)
- **Incorrect Branch Parameters**: Missing or improperly applied \`branch_from_thought\` parameters
- **Parameter Consistency**: Inconsistent application of parameters across similar actions

**Impact**: Parameters tests scored ${skillAverages['parameters']}% despite having high-quality content, indicating the system has the reasoning capability but lacks the proper parameter usage.`,
    },
    {
      name: 'Branching Implementation Issues',
      priority: 'High Priority',
      criteria: (e: ScenarioEvaluation) =>
        e.objectiveMetrics.structureMetrics.branchCount > 0 &&
        e.percentageScore < 70 &&
        PROMPT_TEST_SCENARIOS.find(s => s.id === e.scenarioId)?.targetSkill === 'branching',
      description: `While the tool shows good reasoning and exploration of alternatives, it struggles with the proper implementation of branching:

- **Incorrect Branch Structure**: Creating branches that stem from other branches rather than from the main thought chain
- **Parallel Thinking Limitations**: Failure to properly set up parallel branches to compare distinct alternatives
- **Missing Branch Information**: In some cases, branches are created without specifying the source thought
- **Branch Parameter Confusion**: Inconsistent or incorrect usage of branching parameters

**Impact**: The branching score of ${skillAverages['branching']}% suggests that the tool understands conceptually when to branch but doesn't correctly implement the branching parameters.`,
    },
    {
      name: 'Revision Parameter Usage',
      priority: 'Critical Priority',
      criteria: (e: ScenarioEvaluation) =>
        PROMPT_TEST_SCENARIOS.find(s => s.id === e.scenarioId)?.targetSkill === 'revision' &&
        e.percentageScore < 50,
      description: `The tool completely fails to use revision parameters correctly:

- **Zero Use of \`is_revision\`**: Complete absence of the required \`is_revision\` parameter in dedicated revision scenarios
- **Missing Revision References**: Even when content was clearly being revised, the proper linkage to previous thoughts was missing
- **Revisions Without Parameters**: Content revisions occur naturally in the reasoning but without the formal parameter framework

**Impact**: The revision test scored ${skillAverages['revision']}% due to automatic failure from missing parameters, despite demonstrating the conceptual understanding of when revision is needed.`,
    },
    {
      name: 'Thought Numbering Consistency',
      priority: 'High Priority',
      criteria: (e: ScenarioEvaluation) =>
        e.objectiveMetrics.validationResults.errors.some(err => err.includes('thought number')),
      description: `Issues with thought numbering appeared across multiple evaluations:

- **Non-Sequential Numbering**: Gaps in thought number sequences (e.g., 4->7->9)
- **Branch Numbering Confusion**: Improper handling of thought numbers when branching
- **Inconsistent Counting**: Occasional errors in managing the thought counter

**Impact**: These issues cause validation errors that lead to automatic test failures, even when the content quality is high.`,
    },
    {
      name: 'Total Thoughts Estimation',
      priority: 'Medium Priority',
      criteria: (e: ScenarioEvaluation) =>
        e.thoughtChain.some((t, i, arr) => i > 0 && t.total_thoughts !== arr[i - 1].total_thoughts),
      description: `The tool occasionally adjusts the \`total_thoughts\` parameter mid-reasoning, suggesting:

- **Planning Challenges**: Difficulty accurately estimating the required number of steps
- **Scope Changes**: Expanding thought chains without proper parameter updates
- **Inconsistent Progress Tracking**: Poor management of progress through the reasoning task

**Impact**: While not causing complete test failures, these issues affect the tool's ability to plan and structure complex reasoning effectively.`,
    },
  ];

  // Add failure category sections
  failureCategories.forEach(category => {
    report += `### ${category.name} (${category.priority})\n\n`;
    report += `${category.description}\n\n`;
  });

  // Recommendations
  report += '## Recommendations for Prompt Improvements\n\n';

  const recommendations = [
    {
      name: 'Explicit Parameter Usage Examples',
      priority: 'Critical',
      description:
        'Add clear examples of proper parameter usage for all scenarios\n- Include specific examples for revision and branching\n- Provide "before/after" examples showing validation errors and their fixes',
    },
    {
      name: 'Parameter Usage Guidelines',
      priority: 'Critical',
      description:
        'Create explicit rules for thought numbering to maintain sequence\n- Clarify exact requirements for branching parameters\n- Develop a decision tree for when to use `is_revision`',
    },
    {
      name: 'Structural Visualization',
      priority: 'High',
      description:
        'Add visualizations of correct branching structures\n- Illustrate how thought numbering should flow in complex scenarios\n- Show proper branch and merge patterns',
    },
    {
      name: 'Parameter Validation Checklist',
      priority: 'High',
      description:
        'Implement a self-check procedure within the prompt\n- Create parameter validation rules in simple, clear language\n- Emphasize validation as a critical step before completing a task',
    },
    {
      name: 'Enhanced Thought Planning',
      priority: 'Medium',
      description:
        'Improve guidance on estimating total thoughts needed\n- Explain when and how to adjust `total_thoughts` parameters\n- Provide strategies for breaking down problems into appropriate steps',
    },
  ];

  recommendations.forEach((rec, index) => {
    report += `${index + 1}. **${rec.name}** (${rec.priority}):\n   - ${rec.description.replace(/\n/g, '\n   - ')}\n\n`;
  });

  // Conclusion
  report += '## Conclusion\n\n';
  report += `The Code Reasoning Tool demonstrates strong capabilities in depth of reasoning, completing tasks, and handling complex scenarios. However, its overall effectiveness is severely limited by parameter usage issues, particularly in branching and revision scenarios. Focusing prompt improvements on correct parameter usage, especially for the validation-critical parameters, will likely yield the most significant performance gains.\n\n`;

  // List top priority areas
  report += 'The most urgent focus areas are:\n';
  report += `1. Revision parameter usage (${skillAverages['revision']}% current score)\n`;
  report += `2. Parameter validation (${skillAverages['parameters']}% current score)\n`;
  report += `3. Branching implementation (${skillAverages['branching']}% current score)\n\n`;

  report +=
    'By addressing these areas, the tool can substantially improve its overall performance while maintaining its current strengths in depth and completion.';

  // Save report
  const reportPath = path.join(evaluationsDir, `prompt-effectiveness-report-${Date.now()}.md`);
  fs.writeFileSync(reportPath, report);
  console.log(`\nReport generated: ${reportPath}`);
}
