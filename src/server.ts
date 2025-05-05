#!/usr/bin/env node

/**
 * @fileoverview Code Reasoning MCP Server Implementation.
 *
 * This server provides a tool for reflective problem-solving in software development,
 * allowing decomposition of tasks into sequential, revisable, and branchable thoughts.
 * It adheres to the Model Context Protocol (MCP) using SDK version 1.11.0 and is designed
 * to integrate seamlessly with Claude Desktop or similar MCP-compliant clients.
 *
 * ## Key Features
 * - Processes "thoughts" in structured JSON with sequential numbering
 * - Supports advanced reasoning patterns through branching and revision semantics
 *   - Branching: Explore alternative approaches from any existing thought
 *   - Revision: Correct or update earlier thoughts when new insights emerge
 * - Implements MCP capabilities for tools, resources, and prompts
 * - Uses custom FilteredStdioServerTransport for improved stability
 * - Provides detailed validation and error handling with helpful guidance
 * - Logs thought evolution to stderr for debugging and visibility
 *
 * ## Usage in Claude Desktop
 * - In your Claude Desktop settings, add a "tool" definition referencing this server
 * - Ensure the tool name is "code-reasoning"
 * - Configure Claude to use this tool for complex reasoning and problem-solving tasks
 * - Upon connecting, Claude can call the tool with an argument schema matching the
 *   `ThoughtDataSchema` defined in this file
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
 * @version 0.6.2
 * @mcp-sdk-version 1.11.0
 */

import process from 'node:process';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ServerCapabilities,
  Tool,
  type ServerResult,
} from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z, ZodError } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { SharedContext } from './shared-context.js';
import { ReasoningPromptManager } from './prompts/reasoning-manager.js';
import { ReasoningType, ReasoningPrompt } from './prompts/reasoning-types.js';

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

interface CodeReasoningConfig {
  maxThoughtLength: number;
  timeoutMs: number;
  maxThoughts: number;
  logLevel: LogLevel;
  debug: boolean;

  // Prompt-related configuration
  promptsEnabled: boolean;
  customPromptsDir?: string; // Directory for custom prompt templates
}

export const SERVER_CONFIG: Readonly<CodeReasoningConfig> = Object.freeze({
  maxThoughtLength: 20_000, // https://github.com/modelcontextprotocol/servers/issues/751
  timeoutMs: 60_000,
  maxThoughts: 20,
  logLevel: LogLevel.INFO,
  debug: false,

  // Prompt config with defaults
  promptsEnabled: true,
  customPromptsDir: undefined, // No custom prompts directory by default
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

const ThoughtDataSchema = z
  .object({
    thought: z
      .string()
      .trim()
      .min(1, 'Thought cannot be empty.')
      .max(
        SERVER_CONFIG.maxThoughtLength,
        `Thought exceeds ${SERVER_CONFIG.maxThoughtLength} chars.`
      ),
    thought_number: z.number().int().positive(),
    total_thoughts: z.number().int().positive(),
    next_thought_needed: z.boolean(),
    is_revision: z.boolean().optional(),
    revises_thought: z.number().int().positive().optional(),
    branch_from_thought: z.number().int().positive().optional(),
    branch_id: z.string().trim().min(1).optional(),
    needs_more_thoughts: z.boolean().optional(),
  })
  .refine(
    d =>
      d.is_revision
        ? typeof d.revises_thought === 'number' && !d.branch_id && !d.branch_from_thought
        : true,
    {
      message: 'If is_revision=true, provide revises_thought and omit branch_* fields.',
    }
  )
  .refine(d => (!d.is_revision && d.revises_thought === undefined) || d.is_revision, {
    message: 'revises_thought only allowed when is_revision=true.',
  })
  .refine(
    d =>
      d.branch_id || d.branch_from_thought
        ? d.branch_id !== undefined && d.branch_from_thought !== undefined && !d.is_revision
        : true,
    {
      message: 'branch_id and branch_from_thought required together and not with revision.',
    }
  );

export type ValidatedThoughtData = z.infer<typeof ThoughtDataSchema>;

/**
 * Cached JSON schema: avoids rebuilding on every ListTools call.
 */
const THOUGHT_DATA_JSON_SCHEMA = Object.freeze(
  zodToJsonSchema(ThoughtDataSchema, { target: 'jsonSchema7' }) as Record<string, unknown>
);

/* -------------------------------------------------------------------------- */
/*                                  TOOL DEF                                  */
/* -------------------------------------------------------------------------- */

const CODE_REASONING_TOOL: Tool = {
  name: 'code-reasoning',
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputSchema: THOUGHT_DATA_JSON_SCHEMA as any, // SDK expects unknown JSON schema shape
  annotations: {
    title: 'Code Reasoning',
    readOnlyHint: true,
  },
};

/* -------------------------------------------------------------------------- */
/*                        STDIO TRANSPORT WITH FILTERING                      */
/* -------------------------------------------------------------------------- */

class FilteredStdioServerTransport extends StdioServerTransport {
  private originalStdoutWrite: typeof process.stdout.write;

  constructor() {
    super();

    // Store the original implementation before making any changes
    this.originalStdoutWrite = process.stdout.write;

    // Create a bound version that preserves the original context
    const boundOriginalWrite = this.originalStdoutWrite.bind(process.stdout);

    // Override with a new function that avoids recursion
    process.stdout.write = ((data: string | Uint8Array): boolean => {
      if (typeof data === 'string') {
        const s = data.trimStart();
        if (s.startsWith('{') || s.startsWith('[')) {
          // Call the bound function directly to avoid circular reference
          return boundOriginalWrite(data);
        }
        // Silent handling of non-JSON strings
        return true;
      }
      // For non-string data, use the original implementation
      return boundOriginalWrite(data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
  }

  // Add cleanup to restore the original when the transport is closed
  async close(): Promise<void> {
    // Restore the original stdout.write before closing
    if (this.originalStdoutWrite) {
      process.stdout.write = this.originalStdoutWrite;
    }

    // Call the parent class's close method
    await super.close();
  }
}

/* -------------------------------------------------------------------------- */
/*                              SERVER IMPLEMENTATION                         */
/* -------------------------------------------------------------------------- */

class CodeReasoningServer {
  private readonly thoughtHistory: ValidatedThoughtData[] = [];
  private readonly branches = new Map<string, ValidatedThoughtData[]>();
  private sharedContext?: SharedContext;

  constructor(
    private readonly cfg: Readonly<CodeReasoningConfig>,
    sharedContext?: SharedContext
  ) {
    this.sharedContext = sharedContext;
    console.error('Code-Reasoning logic ready', { cfg });
  }

  // Public methods to access thought data for shared context
  public getThoughtHistory(): ValidatedThoughtData[] {
    return [...this.thoughtHistory];
  }

  public getBranches(): Map<string, ValidatedThoughtData[]> {
    return new Map(this.branches);
  }

  /* ----------------------------- Helper Methods ---------------------------- */

  private formatThought(t: ValidatedThoughtData): string {
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
  }

  /**
   * Provides example thought data based on error message to help users correct input.
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

  private buildSuccess(t: ValidatedThoughtData): ServerResult {
    const payload = {
      status: 'processed',
      thought_number: t.thought_number,
      total_thoughts: t.total_thoughts,
      next_thought_needed: t.next_thought_needed,
      branches: Array.from(this.branches.keys()),
      thought_history_length: this.thoughtHistory.length,
    } as const;

    return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }], isError: false };
  }

  private buildError(error: Error): ServerResult {
    let errorMessage = error.message;
    let guidance = 'Check the tool description and schema for correct usage.';
    const example = this.getExampleThought(errorMessage);

    if (error instanceof ZodError) {
      errorMessage = `Validation Error: ${error.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join(', ')}`;

      // Provide specific guidance based on error path
      const firstPath = error.errors[0]?.path.join('.');
      if (firstPath?.includes('thought') && !firstPath.includes('number')) {
        guidance = `The 'thought' field is empty or invalid. Must be a non-empty string below ${this.cfg.maxThoughtLength} characters.`;
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
      guidance = `The thought is too long. Keep it under ${this.cfg.maxThoughtLength} characters.`;
    } else if (errorMessage.includes('Max thought_number exceeded')) {
      guidance = `The maximum thought limit (${this.cfg.maxThoughts}) was reached.`;
    }

    const payload = {
      status: 'failed',
      error: errorMessage,
      guidance,
      example,
    };

    return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }], isError: true };
  }

  /* ------------------------------ Main Handler ----------------------------- */

  public async processThought(input: unknown): Promise<ServerResult> {
    const t0 = performance.now();

    try {
      const data = ThoughtDataSchema.parse(input);

      // Sanity limits -------------------------------------------------------
      if (data.thought_number > this.cfg.maxThoughts) {
        throw new Error(`Max thought_number exceeded (${this.cfg.maxThoughts}).`);
      }
      if (data.branch_from_thought && data.branch_from_thought > this.thoughtHistory.length) {
        throw new Error(`Invalid branch_from_thought ${data.branch_from_thought}.`);
      }

      // Stats & storage -----------------------------------------------------
      this.thoughtHistory.push(data);
      if (data.branch_id) {
        const arr = this.branches.get(data.branch_id) ?? [];
        arr.push(data);
        this.branches.set(data.branch_id, arr);
      }

      console.error(this.formatThought(data));
      console.error('✔️  processed', {
        num: data.thought_number,
        elapsedMs: +(performance.now() - t0).toFixed(1),
      });

      return this.buildSuccess(data);
    } catch (err) {
      const e = err as Error;
      console.error('❌ error', {
        err: e.message,
        elapsedMs: +(performance.now() - t0).toFixed(1),
      });
      if (err instanceof ZodError && this.cfg.debug) console.error(err.errors);
      return this.buildError(e);
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                                BOOTSTRAP                                   */
/* -------------------------------------------------------------------------- */

export async function runServer(debugFlag = false): Promise<void> {
  const config = debugFlag ? { ...SERVER_CONFIG, debug: true } : SERVER_CONFIG;

  const serverMeta = { name: 'code-reasoning-server', version: '0.6.2' } as const;

  // Configure server capabilities based on config
  const capabilities: Partial<ServerCapabilities> = {
    tools: {},
    resources: {},
  };

  // Only add prompts capability if enabled
  if (config.promptsEnabled) {
    capabilities.prompts = {
      list: true,
      get: true,
    };
  }

  const srv = new Server(serverMeta, { capabilities });

  // Create shared context
  const sharedContext = new SharedContext();

  // Initialize code reasoning server with shared context
  const logic = new CodeReasoningServer(config, sharedContext);

  // Initialize enhanced prompt manager if enabled
  let promptManager: ReasoningPromptManager | undefined;
  if (config.promptsEnabled) {
    promptManager = new ReasoningPromptManager();
    console.error('Prompts capability enabled with reasoning support');

    // Register reasoning-aware prompts
    promptManager.registerReasoningPrompt(
      {
        name: 'reasoning-initialization',
        description: 'Initialize a reasoning session with a specific problem statement',
        reasoningType: ReasoningType.INITIALIZATION,
        arguments: [
          {
            name: 'problem_statement',
            description: 'The problem to analyze',
            required: true,
          },
        ],
        thoughtTemplate: {
          format:
            '# Reasoning about: {{problem_statement}}\n\nLet me think about this systematically.',
          suggestedTotalThoughts: 5,
        },
      },
      (args, context) => ({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `# Problem Statement\n\n${args.problem_statement}\n\n## Initial Thought (1/${context?.totalThoughts || 5})\n\nLet me analyze this problem step by step.`,
            },
          },
        ],
      })
    );

    promptManager.registerReasoningPrompt(
      {
        name: 'reasoning-branch',
        description: 'Create a new branch to explore an alternative approach',
        reasoningType: ReasoningType.BRANCHING,
        arguments: [
          {
            name: 'from_thought',
            description: 'Thought number to branch from',
            required: true,
          },
          {
            name: 'alternative_approach',
            description: 'Description of the alternative to explore',
            required: true,
          },
        ],
        thoughtTemplate: {
          format: '# Exploring Alternative Approach\n\n{{alternative_approach}}',
          suggestedTotalThoughts: 3,
        },
      },
      (args, _context) => ({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `# Branch Exploration\n\nBranching from thought ${args.from_thought} to explore: ${args.alternative_approach}`,
            },
          },
        ],
      })
    );

    // Load custom prompts if configured
    if (config.customPromptsDir) {
      console.error(`Loading custom prompts from ${config.customPromptsDir}`);
      await promptManager.loadCustomPrompts(config.customPromptsDir);
    }

    // Add prompt handlers
    srv.setRequestHandler(ListPromptsRequestSchema, async () => {
      const prompts = promptManager?.getAllPrompts() || [];
      console.error(`Returning ${prompts.length} prompts`);
      return { prompts };
    });

    srv.setRequestHandler(GetPromptRequestSchema, async req => {
      try {
        if (!promptManager) {
          throw new Error('Prompt manager not initialized');
        }

        const promptName = req.params.name;
        const args = req.params.arguments || {};

        console.error(`Getting prompt: ${promptName} with args:`, args);

        // Update shared context with prompt info
        sharedContext.setActivePrompt(promptName, args);

        // Apply the prompt with shared context
        const result = promptManager.applyPromptWithContext(promptName, args, sharedContext);

        // Get or create reasoning prompt metadata
        let reasoningPrompt = promptManager.getReasoningPrompt(promptName);
        const _meta: Record<string, unknown> = {};

        // For all prompts, ensure we have reasoning metadata
        // If this is not already a reasoning prompt, create default reasoning metadata
        if (!reasoningPrompt) {
          const standardPrompt = promptManager.getPrompt(promptName);
          if (standardPrompt) {
            console.error(`Creating default reasoning metadata for prompt: ${promptName}`);

            // Default reasoning metadata for any prompt
            const reasoningMeta: Record<string, unknown> = {
              type: ReasoningType.INITIALIZATION,
              createThought: true,
              suggestedTotalThoughts: 5,
            };

            _meta.reasoning = reasoningMeta;
          }
        } else {
          // Use existing reasoning prompt metadata
          const reasoningMeta: Record<string, unknown> = {
            type: reasoningPrompt.reasoningType,
            createThought: true,
          };

          // Add thought template info if available
          if (reasoningPrompt.thoughtTemplate) {
            reasoningMeta.suggestedTotalThoughts =
              reasoningPrompt.thoughtTemplate.suggestedTotalThoughts;
          }

          _meta.reasoning = reasoningMeta;
        }

        // Return the result in the format expected by MCP
        return {
          messages: result.messages,
          _meta,
        };
      } catch (err) {
        const e = err as Error;
        console.error('Prompt error:', e.message);
        return {
          isError: true,
          content: [{ type: 'text', text: e.message }],
        };
      }
    });
  } else {
    // Keep the empty handler if prompts disabled
    srv.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: [] }));
  }

  // Existing handlers
  srv.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: [] }));

  // Add the prompt-to-thought tool
  srv.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      CODE_REASONING_TOOL,
      {
        name: 'prompt-to-thought',
        description: 'Converts a prompt into a structured thought for reasoning',
        inputSchema: {
          type: 'object',
          properties: {
            promptName: {
              type: 'string',
              description: 'Name of the prompt to apply',
            },
            promptArgs: {
              type: 'object',
              description: 'Arguments for the prompt',
            },
          },
          required: ['promptName'],
        },
      },
    ],
  }));
  // Modify the tool handler to support integrated reasoning
  srv.setRequestHandler(CallToolRequestSchema, async req => {
    if (req.params.name === CODE_REASONING_TOOL.name) {
      const result = await logic.processThought(req.params.arguments);

      // Update shared context if this was a thought
      if (!('isError' in result && result.isError === true) && req.params.arguments) {
        const args = req.params.arguments as Record<string, unknown>;
        // Validate that arguments match ThoughtData interface
        if (
          typeof args.thought === 'string' &&
          typeof args.thought_number === 'number' &&
          typeof args.total_thoughts === 'number' &&
          typeof args.next_thought_needed === 'boolean'
        ) {
          // Create properly typed ThoughtData object
          const thoughtData: ThoughtData = {
            thought: args.thought as string,
            thought_number: args.thought_number as number,
            total_thoughts: args.total_thoughts as number,
            next_thought_needed: args.next_thought_needed as boolean,
            is_revision: args.is_revision as boolean | undefined,
            revises_thought: args.revises_thought as number | undefined,
            branch_from_thought: args.branch_from_thought as number | undefined,
            branch_id: args.branch_id as string | undefined,
            needs_more_thoughts: args.needs_more_thoughts as boolean | undefined,
          };
          sharedContext.updateFromThought(thoughtData);
        }
      }

      return result;
    }

    // Tool for creating thoughts from prompts - works with ALL prompts
    if (req.params.name === 'prompt-to-thought' && promptManager) {
      try {
        const args = req.params.arguments as Record<string, unknown>;
        if (!args.promptName) {
          throw new Error('Missing promptName argument');
        }

        const promptName = args.promptName as string;
        const promptArgs = (args.promptArgs as Record<string, string>) || {};

        console.error(`Processing prompt-to-thought for prompt: ${promptName}`);

        // Check if this is already a reasoning prompt
        let reasoningPrompt = promptManager.getReasoningPrompt(promptName);

        // If not a reasoning prompt, we need to convert it on the fly
        if (!reasoningPrompt) {
          const standardPrompt = promptManager.getPrompt(promptName);
          if (!standardPrompt) {
            throw new Error(`Prompt not found: ${promptName}`);
          }

          console.error(`Auto-converting standard prompt to reasoning prompt: ${promptName}`);

          // Convert standard prompt to reasoning prompt with explicit type
          const convertedPrompt: ReasoningPrompt = {
            ...standardPrompt,
            reasoningType: ReasoningType.INITIALIZATION,
            thoughtTemplate: {
              format: `# ${standardPrompt.name}\n\nLet me think about this systematically.`,
              suggestedTotalThoughts: 5,
            },
          };
          reasoningPrompt = convertedPrompt;
        }

        // Apply the prompt to get content
        const promptResult = promptManager.applyPromptWithContext(
          promptName,
          promptArgs,
          sharedContext
        );

        // Convert to thought data
        const thoughtData = promptManager.createThoughtFromPrompt(
          promptResult,
          promptName,
          sharedContext
        );

        // Process the thought
        const result = await logic.processThought(thoughtData);

        // Update shared context
        if (!('isError' in result && result.isError === true)) {
          // Create properly typed ThoughtData object if needed
          if (
            'thought' in thoughtData &&
            'thought_number' in thoughtData &&
            'total_thoughts' in thoughtData &&
            'next_thought_needed' in thoughtData
          ) {
            const validThoughtData: ThoughtData = {
              thought: thoughtData.thought as string,
              thought_number: thoughtData.thought_number as number,
              total_thoughts: thoughtData.total_thoughts as number,
              next_thought_needed: thoughtData.next_thought_needed as boolean,
              is_revision: thoughtData.is_revision as boolean | undefined,
              revises_thought: thoughtData.revises_thought as number | undefined,
              branch_from_thought: thoughtData.branch_from_thought as number | undefined,
              branch_id: thoughtData.branch_id as string | undefined,
              needs_more_thoughts: thoughtData.needs_more_thoughts as boolean | undefined,
            };
            sharedContext.updateFromThought(validThoughtData);
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  source: 'prompt-to-thought',
                  promptName: args.promptName,
                  thought: thoughtData,
                  result:
                    'content' in result &&
                    Array.isArray(result.content) &&
                    result.content.length > 0
                      ? JSON.parse((result.content[0] as { text: string }).text)
                      : { error: 'No content available' },
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err) {
        const e = err as Error;
        console.error('Prompt-to-thought error:', e.message);
        return {
          isError: true,
          content: [{ type: 'text', text: e.message }],
        };
      }
    }

    return Promise.resolve({
      isError: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify({ code: -32601, message: `Unknown tool ${req.params.name}` }),
        },
      ],
    });
  });

  const transport = new FilteredStdioServerTransport();
  await srv.connect(transport);
  console.error('🚀 Code-Reasoning MCP Server ready with integrated prompts.');

  const shutdown = async (sig: string) => {
    console.error(`↩︎ shutdown on ${sig}`);
    await srv.close();
    await transport.close();
    process.exit(0);
  };

  ['SIGINT', 'SIGTERM'].forEach(s => process.on(s, () => shutdown(s)));
  process.on('uncaughtException', err => {
    console.error('💥 uncaught', err);
    shutdown('uncaughtException');
  });
  process.on('unhandledRejection', r => {
    console.error('💥 unhandledRejection', r);
    shutdown('unhandledRejection');
  });
}

// Self-execute when run directly ------------------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  runServer(process.argv.includes('--debug')).catch(err => {
    console.error('FATAL: failed to start', err);
    process.exit(1);
  });
}
