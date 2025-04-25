# Code Reasoning MCP Server

A Model Context Protocol (MCP) server that enhances Claude's ability to solve complex programming tasks through structured, step-by-step thinking.

## What Is This?

Code Reasoning is a tool that helps Claude break down complex programming problems into manageable steps using sequential thinking methodology. It enables:

- Step-by-step reasoning about code problems
- Exploring alternative approaches through branching
- Revising earlier reasoning when needed
- Detailed logging of the thinking process

While based on the sequential thinking approach, this server is specifically optimized for programming tasks and code analysis, hence the name "Code Reasoning".

## Quick Installation

```bash
# Option 1: Use with npx (recommended for most users)
npx @mettamatt/code-reasoning

# Option 2: Install globally
npm install -g @mettamatt/code-reasoning
```

## Using with Claude

1. Configure Claude Desktop by editing:
   `~/Library/Application Support/Claude/claude_desktop_config.json`

   ```json
   {
     "mcpServers": {
       "code-reasoning": {
         "command": "npx",
         "args": ["-y", "@mettamatt/code-reasoning"]
       }
     }
   }
   ```

2. Ask Claude to use sequential thinking in your prompts:

   ```
   Please analyze this code using sequential-thinking to break down the solution step by step.
   ```

## Command Line Options

- `--debug`: Enable detailed logging
- `--help` or `-h`: Show help information

## Key Features

- **Programming Focus**: Optimized for coding tasks and problem-solving
- **Structured Thinking**: Break down complex problems into manageable steps
- **Thought Branching**: Explore multiple solution paths in parallel
- **Thought Revision**: Refine earlier reasoning as understanding improves
- **Safety Limits**: Automatically stops after 20 thought steps to prevent loops
- **Advanced Debugging**: Comprehensive logging system

## Documentation

Detailed documentation available in the docs directory:

- [Usage Examples](./docs/examples.md): Examples of sequential thinking
- [Configuration Guide](./docs/configuration.md): All configuration options
- [Publishing Guide](./docs/publishing.md): Version management and publishing
- [Testing Framework](./docs/testing.md): Testing information

## Advanced Installation

To install from source:

```bash
git clone https://github.com/mettamatt/code-reasoning.git
cd code-reasoning
npm install
npm run build
npm link
```

## Project Structure

```
├── index.ts                  # Entry point 
├── src/                      # Implementation source files
└── test/                     # Testing framework
```

## VS Code Integration

Configure in your VS Code settings:

```json
{
  "mcp": {
    "servers": {
      "code-reasoning": {
        "command": "npx",
        "args": ["-y", "@mettamatt/code-reasoning"]
      }
    }
  }
}
```

## Troubleshooting

- For debugging issues, use the `--debug` flag and check logs at `~/.code-reasoning/logs/latest.log`
- For parameter errors, ensure snake_case format (e.g., `thought_number`, not `thoughtNumber`)
- Run tests using:
  ```bash
  npm test                # Run basic tests
  npm run test:verbose    # Run with verbose output
  npm run test:basic      # Run basic test scenarios
  npm run test:branch     # Run branching test scenarios
  npm run test:revision   # Run revision test scenarios
  ```

## License

This project is licensed under the MIT License. See the LICENSE file for details.