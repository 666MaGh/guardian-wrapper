# Verification — 0.1.0

Performed locally on 2026-10-03, macOS arm64, Node 26.4.0, npm 11.17.0.

| Check | Result |
| --- | --- |
| npm test | 20 tests passed, 0 failed, 0 skipped |
| npm run typecheck | Passed with strict TypeScript settings |
| npm run check:assets | All 40 skills: inventory hashes, licenses, explicit-only policy and generated ADHD reference passed |
| Bash syntax check | watch-graft.sh passed |
| YAML/frontmatter check | All 40 SKILL.md headers parsed; names/descriptions and Codex explicit-only metadata passed |
| Skill creator validator | Guardian and ICM passed. ADHD passed on a temporary copy with the unsupported disable-model-invocation header omitted; shipped header was retained and checked independently |
| claude plugin validate artifacts/guardian-plugin | Validation passed |
| Public-tree review | 205 intended public files scanned for private keys, common GitHub/provider token patterns and private user paths; no candidate hits. This is a bounded pattern review, not a full secret-scanner certification |
| npm advisory audit | npm audit --omit=dev reported zero known vulnerabilities on 2026-10-03 |
| Public documentation | Usage, purpose, architecture/provenance, all skills and locked runtime inventory documented; local Markdown links checked; docs included in npm package |
| npm package inventory | Every asset in sources.lock.json is packed; npm-shrinkwrap.json included; Git metadata excluded |
| Clean tarball consumer install | Installed the actual .tgz into a separate temporary npm project; packaged binary reported 0.1.0. This consumer run preceded the later documentation-only repack; CLI/assets/runtime code are unchanged |
| Packaged full project setup | All 40 skills installed for both hosts; structural graph contains the fixture's symbol |
| Packaged idempotency | Second init had zero file changes and an unchanged installation manifest |
| Packaged doctor/config/uninstall | Doctor passed; project launcher disabled ADHD; uninstall restored original AGENTS.md |
| Real fswatch/editor pipeline | Editor save rebuilt graph without Git in a parent directory |
| Wrapper's own graft graph | Build and freshness check ran successfully |

The integration tests also verify preservation of edits outside managed blocks, conflict stops for edited owned files, symlink/case-collision protection, concurrent edit detection, file-transaction rollback, active installation locking, skill selection, host deselection, optional project arguments, plugin SessionStart behavior, symbol retrieval and graph add/rename/delete updates.

## Remaining verification boundaries

Native Claude plugin validation verifies the manifest, not model behavior. A fresh Claude Code and Codex conversation has not been run against a real application with these instructions. Application tests, semantic adoption, skill/provider discovery and subagent access must be checked in the selected host/project.

The included CI configuration targets macOS and Linux with Node 22 and 24. Those remote jobs have not run because no remote repository or publication was created. Windows support is not claimed. A hard process kill/power loss is not guaranteed to roll back file installation; doctor exposes incomplete state. Existing global ADHD hooks and installed providers remain untouched.

No npm publication, deployment, global plugin installation or changes to existing application repositories were performed.

## GitHub preflight

Owner confirmed as 666MaGh; proposed name guardian-wrapper. gh is authenticated locally and could not resolve 666MaGh/guardian-wrapper on 2026-10-03. No repository has been created. CI now installs fswatch on both platforms so the watcher integration check should execute rather than skip; remote results remain pending. All 20 local tests, typecheck and asset checks passed again after documentation/release preparation.
