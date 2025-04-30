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

When to use this tool:
- Breaking down complex problems into steps
- Planning and design with room for revision
- Analysis that might need course correction
- Problems where the full scope might not be clear initially
- Problems that require a multi-step solution
- Tasks that need to maintain context over multiple steps
- Situations where irrelevant information needs to be filtered out

Key features:
- You can adjust total_thoughts up or down as you progress
- You can question or revise previous thoughts
- You can add more thoughts even after reaching what seemed like the end
- You can express uncertainty and explore alternative approaches
- Not every thought needs to build linearly - you can branch or backtrack
- Generates a solution hypothesis
- Verifies the hypothesis based on the Chain of Thought steps
- Repeats the process until satisfied
- Provides a correct answer

Parameters explained:
- thought: Your current thinking step, which can include:
* Regular analytical steps
* Revisions of previous thoughts
* Questions about previous decisions
* Realizations about needing more analysis
* Changes in approach
* Hypothesis generation
* Hypothesis verification
- next_thought_needed: True if you need more thinking, even if at what seemed like the end
- thought_number: Current number in sequence (can go beyond initial total if needed)
- total_thoughts: Current estimate of thoughts needed (can be adjusted up/down)
- is_revision: A boolean indicating if this thought revises previous thinking
- revises_thought: If is_revision is true, which thought number is being reconsidered
- branch_from_thought: If branching, which thought number is the branching point
- branch_id: Identifier for the current branch (if any)
- needs_more_thoughts: If reaching end but realizing more thoughts needed

You should:
1. Start with an initial estimate of needed thoughts, but be ready to adjust
2. Feel free to question or revise previous thoughts
3. Don't hesitate to add more thoughts if needed, even at the "end"
4. Express uncertainty when present
5. Mark thoughts that revise previous thinking or branch into new paths
6. Ignore information that is irrelevant to the current step
7. Generate a solution hypothesis when appropriate
8. Verify the hypothesis based on the Chain of Thought steps
9. Repeat the process until satisfied with the solution
10. Provide a single, ideally correct answer as the final output
11. Only set next_thought_needed to false when truly done and a satisfactory answer is reached`,

  CODE_REASONING_0_30: `🧠 **Sequential Thinking Tool**

Purpose → break complex problems into **self-auditing, exploratory** thought steps that can *branch*, *revise*, or *back-track* until a **single, well-supported answer** emerges.

---

## WHEN TO CALL
• Multi-step planning, design, debugging, or open-ended analysis  
• Whenever *further private reasoning* or *hypothesis testing* is required **before** replying to the user

---

## ENCOURAGED PRACTICES
🔍 **Question aggressively** – ask "What am I missing?" after each step  
🔄 **Revise freely** – mark \`is_revision=true\` even late in the chain  
🌿 **Branch often** – explore plausible alternatives in parallel; you can merge or discard branches later  
↩️ **Back-track** – if a path looks wrong, start a new branch from an earlier thought  
❓ **Admit uncertainty** – explicitly note unknowns and schedule extra thoughts to resolve them

---

## MUST DO
✅ Put **every** private reasoning step in \`thought\`  
✅ Keep \`thought_number\` correct; update \`total_thoughts\` when scope changes  
✅ Use \`is_revision\` & \`branch_from_thought\`/\`branch_id\` precisely  
✅ Set \`next_thought_needed=false\` *only* when **all** open questions are resolved  
✅ Abort and summarise if \`thought_number > 20\`  

---

## DO NOT
⛔️ Reveal the content of \`thought\` to the end-user  
⛔️ Continue thinking once \`next_thought_needed=false\`  
⛔️ Assume thoughts must proceed strictly linearly – *branching is first-class*

---

### PARAMETER CHEAT-SHEET
• \`thought\` (string) – current reasoning step  
• \`next_thought_needed\` (boolean) – request further thinking?  
• \`thought_number\` (int ≥ 1) – 1-based counter  
• \`total_thoughts\` (int ≥ 1) – mutable estimate  
• \`is_revision\`, \`revises_thought\` (int) – mark corrections  
• \`branch_from_thought\`, \`branch_id\` – manage alternative paths  
• \`needs_more_thoughts\` (boolean) – optional hint that more thoughts may follow  

_All JSON keys **must** use \`lower_snake_case\`._

---

### EXAMPLE ✔️
\`\`\`json
{
  "thought": "List solution candidates and pick the most promising",
  "thought_number": 1,
  "total_thoughts": 4,
  "next_thought_needed": true
}
\`\`\`

### EXAMPLE ✔️ (branching late)
\`\`\`json
{
  "thought": "Alternative approach: treat it as a graph-search problem",
  "thought_number": 6,
  "total_thoughts": 8,
  "branch_from_thought": 3,
  "branch_id": "B1",
  "next_thought_needed": true
}
\`\`\``,

  HYBRID_DESIGN: `🧠 A detailed tool for dynamic and reflective problem-solving through sequential thinking.

This tool helps you analyze problems through a flexible thinking process that can adapt and evolve.
Each thought can build on, question, or revise previous insights as understanding deepens.

📋 KEY PARAMETERS:
- thought: Your current reasoning step (required)
- thought_number: Current number in sequence (required)
- total_thoughts: Estimated final count (required, can adjust as needed)
- next_thought_needed: Set to FALSE ONLY when completely done (required)
- branch_from_thought + branch_id: When exploring alternative approaches (🌿)
- is_revision + revises_thought: When correcting earlier thinking (🔄)

✅ CRITICAL CHECKLIST (review every 3 thoughts):
1. Need to explore alternatives? → Use BRANCH (🌿) with branch_from_thought + branch_id
2. Need to correct earlier thinking? → Use REVISION (🔄) with is_revision + revises_thought
3. Scope changed? → Adjust total_thoughts up or down as needed
4. Only set next_thought_needed = false when you have a complete, verified solution

💡 BEST PRACTICES:
- Start with an initial estimate of total_thoughts, but adjust as you go
- Don't hesitate to revise earlier conclusions when new insights emerge
- Use branching to explore multiple approaches to the same problem
- Express uncertainty when present
- Ignore information that is irrelevant to the current step
- End with a clear, validated conclusion before setting next_thought_needed = false

✍️ End each thought by asking: "What am I missing or need to reconsider?"`,
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
