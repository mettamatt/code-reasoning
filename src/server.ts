#!/usr/bin/env node

/**
 * @fileoverview Code Reasoning MCP Server Implementation.
 *
 * This server provides a tool for reflective problem-solving in software development,
 * allowing decomposition of tasks into sequential, revisable, and branchable thoughts.
 * It adheres to the Model Context Protocol (MCP) using SDK version 1.18.1 and is designed
 * to integrate seamlessly with Claude Desktop or similar MCP-compliant clients.
 *
 * ## Key Features
 * - Processes "thoughts" in structured JSON with sequential numbering
 * - Supports advanced reasoning patterns through branching and revision semantics
 *   - Branching: Explore alternative approaches from any existing thought
 *   - Revision: Correct or update earlier thoughts when new insights emerge
 * - Implements MCP capabilities for tools, resources, and prompts
 * - Relies on the standard StdioServerTransport provided by the MCP SDK
 * - Provides detailed validation and error handling with helpful guidance
 * - Logs thought evolution to stderr for debugging and visibility
 *
 * ## Usage in Claude Desktop
 * - In your Claude Desktop settings, add a "tool" definition referencing this server
 * - Ensure the tool name is "code-reasoning"
 * - Configure Claude to use this tool for complex reasoning and problem-solving tasks
 * - Upon connecting, Claude can call the tool with arguments matching the
 *   `ThoughtData` interface defined in this file
 *
 * ## MCP Protocol Communication
 * - IMPORTANT: Local MCP servers must never log to stdout (standard output)
 * - All logging must be directed to stderr using console.error() instead of console.log()
 * - The stdout channel is reserved exclusively for JSON-RPC protocol messages
 * - Using console.log() or console.info() will cause client-side parsing errors
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
 * @version 0.7.0
 * @mcp-sdk-version 1.18.1
 */

import process from 'node:process';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  type CallToolResult,
  CompleteRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  type LoggingLevel,
} from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z, ZodError } from 'zod';
import { PromptManager } from './prompts/manager.js';
import { CONFIG_DIR } from './utils/config.js';

/* -------------------------------------------------------------------------- */
/*                               CONFIGURATION                                */
/* -------------------------------------------------------------------------- */

// Compile-time enum -> const enum would be erased, but we keep values for logs.
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

const MAX_THOUGHT_LENGTH = 20000;
const MAX_THOUGHTS = 20;

interface CodeReasoningConfig {
  debug: boolean;
  promptsEnabled: boolean;
}

const DEFAULT_CONFIG: Readonly<CodeReasoningConfig> = Object.freeze({
  debug: false,
  promptsEnabled: true,
});

const createConfig = (overrides: Partial<CodeReasoningConfig> = {}): CodeReasoningConfig => ({
  ...DEFAULT_CONFIG,
  ...overrides,
});

/* -------------------------------------------------------------------------- */
/*                               DATA SCHEMAS                                 */
/* -------------------------------------------------------------------------- */

export interface ThoughtData {
  thought: string;
  thought_number: number;
  total_thoughts: number;
  next_thought_needed: boolean;
  is_revision?: boolean;
  revises_thought?: number;
  branch_from_thought?: number;
  branch_id?: string;
  needs_more_thoughts?: boolean;
}

const createStrictThoughtShape = () => ({
  thought: z
    .string()
    .trim()
    .min(1, 'Thought cannot be empty.')
    .max(MAX_THOUGHT_LENGTH, `Thought exceeds ${MAX_THOUGHT_LENGTH} chars.`),
  thought_number: z.number().int().positive(),
  total_thoughts: z.number().int().positive(),
  next_thought_needed: z.boolean(),
  is_revision: z.boolean().optional(),
  revises_thought: z.number().int().positive().optional(),
  branch_from_thought: z.number().int().positive().optional(),
  branch_id: z.string().trim().min(1).optional(),
  needs_more_thoughts: z.boolean().optional(),
});

const ThoughtDataInputShape = createStrictThoughtShape();

export type ValidatedThoughtData = ThoughtData;
type ParsedThoughtData = ThoughtData;

/* -------------------------------------------------------------------------- */
/*                                  TOOL DEF                                  */
/* -------------------------------------------------------------------------- */

const TOOL_NAME = 'code-reasoning' as const;

const createCodeReasoningToolDefinition = (serverVersion: string) => ({
  title: 'Code Reasoning',
  description: `🧠 A detailed tool for dynamic and reflective problem-solving through sequential thinking.

This tool helps you analyze problems through a flexible thinking process that can adapt and evolve.
Each thought can build on, question, or revise previous insights as understanding deepens.

📋 KEY PARAMETERS:
- thought: Your current reasoning step (required)
- thought_number: Current number in sequence (required)
- total_thoughts: Estimated final count (required, can adjust as needed)
- next_thought_needed: Set to FALSE ONLY when completely done (required)
- branch_from_thought + branch_id: When exploring alternative approaches (🌿)
- is_revision + revises_thought: When correcting earlier thinking (🔄)

✅ CRITICAL CHECKLIST (review every 3 thoughts):
1. Need to explore alternatives? → Use BRANCH (🌿) with branch_from_thought + branch_id
2. Need to correct earlier thinking? → Use REVISION (🔄) with is_revision + revises_thought
3. Scope changed? → Adjust total_thoughts up or down as needed
4. Only set next_thought_needed = false when you have a complete, verified solution

💡 BEST PRACTICES:
- Start with an initial estimate of total_thoughts, but adjust as you go
- Don't hesitate to revise earlier conclusions when new insights emerge
- Use branching to explore multiple approaches to the same problem
- Express uncertainty when present
- Ignore information that is irrelevant to the current step
- End with a clear, validated conclusion before setting next_thought_needed = false

✍️ End each thought by asking: "What am I missing or need to reconsider?"`,
  annotations: {
    readOnlyHint: true,
    openWorldHint: false,
  },
  _meta: {
    schema_version: '1.0.0',
    server_version: serverVersion,
    categories: ['reasoning', 'analysis'],
    recommended_prompt: 'code-reasoning/default',
  },
});

/* -------------------------------------------------------------------------- */
/*                              SERVER IMPLEMENTATION                         */
/* -------------------------------------------------------------------------- */

type ThoughtTracker = {
  add: (thought: ValidatedThoughtData) => void;
  ensureBranchIsValid: (branchFromThought?: number) => void;
  branches: () => string[];
  count: () => number;
};

interface ServerLogger {
  debug: (message: string, details?: unknown) => void;
  info: (message: string, details?: unknown) => void;
  notice: (message: string, details?: unknown) => void;
  warn: (message: string, details?: unknown) => void;
  error: (message: string, details?: unknown) => void;
  enableRemoteLogging: () => void;
}

const createServerLogger = (srv: McpServer, debug: boolean): ServerLogger => {
  let remoteLoggingEnabled = false;

  const emit = (level: LoggingLevel, message: string, details?: unknown) => {
    const data = details === undefined ? { message } : { message, details };

    if (debug || level !== 'debug') {
      const prefix = `[${level}]`;
      if (message.startsWith('\n')) {
        console.error(message);
      } else if (details !== undefined) {
        console.error(`${prefix} ${message}`, details);
      } else {
        console.error(`${prefix} ${message}`);
      }
    }

    if (remoteLoggingEnabled) {
      void srv.sendLoggingMessage({ level, logger: 'code-reasoning', data }).catch(err => {
        if (debug) {
          console.error('[error] Failed to send logging notification', err);
        }
      });
    }
  };

  return {
    debug: (message, details) => emit('debug', message, details),
    info: (message, details) => emit('info', message, details),
    notice: (message, details) => emit('notice', message, details),
    warn: (message, details) => emit('warning', message, details),
    error: (message, details) => emit('error', message, details),
    enableRemoteLogging: () => {
      remoteLoggingEnabled = true;
    },
  };
};

const createThoughtTracker = (): ThoughtTracker => {
  const thoughtHistory: ValidatedThoughtData[] = [];
  const branches = new Map<string, ValidatedThoughtData[]>();

  return {
    add: thought => {
      thoughtHistory.push(thought);
      if (thought.branch_id) {
        const branchThoughts = branches.get(thought.branch_id) ?? [];
        branchThoughts.push(thought);
        branches.set(thought.branch_id, branchThoughts);
      }
    },
    ensureBranchIsValid: branchFromThought => {
      if (branchFromThought && branchFromThought > thoughtHistory.length) {
        throw new Error(`Invalid branch_from_thought ${branchFromThought}.`);
      }
    },
    branches: () => Array.from(branches.keys()),
    count: () => thoughtHistory.length,
  };
};

const formatThought = (t: ValidatedThoughtData): string => {
  const {
    thought_number,
    total_thoughts,
    thought,
    is_revision,
    revises_thought,
    branch_id,
    branch_from_thought,
  } = t;

  const header = is_revision
    ? `🔄 Revision ${thought_number}/${total_thoughts} (of ${revises_thought})`
    : branch_id
      ? `🌿 Branch ${thought_number}/${total_thoughts} (from ${branch_from_thought}, id:${branch_id})`
      : `💭 Thought ${thought_number}/${total_thoughts}`;

  const body = thought
    .split('\n')
    .map(l => `  ${l}`)
    .join('\n');

  return `\n${header}\n---\n${body}\n---`;
};

const getExampleThought = (errorMsg: string): Partial<ThoughtData> => {
  if (errorMsg.includes('branch')) {
    return {
      thought: 'Exploring alternative: Consider algorithm X.',
      thought_number: 3,
      total_thoughts: 7,
      next_thought_needed: true,
      branch_from_thought: 2,
      branch_id: 'alternative-algo-x',
    };
  }
  if (errorMsg.includes('revis')) {
    return {
      thought: 'Revisiting earlier point: Assumption Y was flawed.',
      thought_number: 4,
      total_thoughts: 6,
      next_thought_needed: true,
      is_revision: true,
      revises_thought: 2,
    };
  }
  if (errorMsg.includes('length') || errorMsg.includes('Thought cannot be empty')) {
    return {
      thought: 'Breaking down the thought into smaller parts...',
      thought_number: 2,
      total_thoughts: 5,
      next_thought_needed: true,
    };
  }
  return {
    thought: 'Initial exploration of the problem.',
    thought_number: 1,
    total_thoughts: 5,
    next_thought_needed: true,
  };
};

const buildSuccess = (t: ValidatedThoughtData, tracker: ThoughtTracker): CallToolResult => {
  const payload = {
    status: 'processed',
    thought_number: t.thought_number,
    total_thoughts: t.total_thoughts,
    next_thought_needed: t.next_thought_needed,
    branches: tracker.branches(),
    thought_history_length: tracker.count(),
  } as const;

  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }], isError: false };
};

const buildError = (error: Error, debug: boolean, logger: ServerLogger): CallToolResult => {
  let errorMessage = error.message;
  let guidance = 'Check the tool description and schema for correct usage.';
  const example = getExampleThought(errorMessage);

  if (error instanceof ZodError) {
    if (debug) {
      logger.debug('Zod validation errors', error.errors);
    }
    errorMessage = `Validation Error: ${error.errors
      .map(e => `${e.path.join('.')}: ${e.message}`)
      .join(', ')}`;

    const firstPath = error.errors[0]?.path.join('.');
    if (firstPath?.includes('thought') && !firstPath.includes('number')) {
      guidance = `The 'thought' field is empty or invalid. Must be a non-empty string below ${MAX_THOUGHT_LENGTH} characters.`;
    } else if (firstPath?.includes('thought_number')) {
      guidance = 'Ensure thought_number is a positive integer and increments correctly.';
    } else if (firstPath?.includes('branch')) {
      guidance =
        'When branching, provide both "branch_from_thought" (number) and "branch_id" (string), and do not combine with revision.';
    } else if (firstPath?.includes('revision')) {
      guidance =
        'When revising, set is_revision=true and provide revises_thought (positive number). Do not combine with branching.';
    }
  } else if (errorMessage.includes('length')) {
    guidance = `The thought is too long. Keep it under ${MAX_THOUGHT_LENGTH} characters.`;
  } else if (errorMessage.includes('Max thought_number exceeded')) {
    guidance = `The maximum thought limit (${MAX_THOUGHTS}) was reached.`;
  }

  const payload = {
    status: 'failed',
    error: errorMessage,
    guidance,
    example,
  };

  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }], isError: true };
};

const enforceCrossFieldRules = (data: ParsedThoughtData): ValidatedThoughtData => {
  if (data.is_revision) {
    if (typeof data.revises_thought !== 'number' || data.branch_id || data.branch_from_thought) {
      throw new Error('If is_revision=true, provide revises_thought and omit branch_* fields.');
    }
  } else if (data.revises_thought !== undefined) {
    throw new Error('revises_thought only allowed when is_revision=true.');
  }

  const hasBranchFields = data.branch_id !== undefined || data.branch_from_thought !== undefined;
  if (hasBranchFields) {
    if (
      data.branch_id === undefined ||
      data.branch_from_thought === undefined ||
      data.is_revision
    ) {
      throw new Error('branch_id and branch_from_thought required together and not with revision.');
    }
  }

  return data as ValidatedThoughtData;
};

const createThoughtProcessor = (cfg: Readonly<CodeReasoningConfig>, logger: ServerLogger) => {
  const tracker = createThoughtTracker();
  logger.info('Code-Reasoning logic ready', { config: cfg });

  return async (input: ParsedThoughtData): Promise<CallToolResult> => {
    const t0 = performance.now();

    try {
      const data = enforceCrossFieldRules(input);

      if (data.thought_number > MAX_THOUGHTS) {
        throw new Error(`Max thought_number exceeded (${MAX_THOUGHTS}).`);
      }

      tracker.ensureBranchIsValid(data.branch_from_thought);
      tracker.add(data);

      logger.info(formatThought(data));
      logger.debug('Thought metrics', {
        num: data.thought_number,
        elapsedMs: +(performance.now() - t0).toFixed(1),
      });

      return buildSuccess(data, tracker);
    } catch (err) {
      const e = err as Error;
      logger.error('Thought processing failed', {
        error: e.message,
        elapsedMs: +(performance.now() - t0).toFixed(1),
      });
      return buildError(e, cfg.debug, logger);
    }
  };
};

/* -------------------------------------------------------------------------- */
/*                                BOOTSTRAP                                   */
/* -------------------------------------------------------------------------- */

export async function runServer(debugFlag = false): Promise<void> {
  const config = createConfig(debugFlag ? { debug: true } : undefined);

  const serverMeta = { name: 'code-reasoning-server', version: '0.7.0' } as const;

  const capabilityOptions: Record<string, unknown> = {
    logging: {},
    completions: {},
  };
  if (config.promptsEnabled) {
    capabilityOptions.prompts = {};
  }

  const mcp = new McpServer(serverMeta, { capabilities: capabilityOptions });
  const logger = createServerLogger(mcp, config.debug);
  const processThought = createThoughtProcessor(config, logger);
  logger.info('Server initialized', {
    version: serverMeta.version,
    promptsEnabled: config.promptsEnabled,
  });

  // Register tool with MCP helper APIs
  const toolDefinition = createCodeReasoningToolDefinition(serverMeta.version);
  mcp.registerTool(
    TOOL_NAME,
    {
      title: toolDefinition.title,
      description: toolDefinition.description,
      annotations: toolDefinition.annotations,
      _meta: toolDefinition._meta,
      inputSchema: ThoughtDataInputShape,
    },
    async args => processThought(args)
  );

  // Initialize prompt manager if enabled
  let promptManager: PromptManager | undefined;
  if (config.promptsEnabled) {
    promptManager = new PromptManager(CONFIG_DIR);
    logger.info('Prompts capability enabled');

    // Add prompt handlers
    mcp.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      const prompts = promptManager?.getAllPrompts() || [];
      logger.debug('Returning prompts', { total: prompts.length });
      return { prompts };
    });

    mcp.server.setRequestHandler(GetPromptRequestSchema, async req => {
      try {
        if (!promptManager) {
          throw new Error('Prompt manager not initialized');
        }

        const promptName = req.params.name;
        const args = req.params.arguments || {};

        logger.debug('Getting prompt', { promptName, args });

        // Get the prompt result
        const result = promptManager.applyPrompt(promptName, args);

        // Return the result in the format expected by MCP
        return {
          messages: result.messages,
          _meta: {
            prompt_name: promptName,
            applied_arguments: Object.keys(args),
            server_version: serverMeta.version,
          },
        };
      } catch (err) {
        const e = err as Error;
        logger.error('Prompt error', { message: e.message });
        return {
          isError: true,
          content: [{ type: 'text', text: e.message }],
        };
      }
    });

    // Add handler for completion/complete requests
    mcp.server.setRequestHandler(CompleteRequestSchema, async req => {
      try {
        if (!promptManager) {
          throw new Error('Prompt manager not initialized');
        }

        // Check if this is a prompt reference
        if (req.params.ref.type !== 'ref/prompt') {
          return {
            completion: {
              values: [],
            },
          };
        }

        const promptName = req.params.ref.name;
        const argName = req.params.argument.name;

        logger.debug('Completing prompt argument', { promptName, argument: argName });

        // Get stored values for this prompt using the public method
        const storedValues = promptManager.getStoredValues(promptName);

        // Return the stored value for this argument if available
        if (storedValues[argName]) {
          return {
            completion: {
              values: [storedValues[argName]],
            },
          };
        }

        // Return empty array if no stored value
        return {
          completion: {
            values: [],
          },
        };
      } catch (err) {
        const e = err as Error;
        logger.error('Completion error', { message: e.message });
        return {
          completion: {
            values: [],
          },
        };
      }
    });
  } else {
    // Keep the empty handlers if prompts disabled
    mcp.server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: [] }));

    // Add empty handler for completion requests as well when prompts are disabled
    mcp.server.setRequestHandler(CompleteRequestSchema, async () => ({
      completion: {
        values: [],
      },
    }));
  }

  const transport = new StdioServerTransport();
  await mcp.connect(transport);
  logger.enableRemoteLogging();
  logger.notice('🚀 Code-Reasoning MCP Server ready.');

  const shutdown = async (signal_name: string, exit_code = 0) => {
    logger.info('Shutdown signal received', { signal: signal_name, exit_code });

    try {
      await mcp.close();
    } catch (close_error) {
      const error = close_error as Error;
      logger.error('Error closing MCP server', { message: error.message });
    }

    try {
      await transport.close();
    } catch (close_error) {
      const error = close_error as Error;
      logger.error('Error closing transport', { message: error.message });
    }

    process.exit(exit_code);
  };

  ['SIGINT', 'SIGTERM'].forEach(signal_name => {
    process.on(signal_name, () => {
      void shutdown(signal_name);
    });
  });

  process.on('uncaughtException', uncaught_error => {
    const error = uncaught_error as Error;
    logger.error('💥 uncaught exception', { message: error.message, stack: error.stack });
    void shutdown('uncaughtException', 1);
  });

  process.on('unhandledRejection', rejection_reason => {
    logger.error('💥 unhandledPromiseRejection', { reason: rejection_reason });
    void shutdown('unhandledRejection', 1);
  });
}

// Self-execute when run directly ------------------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  runServer(process.argv.includes('--debug')).catch(err => {
    console.error('FATAL: failed to start', err);
    process.exit(1);
  });
}
