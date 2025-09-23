# Testing in Code-Reasoning

The `test/` directory houses the MCP regression harness that exercises the
compiled server via the official SDK client.

- `mcp-regression.test.ts` spawns `dist/index.js` through the
  `StdioClientTransport`, performs capability negotiation, and verifies tool and
  prompt flows end to end.
- Run the suite with `npm run test:regression`, or include it in the default
  `npm test` command which runs lint plus the harness.

Add new request scenarios here to grow coverage over time.
