import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { assetsRoot, object, strings } from './bundle.js';
import { applyPlan, hash, readOptional } from './files.js';
import { readInstallation } from './install.js';
import type { Change, Plan } from './types.js';

export interface MemoryProfile {
  schema: 1;
  provider: 'none' | 'honcho';
  root: string;
  name: string;
  workspace: string;
  peer: string;
  url: string;
  dashboard: string;
  hosts: string[];
  capture: boolean;
}
export interface MemoryOptions {
  provider?: 'none' | 'honcho';
  name?: string;
  workspace?: string;
  peer?: string;
  url?: string;
  capture?: boolean;
  rebind?: boolean;
  adoptExisting?: boolean;
}
interface MemoryFile { before: string | null; after: string; kind: 'file' | 'json' | 'ignore' }
interface MemoryManifest { schema: 1; files: Record<string, MemoryFile> }
export type MemoryAssets = Map<string, Buffer>;
const profilePath: string = '.guardian/memory.json';
const manifestPath: string = '.guardian/memory-installation.json';
const ignoreStart: string = '# guardian-memory:start';
const ignoreEnd: string = '# guardian-memory:end';

export function localMemoryUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('Project memory currently supports an HTTP server on this computer only, e.g. http://127.0.0.1:8008.');
  }
  return url.origin;
}

function identifier(value: string): string {
  if (!/^[a-zA-Z0-9_-]{1,120}$/.test(value)) throw new Error('Memory IDs use 1–120 letters, numbers, hyphens or underscores.');
  return value;
}

export function readMemory(root: string): MemoryProfile | null {
  const raw = readOptional(root, profilePath);
  if (raw === null) return null;
  const p = object(JSON.parse(raw.toString()) as unknown);
  if (p.schema !== 1 || !['none', 'honcho'].includes(String(p.provider)) || typeof p.capture !== 'boolean') throw new Error('Invalid project memory profile');
  for (const key of ['root', 'name', 'workspace', 'peer', 'url', 'dashboard']) if (typeof p[key] !== 'string') throw new Error(`Invalid memory ${key}`);
  const hosts = strings(p.hosts);
  if (hosts.some(host => !['claude', 'codex'].includes(host))) throw new Error('Invalid memory hosts');
  return { schema: 1, provider: p.provider === 'honcho' ? 'honcho' : 'none', root: String(p.root), name: String(p.name), workspace: identifier(String(p.workspace)), peer: identifier(String(p.peer)), url: localMemoryUrl(String(p.url)), dashboard: localMemoryUrl(String(p.dashboard)), hosts, capture: p.capture };
}

export function selectMemory(root: string, options: MemoryOptions): MemoryProfile {
  const previous = readMemory(root);
  if (previous !== null && previous.root !== root && !options.rebind) throw new Error('This folder was moved or copied. Ask whether to reuse its memory, then use --rebind only for the reviewed choice.');
  const name = options.name ?? previous?.name ?? basename(root);
  if (!name.trim() || name.length > 120) throw new Error('Choose a project name of 1–120 characters.');
  const slug = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'project';
  const provider = options.provider ?? previous?.provider ?? 'none';
  if (provider === 'honcho' && options.capture === undefined && previous?.provider !== 'honcho') throw new Error('Ask whether new conversations may be saved, then choose --capture on or off.');
  const installation = readInstallation(root);
  if (installation === null) throw new Error('Install Guardian first. Onboarding runs init/update before connecting project memory.');
  return { schema: 1, provider, root, name, workspace: identifier(options.workspace ?? previous?.workspace ?? `guardian-${slug}-${hash(root).slice(0, 8)}`), peer: identifier(options.peer ?? previous?.peer ?? 'user'), url: localMemoryUrl(options.url ?? previous?.url ?? 'http://127.0.0.1:8008'), dashboard: previous?.dashboard ?? 'http://127.0.0.1:8088', hosts: installation.profile.hosts, capture: provider === 'honcho' && (options.capture ?? previous?.capture ?? false) };
}

function json(value: unknown): string { return JSON.stringify(value, null, 2) + '\n'; }
function equal(a: unknown, b: unknown): boolean { return isDeepStrictEqual(a, b); }

// Undo only the JSON fields/groups we added, preserving unrelated host edits.
function undoJson(current: unknown, before: unknown, after: unknown, path: string[] = []): unknown {
  if (equal(before, after)) return current;
  if (after !== null && typeof after === 'object' && !Array.isArray(after)) {
    const result = { ...object(current) };
    const original = before === undefined ? {} : object(before);
    for (const [key, value] of Object.entries(object(after))) {
      const restored = undoJson(result[key], original[key], value, [...path, key]);
      if (restored === undefined) delete result[key]; else result[key] = restored;
    }
    return before === undefined && Object.keys(result).length === 0 ? undefined : result;
  }
  if (path[0] === 'hooks' && path.length === 2 && Array.isArray(after) && (before === undefined || Array.isArray(before))) {
    const original: unknown[] = Array.isArray(before) ? before : [];
    {
      if (!Array.isArray(current)) throw new Error('Memory hook groups were modified; review them before updating.');
      const result: unknown[] = [...current];
      const added: unknown[] = [...after];
      const removed: unknown[] = [];
      for (const entry of original) {
        const index = added.findIndex(item => equal(item, entry));
        if (index === -1) removed.push(entry); else added.splice(index, 1);
      }
      for (const entry of added) {
        const index = result.findIndex(item => equal(item, entry));
        if (index === -1) throw new Error('A managed memory hook was modified; review it before updating.');
        result.splice(index, 1);
      }
      for (const entry of removed) if (!result.some(item => equal(item, entry))) result.push(entry);
      return before === undefined && result.length === 0 ? undefined : result;
    }
  }
  if (!equal(current, after)) throw new Error('A managed memory setting was modified; review it before updating.');
  return before;
}

function memoryManifest(root: string): MemoryManifest | null {
  const raw = readOptional(root, manifestPath);
  if (raw === null) return null;
  const value = object(JSON.parse(raw.toString()) as unknown);
  if (value.schema !== 1) throw new Error('Unsupported memory installation manifest');
  const files: Record<string, MemoryFile> = {};
  for (const [path, input] of Object.entries(object(value.files))) {
    const file = object(input);
    if (file.before !== null && typeof file.before !== 'string' || typeof file.after !== 'string' || !['file', 'json', 'ignore'].includes(String(file.kind))) throw new Error('Invalid memory installation record');
    files[path] = { before: file.before, after: file.after, kind: file.kind === 'json' ? 'json' : file.kind === 'ignore' ? 'ignore' : 'file' };
  }
  return { schema: 1, files };
}

function restore(root: string, path: string, record: MemoryFile): Buffer | null {
  const current = readOptional(root, path);
  if (current === null) throw new Error(`Memory file missing: ${path}; restore it before updating/removing.`);
  const before = record.before === null ? null : Buffer.from(record.before, 'base64');
  const after = Buffer.from(record.after, 'base64');
  if (current.equals(after)) return before;
  if (record.kind === 'json') {
    const restored = undoJson(JSON.parse(current.toString()) as unknown, before === null ? undefined : JSON.parse(before.toString()) as unknown, JSON.parse(after.toString()) as unknown);
    return restored === undefined ? null : Buffer.from(json(restored));
  }
  if (record.kind === 'ignore') {
    const text = current.toString();
    const block = after.toString().slice(after.toString().indexOf(ignoreStart));
    if (text.split(block).length !== 2) throw new Error('Memory gitignore block was modified');
    return Buffer.from(text.replace(block, ''));
  }
  throw new Error(`Memory file modified: ${path}; preserve your changes before updating/removing.`);
}

function shellQuote(value: string): string { return "'" + value.replaceAll("'", "'\\''") + "'"; }

function hostHooks(root: string, profile: MemoryProfile, host: string): Record<string, unknown[]> {
  if (!profile.capture) return {};
  const command = `${shellQuote(process.execPath)} ${shellQuote(join(root, '.guardian/honcho/runtime.mjs'))} ${host} `;
  const hooks: Record<string, unknown[]> = {};
  function group(event: string, verb: string, timeout: number, matcher?: string, async?: boolean): void {
    hooks[event] ??= [];
    hooks[event].push({ ...(matcher === undefined ? {} : { matcher }), hooks: [{ type: 'command', command: command + verb, timeout, ...(async === undefined ? {} : { async }) }] });
  }
  if (host === 'codex') {
    group('SessionStart', 'recall', 30, 'startup|resume|clear|compact');
    group('UserPromptSubmit', 'prompt', 20);
    group('PostToolUse', 'observe', 10, '*');
    group('Stop', 'writeback', 30);
    group('PreCompact', 'writeback', 30, 'manual|auto');
  } else {
    group('SessionStart', 'session-start', 30);
    group('SessionEnd', 'session-end', 5);
    group('UserPromptSubmit', 'user-prompt', 30);
    group('UserPromptSubmit', 'save-user-message', 30, undefined, true);
    group('PostToolUse', 'post-tool-use', 10, 'Write|Edit|Bash|Task', true);
    group('PreCompact', 'pre-compact', 20, 'auto|manual');
    group('Stop', 'stop', 30, undefined, true);
  }
  return hooks;
}

export function planMemory(root: string, profile: MemoryProfile | null, assets: MemoryAssets = new Map(), adoptExisting: boolean = false): Plan {
  const previous = memoryManifest(root);
  const changes = new Map<string, Change>();
  const records: Record<string, MemoryFile> = {};
  const legacyBackups: Record<string, string> = {};
  const base = new Map<string, Buffer | null>();
  for (const [path, record] of Object.entries(previous?.files ?? {})) base.set(path, restore(root, path, record));
  function current(path: string): Buffer | null { return base.has(path) ? base.get(path) ?? null : readOptional(root, path); }
  function file(path: string, after: Buffer, kind: MemoryFile['kind'] = 'file'): void {
    const before = current(path);
    if (kind === 'file' && before !== null) throw new Error(`Existing unmanaged memory file: ${path}`);
    records[path] = { before: before?.toString('base64') ?? null, after: after.toString('base64'), kind };
    base.delete(path);
    changes.set(path, { path, before: readOptional(root, path), after });
  }
  function editJson(path: string, edit: (document: Record<string, unknown>) => void): void {
    const before = current(path);
    const document = before === null ? {} : object(JSON.parse(before.toString()) as unknown);
    let baseline = before;
    if (adoptExisting) {
      const original = JSON.stringify(document);
      if (path === '.mcp.json' && document.mcpServers !== undefined) delete object(document.mcpServers)['guardian-honcho'];
      if (path.endsWith('hooks.json') || path.endsWith('settings.local.json')) mergeHooks(document, {}, true);
      if (original !== JSON.stringify(document)) {
        legacyBackups[path] = before?.toString('base64') ?? '';
        baseline = Buffer.from(json(document));
      }
    }
    edit(document);
    const raw = readOptional(root, path);
    const live: unknown = raw === null ? undefined : JSON.parse(raw.toString()) as unknown;
    if (live !== undefined && document.hooks !== undefined && object(live).hooks !== undefined) {
      const desired = object(document.hooks);
      const existing = object(object(live).hooks);
      for (const [event, groups] of Object.entries(desired)) {
        const order = existing[event];
        if (!Array.isArray(groups) || !Array.isArray(order)) continue;
        const rank = (group: unknown): number => { const index = order.findIndex(item => equal(item, group)); return index === -1 ? order.length : index; };
        groups.sort((a: unknown, b: unknown): number => rank(a) - rank(b));
      }
    }
    file(path, raw !== null && equal(live, document) ? raw : Buffer.from(json(document)), 'json');
    records[path]!.before = baseline?.toString('base64') ?? null;
  }
  if (profile !== null) {
    file(profilePath, Buffer.from(json(profile)));
    if (profile.provider === 'none' && adoptExisting) {
      for (const path of ['.mcp.json', '.claude/settings.local.json', '.codex/hooks.json']) {
        if (current(path) !== null) { editJson(path, (): void => {}); delete records[path]; }
      }
      const path = '.codex/config.toml';
      const before = current(path);
      if (before !== null) {
        const text = before.toString().replace(/^\[mcp_servers\.guardian-honcho(?:\.env)?\][\s\S]*?(?=^\[|$(?![\s\S]))/gm, '');
        if (text !== before.toString()) legacyBackups[path] = before.toString('base64');
        base.delete(path);
        changes.set(path, { path, before: readOptional(root, path), after: Buffer.from(text) });
      }
    }
    if (profile.provider === 'honcho') {
      file('.guardian/honcho/runtime.mjs', readFileSync(join(assetsRoot, 'honcho/runtime.mjs')));
      const vendor = new Map(assets);
      if (vendor.size === 0) {
        const specs = object(JSON.parse(readFileSync(join(assetsRoot, 'honcho/integrations.json'), 'utf8')) as unknown);
        for (const host of profile.hosts.includes('codex') ? ['claude', 'codex'] : ['claude']) {
          for (const path of [...strings(object(specs[host]).files), 'LICENSE']) {
            const name = `${host}/${path}`;
            const old = previous?.files['.guardian/honcho/vendor/' + name];
            vendor.set(name, old === undefined ? Buffer.from(`Preview: pinned ${name}; downloaded and verified on apply.\n`) : Buffer.from(old.after, 'base64'));
          }
        }
      }
      for (const [path, bytes] of vendor) file('.guardian/honcho/vendor/' + path, bytes);
      for (const host of profile.hosts) {
        const config = { apiKey: 'local-only-placeholder', peerName: profile.peer, workspace: profile.workspace, aiPeer: host, claudePeer: host, enabled: true, saveMessages: profile.capture, saveToolUse: false, saveGitEvents: false, sessionStrategy: 'per-directory', sessionPeerPrefix: false, sessions: { [root]: 'project' }, endpoint: { baseUrl: profile.url + '/v3' }, reasoningLevel: 'minimal', contextRefresh: { skipDialectic: true }, injection: { sessionStart: ['directives', 'summary', 'peerCard'], perTurn: [] }, logging: false };
        file(`.guardian/honcho/${host}/config.json`, Buffer.from(json(config)));
        const args = [join(root, '.guardian/honcho/runtime.mjs'), host, 'mcp'];
        const hooks = hostHooks(root, profile, host);
        if (host === 'claude') {
          editJson('.mcp.json', document => {
            const servers = document.mcpServers === undefined ? {} : object(document.mcpServers);
            if (servers['guardian-honcho'] !== undefined && !adoptExisting) throw new Error('An existing guardian-honcho connection needs review. Use --adopt-existing only after reviewing its replacement.');
            servers['guardian-honcho'] = { type: 'stdio', command: process.execPath, args };
            document.mcpServers = servers;
          });
          if (profile.capture || adoptExisting && current('.claude/settings.local.json') !== null) editJson('.claude/settings.local.json', document => mergeHooks(document, hooks, false));
        } else {
          const path = '.codex/config.toml';
          let text = current(path)?.toString() ?? '';
          if (/\[mcp_servers\.guardian-honcho(?:\.env)?\]/.test(text)) {
            if (!adoptExisting) throw new Error('Existing Codex Honcho connection: review and use --adopt-existing.');
            text = text.replace(/^\[mcp_servers\.guardian-honcho(?:\.env)?\][\s\S]*?(?=^\[|$(?![\s\S]))/gm, '');
            legacyBackups[path] = current(path)?.toString('base64') ?? '';
          }
          const baseline = legacyBackups[path] === undefined ? current(path) : Buffer.from(text);
          if (profile.capture) {
            const features = /^\[features\][\s\S]*?(?=^\[|$(?![\s\S]))/m;
            if (features.test(text)) text = text.replace(features, block => /^hooks\s*=/m.test(block) ? block.replace(/^hooks\s*=.*$/m, 'hooks = true') : block.trimEnd() + '\nhooks = true\n\n');
            else text += '\n[features]\nhooks = true\n';
          }
          text += `\n[mcp_servers.guardian-honcho]\ncommand = ${JSON.stringify(process.execPath)}\nargs = ${JSON.stringify(args)}\nstartup_timeout_sec = 30\ntool_timeout_sec = 180\n`;
          // TOML is guarded as a whole; never overwrite an independently edited setting.
          records[path] = { before: baseline?.toString('base64') ?? null, after: Buffer.from(text).toString('base64'), kind: 'file' };
          base.delete(path);
          changes.set(path, { path, before: readOptional(root, path), after: Buffer.from(text) });
          if (profile.capture || adoptExisting && current('.codex/hooks.json') !== null) editJson('.codex/hooks.json', document => mergeHooks(document, hooks, false));
        }
      }
    }
    const ignore = current('.gitignore')?.toString() ?? '';
    if (ignore.includes(ignoreStart)) throw new Error('Unmanaged memory gitignore block: review before installing.');
    file('.gitignore', Buffer.from(ignore + (ignore.endsWith('\n') || !ignore ? '' : '\n') + `${ignoreStart}\n.guardian/memory.json\n.guardian/memory-installation.json\n.guardian/memory-legacy-backup.json\n.guardian/onboarding.md\n.guardian/honcho/\n.mcp.json\n.codex/config.toml\n.codex/hooks.json\n${ignoreEnd}\n`), 'ignore');
  }
  if (Object.keys(legacyBackups).length > 0) {
    const path = '.guardian/memory-legacy-backup.json';
    if (readOptional(root, path) === null) changes.set(path, { path, before: null, after: Buffer.from(json({ schema: 1, files: legacyBackups })) });
  }
  for (const [path, after] of base) changes.set(path, { path, before: readOptional(root, path), after });
  if (profile === null && previous !== null) {
    let text = changes.get('.gitignore')?.after?.toString() ?? '';
    for (const path of ['.guardian/honcho/', '.guardian/memory-legacy-backup.json', '.guardian/onboarding.md']) {
      if (!text.split('\n').includes(path)) text += (text.endsWith('\n') || !text ? '' : '\n') + path + '\n';
    }
    changes.set('.gitignore', { path: '.gitignore', before: readOptional(root, '.gitignore'), after: Buffer.from(text) });
  }
  changes.set(manifestPath, { path: manifestPath, before: readOptional(root, manifestPath), after: profile === null ? null : Buffer.from(json({ schema: 1, files: records })) });
  return { root, installation: null, changes: [...changes.values()].filter(change => change.before === null ? change.after !== null : change.after === null || !change.before.equals(change.after)) };
}

function mergeHooks(document: Record<string, unknown>, desired: Record<string, unknown[]>, adopt: boolean): void {
  const hooks = document.hooks === undefined ? {} : object(document.hooks);
  if (adopt) {
    for (const [event, groups] of Object.entries(hooks)) {
      if (!Array.isArray(groups)) throw new Error(`Invalid existing ${event} hooks`);
      hooks[event] = groups.flatMap((group: unknown): unknown[] => {
        const value = object(group);
        if (!Array.isArray(value.hooks)) throw new Error(`Invalid existing ${event} hook handlers`);
        const handlers: unknown[] = value.hooks.filter((handler: unknown): boolean => {
          const command = object(handler).command;
          return typeof command !== 'string' || !command.includes('/.honcho/guardian-local/guardian-honcho-hook');
        });
        return handlers.length === 0 ? [] : [{ ...value, hooks: handlers }];
      });
    }
  }
  for (const [event, groups] of Object.entries(desired)) {
    const raw = hooks[event] === undefined ? [] : hooks[event];
    if (!Array.isArray(raw)) throw new Error(`Invalid existing ${event} hooks`);
    let existing: unknown[] = raw;
    hooks[event] = [...existing, ...groups];
  }
  document.hooks = hooks;
}

export async function memoryHealth(url: string): Promise<boolean> {
  try { const response = await fetch(localMemoryUrl(url) + '/health', { signal: AbortSignal.timeout(5000), redirect: 'error' }); return response.ok && object(await response.json() as unknown).status === 'ok'; }
  catch { return false; }
}

export async function fetchMemoryAssets(hosts: string[]): Promise<MemoryAssets> {
  const manifest = object(JSON.parse(readFileSync(join(assetsRoot, 'honcho/integrations.json'), 'utf8')) as unknown);
  const result: MemoryAssets = new Map();
  // Claude's bundled Node MCP is used by both hosts; no Bun/global plugin is needed.
  for (const host of hosts.includes('codex') ? ['claude', 'codex'] : ['claude']) {
    const spec = object(manifest[host]);
    const response = await fetch(String(spec.url), { signal: AbortSignal.timeout(120000), redirect: 'error' });
    if (!response.ok || Number(response.headers.get('content-length')) > 20 * 1024 * 1024) throw new Error(`Could not download pinned ${host} integration`);
    const archive = Buffer.from(await response.arrayBuffer());
    if (archive.length > 20 * 1024 * 1024 || 'sha512-' + createHash('sha512').update(archive).digest('base64') !== spec.integrity) throw new Error(`Integration integrity mismatch: ${host}`);
    for (const path of [...strings(spec.files), 'LICENSE']) {
      const extracted = spawnSync('tar', ['-xzOf', '-', `package/${path}`], { input: archive, maxBuffer: 8 * 1024 * 1024, timeout: 30000 });
      if (extracted.status !== 0 || extracted.error) throw new Error(`Unable to extract ${host}/${path}; tar is required on macOS/Linux.`);
      let bytes = extracted.stdout;
      if (path !== 'LICENSE') {
        let source = bytes.toString();
        source = source.replace(/join\d*\(homedir\d*\(\), "\.honcho"\)/g, original => `(process.env.HONCHO_CONFIG_DIR || ${original})`);
        source = source.replace(/(join\d*)\((homedir\d*\(\)), "\.honcho", /g, (_match: string, joinName: string, home: string): string => `${joinName}(process.env.HONCHO_CONFIG_DIR || ${joinName}(${home}, ".honcho"), `);
        bytes = Buffer.from(source);
      }
      result.set(`${host}/${path}`, bytes);
    }
  }
  return result;
}

export function memoryProblems(root: string): string[] {
  try {
    const profile = readMemory(root);
    if (profile === null) return [];
    if (profile.root !== root) return ['Memory belongs to a moved/copied folder; review whether to reuse it, then reconnect.'];
    planMemory(root, null);
    const hosts = readInstallation(root)?.profile.hosts;
    return profile.provider === 'honcho' && !equal(hosts, profile.hosts) ? ['Guardian clients changed; reconnect memory through onboarding.'] : [];
  }
  catch (error: unknown) { return [error instanceof Error ? error.message : String(error)]; }
}

export async function setupMemory(root: string, options: MemoryOptions, dryRun: boolean, download: (hosts: string[]) => Promise<MemoryAssets> = fetchMemoryAssets): Promise<void> {
  const profile = selectMemory(root, options);
  // Preflight local conflicts before network requests or workspace creation.
  const preview = planMemory(root, profile, new Map(), options.adoptExisting);
  console.log(`Project: ${profile.name}\nMemory: ${profile.provider}${profile.provider === 'honcho' ? `\nWorkspace: ${profile.workspace}\nSave new conversations: ${profile.capture ? 'yes' : 'no'}\nServer: ${profile.url}` : ''}`);
  console.log(preview.changes.map(change => `${change.after === null ? 'remove' : 'write'} ${change.path}`).join('\n'));
  if (dryRun) { console.log('Dry run: no writes, downloads, Docker commands or API calls. Pinned integration files are downloaded only when applying.'); return; }
  let assets: MemoryAssets = new Map();
  if (profile.provider === 'honcho') {
    if (!await memoryHealth(profile.url)) throw new Error('Local memory server is unavailable. Run guardian-wrapper memory service start, or choose no memory in onboarding. Project files were not changed.');
    assets = await download(profile.hosts);
  }
  const plan = planMemory(root, profile, assets, options.adoptExisting);
  if (profile.provider === 'honcho') {
    const response = await fetch(profile.url + '/v3/workspaces', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: profile.workspace, metadata: { guardian: true, project: profile.name } }), signal: AbortSignal.timeout(30000), redirect: 'error' });
    if (!response.ok) throw new Error(`Workspace connection failed (HTTP ${response.status}); project files were not changed.`);
  }
  try {
    applyPlan(plan);
    chmodSync(join(root, profilePath), 0o600);
    chmodSync(join(root, manifestPath), 0o600);
    if (readOptional(root, '.guardian/memory-legacy-backup.json') !== null) chmodSync(join(root, '.guardian/memory-legacy-backup.json'), 0o600);
    if (profile.provider === 'honcho') chmodSync(join(root, '.guardian/honcho'), 0o700);
  }
  catch (error: unknown) { throw new Error(`Project connection was not applied. The workspace may remain on the local server; it was not deleted. ${error instanceof Error ? error.message : String(error)}`); }
  console.log(profile.provider === 'none' ? 'Choice saved: Guardian works without a memory server.' : `Memory connected. Dashboard: ${profile.dashboard}/workspaces/${profile.workspace}\nOpen a new client session and review project/MCP/hook trust prompts. Automatic capture is not certified until a real client session is checked.`);
}

export function removeMemory(root: string, dryRun: boolean): void {
  if (memoryManifest(root) === null) throw new Error('No managed memory connection found.');
  const plan = planMemory(root, null);
  console.log(plan.changes.map(change => `${change.after === null ? 'remove' : 'restore'} ${change.path}`).join('\n'));
  if (!dryRun) applyPlan(plan);
  console.log(dryRun ? 'Dry run: no writes.' : 'Project memory connection removed. Server, workspaces, cached state and saved messages retained.');
}
