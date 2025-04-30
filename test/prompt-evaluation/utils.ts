/**
 * Minimal utility functions for prompt evaluation
 */
import * as path from 'path';
import * as readline from 'readline';

// Get standard paths
export function getPaths() {
  // For ES modules, we need to use import.meta.url instead of __dirname
  const __filename = new URL(import.meta.url).pathname;
  const __dirname = path.dirname(__filename);

  const rootDir = path.resolve(__dirname, '../../../');
  const evaluationsDir = path.join(rootDir, 'test/prompt-evaluation');
  const reportsDir = path.join(evaluationsDir, 'reports');

  return { rootDir, evaluationsDir, reportsDir };
}

// Create readline interface
let rl: readline.Interface | null = null;
export function getReadline() {
  if (!rl) {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }
  return rl;
}

// Close readline
export function closeReadline() {
  if (rl) {
    rl.close();
    rl = null;
  }
}

// Prompt user for input
export function promptUser(question: string): Promise<string> {
  return new Promise(resolve => {
    getReadline().question(question, answer => {
      resolve(answer);
    });
  });
}

// Select item from a list
export async function selectFromList<T>(
  items: T[],
  labelFn: (item: T) => string,
  prompt: string,
  defaultIndex = 0
): Promise<T> {
  console.log(`\n${prompt}`);

  items.forEach((item, index) => {
    console.log(`${index + 1}. ${labelFn(item)}`);
  });

  const answer = await promptUser(`Enter selection (1-${items.length}) [${defaultIndex + 1}]: `);
  const selection = answer.trim() === '' ? defaultIndex : parseInt(answer) - 1;

  if (isNaN(selection) || selection < 0 || selection >= items.length) {
    console.log(`Invalid selection. Using default (${defaultIndex + 1}).`);
    return items[defaultIndex];
  }

  return items[selection];
}

// Format date for filenames and display
export function formatDate(date: Date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-').replace('T', '_').split('Z')[0];
}
