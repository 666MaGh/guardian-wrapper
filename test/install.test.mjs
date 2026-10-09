import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { applyPlan, listFiles, hash } from '../dist/files.js';
import { planInstall, planUninstall, readInstallation, selectProfile, installationProblems, startMarker } from '../dist/install.js';
import { exportPlugin } from '../dist/plugin.js';
import { version } from '../dist/bundle.js';

const cli = resolve('dist/cli.js');
const core = { groups: ['core'], graft: false };

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'guardian project '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function run(args, options = {}) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', timeout: 60000, ...options });
}

function snapshot(root) {
  return Object.fromEntries(listFiles(root).map(path => [path, hash(readFileSync(join(root, path)))]));
}

test('a new project gets both hosts, core skills and default ADHD; repeated init is idempotent', t => {
  const root = fixture(t);
  applyPlan(planInstall(root, core));
  assert.equal(readInstallation(root).profile.adhd, true);
  for (const host of ['.claude', '.agents']) {
    assert.ok(existsSync(join(root, host, 'skills/guardian-main/SKILL.md')));
    assert.ok(existsSync(join(root, host, 'skills/guardian-icm-architect/LICENSE')));
    assert.ok(existsSync(join(root, host, 'skills/guardian-karpathy-guidelines/SKILL.md')));
    assert.ok(existsSync(join(root, host, 'skills/guardian-karpathy-guidelines/LICENSE')));
  }
  assert.match(readFileSync(join(root, 'CLAUDE.md'), 'utf8'), /@AGENTS\.md/);
  assert.match(readFileSync(join(root, 'AGENTS.md'), 'utf8'), /communication\.md/);
  assert.equal(planInstall(root, {}).changes.length, 0);
  assert.deepEqual(installationProblems(root), []);
});

test('existing instructions are preserved through init, profile changes and uninstall', t => {
  const root = fixture(t);
  const original = Buffer.from('# My rules\nNever alter production credentials.\n');
  writeFileSync(join(root, 'AGENTS.md'), original);
  writeFileSync(join(root, 'CLAUDE.md'), '@import "AGENTS.md"\n');
  applyPlan(planInstall(root, core));
  applyPlan(planInstall(root, { adhd: false }));
  assert.equal(readInstallation(root).profile.adhd, false);
  assert.doesNotMatch(readFileSync(join(root, 'AGENTS.md'), 'utf8'), /ADHD format is active/);
  applyPlan(planUninstall(root));
  assert.deepEqual(readFileSync(join(root, 'AGENTS.md')), original);
  assert.equal(readFileSync(join(root, 'CLAUDE.md'), 'utf8'), '@import "AGENTS.md"\n');
  assert.ok(!existsSync(join(root, '.guardian/installation.json')));
  assert.ok(!existsSync(join(root, '.agents/skills/guardian-main/SKILL.md')));
});

test('user edits outside managed blocks survive re-init and uninstall', t => {
  const root = fixture(t);
  writeFileSync(join(root, 'AGENTS.md'), '# Original rules\n');
  applyPlan(planInstall(root, core));
  writeFileSync(join(root, 'AGENTS.md'), readFileSync(join(root, 'AGENTS.md'), 'utf8') + '\n# Newly approved user rule\n');
  applyPlan(planInstall(root, { adhd: false }));
  applyPlan(planUninstall(root));
  const restored = readFileSync(join(root, 'AGENTS.md'), 'utf8');
  assert.match(restored, /Original rules/);
  assert.match(restored, /Newly approved user rule/);
  assert.doesNotMatch(restored, /guardian-wrapper:start/);
});

test('editing a skill blocks update and uninstall without altering the project', t => {
  const root = fixture(t);
  applyPlan(planInstall(root, core));
  const path = join(root, '.agents/skills/guardian-main/SKILL.md');
  writeFileSync(path, readFileSync(path, 'utf8') + '\nUser customization\n');
  const before = snapshot(root);
  assert.throws(() => planInstall(root, { adhd: false }), /Owned file modified/);
  assert.throws(() => planUninstall(root), /Owned file modified/);
  assert.deepEqual(snapshot(root), before);
  assert.ok(installationProblems(root).some(error => error.includes('Owned file modified')));
});

test('editing the managed instruction block blocks changes', t => {
  const root = fixture(t);
  applyPlan(planInstall(root, core));
  const path = join(root, 'AGENTS.md');
  writeFileSync(path, readFileSync(path, 'utf8').replace('TypeScript:', 'Typescript edited:'));
  assert.throws(() => planInstall(root, core), /Managed block modified/);
});

test('an unmanaged matching skill is not silently claimed', t => {
  const root = fixture(t);
  mkdirSync(join(root, '.agents/skills/guardian-main'), { recursive: true });
  writeFileSync(join(root, '.agents/skills/guardian-main/SKILL.md'), 'My Guardian');
  const before = snapshot(root);
  assert.throws(() => planInstall(root, core), /Existing unmanaged file/);
  assert.deepEqual(snapshot(root), before);
});

test('extra files in selected skill directories stop installation', t => {
  const root = fixture(t);
  applyPlan(planInstall(root, core));
  writeFileSync(join(root, '.agents/skills/guardian-main/custom.md'), 'Leave this alone');
  assert.throws(() => planInstall(root, {}), /Unmanaged skill file/);
});

test('symlink and case-collision destinations are refused before writes', t => {
  const root = fixture(t);
  const outside = fixture(t);
  symlinkSync(outside, join(root, '.agents'));
  assert.throws(() => planInstall(root, core), /Symlink destination/);
  assert.deepEqual(listFiles(outside), []);
  const other = fixture(t);
  writeFileSync(join(other, 'agents.md'), 'Unrelated case');
  assert.throws(() => planInstall(other, core), /Case collision/);
  assert.equal(listFiles(other).length, 1);
});

test('malformed managed markers and invalid manifests are refused', t => {
  const root = fixture(t);
  writeFileSync(join(root, 'AGENTS.md'), `${startMarker}\nIncomplete`);
  assert.throws(() => planInstall(root, core), /Malformed Guardian markers/);
  const other = fixture(t);
  mkdirSync(join(other, '.guardian'));
  writeFileSync(join(other, '.guardian/installation.json'), '{"schema":99}');
  assert.throws(() => planInstall(other, core), /Unsupported installation manifest/);
});

test('a concurrent edit after planning is preserved and stops all writes', t => {
  const root = fixture(t);
  const plan = planInstall(root, core);
  writeFileSync(join(root, 'AGENTS.md'), 'Another editor saved this');
  assert.throws(() => applyPlan(plan), /Concurrent edit/);
  assert.deepEqual(listFiles(root), ['AGENTS.md']);
});

test('a failed transaction rolls back its own writes', t => {
  const root = fixture(t);
  writeFileSync(join(root, 'user.txt'), 'Original');
  const change = { path: 'nested/new.txt', before: null, after: Buffer.from('Generated') };
  const plan = { root, installation: null, changes: [change, change] };
  assert.throws(() => applyPlan(plan), /Concurrent edit/);
  assert.deepEqual(listFiles(root), ['user.txt']);
  assert.equal(readFileSync(join(root, 'user.txt'), 'utf8'), 'Original');
});

test('an active installation lock prevents simultaneous installs', t => {
  const root = fixture(t);
  const plan = planInstall(root, core);
  mkdirSync(join(root, '.guardian'));
  writeFileSync(join(root, '.guardian/install.lock'), 'Locked');
  assert.throws(() => applyPlan(plan), /EEXIST/);
  assert.deepEqual(listFiles(root), ['.guardian/install.lock']);
});

test('group and individual choices select the full catalog or minimal core', () => {
  assert.equal(selectProfile({ groups: ['all'] }).skills.length, 42);
  assert.equal(selectProfile({ groups: ['core'], skills: ['tdd'] }).skills.length, 5);
  assert.equal(selectProfile({}).skills.length, 31);
  assert.throws(() => selectProfile({ skills: ['missing'] }), /Unknown skill/);
  assert.throws(() => selectProfile({ groups: ['typo'] }), /Unknown group/);
  assert.throws(() => selectProfile({ graft: false, watch: true }), /Watch requires graft/);
});

test('deselecting a host removes only its previously owned skills', t => {
  const root = fixture(t);
  applyPlan(planInstall(root, { ...core, skills: ['tdd'] }));
  applyPlan(planInstall(root, { hosts: ['codex'], groups: ['core'] }));
  assert.ok(!existsSync(join(root, '.claude/skills/guardian-main/SKILL.md')));
  assert.ok(!existsSync(join(root, '.agents/skills/guardian-tdd/SKILL.md')));
  assert.ok(existsSync(join(root, '.agents/skills/guardian-main/SKILL.md')));
  assert.match(readFileSync(join(root, 'CLAUDE.md'), 'utf8'), /@AGENTS\.md/);
});

test('CLI dry-run does not write and project bootstrap controls ADHD', t => {
  const root = fixture(t);
  const preview = run(['init', root, '--groups', 'core', '--dry-run']);
  assert.equal(preview.status, 0, preview.stderr);
  assert.deepEqual(listFiles(root), []);
  assert.match(preview.stdout, /no writes, downloads/);
  assert.equal(run(['init', root, '--groups', 'core', '--graft', 'off']).status, 0);
  const configured = spawnSync(process.execPath, [join(root, '.guardian/bin/guardian.mjs'), 'config', root, 'adhd', 'off'], { encoding: 'utf8', timeout: 20000 });
  assert.equal(configured.status, 0, configured.stderr);
  assert.equal(readInstallation(root).profile.adhd, false);
  assert.equal(run(['doctor', root]).status, 0);
  const implicitRoot = run(['config', 'adhd', 'on'], { cwd: root });
  assert.equal(implicitRoot.status, 0, implicitRoot.stderr);
  assert.equal(readInstallation(root).profile.adhd, true);
});

test('a full Claude plugin export includes all skills and project-aware ADHD hook', t => {
  const root = fixture(t);
  const destination = join(root, 'nested', 'plugin');
  exportPlugin(destination, selectProfile({ groups: ['all'] }));
  const manifest = JSON.parse(readFileSync(join(destination, '.claude-plugin/plugin.json'), 'utf8'));
  assert.equal(manifest.name, 'guardian-wrapper');
  assert.equal(listFiles(join(destination, 'skills')).filter(path => path.endsWith('/SKILL.md')).length, 42);
  assert.ok(existsSync(join(destination, 'skills/guardian-implement-spec/agents/openai.yaml')));
  const fresh = spawnSync(process.execPath, [join(destination, 'hooks/session-start.mjs')], { cwd: root, encoding: 'utf8' });
  assert.equal(fresh.status, 0);
  assert.match(JSON.parse(fresh.stdout).hookSpecificOutput.additionalContext, /Lead with the next action/);
  mkdirSync(join(root, '.guardian'));
  writeFileSync(join(root, '.guardian/config.json'), '{"adhd":false}');
  const projectProfile = spawnSync(process.execPath, [join(destination, 'hooks/session-start.mjs')], { cwd: root, encoding: 'utf8' });
  assert.equal(projectProfile.stdout, '');
  assert.throws(() => exportPlugin(destination, selectProfile({})), /EEXIST/);
});

test('real graft build finds project symbols; add, rename and delete stay current', t => {
  const root = fixture(t);
  writeFileSync(join(root, 'app.ts'), 'export function greet(name: string): string { return `Hello ${name}`; }\nexport function main(): string { return greet("Ada"); }\n');
  const initialized = run(['init', root, '--groups', 'core', '--watch']);
  assert.equal(initialized.status, 0, initialized.stderr);
  assert.ok(existsSync(join(root, 'graft/INDEX.md')));
  assert.match(readFileSync(join(root, 'graft/.graph/wiring.json'), 'utf8'), /greet/);
  const callers = run(['graft', root, 'callers', 'greet']);
  assert.equal(callers.status, 0, callers.stderr);
  assert.match(callers.stdout, /main/);
  writeFileSync(join(root, 'extra.ts'), 'export function addedSymbol(): number { return 7; }\n');
  const events = run(['watch-events', root], { input: join(root, 'extra.ts') + '\0' });
  assert.equal(events.status, 0, events.stderr);
  assert.match(readFileSync(join(root, 'graft/.graph/wiring.json'), 'utf8'), /addedSymbol/);
  rmSync(join(root, 'extra.ts'));
  writeFileSync(join(root, 'renamed.ts'), 'export function renamedSymbol(): number { return 8; }\n');
  const rebuild = run(['graft', root, 'build']);
  assert.equal(rebuild.status, 0, rebuild.stderr);
  const graph = readFileSync(join(root, 'graft/.graph/wiring.json'), 'utf8');
  assert.match(graph, /renamedSymbol/);
  assert.doesNotMatch(graph, /addedSymbol/);
  const implicitRoot = run(['graft', 'build'], { cwd: root });
  assert.equal(implicitRoot.status, 0, implicitRoot.stderr);
});

test('unsafe graft commands/output overrides are rejected', t => {
  const root = fixture(t);
  assert.notEqual(run(['graft', root, 'init']).status, 0);
  assert.notEqual(run(['graft', root, 'build', '--dir', '/tmp/elsewhere']).status, 0);
  assert.notEqual(run(['graft', root, 'build', '/tmp/elsewhere']).status, 0);
  assert.notEqual(run(['watch-events', root], { input: '/partial' }).status, 0);
});

test('an npm-style symlink entrypoint runs the CLI', t => {
  const root = fixture(t);
  const executable = join(root, 'guardian-wrapper');
  symlinkSync(cli, executable);
  const result = spawnSync(process.execPath, [executable, '--version'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), version);
});

test('the actual sh/fswatch pipeline observes editor changes without a Git parent', { skip: spawnSync('fswatch', ['--version'], { stdio: 'ignore' }).status !== 0 }, async t => {
  const root = fixture(t);
  writeFileSync(join(root, 'editor.ts'), 'export function beforeEdit(): string { return "before"; }\n');
  const initialized = run(['init', root, '--groups', 'core', '--watch']);
  assert.equal(initialized.status, 0, initialized.stderr);
  const watcher = spawn('bash', [join(root, 'scripts/watch-graft.sh'), root], { detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => {
    try { process.kill(-watcher.pid, 'SIGTERM'); } catch { /* Already stopped. */ }
  });
  let stderr = '';
  watcher.stderr.on('data', chunk => { stderr += chunk.toString(); });
  await delay(1500);
  assert.equal(watcher.exitCode, null, stderr);
  writeFileSync(join(root, 'editor.ts'), 'export function afterEditorSave(): string { return "after"; }\n');
  const deadline = Date.now() + 12000;
  while (!readFileSync(join(root, 'graft/.graph/wiring.json'), 'utf8').includes('afterEditorSave')) {
    assert.ok(Date.now() < deadline, `Watcher did not rebuild: ${stderr}`);
    await delay(200);
  }
  assert.doesNotMatch(readFileSync(join(root, 'graft/.graph/wiring.json'), 'utf8'), /beforeEdit/);
});

test('add-skills opts into guardian-audit without replacing an existing profile', t => {
  const root = fixture(t);
  applyPlan(planInstall(root, { hosts: ['codex'], graft: false, adhd: false }));
  const before = readInstallation(root).profile;
  assert.ok(!before.skills.includes('guardian-audit'));
  const preview = run(['update', root, '--add-skills', 'guardian-audit', '--dry-run']);
  assert.equal(preview.status, 0, preview.stderr);
  assert.deepEqual(readInstallation(root).profile, before);
  const result = run(['update', root, '--add-skills', 'guardian-audit']);
  assert.equal(result.status, 0, result.stderr);
  const after = readInstallation(root).profile;
  assert.deepEqual(after.skills, [...before.skills, 'guardian-audit'].sort());
  assert.deepEqual(after.hosts, before.hosts);
  assert.equal(after.adhd, false);
  assert.equal(after.graft, false);
  assert.ok(existsSync(join(root, '.agents/skills/guardian-audit/LICENSE')));
});

function legacyFixture(t) {
  const root = fixture(t);
  writeFileSync(join(root, 'AGENTS.md'), '# User rules\nPreserve my project conventions.\n');
  applyPlan(planInstall(root, { hosts: ['codex'], groups: ['core'], skills: ['guardian-code-review'], graft: false, adhd: false }));
  const manifest = readInstallation(root);
  const aliases = { 'guardian-main': 'guardian', 'guardian-icm-architect': 'icm-architect', 'guardian-i-have-adhd': 'i-have-adhd', 'guardian-karpathy-guidelines': 'karpathy-guidelines', 'guardian-code-review': 'code-review' };
  for (const [path, owned] of Object.entries(manifest.files)) {
    const renamed = path.replace(/skills\/([^/]+)\//, (match, name) => `skills/${aliases[name] ?? name}/`);
    if (renamed === path) continue;
    const bytes = readFileSync(join(root, path));
    mkdirSync(join(root, renamed, '..'), { recursive: true });
    writeFileSync(join(root, renamed), bytes);
    rmSync(join(root, path));
    manifest.files[renamed] = owned;
    delete manifest.files[path];
  }
  manifest.profile.skills = manifest.profile.skills.map(name => aliases[name] ?? name);
  const config = Buffer.from(JSON.stringify(manifest.profile, null, 2) + '\n');
  writeFileSync(join(root, '.guardian/config.json'), config);
  manifest.files['.guardian/config.json'].hash = hash(config);
  writeFileSync(join(root, '.guardian/installation.json'), JSON.stringify(manifest));
  return root;
}

test('legacy skill names migrate transactionally while preserving selections and user instructions', t => {
  const root = legacyFixture(t);
  assert.ok(existsSync(join(root, '.agents/skills/code-review/SKILL.md')));
  applyPlan(planInstall(root, {}));
  const installed = readInstallation(root);
  assert.ok(installed.profile.skills.every(name => name.startsWith('guardian-')));
  assert.ok(installed.profile.skills.includes('guardian-code-review'));
  assert.ok(!existsSync(join(root, '.agents/skills/code-review/SKILL.md')));
  assert.ok(existsSync(join(root, '.agents/skills/guardian-code-review/SKILL.md')));
  assert.equal(installed.profile.adhd, false);
  assert.match(readFileSync(join(root, 'AGENTS.md'), 'utf8'), /Preserve my project conventions/);
  assert.deepEqual(installationProblems(root), []);
});

test('modified legacy skill bytes stop namespace migration before any writes', t => {
  const root = legacyFixture(t);
  writeFileSync(join(root, '.agents/skills/code-review/SKILL.md'), 'User customization');
  const before = snapshot(root);
  assert.throws(() => planInstall(root, {}), /Owned file modified/);
  assert.deepEqual(snapshot(root), before);
});
