# Code-Reasoning MCP Server Configuration

This document provides detailed information about all configuration options available for the Code-Reasoning MCP Server. It covers command-line options, configuration file formats, and customization options for various components.

## Table of Contents

- [Command-Line Options](#command-line-options)
- [Configuration Files](#configuration-files)
  - [Claude Desktop Integration](#claude-desktop-integration)
  - [VS Code Integration](#vs-code-integration)
- [Component Configuration](#component-configuration)
  - [Logging Configuration](#logging-configuration)
  - [Prompt Configuration](#prompt-configuration)
  - [Testing Configuration](#testing-configuration)

## Command-Line Options

The Code-Reasoning MCP Server supports the following command-line options:

| Option         | Description                                   | Default  | Example                                       |
| -------------- | --------------------------------------------- | -------- | --------------------------------------------- |
| `--debug`      | Enable debug logging with more verbose output | `false`  | `code-reasoning --debug`                      |
| `--help`, `-h` | Show help information                         | -        | `code-reasoning --help`                       |
| `--config-dir` | Specify the configuration directory           | `config` | `code-reasoning --config-dir=/path/to/config` |

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

#### Configuration Defaults

Configuration is defined in `src/utils/config.ts` using the `buildConfig` helper:

```typescript
import { buildConfig } from './utils/config.js';

const config = buildConfig(debugFlag ? { debug: true } : undefined);
```

Key characteristics:

- **Stateless**: `buildConfig` returns a plain object; no runtime persistence or async initialization
- **Type Safe**: The `CodeReasoningConfig` interface documents every option
- **Override Friendly**: Pass a partial object to override defaults (e.g., enable debug mode)

### Prompt Configuration

The Code-Reasoning MCP Server includes a prompt system with the following configuration options:

#### Enabling Prompts

Prompt functionality is controlled through the config object returned by `buildConfig`:

```typescript
// Check if prompts are enabled
if (config.promptsEnabled) {
  promptManager = new PromptManager(CONFIG_DIR);
  console.error('Prompts capability enabled');

  // Load custom prompts from the standard location
  console.error(`Loading custom prompts from ${CUSTOM_PROMPTS_DIR}`);
  await promptManager.loadCustomPrompts(CUSTOM_PROMPTS_DIR);
}
```

Default configuration values:

```typescript
{
  promptsEnabled: true,  // Enables prompt functionality
  // Other configuration values...
}
```

#### Prompt Value Persistence

The server automatically stores prompt argument values in a JSON file to reduce repetitive data entry:

- **Storage Location**: Values are stored in `[config_dir]/prompt_values.json`
- **Global Values**: Some values like `working_directory` are shared across all prompts
- **Prompt-Specific Values**: Other values are stored for each specific prompt

The structure of the stored values file:

```json
{
  "global": {
    "working_directory": "/path/to/project"
  },
  "prompts": {
    "architecture-decision": {
      "decision_context": "Previous value",
      "constraints": "Previous constraints",
      "options": "Previous options"
    }
    // Other prompts...
  }
}
```

This system automatically:

1. Stores values when prompts are used
2. Retrieves values when prompts are applied
3. Merges stored values with user-provided values (user input takes precedence)

See the [Prompts Guide](./prompts.md) for more details on using the prompt templates.

### Testing Configuration

The Code-Reasoning MCP Server includes testing functionality for developers who are extending or modifying the server. Most users do not need to be concerned with these testing capabilities.

#### Basic Testing Commands

To run the default quality checks:

```bash
npm test
```

This command currently runs ESLint. For a broader pass that also formats and rebuilds the project, use `npm run validate`.

For more detailed information about testing, refer to the [Testing Guide](./testing.md).
