#!/usr/bin/env node

/**
 * @fileoverview Code Reasoning MCP Server Implementation.
 *
 * This server provides a tool for reflective problem-solving in software development,
 * allowing decomposition of tasks into sequential, revisable, and branchable thoughts.
 * It adheres to the Model Context Protocol (MCP) and is designed to integrate seamlessly
 * with Claude Desktop or similar MCP-compliant clients.
 *
 * ## Key Features
 * - Processes "thoughts" in structured JSON, with optional branching and revision semantics.
 * - Logs a simplified, colorized flow of thought evolution to stderr for debugging.
 * - Built-in validation using Zod.
 * - Single built-in configuration object.
 * - Removed complex performance/error frequency tracking for simplicity.
 * - Simplified thought formatting output.
 *
 * ## Usage in Claude Desktop
 * - In your Claude Desktop settings, add a "tool" definition referencing this server.
 * - Ensure the tool name is "code-reasoning".
 * - Upon connecting, Claude can call the tool with an argument schema matching the
 *   `ThoughtDataSchema` below.
 *
 * ## MCP Protocol Communication
 * - IMPORTANT: Local MCP servers must never log to stdout (standard output).
 * - All logging must be directed to stderr using console.error() instead of console.log() or console.info().
 * - The stdout channel is reserved exclusively for JSON-RPC protocol messages.
 * - Using console.log() or console.info() will cause client-side JSON parsing errors as these
 *   functions write to stdout, interfering with the protocol communication.
 *
 * ## Example Thought Data
 * ```json
 * {
 *   "thought": "Start investigating the root cause of bug #1234",
 *   "thought_number": 1,
 *   "total_thoughts": 5,
 *   "next_thought_needed": true
 * }
 * ```
 *
 * @version 0.5.0
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { z, ZodError } from 'zod';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// LogLevel enum replacement (since we're removing logger.ts)
enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

/**
 * Configuration options for the Code Reasoning Server.
 */
interface CodeReasoningConfig {
  maxThoughtLength: number; // Max characters in any single thought
  timeoutMs: number; // Max time for processing a single thought (Note: SDK might have its own timeout)
  maxThoughts: number; // Max number of thoughts before forcibly aborting
  logLevel: LogLevel; // Logging verbosity (kept for compatibility)
  debug: boolean; // Whether to show debug level logs
}

/**
 * **Single** configuration object. Adjust as needed.
 */
const SERVER_CONFIG: CodeReasoningConfig = {
  maxThoughtLength: 20000, // https://github.com/modelcontextprotocol/servers/issues/751
  timeoutMs: 30_000, // Primarily for logging long operations, actual request timeout might be handled by MCP client/SDK
  maxThoughts: 20,
  logLevel: LogLevel.INFO, // Kept for compatibility
  debug: false, // Will be set to true if --debug flag is passed
};

// ----------------------------------------------------------------------------
// Thought Data Schema (Unchanged)
// ----------------------------------------------------------------------------

export interface ThoughtData {
  thought: string;
  thought_number: number;
  total_thoughts: number;
  next_thought_needed: boolean;
  is_revision?: boolean;
  revises_thought?: number;
  branch_from_thought?: number;
  branch_id?: string;
  needs_more_thoughts?: boolean; // Optional flag for client hints
}

// Zod schema remains the same for robust validation
const ThoughtDataSchema = z
  .object({
    thought: z.string().trim().min(1, 'Thought cannot be empty.'),
    thought_number: z.number().int().positive('Thought number must be a positive integer.'),
    total_thoughts: z.number().int().positive('Total thoughts must be a positive integer.'),
    next_thought_needed: z.boolean(),
    is_revision: z.boolean().optional(),
    revises_thought: z.number().int().positive().optional(),
    branch_from_thought: z.number().int().positive().optional(),
    branch_id: z.string().trim().min(1).optional(),
    needs_more_thoughts: z.boolean().optional(),
  })
  .refine(
    data => {
      if (data.is_revision === true) {
        return (
          typeof data.revises_thought === 'number' &&
          data.branch_id === undefined &&
          data.branch_from_thought === undefined
        );
      }
      return true;
    },
    {
      message:
        'If is_revision is true, revises_thought (number) is required, and branch_id/branch_from_thought must not be set.',
      path: ['is_revision', 'revises_thought', 'branch_id', 'branch_from_thought'],
    }
  )
  .refine(
    data => {
      if (data.is_revision !== true && data.revises_thought !== undefined) {
        return false;
      }
      return true;
    },
    {
      message: 'Cannot set revises_thought if is_revision is not true.',
      path: ['revises_thought'],
    }
  )
  .refine(
    data => {
      if (data.branch_id !== undefined || data.branch_from_thought !== undefined) {
        return (
          typeof data.branch_id === 'string' &&
          typeof data.branch_from_thought === 'number' &&
          data.is_revision !== true
        );
      }
      return true;
    },
    {
      message:
        'If branching, both branch_id (string) and branch_from_thought (number) are required, and is_revision must not be true.',
      path: ['branch_id', 'branch_from_thought', 'is_revision'],
    }
  );

type ValidatedThoughtData = z.infer<typeof ThoughtDataSchema>;

// ----------------------------------------------------------------------------
// JSON Schema
// ----------------------------------------------------------------------------

// Function to generate JSON schema from Zod schema
function createJsonSchemaFromThoughtDataSchema(): {
  type: 'object';
  required: string[];
  properties: Record<string, unknown>;
  additionalProperties: boolean;
  $schema: string;
  title: string;
} {
  return {
    type: 'object',
    required: ['thought', 'thought_number', 'total_thoughts', 'next_thought_needed'],
    properties: {
      thought: { type: 'string', minLength: 1 },
      thought_number: { type: 'integer', minimum: 1 },
      total_thoughts: { type: 'integer', minimum: 1 },
      next_thought_needed: { type: 'boolean' },
      is_revision: { type: 'boolean' },
      revises_thought: { type: 'integer', minimum: 1 },
      branch_from_thought: { type: 'integer', minimum: 1 },
      branch_id: { type: 'string', minLength: 1 },
      needs_more_thoughts: { type: 'boolean' },
    },
    additionalProperties: false, // Keep strict schema adherence
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'ThoughtDataInput',
  };
}

// ----------------------------------------------------------------------------
// Code Reasoning Tool Definition
// ----------------------------------------------------------------------------

const CODE_REASONING_TOOL: Tool = {
  name: 'code-reasoning',
  description: `🧠 A reflective problem-solving tool with sequential thinking.

• Break down tasks into numbered thoughts that can BRANCH (🌿) or REVISE (🔄) until a conclusion is reached.
• Always set 'next_thought_needed' = false when no further reasoning is needed.

✅ Recommended checklist every 3 thoughts:
1. Need to BRANCH?   → set 'branch_from_thought' + 'branch_id'.
2. Need to REVISE?   → set 'is_revision' + 'revises_thought'.
3. Scope changed? → bump 'total_thoughts'.

✍️ End each thought with: "What am I missing?"`,
  inputSchema: createJsonSchemaFromThoughtDataSchema(),
};

// ----------------------------------------------------------------------------
// The Core Server Logic
// ----------------------------------------------------------------------------

class CodeReasoningServer {
  // Core state remains
  private thoughtHistory: ValidatedThoughtData[] = [];
  private branches: Record<string, ValidatedThoughtData[]> = {}; // Stores branched thoughts by branch_id

  private config: CodeReasoningConfig;

  constructor(config: CodeReasoningConfig) {
    this.config = config;
    console.error('Code Reasoning Server logic handler initialized', { config: this.config });
  }

  /**
   * Format a single thought for simplified output to stderr.
   */
  private formatThought(thoughtData: ValidatedThoughtData): string {
    const {
      thought_number,
      total_thoughts,
      thought,
      is_revision,
      revises_thought,
      branch_id,
      branch_from_thought,
    } = thoughtData;

    let prefix = '';
    let context = '';

    if (is_revision) {
      prefix = '🔄 Revision';
      context = `(revising thought ${revises_thought})`;
    } else if (branch_from_thought) {
      prefix = '🌿 Branch';
      context = `(from thought ${branch_from_thought}, ID: ${branch_id})`;
    } else {
      prefix = '💭 Thought';
    }

    const headerText = `${prefix} ${thought_number}/${total_thoughts} ${context}`;
    const separator = '---';

    // Indent thought content slightly for readability
    const formattedThought = thought
      .split('\n')
      .map(line => `  ${line}`)
      .join('\n');

    return `\n${headerText}\n${separator}\n${formattedThought}\n${separator}`;
  }

  /**
   * Pick an example thought object to give user guidance on input format if errors occur.
   */
  private getExampleThought(errorMsg: string): Partial<ThoughtData> {
    if (errorMsg.includes('branch')) {
      return {
        thought: 'Exploring alternative: Consider algorithm X.',
        thought_number: 3,
        total_thoughts: 7,
        next_thought_needed: true,
        branch_from_thought: 2,
        branch_id: 'alternative-algo-x',
      };
    } else if (errorMsg.includes('revis')) {
      return {
        thought: 'Revisiting earlier point: Assumption Y was flawed.',
        thought_number: 4,
        total_thoughts: 6,
        next_thought_needed: true,
        is_revision: true,
        revises_thought: 2,
      };
    } else if (errorMsg.includes('length') || errorMsg.includes('Thought cannot be empty')) {
      return {
        thought: 'Breaking down the thought into smaller parts...',
        thought_number: 2,
        total_thoughts: 5,
        next_thought_needed: true,
      };
    }
    // Default fallback
    return {
      thought: 'Initial exploration of the problem.',
      thought_number: 1,
      total_thoughts: 5,
      next_thought_needed: true,
    };
  }

  /**
   * Builds the success response for the MCP client.
   */
  private _buildSuccessResponse(thoughtData: ValidatedThoughtData): CallToolResult {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              status: 'processed',
              thought_number: thoughtData.thought_number,
              total_thoughts: thoughtData.total_thoughts,
              next_thought_needed: thoughtData.next_thought_needed,
              branches: Object.keys(this.branches),
              thought_history_length: this.thoughtHistory.length,
            },
            null,
            2 // Pretty print JSON response
          ),
        },
      ],
      isError: false,
    };
  }

  /**
   * Builds the error response for the MCP client.
   */
  private _buildErrorResponse(error: Error): CallToolResult {
    let errMsg = error.message;
    let guidance = 'Check the tool description and provided schema for correct usage.';
    const example = this.getExampleThought(errMsg); // Use helper to provide relevant example

    if (error instanceof ZodError) {
      errMsg = `Validation Error: ${error.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join(', ')}`;
      // Provide specific guidance based on Zod error path
      const firstPath = error.errors[0]?.path.join('.');
      if (firstPath?.includes('thought') && !firstPath.includes('number')) {
        guidance = `The 'thought' field is empty or invalid. Must be a non-empty string below ${this.config.maxThoughtLength} characters.`;
      } else if (firstPath?.includes('thought_number')) {
        guidance = 'Ensure thought_number is a positive integer and increments correctly.';
      } else if (firstPath?.includes('branch')) {
        guidance =
          'When branching, provide both "branch_from_thought" (number) and "branch_id" (string), and do not combine with revision (is_revision=true).';
      } else if (firstPath?.includes('revision')) {
        guidance =
          'When revising, set is_revision=true and provide revises_thought (positive number). Do not combine with branching.';
      }
    } else if (errMsg.includes('length')) {
      guidance = `The thought is too long. Keep it under ${this.config.maxThoughtLength} characters.`;
    } else if (errMsg.includes('Max thought_number exceeded')) {
      guidance = `The maximum thought limit (${this.config.maxThoughts}) was reached.`;
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: errMsg,
              status: 'failed',
              guidance,
              example, // Provide example for user correction
            },
            null,
            2 // Pretty print JSON response
          ),
        },
      ],
      isError: true,
    };
  }

  /**
   * Main method to process a "thought" from the MCP client.
   */
  public async processThought(input: unknown): Promise<CallToolResult> {
    const start = Date.now();
    let validated: ValidatedThoughtData | null = null;

    try {
      // 1. Validate input using Zod schema
      if (this.config.debug) console.error('Validating thought data', { input });
      validated = ThoughtDataSchema.parse(input);
      if (this.config.debug)
        console.error('Validation successful', { thought_number: validated.thought_number });

      // 2. Check thought length against config
      if (validated.thought.length > this.config.maxThoughtLength) {
        throw new Error(
          `Thought exceeds maximum length of ${this.config.maxThoughtLength} characters. Break it into multiple steps.`
        );
      }

      // 3. Check max thoughts limit
      if (validated.thought_number > this.config.maxThoughts) {
        console.error('Aborting chain - exceeded max thoughts', {
          max: this.config.maxThoughts,
          current: validated.thought_number,
        });
        // Return specific error response for max thoughts exceeded
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: `Max thought_number exceeded (${this.config.maxThoughts})`,
                  status: 'aborted',
                  totalProcessed: this.thoughtHistory.length,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      // 3.5. Check if branch_from_thought references an existing thought
      if (
        validated.branch_from_thought !== undefined &&
        validated.branch_from_thought > this.thoughtHistory.length
      ) {
        console.error('Invalid branch reference', {
          branch_from_thought: validated.branch_from_thought,
          thoughtHistory_length: this.thoughtHistory.length,
        });
        throw new Error(
          `Invalid branch_from_thought (${validated.branch_from_thought}): cannot branch from a non-existent thought. Current thought history has ${this.thoughtHistory.length} thoughts.`
        );
      }

      // 4. Adjust total_thoughts if necessary (ensure progress is possible)
      if (validated.thought_number > validated.total_thoughts) {
        if (this.config.debug)
          console.error('Adjusting total_thoughts to match current thought_number', {
            old_total: validated.total_thoughts,
            new_total: validated.thought_number,
          });
        validated.total_thoughts = validated.thought_number; // Ensures progress calculation isn't > 100%
      }

      // 5. Update histories (main history and branches if applicable)
      this.thoughtHistory.push(validated);
      if (validated.branch_from_thought && validated.branch_id) {
        // Initialize branch array if it doesn't exist
        if (!this.branches[validated.branch_id]) {
          this.branches[validated.branch_id] = [];
          console.error('Created a new branch', {
            branch_id: validated.branch_id,
            from_thought: validated.branch_from_thought,
          });
        }
        this.branches[validated.branch_id].push(validated);
      }

      // 6. Format & log the thought to stderr (using simplified format)
      const formatted = this.formatThought(validated);
      console.error(formatted); // Log formatted thought for debugging/visibility

      // 7. Log success and processing time
      const elapsed = Date.now() - start;
      console.error('Thought processed successfully', {
        thought_number: validated.thought_number,
        is_revision: validated.is_revision ?? false,
        branch_id: validated.branch_id ?? null,
        next_thought_needed: validated.next_thought_needed,
        processingTimeMs: elapsed,
      });

      // 8. Respond successfully to the MCP client
      return this._buildSuccessResponse(validated);
    } catch (err: unknown) {
      // Handle errors (validation, length check, etc.)
      const e = err instanceof Error ? err : new Error(String(err));
      const elapsed = Date.now() - start;

      // Log the error details
      console.error('Error processing thought', {
        error: e.message,
        processingTimeMs: elapsed,
        // Include partial validated data if validation succeeded before error
        thought_number: validated?.thought_number,
      });

      // 9. Respond with an error to the MCP client
      return this._buildErrorResponse(e);
    }
  }
}

// ----------------------------------------------------------------------------
// Server Startup
// ----------------------------------------------------------------------------

export async function runServer(debugFlag: boolean = false): Promise<void> {
  // Set debug flag based on argument (from command line)
  SERVER_CONFIG.debug = debugFlag;

  const serverVersion = '0.5.0'; // Update version to match package.json
  console.error(`Starting Code-Reasoning MCP Server (streamlined v${serverVersion})...`, {
    logLevel: LogLevel[SERVER_CONFIG.logLevel],
    debug: SERVER_CONFIG.debug,
    pid: process.pid,
  });

  // Create MCP server instance
  const mcpServer = new Server(
    { name: 'code-reasoning-server', version: serverVersion },
    {
      capabilities: { tools: {} }, // Advertise tool capability
    }
  );

  // Instantiate the streamlined core logic handler
  const reasoningLogic = new CodeReasoningServer(SERVER_CONFIG);

  // Register request handlers
  mcpServer.setRequestHandler(ListToolsRequestSchema, async _req => {
    if (SERVER_CONFIG.debug) console.error('Received ListTools request');
    return { tools: [CODE_REASONING_TOOL] }; // Return the single defined tool
  });

  mcpServer.setRequestHandler(CallToolRequestSchema, async request => {
    if (SERVER_CONFIG.debug)
      console.error('Received CallTool request', { tool_name: request.params.name });
    if (request.params.name === CODE_REASONING_TOOL.name) {
      return reasoningLogic.processThought(request.params.arguments);
    } else {
      // Handle requests for unknown tools
      const errorMsg = `Unknown tool requested: ${request.params.name}`;
      console.error(errorMsg);
      return {
        content: [{ type: 'text', text: JSON.stringify({ code: -32601, message: errorMsg }) }],
        isError: true,
      };
    }
  });

  // Connect transport (using standard transport)
  const transport = new StdioServerTransport();
  try {
    await mcpServer.connect(transport);
    console.error('Code Reasoning MCP Server ready and connected via stdio transport.');
  } catch (error) {
    console.error('Failed to connect stdio transport', { error: String(error) });
    process.exit(1); // Exit if connection fails
  }

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    console.error(`Received ${signal}, initiating graceful shutdown...`);
    try {
      await mcpServer.close(); // Close MCP connection
      await transport.close(); // Close transport
      console.error('Server shutdown complete.');
      process.exit(0);
    } catch (err) {
      console.error('Error during shutdown', { error: String(err) });
      process.exit(1); // Force exit on shutdown error
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT')); // Ctrl+C
  process.on('SIGTERM', () => shutdown('SIGTERM')); // Termination signal

  // Basic global error handlers
  process.on('uncaughtException', (error, origin) => {
    console.error('FATAL: Uncaught exception', {
      error: error.message,
      origin,
      stack: error.stack,
    });
    // Attempt graceful shutdown, then force exit
    shutdown('uncaughtException').finally(() => process.exit(1));
  });

  process.on('unhandledRejection', (reason, _promise) => {
    console.error('FATAL: Unhandled promise rejection', { reason: String(reason) });
    // Attempt graceful shutdown, then force exit
    shutdown('unhandledRejection').finally(() => process.exit(1));
  });
}

// Auto-run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runServer().catch(err => {
    // Use console.error here as logger might not be initialized
    console.error('Server failed to start:', err);
    process.exit(1);
  });
}
