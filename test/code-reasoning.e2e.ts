#!/usr/bin/env node

/**
 * Integrated Test Runner for Code-Reasoning
 *
 * A streamlined testing solution that manages server and client processes
 * while ensuring proper JSON-RPC protocol implementation. Key features:
 *
 * 1. Properly handles JSON-RPC notifications (no waiting for responses)
 * 2. Captures all communication in dedicated log files
 * 3. Provides clear test result summaries
 * 4. Works reliably without requiring separate terminals
 *
 * This approach solves the test visibility issues caused by StdioClientTransport
 * capturing stdout for JSON-RPC communication.
 */

// Basic Thought interface
interface Thought {
  thought: string;
  thought_number: number;
  total_thoughts: number;
  next_thought_needed: boolean;
  branch_from_thought?: number;
  branch_id?: string;
  is_revision?: boolean;
  revises_thought?: number;
}

// Test scenario definition
interface TestScenario {
  name: string;
  description: string;
  thoughts: Thought[];
  expectedSuccessCount?: number;
  expectedErrorCount?: number;
}

// Types for JSON-RPC params
interface InitializeParams {
  protocolVersion: string;
  capabilities: Record<string, unknown>;
  clientInfo: {
    name: string;
    version: string;
  };
}

interface ToolsListParams {
  // Empty object for tools/list
}

interface ToolsCallParams {
  name: string;
  arguments: Record<string, unknown>;
}

type JsonRpcParams = InitializeParams | ToolsListParams | ToolsCallParams | Record<string, unknown>;

// JSON-RPC related interfaces
interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: JsonRpcParams;
}

interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: JsonRpcParams;
}

interface JsonRpcError {
  code: number;
  message: string;
  data?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: Record<string, unknown>;
  error?: JsonRpcError;
}

// Tool interface
interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

// Test result structures
interface ThoughtResult {
  thought: Thought;
  response?: JsonRpcResponse;
  success: boolean;
  error?: string;
}

interface TestResult {
  name: string;
  description: string;
  thoughts: ThoughtResult[];
  successful: boolean;
  totalThoughts: number;
  successfulThoughts: number;
}

interface CombinedResults {
  timestamp: string;
  scenarios: TestResult[];
  totalScenarios: number;
  totalThoughts: number;
  totalSuccessfulThoughts: number;
  overallSuccess: boolean;
}

// Options interface
interface TestOptions {
  scenario: string;
  verbose: boolean;
}

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ChildProcess, spawn } from 'child_process';

// Find project root by looking for package.json
function findProjectRoot(startDir: string): string {
  let currentDir = startDir;

  // Walk up the directory tree until we find package.json
  while (currentDir !== path.parse(currentDir).root) {
    if (fs.existsSync(path.join(currentDir, 'package.json'))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  // If we reach the filesystem root without finding package.json,
  // fall back to the original calculation
  return path.join(startDir, '..');
}

// Get current file directory and find project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = findProjectRoot(__dirname);

// Log the detected project root for debugging
console.error(`Detected project root: ${projectRoot}`);

// Create log directories
const logsDir = path.join(projectRoot, 'logs');
const testResultsDir = path.join(projectRoot, 'test-results');

// Ensure directories exist
for (const dir of [logsDir, testResultsDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Generate timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

// Create log files
const logFile = path.join(logsDir, `custom-test-${timestamp}.log`);
const resultFile = path.join(testResultsDir, `custom-result-${timestamp}.json`);

// Create writable stream
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Logger function with stream writable check
function log(message: string): void {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} ${message}\n`;
  // Only write to logStream if it is still writable
  if (logStream.writable) {
    logStream.write(logMessage);
  }
  console.error(message);
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: TestOptions = {
  scenario: args.find(arg => !arg.startsWith('-')) || 'basic',
  verbose: args.includes('--verbose') || args.includes('-v'),
};

// Log startup information
log(`Code-Reasoning E2E Test Runner starting`);
log(`Log file: ${logFile}`);
log(`Result file: ${resultFile}`);
log(`Running scenario: ${options.scenario}`);
log(`Verbose mode: ${options.verbose}`);

// Define the test scenarios
const testScenarios: Record<string, TestScenario> = {
  basic: {
    name: 'Basic thought flow',
    description: 'Tests a linear sequence of thoughts without branches or revisions',
    thoughts: [
      {
        thought: "First step: Define the problem we're trying to solve.",
        thought_number: 1,
        total_thoughts: 4,
        next_thought_needed: true,
      },
      {
        thought: 'Second step: Break down the problem into smaller parts.',
        thought_number: 2,
        total_thoughts: 4,
        next_thought_needed: true,
      },
      {
        thought: 'Third step: Analyze each part and identify solutions.',
        thought_number: 3,
        total_thoughts: 4,
        next_thought_needed: true,
      },
      {
        thought: 'Fourth step: Combine the solutions into a comprehensive approach.',
        thought_number: 4,
        total_thoughts: 4,
        next_thought_needed: false,
      },
    ],
    expectedSuccessCount: 4,
    expectedErrorCount: 0,
  },

  branch: {
    name: 'Thought flow with branching',
    description: 'Tests the ability to branch into alternative thought paths',
    thoughts: [
      {
        thought: 'Main approach: Define the problem scope.',
        thought_number: 1,
        total_thoughts: 5,
        next_thought_needed: true,
      },
      {
        thought: 'Identify potential solution methodologies.',
        thought_number: 2,
        total_thoughts: 5,
        next_thought_needed: true,
      },
      {
        thought: 'Alternative approach: Consider the problem from first principles.',
        thought_number: 3,
        total_thoughts: 5,
        branch_from_thought: 1,
        branch_id: 'B1',
        next_thought_needed: true,
      },
      {
        thought: 'Continue main approach: Evaluate methodologies against requirements.',
        thought_number: 3,
        total_thoughts: 5,
        next_thought_needed: true,
      },
      {
        thought: 'B1: Break down the problem to its fundamental components.',
        thought_number: 4,
        total_thoughts: 5,
        branch_from_thought: 3,
        branch_id: 'B1',
        next_thought_needed: true,
      },
      {
        thought: 'Final main approach: Select the most appropriate methodology.',
        thought_number: 4,
        total_thoughts: 5,
        next_thought_needed: false,
      },
      {
        thought: 'B1: Construct solution directly from fundamental components.',
        thought_number: 5,
        total_thoughts: 5,
        branch_from_thought: 4,
        branch_id: 'B1',
        next_thought_needed: false,
      },
    ],
    expectedSuccessCount: 7,
    expectedErrorCount: 0,
  },

  revision: {
    name: 'Thought flow with revision',
    description: 'Tests the ability to revise previous thoughts',
    thoughts: [
      {
        thought: 'Initial analysis of the problem domain.',
        thought_number: 1,
        total_thoughts: 4,
        next_thought_needed: true,
      },
      {
        thought: 'Proposed solution based on initial understanding.',
        thought_number: 2,
        total_thoughts: 4,
        next_thought_needed: true,
      },
      {
        thought:
          'Wait, I made an error in my initial analysis. The problem actually involves asynchronous operations.',
        thought_number: 3,
        total_thoughts: 5,
        is_revision: true,
        revises_thought: 1,
        next_thought_needed: true,
      },
      {
        thought: 'Given the asynchronous nature, we need to revise our solution approach.',
        thought_number: 4,
        total_thoughts: 5,
        is_revision: true,
        revises_thought: 2,
        next_thought_needed: true,
      },
      {
        thought: 'Final solution incorporating asynchronous handling and error management.',
        thought_number: 5,
        total_thoughts: 5,
        next_thought_needed: false,
      },
    ],
    expectedSuccessCount: 5,
    expectedErrorCount: 0,
  },

  error: {
    name: 'Error handling tests',
    description: 'Tests various error conditions and edge cases',
    thoughts: [
      // Missing required field (thought)
      {
        thought_number: 1,
        total_thoughts: 3,
        next_thought_needed: true,
      } as unknown as Thought,

      // Missing required field (next_thought_needed)
      {
        thought: 'This is missing next_thought_needed field',
        thought_number: 1,
        total_thoughts: 3,
      } as unknown as Thought,

      // Invalid type (thought_number as string)
      {
        thought: 'Invalid thought_number type',
        thought_number: '1' as unknown as number,
        total_thoughts: 3,
        next_thought_needed: true,
      } as unknown as Thought,

      // Exceeding max thought number (>20)
      {
        thought: 'This exceeds the maximum thought number',
        thought_number: 21,
        total_thoughts: 25,
        next_thought_needed: true,
      },

      // Invalid branch reference (non-existent thought)
      {
        thought: 'This references a non-existent branch point',
        thought_number: 1,
        total_thoughts: 3,
        branch_from_thought: 100,
        branch_id: 'INVALID',
        next_thought_needed: true,
      },

      // Valid thought (to ensure the server is still functional)
      {
        thought: 'This is a valid thought after error tests',
        thought_number: 1,
        total_thoughts: 1,
        next_thought_needed: false,
      },
    ],
    expectedSuccessCount: 1,
    expectedErrorCount: 5,
  },

  perf: {
    name: 'Performance testing',
    description: 'Tests performance with a long sequence of thoughts',
    thoughts: Array.from({ length: 20 }, (_, i) => ({
      thought: `Performance test thought ${i + 1}. This is a longer thought to simulate more realistic content that the server would process in a real-world scenario. Including more text increases the processing load slightly to better measure performance characteristics.`,
      thought_number: i + 1,
      total_thoughts: 20,
      next_thought_needed: i < 19, // Only the last one has next_thought_needed: false
    })),
    expectedSuccessCount: 20,
    expectedErrorCount: 0,
  },
};

// Create a custom socket for communication
async function createSocketConnection(): Promise<ChildProcess> {
  return new Promise<ChildProcess>((resolve, reject) => {
    // Start the server
    log('Starting server process...');

    // Check if the index.js file exists
    const indexJsPath = path.join(projectRoot, 'dist/index.js');
    if (!fs.existsSync(indexJsPath)) {
      throw new Error(`Server entry point not found at ${indexJsPath}`);
    }

    log(`Using server entry point: ${indexJsPath}`);
    const serverProcess = spawn('node', [indexJsPath, '--debug'], {
      stdio: 'pipe',
      shell: false,
    });

    // Handle server stderr for logging
    serverProcess.stderr.on('data', (data: Buffer) => {
      const message = data.toString();
      log(`[SERVER] ${message.trim()}`);
    });

    // Wait for server to initialize
    setTimeout(() => {
      log('Server initialization period complete');
      resolve(serverProcess);
    }, 5000);

    // Handle server exit
    serverProcess.on('exit', code => {
      log(`Server process exited with code ${code}`);
      reject(new Error(`Server exited unexpectedly with code ${code}`));
    });
  });
}

// Run a test scenario
async function runTestScenario(
  serverProcess: ChildProcess,
  scenario: TestScenario
): Promise<TestResult> {
  log(`Running test scenario: ${scenario.name}`);
  log(scenario.description);

  // Results container
  const results: TestResult = {
    name: scenario.name,
    description: scenario.description,
    thoughts: [],
    successful: true,
    totalThoughts: scenario.thoughts.length,
    successfulThoughts: 0,
  };

  // Initialize server with JSON-RPC
  log('Sending initialize request...');
  const initResponse = await sendJsonRpcMessage(serverProcess, {
    jsonrpc: '2.0',
    id: 0,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'custom-test-client',
        version: '1.0.0',
      },
    },
  });

  log(`Initialize response: ${JSON.stringify(initResponse)}`);

  // Send initialize notification - notifications don't need a response
  log('Sending initialized notification...');
  await sendJsonRpcNotification(serverProcess, {
    jsonrpc: '2.0',
    method: 'notifications/initialized',
  });

  // Request tools list
  log('Requesting tools list...');
  const toolsResponse = await sendJsonRpcMessage(serverProcess, {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {},
  });

  log(`Tools response: ${JSON.stringify(toolsResponse)}`);

  // Check for code-reasoning tool
  const tools = Array.isArray(toolsResponse?.result?.tools) ? toolsResponse.result.tools : [];
  const codeReasoningTool = tools.find((tool: Tool) => tool.name === 'code-reasoning');

  if (!codeReasoningTool) {
    log('Error: code-reasoning tool not found!');
    results.successful = false;
    return results;
  }

  log('Found code-reasoning tool, running thoughts...');

  // Run each thought
  for (let index = 0; index < scenario.thoughts.length; index++) {
    const thought = scenario.thoughts[index];
    log(
      `Sending thought #${index + 1}/${scenario.thoughts.length}: ${thought.thought?.substring?.(0, 50) || 'undefined'}...`
    );

    try {
      const response = await sendJsonRpcMessage(serverProcess, {
        jsonrpc: '2.0',
        id: index + 2, // Start from id 2 (after initialize and tools/list)
        method: 'tools/call',
        params: {
          name: 'code-reasoning',
          arguments: thought,
        },
      });

      const success = !response.error;

      // Log the result
      if (success) {
        log(`✓ Thought #${index + 1} succeeded`);
        results.successfulThoughts++;
      } else {
        log(`✗ Thought #${index + 1} failed: ${response.error?.message || 'Unknown error'}`);
        results.successful = false;
      }

      // Store the result
      results.thoughts.push({
        thought,
        response,
        success,
      });

      if (options.verbose) {
        log(`Response: ${JSON.stringify(response)}`);
      }
    } catch (error) {
      log(
        `Error sending thought #${index + 1}: ${error instanceof Error ? error.message : String(error)}`
      );
      results.successful = false;
      results.thoughts.push({
        thought,
        error: error instanceof Error ? error.message : String(error),
        success: false,
      });
    }
  }

  return results;
}

// Send a JSON-RPC notification (doesn't expect a response)
async function sendJsonRpcNotification(
  serverProcess: ChildProcess,
  message: JsonRpcNotification
): Promise<void> {
  return new Promise<void>(resolve => {
    // Send the message
    const messageStr = JSON.stringify(message) + '\n';
    if (serverProcess.stdin) {
      serverProcess.stdin.write(messageStr);
    } else {
      throw new Error('Server process stdin is not available');
    }

    if (options.verbose) {
      log(`Sent notification: ${message.method}`);
    }

    // Resolve immediately - notifications don't expect responses
    resolve();
  });
}

// Send a JSON-RPC message to the server and get the response
async function sendJsonRpcMessage(
  serverProcess: ChildProcess,
  message: JsonRpcRequest
): Promise<JsonRpcResponse> {
  return new Promise<JsonRpcResponse>((resolve, reject) => {
    // Handle response timeout
    const timeout = setTimeout(() => {
      reject(new Error('Timeout waiting for server response'));
    }, 10000);

    // Create one-time handler for response
    const responseHandler = (data: Buffer): boolean => {
      try {
        const responseStr = data.toString();
        const lines = responseStr.split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const response = JSON.parse(line) as JsonRpcResponse;

            // Check if this is a response to our message
            if (message.id !== undefined && response.id === message.id) {
              clearTimeout(timeout);
              resolve(response);
              return true; // Signal that we handled this message
            }
          } catch {
            // Not JSON or not a response to our message
          }
        }

        return false; // Signal that we didn't handle this message
      } catch (error) {
        reject(error);
        return false;
      }
    };

    if (!serverProcess.stdout || !serverProcess.stdin) {
      reject(new Error('Server process stdout or stdin is not available'));
      return;
    }

    // Set up one-time listener for this message
    const onData = (data: Buffer) => {
      const handled = responseHandler(data);
      if (handled) {
        serverProcess.stdout?.removeListener('data', onData);
      }
    };

    serverProcess.stdout.on('data', onData);

    // Send the message
    const messageStr = JSON.stringify(message) + '\n';
    serverProcess.stdin.write(messageStr);
  });
}

// Main function
async function main() {
  try {
    // Start server
    const serverProcess = await createSocketConnection();

    // Determine which scenarios to run
    const scenariosToRun =
      options.scenario === 'all' ? Object.keys(testScenarios) : [options.scenario];

    // Validate scenarios
    if (!scenariosToRun.every(scenario => testScenarios[scenario])) {
      log(`Error: Unknown scenario '${options.scenario}'`);
      log(`Available scenarios: ${Object.keys(testScenarios).join(', ')}`);
      process.exit(1);
    }

    // Results storage for multiple scenarios
    const allResults: TestResult[] = [];
    let totalSuccessfulThoughts = 0;
    let totalThoughts = 0;

    // Run each selected scenario
    for (const scenarioKey of scenariosToRun) {
      const scenario = testScenarios[scenarioKey];
      log(`\n=== Running test scenario: ${scenario.name} ===`);
      log(scenario.description);

      const results = await runTestScenario(serverProcess, scenario);
      allResults.push(results);

      totalSuccessfulThoughts += results.successfulThoughts;
      totalThoughts += results.totalThoughts;

      // Display individual scenario summary
      log(`\n--- ${scenario.name} Results ---`);
      log(`Successful thoughts: ${results.successfulThoughts}/${results.totalThoughts}`);
      log(`Status: ${results.successful ? 'SUCCESS' : 'FAILURE'}`);

      // Check expected results if defined
      if (scenario.expectedSuccessCount !== undefined) {
        // For error handling tests specifically, check if responses have the expected isError flags
        if (scenario.name === 'Error handling tests') {
          // Count responses with isError: true and isError: false
          const errorResponses = results.thoughts.filter(
            t => t.response?.result?.isError === true
          ).length;
          const successResponses = results.thoughts.filter(
            t => t.response?.result?.isError === false
          ).length;

          // The last thought should be the only one without an error
          if (successResponses === scenario.expectedSuccessCount) {
            log(`✓ Success count matches expected (${scenario.expectedSuccessCount})`);
          } else {
            log(
              `✗ Success count ${successResponses} doesn't match expected ${scenario.expectedSuccessCount}`
            );
          }

          if (errorResponses === scenario.expectedErrorCount) {
            log(`✓ Error count matches expected (${scenario.expectedErrorCount})`);
          } else {
            log(
              `✗ Error count ${errorResponses} doesn't match expected ${scenario.expectedErrorCount}`
            );
          }
        } else {
          // For other tests, use the normal success/failure count
          if (results.successfulThoughts === scenario.expectedSuccessCount) {
            log(`✓ Success count matches expected (${scenario.expectedSuccessCount})`);
          } else {
            log(
              `✗ Success count ${results.successfulThoughts} doesn't match expected ${scenario.expectedSuccessCount}`
            );
          }

          if (scenario.expectedErrorCount !== undefined) {
            const errorCount = results.totalThoughts - results.successfulThoughts;
            if (errorCount === scenario.expectedErrorCount) {
              log(`✓ Error count matches expected (${scenario.expectedErrorCount})`);
            } else {
              log(
                `✗ Error count ${errorCount} doesn't match expected ${scenario.expectedErrorCount}`
              );
            }
          }
        }
      }
    }

    // Save all results to file
    const combinedResults: CombinedResults = {
      timestamp: new Date().toISOString(),
      scenarios: allResults,
      totalScenarios: scenariosToRun.length,
      totalThoughts: totalThoughts,
      totalSuccessfulThoughts: totalSuccessfulThoughts,
      overallSuccess: totalSuccessfulThoughts === totalThoughts,
    };

    fs.writeFileSync(resultFile, JSON.stringify(combinedResults, null, 2));
    log(`Results saved to ${resultFile}`);

    // Display overall summary
    log('\n=== Overall Test Results Summary ===');
    log(`Scenarios run: ${scenariosToRun.length}`);
    log(`Total thoughts: ${totalThoughts}`);
    log(`Successful thoughts: ${totalSuccessfulThoughts}/${totalThoughts}`);
    log(`Overall status: ${totalSuccessfulThoughts === totalThoughts ? 'SUCCESS' : 'FAILURE'}`);

    // Make sure to remove all data listeners to prevent callbacks after stream is closed
    serverProcess.stdout?.removeAllListeners('data');
    serverProcess.stderr?.removeAllListeners('data');

    // Kill server
    serverProcess.kill();

    // Give a small delay to ensure no more events are processed
    await new Promise(resolve => setTimeout(resolve, 100));

    // Close log stream
    logStream.end();
  } catch (error) {
    log(`Error: ${error instanceof Error ? error.message : String(error)}`);
    logStream.end();
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  log(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
  logStream.end();
  process.exit(1);
});
