# Changelog

## Unreleased

## 0.8.0 (2025-09-23)

### Major Changes

- Migrated from class-based `SequentialThinkingServer` to functional `McpServer`.
- Simplified config: replaced `config-manager` with lightweight `buildConfig`.
- Introduced MCP regression framework (147 tests) with improved docs.
- Consolidated prompt handling into `PromptManager` with filtering and validation.
- Upgraded to MCP SDK `v1.18.1`.
- Removed custom prompt loading for security and consistency.

### Features

- Structured logging with tool metadata and error handling.
- Prompt argument filtering for global values.
- Added tests for literal braces in templates.

### Improvements

- Updated npm dependencies.
- Debug logs now go to `stderr`.
- Simplified entry point (removed `parseArgs` and CLI options).
- Updated schema handling with `ThoughtDataInputShape`.
- Docs aligned with new architecture.
- Reduced bundle size (removed `chalk`).
- Refined validation with dual-schema/Zod-inferred types.
- Better shutdown handling with proper exit codes.

### Breaking Changes

- Removed end-to-end test runner, prompt evaluation, and related infra (\~2,200 LOC).
- Dropped `valueManager` (merged into `PromptManager`).
- Removed custom transport handling.
- Replaced `zodToJsonSchema` with direct schemas.
- Eliminated CLI options and debug flag handling.
- Replaced manual `ThoughtData` interface with Zod-inferred types and strict/loose schemas.

### Bug Fixes

- Fixed debug logging stream (no MCP interference).
- Improved prompt filtering to respect declared args.
- Strengthened error handling and type safety (`CallToolResult` replaces `ServerResult`).
- Removed overzealous template injection neutralization.

## 0.7.0 (2025-05-10)

### Features

- Added comprehensive MCP prompts system with predefined templates
  - Includes architecture-decision, bug-analysis, code-review, feature-planning, and refactoring-plan prompts
  - The last prompt value is saved so that it can be used again but it will not show until Claude Desktop and Claude Code implement MCP CompleteRequestSchema. See https://github.com/anthropics/claude-code/issues/986
  - Added support for custom prompt templates via JSON files
  - Added Zod-based input sanitization to template processing

## 0.6.2 (2025-05-04)

### Features

- Added tool annotations support to better inform clients about the tool's behavior
- Updated MCP SDK version reference to 1.11.0

### Improvements

- Updated ESLint ecosystem to major new versions
  - ESLint: 8.57.1 → 9.26.0
  - @typescript-eslint/parser: 7.18.0 → 8.31.1
  - @typescript-eslint/eslint-plugin: 7.18.0 → 8.31.1
- Added ESLint v9 flat config support via eslint.config.js
- Removed obsolete .eslintrc.json configuration
- Added GitHub Actions CI/CD workflows and contribution templates
- Added CI badge and Contributing section to README

## 0.6.1 (2025-05-02)

### Bug Fixes

- Fixed "Maximum call stack size exceeded" error in FilteredStdioServerTransport by preventing recursive stdout.write calls
- Improved stdout filtering mechanism to avoid circular references when filtering non-JSON output

### Improvements

- Doubled default operation timeout from 30s to 60s for better handling of complex reasoning tasks

## 0.6.0 (2025-04-30)

### Features

- Upgraded MCP SDK from 0.5.0 to 1.10.2 for enhanced protocol compatibility
- Added support for additional protocol capabilities (resources, prompts)
- Implemented custom FilteredStdioServerTransport for improved stability
- Added handlers for ListResourcesRequestSchema and ListPromptsRequestSchema

### Technical Improvements

- Leveraged zodToJsonSchema utility for schema generation rather than manual creation
- Documented intent of empty resource and prompt handlers to prevent Claude Desktop errors
- Refined JSON detection logic in FilteredStdioServerTransport to handle array literals
- Simplified type aliases by using direct SDK types for better maintainability
- Improved file header documentation with MCP SDK version information and clearer feature descriptions
- Updated type definitions for newer SDK compatibility
- Added zod-to-json-schema dependency
- Reorganized server.ts with clear section headers for better code organization
- Enhanced code performance with cached JSON schema and optimized validation
- Improved type safety with readonly properties and Map instead of object literals

## 0.5.0 (2025-04-30)

### Features

- Updated core prompt to use HYBRID_DESIGN for better reasoning performance
- Added prompt evaluation system with documentation and examples
- Enhanced end-to-end test framework
- Increased maxThoughtLength for more complex reasoning tasks

## 0.4.0 (earlier release)

Initial documented version.
