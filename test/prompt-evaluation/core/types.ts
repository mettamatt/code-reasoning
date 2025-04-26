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

// Score for a specific evaluation criterion
export interface EvaluationScore {
  criterionId: string;
  criterion: string;
  score: number;
  maxScore: number;
  notes: string;
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
}

// Re-export scenarios
export { PROMPT_TEST_SCENARIOS, PromptScenario };
