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
import { Prompt, PromptResult } from './types.js';
import { CODE_REASONING_PROMPTS, PROMPT_TEMPLATES } from './templates.js';
import { CONFIG_DIR, PROMPT_VALUES_FILE } from '../utils/config.js';

interface StoredPromptValues {
  global: Record<string, string>;
  prompts: Record<string, Record<string, string>>;
}

/**
 * Manages prompt templates and their operations.
 * Uses the CompleteRequestSchema MCP protocol for argument completion.
 */
export class PromptManager {
  private prompts: Record<string, Prompt>;
  private templates: Record<string, (args: Record<string, string>) => PromptResult>;
  private storedValues: StoredPromptValues = { global: {}, prompts: {} };
  private valuesFilePath?: string;
  private persistenceEnabled = false;

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

    this.ensureDirectoryExists(resolvedConfigDir, 'main config directory');

    console.info(`Using config directory: ${resolvedConfigDir}`);

    this.initializeValueStorage(resolvedConfigDir);

    console.info('PromptManager initialized with', Object.keys(this.prompts).length, 'prompts');
  }

  private ensureDirectoryExists(directoryPath: string, description: string): void {
    try {
      const createdPath = fs.mkdirSync(directoryPath, { recursive: true });
      if (createdPath) {
        console.info(`Created ${description}: ${directoryPath}`);
      }
    } catch (err) {
      const error = err as Error;
      throw new Error(`Failed to create ${description}: ${directoryPath}`, { cause: error });
    }
  }

  private initializeValueStorage(configDir: string): void {
    const defaultPath =
      configDir === path.dirname(PROMPT_VALUES_FILE)
        ? PROMPT_VALUES_FILE
        : path.join(configDir, 'prompt_values.json');

    const fallbackPath = path.join(os.tmpdir(), 'code-reasoning-prompt-values.json');
    const candidates = [defaultPath];
    if (!candidates.includes(fallbackPath)) {
      candidates.push(fallbackPath);
    }

    this.persistenceEnabled = false;
    this.valuesFilePath = undefined;

    const initializationErrors: Error[] = [];
    for (const candidate of candidates) {
      try {
        this.storedValues = this.loadStoredValues(candidate);
        this.valuesFilePath = candidate;
        this.persistenceEnabled = true;
        console.error(`Prompt values will be stored at: ${candidate}`);
        return;
      } catch (err) {
        const error = err as Error;
        initializationErrors.push(error);
        console.error(`Failed to initialize prompt values at ${candidate}:`, error);
      }
    }

    throw new AggregateError(
      initializationErrors,
      `Unable to initialize prompt value persistence. Tried: ${candidates.join(', ')}`
    );
  }

  private loadStoredValues(filePath: string): StoredPromptValues {
    const defaults: StoredPromptValues = { global: {}, prompts: {} };

    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaults, null, 2));
      return { global: {}, prompts: {} };
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(fileContent) as Partial<StoredPromptValues>;

    const parsedGlobal = parsed.global && typeof parsed.global === 'object' ? parsed.global : {};
    const parsedPrompts =
      parsed.prompts && typeof parsed.prompts === 'object' ? parsed.prompts : {};

    const promptsCopy: Record<string, Record<string, string>> = {};
    Object.entries(parsedPrompts).forEach(([key, value]) => {
      if (value && typeof value === 'object') {
        promptsCopy[key] = { ...(value as Record<string, string>) };
      }
    });

    return {
      global: { ...(parsedGlobal as Record<string, string>) },
      prompts: promptsCopy,
    };
  }

  private saveStoredValues(): void {
    if (!this.persistenceEnabled || !this.valuesFilePath) {
      throw new Error('Prompt value persistence is not configured.');
    }

    try {
      fs.writeFileSync(this.valuesFilePath, JSON.stringify(this.storedValues, null, 2));
    } catch (err) {
      const error = err as Error;
      throw new Error(`Error saving prompt values to ${this.valuesFilePath}: ${error.message}`, {
        cause: error,
      });
    }
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
    const result: Record<string, string> = { ...this.storedValues.global };
    const promptValues = this.storedValues.prompts[name];
    if (promptValues) {
      Object.assign(result, promptValues);
    }
    return result;
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
    prompt: Prompt,
    args: Record<string, string>
  ): Record<string, string> {
    // Get stored values
    const storedValues = this.getStoredValues(prompt.name);

    const validArgNames = new Set((prompt.arguments || []).map(arg => arg.name));

    const filteredStoredValues: Record<string, string> = {};
    Object.entries(storedValues).forEach(([key, value]) => {
      const isGlobalKey = Object.prototype.hasOwnProperty.call(this.storedValues.global, key);
      if (isGlobalKey && !validArgNames.has(key)) {
        return;
      }
      filteredStoredValues[key] = value;
    });

    // Filter out empty args
    const filteredArgs: Record<string, string> = {};
    Object.entries(args).forEach(([key, value]) => {
      if (value.trim() !== '') {
        filteredArgs[key] = value;
      }
    });

    // Merge stored values with filtered args (filtered args take precedence)
    return { ...filteredStoredValues, ...filteredArgs };
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
    const mergedArgs = this.mergeWithStoredValues(prompt, args);

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
    this.updateStoredValues(name, mergedArgs);

    // Apply the template with merged args
    return templateFn(mergedArgs);
  }

  private updateStoredValues(promptName: string, args: Record<string, string>): void {
    if (args.working_directory && args.working_directory.trim() !== '') {
      this.storedValues.global.working_directory = args.working_directory;
    }

    if (!this.storedValues.prompts[promptName]) {
      this.storedValues.prompts[promptName] = {};
    }

    const promptValues = this.storedValues.prompts[promptName];
    const globalKeys = new Set(Object.keys(this.storedValues.global));

    Object.entries(args).forEach(([key, value]) => {
      if (!value || value.trim() === '') {
        return;
      }
      if (globalKeys.has(key)) {
        return;
      }
      promptValues[key] = value;
    });

    this.saveStoredValues();
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
}
