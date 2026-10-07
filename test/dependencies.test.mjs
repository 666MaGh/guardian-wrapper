import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { graftRoot } from '../dist/graft.js';

const graftRequire = createRequire(join(graftRoot(), 'package.json'));
const matter = graftRequire('gray-matter');
const matterRequire = createRequire(graftRequire.resolve('gray-matter'));
const yamlPath = matterRequire.resolve('js-yaml');
const yamlRequire = createRequire(yamlPath);

test('graft front matter preserves node provenance and prose with the secured dependency tree', () => {
  const data = {
    name: 'Graph: användare', slug: 'users', type: 'concept',
    sources: [{ path: 'src/users.ts', hash: 'abc123' }],
    links: [{ to: 'storage', relation: 'depends-on' }],
    enabled: true, count: 2, description: 'First line\nSecond line',
  };
  const content = '# Notes\nPreserve human-written text.\n';
  const parsed = matter(matter.stringify(content, data));
  assert.deepEqual(parsed.data, data);
  assert.equal(parsed.content.trim(), content.trim());
  assert.throws(() => matter('---\nitems: [unterminated\n---\nNotes\n'), /unexpected|end|flow/i);
  assert.throws(() => yamlRequire.resolve('sprintf-js'), /Cannot find module/);
});

test('internal js-yaml helper supports help, conversion and invalid-input errors', () => {
  const cli = join(dirname(yamlPath), 'bin/js-yaml.js');
  function run(args, input = '') {
    return spawnSync(process.execPath, [cli, ...args], { input, encoding: 'utf8', timeout: 10000 });
  }
  const help = run(['--help']);
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /--compact/);
  const converted = run(['--to-json'], 'name: guardian\nenabled: true\n');
  assert.equal(converted.status, 0, converted.stderr);
  assert.deepEqual(JSON.parse(converted.stdout), { name: 'guardian', enabled: true });
  assert.notEqual(run(['--compact'], 'items: [unterminated\n').status, 0);
  assert.notEqual(run(['--unknown-option']).status, 0);
});
