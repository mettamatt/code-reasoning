# Code-Reasoning MCP Server Usage Examples

This document provides detailed usage examples for the Code-Reasoning MCP Server. These examples demonstrate how to use the sequential thinking capabilities for programming tasks and complex problem-solving.

## Table of Contents

- [Basic Usage Examples](#basic-usage-examples)
- [Advanced Examples](#advanced-examples)
  - [Thought Branching](#thought-branching)
  - [Thought Revision](#thought-revision)
- [Integration Examples](#integration-examples)
  - [Claude Desktop Integration](#claude-desktop-integration)
  - [VS Code Integration](#vs-code-integration)
- [Debugging Examples](#debugging-examples)
  - [Using Logging](#using-logging)
- [Example Config Files](#example-config-files)

## Basic Usage Examples

### Simple Sequential Thinking Flow

This example shows a basic sequential thinking process for solving a programming problem:

```json
// Thought 1
{
  "thought": "First, let's understand the problem: we need to implement a function that finds duplicate elements in an array.",
  "thought_number": 1,
  "total_thoughts": 4,
  "next_thought_needed": true
}

// Thought 2
{
  "thought": "There are multiple approaches we could take: using nested loops (O(n²)), using a hash table (O(n)), or sorting and then finding adjacent duplicates (O(n log n)).",
  "thought_number": 2,
  "total_thoughts": 4,
  "next_thought_needed": true
}

// Thought 3
{
  "thought": "Let's implement the hash table approach since it's efficient in terms of time complexity (O(n)). We'll use a Set or Map to track elements we've seen.",
  "thought_number": 3,
  "total_thoughts": 4,
  "next_thought_needed": true
}

// Thought 4
{
  "thought": "Here's the JavaScript implementation:\n\nfunction findDuplicates(arr) {\n  const seen = new Set();\n  const duplicates = new Set();\n  \n  for (const item of arr) {\n    if (seen.has(item)) {\n      duplicates.add(item);\n    } else {\n      seen.add(item);\n    }\n  }\n  \n  return Array.from(duplicates);\n}\n\nThis solution is O(n) in time complexity and handles edge cases properly.",
  "thought_number": 4,
  "total_thoughts": 4,
  "next_thought_needed": false
}
```

### Real-world Example: Debugging a Recursive Function

This example demonstrates how to use sequential thinking to debug a recursive function with a stack overflow issue:

```json
// Thought 1
{
  "thought": "The problem is a stack overflow error in a recursive function to calculate Fibonacci numbers. Let's first understand the current implementation.",
  "thought_number": 1,
  "total_thoughts": 5,
  "next_thought_needed": true
}

// Thought 2
{
  "thought": "Here's the problematic code:\n\nfunction fibonacci(n) {\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nThe issue is there's no base case, so it recurses infinitely. Also, this is extremely inefficient due to recalculating values repeatedly.",
  "thought_number": 2,
  "total_thoughts": 5,
  "next_thought_needed": true
}

// Thought 3
{
  "thought": "Let's fix the base case issue first:\n\nfunction fibonacci(n) {\n  if (n <= 0) return 0;\n  if (n === 1) return 1;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nThis prevents infinite recursion, but is still inefficient for large n values.",
  "thought_number": 3,
  "total_thoughts": 5,
  "next_thought_needed": true
}

// Thought 4
{
  "thought": "To improve efficiency, we should use memoization to store previously calculated values:\n\nfunction fibonacci(n, memo = {}) {\n  if (n <= 0) return 0;\n  if (n === 1) return 1;\n  if (memo[n]) return memo[n];\n  \n  memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);\n  return memo[n];\n}\n\nThis caches results to prevent redundant calculations.",
  "thought_number": 4,
  "total_thoughts": 5,
  "next_thought_needed": true
}

// Thought 5
{
  "thought": "For even better performance, we could use an iterative approach instead of recursion:\n\nfunction fibonacci(n) {\n  if (n <= 0) return 0;\n  if (n === 1) return 1;\n  \n  let a = 0, b = 1;\n  for (let i = 2; i <= n; i++) {\n    const temp = a + b;\n    a = b;\n    b = temp;\n  }\n  \n  return b;\n}\n\nThis iterative solution has O(n) time complexity and constant space complexity, avoiding both stack overflow and inefficiency issues.",
  "thought_number": 5,
  "total_thoughts": 5,
  "next_thought_needed": false
}
```

## Advanced Examples

### Thought Branching

This example demonstrates how to use thought branching to explore multiple approaches to solving a programming problem:

```json
// Thought 1 (Main path)
{
  "thought": "We need to design a system that can efficiently process large batches of data. Let's consider the main approaches.",
  "thought_number": 1,
  "total_thoughts": 6,
  "next_thought_needed": true
}

// Thought 2 (Main path)
{
  "thought": "Main Approach: We could use a streaming architecture with message queues for handling data in real-time batches.",
  "thought_number": 2,
  "total_thoughts": 6,
  "next_thought_needed": true
}

// Thought 3 (Branch from Thought 1)
{
  "thought": "Alternative Approach: We could also consider batch processing with scheduled ETL jobs instead of real-time processing.",
  "thought_number": 3,
  "total_thoughts": 6,
  "branch_from_thought": 1,
  "branch_id": "BatchETL",
  "next_thought_needed": true
}

// Thought 3 (Main path)
{
  "thought": "For the streaming approach, we'll need components like: data producers, message broker (Kafka/RabbitMQ), stream processors, and data storage.",
  "thought_number": 3,
  "total_thoughts": 6,
  "next_thought_needed": true
}

// Thought 4 (BatchETL branch)
{
  "thought": "For batch ETL, we'll need: data extraction jobs, transformation pipelines, data warehousing, and orchestration tools like Airflow.",
  "thought_number": 4,
  "total_thoughts": 6,
  "branch_from_thought": 3,
  "branch_id": "BatchETL",
  "next_thought_needed": true
}

// Thought 4 (Main path)
{
  "thought": "Main approach implementation: 1) Set up Kafka topics, 2) Implement data producers with retry logic, 3) Create stream processors with Kafka Streams, 4) Store in timeseries DB.",
  "thought_number": 4,
  "total_thoughts": 6,
  "next_thought_needed": true
}

// Thought 5 (BatchETL branch)
{
  "thought": "The batch approach is simpler and more cost-effective for this use case. Implementing with: 1) Daily data dumps, 2) Spark processing, 3) Data warehouse loading.",
  "thought_number": 5,
  "total_thoughts": 6,
  "branch_from_thought": 4,
  "branch_id": "BatchETL",
  "next_thought_needed": false
}

// Thought 5 (Main path)
{
  "thought": "After comparing both approaches, the streaming architecture is preferred due to real-time requirements, despite higher complexity and cost.",
  "thought_number": 5,
  "total_thoughts": 6,
  "next_thought_needed": false
}
```

### Thought Revision

This example demonstrates how to use thought revision to correct errors in reasoning:

```json
// Thought 1
{
  "thought": "I need to implement a sort algorithm. Based on requirements, quicksort seems appropriate due to average case O(n log n) performance.",
  "thought_number": 1,
  "total_thoughts": 4,
  "next_thought_needed": true
}

// Thought 2
{
  "thought": "Here's a basic quicksort implementation in Python:\n\ndef quicksort(arr):\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[0]\n    left = [x for x in arr[1:] if x < pivot]\n    right = [x for x in arr[1:] if x >= pivot]\n    return quicksort(left) + [pivot] + quicksort(right)",
  "thought_number": 2,
  "total_thoughts": 4,
  "next_thought_needed": true
}

// Thought 3 (Revision of Thought 1)
{
  "thought": "On second thought, I overlooked the fact that the data might be already partially sorted, which is quicksort's worst-case scenario (O(n²)). Also, stability is required. Mergesort would be a better choice since it guarantees O(n log n) regardless of input and is stable.",
  "thought_number": 3,
  "total_thoughts": 5,
  "is_revision": true,
  "revises_thought": 1,
  "next_thought_needed": true
}

// Thought 4 (Revision of Thought 2)
{
  "thought": "Let's implement mergesort instead:\n\ndef mergesort(arr):\n    if len(arr) <= 1:\n        return arr\n    \n    mid = len(arr) // 2\n    left = mergesort(arr[:mid])\n    right = mergesort(arr[mid:])\n    \n    return merge(left, right)\n\ndef merge(left, right):\n    result = []\n    i = j = 0\n    \n    while i < len(left) and j < len(right):\n        if left[i] <= right[j]:  # Note: <= preserves stability\n            result.append(left[i])\n            i += 1\n        else:\n            result.append(right[j])\n            j += 1\n    \n    result.extend(left[i:])\n    result.extend(right[j:])\n    return result",
  "thought_number": 4,
  "total_thoughts": 5,
  "is_revision": true,
  "revises_thought": 2,
  "next_thought_needed": true
}

// Thought 5
{
  "thought": "The mergesort implementation meets all requirements: O(n log n) worst-case time complexity, stability, and works well with the expected data patterns. The trade-off is O(n) extra space, but this is acceptable given the reliability benefits.",
  "thought_number": 5,
  "total_thoughts": 5,
  "next_thought_needed": false
}
```

## Integration Examples

### Claude Desktop Integration

To use the code-reasoning server with Claude Desktop, you'll need to configure Claude Desktop to use the server.

#### Example Configuration (Basic)

```json
// claude_desktop_config.json
{
  "mcpServers": {
    "code-reasoning": {
      "command": "code-reasoning",
      "args": []
    }
  }
}
```

#### Example Configuration (With Debugging)

```json
// claude_desktop_config.json
{
  "mcpServers": {
    "code-reasoning": {
      "command": "code-reasoning",
      "args": ["--debug"]
    }
  }
}
```

#### Example Prompt for Claude

When using Claude Desktop with the code-reasoning server, you can use the sequential thinking capability by asking Claude to reason step by step. The current tool description is:

```
🧠 A reflective problem-solving tool with sequential thinking.

• Break down tasks into numbered thoughts that can BRANCH (🌿) or REVISE (🔄) until a conclusion is reached.
• Always set 'next_thought_needed' = false when no further reasoning is needed.

✅ Recommended checklist every 3 thoughts:
1. Need to BRANCH?   → set 'branch_from_thought' + 'branch_id'.
2. Need to REVISE?   → set 'is_revision' + 'revises_thought'.
3. Scope changed? → bump 'total_thoughts'.

✍️ End each thought with: "What am I missing?"
```

Example prompts to use with Claude:

```
Please help me design a simple REST API for a todo application. Use code-reasoning to break down the design process into steps.
```

Or more specifically for code-related tasks:

```
Please analyze this algorithm implementation and identify any bugs or inefficiencies. Use code-reasoning to break down your analysis step by step.
```

### VS Code Integration

For VS Code integration, you can configure the MCP server in your VS Code settings.

#### Example VS Code Configuration

```json
// settings.json or .vscode/mcp.json
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

## Debugging Examples

### Using Logging

To enable detailed logging, use the `--debug` flag:

```bash
code-reasoning --debug
```

#### Example Log Output

```
Starting Code-Reasoning MCP Server (streamlined v0.5.0)... {
  "logLevel": "INFO",
  "debug": true,
  "pid": 12345
}
Code Reasoning Server logic handler initialized {
  "config": {
    "maxThoughtLength": 20000,
    "timeoutMs": 30000,
    "maxThoughts": 20,
    "logLevel": "INFO",
    "debug": true
  }
}
Received ListTools request
💭 Thought 1/5
---
  First, let's understand the problem: we need to design a simple calculator function.
---
Thought processed successfully {
  "thought_number": 1,
  "is_revision": false,
  "branch_id": null,
  "next_thought_needed": true,
  "processingTimeMs": 5
}
```

## Example Config Files

### Example claude_desktop_config.json

```json
{
  "mcpServers": {
    "code-reasoning": {
      "command": "code-reasoning",
      "args": ["--debug"]
    },
    "another-server": {
      "command": "another-command",
      "args": []
    }
  },
  "defaultModel": "claude-3-7-sonnet",
  "sessionDefaults": {
    "enableMultiModal": true
  }
}
```

### Example VS Code Settings

```json
{
  "editor.fontFamily": "Fira Code, monospace",
  "editor.fontSize": 14,
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

### Example Workspace .vscode/mcp.json

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
