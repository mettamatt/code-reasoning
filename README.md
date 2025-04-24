# Code Reasoning MCP Server

An enhanced fork of the Sequential Thinking MCP server, optimized for programming tasks and complex problem-solving through a structured thinking process. Now with improved debugging capabilities!

## Quick Start

```bash
# Install globally
npm install -g code-reasoning

# Configure Claude Desktop
# Edit ~/Library/Application Support/Claude/claude_desktop_config.json:
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "code-reasoning",
      "args": []
    }
  }
}

# For debug mode with detailed logging:
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "code-reasoning",
      "args": ["--debug"]
    }
  }
}

# For visualization dashboard:
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "code-reasoning",
      "args": ["--visualize"]
    }
  }
}

# Start Claude Desktop and enjoy enhanced sequential thinking!
```

## Why This Fork?

This fork was created to enhance the original Sequential Thinking server with several key improvements:

1. **Programming Focus**: Optimized for coding tasks and programming problem-solving
2. **Improved Parameter Naming**: Consistent snake_case naming convention (e.g., `thought_number` instead of `thoughtNumber`)
3. **Enhanced Prompting**: Clearer, more structured guidance in the tool description
4. **Enforcement of Best Practices**: Automatically aborts chains after 20 steps to prevent excessive recursion
5. **Local Development**: Designed to work seamlessly with Claude Desktop for programming tasks
6. **Advanced Debugging**: Comprehensive logging system for troubleshooting and analysis
7. **Thought Visualization**: Interactive dashboard for monitoring thought processes in real-time

## Key Differences from Original

| Feature          | Original                | Code Reasoning                  |
| ---------------- | ----------------------- | ------------------------------- |
| Parameter Style  | camelCase               | snake_case                      |
| Max Steps        | Not enforced            | Enforced (max 20)               |
| Tool Description | Basic                   | Enhanced markdown with examples |
| Primary Focus    | General problem-solving | Programming/code tasks          |
| Error Handling   | Basic                   | Improved with status codes      |
| Debugging        | None                    | Advanced logging system         |
| Visualization    | None                    | Interactive dashboard           |
| Testing          | None                    | Comprehensive test framework    |

## Enhanced Debugging Features

Version 0.2.0 introduces an advanced logging system that provides detailed insights into the server's operation:

- **Comprehensive Logging**: All communications between Claude Desktop and the server are logged
- **Log Levels**: Support for ERROR, INFO, and DEBUG log levels for granular control
- **Log Rotation**: Automatic log rotation to prevent excessive disk usage
- **Log Directory**: Logs are stored in `~/.code-reasoning/logs/` for easy access
- **Latest Log Symlink**: A `latest.log` symlink is created for quick access to the current log
- **Colorized Console Output**: Log messages are color-coded in the console for better readability
- **Protocol Event Logging**: All protocol events (initialization, errors, closing) are tracked
- **Request Handler Instrumentation**: Detailed logging of request handling and thought processing

### Accessing Logs

Logs are stored in your home directory:

```
~/.code-reasoning/logs/
```

The latest log file is always available as:

```
~/.code-reasoning/logs/latest.log
```

## Thought Process Visualization

Version 0.2.0 also introduces a powerful visualization dashboard for monitoring thought processes in real-time:

- **Interactive Dashboard**: Web-based UI to visualize thought chains and branches
- **Real-time Updates**: Live updates via WebSocket as thoughts are processed
- **Thought History**: Complete history of all thoughts with their content
- **Branch Visualization**: Visual representation of thought branches and revisions
- **Graph Display**: Interactive graph showing thought sequences and relationships
- **Detailed View**: Comprehensive view of each individual thought
- **Statistics**: Real-time metrics on thought patterns and chains

### Using the Visualization Dashboard

To start the server with the visualization dashboard:

```bash
code-reasoning --visualize
```

Or using npm scripts:

```bash
npm run visualize
```

This will start the server with debugging enabled and the visualization dashboard running on the default port (3000). You can access the dashboard at:

```
http://localhost:3000
```

### Customizing the Dashboard Port

You can specify a custom port for the dashboard:

```bash
code-reasoning --visualize --port=8080
```

Or using npm scripts:

```bash
npm run visualize:port 8080
```

### Dashboard Features

The visualization dashboard provides:

1. **Thought List**: A chronological list of all thoughts with their numbers and content previews
2. **Thought Graph**: A visual representation of thoughts and their relationships
3. **Thought Details**: Detailed view of the selected thought with its full content
4. **Statistics**: Real-time statistics on total thoughts, branches, revisions, and completed chains
5. **WebSocket Status**: Indicator showing the connection status to the server

### Command Line Options

The server now supports the following command-line options:

```
--debug           Enable debug logging (more verbose output)
--visualize       Start the visualization dashboard
--port=PORT       Set the port for the visualization dashboard (default: 3000)
--help, -h        Show help information
```

For example:

```bash
code-reasoning --debug --visualize --port=8080
```

## Enhanced Prompt

This fork features a significantly improved prompt that provides clearer guidance and examples:

````
🧠 **Sequential Thinking Tool**

Purpose → break complex problems into **self-auditing, exploratory** thought steps that can *branch*, *revise*, or *back-track* until a **single, well-supported answer** emerges.

---

## WHEN TO CALL
• Multi-step planning, design, debugging, or open-ended analysis
• Whenever *further private reasoning* or *hypothesis testing* is required **before** replying to the user

---

## ENCOURAGED PRACTICES
🔍 **Question aggressively** – ask "What am I missing?" after each step
🔄 **Revise freely** – mark `is_revision=true` even late in the chain
🌿 **Branch often** – explore plausible alternatives in parallel; you can merge or discard branches later
↩️ **Back-track** – if a path looks wrong, start a new branch from an earlier thought
❓ **Admit uncertainty** – explicitly note unknowns and schedule extra thoughts to resolve them

---

## MUST DO
✅ Put **every** private reasoning step in `thought`
✅ Keep `thought_number` correct; update `total_thoughts` when scope changes
✅ Use `is_revision` & `branch_from_thought`/`branch_id` precisely
✅ Set `next_thought_needed=false` *only* when **all** open questions are resolved
✅ Abort and summarise if `thought_number > 20`

---

## DO NOT
⛔️ Reveal the content of `thought` to the end-user
⛔️ Continue thinking once `next_thought_needed=false`
⛔️ Assume thoughts must proceed strictly linearly – *branching is first-class*

---

### PARAMETER CHEAT-SHEET
• `thought` (string) – current reasoning step
• `next_thought_needed` (boolean) – request further thinking?
• `thought_number` (int ≥ 1) – 1-based counter
• `total_thoughts` (int ≥ 1) – mutable estimate
• `is_revision`, `revises_thought` (int) – mark corrections
• `branch_from_thought`, `branch_id` – manage alternative paths
• `needs_more_thoughts` (boolean) – optional hint that more thoughts may follow

_All JSON keys **must** use `lower_snake_case`._

---

### EXAMPLE ✔️
```json
{
  "thought": "List solution candidates and pick the most promising",
  "thought_number": 1,
  "total_thoughts": 4,
  "next_thought_needed": true
}
````

### EXAMPLE ✔️ (branching late)

```json
{
  "thought": "Alternative approach: treat it as a graph-search problem",
  "thought_number": 6,
  "total_thoughts": 8,
  "branch_from_thought": 3,
  "branch_id": "B1",
  "next_thought_needed": true
}
```

## Features

- Break down complex programming problems into manageable steps
- Revise and refine thoughts as understanding deepens
- Branch into alternative paths of reasoning
- Adjust the total number of thoughts dynamically
- Generate and verify solution hypotheses
- Enforce a maximum of 20 thought steps to prevent excessive reasoning
- Comprehensive logging for debugging and analysis
- Interactive visualization dashboard for thought monitoring

## Tool

### sequentialthinking

Facilitates a detailed, step-by-step thinking process for programming and technical problem-solving.

**Inputs:**

- `thought` (string): The current thinking step
- `next_thought_needed` (boolean): Whether another thought step is needed
- `thought_number` (integer): Current thought number
- `total_thoughts` (integer): Estimated total thoughts needed
- `is_revision` (boolean, optional): Whether this revises previous thinking
- `revises_thought` (integer, optional): Which thought is being reconsidered
- `branch_from_thought` (integer, optional): Branching point thought number
- `branch_id` (string, optional): Branch identifier
- `needs_more_thoughts` (boolean, optional): If more thoughts are needed

> **Important**: All parameters must use snake_case format (e.g., `thought_number`, not `thoughtNumber`). The server will reject requests using camelCase parameters.

## Usage

The Code Reasoning tool is designed for:

- Breaking down complex programming problems into steps
- Algorithm design and optimization
- Debugging and error analysis
- Code architecture planning
- Technical decision-making when multiple approaches exist
- Understanding complex codebases

## Configuration

### Usage with Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "code-reasoning",
      "args": []
    }
  }
}
```

For debug mode:

```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "code-reasoning",
      "args": ["--debug"]
    }
  }
}
```

For visualization dashboard:

```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "code-reasoning",
      "args": ["--visualize"]
    }
  }
}
```

For both debug mode and visualization with custom port:

```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "code-reasoning",
      "args": ["--debug", "--visualize", "--port=8080"]
    }
  }
}
```

Location of Claude Desktop config file on macOS:

```
~/Library/Application Support/Claude/claude_desktop_config.json
```

### Usage with VS Code

For manual installation, add the following JSON block to your User Settings (JSON) file in VS Code. You can do this by pressing `Ctrl + Shift + P` and typing `Preferences: Open Settings (JSON)`.

Optionally, you can add it to a file called `.vscode/mcp.json` in your workspace. This will allow you to share the configuration with others.

```json
{
  "mcp": {
    "servers": {
      "sequential-thinking": {
        "command": "code-reasoning",
        "args": []
      }
    }
  }
}
```

For visualization dashboard:

```json
{
  "mcp": {
    "servers": {
      "sequential-thinking": {
        "command": "code-reasoning",
        "args": ["--visualize"]
      }
    }
  }
}
```

## Installation

```bash
# Create the directory
mkdir -p ~/Sites/code-reasoning

# Copy files from original repository (if you have it)
cp -r /path/to/mcp-servers/src/sequentialthinking/* ~/Sites/code-reasoning/

# Navigate to the directory
cd ~/Sites/code-reasoning

# Update package.json and index.ts with the custom changes

# Install dependencies
npm install

# Build the package
npm run build

# Install globally
npm link
```

## Development

The project now uses a src/ directory structure:

```
src/
├── index.ts              # Main server implementation
├── logger.ts             # Logger implementation
├── logging-transport.ts  # Logging transport implementation
└── visualizer.ts         # Thought visualizer implementation
```

Public directory for the visualization dashboard:

```
public/
├── dashboard.html        # Main dashboard HTML
├── styles.css            # Dashboard CSS
└── script.js             # Dashboard JavaScript
```

Build the project with:

```bash
npm run build
```

Start the server with debug logging:

```bash
npm run debug
```

Start the server with visualization:

```bash
npm run visualize
```

## Testing Framework

Version 0.2.0 introduces a comprehensive testing framework to verify the functionality, reliability, and performance of the sequential thinking capabilities:

- **Test Client**: Simulates Claude Desktop with various thought scenarios
- **Test Scenarios**: Pre-defined scenarios to test different aspects of the server
- **Error Handling**: Tests to verify proper error responses
- **Performance Benchmarking**: Measures response times and throughput
- **Result Reporting**: Comprehensive test results with success/failure metrics
- **Result Storage**: Option to save test results for later analysis

### Running Tests

To run all test scenarios:

```bash
npm run test
```

To run specific test scenarios:

```bash
npm run test:basic      # Run only basic thought flow tests
npm run test:branch     # Run only thought branching tests
npm run test:revision   # Run only thought revision tests
npm run test:error      # Run only error handling tests
npm run test:perf       # Run only performance tests
```

To run tests with additional options:

```bash
# Run with verbose output
npm run test -- --verbose

# Run with visualization dashboard
npm run test -- --visualize

# Save test results to file
npm run test -- --save-results

# Set custom timeout (in milliseconds)
npm run test -- --timeout=60000
```

For detailed information about the testing framework, see [TEST.md](./TEST.md).

## Troubleshooting

### Visualization Issues

If you have trouble accessing the visualization dashboard:

1. Ensure the server is running with the `--visualize` flag
2. Check that the specified port (default: 3000) is not in use by another application
3. Access the dashboard at `http://localhost:3000` (or your custom port)
4. Check the console for any WebSocket connection errors

If you see a "WebSocket disconnected" message, the server might not be running or might be inaccessible. Refresh the page after ensuring the server is running.

### Debugging Server Issues

If you encounter issues with the server, enable debug mode to get more detailed logging:

```bash
code-reasoning --debug
```

Then check the logs at:

```
~/.code-reasoning/logs/latest.log
```

### TypeScript Configuration Error

If you encounter an error like:

```
error TS5083: Cannot read file '/tsconfig.json'.
```

This is because the original tsconfig.json extends a parent configuration. Update your tsconfig.json to be self-contained:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": ".",
    "declaration": true
  },
  "include": ["./**/*.ts"]
}
```

### Parameter Naming Errors

If Claude receives errors from the server, ensure all parameters use snake_case:

- Use `thought_number` instead of `thoughtNumber`
- Use `next_thought_needed` instead of `nextThoughtNeeded`
- Use `total_thoughts` instead of `totalThoughts`

## Keeping Up-to-Date with Upstream

This is a fork of the original Sequential Thinking server. To incorporate updates from the original while maintaining our customizations:

1. Check for updates to the original repository:

   ```bash
   cd /path/to/original/mcp-servers
   git pull
   ```

2. Compare the changes to our fork:

   ```bash
   diff -r /path/to/original/mcp-servers/src/sequentialthinking/ ~/Sites/code-reasoning/
   ```

3. Selectively incorporate updates:

   - Update dependencies to match the original (especially important for SDK updates)
   - Add new features or bug fixes while maintaining our snake_case naming conventions
   - Update the tool description if improvements are made to the original

4. Rebuild and reinstall after updating:
   ```bash
   npm install
   npm run build
   npm link
   ```

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
