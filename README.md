# Code Reasoning MCP Server

An enhanced fork of the Sequential Thinking MCP server, optimized for programming tasks and complex problem-solving through a structured thinking process. Now with improved debugging capabilities!

## Overview

Code Reasoning MCP Server enhances Claude's sequential thinking capabilities with a focus on programming and complex problem-solving. It enables Claude to break down complex tasks into manageable steps, explore alternative approaches through branching, and revise earlier reasoning when necessary.

## Quick Start

```bash
# Configure Claude Desktop
# Edit ~/Library/Application Support/Claude/claude_desktop_config.json:
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "npx",
      "args": [
        "-y",
        "@mettamatt/code-reasoning"
      ]
    }
  }
}

# Start Claude Desktop and use with "sequential-thinking" in your prompts
```

### Alternative: Global Installation

If you prefer to install globally instead of using npx:

```bash
# Install globally (after publishing with scope)
npm install -g @mettamatt/code-reasoning
```

## Key Features

- **Programming Focus**: Optimized for coding tasks and programming problem-solving
- **Structured Thinking**: Break down complex problems into manageable steps
- **Thought Branching**: Explore multiple solution paths in parallel
- **Thought Revision**: Refine earlier reasoning as understanding improves
- **Parameter Validation**: Enforces snake_case parameter naming convention
- **Safety Limits**: Automatically aborts after 20 thought steps to prevent recursion loops
- **Advanced Debugging**: Comprehensive logging system with rotation and log levels
- **Visualization Dashboard**: Interactive UI for monitoring thought processes in real-time
- **Testing Framework**: Comprehensive test suite for validating functionality

## Installation

### Installation Options

```bash
# Install globally (after publishing)
npm install -g @mettamatt/code-reasoning

# Or install from source
git clone https://github.com/mettamatt/code-reasoning.git
cd code-reasoning
npm install
npm run build
npm link
```

## Basic Usage

### Command Line Options

```
--debug           Enable debug logging
--visualize       Start the visualization dashboard
--port=PORT       Set visualization dashboard port (default: 3000)
--help, -h        Show help information
```

### Example with Debug and Visualization

```bash
code-reasoning --debug --visualize --port=8080
```

### In Claude Prompts

To use sequential thinking in your interactions with Claude:

```
Please analyze this algorithm using sequential-thinking to break down the solution step by step.
```

## Documentation

Full documentation is available in the docs directory:

- [Usage Examples](./docs/examples.md): Detailed examples of using sequential thinking
- [Configuration Guide](./docs/configuration.md): Complete configuration options
- [Publishing Guide](./docs/publishing.md): Version management and npm publishing
- [Testing Framework](./docs/testing.md): Information about the testing system
- [Development History](./docs/development-history.md): Background on the debugging implementation

## Project Structure

```
├── index.ts                  # Entry point 
├── src/                      # Implementation source files
│   ├── server.ts             # Main server implementation
│   ├── logger.ts             # Logging functionality
│   ├── logging-transport.ts  # Transport layer
│   └── visualizer.ts         # Dashboard visualization
├── public/                   # Visualization dashboard files
└── test/                     # Testing framework
```

## Integration

### Claude Desktop

Configure in `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "npx",
      "args": [
        "-y",
        "@mettamatt/code-reasoning",
        "--debug",
        "--visualize"
      ]
    }
  }
}
```

### VS Code

Configure in your VS Code settings:

```json
{
  "mcp": {
    "servers": {
      "sequential-thinking": {
        "command": "npx",
        "args": [
          "-y",
          "@mettamatt/code-reasoning",
          "--visualize"
        ]
      }
    }
  }
}
```

## Troubleshooting

- For visualization issues, ensure the correct port is available
- For debugging, use the `--debug` flag and check logs at `~/.code-reasoning/logs/latest.log`
- For parameter errors, ensure snake_case format (e.g., `thought_number`, not `thoughtNumber`)

## License

This project is licensed under the MIT License. See the LICENSE file for details.
