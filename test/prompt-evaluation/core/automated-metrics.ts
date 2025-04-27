/**
 * Automated metrics for prompt evaluation
 *
 * This module implements objective metrics for thought chain evaluation,
 * calculating scores based on structural properties and parameter usage.
 */

import { ThoughtData, ValidationResult, StructureMetrics, ObjectiveMetrics } from './types.js';

/**
 * Main validation function - combines results from all validation checks
 */
export function validateParameters(thoughtChain: ThoughtData[]): ValidationResult {
  const results: ValidationResult[] = [
    validateRequiredFields(thoughtChain),
    validateThoughtNumbering(thoughtChain),
    validateRevisions(thoughtChain),
    validateBranches(thoughtChain),
  ];

  // Combine validation results
  return {
    isValid: results.every(r => r.isValid),
    errors: results.flatMap(r => r.errors),
    warnings: results.flatMap(r => r.warnings),
  };
}

/**
 * Validates that all thoughts have required fields
 */
function validateRequiredFields(thoughtChain: ThoughtData[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  thoughtChain.forEach((thought, index) => {
    // Check required fields
    if (thought.thought === undefined) {
      errors.push(`Thought #${index + 1} missing required field: thought`);
    }

    if (thought.thought_number === undefined) {
      errors.push(`Thought #${index + 1} missing required field: thought_number`);
    }

    if (thought.total_thoughts === undefined) {
      errors.push(`Thought #${index + 1} missing required field: total_thoughts`);
    }

    if (thought.next_thought_needed === undefined) {
      errors.push(`Thought #${index + 1} missing required field: next_thought_needed`);
    }

    // Check for empty thought content
    if (thought.thought && thought.thought.trim().length === 0) {
      warnings.push(`Thought #${index + 1} has empty thought content`);
    }

    // Check for unusually short thought content
    if (thought.thought && thought.thought.length < 20) {
      warnings.push(
        `Thought #${index + 1} has very short content (${thought.thought.length} chars)`
      );
    }
  });

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Validates thought numbering sequence and consistency
 */
function validateThoughtNumbering(thoughtChain: ThoughtData[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (thoughtChain.length === 0) {
    return { isValid: true, errors, warnings };
  }

  // Check if thought numbers start at 1
  if (thoughtChain.length > 0 && thoughtChain[0].thought_number !== 1) {
    errors.push(`First thought number should be 1, found ${thoughtChain[0].thought_number}`);
  }

  // Check for sequential numbering within the main chain
  const mainChainThoughts = thoughtChain.filter(t => !t.branch_id);
  for (let i = 1; i < mainChainThoughts.length; i++) {
    const current = mainChainThoughts[i];
    const previous = mainChainThoughts[i - 1];

    // If not a revision, check sequential numbering
    if (!current.is_revision && current.thought_number !== previous.thought_number + 1) {
      errors.push(
        `Non-sequential thought numbers in main chain: ${previous.thought_number} followed by ${current.thought_number}`
      );
    }
  }

  // Check for duplicate thought numbers
  const thoughtNumbers = thoughtChain.map(t => t.thought_number);
  const duplicates = thoughtNumbers.filter((num, index) => thoughtNumbers.indexOf(num) !== index);
  if (duplicates.length > 0) {
    // Filter for unique duplicates
    const uniqueDuplicates = [...new Set(duplicates)];
    uniqueDuplicates.forEach(num => {
      // Check if they're appropriately marked as revisions or branches
      const duplicateThoughts = thoughtChain.filter(t => t.thought_number === num);
      const revisionsOrBranches = duplicateThoughts.every(t => t.is_revision || t.branch_id);

      if (!revisionsOrBranches) {
        errors.push(`Duplicate thought number ${num} without proper revision or branch marking`);
      }
    });
  }

  // Check for reasonable total_thoughts values
  thoughtChain.forEach((thought, index) => {
    if (thought.total_thoughts < thought.thought_number) {
      errors.push(
        `Thought #${thought.thought_number} has total_thoughts (${thought.total_thoughts}) less than its own number`
      );
    }

    // Check if total_thoughts is much larger than actual chain length
    if (thought.total_thoughts > thoughtChain.length * 2 && index === thoughtChain.length - 1) {
      warnings.push(
        `Last thought estimates total_thoughts (${thought.total_thoughts}) much larger than actual count (${thoughtChain.length})`
      );
    }
  });

  // Check for multiple termination signals
  const terminatingThoughts = thoughtChain.filter(t => t.next_thought_needed === false);
  if (terminatingThoughts.length > 1) {
    // We need to be careful about branches here - it's okay for each branch to have a termination
    // Let's group by branch_id (null/undefined for main chain)
    const byBranch = new Map<string | null, ThoughtData[]>();

    terminatingThoughts.forEach(t => {
      const branchKey = t.branch_id || null;
      if (!byBranch.has(branchKey)) {
        byBranch.set(branchKey, []);
      }
      byBranch.get(branchKey)!.push(t);
    });

    // Check each branch (including main chain) for multiple terminations
    byBranch.forEach((thoughts, branchKey) => {
      if (thoughts.length > 1) {
        // Multiple terminations in the same branch (or main chain)
        const branchDesc = branchKey ? `branch ${branchKey}` : 'main chain';
        errors.push(
          `Multiple termination signals (${thoughts.length} occurrences of next_thought_needed=false) in ${branchDesc}`
        );
      }
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Validates correct usage of revisions
 */
function validateRevisions(thoughtChain: ThoughtData[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check revisions
  thoughtChain.forEach(thought => {
    if (thought.is_revision === true) {
      // Check that revises_thought is specified
      if (thought.revises_thought === undefined) {
        errors.push(
          `Thought #${thought.thought_number} marked as revision but missing revises_thought parameter`
        );
      } else {
        // Check that the referenced thought exists
        const revisedThought = thoughtChain.find(t => t.thought_number === thought.revises_thought);
        if (!revisedThought) {
          errors.push(
            `Thought #${thought.thought_number} revises non-existent thought #${thought.revises_thought}`
          );
        }
        // Check that revised thought comes before revision
        else if (
          revisedThought &&
          thoughtChain.indexOf(revisedThought) > thoughtChain.indexOf(thought)
        ) {
          errors.push(
            `Thought #${thought.thought_number} revises a future thought #${thought.revises_thought}`
          );
        }
      }
    } else if (thought.revises_thought !== undefined) {
      // Thought has revises_thought but is_revision is not true
      warnings.push(
        `Thought #${thought.thought_number} has revises_thought but is not marked as a revision`
      );
    }
  });

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Validates correct usage of branches
 */
function validateBranches(thoughtChain: ThoughtData[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check branch IDs and references
  const branchIds = new Set<string>();
  thoughtChain.forEach(thought => {
    if (thought.branch_id) {
      // Register new branch IDs
      if (!branchIds.has(thought.branch_id)) {
        branchIds.add(thought.branch_id);

        // Check that branch_from_thought exists
        if (thought.branch_from_thought === undefined) {
          errors.push(
            `First thought in branch ${thought.branch_id} missing branch_from_thought parameter`
          );
        } else {
          // Check that the referenced thought exists
          const branchFromThought = thoughtChain.find(
            t => t.thought_number === thought.branch_from_thought
          );
          if (!branchFromThought) {
            errors.push(
              `Branch ${thought.branch_id} references non-existent thought #${thought.branch_from_thought}`
            );
          }
          // Check that branched thought comes before branch
          else if (
            branchFromThought &&
            thoughtChain.indexOf(branchFromThought) > thoughtChain.indexOf(thought)
          ) {
            errors.push(
              `Branch ${thought.branch_id} references a future thought #${thought.branch_from_thought}`
            );
          }
        }
      } else {
        // For continuations of an existing branch, branch_from_thought should not be specified
        if (thought.branch_from_thought !== undefined) {
          warnings.push(
            `Thought #${thought.thought_number} in branch ${thought.branch_id} unnecessarily specifies branch_from_thought`
          );
        }
      }
    } else if (thought.branch_from_thought !== undefined) {
      // Thought has branch_from_thought but no branch_id
      warnings.push(`Thought #${thought.thought_number} has branch_from_thought but no branch_id`);
    }
  });

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Calculates structure metrics for a thought chain
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
 * Calculates a score for parameter usage correctness
 */
export function calculateParameterUsageScore(
  thoughtChain: ThoughtData[],
  validationResult: ValidationResult
): number {
  if (thoughtChain.length === 0) {
    return 0;
  }

  // Base score starts at 100
  let score = 100;

  // Deduct points for each error (more impactful)
  score -= validationResult.errors.length * 10;

  // Deduct fewer points for warnings
  score -= validationResult.warnings.length * 3;

  // Check for consistent use of branch_id
  const branchesPresent = thoughtChain.some(t => t.branch_id);
  const branchesConsistent =
    branchesPresent &&
    thoughtChain
      .filter(t => t.branch_id)
      .every(
        t =>
          t.branch_from_thought ||
          // After the first thought in a branch, branch_from_thought is not required
          thoughtChain.some(
            prev =>
              prev.branch_id === t.branch_id && thoughtChain.indexOf(prev) < thoughtChain.indexOf(t)
          )
      );

  if (branchesPresent && !branchesConsistent) {
    score -= 15; // Inconsistent branch usage
  }

  // Check for proper termination
  const properlyTerminated =
    thoughtChain.length > 0 &&
    thoughtChain.some(
      t =>
        t.thought_number === Math.max(...thoughtChain.map(t => t.thought_number)) &&
        t.next_thought_needed === false
    );

  if (!properlyTerminated) {
    score -= 20; // Failed to properly terminate chain
  }

  // Check for appropriate total_thoughts adjustments
  let adjustedTotal = false;
  for (let i = 1; i < thoughtChain.length; i++) {
    if (thoughtChain[i].total_thoughts !== thoughtChain[i - 1].total_thoughts) {
      adjustedTotal = true;
      break;
    }
  }

  if (!adjustedTotal && thoughtChain.length >= 5) {
    score -= 5; // Did not adjust total_thoughts estimate
  }

  // Apply bounds to the score (0-100)
  return Math.max(0, Math.min(100, score));
}

/**
 * Main function to get all objective metrics for a thought chain
 */
export function getObjectiveMetrics(thoughtChain: ThoughtData[]): ObjectiveMetrics {
  const validationResults = validateParameters(thoughtChain);
  const structureMetrics = calculateStructureMetrics(thoughtChain);
  const parameterUsageScore = calculateParameterUsageScore(thoughtChain, validationResults);

  return {
    structureMetrics,
    validationResults,
    parameterUsageScore,
  };
}
