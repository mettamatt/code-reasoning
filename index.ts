#!/usr/bin/env node

import { parseArgs } from "node:util";

/**
 * Code-Reasoning MCP Server Entry Point
 * 
 * This is a simple entry point that delegates to the main server implementation
 * in src/server.ts. It parses command line arguments and passes them to the
 * server implementation.
 */

// Parse command line arguments
const { values } = parseArgs({
  options: {
    debug: { type: "boolean", default: false },
    visualize: { type: "boolean", default: false },
    port: { type: "string", default: "3000" },
    help: { type: "boolean", short: "h", default: false }
  }
});

// Import and run the server with the parsed arguments
import('./src/server.js').then(module => {
  module.runServer(values);
}).catch(error => {
  console.error("Error starting server:", error);
  process.exit(1);
});
