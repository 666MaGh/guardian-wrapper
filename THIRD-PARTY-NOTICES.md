# Sources and adaptations

The wrapper CLI, installer, project watcher and adapted Guardian distribution are MIT, copyright 2026 Martin Ghaoui. Guardian and the initial installer/watcher were supplied by the user as Claude/Codex chat output; the original conversation has not been independently inspected.

## Matt Pocock skills

Source: https://github.com/mattpocock/skills
Revision: d81f3a183412e71a5b1e84ca21bc1a35eea03a60 (plugin 1.2.3).
All 37 skill folders and their resources are bundled. Copyright 2026 Matt Pocock, MIT. See assets/licenses/mattpocock.txt and each skill's LICENSE. Existing credits, including engineering/pr/CREDITS.md, are retained. User-only skills retain their invocation restriction; Codex metadata is added only where necessary.

## ICM Architect

Source: https://github.com/RinDig/icm-architect
Revision: e16cafe6a664dcf6d787a726b452adba77d913f4, obtained from the supplied local Git checkout. Tracked files were clean before wrapper adaptations. Copyright 2026 Jake Van Clief, MIT. See assets/licenses/icm-architect.txt. Git metadata is excluded from the bundle. The wrapper adapts the entry-file convention to authoritative AGENTS.md plus importing CLAUDE.md; templates and system-map references follow that convention. The original human review gates remain.

## i-have-adhd

Source identified by the supplied hook: https://github.com/ayghri/i-have-adhd
User-supplied skill snapshot, copyright 2026 Ayoub Ghriss, MIT. See assets/licenses/i-have-adhd.txt. No Git revision is claimed for the local snapshot. The communication reference is generated from SKILL.md; project instructions activate it. The old global opt-in hook is not shipped. The original explicit-only skill remains available.

## Graft and runtime dependencies

@nanonets/graft 0.21.1, MIT. Upstream: https://github.com/trailhq/Graft (formerly NanoNets/context-graph-engine). Installed as a pinned npm dependency with its own license and all transitive licenses preserved by npm. package-lock.json records exact resolved runtime/development dependencies and integrity values. Native tree-sitter installation may require a build toolchain where a compatible prebuilt binary is unavailable.

## Runtime boundaries

No LLM request occurs during the default structural build. Deep summaries are explicit and use the caller's provider settings. Wrapper invocations set DO_NOT_TRACK=1 for graft; graft may still check npm for updates using its existing version-check behavior. Global agent settings, hooks, skills and statuslines are not written by the wrapper. fswatch is an optional external program, not redistributed here; its own license applies to its installation.

sources.lock.json records all shipped asset hashes and adaptations. Ordinary project commands do not refresh upstream skills; maintainers update a reviewed release explicitly.
