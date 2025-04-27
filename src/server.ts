#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import chalk from 'chalk';
import { Logger, LogLevel } from './logger.js';
import { LoggingStdioServerTransport } from './logging-transport.js';
// ThoughtData interface definition
export interface ThoughtData {
  thought: string;
  thought_number: number;
  total_thoughts: number;
  is_revision?: boolean;
  revises_thought?: number;
  branch_from_thought?: number;
  branch_id?: string;
  needs_more_thoughts?: boolean;
  next_thought_needed: boolean;
}

class CodeReasoningServer {
  private thoughtHistory: ThoughtData[] = [];
  private branches: Record<string, ThoughtData[]> = {};
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.logger.info('Code Reasoning Server initialized');
  }

  private validateThoughtData(input: unknown): ThoughtData {
    this.logger.debug('Validating thought data', input as Record<string, unknown>);

    const data = input as Record<string, unknown>;

    if (!data.thought || typeof data.thought !== 'string') {
      throw new Error('Invalid thought: must be a string');
    }
    if (!data.thought_number || typeof data.thought_number !== 'number') {
      throw new Error('Invalid thought_number: must be a number');
    }
    if (!data.total_thoughts || typeof data.total_thoughts !== 'number') {
      throw new Error('Invalid total_thoughts: must be a number');
    }
    if (typeof data.next_thought_needed !== 'boolean') {
      throw new Error('Invalid next_thought_needed: must be a boolean');
    }

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

    if (is_revision) {
      prefix = chalk.yellow('🔄 Revision');
      context = ` (revising thought ${revises_thought})`;
    } else if (branch_from_thought) {
      prefix = chalk.green('🌿 Branch');
      context = ` (from thought ${branch_from_thought}, ID: ${branch_id})`;
    } else {
      prefix = chalk.blue('💭 Thought');
    }

    const header = `${prefix} ${thought_number}/${total_thoughts}${context}`;
    const border = '─'.repeat(Math.max(header.length, thought.length) + 4);

    return `
┌${border}┐
│ ${header} │
├${border}┤
│ ${thought.padEnd(border.length - 2)} │
└${border}┘`;
  }

  public processThought(input: unknown): {
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  } {
    try {
      const validatedInput = this.validateThoughtData(input);
      this.logger.debug('Processing thought', {
        thought_number: validatedInput.thought_number,
        is_revision: validatedInput.is_revision,
        branch_from_thought: validatedInput.branch_from_thought,
        branch_id: validatedInput.branch_id,
      });

      // Enforce the "abort with a summary if thought_number > 20" rule
      if (validatedInput.thought_number > 20) {
        this.logger.info('Aborting thought chain - exceeded 20 thoughts');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'Max thought_number exceeded',
                  summary: 'Aborting chain of thought after 20 steps',
                  status: 'aborted',
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      // If actual thought_number exceeds total_thoughts, raise total_thoughts
      if (validatedInput.thought_number > validatedInput.total_thoughts) {
        validatedInput.total_thoughts = validatedInput.thought_number;
        this.logger.debug('Adjusted total_thoughts', {
          new_total: validatedInput.total_thoughts,
        });
      }

      this.thoughtHistory.push(validatedInput);

      // If it's a branch, store it separately
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

      const formattedThought = this.formatThought(validatedInput);
      console.error(formattedThought);

      // Format and log the thought

      this.logger.info('Thought processed successfully', {
        thought_number: validatedInput.thought_number,
        next_thought_needed: validatedInput.next_thought_needed,
        branch_count: Object.keys(this.branches).length,
        history_length: this.thoughtHistory.length,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
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
      this.logger.error('Error processing thought', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: error instanceof Error ? error.message : String(error),
                status: 'failed',
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }
}

const CODE_REASONING_TOOL: Tool = {
  name: 'code-reasoning',
  description: `
🧠 **Code Reasoning Tool** (using sequential thinking)

Purpose → break complex problems into **self-auditing, exploratory** thought steps that can *branch*, *revise*, or *back-track* until a **single, well-supported answer** emerges.

---

## CRITICAL RULES (breaking these = automatic failure)
1. Always use branch_id when exploring alternative approaches
2. Always mark revisions with is_revision=true AND revises_thought
3. Never skip numbers in thought_number sequence (1,2,3...)
4. Only set next_thought_needed=false when completely finished

---

## USE THESE EXACT TEMPLATES

MAIN CHAIN TEMPLATE:
\`\`\`json
{
  "thought": "Your reasoning here...",
  "thought_number": X,        // Must increase by exactly 1 each time
  "total_thoughts": Y,        // Must be ≥ thought_number
  "next_thought_needed": true // Set to false only on final thought
}
\`\`\`

BRANCHING TEMPLATE (first thought in branch):
\`\`\`json
{
  "thought": "Alternative approach: ...",
  "thought_number": X,
  "total_thoughts": Y,
  "branch_from_thought": Z,   // Must reference existing thought
  "branch_id": "B1",          // Required for all branches
  "next_thought_needed": true
}
\`\`\`

BRANCH CONTINUATION TEMPLATE:
\`\`\`json
{
  "thought": "Continuing the analysis...",
  "thought_number": X,
  "total_thoughts": Y,
  "branch_id": "B1",          // Same as the branch starter
  "next_thought_needed": true
}
\`\`\`

REVISION TEMPLATE:
\`\`\`json
{
  "thought": "Revising thought Z because...",
  "thought_number": X,
  "total_thoughts": Y,
  "is_revision": true,
  "revises_thought": Z,       // Must reference earlier thought
  "next_thought_needed": true
}
\`\`\`

---

## DO NOT
⛔️ Reveal the content of \`thought\` to the end-user  
⛔️ Continue thinking once \`next_thought_needed=false\`  
⛔️ Skip numbers in the main thought sequence  
⛔️ Use branch or revision parameters incorrectly

---

## ENCOURAGED PRACTICES
🔍 **Question aggressively** – ask "What am I missing?" after each step  
🌿 **Branch often** – explore plausible alternatives in parallel  
↩️ **Back-track** – if a path looks wrong, start a new branch from an earlier thought  
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
      },
      revises_thought: {
        type: 'integer',
        description: 'Which thought is being revised',
        minimum: 1,
      },
      branch_from_thought: {
        type: 'integer',
        description: 'Branching point thought number',
        minimum: 1,
      },
      branch_id: {
        type: 'string',
        description: 'Identifier for the current branch',
      },
      needs_more_thoughts: {
        type: 'boolean',
        description: 'Optional hint that more thoughts may follow',
      },
    },
    required: ['thought', 'next_thought_needed', 'thought_number', 'total_thoughts'],
  },
};

export async function runServer(
  options: {
    debug?: boolean;
    help?: boolean;
  } = {}
) {
  // Default values if not provided
  const values = {
    debug: options.debug ?? false,
    help: options.help ?? false,
  };

  if (values.help) {
    console.error(`
Code-Reasoning MCP Server v0.2.0

A specialized server that uses sequential thinking methodology to solve programming problems.

USAGE:
  code-reasoning [OPTIONS]

OPTIONS:
  --debug                Enable debug logging

  --help, -h             Show this help message

NOTE:
  This server registers the "code-reasoning" tool that must be configured 
  as "code-reasoning" in MCP configurations.
  The "sequential-thinking" configuration key is not supported.
`);
    process.exit(0);
  }

  // Initialize logger with appropriate level
  const logLevel = values.debug ? LogLevel.DEBUG : LogLevel.INFO;
  const logger = new Logger(logLevel);
  logger.info('Starting Code-Reasoning MCP Server', {
    version: '0.2.0',
    debugMode: values.debug,
  });

  // Initialize server
  const server = new Server(
    {
      name: 'code-reasoning-server',
      version: '0.2.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Initialize code reasoning server with logger
  const reasoningServer = new CodeReasoningServer(logger);

  // Set up request handlers with logging
  server.setRequestHandler(ListToolsRequestSchema, async _request => {
    logger.debug('Handling tools/list request');
    return {
      tools: [CODE_REASONING_TOOL],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async request => {
    logger.debug('Handling tools/call request', {
      tool: request.params.name,
    });

    if (request.params.name === 'code-reasoning') {
      return reasoningServer.processThought(request.params.arguments);
    }

    logger.error('Unknown tool requested', { tool: request.params.name });
    return {
      content: [
        {
          type: 'text',
          text: `Unknown tool: ${request.params.name}`,
        },
      ],
      isError: true,
    };
  });

  // Connect using the logging transport
  const transport = new LoggingStdioServerTransport(logger);

  logger.info('Connecting server using LoggingStdioServerTransport');
  await server.connect(transport);

  logger.info('Code Reasoning MCP Server running on stdio');
}

// No direct invocation needed as this is now imported and called from the root index.ts
