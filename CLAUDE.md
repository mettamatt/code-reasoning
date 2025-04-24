# CLAUDE.md

This file provides guidance to Claude when working with code in this repository.

## Build/Test/Lint Commands
- Build: `npm run build` 
- Start: `npm run start`, `npm run debug`, `npm run visualize`
- Test: `npm run test` (all tests)
- Single Test: `npm run test:basic`, `npm run test:branch`, `npm run test:revision`, `npm run test:error`, `npm run test:perf`

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
- Development history: [docs/development-history.md](./docs/development-history.md)