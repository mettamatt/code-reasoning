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
  /**
   * Default values for prompt arguments, used for pre-filling form fields.
   * This is a custom extension to the standard MCP protocol.
   */
  defaultValues?: Record<string, string>;
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
