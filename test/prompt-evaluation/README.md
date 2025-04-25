# Prompt Effectiveness Evaluation System

This directory contains tools to evaluate the effectiveness of the SEQUENTIAL_THINKING_TOOL prompt. It allows you to measure how well different models understand and follow the guidance in the prompt.

## Why Measure Prompt Effectiveness?

While the `code-reasoning.e2e.ts` tests verify that the code works correctly, they don't tell us whether the prompt itself is effective at guiding models to reason in the intended way. This system fills that gap by:

1. Providing specialized test scenarios that target specific aspects of the prompt
2. Offering a structured evaluation methodology to measure prompt effectiveness
3. Enabling comparisons between different models or prompt variations

## How It Works

The evaluation process involves:

1. Selecting a test scenario designed to test a specific aspect of the prompt
2. Presenting the problem to a model and having it use sequential thinking
3. Capturing the model's reasoning chain
4. Evaluating how well the model followed the prompt guidance
5. Generating reports to analyze prompt effectiveness

## Test Scenarios

The scenarios are designed to test different aspects of the sequential thinking prompt:

- **Branching Understanding**: Tests whether models know when to use branching to explore multiple approaches
- **Revision Understanding**: Tests whether models correctly use revisions when discovering errors
- **Parameter Correctness**: Tests whether models use the tool's parameters correctly
- **Thought Depth**: Tests whether models provide sufficiently deep, detailed thoughts
- **Reasoning Completion**: Tests whether models correctly identify when reasoning is complete

Each scenario has a clear problem statement and evaluation criteria specifically designed to test understanding of the target skill.

## How to Use

### Setup
Compile the TypeScript files:

```bash
cd ~/Sites/code-reasoning
npm run build
```

### Running the Evaluator

```bash
cd ~/Sites/code-reasoning
node dist/test/prompt-evaluation/evaluator.js
```

### Step-by-Step Usage Guide

1. **Display a Test Scenario**
   - Select a scenario based on what aspect of the prompt you want to evaluate
   - Use the displayed problem statement to task your model

2. **Collect the Model's Response**
   - Have the model use sequential thinking to solve the problem
   - Either:
     - Save the thought chain to a JSON file (preferred)
     - Enter the thought chain manually via the evaluator

3. **Evaluate the Response**
   - Score the thought chain against the evaluation criteria
   - Add notes explaining your scoring decisions
   - Save the evaluation results

4. **Generate Reports**
   - After conducting multiple evaluations, generate a report
   - Compare effectiveness across different models or prompt variations

## Example Workflow

1. Choose the "Algorithm Selection Problem" scenario
2. Present it to Claude 3 using the baseline prompt
3. Save Claude's thoughts to a JSON file
4. Import and evaluate the thoughts against the scenario's criteria
5. Repeat with a different model (e.g., GPT-4)
6. Generate a comparison report

## Example Thought Chain JSON Format

```json
[
  {
    "thought": "First, let me understand the problem requirements...",
    "thought_number": 1,
    "total_thoughts": 8,
    "next_thought_needed": true
  },
  {
    "thought": "Let's consider approach A: using a hashmap...",
    "thought_number": 2,
    "total_thoughts": 8,
    "next_thought_needed": true
  },
  {
    "thought": "Alternative approach B: using a heap structure...",
    "thought_number": 3,
    "total_thoughts": 8,
    "branch_from_thought": 1,
    "branch_id": "B1",
    "next_thought_needed": true
  },
  // Additional thoughts...
]
```

## Improvement Process

This evaluation system enables an iterative improvement process:

1. Evaluate the current prompt's effectiveness
2. Identify weaknesses in specific areas (branching, revision, etc.)
3. Modify the prompt to address those weaknesses
4. Re-evaluate to measure improvement
5. Repeat until desired effectiveness is achieved

## Privacy-Friendly Approach

This evaluation approach respects privacy considerations:

- No automatic tracking or analytics
- All evaluations are manual and explicit
- Data is stored locally on your machine
- You control what gets recorded and evaluated

## Future Enhancements

Some potential enhancements to consider:

- Adding more specialized test scenarios
- Creating benchmark scores for different model types
- Developing more detailed evaluation rubrics
- Supporting comparison of different prompt versions
