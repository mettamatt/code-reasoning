/**
 * Utility functions for prompt evaluation
 */

import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { PromptScenario, TestResult } from './types.js';

// Create readline interface for CLI
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Find the project root by looking for package.json
 * @returns The path to the project root
 */
function findProjectRoot(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Define possible project root paths in order of preference
  const possibleRoots = [
    path.join(__dirname, '../../..'), // From source in test/prompt-evaluation/core
    path.join(__dirname, '../../../..'), // From compiled in dist/test/prompt-evaluation/core
    process.cwd(), // Fallback to current working directory
  ];

  // Check each path for package.json to identify project root
  for (const root of possibleRoots) {
    if (fs.existsSync(path.join(root, 'package.json'))) {
      return root;
    }
  }

  // Fallback to current working directory if no root found
  console.warn('Could not find project root with package.json, using current directory.');
  return process.cwd();
}

/**
 * Tries to find a file by checking multiple possible locations
 * @param filename The name of the file to find
 * @param possiblePaths Array of paths to check, or default paths will be used
 * @returns The full path to the file if found, or null if not found
 */
export function findFile(filename: string, possiblePaths?: string[]): string | null {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const projectRoot = findProjectRoot();

  // If no paths provided, use default paths
  const pathsToCheck = possiblePaths || [
    path.join(__dirname, filename), // Current directory
    path.join(__dirname, '..', filename), // Parent directory
    path.join(projectRoot, 'test/prompt-evaluation', filename), // From project root
    path.join(projectRoot, filename), // Project root
  ];

  // Try each path
  for (const pathToCheck of pathsToCheck) {
    if (fs.existsSync(pathToCheck)) {
      return pathToCheck;
    }
  }

  return null;
}

// Set up directories based on project root
const projectRoot = findProjectRoot();

// Create evaluation directories with explicit paths
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
 * Prompt user for numeric input with a default value
 * @param question The prompt to display
 * @param defaultValue The default value to use if input is empty
 * @param min Optional minimum allowed value
 * @param max Optional maximum allowed value
 * @returns The parsed number (or default if input was empty)
 */
export async function promptUserWithNumericDefault(
  question: string,
  defaultValue: number,
  min?: number,
  max?: number
): Promise<number> {
  // Add instructions about pressing Enter for default
  const fullPrompt = `${question} (press Enter for default): `;

  // Get user input
  const input = await promptUser(fullPrompt);

  // If input is empty, return the default
  if (input.trim() === '') {
    return defaultValue;
  }

  // Parse and validate the input
  const parsedValue = parseInt(input);

  // Apply min/max constraints if provided
  if (!isNaN(parsedValue)) {
    let value = parsedValue;
    if (min !== undefined) value = Math.max(min, value);
    if (max !== undefined) value = Math.min(max, value);
    return value;
  }

  // If parsing failed, return the default
  console.log(`Invalid input. Using default value of ${defaultValue}.`);
  return defaultValue;
}

/**
 * Prompt user for yes/no input with a default value
 * @param question The prompt to display
 * @param defaultValue The default boolean value (true for yes, false for no)
 * @returns A boolean based on user input or the default
 */
export async function promptUserWithYesNoDefault(
  question: string,
  defaultValue: boolean
): Promise<boolean> {
  // Format the default value display
  const defaultDisplay = defaultValue ? 'Y/n' : 'y/N';

  // Add instructions about pressing Enter for default
  const fullPrompt = `${question} (${defaultDisplay}, press Enter for default): `;

  // Get user input
  const input = await promptUser(fullPrompt);
  const trimmedInput = input.trim().toLowerCase();

  // If input is empty, return the default
  if (trimmedInput === '') {
    return defaultValue;
  }

  // Check valid yes inputs
  if (trimmedInput === 'y' || trimmedInput === 'yes') {
    return true;
  }

  // Check valid no inputs
  if (trimmedInput === 'n' || trimmedInput === 'no') {
    return false;
  }

  // If input is invalid, notify user and return default
  console.log(`Invalid input. Using default value of ${defaultValue ? 'yes' : 'no'}.`);
  return defaultValue;
}

/**
 * Display a numbered list of options and get selection
 */
export async function selectFromList<T>(
  items: T[],
  getLabel: (item: T) => string,
  promptText: string,
  defaultIndex: number = 0
): Promise<T> {
  console.log('\n' + promptText);
  items.forEach((item, index) => {
    const isDefault = index === defaultIndex;
    console.log(`${index + 1}. ${getLabel(item)}${isDefault ? ' (default)' : ''}`);
  });

  let selection: number;
  do {
    const input = await promptUser('Enter selection number (or press Enter for default): ');
    if (input.trim() === '') {
      // Use default if input is empty
      selection = defaultIndex;
      break;
    }
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

// No longer needed - replaced by saveTestResult in evaluation.ts

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

/**
 * Get a formatted status message for a test result
 */
export function getFormattedStatus(result: TestResult): string {
  if (result.status === 'PASS') {
    return `✅ PASS`;
  } else {
    return `❌ FAIL: ${result.failureMessage || 'Check failed'}`;
  }
}
