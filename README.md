# Guardian Wrapper

A project setup for Claude Code and Codex: Guardian, ICM Architect, ADHD communication, all 37 Matt Pocock skills as selectable groups, and pinned graft 0.21.1. Nothing is installed into your global agent settings. MIT; upstream credits and licenses are preserved.

## Purpose

Guardian Wrapper gives a coding agent a repeatable starting point in each project: shared instructions, discoverable workflows, durable project context, an inspectable code graph, and communication that reduces the effort of following the work. Guardian coordinates adoption, changes, bug fixes and verification; ICM structures context; Matt Pocock's workflows supply specialist methods.

It is a setup package and skill collection. Installing it does not understand your product automatically, run every skill, enforce TypeScript through a compiler, or guarantee correct agent behavior. Start with a read-only adoption request, then approve project-specific conventions and checks.

## Documentation

- [Architecture and sources](docs/ARCHITECTURE.md): what is inside and how the parts cooperate.
- [Requirements and full skill catalog](docs/DEPENDENCIES.md): mandatory, optional and workflow-specific tools.
- [Earlier chats as project evidence](docs/CHAT-IMPORT.md): local sessions, ChatGPT/Claude exports and selected review.
- [Fresh-session acceptance checks](docs/HOST-VERIFICATION.md): verify actual Claude Code and Codex behavior.
- [GitHub publication plan](docs/PUBLISHING.md): repository preparation, release gates and commands.
- [Contribution guide](CONTRIBUTING.md), [license and attribution](THIRD-PARTY-NOTICES.md), [local validation evidence](VALIDATION.md).

## Install from GitHub

Requires Node **22.12.0 or later** and npm. A native build toolchain may be needed for tree-sitter when prebuilt binaries are unavailable.

```sh
git clone https://github.com/666MaGh/guardian-wrapper.git
cd guardian-wrapper
npm ci
npm run build
node dist/cli.js init /path/to/project --groups all
```

Alternatively download the npm tarball from [GitHub Releases](https://github.com/666MaGh/guardian-wrapper/releases). Versions 0.1.0 and 0.2.0 are prereleases: project installation is tested, while fresh model-session behavior remains pending.

After building, **the last line is the single project setup command**. It works in ordinary directories and Git worktrees; it does not create a Git repository or adopt the product domain.

To install the CLI itself from a local tarball produced by `npm pack`:

```sh
npm install -g ./guardian-context-wrapper-0.2.0.tgz
guardian-wrapper init /path/to/project --groups all
```

The global npm installation is optional and performed by you. The package has not been published to npm; no registry command is claimed to work yet.

## First agent session

Open the initialized project in Claude Code or Codex and start a fresh conversation. Ask:

> Use Guardian to inspect this repository without editing application code. Read the project instructions and graft map. Report the current architecture, available checks, missing context, and a proposed adoption plan.

Confirm that the project-local Guardian is used. Claude project skills can be explicitly requested with `/guardian`; Codex skills with `$guardian`. Host UI/version determines the available invocation interface. Complete [fresh-session checks](docs/HOST-VERIFICATION.md) before treating a host/project combination as verified.

After adoption, try a bounded request such as: "Use Guardian to fix this bug, reproduce it first, and report what was verified." Request user-only specialist workflows explicitly; they are never chained automatically. Matt's tracker/domain setup is a separate opt-in workflow and can change project documentation; review its proposed changes against this wrapper's AGENTS.md convention.

## Migrate chat or project context

For guided onboarding, run one command in an interactive terminal:

```sh
guardian-wrapper onboard /path/to/project
# Or choose explicitly; optional inputs are a source project and/or saved chat handoff.
guardian-wrapper onboard /path/to/project --host codex --from-chat /path/to/handoff.md
guardian-wrapper onboard /path/to/new-project --host codex --from-project /path/to/source-project
```

`onboard` checks the Claude Code and Codex CLI executables in PATH using `--version`. A single working CLI is selected automatically; when both work it asks which one to use, and when neither works it shows installation/sign-in guidance. Detection checks executables, not authentication, subscriptions or which app invoked the wrapper. Use `--host claude|codex` to choose explicitly. A noninteractive dry-run with both available requires `--host`.

Before starting the agent, it offers local session history, exported chats, both or skipping earlier chats. You choose sources/search words and candidate conversations; only selected message text is retained. Use `--no-chats` to skip source selection or [chat import options](docs/CHAT-IMPORT.md) for a direct search/export workflow.

It prepares `.guardian/migration.md` and opens a fresh session of the selected agent with the onboarding request already supplied. The agent inspects existing instructions, asks unresolved questions in small rounds, waits for answers and presents concrete changes for approval before applying setup/context changes. It works in an existing empty folder or a project that already has instructions/setup. `init` remains the installation command; onboarding is an explicit command, not an init or SessionStart hook. The CLI must already be installed and signed in; its normal trust/permission prompts and account limits still apply. Existing global settings are retained, so verify provider conflicts during onboarding.

Use `--dry-run` to preview without writes or agent launch. Use `--resume` to reopen an existing brief without overwriting your decisions; it cannot be combined with new source flags. If the agent exits or its account is limited, the prepared brief remains available for resuming with either host:

```sh
guardian-wrapper onboard /path/to/project --host codex --resume
```

`migrate` prepares a local review brief. It inventories the target's root/nested AGENTS.md, CLAUDE.md, README.md, glossary and agent rules; optional sources can be another project, a saved chat handoff, or both. It records source paths/hashes and leaves existing documents intact. It neither installs the setup nor copies source assertions into policy.

```sh
# Reconcile an existing project or prepare a new setup in an existing empty folder.
guardian-wrapper migrate /path/to/project
# Bring knowledge from a saved chat summary.
guardian-wrapper migrate /path/to/project --from-chat /path/to/handoff.md
# Transfer selected context from another project.
guardian-wrapper migrate /path/to/new-project --from-project /path/to/source-project
# Inspect the inputs/questions without writing anything.
guardian-wrapper migrate /path/to/project --from-project /path/to/source-project --dry-run
```

Then open a new agent conversation in the target and ask:

> Read .guardian/migration.md and inspect the listed inputs. Ask me the unresolved migration questions, then show the proposed file/content changes for my review before applying them.

The brief embeds the workflow, so it also works before Guardian is installed. The agent asks about purpose, what remains valid, conflicts, existing rules, glossary, hosts/skills, tracker and checks. After your answers it shows a source-to-destination proposal and the setup dry run. Approved context/setup changes are applied only to the target; the source remains intact. Existing user text and subtree rules are preserved. See [migration workflow](assets/skills/guardian/references/migration.md).

For the current chat, ask Guardian to create a reviewed handoff using [this template](assets/skills/guardian/assets/templates/context-handoff.md). For a different chat, supply a pasted summary/export file. `migrate` does not contact a provider. `onboard` launches your installed Claude Code/Codex CLI; semantic synthesis and questions happen in that agent conversation, using its existing authentication and account limits. File inventory is not a conflict-resolution engine. Sources outside the target may need host file-access approval.

`.guardian/migration.md` is user-editable, never overwritten, and not claimed by the installation manifest. Move a completed brief before preparing a new one. It contains machine-local paths: keep it local; init adds its gitignore entry. Dry-run is fully read-only. Discovery skips symlinks and common generated/vendor directories and is bounded to 12 levels, 10,000 entries and 200 context files; each input is limited to 1 MiB. Use focused summaries/subprojects for larger sources. The 0.1.0 package predates onboarding, migration and chat discovery. Use the 0.2.0 source checkout or its GitHub release assets when available.

## Choose a profile

Default profile: core + engineering + productivity (30 skills), both hosts, ADHD on, graft on. All groups include 40 skills including the three core skills. Original user-only commands retain their restrictions.

```sh
guardian-wrapper init /path/to/project --groups core --skills tdd,code-review
guardian-wrapper init /path/to/project --groups all --dry-run
guardian-wrapper init /path/to/project --hosts codex --graft off
guardian-wrapper init /path/to/project --watch
```

Groups: `core`, `engineering`, `productivity`, `misc`, `in-progress`, `all`. Core is always included. `in-progress` skills are experimental upstream workflows. `list` shows all skills and invocation policy. Explicit groups/skills replace the previous selection; omitted choices preserve an existing profile.

`--dry-run` changes nothing: no project writes, downloads, graph builds or services. Existing directories are required so the target is unambiguous. Real init preflights conflicts, builds graft, then transactionally writes owned files and managed instruction blocks. A failed graph build leaves instructions uninstalled; generated cache may remain. A failed file transaction rolls back its completed writes. A hard process kill or power loss is not guaranteed to roll back; the next doctor exposes incomplete state.

## Installed project

```text
AGENTS.md                     common instructions in a managed block
CLAUDE.md                     imports @AGENTS.md in a managed block
.agents/skills/                selected Codex skills
.claude/skills/                selected Claude Code skills
.guardian/config.json         profile (change through CLI)
.guardian/installation.json   owned paths, originals and hashes
.guardian/communication.md    startup communication reference
.guardian/bin/guardian.mjs    project command launcher
.guardian/runtime.json        machine-local binding to this installed package
.guardian/licenses/           upstream licenses
docs/agents/guardian.md       installed capability catalog; no false adoption claim
scripts/watch-graft.sh        optional watcher
graft/                       regenerable local graph
```

Existing user instructions survive installation. Existing skill files are never silently claimed, even when identical; overlapping installations require an explicit decision. Global skills/plugins remain intact, and doctor flags known global skill copies. Check actual provider names and shadowing in a **fresh host session**. The wrapper does not automatically invoke user-only skills.

The launcher binds to the installed wrapper location. If the wrapper/checkouts move, run init from the new CLI location to refresh runtime.json. Skills remain readable even when the runtime has moved. Runtime dependencies belong to this wrapper, not the application's package.json. Installation runs a second locked npm install inside the package’s runtime/ directory for graft; network/native-toolchain requirements still apply. Use npm audit --omit=dev --prefix /path/to/installed-wrapper/runtime to audit that tree.

Project commands work without putting the wrapper on PATH:

```sh
node .guardian/bin/guardian.mjs doctor .
node .guardian/bin/guardian.mjs config . adhd off
node .guardian/bin/guardian.mjs graft . ask "where is login handled?"
node .guardian/bin/guardian.mjs graft . callers login
node .guardian/bin/guardian.mjs graft . build
```

ADHD defaults to on. Say `stop adhd mode` to disable it for the current session, or use config to change the project's startup default. The startup reference has the original communication rules, independent of the explicit-only slash command. This installation does not remove another plugin's global ADHD injection; reconcile such global behavior in the host if you use it.

## Graft and watch

Default graft analysis is structural and makes no LLM request. `build --deep` explicitly selects provider-backed summaries; use environment variables for credentials. LSP is optional. Telemetry is disabled for wrapper invocations with DO_NOT_TRACK=1, but upstream graft can check npm for version updates. No graft cloud/Trail or global host init is performed. The CLI uses graft's shared build lock to coordinate with retrieval refresh.

Install fswatch separately for continuous editor monitoring (`brew install fswatch` on macOS). Initialize with `--watch`, then:

```sh
node .guardian/bin/guardian.mjs watch .
```

The sh script watches one explicit root and sends NUL-separated file paths. Bursts are debounced and a pending rebuild is retained during active builds. Graphs, caches, dependency directories and Drive temporary files are excluded. Ctrl-C stops the watcher. Query refresh is sufficient for ordinary graft use; the watcher is optional and is not started by init.

## Optional agents and dependency maintenance

These commands are available from the source checkout after rebuilding. Enable orchestration per project; it is off by default:

```sh
guardian-wrapper config /path/to/project orchestration on
# Or select it during installation:
guardian-wrapper init /path/to/project --orchestration on
guardian-wrapper orchestrate /path/to/project --host codex --task "Implement the approved login change and review it"
guardian-wrapper config /path/to/project orchestration off
```

The command opens agent chat with the requested task and Guardian's coordination workflow. It uses the host's subagents when available, passes project context explicitly, keeps one writer by default and separates Standards/Spec review. Small or tightly coupled tasks remain sequential. Enabling the option does not automatically delegate every task. Guardian adds no agent daemon, experimental team setting or global configuration. See [workflow and pinned Matt Pocock methods](assets/skills/guardian/references/orchestration.md).

Start dependency maintenance in the same way:

```sh
guardian-wrapper maintain /path/to/project --host claude
# Inspect the wrapper, bundled skills and app dependencies together:
guardian-wrapper maintain /path/to/project --scope all --host codex
# Preview without agent launch, dependency downloads or project writes:
guardian-wrapper maintain /path/to/project --scope app --host codex --dry-run
```

Scopes are `app` (default), `wrapper`, `skills` and `all`. The agent discovers the application's package manager/workspaces, checks versions and release notes, proposes concrete changes, then waits for your approval before applying them and running the project's checks. Existing installed Guardian profiles and modified files are checked before launch. Dependency updates are an agent-assisted workflow, not a deterministic unattended updater; the chosen host needs authentication, permissions and tools for the target project. No compatibility pass is claimed until real checks run.

Wrapper/skill updates in a consumer project use a reviewed Guardian release and the ordinary setup `update`; vendored source/lock changes belong in an explicitly selected wrapper source checkout. The workflow preserves security overrides and source provenance. Read [the maintenance procedure](assets/skills/guardian/references/maintenance.md). The wrapper repository also has weekly Dependabot proposals for root npm, graft runtime and GitHub Actions; they are reviewed through CI, with synchronized locks, rather than automatically merged.

Both commands require an installed project and an interactive terminal for actual launch. A sole selected host is used automatically; when both hosts are selected the same executable discovery/choice as onboarding applies. `--host` must belong to the project profile. `--dry-run` previews the prompt without launching a provider. Use `node .guardian/bin/guardian.mjs` instead of `guardian-wrapper` when the CLI is not on PATH. Account limits and normal host permissions still apply.

## Update and uninstall

```sh
guardian-wrapper update /path/to/project --dry-run
guardian-wrapper update /path/to/project
guardian-wrapper uninstall /path/to/project --dry-run
guardian-wrapper uninstall /path/to/project
```

Update installs the release of the CLI you are actually running; it does not download latest skills or update itself. Manually edited owned files/blocks stop update/uninstall. Preserve your edits before restoring the owned version and rerunning. Edits outside managed blocks survive. Uninstall restores original files or removes owned blocks; generated graft cache, empty directories and unrelated files remain.

## Claude plugin export

```sh
node dist/cli.js export-plugin ./artifacts/guardian-plugin --groups all
claude plugin validate ./artifacts/guardian-plugin
claude --plugin-dir ./artifacts/guardian-plugin
```

Export destination must be new. The generated plugin includes selected skills and a SessionStart ADHD hook. When a project profile exists, the hook defers to AGENTS.md to avoid duplicate injection. For plugin use, initialize the project with `--hosts codex` so the CLI still creates AGENTS.md/CLAUDE.md and graft without a second Claude skill provider. Plugin commands are namespaced, such as `/guardian-wrapper:guardian`. A native Codex plugin is not included; Codex uses its documented project skill directories.

## Verification and maintenance

```sh
npm test
npm run typecheck
npm run check:assets
npm pack
```

Tests cover installation, preservation, conflicts, symlinks/case collisions, rollback, selection, plugin output and real graft changes. CI config targets macOS/Linux with Node 22/24; local validation does not claim those remote jobs ran. Doctor verifies owned bytes/blocks and reports tool presence. It does not certify host discovery, subagent permission, application tests or CI enforcement.

Vendored source snapshots and exact hashes are in sources.lock.json; wrapper build resolution is in package-lock.json and the synchronized root npm-shrinkwrap.json. Graft has a separate runtime/package.json and runtime/npm-shrinkwrap.json; postinstall runs npm ci in that isolated directory so consumers receive the reviewed security override. Both runtime manifests and the installer are included in the release. Maintainers change assets deliberately, regenerate the communication reference when its skill changes, run `node scripts/lock-assets.mjs`, then verify. No upstream refresh happens during feature work. See THIRD-PARTY-NOTICES.md for sources and adaptations.

## Optional project memory

Hindsight is a possible future addon for remembering reviewed decisions and session summaries across Claude/Codex sessions. It is not installed or required by this wrapper. See the [source review and proposed integration](docs/HINDSIGHT.md) for the available mechanisms, added dependencies and project-scoped design.
