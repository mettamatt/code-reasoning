# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Test/Lint Commands
- Build: `npm run build` 
- Start: `npm run start`, `npm run debug`, `npm run visualize`
- Test: `npm run test` (all tests)
- Single Test: `npm run test:basic`, `npm run test:branch`, `npm run test:revision`, `npm run test:error`, `npm run test:perf`
- Lint: `npm run lint`, `npm run lint:fix`

## Code Style
- **Parameters**: snake_case (e.g., `thought_number`, not `thoughtNumber`)
- **Imports**: ES Modules with .js extension (e.g., `import { Logger } from "./logger.js"`)
- **Types**: Strict TypeScript with explicit types, avoid `any` when possible
- **Error Handling**: Use structured logging with Logger class, include context objects
- **Logging**: Use logger.error/info/debug instead of console.log
- **Constants**: UPPERCASE for constant values
- **Classes**: PascalCase for class names, implement proper interfaces
- **Formatting**: Follow ESLint rules with 2-space indentation

Always run `npm run lint` before committing changes to ensure code quality.