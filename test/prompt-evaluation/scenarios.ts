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

export interface PromptScenario {
  id: string;
  name: string;
  /** concise, human description of the scenario's goal */
  description: string;
  /** the user-visible prompt text */
  problem: string;
  targetSkill: 'branching' | 'revision' | 'parameters' | 'depth' | 'completion' | 'multiple';
  difficulty: 'easy' | 'medium' | 'hard';
  /** recommended thought-count range for grading heuristics */
  expectedThoughtsMin: number;
  expectedThoughtsMax: number;
  /** rubric items consumed by the automated metrics harness */
  evaluationCriteria: {
    criterion: string;
    description: string;
    maxScore: number;
  }[];
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
    evaluationCriteria: [
      {
        criterion: 'Branch creation',
        description: 'Creates distinct algorithm branches.',
        maxScore: 5,
      },
      {
        criterion: 'Branch depth',
        description: 'Develops each branch far enough for fair comparison.',
        maxScore: 5,
      },
      {
        criterion: 'Branch comparison',
        description: 'Compares trade-offs explicitly.',
        maxScore: 5,
      },
      {
        criterion: 'Branch selection',
        description: 'Chooses a final approach with clear justification.',
        maxScore: 5,
      },
    ],
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
    evaluationCriteria: [
      { criterion: 'Issue identification', description: 'Spots the logical bug.', maxScore: 5 },
      {
        criterion: 'Revision usage',
        description: 'Uses the revision flag on correction.',
        maxScore: 5,
      },
      {
        criterion: 'Revision clarity',
        description: 'Explains what was wrong and why.',
        maxScore: 5,
      },
      {
        criterion: 'Solution quality',
        description: 'Presents a correct & performant fix.',
        maxScore: 5,
      },
    ],
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
    evaluationCriteria: [
      {
        criterion: 'Thought numbering',
        description: 'Increments thought_number correctly.',
        maxScore: 5,
      },
      {
        criterion: 'Total thoughts estimation',
        description: 'Adjusts total_thoughts as needed.',
        maxScore: 5,
      },
      {
        criterion: 'Next thought needed',
        description: 'Ends chain only when complete.',
        maxScore: 5,
      },
      {
        criterion: 'Parameter consistency',
        description: 'Uses parameters uniformly.',
        maxScore: 5,
      },
    ],
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
    evaluationCriteria: [
      {
        criterion: 'Thought comprehensiveness',
        description: 'Addresses multiple facets per thought.',
        maxScore: 5,
      },
      { criterion: 'Technical depth', description: 'Shows deep understanding.', maxScore: 5 },
      {
        criterion: 'Consideration of alternatives',
        description: 'Evaluates multiple options.',
        maxScore: 5,
      },
      {
        criterion: 'Edge case handling',
        description: 'Discusses failure modes & edge cases.',
        maxScore: 5,
      },
    ],
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
    evaluationCriteria: [
      {
        criterion: 'Problem identification',
        description: 'Notes exponential blow-up.',
        maxScore: 5,
      },
      {
        criterion: 'Solution development',
        description: 'Produces full, optimised solutions.',
        maxScore: 5,
      },
      {
        criterion: 'Appropriate termination',
        description: 'Sets next_thought_needed=false at the right time.',
        maxScore: 5,
      },
      {
        criterion: 'Premature termination avoidance',
        description: 'Does not quit early.',
        maxScore: 5,
      },
    ],
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
    evaluationCriteria: [
      {
        criterion: 'Branching usage',
        description: 'Explores alternative optimisation orders.',
        maxScore: 5,
      },
      {
        criterion: 'Revision application',
        description: 'Revises upon finding conflicts.',
        maxScore: 5,
      },
      {
        criterion: 'Parameter correctness',
        description: 'Maintains JSON fields correctly.',
        maxScore: 5,
      },
      {
        criterion: 'Thought depth',
        description: 'Demonstrates compiler internals knowledge.',
        maxScore: 5,
      },
      {
        criterion: 'Reasoning completion',
        description: 'Converges on a coherent strategy.',
        maxScore: 5,
      },
    ],
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
    evaluationCriteria: [
      {
        criterion: 'Branch creation',
        description: 'Creates separate branches for CDN vs Redis.',
        maxScore: 5,
      },
      { criterion: 'Branch depth', description: 'Analyzes each strategy thoroughly.', maxScore: 5 },
      {
        criterion: 'Branch merge',
        description: 'Integrates insights and converges on a final pick.',
        maxScore: 5,
      },
      {
        criterion: 'Justification clarity',
        description: 'Explains why the chosen approach wins.',
        maxScore: 5,
      },
    ],
  },
];
