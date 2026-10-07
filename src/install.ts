import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { assetsRoot, catalog, packageRoot, parseInstallation, version } from './bundle.js';
import { hash, listFiles, readOptional, safePath } from './files.js';
import type { Change, InitOptions, Installation, OwnedFile, Plan, Profile } from './types.js';

export const startMarker: string = '<!-- guardian-wrapper:start -->';
export const endMarker: string = '<!-- guardian-wrapper:end -->';
const manifestPath: string = '.guardian/installation.json';

export function projectRoot(path: string): string {
  const root = realpathSync(path);
  if (!existsSync(root)) throw new Error(`Project does not exist: ${path}`);
  safePath(root, '.guardian/installation.json');
  return root;
}

export function readInstallation(root: string): Installation | null {
  const bytes = readOptional(root, manifestPath);
  return bytes === null ? null : parseInstallation(bytes);
}

export function selectProfile(options: InitOptions, previous: Profile | null = null): Profile {
  const all = catalog();
  const hosts = options.hosts ?? previous?.hosts ?? ['claude', 'codex'];
  if (hosts.length === 0 || hosts.some(host => !['claude', 'codex'].includes(host))) throw new Error('Hosts must be claude,codex or either one');
  const groups = options.groups ?? (previous === null ? ['engineering', 'productivity'] : []);
  const knownGroups = new Set(all.map(skill => skill.group));
  for (const group of groups) if (group !== 'all' && !knownGroups.has(group)) throw new Error(`Unknown group: ${group}`);
  const explicit = options.skills ?? [];
  for (const name of explicit) if (!all.some(skill => skill.name === name)) throw new Error(`Unknown skill: ${name}`);
  const keep = previous !== null && options.groups === undefined && options.skills === undefined ? previous.skills : [];
  const names = all.filter(skill => skill.group === 'core' || groups.includes('all') || groups.includes(skill.group) || explicit.includes(skill.name) || keep.includes(skill.name)).map(skill => skill.name).sort();
  const profile = { hosts: [...new Set(hosts)].sort(), skills: names, adhd: options.adhd ?? previous?.adhd ?? true, graft: options.graft ?? previous?.graft ?? true, watch: options.watch ?? previous?.watch ?? false };
  if (profile.watch && !profile.graft) throw new Error('Watch requires graft');
  return profile;
}

export function extractBlock(text: string): string | null {
  const starts = text.split(startMarker).length - 1;
  const ends = text.split(endMarker).length - 1;
  if (starts === 0 && ends === 0) return null;
  if (starts !== 1 || ends !== 1 || text.indexOf(endMarker) < text.indexOf(startMarker)) throw new Error('Malformed Guardian markers');
  return text.slice(text.indexOf(startMarker), text.indexOf(endMarker) + endMarker.length);
}

function block(body: string): string {
  return `${startMarker}\n${body.trim()}\n${endMarker}`;
}

function replaceBlock(text: string, current: string | null, desired: string): string {
  if (current !== null) return text.replace(current, desired);
  return text + (text.length === 0 ? '' : text.endsWith('\n') ? '\n' : '\n\n') + desired + '\n';
}

function desiredFiles(profile: Profile): Map<string, { data: Buffer; kind: 'file' | 'block' }> {
  const files = new Map<string, { data: Buffer; kind: 'file' | 'block' }>();
  function file(path: string, data: string | Buffer, kind: 'file' | 'block' = 'file'): void {
    files.set(path, { data: Buffer.isBuffer(data) ? data : Buffer.from(data), kind });
  }
  for (const host of profile.hosts) {
    const shelf = host === 'claude' ? '.claude/skills' : '.agents/skills';
    for (const name of profile.skills) {
      const source = join(assetsRoot, 'skills', name);
      for (const path of listFiles(source)) file(`${shelf}/${name}/${path}`, readFileSync(join(source, path)));
    }
  }
  for (const path of listFiles(join(assetsRoot, 'licenses'))) file(`.guardian/licenses/${path}`, readFileSync(join(assetsRoot, 'licenses', path)));
  file('.guardian/config.json', JSON.stringify(profile, null, 2) + '\n');
  file('.guardian/runtime.json', JSON.stringify({ cli: join(packageRoot, 'dist/cli.js'), version }, null, 2) + '\n');
  file('.guardian/bin/guardian.mjs', readFileSync(join(assetsRoot, 'scripts/guardian.mjs')));
  const communication = profile.adhd ? readFileSync(join(assetsRoot, 'communication/adhd.md')) : Buffer.from('ADHD mode is disabled for this project. Use the normal response style.\n');
  file('.guardian/communication.md', communication);
  const skillShelf = profile.hosts.includes('codex') ? '.agents/skills' : '.claude/skills';
  const rules = [
    '# Guardian project guidance',
    `Read ${skillShelf}/guardian/SKILL.md for project adoption, context migration, changes, fixes and verification.`,
    'Before changing code, read docs/agents/guardian.md for installed capabilities and verification commands.',
    ...(profile.graft ? ['Read graft/INDEX.md and relevant cards before code edits. Refresh missing or stale cards with node .guardian/bin/guardian.mjs graft . build. Verify affected source and callers.'] : []),
    'TypeScript: use strict types and unknown at external boundaries; no explicit or implicit any. Give public functions, components and hooks explicit return types.',
    'Keep changes scoped to the authorized task; preserve existing work and verify observable behavior.',
    ...(profile.adhd ? ['ADHD format is active: read .guardian/communication.md at session start. Honor "stop adhd mode" for this session; project default remains enabled until changed through the CLI.'] : []),
    'Use the project’s approved domain glossary (GLOSSARY.md for new setups); preserve existing conventions until a reviewed migration. ICM operational contracts belong under docs/map/. Create them only with real content.',
  ];
  file('AGENTS.md', block(rules.join('\n')), 'block');
  file('CLAUDE.md', block('@AGENTS.md'), 'block');
  file('.gitignore', block(['graft/', '.guardian/install.lock', '.guardian/runtime.json', '.guardian/migration.md', '.guardian/chat-context.md'].join('\n')), 'block');
  const bindings = catalog().filter(skill => profile.skills.includes(skill.name)).map(skill => `| ${skill.name} | ${skill.provider} | ${skill.userOnly ? 'User only' : 'Model or user'} |`);
  file('docs/agents/guardian.md', block([
    '# Guardian installation',
    `Wrapper ${version}. Selected hosts: ${profile.hosts.join(', ')}. ADHD: ${profile.adhd ? 'on' : 'off'}. Graft: ${profile.graft ? 'structural' : 'off'}.`,
    'The skills below are installed files; actual host discovery and provider binding must be checked in a fresh session.',
    'Run `node .guardian/bin/guardian.mjs doctor .` for integrity and tool observations.',
    'Use `node .guardian/bin/guardian.mjs config . adhd off` to disable the project ADHD default.',
    'This installation has not adopted the domain, run app tests, configured CI gates or migrated documentation.',
    'Inspect package scripts and existing docs to choose real project verification commands. Record exact commands/results in the active work record.',
    'If no issue tracker is configured, start with local work records under docs/work. Create tracker/domain contracts when needed; do not claim Matt setup ran.',
    profile.graft ? 'Use `node .guardian/bin/guardian.mjs graft . ask "task"` for fresh graph retrieval and `... graft . callers symbol` for callers. Structural parsing needs no API key; deep builds are explicit and may send code to the selected provider.' : 'Graft is disabled in this profile. Enable it before relying on generated maps.',
    'Runtime binding is machine-local. If the wrapper is moved or reinstalled elsewhere, rerun init to rebind it.',
    '| Skill | Provider | Invocation |', '| --- | --- | --- |', ...bindings,
  ].join('\n\n')), 'block');
  if (profile.watch) file('scripts/watch-graft.sh', readFileSync(join(assetsRoot, 'scripts/watch-graft.sh')));
  return files;
}

function assertOwned(path: string, current: Buffer | null, owned: OwnedFile): void {
  if (current === null) throw new Error(`Owned file missing: ${path}; restore it before updating/uninstalling`);
  if (owned.kind === 'block') {
    if (extractBlock(current.toString('utf8')) !== owned.block) throw new Error(`Managed block modified: ${path}`);
  } else if (hash(current) !== owned.hash) throw new Error(`Owned file modified: ${path}; preserve your edit before updating/uninstalling`);
}

function restoreOwned(current: Buffer, owned: OwnedFile): Buffer | null {
  if (hash(current) === owned.hash) return owned.original === null ? null : Buffer.from(owned.original, 'base64');
  if (owned.kind !== 'block' || owned.block === null) throw new Error('Modified file cannot be restored');
  const originalBlock = owned.original === null ? null : extractBlock(Buffer.from(owned.original, 'base64').toString('utf8'));
  return Buffer.from(current.toString('utf8').replace(owned.block, originalBlock ?? ''));
}

export function planInstall(root: string, options: InitOptions): Plan {
  const previous = readInstallation(root);
  const profile = selectProfile(options, previous?.profile ?? null);
  const desired = desiredFiles(profile);
  const changes: Change[] = [];
  const files: Record<string, OwnedFile> = {};
  // Check the whole previously-owned set, including components being removed.
  for (const [path, owned] of Object.entries(previous?.files ?? {})) assertOwned(path, readOptional(root, path), owned);
  for (const [path, entry] of desired) {
    const before = readOptional(root, path);
    const old = previous?.files[path];
    let after: Buffer;
    let ownedBlock: string | null = null;
    if (entry.kind === 'block') {
      const text = before?.toString('utf8') ?? '';
      const current = extractBlock(text);
      if (old === undefined && current !== null) throw new Error(`Unmanaged Guardian block already exists: ${path}`);
      ownedBlock = entry.data.toString('utf8');
      after = Buffer.from(replaceBlock(text, current, ownedBlock));
    } else {
      if (old === undefined && before !== null) throw new Error(`Existing unmanaged file: ${path}`);
      after = entry.data;
    }
    let original = old === undefined ? (before === null ? null : before.toString('base64')) : old.original;
    if (old?.kind === 'block' && before !== null && hash(before) !== old.hash) {
      original = restoreOwned(before, old)?.toString('base64') ?? null;
    }
    files[path] = { kind: entry.kind, hash: hash(after), original, block: ownedBlock };
    if (before === null || !before.equals(after)) changes.push({ path, before, after });
  }
  // Refuse blending unmanaged files into a selected skill directory.
  for (const host of profile.hosts) {
    const shelf = host === 'claude' ? '.claude/skills' : '.agents/skills';
    for (const name of profile.skills) {
      const path = `${shelf}/${name}`;
      const full = safePath(root, path);
      if (existsSync(full)) for (const child of listFiles(full)) {
        const relative = `${path}/${child}`;
        if (!desired.has(relative) && previous?.files[relative] === undefined) throw new Error(`Unmanaged skill file: ${relative}`);
      }
    }
  }
  for (const [path, owned] of Object.entries(previous?.files ?? {})) {
    if (desired.has(path)) continue;
    const before = readOptional(root, path);
    if (before !== null) changes.push({ path, before, after: restoreOwned(before, owned) });
  }
  const installation: Installation = { schema: 1, version, profile, files };
  const beforeManifest = readOptional(root, manifestPath);
  const afterManifest = Buffer.from(JSON.stringify(installation, null, 2) + '\n');
  if (beforeManifest === null || !beforeManifest.equals(afterManifest)) changes.push({ path: manifestPath, before: beforeManifest, after: afterManifest });
  return { root, changes, installation };
}

export function planUninstall(root: string): Plan {
  const previous = readInstallation(root);
  if (previous === null) throw new Error('No Guardian installation found');
  const changes: Change[] = [];
  for (const [path, owned] of Object.entries(previous.files)) {
    const before = readOptional(root, path);
    assertOwned(path, before, owned);
    if (before !== null) changes.push({ path, before, after: restoreOwned(before, owned) });
  }
  changes.push({ path: manifestPath, before: readOptional(root, manifestPath), after: null });
  return { root, changes, installation: null };
}

export function installationProblems(root: string): string[] {
  const installation = readInstallation(root);
  if (installation === null) return ['No Guardian installation found'];
  const problems: string[] = [];
  for (const [path, owned] of Object.entries(installation.files)) {
    try { assertOwned(path, readOptional(root, path), owned); }
    catch (error: unknown) { problems.push(error instanceof Error ? error.message : String(error)); }
  }
  for (const host of installation.profile.hosts) {
    const shelf = host === 'claude' ? '.claude/skills' : '.agents/skills';
    for (const name of installation.profile.skills) {
      const prefix = `${shelf}/${name}`;
      const full = safePath(root, prefix);
      if (!existsSync(full)) continue;
      for (const path of listFiles(full)) if (installation.files[`${prefix}/${path}`] === undefined) problems.push(`Unmanaged skill file: ${prefix}/${path}`);
    }
  }
  return problems;
}
