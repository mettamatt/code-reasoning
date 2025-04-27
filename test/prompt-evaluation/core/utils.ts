/**
 * Utility functions for prompt evaluation
 */

import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { PromptScenario, ScenarioEvaluation } from './types.js';

// Create readline interface for CLI
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Directory setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../../..');

// Create evaluation directories
const evaluationsDir = path.join(projectRoot, 'prompt-evaluations');
if (!fs.existsSync(evaluationsDir)) {
  fs.mkdirSync(evaluationsDir, { recursive: true });
}

const thoughtChainsDir = path.join(evaluationsDir, 'thought-chains');
if (!fs.existsSync(thoughtChainsDir)) {
  fs.mkdirSync(thoughtChainsDir, { recursive: true });
}

const resultsDir = path.join(evaluationsDir, 'results');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

/**
 * Prompt user for input
 */
export function promptUser(question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve));
}

/**
 * Display a numbered list of options and get selection
 */
export async function selectFromList<T>(
  items: T[],
  getLabel: (item: T) => string,
  promptText: string
): Promise<T> {
  console.log('\n' + promptText);
  items.forEach((item, index) => {
    console.log(`${index + 1}. ${getLabel(item)}`);
  });

  let selection: number;
  do {
    const input = await promptUser('Enter selection number: ');
    selection = parseInt(input) - 1;
    if (isNaN(selection) || selection < 0 || selection >= items.length) {
      console.log('Invalid selection. Please try again.');
    }
  } while (isNaN(selection) || selection < 0 || selection >= items.length);

  return items[selection];
}

/**
 * Display a scenario for the evaluator
 */
export function displayScenario(scenario: PromptScenario): void {
  console.log('\n===========================================================');
  console.log(`SCENARIO: ${scenario.name} (${scenario.id})`);
  console.log('===========================================================');
  console.log(`Description: ${scenario.description}`);
  console.log(`Target Skill: ${scenario.targetSkill}`);
  console.log(`Difficulty: ${scenario.difficulty}`);
  console.log(`Expected Thoughts: ${scenario.expectedThoughtsMin}-${scenario.expectedThoughtsMax}`);
  console.log('\n----- PROBLEM TO PRESENT TO THE MODEL -----');
  console.log(scenario.problem);
  console.log('\n----- EVALUATION CRITERIA -----');
  scenario.evaluationCriteria.forEach((criterion, index) => {
    console.log(`${index + 1}. ${criterion.criterion} (${criterion.maxScore} points)`);
    console.log(`   ${criterion.description}`);
  });
  console.log('===========================================================\n');
}

/**
 * Close readline interface
 */
export function closeReadline(): void {
  rl.close();
}

/**
 * Save an evaluation to files
 */
export function saveEvaluation(evaluation: ScenarioEvaluation): void {
  const filename = `${evaluation.scenarioId}-${evaluation.modelId}-${evaluation.promptVariation.replace(/\s+/g, '-')}-${Date.now()}.json`;
  const filePath = path.join(resultsDir, filename);

  fs.writeFileSync(filePath, JSON.stringify(evaluation, null, 2));
  console.log(`\nEvaluation saved to ${filePath}`);

  // Also save the thought chain separately
  const thoughtChainFile = `${evaluation.scenarioId}-${evaluation.modelId}-thoughtchain-${Date.now()}.json`;
  const thoughtChainPath = path.join(thoughtChainsDir, thoughtChainFile);

  fs.writeFileSync(thoughtChainPath, JSON.stringify(evaluation.thoughtChain, null, 2));
  console.log(`Thought chain saved to ${thoughtChainPath}`);
}

/**
 * Get directory paths
 */
export function getPaths() {
  return {
    evaluationsDir,
    thoughtChainsDir,
    resultsDir,
  };
}
