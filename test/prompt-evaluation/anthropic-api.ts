/**
 * Anthropic API integration for prompt evaluation
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ThoughtData } from './core/index.js';

// Get CODE_REASONING_TOOL description from server.ts
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverPath = path.join(__dirname, '../../src/server.ts');
let toolDescription = '';

try {
  const serverContent = fs.readFileSync(serverPath, 'utf8');
  const match = serverContent.match(/description: `([\s\S]+?)`,\s+inputSchema/);
  if (match && match[1]) {
    toolDescription = match[1].trim();
  }
} catch (error) {
  console.warn('Could not read tool description from server file.');
}

// Create prompt with sequential thinking instructions
function createPrompt(scenarioPrompt: string): string {
  return `
I'd like you to solve a problem using sequential thinking methodology. Break down your reasoning into explicit steps.

Here is the code reasoning tool description that explains the format to use:

${toolDescription}

Please solve the following problem using this sequential thinking format:

${scenarioPrompt}

For each thought, output a valid JSON object with the specified properties.
`;
}

// Extract thought records from response
function extractThoughtRecords(responseText: string): ThoughtData[] {
  const thoughtRecords: ThoughtData[] = [];
  
  // Try multiple patterns to find JSON objects
  const patterns = [
    // Standard JSON objects
    /{[\s\S]*?"thought"[\s\S]*?"thought_number"[\s\S]*?"total_thoughts"[\s\S]*?"next_thought_needed"[\s\S]*?}/g,
    // JSON inside code blocks
    /```(?:json)?\s*({[\s\S]*?"thought"[\s\S]*?"thought_number"[\s\S]*?"total_thoughts"[\s\S]*?"next_thought_needed"[\s\S]*?})\s*```/g
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
            needs_more_thoughts: data.needs_more_thoughts
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

// Interface for API options
interface ApiOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

// Send scenario to Claude and extract thought chain
export async function evaluateWithAPI(
  apiKey: string, 
  scenario: string, 
  options: ApiOptions = {}
) {
  const model = options.model || 'claude-3-sonnet-20240229';
  const maxTokens = options.maxTokens || 4000;
  const temperature = options.temperature || 0.3;
  
  try {
    // Dynamic import of Anthropic SDK
    const { Anthropic } = await import('@anthropic-ai/sdk');
    
    const client = new Anthropic({ apiKey });
    
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: "You solve complex problems by breaking them down into logical steps using sequential thinking.",
      messages: [
        { role: 'user', content: createPrompt(scenario) }
      ]
    });
    
    // Safely extract text from response
    let responseText = '';
    if (response.content && response.content.length > 0) {
      const content = response.content[0];
      if ('text' in content) {
        responseText = content.text;
      }
    }
    
    const thoughtChain = extractThoughtRecords(responseText);
    
    return {
      success: true,
      thoughtChain,
      rawResponse: responseText
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}