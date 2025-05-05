// src/prompts/reasoning-types.ts
import { Prompt } from './types.js';

/**
 * Enum for the type of reasoning a prompt is related to
 */
export enum ReasoningType {
  INITIALIZATION = 'initialization',
  CONTINUATION = 'continuation',
  BRANCHING = 'branching',
  REVISION = 'revision',
}

/**
 * Interface for thought structure information
 */
export interface ThoughtTemplate {
  format: string;
  suggestedTotalThoughts?: number;
}

/**
 * Interface for a reasoning-aware prompt
 */
export interface ReasoningPrompt extends Prompt {
  reasoningType: ReasoningType;
  thoughtTemplate?: ThoughtTemplate;
}

/**
 * Context for applying a reasoning prompt
 */
export interface ReasoningContext {
  currentThoughtNumber?: number;
  totalThoughts?: number;

  // Methods for accessing thought data (with type-safe return types)
  getCurrentThought?(): Record<string, unknown> | unknown | undefined;
  getThoughtByNumber?(num: number): Record<string, unknown> | unknown | undefined;
  getAllThoughts?(): Array<Record<string, unknown> | unknown>;
}

/**
 * Apply template with reasoning context
 * @param template Template string with placeholders
 * @param args Template arguments
 * @param context Reasoning context
 * @returns Formatted string
 */
export function applyTemplateWithContext(
  template: string,
  args: Record<string, string>,
  context?: ReasoningContext
): string {
  let result = template;

  // Replace argument placeholders
  Object.entries(args).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value || '');
  });

  // Replace reasoning context placeholders
  if (context) {
    if (context.currentThoughtNumber !== undefined) {
      result = result.replace(/{{thought_number}}/g, context.currentThoughtNumber.toString());
    }
    if (context.totalThoughts !== undefined) {
      result = result.replace(/{{total_thoughts}}/g, context.totalThoughts.toString());
    }
  }

  return result;
}
