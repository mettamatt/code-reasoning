/**
 * Main evaluator for prompt testing
 */
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import chalk from 'chalk';
import { ThoughtData, TestResult, CheckResult, PromptScenario, ApiOptions } from './types.js';
import { PROMPT_TEST_SCENARIOS } from './scenarios.js';
import { callAPI, evaluateQuality } from './api.js';
import {
  getActivePrompt,
  ALL_PROMPTS,
  setActivePrompt,
  setCustomPrompt,
  SYSTEM_PROMPT,
} from './core-prompts.js';
import { getPaths, selectFromList, promptUser, closeReadline, formatDate } from './utils.js';

// Get project paths from utility function
const { evaluationsDir, reportsDir } = getPaths();

// Load environment variables from the correct location
const envPath = path.join(evaluationsDir, '.env');
console.log(`Loading environment from: ${envPath}`);
dotenv.config({ path: envPath });

// Ensure reports directory exists
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

/**
 * Check parameter adherence
 */
function checkParameterAdherence(thoughtChain: ThoughtData[]): CheckResult[] {
  const checks: CheckResult[] = [];

  // Check for required parameters
  checks.push({
    name: 'requiredParameters',
    passed: thoughtChain.every(
      t =>
        typeof t.thought === 'string' &&
        typeof t.thought_number === 'number' &&
        typeof t.total_thoughts === 'number' &&
        typeof t.next_thought_needed === 'boolean'
    ),
    details: 'All thoughts must have required parameters',
  });

  // Check for sequential thought numbering
  const hasSequentialNumbering = thoughtChain.every((t, i) => t.thought_number === i + 1);
  checks.push({
    name: 'sequentialNumbering',
    passed: hasSequentialNumbering,
    details: 'Thought numbers must be sequential',
  });

  // Check for proper termination
  const lastThought = thoughtChain[thoughtChain.length - 1];
  checks.push({
    name: 'properTermination',
    passed: lastThought && lastThought.next_thought_needed === false,
    details: 'Final thought must have next_thought_needed set to false',
  });

  // Check for branching parameters
  const branchingThoughts = thoughtChain.filter(
    t => t.branch_from_thought !== undefined && t.branch_id !== undefined
  );
  const validBranching = branchingThoughts.every(
    t =>
      typeof t.branch_from_thought === 'number' &&
      typeof t.branch_id === 'string' &&
      t.branch_from_thought >= 1 &&
      t.branch_from_thought < t.thought_number
  );
  checks.push({
    name: 'branchingParameters',
    passed: branchingThoughts.length === 0 || validBranching,
    details: 'Branching thoughts must have valid branch_from_thought and branch_id',
  });

  // Check for revision parameters
  const revisionThoughts = thoughtChain.filter(t => t.is_revision === true);
  const validRevisions = revisionThoughts.every(
    t =>
      t.is_revision === true &&
      typeof t.revises_thought === 'number' &&
      t.revises_thought >= 1 &&
      t.revises_thought < t.thought_number
  );
  checks.push({
    name: 'revisionParameters',
    passed: revisionThoughts.length === 0 || validRevisions,
    details: 'Revision thoughts must have is_revision=true and valid revises_thought',
  });

  return checks;
}

/**
 * Evaluate a thought chain for a scenario
 */
async function evaluateThoughtChain(
  apiKey: string,
  scenario: PromptScenario,
  thoughtChain: ThoughtData[],
  options: ApiOptions = {}
): Promise<TestResult> {
  // Check parameter adherence
  const checks = checkParameterAdherence(thoughtChain);
  const allChecksPassed = checks.every(check => check.passed);

  // Evaluate solution quality
  const qualityResult = await evaluateQuality(apiKey, scenario, thoughtChain, options);

  // Determine overall status
  const status = allChecksPassed ? 'PASS' : 'FAIL';

  // Create failure message if any checks failed
  let failureMessage;
  if (!allChecksPassed) {
    const failedChecks = checks.filter(check => !check.passed);
    failureMessage = failedChecks.map(check => `${check.name}: ${check.details}`).join('; ');
  }

  // Get active prompt details
  const activePrompt = getActivePrompt();

  // Create test result
  const result: TestResult = {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    status,
    checks,
    failureMessage,
    thoughtChain,
    date: new Date().toISOString(),
    modelId: options.model || 'unknown',
    temperature: options.temperature,
    qualityScore: qualityResult.success ? qualityResult.qualityScore : undefined,
    qualityJustification: qualityResult.success ? qualityResult.justification : undefined,

    // Include all prompts for standalone report
    promptName: activePrompt.key,
    corePrompt: activePrompt.prompt,
    systemPrompt: SYSTEM_PROMPT,
    scenarioPrompt: scenario.problem,
    scenarioDetails: scenario,
  };

  return result;
}

/**
 * Run evaluation on scenarios
 */
async function runEvaluation(
  apiKey: string,
  scenarios: PromptScenario[],
  options: ApiOptions = {}
): Promise<TestResult[]> {
  const results: TestResult[] = [];

  for (const [index, scenario] of scenarios.entries()) {
    console.log(
      chalk.blue(`\nEvaluating scenario ${index + 1} of ${scenarios.length}: ${scenario.name}`)
    );

    try {
      // Call API
      const apiResponse = await callAPI(apiKey, scenario.problem, options);

      // Handle API response
      if (!apiResponse.success) {
        console.error(chalk.red(`API error: ${apiResponse.error}`));
        continue;
      }

      const thoughtChain = apiResponse.thoughtChain;
      if (!thoughtChain || thoughtChain.length === 0) {
        console.error(chalk.red('No thought chain found in API response'));
        continue;
      }

      // Evaluate the thought chain
      const result = await evaluateThoughtChain(apiKey, scenario, thoughtChain, options);

      // Save to results array
      results.push(result);

      // Display status
      const statusText = result.status === 'PASS' ? chalk.green('PASSED') : chalk.red('FAILED');
      console.log(`\nScenario ${scenario.name}: ${statusText}`);

      if (result.status === 'FAIL' && result.failureMessage) {
        console.log(`Failure reason: ${chalk.red(result.failureMessage)}`);
      }

      if (result.qualityScore !== undefined) {
        console.log(`Quality score: ${chalk.yellow(result.qualityScore + '%')}`);
      }
    } catch (error) {
      console.error(chalk.red(`Error evaluating scenario ${scenario.name}:`), error);
    }
  }

  return results;
}

/**
 * Generate report from results
 */
function generateReport(results: TestResult[]): string {
  // Get active prompt info
  const activePrompt = getActivePrompt();

  // Create report content
  let report = `# Prompt Evaluation Report\n\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;

  // Add prompt information
  report += `## Prompt Information\n\n`;
  report += `**Prompt Name:** ${activePrompt.key}\n\n`;
  report += `**System Prompt:**\n\`\`\`\n${SYSTEM_PROMPT}\n\`\`\`\n\n`;
  report += `**Core Prompt:**\n\`\`\`\n${activePrompt.prompt}\n\`\`\`\n\n`;

  // Add summary
  report += `## Summary\n\n`;
  report += `Total scenarios evaluated: ${results.length}\n`;

  const passedCount = results.filter(r => r.status === 'PASS').length;
  report += `Scenarios passed: ${passedCount} (${Math.round((passedCount / results.length) * 100)}%)\n`;

  // Calculate average quality score
  const qualityScores = results.filter(r => r.qualityScore !== undefined).map(r => r.qualityScore!);
  if (qualityScores.length > 0) {
    const avgQuality = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
    report += `Average solution quality: ${Math.round(avgQuality)}%\n\n`;
  }

  // Add detailed results
  report += `## Detailed Results\n\n`;

  for (const result of results) {
    report += `### ${result.scenarioName}\n\n`;
    report += `**Status:** ${result.status}\n`;

    if (result.qualityScore !== undefined) {
      report += `**Quality Score:** ${result.qualityScore}%\n`;
    }

    if (result.qualityJustification) {
      report += `**Quality Justification:** ${result.qualityJustification}\n`;
    }

    if (result.failureMessage) {
      report += `**Failure Reason:** ${result.failureMessage}\n`;
    }

    // Add check results
    report += `\n**Parameter Checks:**\n\n`;
    for (const check of result.checks) {
      const status = check.passed ? '✅ PASS' : '❌ FAIL';
      report += `- ${status} ${check.name}: ${check.details}\n`;
    }

    // Add thought chain
    report += `\n**Thought Chain:**\n\n`;
    for (const thought of result.thoughtChain) {
      report += `**Thought ${thought.thought_number}/${thought.total_thoughts}:**\n\n`;
      report += `${thought.thought}\n\n`;

      // Add metadata
      const metadata = [];
      metadata.push(`next_thought_needed: ${thought.next_thought_needed}`);

      if (thought.is_revision) {
        metadata.push(`is_revision: true`);
        metadata.push(`revises_thought: ${thought.revises_thought}`);
      }

      if (thought.branch_from_thought) {
        metadata.push(`branch_from_thought: ${thought.branch_from_thought}`);
        metadata.push(`branch_id: "${thought.branch_id}"`);
      }

      report += `*Metadata: ${metadata.join(', ')}*\n\n`;
    }

    report += `---\n\n`;
  }

  return report;
}

/**
 * Save report to file
 */
function saveReport(report: string): string {
  const timestamp = formatDate();
  const promptName = getActivePrompt().key;
  const filename = `report-${promptName}-${timestamp}.md`;
  const filepath = path.join(reportsDir, filename);

  fs.writeFileSync(filepath, report);
  return filepath;
}

/**
 * Select prompt interactive function
 */
async function selectPromptInteractive(): Promise<void> {
  console.log('\n=== SELECT CORE PROMPT ===');

  // Create options list
  const options = Object.entries(ALL_PROMPTS).map(([key, value]) => ({
    key,
    value: value.substring(0, 60) + '...',
  }));

  options.push({ key: 'CUSTOM', value: 'Enter your own custom prompt' });

  // Get user selection
  const selection = await selectFromList(
    options,
    item => `${item.key}: ${item.value}`,
    'Select a prompt to use:',
    0
  );

  // Handle selection
  if (selection.key === 'CUSTOM') {
    console.log('\nEnter your custom prompt. Type .done on a new line when finished:');
    let customPrompt = '';
    let line = '';

    // Use a condition that can be evaluated rather than true
    let collecting = true;
    while (collecting) {
      line = await promptUser('');
      if (line.trim() === '.done') {
        collecting = false;
      } else {
        customPrompt += line + '\n';
      }
    }

    setCustomPrompt(customPrompt.trim());
    console.log(chalk.green('\nCustom prompt set successfully'));
  } else {
    setActivePrompt(selection.key);
    console.log(chalk.green(`\nSelected prompt: ${selection.key}`));
  }
}

/**
 * Main CLI menu
 */
async function main(): Promise<void> {
  console.log(chalk.bold.blue('\n--------------------------------------------------'));
  console.log(chalk.bold.blue('CODE REASONING TOOL - PROMPT EVALUATOR'));
  console.log(chalk.bold.blue('--------------------------------------------------\n'));

  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(chalk.red('Error: ANTHROPIC_API_KEY environment variable not set'));
    console.error(chalk.red('Please add it to your .env file'));
    return;
  }

  // Default options
  const defaultOptions: ApiOptions = {
    model: process.env.CLAUDE_MODEL || 'claude-3-7-sonnet-20250219',
    temperature: parseFloat(process.env.TEMPERATURE || '0.2'),
    maxTokens: parseInt(process.env.MAX_TOKENS || '4000'),
  };

  // Main menu options
  const options = [
    { label: 'Select core prompt', value: 'select-prompt' },
    { label: 'Run evaluation on specific scenario', value: 'run-specific' },
    { label: 'Run evaluation on all scenarios', value: 'run-all' },
    { label: 'List available scenarios', value: 'list-scenarios' },
    { label: 'Exit', value: 'exit' },
  ];

  let running = true;
  while (running) {
    const activePrompt = getActivePrompt();
    console.log(chalk.yellow(`\nActive prompt: ${activePrompt.key}`));

    const selection = await selectFromList(options, opt => opt.label, 'Select an option:', 0);

    // Define variables outside the switch cases
    let scenario;
    let results;
    let report;
    let reportPath;
    let allResults;
    let allReport;
    let allReportPath;

    switch (selection.value) {
      case 'select-prompt':
        await selectPromptInteractive();
        break;

      case 'list-scenarios':
        console.log('\n=== AVAILABLE SCENARIOS ===');
        PROMPT_TEST_SCENARIOS.forEach((scenario, index) => {
          console.log(
            `${index + 1}. ${scenario.name} (${scenario.difficulty}, ${scenario.targetSkill})`
          );
        });
        await promptUser('\nPress Enter to continue...');
        break;

      case 'run-specific':
        console.log('\n=== RUN SPECIFIC SCENARIO ===');
        scenario = await selectFromList(
          PROMPT_TEST_SCENARIOS,
          s => `${s.name} (${s.difficulty}, ${s.targetSkill})`,
          'Select a scenario to evaluate:',
          0
        );

        console.log(chalk.yellow(`\nRunning evaluation for scenario: ${scenario.name}`));
        results = await runEvaluation(apiKey, [scenario], defaultOptions);

        if (results.length > 0) {
          report = generateReport(results);
          reportPath = saveReport(report);
          console.log(chalk.green(`\nReport saved to: ${reportPath}`));
        }

        await promptUser('\nPress Enter to continue...');
        break;

      case 'run-all':
        console.log('\n=== RUN ALL SCENARIOS ===');
        console.log(
          chalk.yellow(`Running evaluation for all ${PROMPT_TEST_SCENARIOS.length} scenarios...`)
        );

        allResults = await runEvaluation(apiKey, PROMPT_TEST_SCENARIOS, defaultOptions);

        if (allResults.length > 0) {
          allReport = generateReport(allResults);
          allReportPath = saveReport(allReport);
          console.log(chalk.green(`\nReport saved to: ${allReportPath}`));
        }

        await promptUser('\nPress Enter to continue...');
        break;

      case 'exit':
        console.log('\nExiting...');
        running = false;
        break;
    }
  }

  closeReadline();
}

// CLI entry point
// For ES modules, we need a different approach than require.main === module
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch(console.error);
}

// Export functions for programmatic use
export { runEvaluation, evaluateThoughtChain, generateReport, saveReport };
