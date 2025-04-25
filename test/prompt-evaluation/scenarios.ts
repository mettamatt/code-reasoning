/**
 * Prompt Effectiveness Test Scenarios
 * 
 * This file contains test scenarios designed to evaluate how effectively
 * a model follows the instructions in the CODE_REASONING_TOOL prompt.
 * 
 * Each scenario targets a specific aspect of the prompt, such as:
 * - Understanding when to use branching
 * - Understanding when to use revisions
 * - Using parameters correctly
 * - Providing sufficiently deep thoughts
 * - Correctly completing reasoning chains
 */

export interface PromptScenario {
  id: string;
  name: string;
  description: string;
  problem: string;
  targetSkill: 'branching' | 'revision' | 'parameters' | 'depth' | 'completion' | 'multiple';
  difficulty: 'easy' | 'medium' | 'hard';
  expectedThoughtsMin: number;
  expectedThoughtsMax: number;
  evaluationCriteria: {
    criterion: string;
    description: string;
    maxScore: number;
  }[];
}

export const PROMPT_TEST_SCENARIOS: PromptScenario[] = [
  // Branching Understanding Scenario
  {
    id: 'branch-algorithm-selection',
    name: 'Algorithm Selection Problem',
    description: 'Tests whether the model understands when to use branching to explore multiple approaches.',
    problem: `
You need to implement a function to find the k most frequent elements in an array of integers. 
There are multiple valid approaches to this problem with different time and space complexity tradeoffs.

Please analyze the different possible approaches, considering factors like:
- Time complexity
- Space complexity
- Implementation difficulty
- Edge cases

Select the best approach for a general-purpose solution and explain your reasoning.
    `,
    targetSkill: 'branching',
    difficulty: 'medium',
    expectedThoughtsMin: 5,
    expectedThoughtsMax: 12,
    evaluationCriteria: [
      {
        criterion: 'Branch creation',
        description: 'Does the model create branches for different algorithmic approaches?',
        maxScore: 5
      },
      {
        criterion: 'Branch depth',
        description: 'Are branches developed sufficiently to evaluate their merits?',
        maxScore: 5
      },
      {
        criterion: 'Branch comparison',
        description: 'Does the model effectively compare the different approaches?',
        maxScore: 5
      },
      {
        criterion: 'Branch selection',
        description: 'Does the model select an approach with clear reasoning?',
        maxScore: 5
      }
    ]
  },

  // Revision Understanding Scenario
  {
    id: 'revision-bug-trap',
    name: 'Bug Identification Problem',
    description: 'Tests whether the model correctly uses revisions when it discovers an error in earlier reasoning.',
    problem: `
Review the following code snippet that's supposed to find the median of two sorted arrays:

\`\`\`javascript
function findMedianSortedArrays(nums1, nums2) {
  const merged = [];
  let i = 0, j = 0;
  
  // Merge arrays
  while (i < nums1.length && j < nums2.length) {
    if (nums1[i] < nums2[j]) {
      merged.push(nums1[i]);
      i++;
    } else {
      merged.push(nums2[j]);
      j++;
    }
  }
  
  // Add remaining elements
  while (i < nums1.length) {
    merged.push(nums1[i]);
    i++;
  }
  
  while (j < nums2.length) {
    merged.push(nums2[j]);
    j++;
  }
  
  // Find median
  const mid = Math.floor(merged.length / 2);
  if (merged.length % 2 === 0) {
    return (merged[mid - 1] + merged[mid]) / 2;
  } else {
    return merged[mid];
  }
}
\`\`\`

Analyze this code, identify any issues, and provide an improved solution.
    `,
    targetSkill: 'revision',
    difficulty: 'medium',
    expectedThoughtsMin: 5,
    expectedThoughtsMax: 10,
    evaluationCriteria: [
      {
        criterion: 'Issue identification',
        description: 'Does the model identify the key issues in the code?',
        maxScore: 5
      },
      {
        criterion: 'Revision usage',
        description: 'Does the model properly use the revision feature when it realizes an error in earlier thinking?',
        maxScore: 5
      },
      {
        criterion: 'Revision clarity',
        description: 'Are the revisions clear about what was incorrect and why?',
        maxScore: 5
      },
      {
        criterion: 'Solution quality',
        description: 'Does the final solution correctly address all identified issues?',
        maxScore: 5
      }
    ]
  },

  // Parameter Correctness Scenario
  {
    id: 'parameter-multi-stage',
    name: 'Multi-Stage Implementation',
    description: 'Tests whether the model uses the sequential thinking parameters correctly.',
    problem: `
You need to implement a URL shortening service with the following components:
1. A function to generate short codes from long URLs
2. A database schema to store the mappings
3. API endpoints for creating and resolving short URLs
4. Rate limiting to prevent abuse

Break this down into a step-by-step implementation plan, explaining your approach for each component.
    `,
    targetSkill: 'parameters',
    difficulty: 'medium',
    expectedThoughtsMin: 6,
    expectedThoughtsMax: 12,
    evaluationCriteria: [
      {
        criterion: 'Thought numbering',
        description: 'Does the model correctly increment thought_number with each thought?',
        maxScore: 5
      },
      {
        criterion: 'Total thoughts estimation',
        description: 'Does the model provide a reasonable estimate for total_thoughts and adjust if needed?',
        maxScore: 5
      },
      {
        criterion: 'Next thought needed',
        description: 'Does the model correctly use next_thought_needed=false only when reasoning is complete?',
        maxScore: 5
      },
      {
        criterion: 'Parameter consistency',
        description: 'Are parameters used consistently throughout the thinking process?',
        maxScore: 5
      }
    ]
  },

  // Thought Depth Scenario
  {
    id: 'depth-system-design',
    name: 'System Design Analysis',
    description: 'Tests whether the model provides sufficiently deep and detailed thoughts.',
    problem: `
Design a distributed file storage system similar to Dropbox or Google Drive. Your design should address:

- System architecture
- Data storage approach
- Synchronization mechanism
- Security considerations
- Scalability approach

Provide a comprehensive design with justifications for your choices.
    `,
    targetSkill: 'depth',
    difficulty: 'hard',
    expectedThoughtsMin: 8,
    expectedThoughtsMax: 15,
    evaluationCriteria: [
      {
        criterion: 'Thought comprehensiveness',
        description: 'Do individual thoughts cover multiple relevant aspects rather than just surface-level analysis?',
        maxScore: 5
      },
      {
        criterion: 'Technical depth',
        description: 'Does the model demonstrate deep technical understanding in its thoughts?',
        maxScore: 5
      },
      {
        criterion: 'Consideration of alternatives',
        description: 'Does the model consider multiple options within each thought?',
        maxScore: 5
      },
      {
        criterion: 'Edge case handling',
        description: 'Do thoughts address potential edge cases and failure modes?',
        maxScore: 5
      }
    ]
  },

  // Reasoning Completion Scenario
  {
    id: 'completion-debugging',
    name: 'Code Debugging Task',
    description: 'Tests whether the model correctly identifies when reasoning is complete.',
    problem: `
The following recursive function is supposed to calculate the nth Fibonacci number, but it's not working correctly:

\`\`\`javascript
function fibonacci(n) {
  if (n <= 0) return 0;
  if (n == 1) return 1;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Example usage:
console.log(fibonacci(5));  // Expected: 5
console.log(fibonacci(10)); // Expected: 55
console.log(fibonacci(40)); // Takes too long!
\`\`\`

Debug this function and provide an optimized solution that works efficiently for large values of n.
    `,
    targetSkill: 'completion',
    difficulty: 'easy',
    expectedThoughtsMin: 4,
    expectedThoughtsMax: 8,
    evaluationCriteria: [
      {
        criterion: 'Problem identification',
        description: 'Does the model correctly identify the problem?',
        maxScore: 5
      },
      {
        criterion: 'Solution development',
        description: 'Does the model develop a full solution before concluding?',
        maxScore: 5
      },
      {
        criterion: 'Appropriate termination',
        description: 'Does the model set next_thought_needed=false at the appropriate point?',
        maxScore: 5
      },
      {
        criterion: 'Premature termination avoidance',
        description: 'Does the model avoid concluding before fully addressing the problem?',
        maxScore: 5
      }
    ]
  },

  // Complex Multi-Skill Scenario
  {
    id: 'complex-compiler-optimization',
    name: 'Compiler Optimization Analysis',
    description: 'Tests multiple aspects of prompt understanding in a complex scenario.',
    problem: `
You're working on a compiler optimization pass that aims to reduce the memory usage of programs.
You need to identify various optimization techniques, analyze their tradeoffs, and develop an
implementation strategy.

Consider the following optimization techniques:
1. Register allocation
2. Dead store elimination
3. Memory-to-register promotion
4. Loop-invariant code motion
5. Common subexpression elimination

Analyze these techniques, and design an optimization pass that combines them effectively.
Identify potential conflicts between optimizations and how to resolve them.
    `,
    targetSkill: 'multiple',
    difficulty: 'hard',
    expectedThoughtsMin: 10,
    expectedThoughtsMax: 20,
    evaluationCriteria: [
      {
        criterion: 'Branching usage',
        description: 'Does the model effectively use branching to explore different optimization approaches?',
        maxScore: 5
      },
      {
        criterion: 'Revision application',
        description: 'Does the model revise earlier thoughts when discovering conflicts or better approaches?',
        maxScore: 5
      },
      {
        criterion: 'Parameter correctness',
        description: 'Does the model use parameters correctly throughout this complex reasoning chain?',
        maxScore: 5
      },
      {
        criterion: 'Thought depth',
        description: 'Are thoughts sufficiently detailed and technically sound?',
        maxScore: 5
      },
      {
        criterion: 'Reasoning completion',
        description: 'Does the model appropriately complete the reasoning when a comprehensive solution is reached?',
        maxScore: 5
      }
    ]
  }
];
