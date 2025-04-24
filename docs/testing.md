# Code-Reasoning MCP Server Test Framework

This document describes the testing framework for the Code-Reasoning MCP Server, which provides a structured approach to verify the functionality, reliability, and performance of the sequential thinking capabilities.

## Overview

The testing framework simulates Claude Desktop by creating an MCP client that connects to the sequential thinking server and sends various thought patterns to test different aspects of the server's functionality. It includes comprehensive test scenarios, error handling tests, and performance benchmarking.

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

### Running All Tests

```bash
npm run test
```

### Running Specific Test Scenarios

```bash
npm run test:basic      # Run only basic thought flow tests
npm run test:branch     # Run only thought branching tests
npm run test:revision   # Run only thought revision tests
npm run test:error      # Run only error handling tests
npm run test:perf       # Run only performance tests
```

### Options

You can add options to any test command:

```bash
# Run with verbose output
npm run test -- --verbose

# Run with visualization dashboard
npm run test -- --visualize

# Save test results to file
npm run test -- --save-results

# Set custom timeout (in milliseconds)
npm run test -- --timeout=60000

# Run specific scenario with options
npm run test -- branch --verbose --visualize
```

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
~/.code-reasoning/test-results/test-results-[TIMESTAMP].json
```

## Extending the Test Framework

### Adding New Test Scenarios

To add a new test scenario:

1. Open `test/test-client.ts`
2. Add a new entry to the `testScenarios` object with the format:

```typescript
newScenario: {
  name: "New scenario name",
  description: "Description of what this scenario tests",
  thoughts: [
    // Array of thought objects that follow the ThoughtData interface
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
"test:newscenario": "node dist/test/test-client.js newscenario"
```

### Customizing Performance Tests

For more advanced performance testing, you can:

1. Modify the `perf` scenario in `testScenarios` to include more thoughts or different patterns
2. Add custom performance metrics calculations in the test client
3. Create specialized performance scenarios that focus on specific aspects:
   - Thought branching performance
   - Revision performance
   - Long thought chain performance

## Troubleshooting

### Common Issues

- **Timeout errors**: Increase the timeout using `--timeout=60000` (or higher value)
- **Connection failures**: Ensure the server path is correct and the server can start properly
- **Unexpected errors**: Run with `--verbose` to see detailed error information
- **Dashboard unavailable**: Make sure port 3000 is free or specify a different port

### Debugging

For deeper debugging:

1. Run the server in debug mode: `npm run debug`
2. Run tests with visualization: `npm run test -- --visualize`
3. Check the logs in `~/.code-reasoning/logs/`
4. Use the visualization dashboard to analyze thought processing

## Maintenance

The test framework should be updated when:

- New features are added to the sequential thinking server
- API changes are made to the server
- New edge cases or error conditions are identified
- Performance optimization work is being done