#!/usr/bin/env node

/**
 * Code-Reasoning MCP Server Entry Point
 *
 * This is the entry point for the Code-Reasoning MCP Server, which uses sequential thinking
 * methodology to help solve programming problems step by step. It delegates to the main
 * server implementation in src/server.ts.
 *
 * Note: The server registers the "code-reasoning" tool, specializing in programming tasks
 * but is now referred to as "code-reasoning" in configuration and documentation.
 */

// Import and run the server
import('./src/server.js')
  .then(module => {
    module.runServer();
  })
  .catch(error => {
    console.error('Error starting server:', error);
    process.exit(1);
  });
