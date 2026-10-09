import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { assetsRoot, version } from './bundle.js';
import { listFiles } from './files.js';
import type { Profile } from './types.js';

export function exportPlugin(destination: string, profile: Profile): void {
  // Exclusive creation prevents blending a new plugin with an old export.
  mkdirSync(dirname(destination), { recursive: true });
  mkdirSync(destination);
  for (const name of profile.skills) {
    const source = join(assetsRoot, 'skills', name);
    for (const path of listFiles(source)) {
      const target = join(destination, 'skills', name, path);
      mkdirSync(join(target, '..'), { recursive: true });
      writeFileSync(target, readFileSync(join(source, path)), { flag: 'wx' });
    }
  }
  mkdirSync(join(destination, '.claude-plugin'));
  writeFileSync(join(destination, '.claude-plugin/plugin.json'), JSON.stringify({
    name: 'guardian-wrapper', version, description: 'Guardian with ICM, ADHD, Karpathy guidelines and selected Matt Pocock skills', author: { name: 'Martin Ghaoui' }, license: 'MIT',
  }, null, 2) + '\n');
  if (profile.adhd) {
    mkdirSync(join(destination, 'hooks'));
    writeFileSync(join(destination, 'hooks/adhd.md'), readFileSync(join(assetsRoot, 'communication/adhd.md')));
    writeFileSync(join(destination, 'hooks/session-start.mjs'), readFileSync(join(assetsRoot, 'scripts/plugin-session-start.mjs')));
    writeFileSync(join(destination, 'hooks/hooks.json'), JSON.stringify({ hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/session-start.mjs"' }] }] } }, null, 2) + '\n');
  }
  for (const name of ['LICENSE', 'THIRD-PARTY-NOTICES.md', 'sources.lock.json']) {
    writeFileSync(join(destination, name), readFileSync(new URL(`../${name}`, import.meta.url)));
  }
  writeFileSync(join(destination, 'README.md'), '# Guardian plugin\n\nLoad with `claude --plugin-dir <this-directory>`. Run guardian-wrapper init in the project for AGENTS.md, CLAUDE.md and graft. Use init --hosts codex to avoid duplicate Claude skills when using this plugin. Plugin identifiers are namespaced.\n');
}
