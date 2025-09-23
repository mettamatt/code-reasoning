# Changelog

## Unreleased

### Major Changes

- **Architecture Refactor**: Migrated from class-based `SequentialThinkingServer` to functional `McpServer` with modern registration patterns.
- **Configuration Simplification**: Replaced `config-manager` with lightweight `buildConfig` focused on path constants.
- **Testing Overhaul**: Introduced MCP regression framework with 147 new cases, plus improved documentation.
- **Prompt System**: Consolidated `PromptManager` for value management, filtering, and validation.
- **MCP SDK Migration**: Upgraded to MCP SDK `v1.18.1` with latest protocol features.

### Features

- Structured server logging with improved tool metadata and error handling.
- Prompt argument filtering for stored global values.
- Tests for preserving literal braces in prompt templates.

### Improvements

- Updated all npm dependencies to latest stable versions.
- Debug logs now output to `stderr` for clearer separation.
- Simplified entry point: removed `parseArgs` and command-line options.
- Updated schema handling with `ThoughtDataInputShape` validation.
- Documentation updated to match simplified architecture.
- Reduced bundle size by removing unused `chalk`.

### Breaking Changes

- Removed end-to-end test runner, prompt evaluation system, and related infrastructure (\~2,200 LOC).
- Dropped `valueManager` (merged into `PromptManager`).
- Removed custom transport handling.
- Replaced `zodToJsonSchema` with direct schema definitions.
- Eliminated CLI options and debug flag handling.

### Bug Fixes

- Fixed debug logging stream to avoid MCP interference.
- Improved prompt value filtering to respect declared arguments.
- Strengthened error handling and type safety (`CallToolResult` replaces `ServerResult`).
- Removed overly aggressive template injection neutralization.

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
