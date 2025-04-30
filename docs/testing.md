# Code-Reasoning MCP Server Test Framework

This document describes the testing framework for the Code-Reasoning MCP Server, which provides a structured approach to verify the functionality, reliability, and performance of the sequential thinking capabilities.

## Overview

The testing framework uses the integrated test runner to connect to the sequential thinking server and send various thought patterns to test different aspects of the server's functionality. It includes comprehensive test scenarios, error handling tests, and performance benchmarking.

### Why This Approach Works

The Integrated Test Runner solves two key issues:

1. **StdioClientTransport Limitations**: The standard test client uses StdioClientTransport which captures stdout for JSON-RPC communication, making normal console output invisible.

2. **JSON-RPC Protocol Compliance**: The runner properly handles JSON-RPC notifications (messages without an ID field), which don't receive responses according to the protocol.

### Important Note

The Integrated Test Runner is the only supported testing approach for Code-Reasoning. The alternative approaches that previously existed have been removed to streamline the testing process and ensure consistent results.

## Command Reference

| Command                 | Description                                    |
| ----------------------- | ---------------------------------------------- |
| `npm test`              | Run basic test scenario with integrated runner |
| `npm run test:basic`    | Run basic test scenario                        |
| `npm run test:branch`   | Run branching test scenario                    |
| `npm run test:revision` | Run revision test scenario                     |
| `npm run test:error`    | Run error handling test scenario               |
| `npm run test:perf`     | Run performance test scenario                  |
| `npm run test:verbose`  | Run with verbose output                        |

## Test Scenarios

The framework includes the following test scenarios:

### Basic Thought Flow

Tests a linear sequence of thoughts without branches or revisions. This verifies the core functionality of the sequential thinking server.

- **Expected outcome**: All thoughts should be processed successfully
- **Success criteria**: 4 successful thoughts, 0 errors

### Branching Thought Flow

Tests the ability to branch into alternative thought paths. This verifies the server's ability to handle thought branching, which is essential for exploring multiple solution approaches.

- **Expected outcome**: All thoughts including branches should be processed successfully
- **Success criteria**: 7 successful thoughts, 0 errors

### Revision Thought Flow

Tests the ability to revise previous thoughts. This verifies the server's ability to handle thought revisions, which is essential for correcting errors in reasoning.

- **Expected outcome**: All thoughts including revisions should be processed successfully
- **Success criteria**: 5 successful thoughts, 0 errors

### Error Handling Tests

Tests various error conditions and edge cases. This verifies the server's robustness and ability to handle invalid inputs.

- **Expected outcome**: Most thoughts should fail with appropriate error responses, with one valid thought succeeding
- **Success criteria**: 1 successful thought, 5 errors

### Performance Testing

Tests performance with a long sequence of thoughts. This measures the server's ability to handle extended thought chains efficiently.

- **Expected outcome**: All thoughts should be processed successfully
- **Success criteria**: 20 successful thoughts, 0 errors
- **Performance metrics**: Response times, throughput

## Running Tests

### Prerequisites

- Node.js 18+ installed
- Project dependencies installed (`npm install`)
- Project built (`npm run build`)

### Testing with the Integrated Test Runner

The project includes an integrated test runner that solves the visibility issues with StdioClientTransport. This solution manages both server and client processes automatically, logs all communication to dedicated files, and provides clear test result summaries.

For most testing needs, use these simple commands:

```bash
# Run basic tests
npm test

# Run with verbose output
npm run test:verbose

# Run specific test scenarios
npm run test:basic
npm run test:branch
npm run test:revision
npm run test:error
npm run test:perf
```

The integrated test runner:

1. Starts the server automatically
2. Runs the test client connecting to that server
3. Captures all communication between them
4. Logs everything to dedicated files
5. Provides a clear summary of test results

You don't need to worry about managing separate terminals or dealing with StdioClientTransport limitations.

### Running Specific Test Scenarios

```bash
# These commands use the integrated test runner
npm run test:basic      # Run only basic thought flow tests
npm run test:branch     # Run only thought branching tests
npm run test:revision   # Run only thought revision tests
npm run test:error      # Run only error handling tests
npm run test:perf       # Run only performance tests
```

### Options

You can use these options with the integrated test runner:

```bash
# Run with verbose output
npm run test:verbose

# Run a specific scenario with verbose output
node test/integrated-test-runner.js basic --verbose
```

### What to Expect

When you run tests with the Integrated Test Runner:

1. Server and client processes will start automatically
2. Test progress will be displayed in the console
3. Detailed logs will be created in:
   - `logs/custom-test-{timestamp}.log` - Test execution logs
   - `test-results/custom-result-{timestamp}.json` - Test results in JSON format

## Test Results

The test client outputs detailed results for each test scenario:

1. **Connection status**: Confirms successful connection to the server
2. **Available tools**: Lists the tools provided by the server
3. **Test scenarios**: Results for each test scenario, showing:
   - Number of successful/failed thoughts
   - Whether results match expected outcomes
   - Duration of each thought processing
4. **Overall results**: Summary of all test scenarios
5. **Performance metrics**: For scenarios with performance focus, shows:
   - Total duration
   - Average response time
   - Minimum response time
   - Maximum response time
   - Throughput (thoughts per second)

### Saving Test Results

When run with the `--save-results` option, test results are saved to:

```
./test-results/test-results-[TIMESTAMP].json
```

## Extending the Test Framework

### Adding New Test Scenarios

To add a new test scenario:

1. Open `test/integrated-test-runner.js`
2. Add a new entry to the `testScenarios` object with the format:

```javascript
newScenario: {
  name: "New scenario name",
  description: "Description of what this scenario tests",
  thoughts: [
    // Array of thought objects
    {
      thought: "First thought in the scenario",
      thought_number: 1,
      total_thoughts: 3,
      next_thought_needed: true
    },
    // Add more thoughts...
  ],
  expectedSuccessCount: 3, // Number of thoughts expected to succeed
  expectedErrorCount: 0    // Number of thoughts expected to fail
}
```

3. Optionally add a new npm script in `package.json` to run just this scenario:

```json
"test:newscenario": "node test/integrated-test-runner.js newscenario"
```

### Customizing Performance Tests

For more advanced performance testing, you can:

1. Modify the `perf` scenario in `testScenarios` to include more thoughts or different patterns
2. Add custom performance metrics calculations in the test client
3. Create specialized performance scenarios that focus on specific aspects:

   - Thought branching performance
   - Revision performance
   - Long thought chain performance

4. Run with verbose output for more detailed information:
   ```bash
   npm run test:verbose
   ```

## Prompt Evaluation System

In addition to the standard test framework, the Code-Reasoning MCP Server includes a specialized prompt evaluation system designed to assess Claude's ability to follow the code reasoning prompts. This system is located in the `test/prompt-evaluation` directory.

### Purpose and Capabilities

The prompt evaluation system allows you to:

- Test different prompt variations against scenario problems
- Verify Claude's adherence to parameter format requirements
- Score solution quality for different scenarios
- Generate comprehensive reports of evaluation results

### Usage

To use the prompt evaluation system:

```bash
# Run the prompt evaluator with interactive menu
npm run eval

# Same command, alias for running the evaluator
npm run eval:view
```

The interactive CLI will guide you through:

- Selecting different core prompts
- Running evaluations on specific scenarios or all scenarios
- Viewing available scenarios
- Generating reports

### Example Evaluation Flow

```
? Select an option: › - Use arrow-keys. Return to select.
    Run evaluation on all scenarios
    Run evaluation on specific scenario
    View available scenarios
    Select core prompt
    Exit

? Select a scenario to evaluate: › - Use arrow-keys. Return to select.
    fibonacci
    sorting-algorithm-selection
    api-design
    debugging-recursive-function
    back

Evaluating scenario "fibonacci" with DEFAULT prompt...
Processing thought chain...
Extracting parameters...
Scoring solution quality...

Evaluation complete! Report saved to:
test/prompt-evaluation/reports/eval-DEFAULT-fibonacci-20250430-1208.json
```

### Available Core Prompts

The prompt evaluation system allows testing different prompt variations:

```
? Select a core prompt: › - Use arrow-keys. Return to select.
    DEFAULT - The standard code reasoning prompt
    SEQUENTIAL - The original sequential thinking prompt
    CODE_REASONING_0_30 - The prompt used for the 0.30 version
    CUSTOM - Create your own custom prompt
    back
```

### Creating a Custom Prompt

You can also test with your own custom prompt:

```
Enter your custom prompt below.
Type .done on a new line when finished.

This is a tool for solving complex programming problems step by step.
Each thought should build on previous ones and include code examples when relevant.

For each step, include:
- Clear explanation of your reasoning
- Code examples when applicable
- Consideration of edge cases

.done

Custom prompt saved! You can now run evaluations with this prompt.
```

### Key Components

The system consists of these main files:

- **evaluator.ts** - Main evaluation logic and CLI interface
- **api.ts** - API integration with Anthropic's Claude
- **types.ts** - TypeScript types for the evaluation system
- **utils.ts** - Utility functions for file I/O, CLI interaction
- **core-prompts.ts** - Storage and management of different prompt variations
- **scenarios.ts** - Test scenarios with problems to evaluate

### Setup Requirements

To use the prompt evaluation system, you need:

1. An Anthropic API key
2. A `.env` file in the `test/prompt-evaluation` directory:
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   CLAUDE_MODEL=claude-3-7-sonnet-20250219
   MAX_TOKENS=4000
   TEMPERATURE=0.2
   ```

### Report Generation

The evaluation system generates comprehensive reports that include:

- Parameter adherence metrics (whether Claude correctly follows the required parameter format)
- Solution quality scores (how well Claude solved the programming problem)
- Complete thought chains (the entire sequence of thoughts from Claude)
- The prompts used in the evaluation (for comparing different prompt variations)

Reports are saved in the `test/prompt-evaluation/reports` directory with filenames that include the prompt name and timestamp (e.g., `eval-DEFAULT-fibonacci-20250430-1208.json`).

## Troubleshooting

### Common Issues

- **JSON-RPC protocol errors**: These can occur if modifications are made to the communication protocol. The integrated test runner properly handles JSON-RPC notifications.
- **Connection failures**: Ensure the server path is correct and the server can start properly.
- **Unexpected errors**: Run with `--verbose` to see detailed error information.
- **API Key Issues**: For prompt evaluation, ensure your ANTHROPIC_API_KEY is correctly set in the .env file
- **Missing Reports**: Verify the reports directory exists and has write permissions

### Debugging

For debugging test issues:

1. Check the detailed log files:

   ```bash
   # View the client logs
   cat logs/custom-test-*.log

   # View the test results
   cat test-results/custom-result-*.json
   ```

   =======

2. Run with verbose output for more detailed information:
   ```bash
   npm run test:verbose
   ```

## Maintenance

The test framework should be updated when:

- New features are added to the sequential thinking server
- API changes are made to the server
- New edge cases or error conditions are identified
- Performance optimization work is being done
