/*
 * Prompt Effectiveness Test Scenarios
 *
 * These scenarios model natural developer questions that should trigger the
 * various controls offered by the CODE_REASONING_TOOL. Prompts have been
 * rewritten to avoid "teaching to the exam" while still exercising:
 *   • Branch exploration and later merge-down
 *   • Self-revision when a mistake is spotted
 *   • Correct handling of sequential-thinking parameters
 *   • Deep, multi-dimension analysis
 *   • Proper termination signalling
 */

/**
 * Defines a scenario for evaluating the code reasoning tool.
 *
 * Each scenario targets a specific skill or capability of the code reasoning tool
 * and provides a problem designed to test that capability.
 */
export interface PromptScenario {
  /**
   * Unique identifier for the scenario, used in filenames and references.
   */
  id: string;

  /**
   * Human-readable name of the scenario, used in displays and reports.
   */
  name: string;

  /**
   * Concise description of what the scenario is designed to test.
   */
  description: string;

  /**
   * The actual prompt text sent to the model. This is the problem
   * statement that the model will attempt to solve.
   */
  problem: string;

  /**
   * The primary skill or capability being tested by this scenario.
   * - 'branching': Tests if the model creates branches for exploring alternatives
   * - 'revision': Tests if the model corrects earlier mistakes
   * - 'parameters': Tests correct usage of sequential thinking parameters
   * - 'depth': Tests deep exploration of complex topics
   * - 'completion': Tests proper termination of the thought chain
   * - 'multiple': Tests combinations of multiple skills
   */
  targetSkill: 'branching' | 'revision' | 'parameters' | 'depth' | 'completion' | 'multiple';

  /**
   * The relative complexity level of the scenario.
   */
  difficulty: 'easy' | 'medium' | 'hard';

  /**
   * The minimum number of thoughts expected for this scenario.
   * Used in validation to check if there are enough thoughts.
   */
  expectedThoughtsMin: number;

  /**
   * The maximum number of thoughts expected for this scenario.
   * Used for display purposes and setting expectations.
   * Note: This is not currently used in validation logic.
   */
  expectedThoughtsMax: number;
}

export const PROMPT_TEST_SCENARIOS: PromptScenario[] = [
  // ──────────────────────────────────────────────────────────
  // 1. Branching Understanding Scenario
  // ──────────────────────────────────────────────────────────
  {
    id: 'branch-algorithm-selection',
    name: 'Algorithm Selection Problem',
    description:
      'Checks whether the model spontaneously branches to compare alternative algorithms.',
    problem: `I need a fast function that returns the *k* most-frequent integers in an array. What algorithm would you pick and why? Also, what edge-cases should I keep an eye on?`,
    targetSkill: 'branching',
    difficulty: 'medium',
    expectedThoughtsMin: 5,
    expectedThoughtsMax: 12,
  },

  // ──────────────────────────────────────────────────────────
  // 2. Revision Understanding Scenario
  // ──────────────────────────────────────────────────────────
  {
    id: 'revision-bug-trap',
    name: 'Bug Identification Problem',
    description:
      'Intended to provoke a self-revision when the model realises an earlier conclusion was wrong.',
    problem: `Hey, can you take a look at this function that's *supposed* to find the median of two sorted arrays? I think it breaks when the combined length is even, but I can't spot the issue. Bonus points if you can make it faster.

\`\`\`javascript
function findMedianSortedArrays(nums1, nums2) {
  const merged = [];
  let i = 0, j = 0;
  // Merge arrays
  while (i < nums1.length && j < nums2.length) {
    if (nums1[i] < nums2[j]) merged.push(nums1[i++]);
    else                     merged.push(nums2[j++]);
  }
  while (i < nums1.length) merged.push(nums1[i++]);
  while (j < nums2.length) merged.push(nums2[j++]);
  // BUG: off-by-one when total length is even
  const mid = Math.floor(merged.length / 2);
  return merged.length % 2 === 0 ? merged[mid] /* wrong! */ : merged[mid];
}
\`\`\``,
    targetSkill: 'revision',
    difficulty: 'medium',
    expectedThoughtsMin: 5,
    expectedThoughtsMax: 10,
  },

  // ──────────────────────────────────────────────────────────
  // 3. Parameter Correctness Scenario
  // ──────────────────────────────────────────────────────────
  {
    id: 'parameter-multi-stage',
    name: 'Multi-Stage Implementation',
    description: 'Verifies that the model manages thought-count and flags across stages.',
    problem: `I'm building a tiny URL-shortening service and need: 1) a short-code generator, 2) DB schema for mappings, 3) API endpoints to create/resolve, 4) some rate-limiting to stop abuse. How would you plan the implementation?`,
    targetSkill: 'parameters',
    difficulty: 'medium',
    expectedThoughtsMin: 6,
    expectedThoughtsMax: 12,
  },

  // ──────────────────────────────────────────────────────────
  // 4. Thought Depth Scenario
  // ──────────────────────────────────────────────────────────
  {
    id: 'depth-system-design',
    name: 'System Design Analysis',
    description: 'Checks for sufficiently deep exploration and trade-off discussion.',
    problem: `Design a distributed file-storage system (Dropbox-style) that must support files up to 5 GB—though 90 % are <10 MB—and 80 % download traffic comes from the EU. Please cover architecture, storage layout, sync protocol, security model, and how you'd scale it.`,
    targetSkill: 'depth',
    difficulty: 'hard',
    expectedThoughtsMin: 8,
    expectedThoughtsMax: 15,
  },

  // ──────────────────────────────────────────────────────────
  // 5. Reasoning Completion Scenario
  // ──────────────────────────────────────────────────────────
  {
    id: 'completion-debugging',
    name: 'Code Debugging Task',
    description: "Ensures the chain stops at the right time and doesn't premature-exit.",
    problem: `My recursive Fibonacci works but becomes unusably slow once *n* passes 40. Could you debug why and give at least two faster alternatives, explaining their trade-offs?`,
    targetSkill: 'completion',
    difficulty: 'easy',
    expectedThoughtsMin: 4,
    expectedThoughtsMax: 8,
  },

  // ──────────────────────────────────────────────────────────
  // 6. Complex Multi-Skill Scenario
  // ──────────────────────────────────────────────────────────
  {
    id: 'complex-compiler-optimization',
    name: 'Compiler Optimization Analysis',
    description: 'Combines branching, revisions, and depth in a compiler context.',
    problem: `I'm building an LLVM pass to trim memory usage. Techniques on the table: register allocation tweaks, dead-store elimination, mem2reg, LICM, and CSE. How would you combine these without degrading runtime? What conflicts might arise and how would you resolve them?`,
    targetSkill: 'multiple',
    difficulty: 'hard',
    expectedThoughtsMin: 10,
    expectedThoughtsMax: 20,
  },

  // ──────────────────────────────────────────────────────────
  // 7. Branch-Merge Scenario (NEW)
  // ──────────────────────────────────────────────────────────
  {
    id: 'branch-merge-cache-strategy',
    name: 'Cache Strategy Merge',
    description:
      'Explicitly tests that the model can branch into alternative analyses and then merge them into a single recommendation.',
    problem: `For a high-traffic e-commerce API I'm torn between two caching approaches: (a) full-page CDN caching with purge hooks, and (b) fine-grained Redis caching inside the microservice layer. Could you walk me through the pros & cons of each, then decide which one (or a hybrid) we should implement?`,
    targetSkill: 'branching',
    difficulty: 'medium',
    expectedThoughtsMin: 6,
    expectedThoughtsMax: 12,
  },
];
