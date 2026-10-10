import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const skills = JSON.parse(readFileSync(join(root, 'assets/catalog.json'), 'utf8'));
const files = {};
function walk(directory, prefix = '') {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.name === '.git') throw new Error(`Git metadata must not be vendored: ${path}`);
    if (entry.isSymbolicLink()) throw new Error(`Symlink in bundle: ${path}`);
    if (entry.isDirectory()) walk(join(directory, entry.name), path);
    else files[path] = createHash('sha256').update(readFileSync(join(directory, entry.name))).digest('hex');
  }
}
walk(join(root, 'assets'));
writeFileSync(join(root, 'sources.lock.json'), JSON.stringify({
  schema: 1,
  sources: {
    guardian: { origin: 'User-provided Claude/Codex chat output, attribution supplied by user', version: '0.3.0 adapted for wrapper 0.2.0', license: 'MIT' },
    mattpocock: { url: 'https://github.com/mattpocock/skills', revision: 'd81f3a183412e71a5b1e84ca21bc1a35eea03a60', version: '1.2.3', license: 'MIT', skills: skills.filter(skill => skill.provider === 'mattpocock').map(skill => skill.sourceName) },
    'icm-architect': { url: 'https://github.com/RinDig/icm-architect', origin: 'User-provided installed Git checkout, tracked files clean before wrapper adaptations', revision: 'e16cafe6a664dcf6d787a726b452adba77d913f4', copyright: '2026 Jake Van Clief', license: 'MIT' },
    'i-have-adhd': { url: 'https://github.com/ayghri/i-have-adhd', origin: 'User-provided installed skill snapshot; upstream copyright/license retained', revision: null, license: 'MIT' },
    'karpathy-guidelines': { url: 'https://github.com/multica-ai/andrej-karpathy-skills', revision: '2c606141936f1eeef17fa3043a72095b4765b9c2', path: 'skills/karpathy-guidelines', version: '1.0.0', license: 'MIT', licenseEvidence: ['skills/karpathy-guidelines/SKILL.md frontmatter', 'README.md License section', '.claude-plugin/plugin.json'], author: 'forrestchang (upstream plugin manifest)', upstreamLicenseFile: false },
    ponytail: { url: 'https://github.com/DietrichGebert/ponytail', revision: '9cc65d03aa2da1db7121b912d03596409ee340b8', version: '5.1.0', license: 'MIT', copyright: '2026 DietrichGebert', skills: ['guardian-audit'], upstreamPath: 'skills/ponytail-audit/SKILL.md' },
    graft: { package: '@nanonets/graft', version: '0.21.1', url: 'https://github.com/trailhq/Graft', license: 'MIT', dependencyLock: 'runtime/npm-shrinkwrap.json' }
  },
  skillNames: Object.fromEntries(skills.map(skill => [skill.name, skill.sourceName])),
  adaptations: [
    'Guardian bundling contract, Codex routing, GLOSSARY.md and wrapper doctor; legacy Python checker and project-specific HexTurf guidance removed',
    'ICM authoritative AGENTS.md and CLAUDE.md import convention',
    'Explicit-only Codex metadata added when absent; upstream skill policy retained',
    'ADHD startup reference generated from the supplied skill; old global opt-in hook removed',
    'New project-scoped fswatch script and CLI replace the supplied watcher implementation',
    'Guardian guided chat/project context migration, selected conversation evidence and handoff template added by wrapper author',
    'Karpathy behavioral body retained with Guardian naming; wrapper adds a license declaration record and project/Guardian pointers without copying upstream CLAUDE.md or Cursor settings',
    'All bundled skill names, host invocation examples and cross-skill calls use guardian-; original upstream names are retained in the catalog/source mapping, with explicit-only policies unchanged',
    'Ponytail decision ladder adapted into Guardian change reference; ponytail-audit renamed guardian-audit with project context and user-language adaptation; no modes, hooks or remaining Ponytail skills imported',
    'Optional Guardian orchestration adapts Matt research, code-review and TDD; coordination and dependency maintenance are wrapper-authored workflows'
  ],
  files: Object.fromEntries(Object.entries(files).sort(([left], [right]) => left.localeCompare(right)))
}, null, 2) + '\n');
