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
    const cliFlags = {
      debug: process.argv.includes('--debug'),
      remote_logging: process.argv.includes('--remote-logging'),
    };

    module.runServer({
      debug: cliFlags.debug,
      remoteLoggingEnabled: cliFlags.remote_logging,
    });
  })
  .catch(error => {
    console.error('Error starting server:', error);
    process.exit(1);
  });
