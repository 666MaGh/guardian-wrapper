import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, symlinkSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { hash, listFiles } from '../dist/files.js';
import { applyPlan } from '../dist/files.js';
import { planInstall, planUninstall, installationProblems } from '../dist/install.js';

const cli = resolve('dist/cli.js');
function fixture(t) {
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'guardian migration ')));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  for (const name of ['target', 'source']) mkdirSync(join(base, name));
  return { base, target: join(base, 'target'), source: join(base, 'source') };
}
function run(args, cwd) {
  return spawnSync(process.execPath, [cli, 'migrate', ...args], { cwd, encoding: 'utf8', timeout: 10000 });
}
function inventory(text) {
  return JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)[1]);
}

test('migration prepares scoped source/chat references and questions without importing or editing existing documents', t => {
  const { base, target, source } = fixture(t);
  writeFileSync(join(base, 'AGENTS.md'), '# Inherited policy\n');
  writeFileSync(join(target, 'AGENTS.md'), '# Target rules\n');
  writeFileSync(join(target, 'CLAUDE.md'), '# Host rules\n');
  writeFileSync(join(target, 'README.md'), '# Usage\n');
  mkdirSync(join(target, 'apps/mobile'), { recursive: true });
  writeFileSync(join(target, 'apps/mobile/AGENTS.md'), '# Mobile-only constraints\n');
  writeFileSync(join(source, 'CONTEXT.md'), '# Existing glossary\n');
  const chat = join(base, 'handoff.md');
  writeFileSync(chat, '# Reviewed conversation\nPrivate source material is not copied.\n');
  const before = Object.fromEntries(listFiles(target).map(path => [path, readFileSync(join(target, path))]));
  const result = run([target, '--from-project', source, '--from-chat', chat], target);
  assert.equal(result.status, 0, result.stderr);
  const brief = readFileSync(join(target, '.guardian/migration.md'), 'utf8');
  const inputs = inventory(brief);
  assert.equal(inputs.chat.sha256, hash(readFileSync(chat)));
  assert.equal(inputs.source.documents[0].path, join(source, 'CONTEXT.md'));
  assert.ok(inputs.target.documents.some(doc => doc.path.endsWith('apps/mobile/AGENTS.md')));
  assert.ok(inputs.target.inheritedInstructions.some(doc => doc.path === join(base, 'AGENTS.md')));
  assert.doesNotMatch(brief, /Private source material is not copied/);
  assert.match(brief, /Purpose.*Transfer scope/s);
  assert.match(brief, /approve this concrete proposal/);
  for (const [path, bytes] of Object.entries(before)) assert.deepEqual(readFileSync(join(target, path)), bytes);
  assert.equal(readFileSync(join(source, 'CONTEXT.md'), 'utf8'), '# Existing glossary\n');
  assert.ok(!existsSync(join(target, '.guardian/installation.json')));
});

test('migration dry run is read-only and supports in-place adoption without an external source', t => {
  const { target } = fixture(t);
  writeFileSync(join(target, 'README.md'), '# Existing app\n');
  const result = run(['--dry-run'], target);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(inventory(result.stdout).source, null);
  assert.equal(inventory(result.stdout).chat, null);
  assert.deepEqual(listFiles(target), ['README.md']);
});

test('preparing another migration never overwrites a user-edited brief', t => {
  const { target } = fixture(t);
  assert.equal(run([target], target).status, 0);
  const path = join(target, '.guardian/migration.md');
  writeFileSync(path, '# My reviewed decisions\n');
  const result = run([target], target);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /already exists/);
  assert.equal(readFileSync(path, 'utf8'), '# My reviewed decisions\n');
});

test('migration ignores dependency/vendor skills and reports symlinks rather than following them', t => {
  const { target, source } = fixture(t);
  for (const path of ['node_modules/package', '.claude/skills/vendor', '.agents/skills/vendor', 'apps/sub/.claude/skills/vendor']) {
    mkdirSync(join(target, path), { recursive: true });
    writeFileSync(join(target, path, 'README.md'), '# Not project context\n');
  }
  mkdirSync(join(target, '.claude/rules'), { recursive: true });
  writeFileSync(join(target, '.claude/rules/testing.md'), '# Scoped testing rules\n');
  mkdirSync(join(target, 'apps/sub/.claude/commands'), { recursive: true });
  writeFileSync(join(target, 'apps/sub/.claude/commands/check.md'), '# Scoped command\n');
  writeFileSync(join(source, 'README.md'), '# Other project\n');
  symlinkSync(join(source, 'README.md'), join(target, 'README.md'));
  const result = run([target, '--dry-run'], target);
  assert.equal(result.status, 0, result.stderr);
  const inputs = inventory(result.stdout);
  assert.deepEqual(inputs.target.skippedSymlinks, ['README.md']);
  assert.deepEqual(inputs.target.documents.map(doc => doc.path), [join(target, '.claude/rules/testing.md'), join(target, 'apps/sub/.claude/commands/check.md')]);
});

test('migration rejects invalid/missing flags, binary/oversized chat inputs and unsafe destinations before writes', t => {
  const { base, target } = fixture(t);
  const file = join(base, 'chat.txt');
  for (const args of [[target, '--from-chat'], [target, '--unknown'], [target, 'extra'], [target, '--from-project', target, '--from-project', target]]) {
    assert.equal(run(args, target).status, 1);
    assert.ok(!existsSync(join(target, '.guardian')));
  }
  writeFileSync(file, Buffer.from([0, 1, 2]));
  assert.match(run([target, '--from-chat', file], target).stderr, /text context/);
  writeFileSync(file, Buffer.alloc(1024 * 1024 + 1, 65));
  assert.match(run([target, '--from-chat', file], target).stderr, /1 MiB/);
  symlinkSync(base, join(target, '.guardian'));
  assert.match(run([target], target).stderr, /Symlink/);
});

test('a prepared migration survives init/update/uninstall and leaves an existing installation intact', t => {
  const { target } = fixture(t);
  const options = { groups: ['core'], graft: false };
  applyPlan(planInstall(target, options));
  const before = readFileSync(join(target, '.guardian/installation.json'));
  assert.equal(run([target], target).status, 0);
  assert.deepEqual(readFileSync(join(target, '.guardian/installation.json')), before);
  assert.deepEqual(installationProblems(target), []);
  assert.equal(planInstall(target, options).changes.length, 0);
  const brief = readFileSync(join(target, '.guardian/migration.md'));
  applyPlan(planUninstall(target));
  assert.deepEqual(readFileSync(join(target, '.guardian/migration.md')), brief);
});
