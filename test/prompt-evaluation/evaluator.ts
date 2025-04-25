/**
 * Prompt Effectiveness Evaluator
 * 
 * This tool helps evaluate how effectively a model follows the 
 * instructions in the CODE_REASONING_TOOL prompt.
 * 
 * Usage:
 * 1. Select a test scenario
 * 2. Present the problem to the model using sequential thinking
 * 3. Save the thought chain
 * 4. Evaluate the thought chain against the rubric
 * 5. Generate a report on prompt effectiveness
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { fileURLToPath } from 'url';
import { PROMPT_TEST_SCENARIOS, PromptScenario } from './scenarios.js';

// For storing thoughts across the application
interface AppGlobal {
  currentThoughts?: ThoughtRecord[];
}

// Add a global storage object
const appState: AppGlobal = {};

// Types for evaluation
interface ThoughtRecord {
  thought: string;
  thought_number: number;
  total_thoughts: number;
  next_thought_needed: boolean;
  is_revision?: boolean;
  revises_thought?: number;
  branch_from_thought?: number;
  branch_id?: string;
  needs_more_thoughts?: boolean;
}

interface EvaluationScore {
  criterionId: string;
  criterion: string;
  score: number;
  maxScore: number;
  notes: string;
}

interface ScenarioEvaluation {
  scenarioId: string;
  scenarioName: string;
  evaluator: string;
  modelId: string;
  promptVariation: string;
  date: string;
  thoughtChain: ThoughtRecord[];
  scores: EvaluationScore[];
  totalScore: number;
  maxPossibleScore: number;
  percentageScore: number;
  comments: string;
}

// Get the directory of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../..');

// Create evaluation directories if they don't exist
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

// Create readline interface for CLI
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt for input with promise
function promptUser(question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve));
}

// Display a numbered list of options and get selection
async function selectFromList<T>(items: T[], getLabel: (item: T) => string, promptText: string): Promise<T> {
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

// Display a scenario for the evaluator
function displayScenario(scenario: PromptScenario): void {
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

// Import a thought chain from a JSON file
async function importThoughtChain(): Promise<ThoughtRecord[]> {
  const filename = await promptUser('Enter path to thought chain JSON file: ');
  try {
    const data = fs.readFileSync(filename, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading thought chain file:', error);
    return [];
  }
}

// Create a thought chain manually
async function createThoughtChain(): Promise<ThoughtRecord[]> {
  const thoughts: ThoughtRecord[] = [];
  console.log('\nEnter thought records (leave thought empty to finish):');
  
  let thoughtNumber = 1;
  let done = false;
  
  while (!done) {
    console.log(`\n----- Thought #${thoughtNumber} -----`);
    const thought = await promptUser('Thought content: ');
    
    if (!thought.trim()) {
      done = true;
      continue;
    }
    
    const totalThoughts = parseInt(await promptUser(`Total thoughts (current: ${thoughtNumber}): `));
    const nextThoughtNeeded = (await promptUser('Next thought needed? (y/n): ')).toLowerCase() === 'y';
    
    const isRevision = (await promptUser('Is this a revision? (y/n): ')).toLowerCase() === 'y';
    let revisesThought: number | undefined;
    if (isRevision) {
      revisesThought = parseInt(await promptUser('Revises which thought number? '));
    }
    
    const hasBranch = (await promptUser('Is this part of a branch? (y/n): ')).toLowerCase() === 'y';
    let branchFromThought: number | undefined;
    let branchId: string | undefined;
    if (hasBranch) {
      branchFromThought = parseInt(await promptUser('Branch from which thought number? '));
      branchId = await promptUser('Branch ID: ');
    }
    
    thoughts.push({
      thought,
      thought_number: thoughtNumber,
      total_thoughts: totalThoughts,
      next_thought_needed: nextThoughtNeeded,
      ...(isRevision && { is_revision: true, revises_thought: revisesThought }),
      ...(hasBranch && { branch_from_thought: branchFromThought, branch_id: branchId })
    });
    
    thoughtNumber++;
    
    if (!nextThoughtNeeded) {
      done = true;
    }
  }
  
  return thoughts;
}

// Evaluate a thought chain against a scenario
async function evaluateThoughtChain(
  scenario: PromptScenario, 
  thoughts: ThoughtRecord[]
): Promise<ScenarioEvaluation> {
  const evaluator = await promptUser('Evaluator name: ');
  const modelId = await promptUser('Model ID (e.g., "GPT-4", "Claude-3", etc.): ');
  const promptVariation = await promptUser('Prompt variation (e.g., "baseline", "enhanced", etc.): ');
  
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
      notes
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
    comments
  };
}

// Save an evaluation to a file
function saveEvaluation(evaluation: ScenarioEvaluation): void {
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

// Generate a report from evaluations
function generateReport(): void {
  // Get all evaluation files
  const evaluationFiles = fs.readdirSync(resultsDir)
    .filter(file => file.endsWith('.json'));
  
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
  report += `Prompt variations: ${Object.values(groupedEvals).flatMap(v => Object.keys(v)).filter((v, i, a) => a.indexOf(v) === i).length}\n\n`;
  
  // Model comparisons
  report += '## Model Comparisons\n\n';
  report += '| Model | Prompt Variation | Avg Score | Scenarios Evaluated |\n';
  report += '|-------|-----------------|-----------|---------------------|\n';
  
  Object.entries(groupedEvals).forEach(([modelId, variations]) => {
    Object.entries(variations).forEach(([variation, evals]) => {
      const avgScore = Math.round(evals.reduce((sum, e) => sum + e.percentageScore, 0) / evals.length);
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
          return scenario?.targetSkill === skill || 
                 (skill === 'multiple' && scenario?.targetSkill === 'multiple');
        });
        
        if (skillEvals.length > 0) {
          const avgScore = Math.round(skillEvals.reduce((sum, e) => sum + e.percentageScore, 0) / skillEvals.length);
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

// Main menu
async function mainMenu(): Promise<void> {
  let running = true;
  
  while (running) {
    console.log('\n===== PROMPT EFFECTIVENESS EVALUATOR =====');
    console.log('1. Display test scenario');
    console.log('2. Import thought chain from file');
    console.log('3. Create thought chain manually');
    console.log('4. Evaluate thought chain');
    console.log('5. Generate report');
    console.log('6. Exit');
    
    const choice = await promptUser('\nEnter choice (1-6): ');
    
    switch (choice) {
      case '1': {
        const scenario = await selectFromList(
          PROMPT_TEST_SCENARIOS,
          (s) => `${s.name} (${s.targetSkill}, ${s.difficulty})`,
          'Select a test scenario:'
        );
        displayScenario(scenario);
        break;
      }
      
      case '2': {
        const thoughts = await importThoughtChain();
        if (thoughts.length > 0) {
          console.log(`Imported ${thoughts.length} thoughts.`);
          // Store in app state
          appState.currentThoughts = thoughts;
        }
        break;
      }
      
      case '3': {
        const thoughts = await createThoughtChain();
        if (thoughts.length > 0) {
          console.log(`Created ${thoughts.length} thoughts.`);
          // Store in app state
          appState.currentThoughts = thoughts;
        }
        break;
      }
      
      case '4': {
        if (!appState.currentThoughts || appState.currentThoughts.length === 0) {
          console.log('No thought chain loaded. Import or create one first.');
          break;
        }
        
        const scenario = await selectFromList(
          PROMPT_TEST_SCENARIOS,
          (s) => `${s.name} (${s.targetSkill}, ${s.difficulty})`,
          'Select a scenario to evaluate against:'
        );
        
        const evaluation = await evaluateThoughtChain(scenario, appState.currentThoughts);
        saveEvaluation(evaluation);
        break;
      }
      
      case '5':
        generateReport();
        break;
      
      case '6':
        running = false;
        break;
      
      default:
        console.log('Invalid choice. Please try again.');
    }
  }
  
  rl.close();
  console.log('\nThank you for using the Prompt Effectiveness Evaluator!');
}

// Run the main menu if this file is executed directly
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  console.log('Starting Prompt Effectiveness Evaluator...');
  mainMenu().catch(error => {
    console.error('An error occurred:', error);
    rl.close();
  });
}

export {
  displayScenario,
  evaluateThoughtChain,
  generateReport,
  importThoughtChain,
  createThoughtChain,
  saveEvaluation
};
