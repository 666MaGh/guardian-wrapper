import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { applyPlan, listFiles, hash } from '../dist/files.js';
import { planInstall, readInstallation } from '../dist/install.js';
import { prepareWorkflow, launchWorkflow } from '../dist/workflows.js';

const cli = resolve('dist/cli.js');
function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'guardian workflow ')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  applyPlan(planInstall(root, { groups: ['core'], graft: false, hosts: ['codex'] }));
  return root;
}
function snapshot(root) {
  return Object.fromEntries(listFiles(root).map(path => [path, hash(readFileSync(join(root, path)))]));
}
function run(root, ...args) {
  return spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8', timeout: 20000 });
}

test('orchestration is opt-in, configurable and retained across updates', t => {
  const root = fixture(t);
  assert.equal(readInstallation(root).profile.orchestration, false);
  assert.equal(run(root, 'orchestrate', '--task', 'Review login', '--dry-run').status, 1);
  assert.equal(run(root, 'config', 'orchestration', 'on').status, 0);
  assert.equal(readInstallation(root).profile.orchestration, true);
  assert.equal(run(root, 'update', '--dry-run').status, 0);
  const before = snapshot(root);
  const result = run(root, 'orchestrate', '--task', 'Review login', '--dry-run');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Would start codex Guardian orchestrate/);
  assert.deepEqual(snapshot(root), before);
  assert.equal(run(root, 'config', root, 'orchestration', 'off').status, 0);
  assert.equal(readInstallation(root).profile.orchestration, false);
});

test('old manifests migrate with orchestration disabled and preserve profile selections', t => {
  const root = fixture(t);
  const path = join(root, '.guardian/installation.json');
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  delete manifest.profile.orchestration;
  writeFileSync(path, JSON.stringify(manifest));
  assert.equal(readInstallation(root).profile.orchestration, false);
  applyPlan(planInstall(root, {}));
  assert.deepEqual(readInstallation(root).profile.hosts, ['codex']);
  assert.equal(readInstallation(root).profile.orchestration, false);
});

test('maintenance defaults to app; each scope previews without writing or starting a host', t => {
  const root = fixture(t);
  const before = snapshot(root);
  for (const scope of ['app', 'wrapper', 'skills', 'all']) {
    const result = run(root, 'maintain', '--scope', scope, '--dry-run');
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, new RegExp(`Requested dependency scope: ${scope}`));
  }
  assert.match(run(root, 'maintain', '--dry-run').stdout, /Requested dependency scope: app/);
  assert.deepEqual(snapshot(root), before);
});

test('invalid scope, unselected host, duplicate flags and noninteractive launch are refused', t => {
  const root = fixture(t);
  const before = snapshot(root);
  for (const args of [
    ['maintain', '--scope', 'everything', '--dry-run'],
    ['maintain', '--host', 'claude', '--dry-run'],
    ['maintain', '--scope', 'app', '--scope', 'skills', '--dry-run'],
    ['maintain', '--task', 'x', '--dry-run'],
    ['maintain'],
  ]) assert.equal(run(root, ...args).status, 1);
  assert.deepEqual(snapshot(root), before);
});

test('modified owned files prevent workflow launch', t => {
  const root = fixture(t);
  writeFileSync(join(root, '.agents/skills/guardian/SKILL.md'), 'User changes');
  const result = run(root, 'maintain', '--dry-run');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Resolve doctor findings first/);
});

test('interactive launch passes one literal prompt and project cwd, preserving host exit status', async t => {
  const root = fixture(t);
  const bin = join(root, 'test-bin');
  mkdirSync(bin);
  const capture = join(root, 'capture.json');
  writeFileSync(join(bin, 'codex'), `#!${process.execPath}\nimport fs from 'node:fs';\nif (process.argv[2] === '--version') process.exit(0);\nfs.writeFileSync(${JSON.stringify(capture)}, JSON.stringify({cwd: process.cwd(), args: process.argv.slice(2)}));\nprocess.exit(7);\n`, { mode: 0o755 });
  const oldPath = process.env.PATH;
  process.env.PATH = `${bin}:${oldPath}`;
  try {
    applyPlan(planInstall(root, { orchestration: true }));
    const task = 'Review $(touch should-not-exist) `touch other` and "quoted text"';
    const session = await prepareWorkflow('orchestrate', [root, '--task', task], true);
    assert.equal(await launchWorkflow(session), 7);
    const observed = JSON.parse(readFileSync(capture, 'utf8'));
    assert.equal(observed.cwd, root);
    assert.deepEqual(observed.args, [session.prompt]);
    assert.ok(session.prompt.includes(JSON.stringify(task)));
    assert.ok(!listFiles(root).includes('should-not-exist'));
    await assert.rejects(launchWorkflow({ ...session, dryRun: true }), /Cannot launch/);
  } finally { process.env.PATH = oldPath; }
});
