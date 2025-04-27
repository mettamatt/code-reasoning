/**
 * Core evaluation functions for prompt assessment - Pass/Fail System
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  PromptScenario,
  ThoughtData,
  TestResult,
  CheckResult,
  TestStatus,
  EvaluationOptions,
} from './types.js';
import { getPaths } from './utils.js';
import {
  validateThoughtChain,
  calculateStructureMetrics,
  getFailureDetail,
  getRequiredChecks,
} from './automated-metrics.js';

/**
 * Evaluate a thought chain against a scenario using pass/fail approach
 */
export async function evaluateThoughtChain(
  scenario: PromptScenario,
  thoughts: ThoughtData[],
  options: EvaluationOptions = {}
): Promise<TestResult> {
  console.log('\n----- PASS/FAIL EVALUATION -----');

  // Run validation checks
  const validationChecks = validateThoughtChain(thoughts, scenario);

  // Calculate structure metrics for informational purposes
  const structureMetrics = calculateStructureMetrics(thoughts);
  console.log('\nThought Chain Analysis:');
  console.log(`- Total thoughts: ${structureMetrics.totalThoughts}`);
  console.log(`- Uses revisions: ${structureMetrics.revisionCount > 0 ? 'Yes' : 'No'}`);
  console.log(`- Number of branches: ${structureMetrics.branchCount}`);
  console.log(`- Completion status: ${structureMetrics.completionStatus}`);

  // Prepare check results
  const checks: CheckResult[] = Object.entries(validationChecks).map(([name, passed]) => ({
    name,
    passed,
    details: passed ? undefined : getFailureDetail(name, thoughts, scenario),
  }));

  // Log check results
  console.log('\nValidation Checks:');
  checks.forEach(check => {
    const status = check.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`- ${check.name}: ${status}`);
    if (!check.passed && check.details) {
      console.log(`  Reason: ${check.details}`);
    }
  });

  // Determine overall status
  const requiredChecks = getRequiredChecks(scenario);
  const allRequiredPassed = requiredChecks.every(checkName => {
    const found = validationChecks[checkName];
    return found === true;
  });

  // Find primary failure message if failed
  let failureMessage: string | undefined;
  if (!allRequiredPassed) {
    const failedCheck = checks.find(check => !check.passed && requiredChecks.includes(check.name));
    failureMessage = failedCheck
      ? `${failedCheck.name}: ${failedCheck.details}`
      : 'Failed required checks';
  }

  const status: TestStatus = allRequiredPassed ? 'PASS' : 'FAIL';
  console.log(`\nOverall Status: ${status === 'PASS' ? '✅ PASS' : '❌ FAIL'}`);
  if (failureMessage) {
    console.log(`Failure Reason: ${failureMessage}`);
  }

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    status,
    checks,
    failureMessage,
    thoughtChain: thoughts,
    date: new Date().toISOString(),
    modelId: options.model || 'claude-3-7-sonnet-20250219',
    promptVariation: options.promptVariation || 'baseline',
  };
}

/**
 * Save a test result to file
 */
export function saveTestResult(result: TestResult): void {
  const { resultsDir } = getPaths();

  // Create a descriptive filename
  const filename = `${result.scenarioId}-${result.status.toLowerCase()}-${result.modelId.replace(/:/g, '-')}-${result.promptVariation.replace(/\s+/g, '-')}-${Date.now()}.json`;
  const filePath = path.join(resultsDir, filename);

  // Save the complete test result to file
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
  console.log(`\nTest result saved to ${filePath}`);
}

/**
 * Generate a simple pass/fail report for all tests
 */
export async function generateReport(): Promise<void> {
  const { evaluationsDir, resultsDir } = getPaths();

  // Read test results
  const files = fs.readdirSync(resultsDir).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.log('No test results found. Run some evaluations first.');
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
      console.warn(`Skipped file ${file}: not a valid TestResult`);
    }
  }

  if (results.length === 0) {
    console.log('No valid test results found.');
    return;
  }

  // Generate markdown report
  let md = '# Code Reasoning Tool - Pass/Fail Report\n\n';
  md += `Generated: ${new Date().toISOString()}\n\n`;

  // Count pass/fail
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  md += `**Summary**: ${passed} passed, ${failed} failed (${Math.round((passed / results.length) * 100)}% pass rate)\n\n`;

  // Summary table
  md += '| Scenario | Status | Failure Reason |\n';
  md += '|----------|--------|----------------|\n';

  results.forEach(result => {
    const statusEmoji = result.status === 'PASS' ? '✅' : '❌';
    md += `| ${result.scenarioName} | ${statusEmoji} ${result.status} | ${result.failureMessage || '-'} |\n`;
  });

  // Append detailed results
  md += '\n## Detailed Results\n\n';

  results.forEach(result => {
    md += `### ${result.scenarioName}: ${result.status === 'PASS' ? '✅' : '❌'} ${result.status}\n\n`;

    if (result.status === 'FAIL') {
      md += `**Failure reason:** ${result.failureMessage}\n\n`;
    }

    md += '| Check | Status | Details |\n';
    md += '|-------|--------|--------|\n';

    result.checks.forEach(check => {
      md += `| ${check.name} | ${check.passed ? '✅ PASS' : '❌ FAIL'} | ${check.details || '-'} |\n`;
    });

    md += '\n';
  });

  // Write report
  const reportPath = path.join(evaluationsDir, `pass-fail-report-${Date.now()}.md`);
  fs.writeFileSync(reportPath, md);
  console.log(`Report generated: ${reportPath}`);
}
