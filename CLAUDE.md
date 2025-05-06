# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Naming Convention Note

This project was originally forked from the Sequential Thinking MCP Server but has been renamed to Code Reasoning MCP Server to better reflect its specialized focus on programming tasks. The tool has been renamed from "sequentialthinking" to "code-reasoning" for consistency. All configuration must use "code-reasoning" as the key - the "sequential-thinking" configuration key is not supported. The class previously named "SequentialThinkingServer" has been renamed to "CodeReasoningServer" for consistency.

## Build/Test/Lint Commands

- Build: `npm run build`
- Start: `npm run start`, `npm run debug`
- Test:
  - All tests: `npm run test` or `npm run test:all`
  - Single Test: `npm run test:basic`, `npm run test:branch`, `npm run test:revision`, `npm run test:error`, `npm run test:perf`
  - Verbose output: `npm run test:verbose`
  - Prompt evaluation: `npm run eval` or `npm run eval:view`
- Lint: `npm run lint`, `npm run lint:fix`
- Format: `npm run format`, `npm run format:check`
- Validation: `npm run validate` (runs format, lint:fix, and build)

## Code Style Guidelines

- **Parameters**: snake_case (e.g., `thought_number`, not `thoughtNumber`)
- **Imports**: ES Modules with .js extension
- **Types**: Strict TypeScript with explicit types; avoid `any` where possible
- **Error Handling**: Use structured logging with Logger class
- **Logging**: Use logger.error/info/debug instead of console.log
- **Formatting**: Prettier with singleQuotes, tabWidth: 2, printWidth: 100
- **Variables**: Use descriptive names, camelCase for variables/functions

Always run `npm run lint` and `npm run format` before committing changes.

## Documentation Locations

- Main documentation: [README.md](./README.md)
- Detailed examples: [docs/examples.md](./docs/examples.md)
- Configuration options: [docs/configuration.md](./docs/configuration.md)
- Prompt system: [docs/prompts.md](./docs/prompts.md)
- Testing framework: [docs/testing.md](./docs/testing.md)
