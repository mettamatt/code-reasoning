#!/usr/bin/env node

/**
 * Code-Reasoning MCP Test Client
 * 
 * This is a test client for the Code-Reasoning MCP Server designed to simulate
 * Claude Desktop and test the sequential thinking functionality with various
 * scenarios and edge cases.
 * 
 * Usage:
 *   npm run test
 *   npm run test:basic
 *   npm run test:branch
 *   npm run test:revision
 *   npm run test:error
 *   npm run test:perf
 */

/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import chalk from "chalk";
import { performance } from "perf_hooks";
import { ThoughtData } from "../src/visualizer.js";
import fs from "fs";
import path from "path";
import os from "os";

// Type definitions
interface TestScenario {
  name: string;
  description: string;
  thoughts: ThoughtData[];
  expectedSuccessCount?: number;
  expectedErrorCount?: number;
}

interface TestResult {
  name: string;
  successCount: number;
  errorCount: number;
  duration: number;
  details: {
    thought: ThoughtData;
    success: boolean;
    error?: string;
    response?: any;
    duration: number;
  }[];
}

interface PerformanceMetrics {
  scenarioName: string;
  totalDuration: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  throughput: number; // thoughts per second
}

// The actual Server Path
const SERVER_PATH = "dist/index.js";
// Command line arguments
const args = process.argv.slice(2);
const options = {
  verbose: args.includes("--verbose") || args.includes("-v"),
  scenario: args.find(arg => !arg.startsWith("-")) || "all",
  help: args.includes("--help") || args.includes("-h"),
  saveResults: args.includes("--save-results") || args.includes("-s"),
  visualize: args.includes("--visualize"),
  debug: args.includes("--debug"),
  timeout: 30000, // 30 seconds timeout by default
};

// Set timeout if specified
const timeoutArg = args.find(arg => arg.startsWith("--timeout="));
if (timeoutArg) {
  options.timeout = parseInt(timeoutArg.split("=")[1], 10);
}

// Help text
if (options.help) {
  console.log(`
Code-Reasoning MCP Test Client

Usage:
  node test-client.js [options] [scenario]

Scenarios:
  all        Run all test scenarios (default)
  basic      Run basic thought flow tests
  branch     Run thought branching tests
  revision   Run thought revision tests
  error      Run error handling tests
  perf       Run performance tests

Options:
  -v, --verbose                 Show detailed output for each test
  -h, --help                    Show this help message
  -s, --save-results            Save test results to JSON file
  --visualize                   Start the server with visualization
  --debug                       Start the server in debug mode
  --timeout=MILLISECONDS        Set test timeout (default: 30000)
`);
  process.exit(0);
}

// Test Scenarios
const testScenarios: Record<string, TestScenario> = {
  basic: {
    name: "Basic thought flow",
    description: "Tests a linear sequence of thoughts without branches or revisions",
    thoughts: [
      {
        thought: "First step: Define the problem we're trying to solve.",
        thought_number: 1,
        total_thoughts: 4,
        next_thought_needed: true
      },
      {
        thought: "Second step: Break down the problem into smaller parts.",
        thought_number: 2,
        total_thoughts: 4,
        next_thought_needed: true
      },
      {
        thought: "Third step: Analyze each part and identify solutions.",
        thought_number: 3,
        total_thoughts: 4,
        next_thought_needed: true
      },
      {
        thought: "Fourth step: Combine the solutions into a comprehensive approach.",
        thought_number: 4,
        total_thoughts: 4,
        next_thought_needed: false
      }
    ],
    expectedSuccessCount: 4,
    expectedErrorCount: 0
  },
  
  branch: {
    name: "Thought flow with branching",
    description: "Tests the ability to branch into alternative thought paths",
    thoughts: [
      {
        thought: "Main approach: Define the problem scope.",
        thought_number: 1,
        total_thoughts: 5,
        next_thought_needed: true
      },
      {
        thought: "Identify potential solution methodologies.",
        thought_number: 2,
        total_thoughts: 5,
        next_thought_needed: true
      },
      {
        thought: "Alternative approach: Consider the problem from first principles.",
        thought_number: 3,
        total_thoughts: 5,
        branch_from_thought: 1,
        branch_id: "B1",
        next_thought_needed: true
      },
      {
        thought: "Continue main approach: Evaluate methodologies against requirements.",
        thought_number: 3,
        total_thoughts: 5,
        next_thought_needed: true
      },
      {
        thought: "B1: Break down the problem to its fundamental components.",
        thought_number: 4,
        total_thoughts: 5,
        branch_from_thought: 3,
        branch_id: "B1",
        next_thought_needed: true
      },
      {
        thought: "Final main approach: Select the most appropriate methodology.",
        thought_number: 4,
        total_thoughts: 5,
        next_thought_needed: false
      },
      {
        thought: "B1: Construct solution directly from fundamental components.",
        thought_number: 5,
        total_thoughts: 5,
        branch_from_thought: 4,
        branch_id: "B1",
        next_thought_needed: false
      }
    ],
    expectedSuccessCount: 7,
    expectedErrorCount: 0
  },
  
  revision: {
    name: "Thought flow with revision",
    description: "Tests the ability to revise previous thoughts",
    thoughts: [
      {
        thought: "Initial analysis of the problem domain.",
        thought_number: 1,
        total_thoughts: 4,
        next_thought_needed: true
      },
      {
        thought: "Proposed solution based on initial understanding.",
        thought_number: 2,
        total_thoughts: 4,
        next_thought_needed: true
      },
      {
        thought: "Wait, I made an error in my initial analysis. The problem actually involves asynchronous operations.",
        thought_number: 3,
        total_thoughts: 5,
        is_revision: true,
        revises_thought: 1,
        next_thought_needed: true
      },
      {
        thought: "Given the asynchronous nature, we need to revise our solution approach.",
        thought_number: 4,
        total_thoughts: 5,
        is_revision: true,
        revises_thought: 2,
        next_thought_needed: true
      },
      {
        thought: "Final solution incorporating asynchronous handling and error management.",
        thought_number: 5,
        total_thoughts: 5,
        next_thought_needed: false
      }
    ],
    expectedSuccessCount: 5,
    expectedErrorCount: 0
  },
  
  error: {
    name: "Error handling tests",
    description: "Tests various error conditions and edge cases",
    thoughts: [
      // Missing required field (thought)
      {
        thought_number: 1,
        total_thoughts: 3,
        next_thought_needed: true
      } as any,
      
      // Missing required field (next_thought_needed)
      {
        thought: "This is missing next_thought_needed field",
        thought_number: 1,
        total_thoughts: 3
      } as any,
      
      // Invalid type (thought_number as string)
      {
        thought: "Invalid thought_number type",
        thought_number: "1" as any,
        total_thoughts: 3,
        next_thought_needed: true
      },
      
      // Exceeding max thought number (>20)
      {
        thought: "This exceeds the maximum thought number",
        thought_number: 21,
        total_thoughts: 25,
        next_thought_needed: true
      },
      
      // Invalid branch reference (non-existent thought)
      {
        thought: "This references a non-existent branch point",
        thought_number: 1,
        total_thoughts: 3,
        branch_from_thought: 100,
        branch_id: "INVALID",
        next_thought_needed: true
      },
      
      // Valid thought (to ensure the server is still functional)
      {
        thought: "This is a valid thought after error tests",
        thought_number: 1,
        total_thoughts: 1,
        next_thought_needed: false
      }
    ],
    expectedSuccessCount: 1,
    expectedErrorCount: 5
  },
  
  perf: {
    name: "Performance testing",
    description: "Tests performance with a long sequence of thoughts",
    thoughts: Array.from({ length: 20 }, (_, i) => ({
      thought: `Performance test thought ${i + 1}. This is a longer thought to simulate more realistic content that the server would process in a real-world scenario. Including more text increases the processing load slightly to better measure performance characteristics.`,
      thought_number: i + 1,
      total_thoughts: 20,
      next_thought_needed: i < 19 // Only the last one has next_thought_needed: false
    })),
    expectedSuccessCount: 20,
    expectedErrorCount: 0
  }
};

// Run the test client
async function runTests() {
  try {
    // Print header
    console.log(chalk.blue.bold("\n=== Code-Reasoning MCP Test Client ===\n"));
    
    // Start the server process
    const serverArgs = [
      SERVER_PATH,
      options.debug ? "--debug" : "",
      options.visualize ? "--visualize" : ""
    ].filter(Boolean);
    
    console.log(chalk.yellow(`Starting server with: node ${serverArgs.join(" ")}`));
    
    // Create client
    const client = new Client(
      { name: "test-client", version: "1.0.0" },
      { capabilities: {} }
    );

    console.log(chalk.yellow('Connecting to server...'));
    
    // Connect to server using stdio
    const transport = new StdioClientTransport({
      command: "node",
      args: serverArgs
    });

    try {
      await client.connect(transport);
      console.log(chalk.green('✓ Connected to server'));

      // List available tools
      console.log(chalk.yellow('Listing available tools...'));
      const toolsResponse = await client.request(
        { method: "tools/list", params: {} },
        ListToolsRequestSchema
      );
      
      // Cast response to access tools property
      const responseWithTools = toolsResponse as any;
      
      if (options.verbose) {
        console.log(chalk.green('Available tools:'));
        console.log(JSON.stringify(responseWithTools.tools, null, 2));
      } else {
        console.log(chalk.green(`✓ Found ${responseWithTools.tools.length} available tools`));
      }

      // Check if sequentialthinking tool is available
      const sequentialThinkingTool = responseWithTools.tools.find(
        (tool: any) => tool.name === "sequentialthinking"
      );
      
      if (!sequentialThinkingTool) {
        throw new Error("sequentialthinking tool not found on server");
      }
      
      console.log(chalk.green('✓ Found sequentialthinking tool'));

      // Determine which scenarios to run
      const scenariosToRun = options.scenario === "all" 
        ? Object.keys(testScenarios)
        : [options.scenario];
        
      if (!scenariosToRun.every(scenario => testScenarios[scenario])) {
        console.error(chalk.red(`Unknown scenario: ${options.scenario}`));
        console.log(chalk.yellow(`Available scenarios: ${Object.keys(testScenarios).join(", ")}`));
        return;
      }

      const results: TestResult[] = [];
      const performanceMetrics: PerformanceMetrics[] = [];

      // Run test scenarios
      for (const scenarioKey of scenariosToRun) {
        const scenario = testScenarios[scenarioKey];
        console.log(chalk.blue(`\n=== Running test scenario: ${scenario.name} ===`));
        console.log(chalk.gray(scenario.description));
        
        const result: TestResult = {
          name: scenario.name,
          successCount: 0,
          errorCount: 0,
          duration: 0,
          details: []
        };
        
        const startTime = performance.now();
        const responseTimes: number[] = [];
        
        for (const [index, thoughtData] of scenario.thoughts.entries()) {
          console.log(chalk.yellow(`Sending thought #${index + 1}/${scenario.thoughts.length}`));
          
          if (options.verbose) {
            console.log(chalk.gray(`Thought data: ${JSON.stringify(thoughtData, null, 2)}`));
          }
          
          try {
            const thoughtStartTime = performance.now();
            
            const response = await client.request(
              {
                method: "tools/call",
                params: {
                  name: "sequentialthinking",
                  arguments: thoughtData
                }
              },
              CallToolRequestSchema
            );
            
            const thoughtDuration = performance.now() - thoughtStartTime;
            responseTimes.push(thoughtDuration);
            
            // Cast response to access isError property
            const responseWithIsError = response as any;
            const isError = responseWithIsError.isError === true;
            
            if (isError) {
              result.errorCount++;
              console.log(chalk.red(`✗ Error response received for thought #${index + 1}`));
              if (options.verbose) {
                console.log(chalk.red(JSON.stringify(response, null, 2)));
              }
            } else {
              result.successCount++;
              console.log(chalk.green(`✓ Response received for thought #${index + 1} (${thoughtDuration.toFixed(2)}ms)`));
              if (options.verbose) {
                console.log(chalk.gray(JSON.stringify(response, null, 2)));
              }
            }
            
            result.details.push({
              thought: thoughtData,
              success: !isError,
              response,
              duration: thoughtDuration,
              error: isError ? JSON.stringify(response) : undefined
            });
            
          } catch (error) {
            result.errorCount++;
            console.error(chalk.red(`✗ Request failed for thought #${index + 1}:`), error);
            
            result.details.push({
              thought: thoughtData,
              success: false,
              error: error instanceof Error ? error.message : String(error),
              duration: 0
            });
          }
        }
        
        const totalDuration = performance.now() - startTime;
        result.duration = totalDuration;
        
        // Calculate performance metrics
        if (responseTimes.length > 0) {
          performanceMetrics.push({
            scenarioName: scenario.name,
            totalDuration,
            avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
            minResponseTime: Math.min(...responseTimes),
            maxResponseTime: Math.max(...responseTimes),
            throughput: (scenario.thoughts.length / totalDuration) * 1000
          });
        }
        
        results.push(result);
        
        // Print scenario summary
        console.log(chalk.blue("\nScenario Results:"));
        console.log(chalk.white(`Total duration: ${totalDuration.toFixed(2)}ms`));
        console.log(chalk.white(`Successful thoughts: ${result.successCount}/${scenario.thoughts.length}`));
        console.log(chalk.white(`Failed thoughts: ${result.errorCount}/${scenario.thoughts.length}`));
        
        if (scenario.expectedSuccessCount !== undefined) {
          if (result.successCount === scenario.expectedSuccessCount) {
            console.log(chalk.green(`✓ Success count matches expected (${scenario.expectedSuccessCount})`));
          } else {
            console.log(chalk.red(`✗ Success count ${result.successCount} doesn't match expected ${scenario.expectedSuccessCount}`));
          }
        }
        
        if (scenario.expectedErrorCount !== undefined) {
          if (result.errorCount === scenario.expectedErrorCount) {
            console.log(chalk.green(`✓ Error count matches expected (${scenario.expectedErrorCount})`));
          } else {
            console.log(chalk.red(`✗ Error count ${result.errorCount} doesn't match expected ${scenario.expectedErrorCount}`));
          }
        }
      }

      // Print overall results
      console.log(chalk.blue.bold("\n=== Overall Test Results ==="));
      
      let totalSuccess = 0;
      let totalError = 0;
      let totalExpectedSuccess = 0;
      let totalExpectedError = 0;
      
      for (const result of results) {
        totalSuccess += result.successCount;
        totalError += result.errorCount;
        
        const scenario = Object.values(testScenarios).find(s => s.name === result.name);
        if (scenario) {
          if (scenario.expectedSuccessCount !== undefined) {
            totalExpectedSuccess += scenario.expectedSuccessCount;
          }
          if (scenario.expectedErrorCount !== undefined) {
            totalExpectedError += scenario.expectedErrorCount;
          }
        }
      }
      
      console.log(chalk.white(`Total successful tests: ${totalSuccess}/${totalSuccess + totalError}`));
      console.log(chalk.white(`Total failed tests: ${totalError}/${totalSuccess + totalError}`));
      
      if (totalExpectedSuccess > 0 || totalExpectedError > 0) {
        const successMatch = totalSuccess === totalExpectedSuccess;
        const errorMatch = totalError === totalExpectedError;
        
        if (successMatch && errorMatch) {
          console.log(chalk.green(`✓ All tests matched expected results`));
        } else {
          if (!successMatch) {
            console.log(chalk.red(`✗ Success count ${totalSuccess} doesn't match expected ${totalExpectedSuccess}`));
          }
          if (!errorMatch) {
            console.log(chalk.red(`✗ Error count ${totalError} doesn't match expected ${totalExpectedError}`));
          }
        }
      }
      
      // Print performance metrics
      if (performanceMetrics.length > 0) {
        console.log(chalk.blue.bold("\n=== Performance Metrics ==="));
        
        console.log(chalk.white("| Scenario | Total (ms) | Avg (ms) | Min (ms) | Max (ms) | Thoughts/sec |"));
        console.log(chalk.white("|----------|------------|----------|----------|----------|--------------|"));
        
        for (const metric of performanceMetrics) {
          console.log(chalk.white(
            `| ${metric.scenarioName.padEnd(8)} | ` +
            `${metric.totalDuration.toFixed(2).padEnd(10)} | ` +
            `${metric.avgResponseTime.toFixed(2).padEnd(8)} | ` +
            `${metric.minResponseTime.toFixed(2).padEnd(8)} | ` +
            `${metric.maxResponseTime.toFixed(2).padEnd(8)} | ` +
            `${metric.throughput.toFixed(2).padEnd(12)} |`
          ));
        }
      }
      
      // Save results if requested
      if (options.saveResults) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const resultsDir = path.join(os.homedir(), '.code-reasoning', 'test-results');
        
        if (!fs.existsSync(resultsDir)) {
          fs.mkdirSync(resultsDir, { recursive: true });
        }
        
        const resultsPath = path.join(resultsDir, `test-results-${timestamp}.json`);
        
        fs.writeFileSync(resultsPath, JSON.stringify({
          timestamp: new Date().toISOString(),
          options,
          results,
          performanceMetrics
        }, null, 2));
        
        console.log(chalk.green(`\nTest results saved to: ${resultsPath}`));
      }

    } finally {
      // Disconnect
      console.log(chalk.yellow('\nDisconnecting from server...'));
      await client.close();
      console.log(chalk.green('✓ Disconnected from server'));
    }
  } catch (error) {
    console.error(chalk.red('\n✗ Test client failed with error:'), error);
    process.exit(1);
  }
}

// Check if this file is being run directly
if (typeof require !== 'undefined' && require.main === module) {
  runTests().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}
