/**
 * Thought Extraction Test
 *
 * This script tests that the extraction function correctly identifies properly
 * formatted JSON thought objects and rejects improperly formatted ones. It's useful
 * for verifying that changes to the extraction logic don't break existing functionality.
 *
 * It provides a standalone implementation of the extraction function used in anthropic-api.ts
 * and tests it against sample valid and invalid JSON formats.
 *
 * Usage:
 * - Run with: ts-node test/prompt-evaluation/extraction-test.ts
 *
 * This is useful for:
 * - Testing the extraction logic without making API calls
 * - Verifying changes to the extraction function
 * - Documenting expected input/output formats
 */

import { fileURLToPath } from 'url';
import { ThoughtData } from './core/types.js';

/**
 * Extract thought records from Claude's response text
 *
 * This is a standalone version of the function in anthropic-api.ts
 * for testing purposes.
 *
 * @param responseText - The raw text response from Claude
 * @returns Array of thought data objects
 */
export function extractThoughtRecords(responseText: string): ThoughtData[] {
  const thoughtRecords: ThoughtData[] = [];

  // Try multiple patterns to find JSON objects
  const patterns = [
    // Standard JSON objects
    /{[\s\S]*?"thought"[\s\S]*?"thought_number"[\s\S]*?"total_thoughts"[\s\S]*?"next_thought_needed"[\s\S]*?}/g,
    // JSON inside code blocks
    /```(?:json)?\s*({[\s\S]*?"thought"[\s\S]*?"thought_number"[\s\S]*?"total_thoughts"[\s\S]*?"next_thought_needed"[\s\S]*?})\s*```/g,
  ];

  for (const pattern of patterns) {
    const matches = responseText.match(pattern) || [];
    for (const match of matches) {
      try {
        // Extract the JSON part if it's in a code block
        const jsonText = match.startsWith('```')
          ? match.replace(/```(?:json)?\s*([\s\S]*?)\s*```/, '$1')
          : match;

        const data = JSON.parse(jsonText);

        // Validate required fields
        if (
          typeof data.thought === 'string' &&
          typeof data.thought_number === 'number' &&
          typeof data.total_thoughts === 'number' &&
          typeof data.next_thought_needed === 'boolean'
        ) {
          thoughtRecords.push({
            thought: data.thought,
            thought_number: data.thought_number,
            total_thoughts: data.total_thoughts,
            next_thought_needed: data.next_thought_needed,
            is_revision: data.is_revision,
            revises_thought: data.revises_thought,
            branch_from_thought: data.branch_from_thought,
            branch_id: data.branch_id,
            needs_more_thoughts: data.needs_more_thoughts,
          });
        }
      } catch (error) {
        console.warn('Failed to parse thought record:', match);
      }
    }
  }

  // Sort by thought_number
  thoughtRecords.sort((a, b) => a.thought_number - b.thought_number);
  return thoughtRecords;
}

/**
 * Run extraction tests with sample data
 */
function runExtractionTests(): void {
  // Test with valid format
  const TEST_RESPONSE_VALID = `
  {
    "thought": "First, I need to understand the problem requirements.",
    "thought_number": 1,
    "total_thoughts": 5,
    "next_thought_needed": true
  }

  {
    "thought": "Next, I'll analyze the different approaches to solving this.",
    "thought_number": 2,
    "total_thoughts": 5,
    "next_thought_needed": true
  }
  `;

  // Test with invalid format (missing required fields)
  const TEST_RESPONSE_INVALID = `
  {
    "thought": "First, I need to understand the problem requirements.",
    "reasoning": "Breaking this down into steps.",
    "questions": "What approaches can we use for each step?"
  }

  {
    "thought": "Next, I'll analyze the different approaches to solving this.",
    "reasoning": "There are several ways to approach this problem."
  }
  `;

  // Test both formats
  console.log('=== Testing Valid Format ===');
  const validThoughts = extractThoughtRecords(TEST_RESPONSE_VALID);
  console.log('Number of thoughts found:', validThoughts.length);
  console.log('Thoughts:', JSON.stringify(validThoughts, null, 2));

  console.log('\n=== Testing Invalid Format ===');
  const invalidThoughts = extractThoughtRecords(TEST_RESPONSE_INVALID);
  console.log('Number of thoughts found:', invalidThoughts.length);
  console.log('Thoughts:', JSON.stringify(invalidThoughts, null, 2));

  // If the test shows the extraction is working, we can be confident the API evaluator will work
  if (validThoughts.length === 2 && invalidThoughts.length === 0) {
    console.log(
      '\nSUCCESS: The extraction function correctly identifies valid format and rejects invalid format!'
    );
    console.log('Our changes should work when run with the API evaluator.');
  } else {
    console.log('\nFAILURE: The extraction function is not working as expected.');
  }
}

// Run the tests if this file is executed directly
if (import.meta.url === `file://${fileURLToPath(import.meta.url)}`) {
  runExtractionTests();
}

// Export for potential programmatic use
export { runExtractionTests };
