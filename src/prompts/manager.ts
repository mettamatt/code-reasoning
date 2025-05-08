/**
 * @fileoverview Prompt manager for MCP prompts.
 *
 * This class handles the management of prompts, including registration,
 * validation, and application of prompt templates.
 *
 * It implements the standard MCP CompleteRequestSchema protocol for
 * providing auto-completion of prompt arguments with previously stored values.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { z } from 'zod';
import { Prompt, PromptResult } from './types.js';
import { CODE_REASONING_PROMPTS, PROMPT_TEMPLATES } from './templates.js';
import { PromptValueManager } from './valueManager.js';
import { CONFIG_DIR } from '../utils/config.js';

// Constants for validation and sanitization
const MAX_STRING_LENGTH = 5000;
const MAX_CODE_LENGTH = 20000;
const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_TEMPLATE_LENGTH = 10000;

/**
 * Manages prompt templates and their operations.
 * Uses the CompleteRequestSchema MCP protocol for argument completion.
 */
export class PromptManager {
  private prompts: Record<string, Prompt>;
  private templates: Record<string, (args: Record<string, string>) => PromptResult>;
  private valueManager: PromptValueManager;

  // Zod schemas for input sanitization
  private readonly baseStringSchema = z
    .string()
    .max(MAX_STRING_LENGTH, `Input exceeds maximum length of ${MAX_STRING_LENGTH} characters`)
    .transform(val => (val ? val.trim() : ''))
    .transform(val => {
      // Escape HTML/Markdown special characters
      return val
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    })
    .transform(val => {
      // Neutralize template injection attempts
      return val.replace(/\{([^}]+)\}/g, '[$1]');
    })
    .transform(val => {
      // Remove potentially dangerous patterns (credit card numbers, private keys, etc.)
      return val
        .replace(/\b(?:\d[ -]*?){13,16}\b/g, '[REDACTED]') // Credit cards
        .replace(
          /-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----/g,
          '[REDACTED KEY]'
        ); // Private keys
    });

  private readonly codeSchema = z
    .string()
    .max(MAX_CODE_LENGTH, `Code exceeds maximum length of ${MAX_CODE_LENGTH} characters`)
    .transform(val => (val ? val.trim() : ''));

  private readonly workingDirectorySchema = z
    .string()
    .max(
      MAX_STRING_LENGTH,
      `Working directory path exceeds maximum length of ${MAX_STRING_LENGTH} characters`
    )
    .transform(val => (val ? val.trim() : ''))
    .transform(val => {
      // For working directory, we can keep path separators and basic structure
      // but sanitize to prevent potential path traversal or command injection
      return val
        .replace(/\.\./g, '') // Remove path traversal sequences
        .replace(/[;&|`$]/g, ''); // Remove shell command operators
    });

  // Schema for PromptArgument with added validation
  private readonly PromptArgumentSchema = z.object({
    name: z
      .string()
      .min(1)
      .max(MAX_NAME_LENGTH)
      .regex(
        /^[a-zA-Z0-9_]+$/,
        'Argument name must contain only alphanumeric characters and underscores'
      ),
    description: z.string().min(1).max(MAX_DESCRIPTION_LENGTH),
    required: z.boolean(), // Removed .strict() as it's not available in this Zod version
  });

  // Schema for the entire prompt data with template sanitization
  private readonly PromptDataSchema = z
    .object({
      name: z
        .string()
        .min(1)
        .max(MAX_NAME_LENGTH)
        .regex(
          /^[a-zA-Z0-9_-]+$/,
          'Prompt name must contain only alphanumeric characters, underscores, and hyphens'
        ),
      description: z.string().min(1).max(MAX_DESCRIPTION_LENGTH),
      template: z
        .string()
        .min(1)
        .max(MAX_TEMPLATE_LENGTH)
        .transform(val => {
          // Basic template sanitization - could be expanded
          return val.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        }),
      arguments: z.array(this.PromptArgumentSchema).optional().default([]),
    })
    .strict(); // Ensure no unknown properties

  /**
   * Creates a new PromptManager instance with default code reasoning prompts.
   *
   * @param configDir Optional directory for configuration files. Defaults to the centralized CONFIG_DIR.
   */
  constructor(configDir?: string) {
    this.prompts = { ...CODE_REASONING_PROMPTS };
    this.templates = { ...PROMPT_TEMPLATES };

    // Use provided config directory or default to CONFIG_DIR
    const resolvedConfigDir = configDir || CONFIG_DIR;

    // Create main config directory if it doesn't exist
    if (!fs.existsSync(resolvedConfigDir)) {
      try {
        fs.mkdirSync(resolvedConfigDir, { recursive: true });
        console.error(`Created main config directory: ${resolvedConfigDir}`);
      } catch (err) {
        console.error(`Failed to create main config directory: ${resolvedConfigDir}`, err);
      }
    }

    // Create prompts subdirectory if it doesn't exist
    const promptsDir = path.join(resolvedConfigDir, 'prompts');
    if (!fs.existsSync(promptsDir)) {
      try {
        fs.mkdirSync(promptsDir, { recursive: true });
        console.error(`Created prompts directory: ${promptsDir}`);
      } catch (err) {
        console.error(`Failed to create prompts directory: ${promptsDir}`, err);
      }
    }

    console.error(`Using config directory: ${resolvedConfigDir}`);

    try {
      this.valueManager = new PromptValueManager(resolvedConfigDir);
    } catch (err) {
      console.error(`Error initializing PromptValueManager: ${err}`);
      // Create a dummy value manager that doesn't actually save anything
      this.valueManager = new PromptValueManager(os.tmpdir());
    }

    console.error('PromptManager initialized with', Object.keys(this.prompts).length, 'prompts');
  }

  /**
   * Registers a new prompt and its template function.
   *
   * @param prompt The prompt definition
   * @param template The template function that applies arguments to generate a result
   */
  registerPrompt(prompt: Prompt, template: (args: Record<string, string>) => PromptResult): void {
    this.prompts[prompt.name] = prompt;
    this.templates[prompt.name] = template;
    console.error(`Registered prompt: ${prompt.name}`);
  }

  /**
   * Gets all available prompts.
   *
   * Note: Previously stored values for prompt arguments are provided through
   * the CompleteRequestSchema MCP protocol, not through the prompt objects.
   *
   * @returns An array of all registered prompts
   */
  getAllPrompts(): Prompt[] {
    // Simply return the prompts without adding defaultValues
    return Object.values(this.prompts);
  }

  /**
   * Gets a specific prompt by name.
   *
   * @param name The name of the prompt to retrieve
   * @returns The prompt or undefined if not found
   */
  getPrompt(name: string): Prompt | undefined {
    return this.prompts[name];
  }

  /**
   * Gets stored values for a specific prompt.
   * This method is used by the CompleteRequestSchema handler to provide
   * auto-completion of prompt arguments.
   *
   * @param name The name of the prompt
   * @returns The stored values for the prompt
   */
  getStoredValues(name: string): Record<string, string> {
    return this.valueManager.getStoredValues(name);
  }

  /**
   * Merges provided arguments with stored values, with provided args taking precedence.
   * This is a helper method to simplify the applyPrompt method.
   *
   * @param promptName The name of the prompt
   * @param args The provided arguments
   * @returns The merged arguments
   */
  private mergeWithStoredValues(
    promptName: string,
    args: Record<string, string>
  ): Record<string, string> {
    // Get stored values
    const storedValues = this.getStoredValues(promptName);

    // Filter out empty args
    const filteredArgs: Record<string, string> = {};
    Object.entries(args).forEach(([key, value]) => {
      if (value.trim() !== '') {
        filteredArgs[key] = value;
      }
    });

    // Merge stored values with filtered args (filtered args take precedence)
    return { ...storedValues, ...filteredArgs };
  }

  /**
   * Applies a prompt with the given arguments.
   * Merges provided arguments with previously stored values,
   * with provided arguments taking precedence.
   *
   * @param name The name of the prompt to apply
   * @param args The arguments to apply to the prompt template
   * @returns The result of applying the prompt
   * @throws Error if the prompt doesn't exist or arguments are invalid
   */
  applyPrompt(name: string, args: Record<string, string> = {}): PromptResult {
    const prompt = this.getPrompt(name);
    if (!prompt) {
      throw new Error(`Prompt not found: ${name}`);
    }

    // Merge with stored values
    const mergedArgs = this.mergeWithStoredValues(name, args);

    // Validate arguments
    const validationErrors = this.validatePromptArguments(prompt, mergedArgs);
    if (validationErrors.length > 0) {
      throw new Error(`Validation errors:\n${validationErrors.join('\n')}`);
    }

    // Get the template function
    const templateFn = this.templates[name];
    if (!templateFn) {
      throw new Error(`Template implementation not found for prompt: ${name}`);
    }

    // Update stored values with the new ones
    this.valueManager.updateStoredValues(name, mergedArgs);

    // Apply the template with merged args
    return templateFn(mergedArgs);
  }

  /**
   * Loads custom prompts from JSON files in a directory.
   *
   * @param directory The directory containing JSON prompt files
   */
  async loadCustomPrompts(directory: string): Promise<void> {
    try {
      if (!fs.existsSync(directory)) {
        try {
          fs.mkdirSync(directory, { recursive: true });
          console.error(`Created custom prompts directory: ${directory}`);
        } catch (err) {
          console.error(`Failed to create custom prompts directory: ${directory}`, err);
          return;
        }
      }

      const files = fs.readdirSync(directory);
      console.error(`Found ${files.length} files in custom prompts directory`);

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(directory, file);
            const content = fs.readFileSync(filePath, 'utf8');

            // Parse JSON and validate with Zod schema
            const promptDataResult = this.PromptDataSchema.safeParse(JSON.parse(content));

            if (!promptDataResult.success) {
              console.error(
                `Invalid prompt in file ${file}:`,
                promptDataResult.error.issues
                  .map(i => `${i.path.join('.')}: ${i.message}`)
                  .join(', ')
              );
              continue;
            }

            // Extract validated data
            const promptData = promptDataResult.data;

            // Register the prompt with validated data
            this.registerPrompt(
              {
                name: promptData.name,
                description: promptData.description,
                arguments: promptData.arguments.map(arg => ({
                  name: String(arg.name),
                  description: String(arg.description),
                  required: Boolean(arg.required),
                })),
              },
              args => ({
                messages: [
                  {
                    role: 'user',
                    content: {
                      type: 'text',
                      text: this.applyTemplate(promptData.template, args, promptData.name),
                    },
                  },
                ],
              })
            );
            console.error(`Loaded custom prompt: ${promptData.name}`);
          } catch (err) {
            console.error(`Error loading prompt from ${file}:`, err);
          }
        }
      }
    } catch (err) {
      console.error(`Error loading custom prompts:`, err);
    }
  }

  /**
   * Gets the appropriate schema for a given argument.
   *
   * @param argName The name of the argument
   * @param promptName The name of the prompt
   * @returns A Zod schema for validating and sanitizing the argument
   */
  private getSchemaForArg(argName: string, promptName: string): z.ZodType<string> {
    // Choose schema based on arg name and context (prompt name)
    if (argName === 'code_path' || argName === 'language') {
      return this.codeSchema;
    } else if (argName === 'working_directory') {
      return this.workingDirectorySchema;
    } else if (promptName === 'bug-analysis' && argName === 'bug_behavior') {
      // For bug reports, we want to preserve more formatting
      return this.codeSchema;
    }
    // Use default string schema for all other args
    return this.baseStringSchema;
  }

  /**
   * Validates prompt arguments against the prompt definition.
   *
   * @param prompt The prompt to validate against
   * @param args The arguments to validate
   * @returns Array of validation error messages, empty if valid
   */
  private validatePromptArguments(prompt: Prompt, args: Record<string, string>): string[] {
    const errors: string[] = [];

    // Check for required arguments
    (prompt.arguments || []).forEach(
      (arg: { name: string; description: string; required: boolean }) => {
        if (arg.required && (!args[arg.name] || args[arg.name].trim() === '')) {
          errors.push(`Missing required argument: ${arg.name} (${arg.description})`);
        }
      }
    );

    // Check for unknown arguments
    const validArgNames = new Set((prompt.arguments || []).map(arg => arg.name));
    Object.keys(args).forEach(argName => {
      if (!validArgNames.has(argName)) {
        errors.push(`Unknown argument: ${argName}`);
      }
    });

    return errors;
  }

  /**
   * Applies a template string with argument values.
   * Sanitizes input values to prevent template injection and other security issues.
   *
   * @param template The template string
   * @param args The argument values to apply
   * @param promptName The name of the prompt (for context-aware sanitization)
   * @returns The template with arguments applied
   */
  private applyTemplate(
    template: string,
    args: Record<string, string>,
    promptName: string = ''
  ): string {
    let result = template;

    // Replace {arg_name} with sanitized values
    Object.entries(args).forEach(([key, value]: [string, string]) => {
      // Get the appropriate schema for this argument
      const schema = this.getSchemaForArg(key, promptName);

      // Parse and transform the value (sanitize)
      const sanitizeResult = schema.safeParse(value || '');

      // Apply replacement
      const regex = new RegExp(`\\{${key}\\}`, 'g');

      if (sanitizeResult.success) {
        result = result.replace(regex, sanitizeResult.data);
      } else {
        // Log validation errors with context for debugging
        console.error(
          `Validation failed for argument '${key}' in prompt '${promptName}':`,
          sanitizeResult.error.issues.map(i => `${i.path}: ${i.message}`).join(', ')
        );

        // Fallback to empty string or safe default
        result = result.replace(regex, '');
      }
    });

    return result;
  }
}
