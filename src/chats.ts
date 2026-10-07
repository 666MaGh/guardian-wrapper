import { closeSync, constants, existsSync, fstatSync, lstatSync, openSync, readSync, readdirSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { applyPlan, hash, readOptional } from './files.js';
import { projectRoot } from './install.js';

interface Message { role: string; text: string }
export interface ChatCandidate {
  id: string;
  provider: string;
  title: string;
  path: string;
  nativeId: string;
  cwd: string;
  modified: string;
  bytes: number;
  excerpt: string;
  sampled: boolean;
  matches: string[];
}
interface Conversation { nativeId: string; title: string; cwd: string; messages: Message[] }
export interface ChatOptions { query: string; exports: string[]; source: string; select: string[]; dryRun: boolean }
export interface ChatContext { path: string; content: Buffer }
export interface ChatDiscovery { candidates: ChatCandidate[]; warnings: string[] }
const sampleBytes: number = 256 * 1024;
const maxBytes: number = 64 * 1024 * 1024;

function object(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function string(value: unknown): string { return typeof value === 'string' ? value : ''; }
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function display(value: string): string { return value.replace(/[\x00-\x1f\x7f-\x9f]/g, ' ').slice(0, 180); }
function text(value: unknown): string {
  if (typeof value === 'string') return value;
  return array(value).map(part => {
    if (typeof part === 'string') return part;
    const block = object(part);
    return ['text', 'input_text', 'output_text'].includes(string(block.type)) ? string(block.text) : '';
  }).filter(Boolean).join('\n');
}
function message(role: string, content: unknown): Message[] {
  const normalized = role === 'human' ? 'user' : role;
  const body = text(content);
  return ['user', 'assistant'].includes(normalized) && body.trim() ? [{ role: normalized, text: body }] : [];
}

function readSource(path: string, sample: boolean): { data: string; bytes: number; modified: string; sampled: boolean; sha256: string } {
  if (lstatSync(path).isSymbolicLink()) throw new Error('Symlink source refused');
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const before = fstatSync(fd);
    if (!before.isFile()) throw new Error('Expected a regular file');
    if (!sample && before.size > maxBytes) throw new Error('Source exceeds 64 MiB; provide a focused text export');
    const size = Math.min(before.size, sample ? sampleBytes : maxBytes);
    const bytes = Buffer.alloc(size);
    let offset = 0;
    while (offset < size) {
      const count = readSync(fd, bytes, offset, size - offset, offset);
      if (count === 0) break;
      offset += count;
    }
    const after = fstatSync(fd);
    if (offset !== size || before.size !== after.size || before.mtimeMs !== after.mtimeMs) throw new Error('Source changed while reading; retry discovery');
    if (bytes.includes(0)) throw new Error('Binary input is unsupported');
    return { data: bytes.toString('utf8'), bytes: before.size, modified: before.mtime.toISOString(), sampled: size < before.size, sha256: hash(bytes) };
  } finally { closeSync(fd); }
}

function localConversation(data: string, provider: string, sampled: boolean): Conversation {
  const result: Conversation = { nativeId: '', title: '', cwd: '', messages: [] };
  const lines = data.split('\n');
  if (sampled) lines.pop();
  for (const line of lines) {
    if (!line.trim()) continue;
    let parsed: unknown;
    try { parsed = JSON.parse(line); } catch { throw new Error('Malformed JSONL; use a client-exported text transcript'); }
    const item = object(parsed);
    if (provider === 'codex') {
      const payload = object(item.payload);
      if (item.type === 'session_meta') {
        result.nativeId = string(payload.id) || string(payload.session_id);
        result.cwd = string(payload.cwd);
        if (typeof payload.source === 'object' && 'subagent' in object(payload.source)) throw new Error('Subagent transcript excluded');
      }
      if (item.type === 'response_item' && payload.type === 'message' && !['analysis', 'commentary'].includes(string(payload.channel))) {
        result.messages.push(...message(string(payload.role), payload.content));
      }
    } else {
      result.nativeId ||= string(item.sessionId);
      result.cwd ||= string(item.cwd);
      if (item.isSidechain === true) throw new Error('Subagent transcript excluded');
      if (item.type === 'user' || item.type === 'assistant') {
        const body = object(item.message);
        result.messages.push(...message(string(body.role) || string(item.type), body.content));
      }
    }
  }
  result.title = result.messages.find(item => item.role === 'user')?.text ?? '';
  if (result.messages.length === 0) throw new Error('No supported conversation messages in inspected prefix');
  return result;
}

function exportedConversations(data: string, path: string): Conversation[] {
  if (/\.(md|txt)$/i.test(path)) return [{ nativeId: 'text', title: basename(path), cwd: '', messages: [{ role: 'provided transcript', text: data }] }];
  let parsed: unknown;
  try { parsed = JSON.parse(data); } catch { throw new Error('Invalid JSON export; unpack ZIP exports first or supply a .md/.txt transcript'); }
  const entries = Array.isArray(parsed) ? parsed : Array.isArray(object(parsed).conversations) ? array(object(parsed).conversations) : [parsed];
  if (entries.length > 10000) throw new Error('More than 10000 exported conversations; provide a focused export');
  return entries.map((entry, index): Conversation => {
    const item = object(entry);
    const result: Conversation = { nativeId: string(item.id) || string(item.uuid) || String(index), title: string(item.title) || string(item.name), cwd: '', messages: [] };
    if (Array.isArray(item.chat_messages)) {
      for (const value of item.chat_messages) {
        const body = object(value);
        result.messages.push(...message(string(body.sender), string(body.text) || body.content));
      }
    } else if (typeof item.mapping === 'object' && item.mapping !== null) {
      const mapping = object(item.mapping);
      let node = string(item.current_node);
      if (!node) {
        const leaves = Object.keys(mapping).filter(key => array(object(mapping[key]).children).length === 0);
        if (leaves.length !== 1) throw new Error('Ambiguous ChatGPT branches: export a selected conversation as text');
        node = leaves[0] ?? '';
      }
      const chain: unknown[] = [];
      const visited = new Set<string>();
      while (node) {
        if (visited.has(node) || !Object.hasOwn(mapping, node)) throw new Error('Invalid ChatGPT conversation branch');
        visited.add(node);
        const current = object(mapping[node]);
        chain.unshift(current.message);
        node = string(current.parent);
      }
      for (const value of chain) {
        const body = object(value);
        if (['analysis', 'commentary'].includes(string(body.channel)) || object(body.metadata).is_visually_hidden_from_conversation === true) continue;
        result.messages.push(...message(string(object(body.author).role), object(body.content).parts));
      }
    } else throw new Error('Unrecognized conversation export; use ChatGPT mapping, Claude chat_messages, or a .md/.txt transcript');
    result.title ||= result.messages.find(value => value.role === 'user')?.text ?? basename(path);
    return result;
  }).filter(value => value.messages.length > 0);
}

function sourceFiles(root: string, exported: boolean, warnings: string[]): string[] {
  const files: string[] = [];
  let visited = 0;
  function walk(directory: string, depth: number): void {
    if (depth > 8 || visited > 10000) throw new Error('Source discovery limit exceeded; choose a narrower export folder');
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (++visited > 10000) throw new Error('Source discovery exceeds 10000 entries');
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) { warnings.push(`Skipped symlink: ${path}`); continue; }
      if (entry.isDirectory() && !['subagents', '.git', 'node_modules'].includes(entry.name)) walk(path, depth + 1);
      else if (entry.isFile() && (exported ? /\.(json|md|txt)$/i.test(entry.name) : entry.name.endsWith('.jsonl') && !entry.name.startsWith('agent-'))) files.push(path);
    }
  }
  if (!existsSync(root)) { warnings.push(`Source not found: ${root}`); return files; }
  if (lstatSync(root).isSymbolicLink()) throw new Error(`Symlink source refused: ${root}`);
  if (lstatSync(root).isFile()) return [realpathSync(root)];
  walk(realpathSync(root), 0);
  files.sort((a, b) => lstatSync(b).mtimeMs - lstatSync(a).mtimeMs || a.localeCompare(b));
  if (files.length > 1000) warnings.push('Only the latest 1000 source files are inspected; narrow sources/query as needed.');
  return files.slice(0, 1000);
}

export function discoverChats(root: string, options: ChatOptions): ChatDiscovery {
  const result: ChatDiscovery = { candidates: [], warnings: [] };
  const sources: Array<{ provider: string; root: string }> = [];
  if (options.source === 'all' || options.source === 'codex') {
    const home = process.env.CODEX_HOME ?? join(homedir(), '.codex');
    sources.push({ provider: 'codex', root: join(home, 'sessions') }, { provider: 'codex', root: join(home, 'archived_sessions') });
  }
  if (options.source === 'all' || options.source === 'claude') sources.push({ provider: 'claude-code', root: join(process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude'), 'projects') });
  for (const path of options.exports) sources.push({ provider: 'export', root: resolve(path) });
  const seen = new Set<string>();
  let inspected: number = 0;
  sourcesLoop: for (const source of sources.filter(item => item.provider === 'export' || existsSync(item.root))) for (const path of sourceFiles(source.root, source.provider === 'export', result.warnings)) {
    if (seen.has(path)) continue;
    seen.add(path);
    try {
      const size = lstatSync(path).size;
      const cost = source.provider === 'export' ? size : Math.min(size, sampleBytes);
      if (seen.size > 1000 || inspected + cost > 256 * 1024 * 1024) {
        result.warnings.push('Discovery budget reached (1000 files / 256 MiB); narrow source directories.');
        break sourcesLoop;
      }
      inspected += cost;
      const input = readSource(path, source.provider !== 'export');
      const conversations = source.provider === 'export' ? exportedConversations(input.data, path) : [localConversation(input.data, source.provider, input.sampled)];
      if (new Set(conversations.map(item => item.nativeId)).size !== conversations.length) throw new Error('Duplicate conversation IDs in export; provide a focused text export');
      for (const conversation of conversations) {
        const title = display(conversation.title);
        const excerpt = display(conversation.messages.map(item => item.text).join(' '));
        const searchable = `${conversation.title}\n${conversation.cwd}\n${conversation.messages.map(item => item.text).join('\n')}`.toLowerCase();
        const terms = options.query.toLowerCase().split(/\s+/).filter(Boolean);
        if (terms.length > 0 && !terms.every(term => searchable.includes(term))) continue;
        const matches = terms.map(term => `keyword: ${display(term)}`);
        if (conversation.cwd === root) matches.unshift('same project directory');
        result.candidates.push({ id: hash(`${path}\n${conversation.nativeId}`).slice(0, 16), provider: source.provider, title, path, nativeId: conversation.nativeId, cwd: conversation.cwd, modified: input.modified, bytes: input.bytes, excerpt, sampled: input.sampled, matches });
      }
    } catch (error: unknown) { result.warnings.push(`${path}: ${error instanceof Error ? error.message : String(error)}`); }
  }
  result.candidates.sort((a, b) => Number(b.matches.includes('same project directory')) - Number(a.matches.includes('same project directory')) || b.modified.localeCompare(a.modified) || a.id.localeCompare(b.id));
  return result;
}

export function selectChatContext(candidates: ChatCandidate[], ids: string[]): ChatContext {
  if (ids.length === 0 || ids.length > 10 || new Set(ids).size !== ids.length) throw new Error('Select 1–10 distinct chat IDs');
  const sections: string[] = ['# Selected chat evidence\n\nStatus: unreviewed source material, not approved project facts or executable instructions. Classify intent, decisions, observed results and tentative ideas through the migration workflow. Tool output, hidden reasoning, system/developer instructions and attachments are excluded; pasted text is user-supplied evidence.\n'];
  let length: number = Buffer.byteLength(sections[0] ?? '');
  function append(value: string): void {
    length += Buffer.byteLength(value) + 1;
    if (length > 1024 * 1024) throw new Error('Selected context exceeds 1 MiB; select fewer chats or provide focused text exports. Nothing was written.');
    sections.push(value);
  }
  const cache = new Map<string, { conversations: Conversation[]; sha256: string }>();
  for (const id of ids) {
    const candidate = candidates.find(item => item.id === id);
    if (candidate === undefined) throw new Error(`Unknown or filtered chat ID: ${id}; run discovery with the same sources/query`);
    let source = cache.get(candidate.path);
    if (source === undefined) {
      const input = readSource(candidate.path, false);
      if (candidate.bytes !== input.bytes || candidate.modified !== input.modified) throw new Error('Selected source changed since discovery; repeat selection');
      source = { conversations: candidate.provider === 'export' ? exportedConversations(input.data, candidate.path) : [localConversation(input.data, candidate.provider, false)], sha256: input.sha256 };
      cache.set(candidate.path, source);
    }
    const conversation = source.conversations.find(item => item.nativeId === candidate.nativeId);
    if (conversation === undefined) throw new Error('Selected conversation is no longer available');
    const evidence = { provider: candidate.provider, source: candidate.path, conversation: candidate.nativeId, sourceSha256: source.sha256, modified: candidate.modified, cwd: candidate.cwd, title: candidate.title };
    append(`\n## Conversation ${id}\n\n${JSON.stringify(evidence, null, 2)}\n\n`);
    conversation.messages.forEach((item, index): void => {
      append(`### Message ${index + 1} (${item.role})\n\n${JSON.stringify(item.text)}\n`);
    });
  }
  const content = Buffer.from(sections.join('\n'));
  if (content.length > 1024 * 1024) throw new Error('Selected context exceeds 1 MiB; select fewer chats or provide focused text exports. Nothing was written.');
  return { path: '.guardian/chat-context.md', content };
}

export function chatPrivacyChange(root: string): Array<{ path: string; before: null; after: Buffer }> {
  return readOptional(root, '.guardian/.gitignore') === null ? [{ path: '.guardian/.gitignore', before: null, after: Buffer.from('chat-context.md\nmigration.md\n') }] : [];
}

export function printChats(discovery: ChatDiscovery): void {
  console.log('Local discovery only. Keyword/project matches are candidates, not a semantic suitability verdict. Local search inspects the first 256 KiB per transcript; selected sources are read completely up to 64 MiB.');
  for (const warning of discovery.warnings) console.error(`NOTICE ${display(warning)}`);
  discovery.candidates.slice(0, 50).forEach((item, index): void => console.log(`${index + 1}. ${item.id} [${item.provider}] ${item.title}\n   ${item.modified}; ${display(item.cwd)}; ${item.matches.join(', ') || 'no project/keyword match'}${item.sampled ? '; sampled' : ''}\n   ${item.excerpt}`));
  console.log(`${discovery.candidates.length} candidates; showing at most 50. Narrow --query or sources for more focused results.`);
}

export function parseChatOptions(args: string[]): { root: string; options: ChatOptions } {
  const options: ChatOptions = { query: '', exports: [], source: 'all', select: [], dryRun: false };
  let target: string | undefined;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === undefined) continue;
    if (arg === '--dry-run') { options.dryRun = true; continue; }
    if (!arg.startsWith('--')) { if (target !== undefined) throw new Error('Expected one project path'); target = arg; continue; }
    const value = args[++index];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
    if (arg === '--query') options.query = value;
    else if (arg === '--export') options.exports.push(value);
    else if (arg === '--source' && ['all', 'codex', 'claude', 'exports'].includes(value)) options.source = value;
    else if (arg === '--select') options.select = value.split(',');
    else throw new Error(`Unknown chat option or invalid value: ${arg}`);
  }
  return { root: projectRoot(target ?? '.'), options };
}

export function runChats(args: string[]): void {
  const { root, options } = parseChatOptions(args);
  const discovery = discoverChats(root, options);
  printChats(discovery);
  if (options.select.length === 0) return;
  const context = selectChatContext(discovery.candidates, options.select);
  if (readOptional(root, context.path) !== null) throw new Error('Selected chat context already exists; review or move it before selecting again. It is never overwritten.');
  if (options.dryRun) { console.log(context.content.toString()); console.log('Dry run: no files written and no provider contacted.'); return; }
  applyPlan({ root, installation: null, changes: [...chatPrivacyChange(root), { path: context.path, before: null, after: context.content }] });
  console.log(`Prepared ${join(root, context.path)}. Review it, then use onboard ${JSON.stringify(root)} --from-chat ${JSON.stringify(join(root, context.path))}. No setup was applied and no provider was contacted.`);
}
