# Pass/Fail Prompt Evaluation System

This document describes the pass/fail evaluation system that replaces the previous percentage-based approach with direct boolean checks and clear feedback.

## Key Features

### 1. Direct Boolean Checks

The system performs specific boolean checks for each aspect of parameter usage:

- `hasRequiredParameters` - All thoughts have required fields
- `hasSequentialNumbering` - Thought numbers increment correctly
- `hasProperTermination` - Chain properly terminates
- `hasBranchingWhenRequired` - Uses branching when needed
- `hasRevisionWhenRequired` - Uses revision when needed

### 2. Skill-Specific Required Checks

Each test type has specific required checks:

- Branching tests require `hasBranchingWhenRequired`
- Revision tests require `hasRevisionWhenRequired`
- Multiple skills tests require both branching and revision
- Depth tests require minimum number of thoughts
- Completion tests require proper termination

### 3. Clear Success/Failure Messaging

Tests provide specific, actionable feedback:

- Failures include detailed reasons for each failed check
- Pass results highlight the specific skills demonstrated
- Reports clearly show which checks passed and failed

### 4. Template-Based Prompt

The updated prompt in server.ts includes:

- Clear critical rules that lead to automatic failure
- Exact templates for main chain, branching, and revision thoughts
- Specific guidance on parameter usage

## Using the Pass/Fail System

When running `npm run eval:api`, you'll see the new pass/fail evaluation in action:

```
===== PASS/FAIL TEST RESULTS =====
Overall: 4 passed, 3 failed (57% pass rate)

1. Algorithm Selection Problem: PASS

2. Bug Identification Problem: FAIL
   Reason: hasRevisionWhenRequired: Missing revision in a scenario that requires it
   Failed checks:
   - hasRevisionWhenRequired: Missing revision in a scenario that requires it
```

## Understanding the Results

The evaluation output now shows:

- Overall pass/fail status for each scenario
- Specific reason for failures
- List of which specific checks passed or failed
- Clear guidance on what was missing

## Best Practices for Testing

1. Focus on the specific checks that failed rather than percentages
2. Look for patterns in which skill types are consistently failing
3. Update the prompt templates if certain patterns are consistently missed
4. Use the `evaluator.ts` tool to examine detailed results

## Interpreting Results

Pass/fail results provide clearer insights than percentages:

- A FAIL result tells you exactly what was missing
- The details show which specific aspects of parameter usage failed
- The clear templates in the prompt make it easier to identify why the model might be struggling

The goal is to improve the templates and critical rules in the prompt until all test scenarios consistently pass.
