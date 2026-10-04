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

test('onboarding prepares one brief and explicit resume preserves reviewed decisions', t => {
  const { base, target } = fixture(t);
  const bin = join(base, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'codex'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  const beforePath = process.env.PATH;
  process.env.PATH = `${bin}:${beforePath}`;
  try {
    const first = prepareOnboarding([target, '--host', 'codex'], true, cli);
    assert.equal(first.root, target);
    const brief = join(target, '.guardian/migration.md');
    assert.ok(existsSync(brief));
    assert.equal(readFileSync(join(target, 'README.md'), 'utf8'), '# Existing product\n');
    assert.ok(!existsSync(join(target, '.guardian/installation.json')));
    assert.throws(() => prepareOnboarding([target, '--host', 'codex'], true, cli), /already exists/);
    writeFileSync(brief, '# Reviewed decisions\nKeep CONTEXT.md\n');
    const resumed = prepareOnboarding([target, '--host', 'codex', '--resume'], true, cli);
    assert.equal(resumed.root, target);
    assert.equal(readFileSync(brief, 'utf8'), '# Reviewed decisions\nKeep CONTEXT.md\n');
    assert.throws(() => prepareOnboarding([target, '--host', 'codex', '--resume', '--from-chat', 'new.md'], true, cli), /resume accepts/);
  } finally { process.env.PATH = beforePath; }
});
