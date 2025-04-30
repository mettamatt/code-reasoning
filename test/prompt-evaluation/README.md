# Prompt Evaluation System

A streamlined, standalone system for evaluating Claude's ability to follow the code reasoning prompts. This system tests parameter adherence and solution quality for different prompts and scenarios.

## Purpose

This tool allows you to:

- Test different prompt variations against scenario problems
- Verify Claude's adherence to parameter format requirements
- Score solution quality for different scenarios
- Generate comprehensive reports of evaluation results

## System Architecture

The system consists of these key files:

- **evaluator.ts** - Main evaluation logic and CLI interface
- **api.ts** - API integration with Anthropic's Claude
- **types.ts** - TypeScript types for the evaluation system
- **utils.ts** - Utility functions for file I/O, CLI interaction
- **core-prompts.ts** - Storage and management of different prompt variations
- **scenarios.ts** - Test scenarios with problems to evaluate

## Setup

1. Ensure you have Node.js installed
2. Make sure you have an Anthropic API key
3. Create a `.env` file in this directory with your API key:
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   CLAUDE_MODEL=claude-3-7-sonnet-20250219
   MAX_TOKENS=4000
   TEMPERATURE=0.2
   ```

## Usage

Run the evaluator from the project root:

```bash
node dist/test/prompt-evaluation/evaluator.js
```

The interactive CLI will guide you through:

- Selecting different core prompts
- Running evaluations on specific scenarios or all scenarios
- Viewing available scenarios
- Generating reports

## Core Features

### Parameter Adherence Testing

Verifies that the model correctly follows the parameter format specified in the code reasoning tool, including:

- Required parameters (thought, thought_number, total_thoughts, next_thought_needed)
- Sequential thought numbering
- Proper termination
- Valid branching parameters
- Valid revision parameters

### Solution Quality Scoring

Evaluates and scores the quality of solutions for each scenario based on:

- Correctness
- Efficiency
- Approach
- Implementation details

### Standalone Reports

Generates comprehensive reports that include:

- Parameter adherence results
- Quality scores
- Complete thought chains
- All prompts used in the evaluation

Reports are saved in the `./reports` directory with filenames that include the prompt name and timestamp.

### Multiple Core Prompt Testing

Allows testing different variations of the core prompt:

- DEFAULT - The standard code reasoning prompt
- SEQUENTIAL - The original sequential thinking prompt.
- CODE_REASONING_0_30 - The prompt used for the 0.30 version of Code Reasoning
- CUSTOM - Create your own custom prompt

## Examples

### Testing a Specific Scenario

1. Select "Run evaluation on specific scenario"
2. Choose a scenario from the list
3. Wait for the evaluation to complete
4. Review the results and check the generated report

### Testing with a Custom Prompt

1. Select "Select core prompt"
2. Choose "CUSTOM" from the list
3. Enter your custom prompt (type .done on a new line when finished)
4. Run an evaluation using your custom prompt
5. Compare results with other prompts

## Extending the System

### Adding New Scenarios

To add new test scenarios, edit the `scenarios.ts` file and add a new entry to the `PROMPT_TEST_SCENARIOS` array:

```typescript
{
  id: 'unique-scenario-id',
  name: 'Human-Readable Scenario Name',
  description: 'What this scenario is designed to test',
  problem: 'The actual prompt text that will be sent to Claude',
  targetSkill: 'branching', // One of: 'branching', 'revision', 'parameters', 'depth', 'completion', 'multiple'
  difficulty: 'medium', // One of: 'easy', 'medium', 'hard'
  expectedThoughtsMin: 5,
  expectedThoughtsMax: 10,
}
```

### Adding New Core Prompts

To add new core prompts, edit the `core-prompts.ts` file and add a new entry to the `ALL_PROMPTS` object.

## Troubleshooting

- **API Key Issues**: Ensure your ANTHROPIC_API_KEY is correctly set in the .env file
- **Missing Reports**: Verify the reports directory exists and has write permissions
- **Parsing Errors**: If thought chains aren't being extracted properly, check the prompt formatting
