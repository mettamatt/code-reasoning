import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import type { Readable } from 'node:stream';
import { setTimeout as delay } from 'node:timers/promises';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { ContentBlock, PromptMessage } from '@modelcontextprotocol/sdk/types.js';

const serverEntry = path.resolve(process.cwd(), 'dist', 'index.js');
const testHomeDir = fs.mkdtempSync(path.join(process.cwd(), '.tmp-test-home-'));
const serverEnv = { ...process.env, HOME: testHomeDir };

if (!fs.existsSync(serverEntry)) {
  throw new Error(
    'Build output not found at dist/index.js. Run "npm run build" before executing regression tests.'
  );
}

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverEntry],
  stderr: 'pipe',
  env: serverEnv,
});

const client = new Client({
  name: 'mcp-regression-suite',
  version: '0.1.0',
});

let serverLog = '';

const isTextContent = (
  block: ContentBlock | undefined
): block is Extract<ContentBlock, { type: 'text'; text: string }> =>
  Boolean(block && block.type === 'text');

const stderrStream = transport.stderr as Readable | null;
if (stderrStream) {
  stderrStream.on('data', chunk => {
    serverLog += chunk.toString();
  });
}

before(async () => {
  try {
    await client.connect(transport);
  } catch (error) {
    throw new Error(`Failed to connect to server. Server stderr:\n${serverLog}\n${String(error)}`);
  }
});

after(async () => {
  await client.close();
  await transport.close();
  fs.rmSync(testHomeDir, { recursive: true, force: true });
});

test('does not emit stdout before MCP handshake', { concurrency: false }, async () => {
  const child = spawn(process.execPath, [serverEntry], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: serverEnv,
  });
  const childExit = once(child, 'exit');

  let stdoutLog = '';
  let stderrLog = '';
  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');
  child.stdout?.on('data', chunk => {
    stdoutLog += String(chunk);
  });
  child.stderr?.on('data', chunk => {
    stderrLog += String(chunk);
  });

  try {
    await delay(250);
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGTERM');
    }
    await childExit;
  }

  assert.strictEqual(
    stdoutLog.trim(),
    '',
    `Expected no stdout before handshake. stdout=${JSON.stringify(stdoutLog)} stderr=${JSON.stringify(stderrLog)}`
  );
});

test('connects successfully with --remote-logging enabled', { concurrency: false }, async () => {
  const remoteTransport = new StdioClientTransport({
    command: process.execPath,
    args: [serverEntry, '--remote-logging'],
    stderr: 'pipe',
    env: serverEnv,
  });
  const remoteClient = new Client({
    name: 'mcp-regression-suite-remote-logging',
    version: '0.1.0',
  });

  let remoteServerLog = '';
  const remoteStderr = remoteTransport.stderr as Readable | null;
  if (remoteStderr) {
    remoteStderr.on('data', chunk => {
      remoteServerLog += chunk.toString();
    });
  }

  try {
    await remoteClient.connect(remoteTransport);
    const { tools } = await remoteClient.listTools();
    const tool = tools.find(entry => entry.name === 'code-reasoning');
    assert.ok(
      tool,
      `expected code-reasoning tool with --remote-logging. stderr=${remoteServerLog}`
    );
  } finally {
    await remoteClient.close();
    await remoteTransport.close();
  }
});

test('lists the code-reasoning tool', { concurrency: false }, async () => {
  const { tools } = await client.listTools();
  assert.ok(Array.isArray(tools), 'tools response should be an array');
  const tool = tools.find(entry => entry.name === 'code-reasoning');
  assert.ok(tool, 'expected code-reasoning tool to be registered');
  assert.ok(tool.description && tool.description.includes('sequential thinking'));
});

test('processes a valid thought payload', { concurrency: false }, async () => {
  const result = await client.callTool({
    name: 'code-reasoning',
    arguments: {
      thought: 'Initial exploration of the regression harness.',
      thought_number: 1,
      total_thoughts: 3,
      next_thought_needed: true,
    },
  });

  assert.strictEqual(result.isError, false, `Unexpected tool error: ${serverLog}`);
  const blocks: ContentBlock[] = Array.isArray(result.content) ? result.content : [];
  const textBlock = blocks.find(isTextContent);
  assert.ok(textBlock, 'expected text content in tool response');
  const payload = JSON.parse(textBlock.text);
  assert.strictEqual(payload.status, 'processed');
  assert.strictEqual(payload.thought_number, 1);
  assert.strictEqual(payload.total_thoughts, 3);
  assert.ok(Array.isArray(payload.branches));
});

test('returns validation guidance for invalid payloads', { concurrency: false }, async () => {
  const result = await client.callTool({
    name: 'code-reasoning',
    arguments: {
      thought: '',
      thought_number: 0,
      total_thoughts: 0,
      next_thought_needed: true,
    },
  });

  assert.strictEqual(result.isError, true, 'expected tool error for invalid payload');
  const blocks: ContentBlock[] = Array.isArray(result.content) ? result.content : [];
  const textBlock = blocks.find(isTextContent);
  assert.ok(textBlock, 'expected text content in error response');
  const payload = JSON.parse(textBlock.text);
  assert.strictEqual(payload.status, 'failed');
  assert.match(payload.error, /Validation Error/);
  assert.match(payload.guidance, /thought/);
  assert.ok(payload.example, 'expected example payload guidance');
});

test(
  'exposes and applies bug-analysis prompt with persistence',
  { concurrency: false },
  async () => {
    const { prompts } = await client.listPrompts();
    assert.ok(prompts.length > 0, 'expected built-in prompts');
    const prompt = prompts.find(entry => entry.name === 'bug-analysis');
    assert.ok(prompt, 'expected bug-analysis prompt to be available');

    const promptResult = await client.getPrompt({
      name: 'bug-analysis',
      arguments: {
        bug_behavior: 'The CLI exits unexpectedly.',
        expected_behavior: 'The CLI should start the server.',
        affected_components: 'src/server.ts',
        working_directory: '/tmp/demo-project',
      },
    });

    assert.ok(Array.isArray(promptResult.messages), 'expected prompt messages array');
    const [firstMessage] = promptResult.messages as PromptMessage[];
    assert.ok(firstMessage, 'expected first prompt message');
    assert.strictEqual(firstMessage.role, 'user');
    assert.ok(isTextContent(firstMessage.content), 'expected text content in prompt result');
    assert.match(firstMessage.content.text, /Bug Analysis Process/);

    const completion = await client.complete({
      ref: { type: 'ref/prompt', name: 'bug-analysis' },
      argument: { name: 'working_directory', value: '' },
    });

    assert.ok(completion.completion, 'expected completion payload');
    assert.ok(Array.isArray(completion.completion.values));
    assert.ok(
      completion.completion.values.includes('/tmp/demo-project'),
      'expected stored working_directory completion'
    );
  }
);
