// src/prompts/reasoning-manager.ts
import { PromptManager } from './manager.js';
import { Prompt, PromptResult } from './types.js';
import {
  ReasoningPrompt,
  ReasoningType,
  ReasoningContext,
  applyTemplateWithContext,
} from './reasoning-types.js';

/**
 * Extended prompt manager that supports reasoning-aware prompts.
 * In this implementation, all prompts are reasoning-aware.
 */
export class ReasoningPromptManager extends PromptManager {
  private reasoningPrompts: Record<string, ReasoningPrompt> = {};

  /**
   * Constructor automatically converts all standard prompts to reasoning prompts
   */
  constructor() {
    super();

    // Automatically register all standard prompts as reasoning prompts
    // This ensures all prompts support sequential thinking
    Object.values(this.getAllPrompts()).forEach(prompt => {
      if (this.getReasoningPrompt(prompt.name) === undefined) {
        // Auto-convert standard prompts to reasoning prompts if they aren't already
        if ('reasoningType' in prompt) {
          // It's already a reasoning prompt, just register it
          this.reasoningPrompts[prompt.name] = prompt as ReasoningPrompt;
          console.error(`Auto-registered existing reasoning prompt: ${prompt.name}`);
        } else {
          // Convert to a reasoning prompt with default values
          const reasoningPrompt: ReasoningPrompt = {
            ...prompt,
            reasoningType: ReasoningType.INITIALIZATION,
            thoughtTemplate: {
              format: `# ${prompt.name}\n\nLet me think about this systematically.`,
              suggestedTotalThoughts: 5,
            },
          };
          this.reasoningPrompts[prompt.name] = reasoningPrompt;
          console.error(`Auto-converted standard prompt to reasoning prompt: ${prompt.name}`);
        }
      }
    });
  }

  /**
   * Registers a reasoning-aware prompt
   *
   * @param prompt The reasoning prompt definition
   * @param template Function to generate prompt result
   */
  registerReasoningPrompt(
    prompt: ReasoningPrompt,
    template: (args: Record<string, string>, context?: ReasoningContext) => PromptResult
  ): void {
    // Register with base manager for standard functionality
    super.registerPrompt(prompt, (args: Record<string, string>) => template(args));

    // Store reasoning-specific data
    this.reasoningPrompts[prompt.name] = prompt;

    console.error(`Registered reasoning prompt: ${prompt.name} (${prompt.reasoningType})`);
  }

  /**
   * Gets all reasoning prompts
   *
   * @returns Array of reasoning prompts
   */
  getReasoningPrompts(): ReasoningPrompt[] {
    return Object.values(this.reasoningPrompts);
  }

  /**
   * Gets a specific reasoning prompt
   *
   * @param name Name of the prompt
   * @returns The prompt or undefined
   */
  getReasoningPrompt(name: string): ReasoningPrompt | undefined {
    return this.reasoningPrompts[name];
  }

  /**
   * Applies a prompt with reasoning context
   *
   * @param name Name of the prompt to apply
   * @param args Arguments for the prompt
   * @param context Reasoning context
   * @returns Result of applying the prompt
   */
  applyPromptWithContext(
    name: string,
    args: Record<string, string> = {},
    context?: ReasoningContext
  ): PromptResult {
    const prompt = this.getPrompt(name);
    if (!prompt) {
      throw new Error(`Prompt not found: ${name}`);
    }

    // Validate arguments
    const validationErrors = this.validateReasoningPromptArguments(prompt, args);
    if (validationErrors.length > 0) {
      throw new Error(`Validation errors:\n${validationErrors.join('\n')}`);
    }

    // Check if this is a reasoning prompt
    const reasoningPrompt = this.getReasoningPrompt(name);
    if (reasoningPrompt && reasoningPrompt.thoughtTemplate) {
      // Apply reasoning-aware template
      const template = reasoningPrompt.thoughtTemplate.format;
      const formattedText = applyTemplateWithContext(template, args, context);

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: formattedText,
            },
          },
        ],
      };
    }

    // Fall back to standard template
    return super.applyPrompt(name, args);
  }

  /**
   * Creates a thought from a prompt result
   *
   * @param promptResult The prompt result
   * @param promptName The name of the prompt
   * @param context The reasoning context
   * @returns Thought data object
   */
  createThoughtFromPrompt(
    promptResult: PromptResult,
    promptName: string,
    context?: ReasoningContext
  ): Record<string, unknown> {
    const reasoningPrompt = this.getReasoningPrompt(promptName);
    if (!reasoningPrompt) {
      throw new Error(`Not a reasoning prompt: ${promptName}`);
    }

    // Default context values
    const thoughtNumber = context?.currentThoughtNumber || 1;
    const totalThoughts =
      context?.totalThoughts || reasoningPrompt.thoughtTemplate?.suggestedTotalThoughts || 5; // Default if not specified

    // Extract thought text from prompt result
    const text = promptResult.messages[0]?.content.text || '';

    // Create thought data
    const thoughtData = {
      thought: text,
      thought_number: thoughtNumber,
      total_thoughts: totalThoughts,
      next_thought_needed: true,
    };

    // Add branching properties for BRANCHING type
    if (reasoningPrompt.reasoningType === ReasoningType.BRANCHING) {
      if (context?.currentThoughtNumber) {
        Object.assign(thoughtData, {
          branch_from_thought: context.currentThoughtNumber,
          branch_id: `branch-${Date.now().toString(36)}`,
        });
      }
    }

    // Add revision properties for REVISION type
    if (reasoningPrompt.reasoningType === ReasoningType.REVISION) {
      if (context?.currentThoughtNumber) {
        Object.assign(thoughtData, {
          is_revision: true,
          revises_thought: context.currentThoughtNumber,
        });
      }
    }

    return thoughtData;
  }

  /**
   * Validates prompt arguments against the prompt definition.
   *
   * @param prompt The prompt to validate against
   * @param args The arguments to validate
   * @returns Array of validation error messages, empty if valid
   */
  private validateReasoningPromptArguments(prompt: Prompt, args: Record<string, string>): string[] {
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
