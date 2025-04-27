/**
 * API-based Prompt Evaluator
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  promptUser,
  promptUserWithNumericDefault,
  promptUserWithYesNoDefault,
  selectFromList,
  PROMPT_TEST_SCENARIOS,
  PromptScenario,
  evaluateThoughtChain,
  saveEvaluation,
  generateReport,
  getPaths,
  closeReadline,
  EvaluationOptions,
} from './core/index.js';
import { evaluateWithAPI } from './anthropic-api.js';

// Setup directories for responses
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { evaluationsDir } = getPaths();
const responsesDir = path.join(evaluationsDir, 'responses');

if (!fs.existsSync(responsesDir)) {
  fs.mkdirSync(responsesDir, { recursive: true });
}

// Load environment variables using utility function
async function loadEnv() {
  try {
    // Import findFile from utils
    const { findFile } = await import('./core/utils.js');

    // Find .env file
    const envPath = findFile('.env');

    if (envPath) {
      const { config } = await import('dotenv');
      config({ path: envPath });
      return true;
    }

    console.warn('Could not find .env file in any of the expected locations');
    return false;
  } catch (error) {
    console.warn('Error loading .env file');
    return false;
  }
}

// Get API key
async function getApiKey() {
  let apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    apiKey = await promptUser('Enter your Anthropic API key: ');

    if (!apiKey) {
      throw new Error('API key is required');
    }

    const saveKey = await promptUserWithYesNoDefault('Save API key to .env file?', true); // Default to yes

    if (saveKey) {
      try {
        let envContent = `ANTHROPIC_API_KEY=${apiKey}\n`;
        envContent += 'CLAUDE_MODEL=claude-3-7-sonnet-20250219\n';
        envContent += 'MAX_TOKENS=8000\n';
        envContent += 'TEMPERATURE=0.7\n';

        fs.writeFileSync(path.join(__dirname, '.env'), envContent);
        console.log('API key saved to .env file');
      } catch (error) {
        console.error('Error saving API key to .env file:', error);
      }
    }
  }

  return apiKey;
}

// Add a delay between API calls
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to process a single scenario
async function processSingleScenario(
  scenario: PromptScenario,
  apiKey: string,
  model: string,
  evaluationOptions: EvaluationOptions,
  evaluator: string,
  progressLabel: string,
  includeScenarioGuidance: boolean,
  disablePostProcessing: boolean
): Promise<boolean> {
  try {
    console.log(`\n[${progressLabel}]: ${scenario.name}`);

    // Send to API
    console.log('Sending to Anthropic API...');

    const response = await evaluateWithAPI(
      apiKey,
      scenario.problem,
      {
        model,
        maxTokens: parseInt(process.env.MAX_TOKENS || '8000'),
        temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
      },
      includeScenarioGuidance,
      disablePostProcessing
    );

    if (!response.success || !response.thoughtChain) {
      console.log(`Error evaluating scenario: ${response.error || 'Unknown error'}`);
      return false;
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
    const evaluation = await evaluateThoughtChain(
      scenario,
      response.thoughtChain,
      evaluationOptions
    );

    // Set the evaluator name
    evaluation.evaluator = evaluator;

    // Save evaluation
    saveEvaluation(evaluation);
    return true;
  } catch (error) {
    console.error(`Error processing scenario ${scenario.name}:`, error);
    return false;
  }
}

// Main function
export async function runApiEvaluation() {
  console.log('\n===== AUTOMATED PROMPT EVALUATION SYSTEM =====');

  try {
    // Load environment variables
    await loadEnv();

    // Get API key
    const apiKey = await getApiKey();

    // Select Claude model
    const modelOptions = [
      'claude-3-7-sonnet-20250219',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-haiku-20240307',
    ];

    // Find the default model's index
    const defaultModel = process.env.CLAUDE_MODEL || 'claude-3-7-sonnet-20250219';
    let defaultIndex = modelOptions.findIndex(m => m === defaultModel);
    if (defaultIndex === -1) defaultIndex = 0; // Default to first option if not found

    const model = await selectFromList(
      modelOptions,
      m => m,
      `Select Claude model (default: ${defaultModel}):`,
      defaultIndex
    );

    // Select scenarios
    const runAllScenarios = await promptUserWithYesNoDefault('Run all scenarios?', true); // Default to yes

    const scenariosToRun = runAllScenarios
      ? PROMPT_TEST_SCENARIOS
      : [
          await selectFromList(
            PROMPT_TEST_SCENARIOS,
            s => `${s.name} (${s.targetSkill}, ${s.difficulty})`,
            'Select a test scenario:'
          ),
        ];

    // Batch processing options (only ask if running multiple scenarios)
    let parallelProcessing = false;
    let maxConcurrent = 1;

    if (runAllScenarios) {
      const useBatch = await promptUserWithYesNoDefault(
        'Use parallel processing for batch evaluation?',
        true
      ); // Default to yes
      if (useBatch) {
        parallelProcessing = true;
        maxConcurrent = await promptUserWithNumericDefault(
          'Max concurrent evaluations (1-5, default 2)',
          2, // default value
          1, // min value
          5 // max value
        );
      }
    }

    // Advanced options for evaluation
    const retryCount = await promptUserWithNumericDefault(
      'Number of retry attempts for API failures (0-5, default 2)',
      2, // default value
      0, // min value
      5 // max value
    );

    const forceAutomated = await promptUserWithYesNoDefault(
      'Force complete evaluation even if API fails?',
      false
    ); // Default to no

    // Ask whether to include scenario-specific guidance
    const includeScenarioGuidance = await promptUserWithYesNoDefault(
      'Include scenario-specific guidance? (No = core prompt only, emulates real user experience)',
      false
    ); // Default to no (core prompt only)

    // Ask whether to disable automatic parameter fixing
    const disablePostProcessing = await promptUserWithYesNoDefault(
      'Disable automatic parameter fixing? (Recommended for core prompt testing)',
      true
    ); // Default to yes for accurate testing

    // Set evaluator name to 'automated' by default
    const evaluator = 'automated';

    // Brief explanation of prompt variations
    console.log(
      "\nPrompt variation: A label for the prompt approach you're testing (e.g., 'baseline', 'enhanced', 'cot')"
    );
    console.log(
      'This is used in filenames and reports to help compare different prompt strategies.'
    );

    // Prompt variation input with suggestion based on guidance setting
    const defaultVariation = includeScenarioGuidance ? 'with-guidance' : 'core-only';
    const promptVariation =
      (await promptUser(
        `Prompt variation (e.g., "${defaultVariation}", "baseline", "enhanced", etc.): `
      )) || defaultVariation;

    // Set evaluation options
    const evaluationOptions: EvaluationOptions = {
      apiKey,
      model,
      maxTokens: parseInt(process.env.MAX_TOKENS || '8000'),
      temperature: parseFloat(process.env.TEMPERATURE || '0.2'), // Lower temperature for consistent evaluation
      promptVariation,
      retryCount,
      forceAutomated,
    };

    // Run scenarios (either in sequence or parallel)
    let successCount = 0;

    if (parallelProcessing) {
      // Parallel processing for automated batch evaluation
      console.log(
        `\nRunning ${scenariosToRun.length} scenarios in parallel (max ${maxConcurrent} concurrent)...`
      );

      // Process in batches with maxConcurrent size
      for (let i = 0; i < scenariosToRun.length; i += maxConcurrent) {
        const batch = scenariosToRun.slice(i, i + maxConcurrent);
        console.log(
          `\nProcessing batch ${Math.floor(i / maxConcurrent) + 1}/${Math.ceil(scenariosToRun.length / maxConcurrent)}`
        );

        const batchPromises = batch.map(async (scenario, index) => {
          try {
            return await processSingleScenario(
              scenario,
              apiKey,
              model,
              evaluationOptions,
              evaluator,
              `Batch ${Math.floor(i / maxConcurrent) + 1}, Scenario ${index + 1}/${batch.length}`,
              includeScenarioGuidance,
              disablePostProcessing
            );
          } catch (error: unknown) {
            console.error(
              `Error processing scenario ${scenario.name}: ${error instanceof Error ? error.message : String(error)}`
            );
            return false;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        successCount += batchResults.filter(result => result).length;
      }
    } else {
      // Sequential processing (original approach)
      for (let i = 0; i < scenariosToRun.length; i++) {
        const scenario = scenariosToRun[i];
        const success = await processSingleScenario(
          scenario,
          apiKey,
          model,
          evaluationOptions,
          evaluator,
          `Scenario ${i + 1}/${scenariosToRun.length}`,
          includeScenarioGuidance,
          disablePostProcessing
        );

        if (success) successCount++;

        // Add delay between API calls
        if (i < scenariosToRun.length - 1) {
          const delayMs = 1000; // 1 second
          console.log(`Waiting ${delayMs / 1000}s before next scenario...`);
          await delay(delayMs);
        }
      }
    }

    console.log(
      `\nAPI evaluation complete! Successfully evaluated ${successCount} of ${scenariosToRun.length} scenarios.`
    );

    // Generate report option
    if (scenariosToRun.length > 1 && successCount > 1) {
      const genReport = await promptUserWithYesNoDefault('Generate comparison report?', true); // Default to yes
      if (genReport) {
        generateReport();
      }
    }
  } catch (error) {
    console.error('Error during API evaluation:', error);
  } finally {
    closeReadline();
  }
}

// Run if this is the main module
if (import.meta.url === `file://${fileURLToPath(import.meta.url)}`) {
  runApiEvaluation().catch(error => {
    console.error('An error occurred:', error);
    closeReadline();
    process.exit(1);
  });
}
