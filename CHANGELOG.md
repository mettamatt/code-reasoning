# Changelog

## Unreleased

### Major Changes

- **Architecture Refactor**: Complete transformation from class-based to functional server architecture
- **Simplified Configuration System**: Streamlined configuration to focus on essential path constants
- **Enhanced Testing Framework**: Added comprehensive regression tests and improved testing documentation
- **Prompt System Improvements**: Enhanced prompt value management with better filtering and validation

### Features

- Added comprehensive MCP regression testing framework with 147 new test cases
- Enhanced server logging with improved tool metadata and structured error handling
- Implemented prompt argument filtering for global stored values
- Added robust prompt value management with PromptManager consolidation

### Improvements

- **MCP SDK Update**: Upgraded to version 1.18.1 for latest protocol features
- **Dependency Updates**: Updated all npm dependencies to latest stable versions
- **Server Architecture**: Refactored from SequentialThinkingServer class to functional approach
- **Configuration Simplification**: Removed complex config-manager in favor of simple buildConfig
- **Debug Logging**: Fixed debug output to use stderr instead of stdout for better separation
- **Documentation**: Updated configuration and testing documentation to reflect simplified architecture

### Breaking Changes

- Removed end-to-end test runner and prompt evaluation system (2,228 lines removed)
- Consolidated PromptManager and removed separate valueManager module
- Simplified server initialization by removing custom transport handling
- Removed prompt evaluation content and complex testing infrastructure

### Bug Fixes

- Fixed debug logging output stream to prevent interference with MCP communication
- Improved prompt value filtering to respect argument declarations
- Enhanced error handling and logging throughout the server

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
