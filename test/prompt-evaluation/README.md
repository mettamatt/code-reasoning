# Pass/Fail Evaluation System for Code Reasoning Tool

This directory contains a simplified pass/fail evaluation system for the code-reasoning tool, replacing the previous percentage-based system.

## Overview

The pass/fail system performs direct boolean checks against specific criteria instead of calculating percentage scores. Each test scenario is either PASS or FAIL, with clear reasons for failures.

## How It Works

1. **Direct Boolean Checks**: The system performs specific checks for each test scenario, like verifying branching, revision, parameter correctness, etc.

2. **Template-Based Feedback**: Clear templates for both pass and fail messages ensure consistent, informative feedback.

3. **Simplified Reporting**: Reports clearly show pass/fail status with details about which checks failed and why.

## Directory Structure

- `core/types.ts`: Data structures for pass/fail evaluation
- `core/automated-metrics.ts`: Direct boolean validation checks
- `core/evaluation.ts`: Pass/fail evaluation logic
- `core/index.ts`: Export file for the system
- `api-evaluator.ts`: CLI for running evaluations with the pass/fail system
- `evaluator.ts`: Tool for viewing scenarios and test results
- `simple-evaluator.ts`: Simple script for testing a single scenario

## Key Interfaces

### TestResult Interface

```typescript
export interface TestResult {
  scenarioId: string;
  scenarioName: string;
  status: 'PASS' | 'FAIL';
  checks: CheckResult[];
  failureMessage?: string;
  thoughtChain: ThoughtData[];
  date: string;
  modelId: string;
  promptVariation: string;
}
```

### CheckResult Interface

```typescript
export interface CheckResult {
  name: string;
  passed: boolean;
  details?: string;
}
```

### ValidationChecks Interface

```typescript
export interface ValidationChecks {
  hasRequiredParameters: boolean;
  hasSequentialNumbering: boolean;
  hasBranchingWhenRequired: boolean;
  hasRevisionWhenRequired: boolean;
  hasProperTermination: boolean;
  [key: string]: boolean; // Allow for additional scenario-specific checks
}
```

## Usage

To use the pass/fail evaluation system:

```bash
# Ensure you have the Anthropic API key set
export ANTHROPIC_API_KEY=your_api_key

# Run the pass/fail evaluator
npm run eval:api

# Or view scenarios and test results
npm run eval:prompt

# Or run a simple test with the first scenario
npm run eval:simple
```

The evaluation results will be saved as JSON files and summarized in a markdown report.

## Key Benefits

1. **Simpler Evaluation Logic**: Direct boolean checks instead of complex percentage calculations
2. **Clearer Feedback**: Explicit pass/fail status with specific reasons for failures
3. **Template-Based Approach**: Standardized formats for different thought types in the prompt
4. **Better Report Format**: Focus on what actually passed or failed rather than arbitrary percentages
