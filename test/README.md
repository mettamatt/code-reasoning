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

The `prompt-evaluation` directory contains tools to evaluate the effectiveness of the CODE_REASONING_TOOL prompt using the Anthropic API. The system measures how well Claude understands and follows the guidance in the prompt when solving complex programming problems.

### What It Measures

This evaluation system measures:

1. **Branching Understanding**: Do models know when to use branching to explore multiple approaches?
2. **Revision Understanding**: Do models correctly use revisions when discovering errors?
3. **Parameter Correctness**: Do models use the tool's parameters correctly?
4. **Thought Depth**: Do models provide sufficiently deep, detailed thoughts?
5. **Reasoning Completion**: Do models correctly identify when reasoning is complete?

### How It Works

The evaluation process:

1. Select test scenarios that target specific aspects of the prompt
2. Send these scenarios to Claude via the Anthropic API
3. Extract and analyze Claude's responses
4. Evaluate how well Claude followed the prompt's guidance
5. Generate reports comparing different models or prompt variations

### API-Based Evaluation

```bash
cd ~/Sites/code-reasoning
npm run eval:api
```

For viewing scenarios and generating reports:

```bash
cd ~/Sites/code-reasoning
npm run eval:prompt
```

See the detailed README in the `prompt-evaluation` directory for complete instructions on using the API integration.
