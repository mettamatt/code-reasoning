/**
 * @fileoverview Type definitions for MCP prompts.
 *
 * These types define the structure of prompts according to the Model Context Protocol (MCP).
 * Prompts are reusable templates that can be discovered and used by MCP clients.
 * This implementation uses the standard CompleteRequestSchema MCP protocol for providing
 * auto-completion of prompt arguments.
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
  // The defaultValues property has been removed in favor of the standard
  // CompleteRequestSchema MCP protocol for argument completion
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
