import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import type { Change, Plan } from './types.js';

export function hash(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}

export function safePath(root: string, path: string): string {
  if (!path || isAbsolute(path) || path.split(/[\\/]/).includes('..') || path.includes('\\') || path.includes(':')) {
    throw new Error(`Unsafe relative path: ${path}`);
  }
  const full = resolve(root, path);
  if (!full.startsWith(root + sep)) throw new Error(`Path leaves project: ${path}`);
  let parent = root;
  for (const part of relative(root, full).split(sep)) {
    if (existsSync(parent)) {
      if (!lstatSync(parent).isDirectory()) throw new Error(`Parent is not a directory: ${parent}`);
      const collision = readdirSync(parent).find(name => name.toLowerCase() === part.toLowerCase() && name !== part);
      if (collision) throw new Error(`Case collision: ${join(parent, collision)}`);
    }
    parent = join(parent, part);
    // lstat also detects dangling symlinks, unlike existsSync.
    try {
      if (lstatSync(parent).isSymbolicLink()) throw new Error(`Symlink destination: ${parent}`);
    } catch (error: unknown) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    }
  }
  return full;
}

export function readOptional(root: string, path: string): Buffer | null {
  const full = safePath(root, path);
  if (!existsSync(full)) return null;
  if (!lstatSync(full).isFile()) throw new Error(`Expected file: ${path}`);
  return readFileSync(full);
}

export function listFiles(root: string, prefix = ''): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(join(root, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error(`Unexpected symlink in bundle: ${path}`);
    if (entry.isDirectory()) result.push(...listFiles(root, path));
    else if (entry.isFile()) result.push(path);
  }
  return result.sort();
}

function same(left: Buffer | null, right: Buffer | null): boolean {
  return left === null ? right === null : right !== null && left.equals(right);
}

function writeChange(root: string, change: Change, directories: string[]): void {
  const full = safePath(root, change.path);
  if (!same(readOptional(root, change.path), change.before)) throw new Error(`Concurrent edit: ${change.path}`);
  if (change.after === null) {
    if (change.before !== null) unlinkSync(full);
    return;
  }
  const absent: string[] = [];
  let parent = dirname(full);
  while (!existsSync(parent)) {
    absent.push(parent);
    parent = dirname(parent);
  }
  for (const directory of absent.reverse()) {
    mkdirSync(directory);
    directories.push(directory);
  }
  if (change.before === null) writeFileSync(full, change.after, { flag: 'wx' });
  else {
    const temporary = `${full}.${randomUUID()}.tmp`;
    try {
      writeFileSync(temporary, change.after, { flag: 'wx' });
      if (!same(readOptional(root, change.path), change.before)) throw new Error(`Concurrent edit: ${change.path}`);
      renameSync(temporary, full);
    } finally {
      if (existsSync(temporary)) unlinkSync(temporary);
    }
  }
}

export function applyPlan(plan: Plan): void {
  // Validate all destinations and expected input bytes before any mutation.
  for (const change of plan.changes) {
    if (!same(readOptional(plan.root, change.path), change.before)) throw new Error(`Concurrent edit: ${change.path}`);
  }
  const lockDirectory = safePath(plan.root, '.guardian');
  const createdLockDirectory = !existsSync(lockDirectory);
  mkdirSync(lockDirectory, { recursive: true });
  const lockPath = safePath(plan.root, '.guardian/install.lock');
  writeFileSync(lockPath, String(process.pid), { flag: 'wx' });
  const completed: Change[] = [];
  const directories: string[] = [];
  try {
    for (const change of plan.changes) {
      writeChange(plan.root, change, directories);
      completed.push(change);
    }
  } catch (error: unknown) {
    for (const change of completed.reverse()) {
      if (!same(readOptional(plan.root, change.path), change.after)) continue;
      const full = safePath(plan.root, change.path);
      if (change.before === null) {
        if (existsSync(full)) unlinkSync(full);
      } else writeFileSync(full, change.before);
    }
    for (const directory of directories.reverse()) {
      try { rmdirSync(directory); } catch { /* Preserve nonempty directories. */ }
    }
    throw error;
  } finally {
    unlinkSync(lockPath);
    if (createdLockDirectory) {
      try { rmdirSync(lockDirectory); } catch { /* The successful installation owns files here. */ }
    }
  }
}
