#!/usr/bin/env node

import { parseArgs } from 'node:util';

/**
 * Code-Reasoning MCP Server Entry Point
 *
 * This is the entry point for the Code-Reasoning MCP Server, which uses sequential thinking
 * methodology to help solve programming problems step by step. It delegates to the main
 * server implementation in src/server.ts after parsing command line arguments.
 *
 * Note: The server registers the "code-reasoning" tool, specializing in programming tasks
 * but is now referred to as "code-reasoning" in configuration and documentation.
 */

// Parse command line arguments
const { values } = parseArgs({
  options: {
    debug: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

// Import and run the server
import('./src/server.js')
  .then(module => {
    // Debug flag is passed to runServer
    if (values.debug) {
      // eslint-disable-next-line no-console
      console.log('Starting server in debug mode');
    }

    module.runServer(values.debug);
  })
  .catch(error => {
    console.error('Error starting server:', error);
    process.exit(1);
  });
