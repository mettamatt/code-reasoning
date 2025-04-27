# Prompt Effectiveness Evaluation System

This directory contains tools to evaluate the effectiveness of the CODE_REASONING_TOOL prompt using the Anthropic API. It allows you to measure how well Claude understands and follows the guidance in the prompt.

## Why Measure Prompt Effectiveness?

While the `code-reasoning.e2e.ts` tests verify that the code works correctly, they don't tell us whether the prompt itself is effective at guiding models to reason in the intended way. This system fills that gap by:

1. Providing specialized test scenarios that target specific aspects of the prompt
2. Automatically sending these scenarios to Claude using the Anthropic API
3. Extracting and evaluating the model's reasoning chain
4. Generating reports to analyze prompt effectiveness

## System Architecture

The evaluation system has been refactored for simplicity and clarity:

- **Core Module** (`/core`): Contains shared types, utilities, and evaluation functions
- **API Integration** (`anthropic-api.ts`): Handles communication with the Anthropic API
- **API Evaluator** (`api-evaluator.ts`): Main CLI for API-based evaluations
- **Simplified Evaluator** (`evaluator.ts`): Simplified tool for viewing scenarios and generating reports

## Test Scenarios

The scenarios are designed to test different aspects of the sequential thinking prompt:

- **Branching Understanding**: Tests whether models know when to use branching to explore multiple approaches
- **Revision Understanding**: Tests whether models correctly use revisions when discovering errors
- **Parameter Correctness**: Tests whether models use the tool's parameters correctly
- **Thought Depth**: Tests whether models provide sufficiently deep, detailed thoughts
- **Reasoning Completion**: Tests whether models correctly identify when reasoning is complete

## How to Use

### Setup

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Build the Project**:

   ```bash
   npm run build
   ```

3. **Set Up API Key**:
   - Create a `.env` file in the `test/prompt-evaluation` directory using `.env.example` as a template
   - Add your Anthropic API key to the file

### Running API-Based Evaluations

```bash
npm run eval:api
```

This will:

1. Load your Anthropic API key (or prompt you to enter one)
2. Let you choose a Claude model to use
3. Allow you to select test scenarios to evaluate
4. Automatically send the scenarios to Claude
5. Extract and analyze the responses
6. Guide you through evaluating Claude's performance
7. Save the results for later analysis

### Viewing Scenarios or Generating Reports

If you just want to view scenarios or generate reports from previous evaluations:

```bash
npm run eval:prompt
```

This simplified tool provides:

1. A way to browse and view test scenarios
2. The ability to generate reports from previous evaluations

## The Evaluation Process

When using the API evaluator, the workflow is:

1. **Select a Model**: Choose which Claude model to evaluate
2. **Choose Scenarios**: Select one or more test scenarios
3. **API Processing**: The system sends the scenarios to Claude via the Anthropic API
4. **Evaluation**: You score Claude's responses against the evaluation criteria
5. **Report Generation**: Optionally generate a report comparing different models or prompt variations

## Example Workflow

Here's a complete workflow example:

1. Run the evaluator: `npm run eval:api`
2. Enter your API key or have it loaded from `.env`
3. Select "claude-3-7-sonnet-20250219" as the model
4. Choose to run a specific scenario, such as "Algorithm Selection Problem"
5. Provide your name as the evaluator and a prompt variation name (e.g., "baseline")
6. Wait while the system sends the scenario to Claude and processes the response
7. Score Claude's performance on each evaluation criterion
8. Add overall comments about Claude's performance
9. The evaluation is saved automatically

## Improvement Process

This evaluation system enables an iterative improvement process:

1. Evaluate the current prompt's effectiveness with Claude
2. Identify weaknesses in specific areas (branching, revision, etc.)
3. Modify the prompt to address those weaknesses
4. Re-evaluate to measure improvement
5. Repeat until desired effectiveness is achieved
