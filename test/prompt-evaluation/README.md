# Automated Prompt Effectiveness Evaluation System

This directory contains tools to automatically evaluate the effectiveness of the CODE_REASONING_TOOL prompt using the Anthropic API. It measures how well Claude understands and follows the guidance in the prompt without requiring human evaluation.

## Why Measure Prompt Effectiveness?

While the `code-reasoning.e2e.ts` tests verify that the code works correctly, they don't tell us whether the prompt itself is effective at guiding models to reason in the intended way. This system fills that gap by:

1. Providing specialized test scenarios that target specific aspects of the prompt
2. Automatically sending these scenarios to Claude using the Anthropic API
3. Extracting the model's reasoning chain
4. Using Claude to evaluate the quality of the reasoning
5. Calculating objective metrics on parameter usage and structure
6. Generating comprehensive reports to analyze prompt effectiveness

## System Architecture

The automated evaluation system has a clean, modular architecture:

- **Core Module** (`/core`):
  - **Types** (`types.ts`): Shared interfaces and types
  - **Automated Metrics** (`automated-metrics.ts`): Objective analysis of thought chains
  - **Evaluation** (`evaluation.ts`): Automated evaluation functions
  - **Utils** (`utils.ts`): Utility functions and file management
- **API Integration** (`anthropic-api.ts`):
  - Handles communication with the Anthropic API
  - Manages both generation and evaluation API calls
- **API Evaluator** (`api-evaluator.ts`):
  - Main CLI for running evaluations
  - Supports batch processing and parallel evaluation
- **Evaluator** (`evaluator.ts`):
  - Simplified tool for viewing scenarios and generating reports

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

### Running Automated Evaluations

```bash
npm run eval:api
```

This will:

1. Load your Anthropic API key (or prompt you to enter one)
2. Let you choose a Claude model to use
3. Allow you to select test scenarios to evaluate
4. Configure batch processing options (if running multiple scenarios)
5. Automatically send the scenarios to Claude for generation
6. Extract the thought chains from Claude's responses
7. Calculate objective metrics on the thought chains
8. Send the thought chains to Claude for evaluation
9. Combine the results and save for analysis

### Viewing Scenarios or Generating Reports

If you just want to view scenarios or generate reports from previous evaluations:

```bash
npm run eval:prompt
```

This simplified tool provides:

1. A way to browse and view test scenarios
2. The ability to generate reports from previous evaluations

## The Automated Evaluation Process

The automated evaluation process follows this workflow:

1. **Select a Model**: Choose which Claude model to evaluate
2. **Choose Scenarios**: Select one or more test scenarios
3. **Configure Processing**: Set batch processing and retry options
4. **Scenario Generation**: The system sends scenarios to Claude for thought chain generation
5. **Objective Analysis**: Calculate metrics on parameter usage and structure
6. **Subjective Evaluation**: Send thought chains to Claude for quality assessment
7. **Results Storage**: Save combined evaluations for later analysis
8. **Report Generation**: Optionally generate a report comparing different models or prompt variations

## Example Workflow

Here's a complete workflow example:

1. Run the evaluator: `npm run eval:api`
2. Enter your API key or have it loaded from `.env`
3. Select "claude-3-7-sonnet-20250219" as the model
4. Choose to run multiple scenarios or a specific scenario
5. Configure batch processing settings if running multiple scenarios
6. Set retry attempts and specify a prompt variation name (e.g., "baseline")
7. The system automatically:
   - Sends scenarios to Claude for thought chain generation
   - Calculates objective metrics on the thought chains
   - Sends thought chains to Claude for evaluation
   - Combines results and saves them
8. When complete, you can generate a comparison report across models or variations

## Improvement Process

This automated evaluation system enables a more efficient iterative improvement process:

1. Run comprehensive evaluations across all test scenarios
2. Analyze the generated reports to identify weaknesses
3. Modify the prompt to address specific weaknesses
4. Re-run evaluations to measure improvements
5. Compare reports to quantify effectiveness gains
6. Repeat until desired effectiveness is achieved

The automated nature of the system allows for much faster iteration cycles and more consistent evaluation metrics, leading to more reliable prompt improvements.
