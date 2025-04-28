/**
 * Automated pass/fail metrics for prompt evaluation
 *
 * This module implements simple boolean checks for thought chain evaluation,
 * replacing the older percentage-based system with direct pass/fail criteria.
 */

import { ThoughtData, ValidationChecks, StructureMetrics, PromptScenario } from './types.js';

/**
 * Main validation function - performs pass/fail checks
 */
export function validateThoughtChain(
  thoughtChain: ThoughtData[],
  scenario: PromptScenario
): ValidationChecks {
  // Implement simple, direct checks that return boolean results
  return {
    // Base checks for all scenarios
    hasRequiredParameters: checkRequiredParameters(thoughtChain),
    hasSequentialNumbering: checkSequentialNumbering(thoughtChain),
    hasProperTermination: checkProperTermination(thoughtChain),

    // Conditional checks based on scenario type
    hasBranchingWhenRequired:
      scenario.targetSkill === 'branching' ? checkBranching(thoughtChain) : true,

    hasRevisionWhenRequired:
      scenario.targetSkill === 'revision' ? checkRevision(thoughtChain) : true,

    // Additional checks for specific skills
    hasMultipleSkills:
      scenario.targetSkill === 'multiple' ? checkMultipleSkills(thoughtChain) : true,

    hasDepth:
      scenario.targetSkill === 'depth'
        ? checkThoughtDepth(thoughtChain, scenario.expectedThoughtsMin)
        : true,

    hasProperCompletion:
      scenario.targetSkill === 'completion' ? checkCompletion(thoughtChain) : true,
  };
}

/**
 * Check for required parameters in all thoughts
 */
function checkRequiredParameters(thoughtChain: ThoughtData[]): boolean {
  // Return true only if ALL thoughts have the required parameters
  return thoughtChain.every(
    thought =>
      thought.thought !== undefined &&
      thought.thought_number !== undefined &&
      thought.total_thoughts !== undefined &&
      thought.next_thought_needed !== undefined &&
      thought.thought.trim().length > 0
  );
}

/**
 * Check for sequential numbering across all thoughts
 */
function checkSequentialNumbering(thoughtChain: ThoughtData[]): boolean {
  if (thoughtChain.length === 0) return true;

  // First thought should be 1
  if (thoughtChain[0].thought_number !== 1) return false;

  // Build an array of just the thought_number values, sorted
  const allThoughtNumbers = thoughtChain.map(t => t.thought_number).sort((a, b) => a - b);

  // Check for duplicates
  for (let i = 1; i < allThoughtNumbers.length; i++) {
    if (allThoughtNumbers[i] === allThoughtNumbers[i - 1]) {
      return false; // Duplicate thought number
    }
  }

  // Check for gaps (non-sequential numbers)
  for (let i = 1; i < allThoughtNumbers.length; i++) {
    if (allThoughtNumbers[i] !== allThoughtNumbers[i - 1] + 1) {
      return false; // Gap in sequence
    }
  }

  return true;
}

/**
 * Check for proper termination (last thought has next_thought_needed = false)
 */
function checkProperTermination(thoughtChain: ThoughtData[]): boolean {
  if (thoughtChain.length === 0) return false;

  // Find the last thought in the chain (highest thought_number)
  const lastThought = [...thoughtChain].sort((a, b) => b.thought_number - a.thought_number)[0];

  // Check if it properly terminates
  return lastThought.next_thought_needed === false;
}

/**
 * Check for branching when required
 */
function checkBranching(thoughtChain: ThoughtData[]): boolean {
  // At least one thought should have branch_id and branch_from_thought
  const hasBranch = thoughtChain.some(
    thought => thought.branch_id !== undefined && thought.branch_from_thought !== undefined
  );

  // Check that branches are formed correctly
  if (hasBranch) {
    const branches: Record<string, ThoughtData[]> = {};

    // Group thoughts by branch_id
    thoughtChain.forEach(thought => {
      if (thought.branch_id) {
        if (!branches[thought.branch_id]) {
          branches[thought.branch_id] = [];
        }
        branches[thought.branch_id].push(thought);
      }
    });

    // Check each branch
    for (const branchId in branches) {
      const branchThoughts = branches[branchId];

      // First thought in branch should have branch_from_thought
      if (!branchThoughts[0].branch_from_thought) {
        return false;
      }

      // branch_from_thought should exist and come before the branch
      const branchFrom = branchThoughts[0].branch_from_thought;
      const sourceThought = thoughtChain.find(t => t.thought_number === branchFrom);

      if (!sourceThought) {
        return false;
      }

      // The branch should come after the source thought
      if (thoughtChain.indexOf(sourceThought) > thoughtChain.indexOf(branchThoughts[0])) {
        return false;
      }
    }
  }

  return hasBranch;
}

/**
 * Check for revisions when required
 */
function checkRevision(thoughtChain: ThoughtData[]): boolean {
  // At least one thought should have is_revision = true and revises_thought
  const hasRevision = thoughtChain.some(
    thought => thought.is_revision === true && thought.revises_thought !== undefined
  );

  // Check that revisions are formed correctly
  if (hasRevision) {
    const revisionThoughts = thoughtChain.filter(t => t.is_revision === true);

    for (const revision of revisionThoughts) {
      // revises_thought should exist and come before the revision
      const revisesThought = revision.revises_thought;
      const targetThought = thoughtChain.find(t => t.thought_number === revisesThought);

      if (!targetThought) {
        return false;
      }

      // The revision should come after the target thought
      if (thoughtChain.indexOf(targetThought) > thoughtChain.indexOf(revision)) {
        return false;
      }
    }
  }

  return hasRevision;
}

/**
 * Check for multiple skills (both branching and revision)
 */
function checkMultipleSkills(thoughtChain: ThoughtData[]): boolean {
  return checkBranching(thoughtChain) && checkRevision(thoughtChain);
}

/**
 * Check for thought depth (minimum number of thoughts)
 */
function checkThoughtDepth(thoughtChain: ThoughtData[], minThoughts: number): boolean {
  return thoughtChain.length >= minThoughts;
}

/**
 * Check for proper completion (enough thoughts and proper termination)
 */
function checkCompletion(thoughtChain: ThoughtData[]): boolean {
  // Must have proper termination
  if (!checkProperTermination(thoughtChain)) return false;

  // Must not terminate too early (at least a few thoughts)
  return thoughtChain.length >= 4;
}

/**
 * Calculate structure metrics for a thought chain (for informational purposes)
 */
export function calculateStructureMetrics(thoughtChain: ThoughtData[]): StructureMetrics {
  if (thoughtChain.length === 0) {
    return {
      totalThoughts: 0,
      branchCount: 0,
      revisionCount: 0,
      maxDepth: 0,
      completionStatus: 'incomplete',
      branchStructure: [],
    };
  }

  // Count revisions
  const revisionCount = thoughtChain.filter(t => t.is_revision === true).length;

  // Get unique branch IDs
  const branchIds = new Set<string>();
  thoughtChain.forEach(t => t.branch_id && branchIds.add(t.branch_id));
  const branchCount = branchIds.size;

  // Find maximum thought depth
  const maxDepth = Math.max(...thoughtChain.map(t => t.thought_number));

  // Determine completion status
  let completionStatus: 'complete' | 'incomplete' | 'aborted' = 'incomplete';
  const lastThought = [...thoughtChain].sort((a, b) => b.thought_number - a.thought_number)[0];

  if (lastThought && lastThought.thought_number > 20) {
    completionStatus = 'aborted'; // Exceeded max thoughts
  } else if (lastThought && lastThought.next_thought_needed === false) {
    completionStatus = 'complete'; // Properly terminated
  }

  // Analyze branch structure
  const branchStructure: Array<{
    branchId: string;
    fromThought: number;
    thoughtCount: number;
    isMerged: boolean;
  }> = [];

  branchIds.forEach(branchId => {
    const branchThoughts = thoughtChain.filter(t => t.branch_id === branchId);
    if (branchThoughts.length > 0) {
      const fromThought = branchThoughts[0].branch_from_thought || 0;
      const lastBranchThought = branchThoughts[branchThoughts.length - 1];
      // A branch is considered merged if its last thought has next_thought_needed = false
      const isMerged = lastBranchThought.next_thought_needed === false;

      branchStructure.push({
        branchId,
        fromThought,
        thoughtCount: branchThoughts.length,
        isMerged,
      });
    }
  });

  return {
    totalThoughts: thoughtChain.length,
    branchCount,
    revisionCount,
    maxDepth,
    completionStatus,
    branchStructure,
  };
}

/**
 * Get detailed failure message for a specific check
 */
export function getFailureDetail(
  checkName: string,
  thoughts: ThoughtData[],
  scenario: PromptScenario
): string {
  switch (checkName) {
    case 'hasRequiredParameters': {
      const missingParams = thoughts
        .map((thought, idx) => {
          const missing = [];
          if (thought.thought === undefined || thought.thought.trim().length === 0)
            missing.push('thought');
          if (thought.thought_number === undefined) missing.push('thought_number');
          if (thought.total_thoughts === undefined) missing.push('total_thoughts');
          if (thought.next_thought_needed === undefined) missing.push('next_thought_needed');
          return missing.length > 0 ? `Thought #${idx + 1} missing: ${missing.join(', ')}` : null;
        })
        .filter(Boolean);

      return missingParams.length > 0
        ? `Missing required parameters: ${missingParams.join('; ')}`
        : 'Missing required parameters in one or more thoughts';
    }

    case 'hasSequentialNumbering': {
      // Get all thought numbers and sort them
      const allThoughtNumbers = thoughts.map(t => t.thought_number).sort((a, b) => a - b);

      // Check for duplicates
      for (let i = 1; i < allThoughtNumbers.length; i++) {
        if (allThoughtNumbers[i] === allThoughtNumbers[i - 1]) {
          return `Duplicate thought number: ${allThoughtNumbers[i]}`;
        }
      }

      // Check for gaps
      for (let i = 1; i < allThoughtNumbers.length; i++) {
        if (allThoughtNumbers[i] !== allThoughtNumbers[i - 1] + 1) {
          return `Gap in thought numbers: ${allThoughtNumbers[i - 1]} followed by ${allThoughtNumbers[i]}`;
        }
      }

      return 'Non-sequential thought numbering';
    }

    case 'hasProperTermination':
      return 'Missing proper termination (last thought must have next_thought_needed=false)';

    case 'hasBranchingWhenRequired':
      return 'Missing branching in a scenario that requires it (use branch_id and branch_from_thought)';

    case 'hasRevisionWhenRequired':
      return 'Missing revision in a scenario that requires it (use is_revision=true and revises_thought)';

    case 'hasMultipleSkills': {
      const hasBranches = thoughts.some(t => t.branch_id);
      const hasRevisions = thoughts.some(t => t.is_revision);
      if (!hasBranches && !hasRevisions) {
        return 'Missing both branching and revision in a multiple-skills scenario';
      } else if (!hasBranches) {
        return 'Missing branching in a multiple-skills scenario';
      } else if (!hasRevisions) {
        return 'Missing revision in a multiple-skills scenario';
      }
      return 'Incorrect implementation of multiple skills';
    }

    case 'hasDepth':
      return `Insufficient thought depth (has ${thoughts.length}, needs at least ${scenario.expectedThoughtsMin})`;

    case 'hasProperCompletion':
      return 'Improper completion (either terminated too early or missing termination)';

    default:
      return `Check failed: ${checkName}`;
  }
}

/**
 * Get required checks for a scenario
 */
export function getRequiredChecks(scenario: PromptScenario): string[] {
  // Base checks required for all scenarios
  const baseChecks = ['hasRequiredParameters', 'hasSequentialNumbering', 'hasProperTermination'];

  // Add scenario-specific checks
  switch (scenario.targetSkill) {
    case 'branching':
      baseChecks.push('hasBranchingWhenRequired');
      break;

    case 'revision':
      baseChecks.push('hasRevisionWhenRequired');
      break;

    case 'multiple':
      baseChecks.push('hasMultipleSkills');
      break;

    case 'depth':
      baseChecks.push('hasDepth');
      break;

    case 'completion':
      baseChecks.push('hasProperCompletion');
      break;
  }

  return baseChecks;
}
