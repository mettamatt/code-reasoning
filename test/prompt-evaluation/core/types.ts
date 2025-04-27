/**
 * Core types for prompt evaluation
 */

import { PROMPT_TEST_SCENARIOS, PromptScenario } from '../scenarios.js';

// Record for a single thought in a reasoning chain
export interface ThoughtData {
  thought: string;
  thought_number: number;
  total_thoughts: number;
  next_thought_needed: boolean;
  is_revision?: boolean;
  revises_thought?: number;
  branch_from_thought?: number;
  branch_id?: string;
  needs_more_thoughts?: boolean;
}

/**
 * Result of validation checks on thought chain parameters
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Metrics describing the structure of a thought chain
 */
export interface StructureMetrics {
  totalThoughts: number;
  branchCount: number;
  revisionCount: number;
  maxDepth: number;
  completionStatus: 'complete' | 'incomplete' | 'aborted';
  branchStructure: {
    branchId: string;
    fromThought: number;
    thoughtCount: number;
    isMerged: boolean;
  }[];
}

/**
 * Combined objective metrics for a thought chain
 */
export interface ObjectiveMetrics {
  structureMetrics: StructureMetrics;
  validationResults: ValidationResult;
  parameterUsageScore: number; // 0-100 score for parameter correctness
}

// Score for a specific evaluation criterion
export interface EvaluationScore {
  criterionId: string;
  criterion: string;
  score: number;
  maxScore: number;
  notes?: string; // Now optional
  justification?: string; // Added for automated evaluation
}

// Complete evaluation for a scenario
export interface ScenarioEvaluation {
  scenarioId: string;
  scenarioName: string;
  evaluator: string;
  modelId: string;
  promptVariation: string;
  date: string;
  thoughtChain: ThoughtData[];
  scores: EvaluationScore[];
  totalScore: number;
  maxPossibleScore: number;
  percentageScore: number;
  comments: string;
  objectiveMetrics: ObjectiveMetrics; // Objective metrics for the evaluation
}

/**
 * Options for evaluation process
 */
export interface EvaluationOptions {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  promptVariation?: string;
  retryCount?: number; // Number of retry attempts for API failures
  forceAutomated?: boolean; // Force complete even with invalid API response
}

// Re-export scenarios
export { PROMPT_TEST_SCENARIOS, PromptScenario };
