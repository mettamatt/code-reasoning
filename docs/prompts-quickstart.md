# Using Prompts with Code-Reasoning in Claude Desktop

## Introduction

Welcome to the guide for using prompts with code-reasoning in Claude Desktop! This powerful combination helps you tackle complex problems through structured thinking and specialized templates.

### What is the Prompt System?

The prompt system provides ready-made templates for common reasoning tasks. Instead of starting from scratch, you can use prompts to:

- Begin your thinking process with useful structure
- Ensure consistent approaches to recurring problems
- Access specialized formats for specific tasks like bug analysis or feature planning

### Why Combine Prompts with Code-Reasoning?

Code-reasoning helps you break down complex problems into step-by-step thoughts. When combined with prompts, you get:

- **Guided Start**: Begin reasoning with purpose-built templates
- **Structured Thinking**: Follow proven patterns for different types of problems
- **Flexible Exploration**: Branch into alternative approaches or revise earlier thoughts
- **Consistency**: Maintain a standard approach across multiple sessions

## Getting Started

### Prerequisites

Before using prompts with code-reasoning in Claude Desktop, you need:

1. Claude Desktop application installed
2. The code-reasoning server running on your machine

### Connecting to the Code-Reasoning Server

1. Open Claude Desktop
2. Go to Settings (gear icon) > Tools
3. Ensure the "code-reasoning" tool is enabled
4. Verify that the server address points to your local code-reasoning server (typically `localhost:3000` or similar)
5. Save the settings

### Verifying the Connection

To verify that everything is set up correctly:

1. In a new conversation with Claude, type: "Can you help me solve a problem using code-reasoning with prompts?"
2. Claude should respond that it can help and explain how to use the feature
3. If Claude indicates any issues, check your server status and connection settings

## Basic Usage

### Starting a Reasoning Session with a Prompt

To begin a reasoning session using a prompt:

1. Describe your problem to Claude and ask to use a specific prompt

   ```
   I need to analyze a bug in our checkout system. Can you help me using the bug-analysis prompt with code-reasoning?
   ```

2. Claude will ask for the required information for that prompt

   ```
   I'd be happy to help you analyze this bug using structured reasoning. For the bug-analysis prompt, I'll need:

   - Bug behavior: What's happening that shouldn't be?
   - Expected behavior: What should happen instead?
   - Affected components: Which parts of the system are involved?
   - Reproduction steps (optional): How can the bug be triggered?

   Could you provide these details?
   ```

3. Provide the requested information

   ```
   Bug behavior: The checkout page freezes after clicking "Place Order" for orders over $1000.
   Expected behavior: All orders should process normally regardless of amount.
   Affected components: Checkout page, payment processing module, order validation service.
   Reproduction steps: Add items totaling over $1000 to cart, proceed to checkout, enter valid payment details, click "Place Order".
   ```

4. Claude will use code-reasoning to begin analyzing the problem based on your input

   ```
   I'll analyze this bug using sequential thinking through code-reasoning.

   💭 Thought 1/6
   ---
     Let me understand the reported behavior. The checkout page freezes after clicking "Place Order" for orders over $1000. This suggests a potential issue with order validation or payment processing for larger amounts. The freezing behavior rather than an error message points to either an infinite loop, deadlock, or unhandled exception.
   ---
   ```

### Continuing with Sequential Thoughts

After the initial thought, Claude will typically ask if you want to continue with the next thought. Simply confirm to proceed:

```
Yes, please continue with the analysis.
```

Claude will then provide the next thought in the sequence:

```
💭 Thought 2/6
---
  Looking at the affected components, I should focus on potential interactions between the payment processing module and order validation service. Given that the issue only occurs with orders over $1000, this suggests a conditional validation or processing step that's triggered at that threshold. This could be a special fraud check, a different payment processor, or additional validation rules.
---

Would you like me to continue exploring this reasoning path?
```

### Finishing a Reasoning Session

The reasoning session will continue until Claude reaches the final thought or you decide to conclude early. When you reach the final thought, Claude will provide a summary or conclusion:

```
💭 Thought 6/6
---
  Based on my analysis, the most likely cause is an infinite loop in the fraud detection module that's triggered for orders over $1000. I recommend:

  1. Check the fraud detection code for proper exit conditions
  2. Add timeout handling to prevent freezing
  3. Implement better error handling to provide meaningful messages instead of freezing
  4. Add logging to track the execution flow for orders over $1000

  This approach targets the most probable cause while adding safeguards to prevent poor user experience regardless of the specific issue.
---
```

## Advanced Features

### Branching to Explore Alternatives

If you want to explore an alternative approach without abandoning your current line of thinking:

1. Ask Claude to branch from a specific thought

   ```
   I'd like to explore an alternative hypothesis. Can you branch from thought #2 to consider a database timeout issue instead?
   ```

2. Claude will create a new branch and continue reasoning from there

   ```
   🌿 Branch 1/3 (from 2, id:alternative-timeout)
   ---
     Looking at this from a different angle, the freeze could be caused by a database timeout for large orders. If the system is attempting to process the entire order as a single database transaction, orders over $1000 might contain more items or require more complex inventory checks, leading to longer processing times that eventually time out.
   ---
   ```

3. Continue exploring this branch as needed
   ```
   Please continue with this database timeout hypothesis.
   ```

### Revising Earlier Thoughts

If you discover new information or realize an earlier thought was incorrect:

1. Ask Claude to revise a specific thought

   ```
   I have new information - the issue also happens with orders exactly at $1000, not just over that amount. Can you revise thought #3 with this information?
   ```

2. Claude will create a revision of the specified thought

   ```
   🔄 Revision 3/6 (of 3)
   ---
     With the new information that the issue occurs at exactly $1000 as well, we need to revise our understanding. This strongly suggests a specific threshold check in the code, likely an inclusive comparison (≥ $1000) rather than just a conditional triggered for higher amounts. This makes it more likely that there's an explicit business rule or validation step that activates at this specific threshold.
   ---
   ```

3. Continue reasoning from this revised understanding

### Using Specialized Prompts for Different Tasks

Different prompts are designed for specific tasks. Here are some examples of how to request them:

For code reviews:

```
Can you review this authentication function using the code-review prompt with code-reasoning?
```

For feature planning:

```
I need to plan a new notification system feature. Can you use the feature-planning prompt with code-reasoning to help me?
```

For architecture decisions:

```
We're deciding between microservices and a monolith for our new application. Can you help with the architecture-decision prompt using code-reasoning?
```

## Available Prompts and Tools

### Built-in Reasoning Prompts

| Prompt Name                | Description                             | Required Information                         |
| -------------------------- | --------------------------------------- | -------------------------------------------- |
| `reasoning-initialization` | Start a general reasoning session       | Problem statement                            |
| `reasoning-branch`         | Create a branch to explore alternatives | Thought to branch from, alternative approach |

### Specialized Task Prompts

| Prompt Name             | Description                     | Key Information Needed                               |
| ----------------------- | ------------------------------- | ---------------------------------------------------- |
| `bug-analysis`          | Analyze and fix software bugs   | Bug behavior, expected behavior, affected components |
| `feature-planning`      | Plan new feature implementation | Problem statement, target users, success criteria    |
| `code-review`           | Comprehensive code review       | Code to review, requirements, programming language   |
| `refactoring-plan`      | Plan code refactoring           | Current issues, refactoring goals                    |
| `architecture-decision` | Evaluate architectural options  | Decision context, constraints, options               |

### Understanding Code-Reasoning Parameters

When working with code-reasoning, these key parameters control the thinking process:

| Parameter             | Description                                                        |
| --------------------- | ------------------------------------------------------------------ |
| `thought`             | The current reasoning step content                                 |
| `thought_number`      | Position in the sequence (1, 2, 3, etc.)                           |
| `total_thoughts`      | Estimated total number of thoughts needed                          |
| `next_thought_needed` | Whether more thoughts are needed (only set to false when complete) |
| `branch_from_thought` | When exploring alternatives, the thought number to branch from     |
| `branch_id`           | Unique identifier for a branch (automatically generated)           |
| `is_revision`         | Whether this thought revises an earlier one                        |
| `revises_thought`     | The thought number being revised                                   |

## Best Practices

### Tips for Effective Reasoning

1. **Start with the right prompt**: Choose the prompt that best matches your task type
2. **Be specific**: Provide detailed information when initializing a prompt
3. **Adjust the scope**: If the estimated number of thoughts seems too few or too many, you can ask Claude to adjust
4. **One issue at a time**: Focus each reasoning session on a single well-defined problem
5. **Ask questions**: If you need clarification on any thought, ask before proceeding
6. **Mix guidance and freedom**: Direct Claude when needed, but also allow exploration of unexpected insights

### When to Use Branching

Use branching when:

- You want to explore multiple possible causes of a problem
- You're considering alternative solutions
- You want to compare different approaches without losing your primary line of thinking
- A new idea emerges that's worth exploring without disrupting progress

Example:

```
That's an interesting thought. Could you branch from thought #3 to explore how this would work with a microservices architecture instead?
```

### When to Use Revision

Use revision when:

- You discover new information that changes an earlier assumption
- You identify a flaw in previous reasoning
- You need to correct a factual error
- The scope of the problem has changed

Example:

```
I just learned that we'll need to support mobile devices too. Could you revise thought #2 to account for mobile UI considerations?
```

## Troubleshooting

### Common Issues

| Issue                                 | Possible Solutions                                                       |
| ------------------------------------- | ------------------------------------------------------------------------ |
| Claude doesn't recognize prompt names | Check spelling, or ask for a list of available prompts                   |
| Reasoning seems to go off track       | Ask Claude to revise the most recent thought with more specific guidance |
| Too few/many thoughts                 | Ask Claude to adjust the total number of thoughts                        |
| Claude doesn't offer to continue      | Explicitly ask Claude to continue with the next thought                  |
| Complex code not displaying correctly | Ask Claude to format the code in a specific language                     |

### Getting Help

If you encounter persistent issues:

1. Verify your server is running with `npm run status`
2. Check server logs with `npm run logs`
3. Restart the server with `npm run restart`
4. If problems persist, check the GitHub repository for known issues

## Examples

### Example 1: Bug Analysis Session

**You**: I'm seeing a memory leak in our Node.js application. Can you help me analyze it using the bug-analysis prompt with code-reasoning?

**Claude**: I'd be happy to help you analyze the memory leak using structured reasoning. For the bug-analysis prompt, I'll need:

- Bug behavior: What symptoms are you seeing?
- Expected behavior: How should memory usage behave?
- Affected components: Which parts of your Node.js application might be involved?
- Reproduction steps (optional): How can you trigger or observe the leak?

**You**: Bug behavior: The application's memory usage steadily increases over time, even during idle periods, eventually causing crashes.
Expected behavior: Memory usage should remain stable with occasional garbage collection drops.
Affected components: Express.js server, database connection manager, image processing module.
Reproduction steps: Start server, let it run for 8+ hours with normal usage patterns, observe memory using Node's --inspect flag.

**Claude**: I'll analyze this memory leak using sequential thinking through code-reasoning.

## 💭 Thought 1/6

## Let me understand the reported behavior. The application's memory usage steadily increases over time, even during idle periods, eventually leading to crashes. This is a classic symptom of a memory leak where objects are created but not properly garbage collected. Since it happens even during idle periods, it suggests the issue might be in background processes, timers, or connection management rather than request handling.

Would you like me to continue this analysis?

**You**: Yes, please continue.

**Claude**:
💭 Thought 2/6

---

Looking at the affected components, let me consider each one as a potential source of the leak:

1. Express.js server: Could have event listeners that aren't properly removed, middleware that maintains state, or route handlers that capture variables in closures.

2. Database connection manager: Might be creating new connections without closing old ones, or keeping references to query results that should be released.

3. Image processing module: Could be loading images into memory without releasing them, especially if using streams incorrectly or maintaining an unbounded cache.

## The fact that the leak occurs during idle periods points more toward the database connection manager or background tasks.

Should I continue with the next thought?

**You**: Yes, and I just remembered we're using a Redis cache too, which might be relevant.

**Claude**:
🔄 Revision 2/6 (of 2)

---

With the new information about Redis cache usage, I need to revise my analysis of potential leak sources:

1. Express.js server: Could have event listeners that aren't properly removed, middleware that maintains state, or route handlers that capture variables in closures.

2. Database connection manager: Might be creating new connections without closing old ones, or keeping references to query results that should be released.

3. Image processing module: Could be loading images into memory without releasing them, especially if using streams incorrectly or maintaining an unbounded cache.

4. Redis cache: Might have a growing cache without proper expiration policies, memory limits, or cleanup mechanisms. Could also have connection leaks if not properly managed.

## The idle period leak could be from database connections, Redis connections, or background tasks related to cache management.

Let me continue analyzing with this updated information.

## 💭 Thought 3/6

Let me form hypotheses about the most likely causes:

Hypothesis 1: Database connection pool is not releasing connections properly, especially after errors or timeouts.

Hypothesis 2: Redis connections are not properly managed, possibly creating new connections without closing existing ones.

Hypothesis 3: The image processing module has an unbounded cache that grows over time without cleanup.

Hypothesis 4: Event listeners are being repeatedly attached without detachment, particularly on global objects.

Hypothesis 5: There might be interval timers (setInterval) that capture references to objects in their closures, preventing garbage collection.

## Based on the idle-time growth, I think the most likely causes are Hypothesis 2 (Redis connections) or Hypothesis 5 (timer references).

Would you like me to explore one of these hypotheses in more detail or continue with testing approaches?

[Example continues with additional thoughts...]

### Example 2: Feature Planning Session

**You**: We need to develop a new collaboration feature for our document editing application. Can you help plan this using the feature-planning prompt?

**Claude**: I'd be happy to help you plan the new collaboration feature using structured reasoning. For the feature-planning prompt, I'll need:

- Problem statement: What issue or need does this feature address?
- Target users: Who will primarily use this feature?
- Success criteria (optional): How will you know if the feature is successful?
- Affected components (optional): Which parts of your system will need to be modified?

**You**: Problem statement: Users need to edit documents simultaneously with colleagues and see changes in real-time.
Target users: Teams in marketing, product, and design departments who frequently collaborate on shared documents.
Success criteria: Users report fewer version control issues, reduced time spent merging changes, and increased collaboration satisfaction.
Affected components: Document editor, backend storage, user permissions system, notification service.

**Claude**: I'll plan this collaboration feature using sequential thinking through code-reasoning.

## 💭 Thought 1/7

## Let me start by analyzing the problem statement and requirements. Users need real-time collaborative editing where they can see each other's changes as they happen. This is a significant enhancement to the current document editing system, requiring both frontend updates for real-time display and backend changes to handle concurrent edits. The target users are primarily marketing, product, and design teams who work together on documents frequently.

Would you like me to continue with this feature planning?

[Example continues with additional thoughts...]

## Glossary

| Term                | Definition                                             |
| ------------------- | ------------------------------------------------------ |
| Prompt              | A template for structured reasoning on specific tasks  |
| Sequential thinking | Breaking down problems into ordered steps              |
| Thought             | A single step in the reasoning process                 |
| Branch              | An alternative path of reasoning from a specific point |
| Revision            | A correction or update to a previous thought           |
| Reasoning session   | A complete sequence of thoughts addressing a problem   |

## Quick Reference

Starting a session:

```
Can you help me [describe task] using the [prompt-name] prompt with code-reasoning?
```

Continuing:

```
Please continue with the next thought.
```

Branching:

```
Can you branch from thought #[number] to explore [alternative approach]?
```

Revising:

```
Please revise thought #[number] based on [new information].
```

Adjusting scope:

```
I think this might need more/fewer steps. Can you adjust to [number] total thoughts?
```

Finishing:

```
That completes my reasoning. The solution is...
```
