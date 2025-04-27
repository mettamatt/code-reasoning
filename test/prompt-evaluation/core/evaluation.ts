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
  PROMPT_TEST_SCENARIOS,
} from './types.js';
import { promptUser, getPaths } from './utils.js';

/**
 * Evaluate a thought chain against a scenario
 */
export async function evaluateThoughtChain(
  scenario: PromptScenario,
  thoughts: ThoughtData[]
): Promise<ScenarioEvaluation> {
  const evaluator = await promptUser('Evaluator name: ');
  const modelId = await promptUser('Model ID (e.g., "GPT-4", "Claude-3", etc.): ');
  const promptVariation = await promptUser(
    'Prompt variation (e.g., "baseline", "enhanced", etc.): '
  );

  console.log('\n----- EVALUATION -----');

  // Analyze the thought chain for some basic metrics
  const usesRevisions = thoughts.some(t => t.is_revision === true);
  const branches = new Set<string>();
  thoughts.forEach(t => t.branch_id && branches.add(t.branch_id));
  const branchCount = branches.size;

  console.log('\nThought Chain Analysis:');
  console.log(`- Total thoughts: ${thoughts.length}`);
  console.log(`- Uses revisions: ${usesRevisions ? 'Yes' : 'No'}`);
  console.log(`- Number of branches: ${branchCount}`);

  // Score each criterion
  const scores: EvaluationScore[] = [];

  for (const criterion of scenario.evaluationCriteria) {
    console.log(`\n${criterion.criterion} (max ${criterion.maxScore} points)`);
    console.log(`Description: ${criterion.description}`);

    let score: number;
    do {
      const input = await promptUser(`Score (0-${criterion.maxScore}): `);
      score = parseInt(input);
      if (isNaN(score) || score < 0 || score > criterion.maxScore) {
        console.log(`Invalid score. Please enter a number between 0 and ${criterion.maxScore}.`);
      }
    } while (isNaN(score) || score < 0 || score > criterion.maxScore);

    const notes = await promptUser('Notes on this criterion: ');

    scores.push({
      criterionId: criterion.criterion.toLowerCase().replace(/\s+/g, '-'),
      criterion: criterion.criterion,
      score,
      maxScore: criterion.maxScore,
      notes,
    });
  }

  // Calculate total score
  const totalScore = scores.reduce((sum, score) => sum + score.score, 0);
  const maxPossibleScore = scores.reduce((sum, score) => sum + score.maxScore, 0);
  const percentageScore = Math.round((totalScore / maxPossibleScore) * 100);

  // Overall comments
  console.log('\nOverall evaluation:');
  const comments = await promptUser('Comments: ');

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    evaluator,
    modelId,
    promptVariation,
    date: new Date().toISOString(),
    thoughtChain: thoughts,
    scores,
    totalScore,
    maxPossibleScore,
    percentageScore,
    comments,
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
