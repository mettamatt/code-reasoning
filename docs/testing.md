# Testing the Code-Reasoning MCP Server

This document provides basic information about testing the Code-Reasoning MCP Server. For most users, this information is only relevant if you're developing or extending the server.

## Basic Testing Commands

The Code-Reasoning MCP Server includes an automated testing framework. To run tests:

```bash
# Run basic tests
npm test

# Run with verbose output
npm run test:verbose

# Run specific test scenarios
npm run test:basic      # Basic thought flow
npm run test:branch     # Thought branching
npm run test:revision   # Thought revision
npm run test:error      # Error handling
npm run test:perf       # Performance testing
```

## What These Tests Verify

The testing framework verifies that the MCP server:

- Processes linear sequences of thoughts correctly
- Handles thought branching for exploring alternative approaches
- Processes thought revisions properly
- Responds appropriately to error conditions
- Performs efficiently with longer thought chains

## Prompt Evaluation System

The server also includes a prompt evaluation system that checks how well Claude follows the code reasoning prompts:

```bash
# Run the prompt evaluator with an interactive menu
npm run eval
```

The evaluation system helps compare different prompt variations and generates reports on Claude's adherence to the format requirements.

## Troubleshooting

- For debugging issues, use the `--debug` flag when starting the server
- For more detailed test information, use `npm run test:verbose`
- Ensure your project is properly built before testing with `npm run build`

For most users, these testing features are only needed when developing new functionality for the MCP server.
