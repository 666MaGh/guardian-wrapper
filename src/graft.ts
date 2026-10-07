import { spawn, spawnSync } from 'node:child_process';
import { lstatSync, readdirSync } from 'node:fs';
import type { Stats } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { safePath } from './files.js';

interface Locks {
  acquireLockIn(cache: string): boolean;
  releaseLockIn(cache: string): void;
}

export function graftRoot(): string {
  const require = createRequire(new URL('../runtime/package.json', import.meta.url));
  return dirname(require.resolve('@nanonets/graft/package.json'));
}

function rejectSymlinks(path: string): void {
  let stat: Stats;
  try { stat = lstatSync(path); }
  catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return;
    throw error;
  }
  if (stat.isSymbolicLink()) throw new Error(`Graft cache symlink: ${path}`);
  if (stat.isDirectory()) for (const child of readdirSync(path)) rejectSymlinks(join(path, child));
}

export function toolAvailable(name: string): boolean {
  const result = spawnSync(name, ['--version'], { stdio: 'ignore', timeout: 5000 });
  return result.error === undefined && result.status === 0;
}

async function lockApi(): Promise<Locks> {
  const value: unknown = await import(pathToFileURL(join(graftRoot(), 'dist/util/state.js')).href);
  if (typeof value !== 'object' || value === null || !('acquireLockIn' in value) || typeof value.acquireLockIn !== 'function' || !('releaseLockIn' in value) || typeof value.releaseLockIn !== 'function') throw new Error('Pinned graft lock API unavailable');
  return value as Locks;
}

export async function runGraft(root: string, args: string[]): Promise<void> {
  const command = args[0] ?? 'build';
  if (!['build', 'check', 'ask', 'grep', 'map', 'callers', 'skeleton', 'viz'].includes(command)) throw new Error(`Unsupported project graft command: ${command}`);
  if (command === 'build' && args.slice(1).some(arg => !['--deep', '--lsp', '--no-reuse'].includes(arg))) throw new Error('Build accepts --deep, --lsp and --no-reuse; the project argument selects its source root');
  // Prevent a inherited CLI override from directing writes to another project.
  if (args.some(arg => ['--dir', '-d', '--api-key'].includes(arg) || arg.startsWith('--dir=') || arg.startsWith('--api-key='))) throw new Error('Use the project argument for graft output and environment variables for credentials');
  rejectSymlinks(safePath(root, 'graft'));
  rejectSymlinks(safePath(root, '.graft'));
  const env: NodeJS.ProcessEnv = { ...process.env, DO_NOT_TRACK: '1' };
  delete env.GRAFT_DIR;
  const argv = [join(graftRoot(), 'dist/cli.js'), '--dir', join(root, 'graft'), ...args];
  if (command === 'build') argv.push('--no-gitignore', '--no-ignore');
  let locks: Locks | null = null;
  const cache = join(root, 'graft/.cache');
  if (command === 'build') {
    locks = await lockApi();
    const deadline = Date.now() + 30000;
    while (!locks.acquireLockIn(cache)) {
      if (Date.now() > deadline) throw new Error('Graft build busy; retry after the active build finishes');
      await delay(100);
    }
  }
  try {
    await new Promise<void>((resolve, reject): void => {
      const child = spawn(process.execPath, argv, { cwd: root, env, stdio: 'inherit' });
      const interrupt = (): void => { child.kill('SIGINT'); };
      const terminate = (): void => { child.kill('SIGTERM'); };
      process.once('SIGINT', interrupt);
      process.once('SIGTERM', terminate);
      child.once('close', (): void => {
        process.removeListener('SIGINT', interrupt);
        process.removeListener('SIGTERM', terminate);
      });
      child.once('error', reject);
      child.once('exit', (code: number | null, signal: NodeJS.Signals | null): void => {
        if (code === 0) resolve();
        else reject(new Error(`Graft ${command} failed (${signal ?? code ?? 'unknown'})`));
      });
    });
  } finally {
    locks?.releaseLockIn(cache);
  }
}

export async function watchEvents(root: string): Promise<void> {
  // fswatch emits NUL-separated paths. Coalesce bursts, with one pending rebuild
  // retained while the previous build runs; never infer events from git status.
  await new Promise<void>((resolve, reject): void => {
    let buffer = '';
    let pending = false;
    let active = false;
    let ended = false;
    let failure: Error | null = null;
    let timer: NodeJS.Timeout | null = null;
    async function drain(): Promise<void> {
      if (active) return;
      active = true;
      try {
        while (pending) {
          pending = false;
          try { await runGraft(root, ['build']); }
          catch (error: unknown) {
            failure = error instanceof Error ? error : new Error(String(error));
            process.stderr.write(`${failure.message}\n`);
          }
        }
      } finally {
        active = false;
        if (ended) {
          if (failure === null) resolve();
          else reject(failure);
        }
      }
    }
    process.stdin.on('data', (chunk: Buffer): void => {
      buffer += chunk.toString('utf8');
      const paths = buffer.split('\0');
      buffer = paths.pop() ?? '';
      if (!paths.some(path => path.length > 0)) return;
      pending = true;
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout((): void => { timer = null; void drain(); }, 300);
    });
    process.stdin.once('end', (): void => {
      ended = true;
      if (timer !== null) clearTimeout(timer);
      // A partial path is malformed; do not silently discard a change.
      if (buffer.length > 0) failure = new Error('Incomplete fswatch event (expected NUL separator)');
      void drain();
    });
    process.stdin.once('error', reject);
  });
}
