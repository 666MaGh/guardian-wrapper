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
| Public-tree review | 207 intended public files scanned for private keys, common GitHub/provider token patterns and private user paths; no candidate hits. This is a bounded pattern review, not a full secret-scanner certification |
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

The included CI configuration targets macOS and Linux with Node 22 and 24. All four remote jobs passed on the initial publication commit e9b3828. [CI run](https://github.com/666MaGh/guardian-wrapper/actions/runs/37151383475). Each runner installed fswatch so the watcher test executed. Windows support is not claimed. A hard process kill/power loss is not guaranteed to roll back file installation; doctor exposes incomplete state. Existing global ADHD hooks and installed providers remain untouched.

The public GitHub repository is https://github.com/666MaGh/guardian-wrapper. No npm registry publication, deployment, global plugin installation or changes to existing application repositories were performed.

## GitHub preflight

Owner confirmed as 666MaGh; proposed name guardian-wrapper. gh is authenticated locally and could not resolve 666MaGh/guardian-wrapper on 2026-10-03. The public repository was created and its first four CI jobs passed. CI installs fswatch on both platforms. Fresh host model-session checks remain pending. All 20 local tests, typecheck and asset checks passed again after documentation/release preparation.

## Publication verification

GitHub secret scanning and push protection are enabled. Private vulnerability reporting, Dependabot alerts and automated security-fix pull requests are enabled. The initial secret scanning alert query returned no alerts. Release 0.1.0 is designated a prerelease because fresh model-session acceptance remains pending. Required branch checks use the actual four passing job names and GitHub Actions application identity.

A new npm ci completed successfully after two temporary GitHub HTTP 500 responses for the tree-sitter-cli binary. No dependency or install-script bypass was introduced. All 20 tests, typecheck, asset checks and runtime advisory audit passed after that clean reinstall.

## Guided migration candidate — 0.2.0

Added bounded source/target inventory, saved-chat references, nested/inherited instruction discovery, a user-editable review brief and Guardian's question/proposal/apply workflow. The migration command itself performs no semantic imports or setup installation.

26 local tests pass, including preservation of original documents/source projects, dry-run, existing-brief protection, symlink/vendor exclusion, scoped rules/commands, invalid/binary/oversized inputs and coexistence with init/update/uninstall. Strict typecheck and asset integrity checks pass. Real-project inventory was checked read-only. No new runtime dependency was added. Interactive semantic migration has not been model-validated; it still requires the user's answers and proposal review.

## Claude read-only retry and onboarding candidate — 2026-10-04

The account limit no longer blocked requests. A fresh Claude Code session explicitly loaded the v0.1.0 `guardian-wrapper:guardian` plugin in the initialized test project, reported ADHD on, queried the project graft launcher for an exported function's callers, identified package responsibilities/check commands and surfaced existing glossary/provider conflicts. No project code was changed. A broader Bash read was denied by the restricted evaluation allowlist; Read/Glob provided the information. This verifies the plugin's read-only inspection path, not the entire host checklist or semantic migration. The first retry omitted actual skill invocation and is excluded from the skill acceptance result. Private project logs remain local.

The 0.2.0 candidate adds explicit `onboard --host claude|codex`: prepare a review brief, start the normal interactive host with questions/proposal review already requested, and preserve a brief through `--resume`. It is not an init or SessionStart hook and adds no provider SDK. Complete user-answer/proposal/apply acceptance remains pending.

29 local tests pass, including onboarding dry-run, invalid/noninteractive preflight, initial brief preparation and preserving reviewed decisions on explicit resume. Strict typecheck and bundle integrity pass. Pseudo-terminal launch tests with fixture Claude/Codex executables confirm inherited terminal input/output, target working directory, one literal prompt argument, propagated exit status and no automatic init. These fixtures verify launching, not real model behavior.

A real fresh Claude session with the new onboarding prompt inspected a disposable target, source rules and saved chat handoff, then asked three unresolved questions about purpose, glossary conflict and tentative tracker choice. It stopped awaiting answers and did not install setup or change existing target documents. Hash recomputation was explicitly unverified because the evaluation allowed file-reading tools only. This verifies the first question stage; the complete approved migration remains pending. A read-only onboarding dry-run also worked through the existing project launcher.

## Automatic onboarding client discovery — 2026-10-04

`onboard <project>` now checks working Claude/Codex CLI executables in PATH, selects a sole client, asks when both work and gives installation/sign-in guidance when neither works. Explicit `--host` overrides selection. This detects CLI availability, not authentication or the invoking app. The onboarding prompt identifies the selected client for the setup-profile discussion; installation remains subject to questions and proposal review.

33 local tests pass; strict typecheck and asset integrity pass. New fixtures cover each sole client, failed/missing executables, ambiguity in a noninteractive preview and explicit override. Pseudo-terminal tests choose both clients separately, confirm target/terminal/prompt handoff and propagated exit status, and cancel at EOF without creating a brief. Existing project documents remain intact and no setup is applied automatically. Fixture launch tests do not make provider requests.

## Selected chat evidence — 2026-10-07

Local Claude Code/Codex JSONL discovery and ChatGPT/Claude JSON/text export selection feed the existing migration brief and onboarding. Evidence remains unreviewed until the agent and user settle its scope and status. No new runtime dependency or Hindsight ingestion is added.

41 local tests pass, including active ChatGPT branch selection, role/tool/reasoning filtering, keyword/project ranking, bounded sampling, malformed/ambiguous/duplicate inputs, changed sources, symlinks, private output, dry-run, existing-file protection and coexistence with init/uninstall. Export schemas are synthetic-fixture tested; no real user account export was supplied. Actual provider behavior and CLI versions can vary; full project adoption still requires user answers and approval.

Pseudo-terminal acceptance exercises both fixture clients through export selection, keyword search and chat choice, confirming the target directory, inherited terminal, selected evidence/brief handoff and propagated exit status without automatic setup. Read-only discovery against existing local sessions found both Claude Code and Codex candidates; it wrote no files and contacted no provider.

The 2026-10-07 runtime audit reports five moderate affected package entries for one unpatched sprintf-js advisory, GHSA-hp3w-g68c-fv3c, through graft/gray-matter/js-yaml/argparse. This audit does not pass; no claim of an advisory-free release is made. Exploitability through graft is unverified. See docs/DEPENDENCIES.md.

A clean npm consumer installed the 0.2.0 tarball with native dependency scripts enabled. Core init, doctor, export browsing, selected packet creation, read-only dry-run and uninstall passed; original README and selected evidence survived. The all-skills Claude plugin export passed `claude plugin validate`.

The 0.2.0 chat-import PR matrix passed macOS/Linux with Node 22/24 ([run](https://github.com/666MaGh/guardian-wrapper/actions/runs/37641616403)). A duplicate branch-push macOS job failed before starting because GitHub could not acquire a runner; rerun endpoints returned HTTP 500. CI now verifies pull requests and main/tag pushes, avoiding duplicate branch-push jobs while retaining all four required platform checks. The exact final tarball consumer also passed migration-brief preparation and preservation through uninstall.
