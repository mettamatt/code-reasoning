/**
 * @fileoverview Type definitions for MCP prompts.
 *
 * These types define the structure of prompts according to the Model Context Protocol (MCP).
 * Prompts are reusable templates that can be discovered and used by MCP clients.
 */

/**
 * Represents an argument/parameter for a prompt.
 */
export interface PromptArgument {
  name: string;
  description: string;
  required: boolean;
}

/**
 * Represents a prompt as defined by the MCP.
 */
export interface Prompt {
  name: string;
  description: string;
  arguments?: PromptArgument[];
}

/**
 * Represents the content of a message in a prompt result.
 */
export interface PromptMessageContent {
  type: 'text';
  text: string;
}

/**
 * Represents a message in a prompt result.
 */
export interface PromptMessage {
  role: 'user' | 'assistant';
  content: PromptMessageContent;
}

/**
 * Represents the result of applying a prompt with arguments.
 */
export interface PromptResult {
  messages: PromptMessage[];
}
