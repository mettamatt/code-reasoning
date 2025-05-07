# Code Reasoning MCP Server

A Model Context Protocol (MCP) server that enhances Claude's ability to solve complex programming tasks through structured, step-by-step thinking.

<a href="https://glama.ai/mcp/servers/@mettamatt/code-reasoning">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@mettamatt/code-reasoning/badge" alt="Code Reasoning Server MCP server" />
</a>

[![npm version](https://img.shields.io/npm/v/@mettamatt/code-reasoning.svg)](https://www.npmjs.com/package/@mettamatt/code-reasoning)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/mettamatt/code-reasoning/actions/workflows/ci.yml/badge.svg)](https://github.com/mettamatt/code-reasoning/actions/workflows/ci.yml)

## What Is This?

Code Reasoning is a tool that helps Claude break down complex programming problems into manageable steps using sequential thinking methodology. It enables:

- **Step-by-step reasoning** about code problems with numbered thoughts
- **Branch exploration** of alternative approaches (🌿)
- **Thought revision** to correct earlier reasoning (🔄)
- **Detailed thinking logs** for transparency and debugging

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

   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

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

1. Ask Claude to use sequential thinking in your prompts:

   ```
   Please analyze this code using sequential thinking to break down the solution step by step.
   ```

1. Access ready-to-use prompts:

   - Click the "+" icon in the Claude Desktop chat window
   - Select "Code Reasoning Tool" from the available tools
   - Choose a prompt template and fill in the required information
   - Submit the form to add the prompt to your chat message
   - Send the message to Claude

See the [Prompts Guide](./docs/prompts.md) for details on using the prompt templates.

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
- **Ready-to-Use Prompts**: Pre-defined templates for common development tasks
- **Value Persistence**: Remembers argument values between prompt uses
- **Filesystem Integration**: Easy access to project files

## Documentation

Detailed documentation available in the docs directory:

- [Usage Examples](./docs/examples.md): Examples of sequential thinking with the MCP server
- [Configuration Guide](./docs/configuration.md): All configuration options for the MCP server
- [Prompts Guide](./docs/prompts.md): Using and customizing prompts with the MCP server
- [Testing Framework](./docs/testing.md): Testing information

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
- Evaluate prompt effectiveness:
  ```bash
  npm run eval            # Run prompt evaluation system
  ```

## Prompt Evaluation

The Code Reasoning MCP Server includes a prompt evaluation system that assesses Claude's ability to follow the code reasoning prompts. This system allows:

- Testing different prompt variations against scenario problems
- Verifying parameter format adherence
- Scoring solution quality
- Generating comprehensive reports

To use the prompt evaluation system, run:

```bash
npm run eval
```

### Prompt Comparison and Development

Significant effort went into developing the optimal prompt for the Code Reasoning server. The current implementation uses the HYBRID_DESIGN prompt, which emerged as the winner from our evaluation process.

We compared four different prompt designs:

| Prompt Design       | Description                                                          |
| ------------------- | -------------------------------------------------------------------- |
| SEQUENTIAL          | The original sequential thinking prompt design                       |
| DEFAULT             | The baseline prompt previously used in the server                    |
| CODE_REASONING_0_30 | An experimental variant focusing on code-specific reasoning          |
| HYBRID_DESIGN       | A refined design incorporating the best elements of other approaches |

Our evaluation across seven diverse programming scenarios showed that HYBRID_DESIGN outperformed other prompts:

| Scenario                   | HYBRID_DESIGN | CODE_REASONING_0_30 | DEFAULT | SEQUENTIAL |
| -------------------------- | ------------- | ------------------- | ------- | ---------- |
| Algorithm Selection        | 87%           | 82%                 | 88%     | 82%        |
| Bug Identification         | 87%           | 91%                 | 88%     | 92%        |
| Multi-Stage Implementation | 83%           | 67%                 | 79%     | 82%        |
| System Design Analysis     | 82%           | 87%                 | 78%     | 82%        |
| Code Debugging Task        | 92%           | 87%                 | 92%     | 92%        |
| Compiler Optimization      | 83%           | 78%                 | 67%     | 73%        |
| Cache Strategy             | 86%           | 88%                 | 82%     | 87%        |
| **Average**                | **86%**       | **83%**             | **82%** | **84%**    |

The HYBRID_DESIGN prompt marginally demonstrated both the highest average solution quality (86%) and the most consistent performance across all scenarios, with no scores below 80%. It also prodouced the most thoughts. The `src/server.ts` file has been updated to use this optimal prompt design.

Personally, I think the biggest improvement was adding this to the end of the prompt: "✍️ End each thought by asking: "What am I missing or need to reconsider?"

See [Testing Framework](./docs/testing.md) for more details on the prompt evaluation system.

## Contributing

Contributions to the Code Reasoning MCP Server are welcome! Here's how to contribute:

1. **Fork the repository**
2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
4. **Run tests locally**:
   ```bash
   npm run test:validate
   ```
5. **Commit your changes**:
   ```bash
   git commit -m "Add your meaningful commit message"
   ```
6. **Push to your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Create a Pull Request**

When you create a pull request, the CI workflow will automatically run to verify your changes. This includes linting, format checking, building, and testing. Your PR will show the status of these checks.

### Continuous Integration

This project uses GitHub Actions for CI/CD:

- **CI Workflow**: Runs automatically on pull requests and pushes to `main`
- **Release Workflow**: Runs when a new release is created or a version tag is pushed
- **Dependabot**: Automatically opens PRs for dependency updates

## License

This project is licensed under the MIT License. See the LICENSE file for details.
