/**
 * Simplified Prompt Effectiveness Evaluator
 *
 * This tool has been updated to focus on scenario display
 * and report generation only. For API-based evaluation,
 * use the api-evaluator.ts module instead.
 */

import { fileURLToPath } from 'url';
import {
  PROMPT_TEST_SCENARIOS,
  selectFromList,
  displayScenario,
  generateReport,
  promptUser,
  closeReadline,
} from './core/index.js';

/**
 * Main menu for simplified prompt evaluator
 */
async function mainMenu(): Promise<void> {
  let running = true;

  while (running) {
    console.log('\n===== PROMPT EFFECTIVENESS EVALUATOR =====');
    console.log('1. Display test scenario');
    console.log('2. Generate report');
    console.log('3. Exit');

    const choice = await promptUser('\nEnter choice (1-3): ');

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

      case '2':
        generateReport();
        break;

      case '3':
        running = false;
        break;

      default:
        console.log('Invalid choice. Please try again.');
    }
  }

  closeReadline();
  console.log('\nThank you for using the Prompt Effectiveness Evaluator!');
}

// Run the main menu if this file is executed directly
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  console.log('Starting Prompt Effectiveness Evaluator...');
  console.log(
    '\nNOTE: This is a simplified version for displaying scenarios and generating reports.'
  );
  console.log('For API-based evaluation, use: npm run eval:api\n');

  mainMenu().catch(error => {
    console.error('An error occurred:', error);
    closeReadline();
  });
}
