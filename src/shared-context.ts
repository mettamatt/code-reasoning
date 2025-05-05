// src/shared-context.ts
import { ThoughtData } from './server.js';
import { ReasoningContext } from './prompts/reasoning-types.js';

/**
 * Simple implementation of a shared context between prompts and code-reasoning
 */
export class SharedContext implements ReasoningContext {
  // Reasoning state
  private thoughtHistory: ThoughtData[] = [];
  private branches: Map<string, ThoughtData[]> = new Map();

  // Current state
  currentThoughtNumber?: number;
  totalThoughts?: number;

  // Active prompt info
  activePromptName?: string;
  promptArguments?: Record<string, string>;

  constructor() {
    console.error('SharedContext initialized');
  }

  /**
   * Updates context from a new thought
   *
   * @param thought The new thought data
   */
  updateFromThought(thought: ThoughtData): void {
    this.thoughtHistory.push(thought);
    this.currentThoughtNumber = thought.thought_number;
    this.totalThoughts = thought.total_thoughts;

    // Update branch information if applicable
    if (thought.branch_id) {
      const branchThoughts = this.branches.get(thought.branch_id) || [];
      branchThoughts.push(thought);
      this.branches.set(thought.branch_id, branchThoughts);
    }
  }

  /**
   * Updates active prompt information
   *
   * @param promptName Name of the active prompt
   * @param args Arguments for the prompt
   */
  setActivePrompt(promptName: string, args: Record<string, string> = {}): void {
    this.activePromptName = promptName;
    this.promptArguments = args;
  }

  /**
   * Gets the current thought
   *
   * @returns Current thought or undefined
   */
  getCurrentThought(): ThoughtData | undefined {
    if (this.thoughtHistory.length === 0) return undefined;
    return this.thoughtHistory[this.thoughtHistory.length - 1];
  }

  /**
   * Gets a specific thought by number
   *
   * @param num Thought number
   * @returns The thought or undefined
   */
  getThoughtByNumber(num: number): ThoughtData | undefined {
    return this.thoughtHistory.find(t => t.thought_number === num);
  }

  /**
   * Gets all thoughts for a specific branch
   *
   * @param branchId Branch ID
   * @returns Array of thoughts or undefined
   */
  getBranchThoughts(branchId: string): ThoughtData[] | undefined {
    return this.branches.get(branchId);
  }

  /**
   * Gets all branches
   *
   * @returns Array of branch IDs
   */
  getBranches(): string[] {
    return Array.from(this.branches.keys());
  }

  /**
   * Gets all thoughts
   *
   * @returns Array of all thoughts
   */
  getAllThoughts(): ThoughtData[] {
    return [...this.thoughtHistory];
  }
}
