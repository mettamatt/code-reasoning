/**
 * Core types for prompt evaluation - Pass/Fail System
 */

import { PROMPT_TEST_SCENARIOS } from '../scenarios.js';

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

// New pass/fail result type
export type TestStatus = 'PASS' | 'FAIL';

// Check result for specific test criteria
export interface CheckResult {
  name: string;
  passed: boolean;
  details?: string;
}

// Overall test result for a scenario
export interface TestResult {
  scenarioId: string;
  scenarioName: string;
  status: TestStatus;
  checks: CheckResult[];
  failureMessage?: string; // Primary failure reason if failed
  thoughtChain: ThoughtData[];
  date: string;
  modelId: string;
  promptVariation: string;
}

// Standard templates to guide the model
export interface ThoughtTemplates {
  mainChain: string;
  branching: string;
  revision: string;
  continuation: string; // For subsequent thoughts in branches
}

// Extension to PromptScenario interface
export interface PromptScenarioWithChecks extends PromptScenario {
  requiredTemplates: ('mainChain' | 'branching' | 'revision')[];
  requiredChecks: string[]; // List of check IDs that must pass
}

// Replace the current ValidationResult with more direct checks
export interface ValidationChecks {
  hasRequiredParameters: boolean;
  hasSequentialNumbering: boolean;
  hasBranchingWhenRequired: boolean;
  hasRevisionWhenRequired: boolean;
  hasProperTermination: boolean;
  [key: string]: boolean; // Allow for additional scenario-specific checks
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

// Import PromptScenario from the scenarios file
import { PromptScenario } from '../scenarios.js';

// Re-export scenarios
export { PROMPT_TEST_SCENARIOS, PromptScenario };
