import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PromptManager } from '../src/prompts/manager.js';

const createTempConfigDir = (): string => fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-manager-'));

test('merging stored values skips undeclared global arguments', () => {
  const tempDir = createTempConfigDir();

  try {
    const manager = new PromptManager(tempDir);

    manager.applyPrompt('architecture-decision', {
      decision_context: 'Assess logging strategy',
      working_directory: '/tmp/example-project',
    });

    let capturedArgs: Record<string, string> | undefined;

    manager.registerPrompt(
      {
        name: 'custom-no-working-dir',
        description: 'Custom prompt without working_directory argument',
        arguments: [],
      },
      args => {
        capturedArgs = args;
        return {
          messages: [
            {
              role: 'user',
              content: { type: 'text', text: 'custom-prompt-response' },
            },
          ],
        };
      }
    );

    assert.doesNotThrow(() => manager.applyPrompt('custom-no-working-dir'));
    assert.ok(capturedArgs, 'expected template to capture arguments');
    const recordedArgs = capturedArgs;
    assert.ok(
      !Object.prototype.hasOwnProperty.call(recordedArgs, 'working_directory'),
      'expected working_directory to be omitted when undeclared'
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('custom prompt arguments preserve literal braces', async () => {
  const tempDir = createTempConfigDir();

  try {
    const promptsDir = path.join(tempDir, 'prompts');
    fs.mkdirSync(promptsDir, { recursive: true });

    const customPrompt = {
      name: 'brace-sample',
      description: 'Prompt to verify braces survive sanitization',
      template: '{snippet}',
      arguments: [
        {
          name: 'snippet',
          description: 'Code snippet to inject',
          required: true,
        },
      ],
    };

    const promptPath = path.join(promptsDir, 'brace-sample.json');
    fs.writeFileSync(promptPath, JSON.stringify(customPrompt));

    const manager = new PromptManager(tempDir);
    await manager.loadCustomPrompts(promptsDir);

    const codeSample = 'function test() { return 42; }';
    const result = manager.applyPrompt('brace-sample', { snippet: codeSample });

    assert.equal(result.messages.length, 1, 'expected a single message');
    const [message] = result.messages;
    assert.equal(message.content.type, 'text', 'expected text content');
    assert.equal(message.content.text, codeSample, 'expected braces to remain intact');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
