# Code Reasoning MCP Server Prompts

This document provides detailed information about the prompt system in the Code Reasoning MCP server, including available prompts, how to use them, and how the prompt value persistence works.

## Table of Contents

- [Overview](#overview)
- [Available Prompts](#available-prompts)
- [Using Prompts with Claude Desktop](#using-prompts-with-claude-desktop)
- [Working Directory Integration](#working-directory-integration)
- [Prompt Value Persistence](#prompt-value-persistence)
- [Filesystem Integration](#filesystem-integration)
- [Customizing Prompts](#customizing-prompts)

## Overview

The Code Reasoning MCP server includes a set of predefined prompts designed for various software development tasks. These prompts utilize the structured, step-by-step reasoning approach to help solve complex programming problems.

Key features of the prompt system:

- **Predefined Templates**: Ready-to-use prompts for common development tasks
- **Persistent Values**: Argument values are saved between sessions to reduce repetitive entry
- **Working Directory Support**: Automatic handling of your current project directory
- **Filesystem Integration**: Easy access to files through filesystem MCP tools

## Available Prompts

The Code Reasoning MCP server includes the following predefined prompts:

| Prompt Name             | Description                                                 | Key Arguments                                                                    |
| ----------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `architecture-decision` | Framework for making and documenting architecture decisions | `decision_context`, `constraints`, `options`                                     |
| `bug-analysis`          | Systematic approach to analyzing and fixing bugs            | `bug_behavior`, `expected_behavior`, `affected_components`, `reproduction_steps` |
| `code-review`           | Comprehensive template for code review                      | `code`, `requirements`, `language`                                               |
| `feature-planning`      | Structured approach to planning new feature implementation  | `problem_statement`, `target_users`, `success_criteria`, `affected_components`   |
| `refactoring-plan`      | Structured approach to code refactoring                     | `current_issues`, `goals`                                                        |

All prompts also support a `working_directory` parameter that specifies the path to your current project directory.

## Using Prompts with Claude Desktop

To use Code Reasoning prompts with Claude Desktop:

1. **Access the Prompts Menu**:

   - Click the "+" icon in the Claude Desktop chat window
   - Select "Code Reasoning Tool" from the available tools

2. **Select a Prompt**:

   - Choose one of the available prompts from the list
   - A dialog window will appear with fields for the prompt arguments

3. **Fill in the Arguments**:

   - Enter the required information in each field
   - Include your working directory if needed (e.g., `~/projects/my-app`)

4. **Submit the Prompt**:

   - Click the submit button in the dialog
   - The prompt with your variables will be attached to the chat message as a pasted file

5. **Send the Message**:
   - Click the send button to submit the prompt to Claude
   - Claude will use the Code Reasoning tool to provide a structured analysis

## Working Directory Integration

All prompts support a `working_directory` parameter that allows you to specify your current project directory. This enables:

- Clear context for Claude about your project location
- Easy reference to project files and directories
- Simplified file access through filesystem tools

Example working directory values:

- macOS/Linux: `~/projects/my-app` or `/Users/username/projects/my-app`
- Windows: `C:\Users\username\projects\my-app`

## Prompt Value Persistence

The Code Reasoning MCP server now includes a feature to persist prompt argument values between sessions. This significantly reduces repetitive data entry.

### How It Works

1. **Value Storage**:

   - When you use a prompt, the argument values are saved to a JSON file
   - The file is stored in the `~/.code-reasoning/` directory
   - Values are organized by prompt name for easy retrieval

2. **Global Values**:

   - Some values like `working_directory` are stored globally
   - These global values are shared across all prompts
   - This means you only need to set your working directory once

3. **Automatic Retrieval**:
   - When you use a prompt again, saved values are automatically retrieved
   - The fields in the prompt dialog will be pre-filled with the saved values
   - You can always override saved values by entering new ones

### Storage Location

Prompt values are stored in:

```
~/.code-reasoning/prompt_values.json
```

If you want to reset stored values, you can simply delete this file or modify it directly.

## Filesystem Integration

All prompts include guidance for accessing and modifying files using filesystem tools. This allows Claude to:

- Read files from your project
- List directory contents
- Search for specific files or code patterns
- Make changes to files when needed

To take advantage of this feature:

1. Make sure your working directory is correctly set
2. Use absolute paths when referencing files
3. Ensure you have filesystem MCP tools available in your Claude Desktop configuration

Typical filesystem operations Claude can perform:

- `read_file("/path/to/file")`
- `list_directory("/path/to/directory")`
- `search_code("/path/to/directory", "search pattern")`
- `edit_block("/path/to/file", "old_text", "new_text")`

## Customizing Prompts

You can customize the built-in prompts or create your own by adding JSON files to a custom prompts directory.

### Custom Prompts Directory

Custom prompts are automatically loaded from the `~/.code-reasoning/prompts` directory. To use custom prompts:

1. Create the prompts directory if it doesn't exist:

   ```bash
   mkdir -p ~/.code-reasoning/prompts
   ```

2. Create JSON files in the specified directory with the following format:

   ```json
   {
     "name": "custom-prompt-name",
     "description": "Description of your custom prompt",
     "arguments": [
       {
         "name": "arg_name",
         "description": "Description of this argument",
         "required": true
       }
       // Other arguments...
     ],
     "template": "# Custom Prompt Template\n\nWorking Directory: {working_directory}\n\nYour template text with {arg_name} placeholders..."
   }
   ```

3. Restart the server to load your custom prompts

Custom prompts will appear alongside the built-in ones in the Claude Desktop interface.
