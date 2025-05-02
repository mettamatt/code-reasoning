# Changelog

## 0.6.1 (2025-05-02)

### Bug Fixes

- Fixed "Maximum call stack size exceeded" error in FilteredStdioServerTransport by preventing recursive stdout.write calls
- Improved stdout filtering mechanism to avoid circular references when filtering non-JSON output

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
