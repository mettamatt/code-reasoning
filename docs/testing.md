# Testing the Code-Reasoning MCP Server

This project no longer ships an end-to-end harness or prompt-evaluation suite. Quality checks focus on static analysis and build verification.

## Quick Checks

```bash
# Run the default quality gate (currently lint only)
npm test

# Full validation pipeline
npm run validate
```

- `npm test` runs ESLint to enforce coding standards.
- `npm run validate` formats sources, applies lint fixes, and rebuilds the TypeScript output.

Future automated tests will live under the `test/` directory, but that folder is intentionally empty right now.
