import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, realpathSync, existsSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { discoverChats, selectChatContext } from '../dist/chats.js';
import { prepareMigration } from '../dist/migration.js';
import { prepareOnboarding } from '../dist/onboarding.js';
import { planInstall, planUninstall } from '../dist/install.js';
import { applyPlan } from '../dist/files.js';

const cli = resolve('dist/cli.js');
const options = { query: '', exports: [], source: 'all', select: [], dryRun: false };
function fixture(t) {
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'guardian chats ')));
  const root = join(base, 'project');
  mkdirSync(root);
  writeFileSync(join(root, 'README.md'), '# Existing rules\n');
  const codex = join(base, 'codex');
  const claude = join(base, 'claude');
  mkdirSync(join(codex, 'sessions'), { recursive: true });
  mkdirSync(join(claude, 'projects'), { recursive: true });
  const env = { ...process.env, CODEX_HOME: codex, CLAUDE_CONFIG_DIR: claude };
  const before = { CODEX_HOME: process.env.CODEX_HOME, CLAUDE_CONFIG_DIR: process.env.CLAUDE_CONFIG_DIR };
  process.env.CODEX_HOME = codex; process.env.CLAUDE_CONFIG_DIR = claude;
  t.after(() => {
    for (const [key, value] of Object.entries(before)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    rmSync(base, { recursive: true, force: true });
  });
  return { base, root, codex, claude, env };
}
function jsonl(path, rows) { writeFileSync(path, rows.map(row => JSON.stringify(row)).join('\n') + '\n'); }
function codexRows(root) {
  return [
    { type: 'session_meta', payload: { id: 'local-codex', cwd: root } },
    { type: 'response_item', payload: { type: 'message', role: 'developer', content: 'PRIVATE SYSTEM POLICY' } },
    { type: 'response_item', payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Puzzle offline play approved as intent' }] } },
    { type: 'response_item', payload: { type: 'message', role: 'assistant', channel: 'analysis', content: 'HIDDEN REASONING' } },
    { type: 'response_item', payload: { type: 'function_call_output', output: 'SECRET TOOL OUTPUT' } },
    { type: 'response_item', payload: { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Implementation remains unverified' }] } },
  ];
}
function chatgpt(name = 'Puzzle project') {
  return { id: 'web-gpt', title: name, current_node: 'chosen', mapping: {
    root: { parent: null, children: ['user'], message: { author: { role: 'system' }, content: { parts: ['SYSTEM WEB'] } } },
    user: { parent: 'root', children: ['chosen', 'abandoned'], message: { author: { role: 'user' }, content: { parts: ['Puzzle requirements'] } } },
    chosen: { parent: 'user', children: [], message: { author: { role: 'assistant' }, content: { parts: ['Chosen offline proposal'] } } },
    abandoned: { parent: 'user', children: [], message: { author: { role: 'assistant' }, content: { parts: ['Abandoned cloud plan'] } } },
  } };
}

test('local discovery ranks project association and selected evidence excludes internal/tool messages', t => {
  const { root, codex, claude } = fixture(t);
  const source = join(codex, 'sessions/one.jsonl');
  jsonl(source, codexRows(root));
  jsonl(join(claude, 'projects/two.jsonl'), [
    { type: 'user', sessionId: 'local-claude', cwd: '/other', message: { role: 'user', content: 'Puzzle brainstorming' } },
    { type: 'assistant', message: { role: 'assistant', content: [{ type: 'thinking', thinking: 'HIDDEN' }, { type: 'text', text: 'Tentative local tracker' }] } },
    { type: 'user', message: { role: 'user', content: [{ type: 'tool_result', content: 'TOOL ONLY' }] } },
  ]);
  const found = discoverChats(root, { ...options, query: 'puzzle' });
  assert.equal(found.candidates.length, 2);
  assert.equal(found.candidates[0].provider, 'codex');
  const context = selectChatContext(found.candidates, found.candidates.map(item => item.id));
  const body = context.content.toString();
  assert.match(body, /offline play approved as intent/);
  assert.match(body, /Tentative local tracker/);
  assert.match(body, /sourceSha256/);
  assert.doesNotMatch(body, /PRIVATE SYSTEM POLICY|HIDDEN REASONING|SECRET TOOL OUTPUT|TOOL ONLY/);
  assert.ok(!existsSync(join(root, '.guardian')));
  assert.deepEqual(discoverChats(root, { ...options, query: 'notfound' }).candidates, []);
});

test('ChatGPT exports follow the active branch, Claude exports filter tools, and text exports remain evidence', t => {
  const { base, root } = fixture(t);
  const gpt = join(base, 'gpt.json'); writeFileSync(gpt, JSON.stringify([chatgpt()]));
  const claude = join(base, 'claude.json'); writeFileSync(claude, JSON.stringify([{ uuid: 'web-claude', name: 'Puzzle', chat_messages: [
    { sender: 'human', text: 'Puzzle tracker tentative' },
    { sender: 'assistant', content: [{ type: 'text', text: 'Review before adopting' }, { type: 'tool_use', name: 'SECRET TOOL' }] },
  ] }]));
  const pasted = join(base, 'summary.md'); writeFileSync(pasted, '# Puzzle\nApproved intent, not observed code\n');
  const found = discoverChats(root, { ...options, source: 'exports', exports: [gpt, claude, pasted] });
  assert.equal(found.candidates.length, 3);
  const context = selectChatContext(found.candidates, found.candidates.map(item => item.id)).content.toString();
  assert.match(context, /Chosen offline proposal/);
  assert.match(context, /Review before adopting/);
  assert.match(context, /provided transcript/);
  assert.doesNotMatch(context, /Abandoned cloud plan|SYSTEM WEB|SECRET TOOL/);
});

test('unrecognized, malformed, ambiguous and symlink sources are reported without copying content', t => {
  const { base, root, codex } = fixture(t);
  writeFileSync(join(codex, 'sessions/broken.jsonl'), 'not json\n');
  const ambiguous = chatgpt(); delete ambiguous.current_node;
  const file = join(base, 'ambiguous.json'); writeFileSync(file, JSON.stringify([ambiguous]));
  const unknown = join(base, 'unknown.json'); writeFileSync(unknown, JSON.stringify({ not: 'a conversation' }));
  symlinkSync(unknown, join(codex, 'sessions/link.jsonl'));
  mkdirSync(join(codex, 'sessions/subagents')); jsonl(join(codex, 'sessions/subagents/agent.jsonl'), codexRows(root));
  const found = discoverChats(root, { ...options, exports: [file, unknown] });
  assert.equal(found.candidates.length, 0);
  assert.match(found.warnings.join('\n'), /Malformed JSONL/);
  assert.match(found.warnings.join('\n'), /Ambiguous ChatGPT branches/);
  assert.match(found.warnings.join('\n'), /Unrecognized conversation export/);
  assert.match(found.warnings.join('\n'), /Skipped symlink/);
  assert.ok(!existsSync(join(root, '.guardian')));
});

test('changed sources, duplicate/unknown selection and oversized packets stop before writes', t => {
  const { root, codex, base } = fixture(t);
  const path = join(codex, 'sessions/one.jsonl'); jsonl(path, codexRows(root));
  const found = discoverChats(root, options);
  const id = found.candidates[0].id;
  assert.throws(() => selectChatContext(found.candidates, [id, id]), /distinct/);
  assert.throws(() => selectChatContext(found.candidates, ['unknown']), /Unknown/);
  writeFileSync(path, readFileSync(path, 'utf8') + '\n');
  assert.throws(() => selectChatContext(found.candidates, [id]), /changed/);
  const large = join(base, 'large.txt'); writeFileSync(large, 'x'.repeat(1024 * 1024 + 1));
  const exported = discoverChats(root, { ...options, source: 'exports', exports: [large] });
  assert.throws(() => selectChatContext(exported.candidates, [exported.candidates[0].id]), /exceeds 1 MiB/);
  assert.ok(!existsSync(join(root, '.guardian')));
});

test('CLI browsing/dry-run is read-only; selection is private and never overwritten', t => {
  const { root, codex, env } = fixture(t);
  jsonl(join(codex, 'sessions/one.jsonl'), codexRows(root));
  const id = discoverChats(root, options).candidates[0].id;
  const run = flags => spawnSync(process.execPath, [cli, 'chats', root, ...flags], { encoding: 'utf8', env });
  assert.equal(run([]).status, 0);
  assert.equal(run(['--select', id, '--dry-run']).status, 0);
  assert.ok(!existsSync(join(root, '.guardian')));
  const result = run(['--select', id]); assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(join(root, '.guardian/.gitignore'), 'utf8'), 'chat-context.md\nmigration.md\n');
  const packet = readFileSync(join(root, '.guardian/chat-context.md'));
  assert.equal(run(['--select', id]).status, 1);
  assert.deepEqual(readFileSync(join(root, '.guardian/chat-context.md')), packet);
  assert.ok(!existsSync(join(root, '.guardian/installation.json')));
});

test('sampled discovery reports its coverage and refuses oversized sources at selection', t => {
  const { root, codex } = fixture(t);
  const path = join(codex, 'sessions/large.jsonl');
  const prefix = codexRows(root).map(row => JSON.stringify(row)).join('\n') + '\n';
  writeFileSync(path, prefix + ' '.repeat(64 * 1024 * 1024));
  const found = discoverChats(root, options);
  assert.equal(found.candidates.length, 1);
  assert.equal(found.candidates[0].sampled, true);
  assert.throws(() => selectChatContext(found.candidates, [found.candidates[0].id]), /exceeds 64 MiB/);
  assert.ok(!existsSync(join(root, '.guardian')));
});

test('invalid flags, duplicate export IDs and unsafe write destinations cannot apply context', t => {
  const { root, base, env } = fixture(t);
  for (const flags of [['--unknown'], ['--source', 'other'], ['--export'], ['extra']]) {
    const result = spawnSync(process.execPath, [cli, 'chats', root, ...flags], { encoding: 'utf8', env });
    assert.equal(result.status, 1);
    assert.ok(!existsSync(join(root, '.guardian')));
  }
  const path = join(base, 'duplicate.json'); writeFileSync(path, JSON.stringify([chatgpt(), chatgpt()]));
  const found = discoverChats(root, { ...options, source: 'exports', exports: [path] });
  assert.equal(found.candidates.length, 0);
  assert.match(found.warnings.join('\n'), /Duplicate conversation IDs/);
  const valid = join(base, 'valid.md'); writeFileSync(valid, '# Approved intent\n');
  const selected = discoverChats(root, { ...options, source: 'exports', exports: [valid] });
  const context = selectChatContext(selected.candidates, [selected.candidates[0].id]);
  symlinkSync(base, join(root, '.guardian'));
  assert.throws(() => prepareMigration([root], true, context), /Symlink/);
  assert.ok(!existsSync(join(base, 'chat-context.md')));
});

test('onboarding atomically prepares chosen chat evidence plus the existing migration brief', async t => {
  t.mock.method(console, 'log', () => {});
  const { base, root } = fixture(t);
  const file = join(base, 'gpt.json'); writeFileSync(file, JSON.stringify([chatgpt()]));
  const args = { ...options, source: 'exports', exports: [file] };
  const found = discoverChats(root, args);
  const id = found.candidates[0].id;
  const session = await prepareOnboarding([root, '--host', 'codex', '--chats', '--source', 'exports', '--export', file, '--select', id, '--dry-run'], false, cli);
  assert.equal(session.dryRun, true);
  assert.ok(!existsSync(join(root, '.guardian')));
  const context = selectChatContext(found.candidates, [id]);
  prepareMigration([root], true, context);
  const brief = readFileSync(join(root, '.guardian/migration.md'), 'utf8');
  assert.match(brief, /chat-context.md/);
  assert.doesNotMatch(brief, /Chosen offline proposal/);
  assert.equal(readFileSync(join(root, 'README.md'), 'utf8'), '# Existing rules\n');
  assert.throws(() => prepareMigration([root], true, context), /already exists/);
  applyPlan(planInstall(root, { groups: ['core'], graft: false }));
  applyPlan(planUninstall(root));
  assert.ok(existsSync(join(root, '.guardian/chat-context.md')));
  assert.equal(readFileSync(join(root, '.guardian/migration.md'), 'utf8'), brief);
});
