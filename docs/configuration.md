# Code-Reasoning MCP Server Configuration

This document provides detailed information about all configuration options available for the Code-Reasoning MCP Server. It covers command-line options, environment variables, configuration file formats, and customization options for various components.

## Table of Contents

- [Command-Line Options](#command-line-options)
- [Environment Variables](#environment-variables)
- [Configuration Files](#configuration-files)
  - [Claude Desktop Integration](#claude-desktop-integration)
  - [VS Code Integration](#vs-code-integration)
- [Component Configuration](#component-configuration)
  - [Logger Configuration](#logger-configuration)
  - [Testing Configuration](#testing-configuration)

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

## Environment Variables

The Code-Reasoning MCP Server supports the following environment variables:

| Variable                       | Description                         | Default                  | Example                                                         |
| ------------------------------ | ----------------------------------- | ------------------------ | --------------------------------------------------------------- |
| `CODE_REASONING_DEBUG`         | Enable debug logging                | `false`                  | `CODE_REASONING_DEBUG=true code-reasoning`                      |
| `CODE_REASONING_LOG_DIR`       | Set custom log directory            | `~/.code-reasoning/logs` | `CODE_REASONING_LOG_DIR=/var/log/code-reasoning code-reasoning` |
| `CODE_REASONING_MAX_LOG_FILES` | Maximum number of log files to keep | `10`                     | `CODE_REASONING_MAX_LOG_FILES=20 code-reasoning`                |

### Priority Order

Configuration is applied in the following priority order (highest to lowest):

1. Command-line options
2. Environment variables
3. Default values

For example, if both `--debug` and `CODE_REASONING_DEBUG=false` are set, the command-line option takes precedence, and debug mode will be enabled.

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

### Logger Configuration

The Logger component can be configured using environment variables or by modifying the `src/logger.ts` file.

#### Environment Variables

| Variable                       | Description               | Default                  | Example                                          |
| ------------------------------ | ------------------------- | ------------------------ | ------------------------------------------------ |
| `CODE_REASONING_LOG_DIR`       | Custom log directory      | `~/.code-reasoning/logs` | `CODE_REASONING_LOG_DIR=/var/log/code-reasoning` |
| `CODE_REASONING_MAX_LOG_FILES` | Maximum log files to keep | `10`                     | `CODE_REASONING_MAX_LOG_FILES=20`                |

#### Modifying Logger Behavior

To modify the Logger's behavior, you can edit the `src/logger.ts` file:

```typescript
// Example: Change default log level and log rotation settings
export class Logger {
  private logStream: fs.WriteStream | null = null;
  private logLevel: LogLevel;

  // Change default log level from INFO to DEBUG
  constructor(level: LogLevel = LogLevel.DEBUG, logToFile: boolean = true) {
    this.logLevel = level;

    if (logToFile) {
      this.setupLogFile();
    }
  }

  private rotateLogFiles(logDir: string) {
    try {
      // Change maximum log files from 10 to 20
      const MAX_LOG_FILES = 20;
      // ...rest of the method remains the same
    } catch (err) {
      console.error(`Error during log rotation: ${err}`);
    }
  }

  // ...rest of the class remains the same
}
```

### Testing Configuration

The testing framework uses the Integrated Test Runner which manages both server and client processes automatically and handles all the communication efficiently.

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
