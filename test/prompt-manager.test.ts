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
