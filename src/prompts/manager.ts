/**
 * @fileoverview Prompt manager for MCP prompts.
 *
 * This class handles the management of prompts, including registration,
 * validation, and application of prompt templates.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Prompt, PromptResult } from './types.js';
import { CODE_REASONING_PROMPTS, PROMPT_TEMPLATES } from './templates.js';

/**
 * Manages prompt templates and their operations.
 */
export class PromptManager {
  private prompts: Record<string, Prompt>;
  private templates: Record<string, (args: Record<string, string>) => PromptResult>;

  /**
   * Creates a new PromptManager instance with default code reasoning prompts.
   */
  constructor() {
    this.prompts = { ...CODE_REASONING_PROMPTS };
    this.templates = { ...PROMPT_TEMPLATES };
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
   * @returns An array of all registered prompts
   */
  getAllPrompts(): Prompt[] {
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
   * Applies a prompt with the given arguments.
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

    // Validate arguments
    const validationErrors = this.validatePromptArguments(prompt, args);
    if (validationErrors.length > 0) {
      throw new Error(`Validation errors:\n${validationErrors.join('\n')}`);
    }

    // Get the template function
    const templateFn = this.templates[name];
    if (!templateFn) {
      throw new Error(`Template implementation not found for prompt: ${name}`);
    }

    // Apply the template
    return templateFn(args);
  }

  /**
   * Loads custom prompts from JSON files in a directory.
   *
   * @param directory The directory containing JSON prompt files
   */
  async loadCustomPrompts(directory: string): Promise<void> {
    try {
      if (!fs.existsSync(directory)) {
        console.error(`Custom prompts directory not found: ${directory}`);
        return;
      }

      const files = fs.readdirSync(directory);
      console.error(`Found ${files.length} files in custom prompts directory`);

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(directory, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const promptData = JSON.parse(content);

            // Validate and register the prompt
            if (promptData.name && promptData.description && promptData.template) {
              this.registerPrompt(
                {
                  name: promptData.name,
                  description: promptData.description,
                  arguments: promptData.arguments || [],
                },
                args => ({
                  messages: [
                    {
                      role: 'user',
                      content: {
                        type: 'text',
                        text: this.applyTemplate(promptData.template, args),
                      },
                    },
                  ],
                })
              );
              console.error(`Loaded custom prompt: ${promptData.name}`);
            } else {
              console.error(`Invalid prompt in file ${file}: missing required fields`);
            }
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
   *
   * @param template The template string
   * @param args The argument values to apply
   * @returns The template with arguments applied
   */
  private applyTemplate(template: string, args: Record<string, string>): string {
    let result = template;

    // Replace {arg_name} with values
    Object.entries(args).forEach(([key, value]: [string, string]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex, value || '');
    });

    return result;
  }
}
