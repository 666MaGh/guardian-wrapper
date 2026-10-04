import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { assetsRoot } from './bundle.js';
import { applyPlan, hash, readOptional, safePath } from './files.js';
import { projectRoot } from './install.js';
import type { Plan } from './types.js';

interface DocumentRef {
  path: string;
  sha256: string;
  bytes: number;
}

interface Inventory {
  project: string;
  documents: DocumentRef[];
  inheritedInstructions: DocumentRef[];
  skippedSymlinks: string[];
}

function reference(path: string): DocumentRef {
  const size = statSync(path).size;
  if (size > 1024 * 1024) throw new Error(`Context input exceeds 1 MiB: ${path}; provide a focused summary`);
  const bytes = readFileSync(path);
  if (bytes.includes(0)) throw new Error(`Expected a text context document: ${path}`);
  return { path, sha256: hash(bytes), bytes: bytes.length };
}

function inventory(root: string): Inventory {
  const result: Inventory = { project: root, documents: [], inheritedInstructions: [], skippedSymlinks: [] };
  const ignored = new Set(['.git', '.guardian', '.agents', 'node_modules', 'vendor', 'dist', 'build', 'coverage', 'graft', '.expo', 'Pods']);
  let visited = 0;
  function walk(directory: string, prefix: string, depth: number): void {
    if (depth > 12) throw new Error('Context inventory exceeds 12 directory levels; choose a narrower project');
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (++visited > 10000) throw new Error('Context inventory exceeds 10000 entries; choose a narrower project');
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) { result.skippedSymlinks.push(relative); continue; }
      if (entry.isDirectory()) {
        if (prefix.split('/').at(-1) === '.claude' && entry.name === 'skills') continue;
        if (!ignored.has(entry.name) && (!entry.name.startsWith('.') || entry.name === '.claude')) walk(join(directory, entry.name), relative, depth + 1);
      } else if (entry.isFile() && (/^(AGENTS|CLAUDE|README|CONTEXT|GLOSSARY)\.md$/i.test(entry.name)
        || /(^|\/)docs\/agents\//.test(relative) && entry.name.endsWith('.md')
        || /(^|\/)\.claude\/(rules|commands)\//.test(relative) && entry.name.endsWith('.md'))) {
        result.documents.push(reference(safePath(root, relative)));
        if (result.documents.length > 200) throw new Error('More than 200 context documents; choose a narrower project');
      }
    }
  }
  walk(root, '', 0);
  let parent = dirname(root);
  while (parent !== root) {
    for (const name of ['AGENTS.md', 'CLAUDE.md']) {
      const path = join(parent, name);
      if (existsSync(path) && lstatSync(path).isSymbolicLink()) result.skippedSymlinks.push(path);
      if (existsSync(path) && !lstatSync(path).isSymbolicLink() && lstatSync(path).isFile()) result.inheritedInstructions.push(reference(path));
    }
    const next = dirname(parent);
    if (next === parent) break;
    parent = next;
  }
  return result;
}

export function prepareMigration(args: string[], quiet: boolean = false): string {
  let target = '.';
  let hasTarget = false;
  let sourceProject: string | null = null;
  let chat: string | null = null;
  let dryRun = false;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === undefined) continue;
    if (arg === '--dry-run') { dryRun = true; continue; }
    if (arg === '--from-project' || arg === '--from-chat') {
      const value = args[++index];
      if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      if (arg === '--from-project') {
        if (sourceProject !== null) throw new Error('Specify --from-project only once');
        sourceProject = value;
      } else {
        if (chat !== null) throw new Error('Specify --from-chat only once');
        chat = value;
      }
    } else if (arg.startsWith('--')) throw new Error(`Unknown migration option: ${arg}`);
    else {
      if (hasTarget) throw new Error('Expected one target project path');
      target = arg;
      hasTarget = true;
    }
  }
  const root = projectRoot(target);
  if (!statSync(root).isDirectory()) throw new Error('Migration target must be an existing directory');
  const chatPath = chat === null ? null : realpathSync(resolve(chat));
  if (chatPath !== null && !statSync(chatPath).isFile()) throw new Error('Chat input must be a text file');
  const sourceRoot = sourceProject === null ? null : projectRoot(sourceProject);
  if (sourceRoot !== null && !statSync(sourceRoot).isDirectory()) throw new Error('Source project must be a directory');
  const inputs = { schema: 1, target: inventory(root), source: sourceRoot === null ? null : inventory(sourceRoot), chat: chatPath === null ? null : reference(chatPath) };
  const guide = readFileSync(join(assetsRoot, 'skills/guardian/references/migration.md'), 'utf8').replace('../assets/templates/context-handoff.md', '#chat-handoff-template');
  const handoff = readFileSync(join(assetsRoot, 'skills/guardian/assets/templates/context-handoff.md'), 'utf8');
  const body = `# Guided migration brief\n\nStage: prepared; no setup or context migration has been applied.\n\nSource document bytes are not copied. Paths and SHA-256 values identify the reviewed inputs; recheck them before transferring facts. File inventories do not resolve semantic conflicts.\n\n## Input inventory\n\n\`\`\`json\n${JSON.stringify(inputs, null, 2)}\n\`\`\`\n\n## Agent workflow\n\n${guide}\n## Chat handoff template\n\n${handoff}`;
  const path = '.guardian/migration.md';
  const before = readOptional(root, path);
  if (before !== null) throw new Error('A migration brief already exists; review or move it before preparing another. It is never overwritten.');
  if (!quiet) console.log(body);
  if (dryRun) {
    console.log('Dry run: no files written, no init, no downloads, no graph build.');
    return root;
  }
  const plan: Plan = { root, installation: null, changes: [{ path, before: null, after: Buffer.from(body) }] };
  applyPlan(plan);
  if (!quiet) console.log(`Prepared ${join(root, path)}. Start onboarding with: guardian-wrapper onboard ${JSON.stringify(root)} --host claude --resume (or select --host codex)`);
  return root;
}
