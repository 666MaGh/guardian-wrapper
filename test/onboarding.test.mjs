import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, realpathSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { prepareOnboarding } from '../dist/onboarding.js';

const cli = resolve('dist/cli.js');
function fixture(t) {
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'guardian onboarding ')));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const target = join(base, 'target');
  mkdirSync(target);
  writeFileSync(join(target, 'README.md'), '# Existing product\n');
  return { base, target };
}

function hostPath(base, hosts) {
  const bin = join(base, 'bin');
  mkdirSync(bin);
  for (const [name, exit] of hosts) writeFileSync(join(bin, name), `#!/bin/sh\nexit ${exit}\n`, { mode: 0o755 });
  return bin;
}

test('automatic discovery selects each sole working CLI without starting a provider in dry-run', t => {
  for (const host of ['claude', 'codex']) {
    const { base, target } = fixture(t);
    const bin = hostPath(base, [[host, 0]]);
    const result = spawnSync(process.execPath, [cli, 'onboard', target, '--dry-run'], { encoding: 'utf8', env: { ...process.env, PATH: bin } });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, new RegExp(`Would start ${host} onboarding`));
    assert.ok(!existsSync(join(target, '.guardian')));
  }
});

test('discovery reports installation help when no CLI works without writing a brief', t => {
  const { base, target } = fixture(t);
  const bin = hostPath(base, [['claude', 1]]);
  const result = spawnSync(process.execPath, [cli, 'onboard', target, '--dry-run'], { encoding: 'utf8', env: { ...process.env, PATH: bin } });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /No supported CLI found.*Install Claude Code.*Codex CLI.*sign in/s);
  assert.ok(!existsSync(join(target, '.guardian')));
});

test('ambiguous noninteractive discovery asks for an explicit host instead of guessing', t => {
  const { base, target } = fixture(t);
  const bin = hostPath(base, [['claude', 0], ['codex', 0]]);
  const result = spawnSync(process.execPath, [cli, 'onboard', target, '--dry-run'], { encoding: 'utf8', env: { ...process.env, PATH: bin } });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Both Claude Code and Codex CLI.*--host claude.*--host codex/);
  assert.ok(!existsSync(join(target, '.guardian')));
});

test('explicit host overrides discovery when both are available', t => {
  const { base, target } = fixture(t);
  const bin = hostPath(base, [['claude', 0], ['codex', 0]]);
  const result = spawnSync(process.execPath, [cli, 'onboard', target, '--host', 'codex', '--dry-run'], { encoding: 'utf8', env: { ...process.env, PATH: bin } });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Would start codex onboarding/);
  assert.doesNotMatch(result.stdout, /Choose onboarding client/);
  assert.ok(!existsSync(join(target, '.guardian')));
});

test('onboard dry-run previews questions and review without installing or launching a host', t => {
  const { target } = fixture(t);
  const result = spawnSync(process.execPath, [cli, 'onboard', target, '--host', 'codex', '--dry-run'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Would start codex onboarding/);
  assert.match(result.stdout, /ask the unresolved onboarding questions.*wait for my answers/);
  assert.match(result.stdout, /setup dry run.*approve applying/);
  assert.ok(!existsSync(join(target, '.guardian')));
});

test('host selection, invalid flags and noninteractive invocation fail before writes', t => {
  const { target } = fixture(t);
  for (const args of [[], ['--host', 'other'], ['--host', 'claude', '--host', 'codex'], ['--host', 'codex'], ['--host', 'codex', '--dry-run', '--unknown']]) {
    const result = spawnSync(process.execPath, [cli, 'onboard', target, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.ok(!existsSync(join(target, '.guardian')));
  }
});

test('onboarding prepares one brief and explicit resume preserves reviewed decisions', async t => {
  const { base, target } = fixture(t);
  const bin = join(base, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'codex'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  const beforePath = process.env.PATH;
  process.env.PATH = `${bin}:${beforePath}`;
  try {
    const first = await prepareOnboarding([target, '--host', 'codex', '--no-chats'], true, cli);
    assert.equal(first.root, target);
    const brief = join(target, '.guardian/migration.md');
    assert.ok(existsSync(brief));
    assert.equal(readFileSync(join(target, 'README.md'), 'utf8'), '# Existing product\n');
    assert.ok(!existsSync(join(target, '.guardian/installation.json')));
    await assert.rejects(prepareOnboarding([target, '--host', 'codex', '--no-chats'], true, cli), /already exists/);
    writeFileSync(brief, '# Reviewed decisions\nKeep CONTEXT.md\n');
    const resumed = await prepareOnboarding([target, '--host', 'codex', '--resume'], true, cli);
    assert.equal(resumed.root, target);
    assert.equal(readFileSync(brief, 'utf8'), '# Reviewed decisions\nKeep CONTEXT.md\n');
    await assert.rejects(prepareOnboarding([target, '--host', 'codex', '--resume', '--from-chat', 'new.md'], true, cli), /resume accepts/);
  } finally { process.env.PATH = beforePath; }
});
