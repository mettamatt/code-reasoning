/**
 * Simple Evaluation Script
 *
 * This script provides a simplified way to test the Anthropic API integration
 * without the interactive prompts of the full evaluator. It runs a single test
 * scenario automatically and generates the evaluation results.
 *
 * Usage:
 * - Set ANTHROPIC_API_KEY environment variable
 * - Run with: ts-node test/prompt-evaluation/simple-evaluator.ts
 *
 * This is useful for:
 * - Quick testing of API integration during development
 * - Debugging changes to the prompt formatting
 * - Demonstrating the API evaluation functionality
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  PROMPT_TEST_SCENARIOS,
  evaluateThoughtChain,
  saveEvaluation,
  getPaths,
  EvaluationOptions,
  PromptScenario,
} from './core/index.js';
import { evaluateWithAPI } from './anthropic-api.js';

// Setup directories for responses
const { evaluationsDir } = getPaths();
const responsesDir = path.join(evaluationsDir, 'responses');
if (!fs.existsSync(responsesDir)) {
  fs.mkdirSync(responsesDir, { recursive: true });
}

/**
 * Run a simple evaluation with the first test scenario
 */
async function runSimpleEvaluation(): Promise<void> {
  // Use environment variables directly
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.CLAUDE_MODEL || 'claude-3-7-sonnet-20250219';

  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY environment variable is required');
    process.exit(1);
  }

  // Just run the first scenario as a test
  const scenario: PromptScenario = PROMPT_TEST_SCENARIOS[0];
  console.log(`\nRunning scenario: ${scenario.name}`);

  // Send to API
  console.log('Sending to Anthropic API...');
  const response = await evaluateWithAPI(apiKey, scenario.problem, {
    model,
    maxTokens: parseInt(process.env.MAX_TOKENS || '8000'),
    temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
  });

  if (!response.success || !response.thoughtChain) {
    console.error(`Error evaluating scenario: ${response.error || 'Unknown error'}`);
    process.exit(1);
  }

  // Save raw response
  if (response.rawResponse) {
    const filename = `${scenario.id}-${model.replace(/:/g, '-')}-${Date.now()}.txt`;
    const filePath = path.join(responsesDir, filename);
    fs.writeFileSync(filePath, response.rawResponse);
    console.log(`Raw response saved to ${filePath}`);
  }

  console.log(`Received ${response.thoughtChain.length} thoughts from Claude`);

  // Evaluate the response
  console.log('Evaluating response...');
  const evaluationOptions: EvaluationOptions = {
    apiKey,
    model,
    maxTokens: 8000,
    temperature: 0.2,
    promptVariation: 'enhanced-format',
    retryCount: 2,
    forceAutomated: false,
  };

  const evaluation = await evaluateThoughtChain(scenario, response.thoughtChain, evaluationOptions);

  // Set the evaluator name
  evaluation.evaluator = 'automated';

  // Save evaluation
  saveEvaluation(evaluation);

  console.log(`\nEvaluation complete for ${scenario.name}.`);
}

// Run the evaluation
if (import.meta.url === `file://${fileURLToPath(import.meta.url)}`) {
  runSimpleEvaluation().catch(error => {
    console.error('An error occurred:', error);
    process.exit(1);
  });
}

// Export for potential programmatic use
export { runSimpleEvaluation };
