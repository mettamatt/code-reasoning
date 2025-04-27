/**
 * API-based Prompt Evaluator
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  promptUser, 
  selectFromList, 
  PROMPT_TEST_SCENARIOS,
  evaluateThoughtChain,
  saveEvaluation,
  generateReport,
  getPaths,
  closeReadline
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

// Load environment variables
async function loadEnv() {
  try {
    const envPath = path.join(__dirname, '.env');
    
    if (fs.existsSync(envPath)) {
      const { config } = await import('dotenv');
      config({ path: envPath });
      return true;
    }
    return false;
  } catch (error) {
    console.log('Could not load .env file');
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
    
    const saveKey = (await promptUser('Save API key to .env file? (y/n): ')).toLowerCase() === 'y';
    
    if (saveKey) {
      try {
        let envContent = `ANTHROPIC_API_KEY=${apiKey}\n`;
        envContent += 'CLAUDE_MODEL=claude-3-7-sonnet-20250219\n';
        envContent += 'MAX_TOKENS=4000\n';
        envContent += 'TEMPERATURE=0.3\n';
        
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

// Main function
export async function runApiEvaluation() {
  console.log('\n===== ANTHROPIC API PROMPT EVALUATION =====');
  
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
      'claude-3-haiku-20240307'
    ];
    
    const model = await selectFromList(
      modelOptions,
      (m) => m,
      `Select Claude model (default: ${process.env.CLAUDE_MODEL || 'claude-3-7-sonnet-20250219'}):`
    );
    
    // Select scenarios
    const runAllScenarios = (await promptUser('Run all scenarios? (y/n): ')).toLowerCase() === 'y';
    
    const scenariosToRun = runAllScenarios 
      ? PROMPT_TEST_SCENARIOS 
      : [await selectFromList(
          PROMPT_TEST_SCENARIOS,
          (s) => `${s.name} (${s.targetSkill}, ${s.difficulty})`,
          'Select a test scenario:'
        )];
    
    // Get evaluator name and prompt variation
    const evaluator = await promptUser('Evaluator name: ');
    const promptVariation = await promptUser('Prompt variation (e.g., "baseline", "enhanced", etc.): ');
    
    // Run each scenario
    let successCount = 0;
    
    for (let i = 0; i < scenariosToRun.length; i++) {
      const scenario = scenariosToRun[i];
      console.log(`\nRunning scenario ${i+1} of ${scenariosToRun.length}: ${scenario.name}`);
      
      // Send to API
      console.log('Sending to Anthropic API...');
      
      const response = await evaluateWithAPI(
        apiKey, 
        scenario.problem, 
        {
          model,
          maxTokens: parseInt(process.env.MAX_TOKENS || '4000'),
          temperature: parseFloat(process.env.TEMPERATURE || '0.3')
        }
      );
      
      if (!response.success || !response.thoughtChain) {
        console.log(`Error evaluating scenario: ${response.error || 'Unknown error'}`);
        continue;
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
      const evaluation = await evaluateThoughtChain(scenario, response.thoughtChain);
      
      // Update with model info
      evaluation.modelId = model;
      evaluation.promptVariation = promptVariation;
      evaluation.evaluator = evaluator;
      
      // Save evaluation
      saveEvaluation(evaluation);
      successCount++;
      
      // Add delay between API calls
      if (i < scenariosToRun.length - 1) {
        const delayMs = 1000; // 1 second
        console.log(`Waiting ${delayMs/1000}s before next scenario...`);
        await delay(delayMs);
      }
    }
    
    console.log(`\nAPI evaluation complete! Successfully evaluated ${successCount} of ${scenariosToRun.length} scenarios.`);
    
    // Generate report option
    if (scenariosToRun.length > 1 && successCount > 1) {
      const genReport = (await promptUser('Generate comparison report? (y/n): ')).toLowerCase() === 'y';
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
