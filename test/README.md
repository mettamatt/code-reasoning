# Testing in Code-Reasoning

This directory contains testing tools for the Code-Reasoning project.

## End-to-End Test Runner

The `code-reasoning.e2e.ts` file provides a streamlined test runner solution that eliminates the need for separate terminals or complex debugging setups.

### Understanding the Testing Challenges

Testing Code-Reasoning presents two key challenges:

1. **StdioClientTransport Limitations**: The standard test client uses StdioClientTransport which captures stdout for JSON-RPC communication, making normal console output invisible.

2. **JSON-RPC Protocol Compliance**: The protocol requires proper handling of notifications (messages without an ID field), which don't receive responses.

### The Solution

The `code-reasoning.e2e.ts` solves these challenges by:

1. Managing both server and client processes automatically
2. Properly handling JSON-RPC notifications without waiting for responses
3. Logging all communications to dedicated files
4. Providing clear test result summaries

### How to Use

The simplest way to run tests is through the npm scripts:

```bash
# Run basic test scenario
npm test

# With verbose output
npm run test:verbose

# Run specific scenarios
npm run test:basic
npm run test:branch
npm run test:revision
npm run test:error
npm run test:perf
```

Alternatively, you can run the test runner directly:

```bash
cd ~/Sites/code-reasoning
node test/code-reasoning.e2e.js [scenario] [options]
```

**Options:**
- `basic` - Run basic tests (default)
- `branch` - Run branching tests
- `revision` - Run revision tests
- `error` - Run error tests
- `perf` - Run performance tests
- `--verbose` - Show detailed output

### Output and Logs

The integrated test runner provides:

1. Real-time test progress in the console
2. Comprehensive log files:
   - `logs/custom-test-{timestamp}.log` - Test execution logs
   - `test-results/custom-result-{timestamp}.json` - Structured test results

## Prompt Effectiveness Evaluation

The `prompt-evaluation` directory contains tools to evaluate the effectiveness of the SEQUENTIAL_THINKING_TOOL prompt itself - not just whether the code works, but how well the prompt guides models to use sequential thinking effectively.

### What It Measures

This evaluation system measures:

1. **Branching Understanding**: Do models know when to use branching to explore multiple approaches?
2. **Revision Understanding**: Do models correctly use revisions when discovering errors?
3. **Parameter Correctness**: Do models use the tool's parameters correctly?
4. **Thought Depth**: Do models provide sufficiently deep, detailed thoughts?
5. **Reasoning Completion**: Do models correctly identify when reasoning is complete?

### How It Works

The evaluation process:

1. Present specialized test scenarios to a model
2. Capture the model's reasoning chain
3. Evaluate how well the model followed the prompt's guidance
4. Compare effectiveness across different models or prompt variations

### How to Use

```bash
cd ~/Sites/code-reasoning
node dist/test/prompt-evaluation/evaluator.js
```

See the detailed README in the `prompt-evaluation` directory for step-by-step instructions.

### Privacy-Friendly Approach

This evaluation system respects privacy:

- No automatic tracking or analytics
- All evaluations are manual and explicit
- Data is stored locally on your machine
- You control what gets recorded and evaluated
