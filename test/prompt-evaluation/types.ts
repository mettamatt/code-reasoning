/**
 * Essential types for prompt evaluation
 */
import { PromptScenario } from './scenarios.js';

// Core thought data structure
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

// Test result status
export type TestStatus = 'PASS' | 'FAIL';

// Result for a specific parameter check
export interface CheckResult {
  name: string;
  passed: boolean;
  details?: string;
}

// Overall test result
export interface TestResult {
  scenarioId: string;
  scenarioName: string;
  status: TestStatus;
  checks: CheckResult[];
  failureMessage?: string;
  thoughtChain: ThoughtData[];
  date: string;
  modelId: string;
  temperature?: number;
  qualityScore?: number;
  qualityJustification?: string;

  // Prompts used in the evaluation (for standalone reports)
  promptName: string;
  corePrompt: string;
  systemPrompt: string;
  scenarioPrompt: string;
  scenarioDetails: PromptScenario;
}

// API options
export interface ApiOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  retryCount?: number;
}

// Re-export scenario type
export { PromptScenario };
