# Code-Reasoning Directory Streamlining Plan

After carefully analyzing the structure and content of the `~/Sites/code-reasoning/` directory, this document outlines a comprehensive plan to streamline the files and directory structure. This plan will improve organization while maintaining all essential functionality.

## Directory Structure Changes

1. **Remove Unnecessary Directories:**
   - Delete `src/backup` directory (empty and unused)

2. **Create Better Organization:**
   - Create a new `docs/` directory to consolidate documentation
   - Keep `public/` (used by the visualizer to store generated files)
   - Keep `dist/` but ensure it's in `.gitignore` (contains compiled code)

## Documentation Restructuring

1. **Reorganize Documentation Files:**
   - Move detailed content from README.md into dedicated files in the docs/ directory
   - Create a more concise README.md with essential information only
   - Move EXAMPLES.md → docs/examples.md
   - Move CONFIGURATION.md → docs/configuration.md
   - Move TEST.md → docs/testing.md
   - Move DEBUGGING_PLAN.md → docs/development-history.md (or remove if not needed)
   - Keep CLAUDE.md at the root but make it more concise

2. **Content Consolidation:**
   - The current README.md is very long (8,000+ words) and can be simplified
   - Reduce duplication between documentation files
   - Create a clearer separation between user docs and developer docs

## Code Structure

1. **Keep Existing Source Code Structure:**
   - No changes needed to the code structure as it's already well-organized
   - The source files in `src/` have clear separation of concerns:
     - `server.ts`: Main server implementation
     - `logger.ts`: Logging functionality
     - `logging-transport.ts`: Transport layer for logging
     - `visualizer.ts`: Dashboard visualization

2. **Test Directory:**
   - The test directory structure is appropriate with the test-client.ts file

## Configuration Files

1. **No Changes Needed:**
   - `package.json`, `tsconfig.json`, and other configuration files are appropriate
   - `.gitignore` may need updating to ensure `dist/` is excluded

## Implementation Approach

This streamlining plan can be implemented in phases:

1. First phase - Create the docs/ directory and move documentation
2. Second phase - Remove unnecessary directories
3. Third phase - Update any references in code or documentation to reflect the new structure
