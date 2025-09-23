# Testing the Code-Reasoning MCP Server

The project now ships a lightweight MCP regression harness alongside the existing
static analysis checks. The suite exercises the published stdio entry point
(`dist/index.js`) using the official SDK client so we can verify the server's
MCP contract end to end.

## Quick Checks

```bash
# Run the default quality gate (currently lint only)
npm test

# Full validation pipeline
npm run validate

# Target just the MCP regression suite
npm run test:regression
```

- `npm test` runs ESLint and the MCP regression harness.
- `npm run validate` formats sources, applies lint fixes, and rebuilds the TypeScript output.
- `npm run test:regression` rebuilds the project and runs `node --test` against the
  compiled harness in `dist/test/mcp-regression.test.js`.

## Regression coverage

The harness lives in `test/mcp-regression.test.ts` and covers:

- Tool discovery via `tools/list`
- Happy-path and validation-error calls to the `code-reasoning` tool
- Prompt discovery, prompt rendering, and completion persistence for
  `bug-analysis`

Feel free to extend the suite with additional request flows under the same
test runner.
