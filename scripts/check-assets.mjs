import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { assetsRoot, catalog, verifyBundle } from '../dist/bundle.js';

verifyBundle();
assert.deepEqual(JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8')), JSON.parse(readFileSync(new URL('../npm-shrinkwrap.json', import.meta.url), 'utf8')), 'Keep the release shrinkwrap synchronized with package-lock.json');
const skills = catalog();
assert.equal(skills.length, 40);
assert.equal(new Set(skills.map(skill => skill.name)).size, 40);
for (const skill of skills) {
  const directory = join(assetsRoot, 'skills', skill.name);
  const body = readFileSync(join(directory, 'SKILL.md'), 'utf8');
  assert.ok(body.startsWith('---\n'), `${skill.name}: frontmatter missing`);
  assert.ok(existsSync(join(directory, 'LICENSE')), `${skill.name}: license missing`);
  assert.equal(/^disable-model-invocation:\s*true\s*$/m.test(body.split('---')[1]), skill.userOnly, `${skill.name}: invocation mismatch`);
  if (skill.userOnly) assert.match(readFileSync(join(directory, 'agents/openai.yaml'), 'utf8'), /allow_implicit_invocation: false/);
}
const adhd = readFileSync(join(assetsRoot, 'skills/i-have-adhd/SKILL.md'), 'utf8').replace(/^---[^\S\r\n]*\r?\n[\s\S]*?\r?\n---[^\S\r\n]*(?:\r?\n|$)/, '').trim();
assert.equal(readFileSync(join(assetsRoot, 'communication/adhd.md'), 'utf8').trim(), adhd, 'Regenerate the ADHD reference after editing its skill');
console.log(`Integrity, licenses and invocation policy OK: ${skills.length} skills.`);
