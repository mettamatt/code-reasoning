# Code-Reasoning MCP Server Configuration

This document provides detailed information about all configuration options available for the Code-Reasoning MCP Server. It covers command-line options, configuration file formats, and customization options for various components.

## Table of Contents

- [Command-Line Options](#command-line-options)
- [Configuration Files](#configuration-files)
  - [Claude Desktop Integration](#claude-desktop-integration)
  - [VS Code Integration](#vs-code-integration)
- [Component Configuration](#component-configuration)
  - [Logging Configuration](#logging-configuration)
  - [Testing Configuration](#testing-configuration)
    - [Integrated Test Runner](#integrated-test-runner)
    - [Prompt Evaluation System](#prompt-evaluation-system)

## Command-Line Options

The Code-Reasoning MCP Server supports the following command-line options:

| Option         | Description                                   | Default | Example                  |
| -------------- | --------------------------------------------- | ------- | ------------------------ |
| `--debug`      | Enable debug logging with more verbose output | `false` | `code-reasoning --debug` |
| `--help`, `-h` | Show help information                         | -       | `code-reasoning --help`  |

### Usage Examples

Basic usage:

```bash
code-reasoning
```

Debug mode:

```bash
code-reasoning --debug
```

Help information:

```bash
code-reasoning --help
```

## Configuration Files

### Claude Desktop Integration

Claude Desktop uses a configuration file to manage MCP server settings. This file is located at:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

#### Configuration Format

```json
{
  "mcpServers": {
    "code-reasoning": {
      "command": "code-reasoning",
      "args": ["--debug"]
    }
  }
}
```

#### Available Options

| Option    | Description                                  | Type             | Required |
| --------- | -------------------------------------------- | ---------------- | -------- |
| `command` | The command to run the MCP server            | String           | Yes      |
| `args`    | Command-line arguments to pass to the server | Array of strings | No       |

### VS Code Integration

VS Code integration can be configured in two ways:

1. User Settings (applies to all workspaces):

   - Open VS Code settings: `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) and type `Preferences: Open Settings (JSON)`
   - Add MCP configuration

2. Workspace Settings (applies to current workspace only):
   - Create a `.vscode/mcp.json` file in your workspace

#### Configuration Format (User Settings)

```json
{
  "mcp": {
    "servers": {
      "code-reasoning": {
        "command": "code-reasoning",
        "args": ["--debug"]
      }
    }
  }
}
```

#### Configuration Format (Workspace Settings)

```json
{
  "servers": {
    "code-reasoning": {
      "command": "code-reasoning",
      "args": ["--debug"]
    }
  }
}
```

#### Available Options

| Option    | Description                                  | Type             | Required |
| --------- | -------------------------------------------- | ---------------- | -------- |
| `command` | The command to run the MCP server            | String           | Yes      |
| `args`    | Command-line arguments to pass to the server | Array of strings | No       |

## Component Configuration

### Logging Configuration

The logging system uses direct `console.error()` calls for logging.

#### Logging Approach

The server uses the following streamlined approach:

- All logs are written to stderr using `console.error()`
- Debug logs are only shown when the `--debug` flag is enabled
- The LogLevel enum is still used for compatibility but with simplified implementation
- No log file rotation or custom log directories are supported

#### SERVER_CONFIG

Logging behavior is controlled by the SERVER_CONFIG object in `src/server.ts`:

```typescript
const SERVER_CONFIG: CodeReasoningConfig = {
  maxThoughtLength: 20000,
  timeoutMs: 30_000,
  maxThoughts: 20,
  logLevel: LogLevel.INFO, // Kept for compatibility
  debug: false, // Will be set to true if --debug flag is passed
};
```

The `debug` flag is set based on the command-line argument passed to the server.

### Testing Configuration

The Code-Reasoning MCP Server includes two testing frameworks:

1. The Integrated Test Runner - For testing the server functionality
2. The Prompt Evaluation System - For evaluating prompt effectiveness

#### Integrated Test Runner

The Integrated Test Runner solves the visibility issues with StdioClientTransport and properly handles JSON-RPC protocol requirements. With this approach, you don't need to worry about managing separate terminals or dealing with communication challenges.

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

The Integrated Test Runner:

1. Starts the server automatically
2. Runs the test client connecting to that server
3. Captures all communication between them
4. Logs everything to dedicated files
5. Provides a clear summary of test results

#### Test Command-Line Options

| Option                   | Description                        | Default | Example                           |
| ------------------------ | ---------------------------------- | ------- | --------------------------------- |
| `--verbose`, `-v`        | Show detailed output for each test | `false` | `npm run test -- --verbose`       |
| `--save-results`, `-s`   | Save test results to JSON file     | `false` | `npm run test -- --save-results`  |
| `--debug`                | Start server in debug mode         | `false` | `npm run test -- --debug`         |
| `--timeout=MILLISECONDS` | Set test timeout                   | `30000` | `npm run test -- --timeout=60000` |

#### Specific Test Scenarios

| Scenario   | Description                  | Example                 |
| ---------- | ---------------------------- | ----------------------- |
| `all`      | Run all test scenarios       | `npm run test`          |
| `basic`    | Run basic thought flow tests | `npm run test:basic`    |
| `branch`   | Run thought branching tests  | `npm run test:branch`   |
| `revision` | Run thought revision tests   | `npm run test:revision` |
| `error`    | Run error handling tests     | `npm run test:error`    |
| `perf`     | Run performance tests        | `npm run test:perf`     |

#### Combined Examples

Run basic tests with verbose output:

```bash
npm run test:basic -- --verbose
```

Run performance tests with a longer timeout:

```bash
npm run test:perf -- --timeout=60000
```

Run all tests with debug mode and save results:

```bash
npm run test -- --debug --save-results
```

#### Prompt Evaluation System

The Code-Reasoning MCP Server includes a specialized prompt evaluation system designed to assess Claude's ability to follow the code reasoning prompts. This system is located in the `test/prompt-evaluation` directory.

##### Purpose and Capabilities

The prompt evaluation system allows you to:

- Test different prompt variations against scenario problems
- Verify Claude's adherence to parameter format requirements
- Score solution quality for different scenarios
- Generate comprehensive reports of evaluation results

##### Usage

To use the prompt evaluation system:

```bash
# Run the prompt evaluator
npm run eval

# Same command, alias for running the evaluator
npm run eval:view
```

The interactive CLI will guide you through:

- Selecting different core prompts
- Running evaluations on specific scenarios or all scenarios
- Viewing available scenarios
- Generating reports

##### Setup Requirements

To use the prompt evaluation system, you need:

1. An Anthropic API key
2. A `.env` file in the `test/prompt-evaluation` directory:
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   CLAUDE_MODEL=claude-3-7-sonnet-20250219
   MAX_TOKENS=4000
   TEMPERATURE=0.2
   ```

##### Report Generation

The system automatically generates comprehensive reports that include:

- Parameter adherence results
- Quality scores
- Complete thought chains
- All prompts used in the evaluation

Reports are saved in the `test/prompt-evaluation/reports` directory.
