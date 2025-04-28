/**
 * Pass/Fail Evaluator for Code Reasoning Tool
 *
 * This script runs the new pass/fail evaluation system on test scenarios.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import dotenv from 'dotenv';
import {
  PROMPT_TEST_SCENARIOS,
  evaluateThoughtChain,
  saveTestResult,
  generateReport,
  getPaths,
  EvaluationOptions,
  PromptScenario,
  TestResult,
} from './core/index.js';
import {
  promptUser,
  promptUserWithYesNoDefault,
  selectFromList,
  closeReadline,
} from './core/utils.js';
import { evaluateWithAPI } from './anthropic-api.js';

// Load environment variables from .env file
dotenv.config({ path: path.join(fileURLToPath(new URL('.', import.meta.url)), '.env') });

// Setup directories for responses
const { evaluationsDir } = getPaths();
const responsesDir = path.join(evaluationsDir, 'responses');
if (!fs.existsSync(responsesDir)) {
  fs.mkdirSync(responsesDir, { recursive: true });
}

/**
 * Process a single scenario with the pass/fail system
 */
async function processScenario(
  scenario: PromptScenario,
  apiKey: string,
  model: string,
  evaluationOptions: EvaluationOptions,
  progressLabel: string
): Promise<TestResult | null> {
  try {
    console.log(`\n[${progressLabel}]: ${scenario.name}`);

    // Send to API
    console.log('Sending to Anthropic API...');
    const response = await evaluateWithAPI(apiKey, scenario.problem, {
      model,
      maxTokens: parseInt(process.env.MAX_TOKENS || '8000'),
      temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
    });

    if (!response.success || !response.thoughtChain) {
      console.error(`Error evaluating scenario: ${response.error || 'Unknown error'}`);
      return null;
    }

    // Save raw response
    if (response.rawResponse) {
      const filename = `${scenario.id}-raw-${model.replace(/:/g, '-')}-${Date.now()}.txt`;
      const filePath = path.join(responsesDir, filename);
      fs.writeFileSync(filePath, response.rawResponse);
      console.log(`Raw response saved to ${filePath}`);
    }

    console.log(`Received ${response.thoughtChain.length} thoughts from Claude`);

    // Evaluate with pass/fail system
    console.log('Evaluating with pass/fail system...');
    const result = await evaluateThoughtChain(scenario, response.thoughtChain, evaluationOptions);

    // Save test result
    saveTestResult(result);
    return result;
  } catch (error) {
    console.error(`Error processing scenario ${scenario.name}:`, error);
    return null;
  }
}

/**
 * Display a summary of test results
 */
function displayResults(results: TestResult[]): void {
  console.log('\n===== PASS/FAIL TEST RESULTS =====');

  // Count passes and failures
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log(
    `Overall: ${chalk.green(passed)} passed, ${chalk.red(failed)} failed (${Math.round((passed / results.length) * 100)}% pass rate)\n`
  );

  // Display results for each scenario
  results.forEach((result, index) => {
    const statusColor = result.status === 'PASS' ? chalk.green : chalk.red;
    console.log(`${index + 1}. ${result.scenarioName}: ${statusColor(result.status)}`);

    if (result.status === 'FAIL' && result.failureMessage) {
      console.log(`   Reason: ${result.failureMessage}`);
    }

    // Show failed checks for failures
    if (result.status === 'FAIL') {
      const failedChecks = result.checks.filter(check => !check.passed);
      if (failedChecks.length > 0) {
        console.log('   Failed checks:');
        failedChecks.forEach(check => {
          console.log(`   - ${check.name}: ${check.details || ''}`);
        });
      }
    }

    console.log('');
  });
}

/**
 * Main function to run the pass/fail evaluator
 */
export async function runPassFailEvaluation(): Promise<void> {
  console.log('\n===== PASS/FAIL EVALUATION SYSTEM =====');

  try {
    // Get API key from environment or prompt
    let apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      apiKey = await promptUser('Enter your Anthropic API key: ');
      if (!apiKey) {
        throw new Error('API key is required');
      }
    }

    // Select Claude model
    const modelOptions = [
      'claude-3-7-sonnet-20250219',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-haiku-20240307',
    ];

    // Find the default model
    const defaultModel = process.env.CLAUDE_MODEL || 'claude-3-7-sonnet-20250219';
    let defaultIndex = modelOptions.findIndex(m => m === defaultModel);
    if (defaultIndex === -1) defaultIndex = 0;

    const model = await selectFromList(
      modelOptions,
      m => m,
      `Select Claude model (default: ${defaultModel}):`,
      defaultIndex
    );

    // Choose scenarios to run
    const runAllScenarios = await promptUserWithYesNoDefault('Run all scenarios?', false);

    const scenariosToRun = runAllScenarios
      ? PROMPT_TEST_SCENARIOS
      : [
          await selectFromList(
            PROMPT_TEST_SCENARIOS,
            s => `${s.name} (${s.targetSkill}, ${s.difficulty})`,
            'Select a test scenario:'
          ),
        ];

    // Set evaluation options
    const promptVariation =
      (await promptUser('Prompt variation label (e.g., "pass-fail-system", "baseline"): ')) ||
      'pass-fail-system';

    const evaluationOptions: EvaluationOptions = {
      apiKey,
      model,
      maxTokens: parseInt(process.env.MAX_TOKENS || '8000'),
      temperature: 0.7,
      promptVariation,
    };

    // Run scenarios sequentially
    const results: TestResult[] = [];

    for (let i = 0; i < scenariosToRun.length; i++) {
      const scenario = scenariosToRun[i];
      const result = await processScenario(
        scenario,
        apiKey,
        model,
        evaluationOptions,
        `Scenario ${i + 1}/${scenariosToRun.length}`
      );

      if (result) {
        results.push(result);
      }

      // Add a short delay between API calls
      if (i < scenariosToRun.length - 1) {
        const delayMs = 1000;
        console.log(`Waiting ${delayMs / 1000}s before next scenario...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // Display results summary
    if (results.length > 0) {
      displayResults(results);

      // Generate report
      if (results.length > 1) {
        const genReport = await promptUserWithYesNoDefault('Generate pass/fail report?', true);
        if (genReport) {
          await generateReport();
        }
      }
    } else {
      console.log('No results to display. All evaluations failed.');
    }
  } catch (error) {
    console.error('Error during evaluation:', error);
  } finally {
    closeReadline();
  }
}

// Run the pass/fail evaluator if this is the main module
if (import.meta.url === `file://${fileURLToPath(import.meta.url)}`) {
  runPassFailEvaluation().catch(error => {
    console.error('An error occurred:', error);
    closeReadline();
    process.exit(1);
  });
}
