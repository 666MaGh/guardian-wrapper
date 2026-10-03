import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash, listFiles } from './files.js';
import type { Installation, OwnedFile, Profile, Skill } from './types.js';

export const packageRoot: string = fileURLToPath(new URL('../', import.meta.url));
export const assetsRoot: string = join(packageRoot, 'assets');
export const version: string = '0.2.0';

export function object(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Expected JSON object');
  return value as Record<string, unknown>;
}

export function strings(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every((entry: unknown): entry is string => typeof entry === 'string')) {
    throw new Error('Expected array of strings');
  }
  return value;
}

function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error('Expected boolean');
  return value;
}

export function parseProfile(value: unknown): Profile {
  const profile = object(value);
  return { hosts: strings(profile.hosts), skills: strings(profile.skills), adhd: boolean(profile.adhd), graft: boolean(profile.graft), watch: boolean(profile.watch) };
}

export function catalog(): Skill[] {
  const raw: unknown = JSON.parse(readFileSync(join(assetsRoot, 'catalog.json'), 'utf8'));
  if (!Array.isArray(raw)) throw new Error('Invalid skill catalog');
  return raw.map((value: unknown): Skill => {
    const entry = object(value);
    for (const field of ['name', 'group', 'provider']) if (typeof entry[field] !== 'string') throw new Error(`Invalid catalog ${field}`);
    if (typeof entry.name !== 'string' || !/^[a-z0-9-]+$/.test(entry.name)) throw new Error('Unsafe skill name');
    return { name: entry.name, group: String(entry.group), provider: String(entry.provider), userOnly: boolean(entry.userOnly) };
  });
}

export function verifyBundle(): void {
  const lock: unknown = JSON.parse(readFileSync(join(packageRoot, 'sources.lock.json'), 'utf8'));
  const files = object(object(lock).files);
  const actual = listFiles(assetsRoot);
  if (actual.length !== Object.keys(files).length) throw new Error('Bundle file inventory differs from sources.lock.json');
  for (const path of actual) {
    if (files[path] !== hash(readFileSync(join(assetsRoot, path)))) throw new Error(`Bundle integrity mismatch: ${path}`);
  }
}

export function parseInstallation(raw: Buffer): Installation {
  const value = object(JSON.parse(raw.toString('utf8')) as unknown);
  if (value.schema !== 1 || typeof value.version !== 'string') throw new Error('Unsupported installation manifest');
  const files: Record<string, OwnedFile> = {};
  for (const [path, rawFile] of Object.entries(object(value.files))) {
    const entry = object(rawFile);
    if ((entry.kind !== 'file' && entry.kind !== 'block') || typeof entry.hash !== 'string' || !/^[a-f0-9]{64}$/.test(entry.hash)) throw new Error(`Invalid manifest entry: ${path}`);
    if (entry.original !== null && typeof entry.original !== 'string') throw new Error(`Invalid original: ${path}`);
    if (entry.block !== null && typeof entry.block !== 'string') throw new Error(`Invalid block: ${path}`);
    if (entry.kind === 'block' && entry.block === null) throw new Error(`Missing block: ${path}`);
    files[path] = { kind: entry.kind, hash: entry.hash, original: entry.original, block: entry.block };
  }
  return { schema: 1, version: value.version, profile: parseProfile(value.profile), files };
}
