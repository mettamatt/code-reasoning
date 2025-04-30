/**
 * Core prompts for testing
 *
 * This file contains different variations of the core prompt
 * that can be selected for testing.
 */

// Define the system prompt used for all evaluations
export const SYSTEM_PROMPT =
  'You solve complex problems by breaking them down into logical steps using sequential thinking. CRITICAL: When comparing different approaches or algorithms, you MUST create separate branches with proper branch_id and branch_from_thought parameters. When revising your thoughts, you MUST use is_revision=true and revises_thought parameters. Follow the format instructions exactly as provided.';

// Default prompt currently used in production
export const DEFAULT_PROMPT = `🧠 A reflective problem-solving tool with sequential thinking.

• Break down tasks into numbered thoughts that can BRANCH (🌿) or REVISE (🔄) until a conclusion is reached.
• Always set 'next_thought_needed' = false when no further reasoning is needed.

✅ Recommended checklist every 3 thoughts:
1. Need to BRANCH?   → set 'branch_from_thought' + 'branch_id'.
2. Need to REVISE?   → set 'is_revision' + 'revises_thought'.
3. Scope changed? → bump 'total_thoughts'.

✍️ End each thought with: "What am I missing?"`;

// Alternative prompts for testing
export const ALL_PROMPTS: Record<string, string> = {
  DEFAULT: DEFAULT_PROMPT,
  SEQUENTIAL: `A detailed tool for dynamic and reflective problem-solving through thoughts.
This tool helps analyze problems through a flexible thinking process that can adapt and evolve.
Each thought can build on, question, or revise previous insights as understanding deepens.

Key features:
- You can adjust total_thoughts up or down as you progress
- You can question or revise previous thoughts
- You can express uncertainty and explore alternative approaches
- Not every thought needs to build linearly - you can branch or backtrack

Parameters explained:
- thought: Your current thinking step
- next_thought_needed: True if you need more thinking
- thought_number: Current number in sequence
- total_thoughts: Current estimate of thoughts needed
- is_revision: A boolean indicating if this thought revises previous thinking
- revises_thought: If is_revision is true, which thought number is being reconsidered
- branch_from_thought: If branching, which thought number is the branching point
- branch_id: Identifier for the current branch (if any)`,

  CODING_FOCUSED: `A specialized tool for breaking down coding and software development problems.

Key actions you can take:
- Decompose problems into sequential, numbered thoughts
- Create branches to explore different approaches (branch_from_thought + branch_id)
- Revise earlier thoughts when you discover issues (is_revision + revises_thought)
- Adjust your total_thoughts estimate as you learn more about the problem

Focus on:
1. Understanding the requirements thoroughly
2. Considering edge cases and constraints
3. Evaluating multiple implementation approaches
4. Identifying potential optimizations
5. Writing clean, maintainable code
6. Proper error handling and validation

Only mark next_thought_needed = false when you have a complete, correct solution.`,

  ALGORITHM_DESIGN: `A tool for solving algorithmic problems through structured reasoning.

When designing algorithms, follow these steps:
1. Understand the problem statement and constraints
2. Identify key variables and data structures
3. Consider multiple approaches (always use branching for this!)
4. Analyze time and space complexity of each approach
5. Implement the optimal solution
6. Test with examples, including edge cases

Your thoughts should explore:
- Different algorithmic paradigms (greedy, dynamic programming, divide & conquer)
- Potential optimizations
- Corner cases and error conditions
- Tradeoffs between approaches

Always use branch_from_thought and branch_id when exploring different algorithmic approaches.
Use is_revision and revises_thought when you find flaws in earlier reasoning.`,
};

// State management for active prompt
let activePromptKey = 'DEFAULT';

// Get active prompt
export function getActivePrompt(): { key: string; prompt: string } {
  return {
    key: activePromptKey,
    prompt: ALL_PROMPTS[activePromptKey],
  };
}

// Set active prompt by key
export function setActivePrompt(key: string): boolean {
  if (ALL_PROMPTS[key]) {
    activePromptKey = key;
    return true;
  }
  return false;
}

// Set custom prompt
export function setCustomPrompt(prompt: string): void {
  ALL_PROMPTS['CUSTOM'] = prompt;
  activePromptKey = 'CUSTOM';
}
