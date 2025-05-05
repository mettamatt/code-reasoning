/**
 * @fileoverview Prompt templates for code reasoning.
 *
 * This file defines a set of prompt templates specifically designed for
 * code reasoning tasks. All prompts support sequential thinking.
 */

import { PromptResult } from './types.js';
import { ReasoningPrompt, ReasoningType } from './reasoning-types.js';

/**
 * Collection of code reasoning prompts.
 * All prompts are reasoning-aware and support sequential thinking.
 */
export const CODE_REASONING_PROMPTS: Record<string, ReasoningPrompt> = {
  'bug-analysis': {
    name: 'bug-analysis',
    description: 'Systematic approach to analyzing and fixing bugs',
    reasoningType: ReasoningType.INITIALIZATION,
    thoughtTemplate: {
      format:
        '# Bug Analysis\n\nBug behavior: {{bug_behavior}}\nExpected behavior: {{expected_behavior}}\nAffected components: {{affected_components}}\n\nLet me analyze this systematically.',
      suggestedTotalThoughts: 6,
    },
    arguments: [
      {
        name: 'bug_behavior',
        description: 'Description of the observed bug behavior',
        required: true,
      },
      {
        name: 'expected_behavior',
        description: 'What should happen when working correctly',
        required: true,
      },
      {
        name: 'affected_components',
        description: 'Primary components affected by the bug',
        required: true,
      },
      {
        name: 'reproduction_steps',
        description: 'Steps to reproduce the bug',
        required: false,
      },
    ],
  },
  'feature-planning': {
    name: 'feature-planning',
    description: 'Structured approach to planning new feature implementation',
    reasoningType: ReasoningType.INITIALIZATION,
    thoughtTemplate: {
      format:
        '# Feature Planning\n\nProblem statement: {{problem_statement}}\nTarget users: {{target_users}}\nSuccess criteria: {{success_criteria}}\n\nLet me plan this feature systematically.',
      suggestedTotalThoughts: 7,
    },
    arguments: [
      {
        name: 'problem_statement',
        description: 'Clear statement of the problem this feature solves',
        required: true,
      },
      {
        name: 'target_users',
        description: 'Primary users who will benefit from this feature',
        required: true,
      },
      {
        name: 'success_criteria',
        description: 'How we will know the feature is successful',
        required: false,
      },
      {
        name: 'affected_components',
        description: 'Existing components that will need modification',
        required: false,
      },
    ],
  },
  'code-review': {
    name: 'code-review',
    description: 'Comprehensive template for code review',
    reasoningType: ReasoningType.INITIALIZATION,
    thoughtTemplate: {
      format:
        '# Code Review\n\nLet me review this code systematically:\n\n```{{language}}\n{{code}}\n```\n\nRequirements: {{requirements}}',
      suggestedTotalThoughts: 6,
    },
    arguments: [
      {
        name: 'code',
        description: 'Code to be reviewed',
        required: true,
      },
      {
        name: 'requirements',
        description: 'Requirements that the code should implement',
        required: false,
      },
      {
        name: 'language',
        description: 'Programming language of the code',
        required: false,
      },
    ],
  },
  'refactoring-plan': {
    name: 'refactoring-plan',
    description: 'Structured approach to code refactoring',
    reasoningType: ReasoningType.INITIALIZATION,
    thoughtTemplate: {
      format:
        '# Refactoring Plan\n\nCurrent issues: {{current_issues}}\nGoals: {{goals}}\n\nLet me develop a refactoring plan step by step.',
      suggestedTotalThoughts: 6,
    },
    arguments: [
      {
        name: 'current_issues',
        description: 'Issues in the current code that prompted refactoring',
        required: true,
      },
      {
        name: 'goals',
        description: 'Goals of the refactoring effort',
        required: true,
      },
    ],
  },
  'architecture-decision': {
    name: 'architecture-decision',
    description: 'Framework for making and documenting architecture decisions',
    reasoningType: ReasoningType.INITIALIZATION,
    thoughtTemplate: {
      format:
        '# Architecture Decision\n\nDecision context: {{decision_context}}\nConstraints: {{constraints}}\nOptions: {{options}}\n\nLet me evaluate this architectural decision systematically.',
      suggestedTotalThoughts: 7,
    },
    arguments: [
      {
        name: 'decision_context',
        description: 'The architectural decision that needs to be made',
        required: true,
      },
      {
        name: 'constraints',
        description: 'Constraints that impact the decision',
        required: false,
      },
      {
        name: 'options',
        description: 'Options being considered',
        required: false,
      },
    ],
  },
};

/**
 * Template implementation functions.
 * Each function takes a record of argument values and returns a prompt result.
 */
export const PROMPT_TEMPLATES: Record<string, (args: Record<string, string>) => PromptResult> = {
  'bug-analysis': args => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `# Bug Analysis Process

1. **Understand the reported behavior**
   - Bug behavior: ${args.bug_behavior || 'N/A'}
   - Reproduction steps: ${args.reproduction_steps || 'N/A'}

2. **Identify expected behavior**
   - Expected behavior: ${args.expected_behavior || 'N/A'}

3. **Isolate affected components**
   - Affected components: ${args.affected_components || 'N/A'}

4. **Form hypotheses**
   - What are potential root causes? List hypotheses in priority order.

5. **Test hypotheses**
   - How can we validate each hypothesis?
   - What experiments or tests will help confirm the cause?

6. **Propose fix**
   - Once cause is identified, what's the recommended fix?
   - What side effects might this fix have?
   - How can we verify the fix works?`,
        },
      },
    ],
  }),
  'feature-planning': args => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `# Feature Planning Process

1. **Feature Requirements**
   - Problem statement: ${args.problem_statement || 'N/A'}
   - Target users: ${args.target_users || 'N/A'}
   - Success criteria: ${args.success_criteria || 'N/A'}

2. **Architectural Considerations**
   - Affected components: ${args.affected_components || 'N/A'}
   - What new components might be needed?
   - Are there any API changes required?

3. **Implementation Strategy**
   - Break down the feature into implementation tasks
   - Identify dependencies between tasks
   - Estimate complexity and effort
   - Plan an implementation sequence

4. **Testing Strategy**
   - What unit tests will be needed?
   - What integration tests will be needed?
   - How will we validate user requirements are met?

5. **Risks and Mitigations**
   - What technical risks exist?
   - What product/user risks exist?
   - How can we mitigate each risk?

6. **Acceptance Criteria**
   - Define clear criteria for when this feature is complete
   - Include performance and quality expectations`,
        },
      },
    ],
  }),
  'code-review': args => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `# Code Review Template

1. **Code to Review**
\`\`\`${args.language || ''}
${args.code || ''}
\`\`\`

2. **Requirements**
${args.requirements || 'No specific requirements provided.'}

3. **Functionality Review**
   - Does the code correctly implement the requirements?
   - Are edge cases handled appropriately?
   - Is error handling sufficient and appropriate?

4. **Code Quality Review**
   - Is the code well-structured and maintainable?
   - Are functions/methods single-purpose and reasonably sized?
   - Are variable/function names clear and descriptive?
   - Is there adequate documentation where needed?

5. **Performance Review**
   - Are there any potential performance issues?
   - Are algorithms and data structures appropriate?
   - Are there any unnecessary computations or operations?

6. **Security Review**
   - Are there any security vulnerabilities?
   - Is user input validated and sanitized?
   - Are sensitive operations properly secured?

7. **Testing Review**
   - Is test coverage adequate?
   - Do tests cover edge cases and error conditions?
   - Are tests clear and maintainable?

8. **Summary and Recommendations**
   - Overall assessment
   - Key issues to address (prioritized)
   - Suggestions for improvement`,
        },
      },
    ],
  }),
  'refactoring-plan': args => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `# Refactoring Plan

1. **Current Code Assessment**
   - Current issues: ${args.current_issues || 'N/A'}
   - Goals: ${args.goals || 'N/A'}
   - What is working well and should be preserved?
   - What metrics indicate refactoring is needed (complexity, duplication, etc.)?

2. **Refactoring Goals**
   - What specific improvements are we targeting?
   - What measurable outcomes do we expect?

3. **Risk Analysis**
   - What functionality might be affected?
   - What are the testing implications?
   - What dependencies might be impacted?

4. **Refactoring Strategy**
   - Break down the refactoring into discrete steps
   - Prioritize steps for maximum impact with minimum risk
   - Plan for incremental testing between steps

5. **Testing Approach**
   - How will we verify behavior is preserved?
   - What regression tests are needed?
   - How will we validate improvements?

6. **Implementation Plan**
   - Sequence of changes
   - Estimated effort
   - Verification points`,
        },
      },
    ],
  }),
  'architecture-decision': args => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `# Architecture Decision Record

1. **Context**
   - Decision context: ${args.decision_context || 'N/A'}
   - Constraints: ${args.constraints || 'N/A'}
   - Options: ${args.options || 'N/A'}

2. **Options Considered**
   - What alternatives have we identified?
   - For each alternative:
     - What are its key characteristics?
     - What are its advantages?
     - What are its disadvantages?
     - What risks does it present?

3. **Decision Criteria**
   - What factors are most important for this decision?
   - How do we weigh different concerns (performance, maintainability, etc.)?

4. **Evaluation**
   - How does each option perform against our criteria?
   - What trade-offs does each option represent?

5. **Decision**
   - Which option do we select and why?
   - What were the key factors in this decision?

6. **Consequences**
   - What are the implications of this decision?
   - What becomes easier or harder as a result?
   - What new constraints does this create?
   - What follow-up decisions will be needed?`,
        },
      },
    ],
  }),
};
