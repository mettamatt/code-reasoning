#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

// Define locally since it's not exported from SDK
interface JSONRPCErrorResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}
import chalk from 'chalk';
import { Logger, LogLevel, parseLogLevel } from './logger.js';
import { LoggingStdioServerTransport } from './logging-transport.js';

// --- Configuration ---

/** Defines the configuration options for the Code Reasoning Server. */
interface CodeReasoningConfig {
  maxThoughtLength: number;
  timeoutMs: number;
  maxThoughts: number;
  logLevel: LogLevel;
  enhancedVisualization: boolean;
  colorOutput: boolean;
}

/** Default configuration values. */
const defaultConfig: CodeReasoningConfig = {
  maxThoughtLength: 2000,
  timeoutMs: 30000,
  maxThoughts: 20,
  logLevel: LogLevel.INFO,
  enhancedVisualization: true,
  colorOutput: true,
};

/** Parses configuration from command-line arguments and environment variables. */
function parseConfig(args: string[], env: NodeJS.ProcessEnv): CodeReasoningConfig {
  const config = { ...defaultConfig };

  // Helper to parse integer environment variables
  const parseIntEnv = (key: string, defaultValue: number): number => {
    const value = env[key];
    return value && !isNaN(parseInt(value, 10)) ? parseInt(value, 10) : defaultValue;
  };

  // Helper to parse boolean environment variables
  const parseBoolEnv = (key: string, defaultValue: boolean): boolean => {
    const value = env[key]?.toLowerCase();
    return value === 'true' ? true : value === 'false' ? false : defaultValue;
  };

  // Parse from environment variables
  config.maxThoughtLength = parseIntEnv('MAX_THOUGHT_LENGTH', config.maxThoughtLength);
  config.timeoutMs = parseIntEnv('TIMEOUT_MS', config.timeoutMs);
  config.maxThoughts = parseIntEnv('MAX_THOUGHTS', config.maxThoughts);
  config.logLevel = parseLogLevel(env.LOG_LEVEL, config.logLevel);
  config.enhancedVisualization = parseBoolEnv(
    'ENHANCED_VISUALIZATION',
    config.enhancedVisualization
  );
  config.colorOutput = parseBoolEnv('COLOR_OUTPUT', config.colorOutput);

  // Parse from command-line arguments (override environment variables)
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const value = args[i + 1]; // Potential value for args like --option <value>

    if (arg === '--max-thought-length' && value) {
      config.maxThoughtLength = parseInt(value, 10);
      i++;
    } else if (arg === '--timeout-ms' && value) {
      config.timeoutMs = parseInt(value, 10);
      i++;
    } else if (arg === '--max-thoughts' && value) {
      config.maxThoughts = parseInt(value, 10);
      i++;
    } else if (arg === '--log-level' && value) {
      config.logLevel = parseLogLevel(value, config.logLevel);
      i++;
    } else if (arg === '--no-enhanced-visualization') {
      config.enhancedVisualization = false;
    } else if (arg === '--no-color') {
      config.colorOutput = false;
    } else if (arg === '--debug') {
      // Allow --debug flag to override log level
      config.logLevel = LogLevel.DEBUG;
    }
  }

  // Ensure maxThoughts is at least 1
  if (config.maxThoughts < 1) config.maxThoughts = 1;
  // Ensure maxThoughtLength is reasonable
  if (config.maxThoughtLength < 100) config.maxThoughtLength = 100;
  // Ensure timeout is reasonable
  if (config.timeoutMs < 1000) config.timeoutMs = 1000;

  return config;
}

// --- Thought Data ---

/** Interface defining the structure for a single thought step. */
export interface ThoughtData {
  thought: string;
  thought_number: number;
  total_thoughts: number;
  next_thought_needed: boolean;
  is_revision?: boolean;
  revises_thought?: number;
  branch_from_thought?: number;
  branch_id?: string;
  needs_more_thoughts?: boolean; // Optional hint
}

/** Interface for performance metrics tracking. */
interface PerformanceMetric {
  thoughtNumber: number;
  processingTimeMs: number;
  thoughtLength: number;
  timestamp: string;
}

// --- Enhanced Tool Definition ---

const CODE_REASONING_TOOL: Tool = {
  name: 'code-reasoning',
  description: `
🧠 **Code Reasoning Tool** – recursive private-thought mechanism to solve complex programming problems.
• Break down problems into manageable steps with sequential thinking.
• Use branching (🌿) to explore multiple approaches when uncertain.
• Revise previous thoughts (🔄) when you gain new insights.
• Structure your reasoning in a clear, step-by-step format.
• Abort automatically after a configured number of thoughts (default 20, server will summarise).
• *Always* set \`next_thought_needed\` = false when every open question is resolved.

Thinking checklist (review **every 3 thoughts**):
1. Need to BRANCH?   → set \`branch_from_thought\` + \`branch_id\`.
2. Need to REVISE?   → set \`is_revision\` + \`revises_thought\`.
3. Need more steps?  → bump \`total_thoughts\`.
4. Finished reasoning? → set \`next_thought_needed\` = false.

Effective sequential thinking strategies:
• Start by breaking down the problem into smaller, manageable parts
• Consider edge cases and potential failure modes
• Use branching when you see multiple viable approaches
• Revise earlier thoughts when you discover errors or new insights
• After exploring branches, conclude by synthesizing findings and making a clear selection or recommendation
• Set appropriate total_thoughts estimate and adjust as needed
• Be explicit about when your reasoning is complete

When to use branching:
• When you see multiple valid approaches to solving a problem
• When you're uncertain which algorithm or method will work best
• When you want to explore different implementations and compare them
• Always use unique branch_id values for different exploration paths (e.g., "algorithm-a", "approach-b")

When to use revision:
• When you discover an error in previous reasoning
• When new information invalidates earlier assumptions
• When you gain a deeper understanding that changes your approach

Request format examples:
{
  "thought": "Your detailed reasoning step...",
  "thought_number": 1,
  "total_thoughts": 5,
  "next_thought_needed": true
}

For branching:
{
  "thought": "Let me explore an alternative approach...",
  "thought_number": 3,
  "total_thoughts": 7,
  "next_thought_needed": true,
  "branch_from_thought": 2,
  "branch_id": "alternative-approach"
}

For revision:
{
  "thought": "I need to revise my earlier understanding...",
  "thought_number": 4,
  "total_thoughts": 6,
  "next_thought_needed": true,
  "is_revision": true,
  "revises_thought": 2
}
`,
  inputSchema: {
    type: 'object',
    properties: {
      thought: {
        type: 'string',
        description: 'Your current reasoning step',
      },
      next_thought_needed: {
        type: 'boolean',
        description: 'Whether another thought step is needed',
      },
      thought_number: {
        type: 'integer',
        description: 'Current thought number (1-based)',
        minimum: 1,
      },
      total_thoughts: {
        type: 'integer',
        description: 'Estimated total thoughts needed (can be adjusted)',
        minimum: 1,
      },
      is_revision: {
        type: 'boolean',
        description: 'Whether this is a revision of a previous thought',
        default: false, // Explicit default
      },
      revises_thought: {
        type: 'integer',
        description: 'Which thought is being revised (required if is_revision is true)',
        minimum: 1,
      },
      branch_from_thought: {
        type: 'integer',
        description: 'Branching point thought number (required if branch_id is provided)',
        minimum: 1,
      },
      branch_id: {
        type: 'string',
        description:
          'Identifier for the current branch (required if branch_from_thought is provided)',
      },
      needs_more_thoughts: {
        type: 'boolean',
        description: 'Optional hint that more thoughts may follow',
      },
    },
    required: ['thought', 'next_thought_needed', 'thought_number', 'total_thoughts'],
    // Additional validation logic can be added in validateThoughtData if needed
  },
};

// --- Code Reasoning Server Class ---

class CodeReasoningServer {
  private thoughtHistory: ThoughtData[] = [];
  private branches: Record<string, ThoughtData[]> = {};
  private logger: Logger;
  private config: CodeReasoningConfig;
  private performanceMetrics: PerformanceMetric[] = [];
  private errorCounts: Record<string, number> = {}; // Track error types/messages

  constructor(logger: Logger, config: CodeReasoningConfig) {
    this.logger = logger;
    this.config = config;
    this.logger.info('Code Reasoning Server initialized with configuration', {
      config: this.config,
    });
  }

  /** Validates the input data against the ThoughtData interface and configuration limits. */
  private validateThoughtData(input: unknown): ThoughtData {
    this.logger.debug('Validating thought data', input as Record<string, unknown>);

    if (typeof input !== 'object' || input === null) {
      throw new Error('Invalid input: must be an object');
    }

    const data = input as Record<string, unknown>; // Use 'unknown' for type-safe validation

    // Required fields
    if (!data.thought || typeof data.thought !== 'string' || data.thought.trim() === '') {
      throw new Error('Invalid or empty thought: must be a non-empty string');
    }
    if (
      typeof data.thought_number !== 'number' ||
      !Number.isInteger(data.thought_number) ||
      data.thought_number < 1
    ) {
      throw new Error('Invalid thought_number: must be a positive integer');
    }
    if (
      typeof data.total_thoughts !== 'number' ||
      !Number.isInteger(data.total_thoughts) ||
      data.total_thoughts < 1
    ) {
      throw new Error('Invalid total_thoughts: must be a positive integer');
    }
    if (typeof data.next_thought_needed !== 'boolean') {
      throw new Error('Invalid next_thought_needed: must be a boolean');
    }

    // Length check
    if (data.thought.length > this.config.maxThoughtLength) {
      throw new Error(
        `Thought exceeds maximum length of ${this.config.maxThoughtLength} characters. Please break it into multiple thoughts.`
      );
    }

    // Conditional validation for revision
    if (data.is_revision === true) {
      if (
        typeof data.revises_thought !== 'number' ||
        !Number.isInteger(data.revises_thought) ||
        data.revises_thought < 1
      ) {
        throw new Error(
          'Invalid revises_thought: must be a positive integer when is_revision is true'
        );
      }
      if (data.branch_id || data.branch_from_thought) {
        throw new Error('Cannot specify branch information when is_revision is true');
      }
    } else if (data.revises_thought !== undefined) {
      throw new Error('Cannot specify revises_thought when is_revision is not true');
    }

    // Conditional validation for branching
    if (data.branch_id || data.branch_from_thought) {
      if (typeof data.branch_id !== 'string' || data.branch_id.trim() === '') {
        throw new Error('Invalid branch_id: must be a non-empty string when branching');
      }
      if (
        typeof data.branch_from_thought !== 'number' ||
        !Number.isInteger(data.branch_from_thought) ||
        data.branch_from_thought < 1
      ) {
        throw new Error('Invalid branch_from_thought: must be a positive integer when branching');
      }
      if (data.is_revision === true) {
        // Redundant check, but safe
        throw new Error('Cannot specify revision information when branching');
      }
    } else if (data.branch_id !== undefined || data.branch_from_thought !== undefined) {
      throw new Error('Must provide both branch_id and branch_from_thought when branching');
    }

    // Optional fields type checks
    if (data.needs_more_thoughts !== undefined && typeof data.needs_more_thoughts !== 'boolean') {
      throw new Error('Invalid needs_more_thoughts: must be a boolean if provided');
    }

    // Return validated and typed data
    return {
      thought: data.thought as string,
      thought_number: data.thought_number as number,
      total_thoughts: data.total_thoughts as number,
      next_thought_needed: data.next_thought_needed as boolean,
      is_revision: data.is_revision as boolean | undefined,
      revises_thought: data.revises_thought as number | undefined,
      branch_from_thought: data.branch_from_thought as number | undefined,
      branch_id: data.branch_id as string | undefined,
      needs_more_thoughts: data.needs_more_thoughts as boolean | undefined,
    };
  }

  /** Formats a thought for enhanced visualization in the console/logs. */
  private formatThought(thoughtData: ThoughtData): string {
    const {
      thought_number,
      total_thoughts,
      thought,
      is_revision,
      revises_thought,
      branch_from_thought,
      branch_id,
    } = thoughtData;

    let prefix = '';
    let context = '';
    let progressBar = '';
    let connectionPrefix = '';

    // Enhanced Visualization elements (conditionally applied)
    if (this.config.enhancedVisualization) {
      // Create a visual progress bar
      const progressPercentage = Math.min(
        100,
        Math.max(0, Math.round((thought_number / total_thoughts) * 100))
      );
      const progressFilled = Math.floor(progressPercentage / 10);
      const progressBarChars = 10;
      progressBar = `[${'='.repeat(progressFilled)}${' '.repeat(progressBarChars - progressFilled)}] ${progressPercentage}%`;

      // Add visual connector lines to show relationships
      if (is_revision) {
        connectionPrefix = chalk.yellow('  ↑↑ Revises Thought\n');
      } else if (branch_from_thought) {
        connectionPrefix = chalk.green('  ↳ Branch\n');
      } else if (thought_number > 1) {
        // Indicate continuation of the main thread
        connectionPrefix = chalk.gray('  ↓ Continue\n');
      }
    }

    // Determine prefix and context based on thought type
    if (is_revision) {
      prefix = chalk.yellow('🔄 Revision');
      context = ` (revising thought ${revises_thought})`;
    } else if (branch_from_thought) {
      prefix = chalk.green('🌿 Branch');
      context = ` (from thought ${branch_from_thought}, ID: ${branch_id})`;
    } else {
      prefix = chalk.blue('💭 Thought');
    }

    const header = `${prefix} ${thought_number}/${total_thoughts}${context} ${progressBar}`;
    // Calculate border width based on header or thought content, whichever is longer
    const contentWidth = thought.split('\n').reduce((max, line) => Math.max(max, line.length), 0);
    const headerWidth = header.replace(/\\u001b\[[0-9;]*m/g, '').length; // Strip ANSI codes for length calculation
    const innerWidth = Math.max(headerWidth, contentWidth);
    const border = '─'.repeat(innerWidth + 2); // +2 for padding spaces

    // Pad thought content lines
    const paddedThoughtLines = thought
      .split('\n')
      .map(line => `│ ${line.padEnd(innerWidth)} │`)
      .join('\n');

    return `
${connectionPrefix}┌${border}┐
│ ${header.padEnd(innerWidth + (header.length - headerWidth))} │
├${border}┤
${paddedThoughtLines}
└${border}┘`;
  }

  /** Provides example ThoughtData structures for error guidance. */
  private getExampleThought(errorMsg: string): ThoughtData | object {
    // Determine which example to provide based on the error
    if (errorMsg.includes('branch')) {
      return {
        thought: "I'll explore an alternative approach by considering a different algorithm.",
        thought_number: 3, // Example number
        total_thoughts: 7,
        next_thought_needed: true,
        branch_from_thought: 2,
        branch_id: 'alternative-algorithm',
      };
    } else if (errorMsg.includes('revis')) {
      return {
        thought: 'I now realize my earlier assessment was incorrect. Let me revise my reasoning.',
        thought_number: 4, // Example number
        total_thoughts: 6,
        next_thought_needed: true,
        is_revision: true,
        revises_thought: 2,
      };
    } else if (errorMsg.includes('length')) {
      return {
        thought:
          'This thought is too long... [break it here]\n...and continue in the next thought.',
        thought_number: 2,
        total_thoughts: 5,
        next_thought_needed: true,
      };
    }

    // Default example for basic structure
    return {
      thought:
        "Here I'm analyzing the problem step by step, breaking it down into manageable parts.",
      thought_number: 1,
      total_thoughts: 5,
      next_thought_needed: true,
    };
  }

  /** Tracks performance metrics for thought processing. */
  private trackPerformanceMetrics(thought: ThoughtData, processingTimeMs: number): void {
    const metric: PerformanceMetric = {
      thoughtNumber: thought.thought_number,
      processingTimeMs,
      thoughtLength: thought.thought.length,
      timestamp: new Date().toISOString(),
    };
    this.performanceMetrics.push(metric);

    // Keep only the last N metrics (e.g., 100) to avoid memory leak
    const MAX_METRICS = 100;
    if (this.performanceMetrics.length > MAX_METRICS) {
      this.performanceMetrics.shift(); // Remove the oldest metric
    }

    // Log if performance seems degraded (e.g., significantly slower than recent average)
    const recentMetrics = this.performanceMetrics.slice(-10); // Analyze last 10
    if (recentMetrics.length >= 5) {
      // Only analyze if we have enough data points
      const averageTime =
        recentMetrics.reduce((sum, m) => sum + m.processingTimeMs, 0) / recentMetrics.length;
      const warningThreshold = Math.max(averageTime * 2, 500); // e.g., 2x average or > 500ms

      if (processingTimeMs > warningThreshold) {
        this.logger.warn('Potential performance degradation detected', {
          thoughtNumber: thought.thought_number,
          processingTimeMs: `${processingTimeMs}ms`,
          recentAverageMs: `${averageTime.toFixed(2)}ms`,
          thresholdMs: `${warningThreshold.toFixed(2)}ms`,
        });
      }
    }
  }

  /** Tracks error occurrences to identify patterns. */
  private trackError(error: Error, _input: unknown): void {
    // Use a simplified key for grouping similar errors
    const errorKey = error.message.split(':')[0] || 'Unknown Error'; // Group by first part of message
    this.errorCounts[errorKey] = (this.errorCounts[errorKey] || 0) + 1;

    // Log a warning if a specific error type becomes frequent
    const ERROR_THRESHOLD = 5; // Log after 5 occurrences of the same error type
    const currentCount = this.errorCounts[errorKey];
    if (currentCount === ERROR_THRESHOLD) {
      // Log only the first time threshold is reached
      this.logger.warn('High frequency of specific error type detected', {
        errorType: errorKey,
        count: currentCount,
        errorMessage: error.message,
        // Avoid logging potentially large/sensitive input directly in the warning
        // inputSample: JSON.stringify(input).substring(0, 100) + '...'
      });
    }
  }

  /** Processes a single thought, handling validation, state updates, and formatting. */
  public async processThought(input: unknown): Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }> {
    const startTime = Date.now();
    let validatedInput: ThoughtData | null = null;

    try {
      // 1. Validation
      validatedInput = this.validateThoughtData(input);

      // 2. Timeout Check (early)
      if (Date.now() - startTime > this.config.timeoutMs) {
        throw new Error(`Thought processing timed out after ${this.config.timeoutMs}ms`);
      }

      this.logger.debug('Processing validated thought', {
        thought_number: validatedInput.thought_number,
        is_revision: validatedInput.is_revision,
        branch_from_thought: validatedInput.branch_from_thought,
        branch_id: validatedInput.branch_id,
      });

      // 3. Abort Check (Max Thoughts)
      if (validatedInput.thought_number > this.config.maxThoughts) {
        this.logger.warn(
          `Aborting thought chain - exceeded max thoughts (${this.config.maxThoughts})`,
          {
            thought_number: validatedInput.thought_number,
          }
        );

        // Generate statistics about the aborted thought process
        const mainThreadThoughts = this.thoughtHistory.filter(t => !t.branch_id && !t.is_revision);
        const branches = Object.entries(this.branches).map(([id, thoughts]) => ({
          id,
          count: thoughts.length,
          from: thoughts.length > 0 ? thoughts[0].branch_from_thought : undefined, // Safely access first thought
        }));
        const revisions = this.thoughtHistory.filter(t => t.is_revision);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: `Max thought_number exceeded (${this.config.maxThoughts})`,
                  summary: `Aborting chain of thought after ${this.config.maxThoughts} steps.`,
                  status: 'aborted',
                  thoughtStats: {
                    totalThoughtsProcessed: this.thoughtHistory.length,
                    mainThreadCount: mainThreadThoughts.length,
                    branchCount: Object.keys(this.branches).length,
                    branchDetails: branches,
                    revisionCount: revisions.length,
                  },
                },
                null,
                2
              ),
            },
          ],
          isError: true, // Indicate this is an error state
        };
      }

      // 4. Adjust total_thoughts if necessary
      if (validatedInput.thought_number > validatedInput.total_thoughts) {
        this.logger.debug('Adjusting total_thoughts to match current thought_number', {
          old_total: validatedInput.total_thoughts,
          new_total: validatedInput.thought_number,
        });
        validatedInput.total_thoughts = validatedInput.thought_number;
      }

      // 5. Update History and Branches
      this.thoughtHistory.push(validatedInput);

      if (validatedInput.branch_from_thought && validatedInput.branch_id) {
        if (!this.branches[validatedInput.branch_id]) {
          this.branches[validatedInput.branch_id] = [];
          this.logger.info('Created new branch', {
            branch_id: validatedInput.branch_id,
            from_thought: validatedInput.branch_from_thought,
          });
        }
        this.branches[validatedInput.branch_id].push(validatedInput);
      }

      // 6. Format and Log Thought (to console/stderr)
      const formattedThought = this.formatThought(validatedInput);
      console.error(formattedThought); // Log formatted thought to stderr

      // 7. Log Success and Performance
      const processingTime = Date.now() - startTime;
      this.trackPerformanceMetrics(validatedInput, processingTime);
      this.logger.info('Thought processed successfully', {
        thought_number: validatedInput.thought_number,
        next_thought_needed: validatedInput.next_thought_needed,
        branch_count: Object.keys(this.branches).length,
        history_length: this.thoughtHistory.length,
        processingTimeMs: processingTime,
      });

      // 8. Return Result
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: 'processed', // More explicit status
                thought_number: validatedInput.thought_number,
                total_thoughts: validatedInput.total_thoughts,
                next_thought_needed: validatedInput.next_thought_needed,
                branches: Object.keys(this.branches),
                thought_history_length: this.thoughtHistory.length,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('Error processing thought', {
        error: errorMsg,
        stack: error instanceof Error ? error.stack : undefined,
        processingTimeMs: processingTime,
        input: input, // Log the raw input on error for debugging
      });

      // Track the error
      if (error instanceof Error) {
        this.trackError(error, input);
      } else {
        this.trackError(new Error(errorMsg), input);
      }

      // Provide enhanced error guidance
      let guidance = 'Check the tool description and examples for correct usage.';
      if (errorMsg.includes('thought_number')) {
        guidance =
          'Ensure thought_number is a positive integer, incremented correctly from the previous thought.';
      } else if (errorMsg.includes('next_thought_needed')) {
        guidance =
          'Set next_thought_needed=true if more reasoning is required, or false if the current line of thought is complete.';
      } else if (errorMsg.includes('branch')) {
        guidance =
          'When branching, provide both branch_from_thought (number) and a unique branch_id (string). Cannot branch and revise simultaneously.';
      } else if (errorMsg.includes('revision') || errorMsg.includes('revises')) {
        guidance =
          'When revising, set is_revision=true and provide the revises_thought (number). Cannot revise and branch simultaneously.';
      } else if (errorMsg.includes('length')) {
        guidance = `The 'thought' content is too long. Break it down into smaller, sequential thoughts under ${this.config.maxThoughtLength} characters each.`;
      } else if (errorMsg.includes('timeout')) {
        guidance =
          'The server took too long to process the thought. This might indicate an internal issue or overly complex request.';
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: errorMsg,
                status: 'failed',
                guidance,
                // Provide a relevant example based on the error
                example: this.getExampleThought(errorMsg),
              },
              null,
              2
            ),
          },
        ],
        isError: true, // Clearly mark as an error response
      };
    }
  }
}

// --- Server Setup and Execution ---

export async function runServer(
  options: {
    help?: boolean;
    // Allow passing args/env for testing or specific invocation scenarios
    args?: string[];
    env?: NodeJS.ProcessEnv;
  } = {}
) {
  // Default values
  const effectiveArgs = options.args ?? process.argv.slice(2);
  const effectiveEnv = options.env ?? process.env;

  // Early help check before parsing config
  if (options.help || effectiveArgs.includes('--help') || effectiveArgs.includes('-h')) {
    console.error(`
Code-Reasoning MCP Server 

A specialized server using sequential thinking methodology for complex programming tasks.

USAGE:
  code-reasoning [OPTIONS]

OPTIONS:
  --debug                       Enable debug logging (sets log level to DEBUG).
  --help, -h                    Show this help message.
  --max-thought-length <n>      Maximum character length of a single thought (default: ${defaultConfig.maxThoughtLength}).
  --timeout-ms <n>              Timeout for processing a single thought in milliseconds (default: ${defaultConfig.timeoutMs}).
  --max-thoughts <n>            Maximum number of thoughts allowed before auto-abort (default: ${defaultConfig.maxThoughts}).
  --log-level <level>           Set logging level: ERROR, WARN, INFO, DEBUG (default: ${LogLevel[defaultConfig.logLevel]}).
  --no-enhanced-visualization   Disable enhanced console visualization (progress bar, connectors).
  --no-color                    Disable colored console output.

ENVIRONMENT VARIABLES:
  (Command-line arguments override environment variables)
  MAX_THOUGHT_LENGTH=<n>       Maximum character length of a single thought.
  TIMEOUT_MS=<n>               Timeout for processing a single thought in milliseconds.
  MAX_THOUGHTS=<n>             Maximum number of thoughts allowed before auto-abort.
  LOG_LEVEL=<level>            Logging level (ERROR, WARN, INFO, DEBUG).
  ENHANCED_VISUALIZATION=<bool> Enable/disable enhanced console visualization ('true' or 'false').
  COLOR_OUTPUT=<bool>          Enable/disable colored console output ('true' or 'false').

NOTE:
  This server registers the "code-reasoning" tool. Ensure your MCP client configuration
  references the tool name "code-reasoning".
`);
    process.exit(0);
  }

  // Parse configuration from args and env
  const config = parseConfig(effectiveArgs, effectiveEnv);

  // Initialize logger with configuration
  // Note: Logger constructor now handles setting chalk level based on config.colorOutput
  const logger = new Logger(config.logLevel, true, config.colorOutput);

  logger.info('Starting Code-Reasoning MCP Server', {
    version: '0.3.0', // Update version string if needed
    logLevel: LogLevel[config.logLevel],
    config: config, // Log the effective configuration
  });

  // Initialize MCP server framework
  const server = new Server(
    {
      name: 'code-reasoning-server',
      version: '0.3.0', // Match version
    },
    {
      capabilities: {
        tools: {}, // Indicate tool capability
      },
    }
  );

  // Initialize our core reasoning logic handler with logger and config
  const reasoningServer = new CodeReasoningServer(logger, config);

  // --- Request Handlers ---

  server.setRequestHandler(ListToolsRequestSchema, async _request => {
    logger.debug('Handling tools/list request');
    return {
      tools: [CODE_REASONING_TOOL], // Return the enhanced tool definition
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async request => {
    // Cast request to a type that might have an id property
    type RequestWithPossibleId = typeof request & { id?: string | number };
    const typedRequest = request as RequestWithPossibleId;

    logger.debug('Handling tools/call request', {
      tool: request.params.name,
      // Avoid logging full arguments here, sanitizeMessage in transport handles it
      requestId: typedRequest.id ?? 'N/A',
    });

    if (request.params.name === CODE_REASONING_TOOL.name) {
      // Delegate processing to the reasoning server instance
      // processThought now handles timeouts, validation, etc.
      return reasoningServer.processThought(request.params.arguments);
    }

    // Handle unknown tool requests
    const errorMsg = `Unknown tool requested: ${request.params.name}`;
    logger.error(errorMsg, { requestedTool: request.params.name });

    // Get request ID safely with proper typing
    const requestId: string | number | null =
      'id' in request ? (request as { id: string | number }).id : null;

    // Return a structured JSON-RPC error response
    const errorResponse: JSONRPCErrorResponse = {
      jsonrpc: '2.0',
      id: requestId, // Echo request ID if available
      error: {
        code: -32601, // Method not found
        message: errorMsg,
        data: { requestedTool: request.params.name },
      },
    };
    // Although setRequestHandler expects a specific return type,
    // the underlying transport should handle sending JSONRPCErrorResponse correctly.
    // We construct the expected structure manually here for clarity.
    return {
      content: [{ type: 'text', text: JSON.stringify(errorResponse.error) }],
      isError: true,
    };
  });

  // --- Transport and Connection ---

  // Connect using the logging-enhanced stdio transport
  const transport = new LoggingStdioServerTransport(logger);

  logger.info('Connecting server using LoggingStdioServerTransport...');
  try {
    await server.connect(transport);
    logger.info('Code Reasoning MCP Server running and connected via stdio.');
  } catch (error) {
    logger.error('Failed to connect server transport', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1); // Exit if connection fails
  }

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down server gracefully...`);
    await server.close();
    await transport.close();
    logger.info('Server shutdown complete.');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('uncaughtException', error => {
    logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
    // Consider if a shutdown is needed here, but be cautious of shutdown loops
    // process.exit(1); // Force exit on unhandled critical errors
  });
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', { promise, reason });
    // Consider if a shutdown is needed
  });
}

// Note: The actual server execution is typically triggered by the main entry point
// (e.g., index.ts or a bin script in package.json) which imports and calls runServer().
// Example: if (require.main === module) { runServer(); } // Common pattern if this file were the direct entry point
