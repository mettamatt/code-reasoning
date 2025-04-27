# Anthropic API Integration Guide

This guide explains how to use the Anthropic API integration for prompt evaluation.

## API Setup

### 1. Get an API Key

You'll need an Anthropic API key to use this tool. If you don't already have one:

1. Create an account at [Anthropic Console](https://console.anthropic.com/)
2. Navigate to the API Keys section
3. Create a new API key

### 2. Configure the API Key

There are two ways to set up your API key:

**Option 1: Using a .env file (recommended)**
```
# Create a .env file in the test/prompt-evaluation directory
ANTHROPIC_API_KEY=your_api_key_here
CLAUDE_MODEL=claude-3-7-sonnet-20250219
MAX_TOKENS=8000
TEMPERATURE=0.7
```

**Option 2: Enter manually**
The tool will prompt you for your API key if it's not found in the environment variables. You'll have the option to save it to a .env file for future use.

## Usage

### Running the API Evaluator

```bash
npm run evaluate-api
```

### API Evaluation Process

1. **Model Selection**: You'll be prompted to select a Claude model:
   - claude-3-7-sonnet-20250219 (most advanced)
   - claude-3-5-sonnet-20241022 (powerful and balanced)
   - claude-3-5-haiku-20241022 (fast and efficient)
   - claude-3-opus-20240229 (powerful, slower)
   - claude-3-haiku-20240307 (fastest)

2. **Scenario Selection**: Choose to run all scenarios or select a specific one

3. **Evaluation Information**: Enter your name as evaluator and a prompt variation label (e.g., "baseline")

4. **API Processing**: The system will:
   - Send the scenario to the Anthropic API
   - Parse Claude's response to extract the thought chain
   - Save the raw response for reference

5. **Manual Evaluation**: You'll be guided through evaluating Claude's performance:
   - Score each criterion based on the thought chain
   - Add notes explaining your scores
   - Provide overall comments on the evaluation

6. **Results**: The evaluation will be saved automatically in the prompt-evaluations directory

### API Configuration Options

You can customize the API behavior in the .env file:

- `CLAUDE_MODEL`: Which Claude model to use (defaults to claude-3-7-sonnet-20250219)
- `MAX_TOKENS`: Maximum output tokens for Claude's response (defaults to 8000)
- `TEMPERATURE`: Temperature setting for Claude's response (defaults to 0.7)

## How It Works

The API integration:

1. Gets the sequential thinking tool description from the server.ts file
2. Creates a prompt that includes this description and the test scenario
3. Sends the prompt to Claude via the Anthropic API
4. Extracts JSON thought records from Claude's response using regex
5. Parses and validates these records to create a thought chain
6. Returns this thought chain for evaluation

## Troubleshooting

**API Key Issues**
- Check that your API key is correct and has not expired
- Make sure you have sufficient credits in your Anthropic account

**No Thoughts Extracted**
- This can happen if Claude doesn't follow the format correctly
- Try using a different Claude model
- Check the raw response saved in the prompt-evaluations/responses directory

**Error Response from API**
- The specific error will be displayed in the console
- Common issues include rate limiting or invalid API keys
