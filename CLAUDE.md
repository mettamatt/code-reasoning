# CLAUDE.md

This file provides guidance to Claude when working with code in this repository.

## Naming Convention Note

This project was originally forked from the Sequential Thinking MCP Server but has been renamed to Code Reasoning MCP Server to better reflect its specialized focus on programming tasks. The tool has been renamed from "sequentialthinking" to "code-reasoning" for consistency. All configuration must use "code-reasoning" as the key - the "sequential-thinking" configuration key is not supported. The class previously named "SequentialThinkingServer" has been renamed to "CodeReasoningServer" for consistency.

## Build/Test/Lint Commands

- Build: `npm run build`
- Start: `npm run start`, `npm run debug`
- Test:
  - All tests: `npm run test` (uses integrated test runner)
  - Single Test: `npm run test:basic`, `npm run test:branch`, `npm run test:revision`, `npm run test:error`, `npm run test:perf`
  - Verbose output: `npm run test:verbose`

## Code Style Guidelines

- **Parameters**: snake_case (e.g., `thought_number`, not `thoughtNumber`)
- **Imports**: ES Modules with .js extension
- **Types**: Strict TypeScript with explicit types
- **Error Handling**: Use structured logging with Logger class
- **Logging**: Use logger.error/info/debug instead of console.log

Always run `npm run lint` before committing changes.

## Documentation Locations

- Main documentation: [README.md](./README.md)
- Detailed examples: [docs/examples.md](./docs/examples.md)
- Configuration options: [docs/configuration.md](./docs/configuration.md)
- Testing framework: [docs/testing.md](./docs/testing.md)
