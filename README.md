# Code Reasoning MCP Server

An enhanced fork of the Sequential Thinking MCP server, optimized for programming tasks and complex problem-solving through a structured thinking process.

## Quick Start

```bash
# Install globally
npm install -g code-reasoning

# Configure Claude Desktop
# Edit ~/Library/Application Support/Claude-Desktop/claude_desktop_config.json:
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "code-reasoning",
      "args": []
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

## Key Differences from Original

| Feature | Original | Code Reasoning |
|---------|----------|----------------|
| Parameter Style | camelCase | snake_case |
| Max Steps | Not enforced | Enforced (max 20) |
| Tool Description | Basic | Enhanced markdown with examples |
| Primary Focus | General problem-solving | Programming/code tasks |
| Error Handling | Basic | Improved with status codes |

## Enhanced Prompt

This fork features a significantly improved prompt that provides clearer guidance and examples:

```
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
```

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

Location of Claude Desktop config file on macOS:
```
~/Library/Application Support/Claude-Desktop/claude_desktop_config.json
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

## Troubleshooting

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