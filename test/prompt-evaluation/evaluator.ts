/**
 * Pass/Fail Prompt Evaluator
 *
 * This tool allows viewing test scenarios and generating reports
 * from evaluations that were run using the pass/fail evaluation system.
 * For running evaluations, use the api-evaluator.ts module instead.
 */

import { fileURLToPath } from 'url';
import * as fs from 'fs';
import * as path from 'path';
import {
  PROMPT_TEST_SCENARIOS,
  selectFromList,
  displayScenario,
  generateReport,
  promptUser,
  closeReadline,
  getPaths,
  TestResult,
} from './core/index.js';

/**
 * Display evaluation results in a user-friendly format
 */
async function displayResults(): Promise<void> {
  const { resultsDir } = getPaths();

  // Read test results
  const files = fs.readdirSync(resultsDir).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.log('No test results found. Run some evaluations first with api-evaluator.ts');
    return;
  }

  const results: TestResult[] = [];

  // Try to parse each file as a TestResult
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(resultsDir, file), 'utf8');
      const parsed = JSON.parse(content);
      // Basic validation to check if it's a TestResult
      if (parsed.status && parsed.checks && Array.isArray(parsed.checks)) {
        results.push(parsed);
      }
    } catch (error) {
      // Skip files that aren't valid TestResults (likely older format)
    }
  }

  if (results.length === 0) {
    console.log('No pass/fail evaluation results found. Run api-evaluator.ts first.');
    return;
  }

  console.log('\n===== PASS/FAIL TEST RESULTS =====');

  // Count passes and failures
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log(
    `Overall: ${passed} passed, ${failed} failed (${Math.round((passed / results.length) * 100)}% pass rate)\n`
  );

  // Allow selecting a result to view in detail
  const selectedResult = await selectFromList(
    results,
    r => `${r.scenarioName}: ${r.status} (${r.date.split('T')[0]})`,
    'Select a result to view details:'
  );

  // Display detailed result
  console.log(`\n=== ${selectedResult.scenarioName}: ${selectedResult.status} ===`);
  console.log(`Date: ${new Date(selectedResult.date).toLocaleString()}`);
  console.log(`Model: ${selectedResult.modelId}`);
  console.log(`Variation: ${selectedResult.promptVariation}`);

  if (selectedResult.status === 'FAIL' && selectedResult.failureMessage) {
    console.log(`\nFailure reason: ${selectedResult.failureMessage}`);
  }

  console.log('\nChecks:');
  selectedResult.checks.forEach(check => {
    const status = check.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`- ${check.name}: ${status}`);
    if (!check.passed && check.details) {
      console.log(`  Reason: ${check.details}`);
    }
  });

  console.log('\nThought Chain:');
  console.log(`- Total thoughts: ${selectedResult.thoughtChain.length}`);
  console.log(
    `- Branches: ${selectedResult.thoughtChain.filter(t => t.branch_id).length > 0 ? 'Yes' : 'No'}`
  );
  console.log(
    `- Revisions: ${selectedResult.thoughtChain.filter(t => t.is_revision).length > 0 ? 'Yes' : 'No'}`
  );
}

/**
 * Main menu for the evaluator
 */
async function mainMenu(): Promise<void> {
  let running = true;

  while (running) {
    console.log('\n===== PASS/FAIL PROMPT EVALUATOR =====');
    console.log('1. Display test scenario');
    console.log('2. Display evaluation results');
    console.log('3. Generate report');
    console.log('4. Exit');

    const choice = await promptUser('\nEnter choice (1-4): ');

    switch (choice) {
      case '1': {
        const scenario = await selectFromList(
          PROMPT_TEST_SCENARIOS,
          s => `${s.name} (${s.targetSkill}, ${s.difficulty})`,
          'Select a test scenario:'
        );
        displayScenario(scenario);
        break;
      }

      case '2': {
        await displayResults();
        break;
      }

      case '3': {
        await generateReport();
        break;
      }

      case '4':
        running = false;
        break;

      default:
        console.log('Invalid choice. Please try again.');
    }
  }

  closeReadline();
  console.log('\nThank you for using the Pass/Fail Prompt Evaluator!');
}

// Run the main menu if this file is executed directly
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  console.log('Starting Pass/Fail Prompt Evaluator...');
  console.log('\nNOTE: This tool is for viewing scenarios and test results.');
  console.log('For running automated evaluations, use: npm run eval:api\n');

  mainMenu().catch(error => {
    console.error('An error occurred:', error);
    closeReadline();
  });
}
