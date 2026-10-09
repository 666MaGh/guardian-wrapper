# Sources and adaptations

The wrapper CLI, installer, project watcher, guided migration workflow and adapted Guardian distribution are MIT, copyright 2026 Martin Ghaoui. Guardian and the initial installer/watcher were supplied by the user as Claude/Codex chat output; the original conversation has not been independently inspected.

## Matt Pocock skills

Source: https://github.com/mattpocock/skills
Revision: d81f3a183412e71a5b1e84ca21bc1a35eea03a60 (plugin 1.2.3).
All 37 skill folders and their resources are bundled. Copyright 2026 Matt Pocock, MIT. See assets/licenses/mattpocock.txt and each skill's LICENSE. Existing credits, including engineering/pr/CREDITS.md, are retained. User-only skills retain their invocation restriction; Codex metadata is added only where necessary.

Guardian's optional coordination workflow adapts primary-source background research, independent Standards/Spec review and behavioral vertical slices from the pinned `research`, `code-review` and `tdd` skills. Task/file ownership, host fallback and dependency maintenance are Guardian additions, not an upstream Matt updater or agent scheduler. Exact links appear in the orchestration reference; the underlying skill snapshots are unchanged.

## Karpathy-inspired guidelines

Source: https://github.com/multica-ai/andrej-karpathy-skills
Revision: 2c606141936f1eeef17fa3043a72095b4765b9c2 (plugin 1.0.0).
The original `skills/karpathy-guidelines/SKILL.md` is bundled unchanged, including its link to Andrej Karpathy's observations. Upstream `.claude-plugin/plugin.json` names forrestchang as the author. This is an independent Karpathy-inspired repository, not a claim of Karpathy authorship or endorsement.

MIT is explicitly declared in the skill frontmatter, README License section and plugin manifest. This pinned upstream tree contains no separate LICENSE file or copyright notice. The wrapper records those declarations and supplies standard MIT permission/disclaimer text in assets/licenses/karpathy-guidelines.txt and the skill's LICENSE without inventing a copyright holder/year. Added project/Guardian pointers and licensing records are wrapper integration; no upstream root CLAUDE.md, Cursor settings or marketplace is redistributed.

## ICM Architect

Source: https://github.com/RinDig/icm-architect
Revision: e16cafe6a664dcf6d787a726b452adba77d913f4, obtained from the supplied local Git checkout. Tracked files were clean before wrapper adaptations. Copyright 2026 Jake Van Clief, MIT. See assets/licenses/icm-architect.txt. Git metadata is excluded from the bundle. The wrapper adapts the entry-file convention to authoritative AGENTS.md plus importing CLAUDE.md; templates and system-map references follow that convention. The original human review gates remain.

## i-have-adhd

Source identified by the supplied hook: https://github.com/ayghri/i-have-adhd
User-supplied skill snapshot, copyright 2026 Ayoub Ghriss, MIT. See assets/licenses/i-have-adhd.txt. No Git revision is claimed for the local snapshot. The communication reference is generated from SKILL.md; project instructions activate it. The old global opt-in hook is not shipped. The original explicit-only skill remains available.

## Graft and runtime dependencies

@nanonets/graft 0.21.1, MIT. Upstream: https://github.com/trailhq/Graft (formerly NanoNets/context-graph-engine). Installed as a pinned npm dependency with its own license and all transitive licenses preserved by npm. runtime/npm-shrinkwrap.json records exact graft runtime dependencies and integrity values; the root lockfiles cover development tools. Native tree-sitter installation may require a build toolchain where a compatible prebuilt binary is unavailable.

The scoped js-yaml 3.15.2 → argparse override pins argparse 2.0.1 to remove the vulnerable sprintf-js dependency. argparse 2.0.1 is distributed under Python-2.0, with its complete upstream license retained by npm. No upstream source files are patched. See docs/DEPENDENCIES.md for compatibility and validation.

## Runtime boundaries

No LLM request occurs during the default structural build. Deep summaries are explicit and use the caller's provider settings. Wrapper invocations set DO_NOT_TRACK=1 for graft; graft may still check npm for updates using its existing version-check behavior. Global agent settings, hooks, skills and statuslines are not written by the wrapper. fswatch is an optional external program, not redistributed here; its own license applies to its installation.

sources.lock.json records all shipped asset hashes and adaptations. Ordinary project commands do not refresh upstream skills; maintainers update a reviewed release explicitly.
