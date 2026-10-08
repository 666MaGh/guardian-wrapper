# Requirements and dependencies

## Baseline

| Requirement | When needed | Supplied by wrapper? |
| --- | --- | --- |
| Node >=22.12.0 and npm | Install/build/run wrapper | No |
| Claude Code or Codex with working authentication | Use agent instructions/skills | No; install and sign in separately |
| Existing writable project directory | Project init | No; create or select it first |
| Network access | Initial npm installation; upstream may check npm during graft use | No |
| Native build tools (Python 3, C/C++ compiler, make/platform SDK) | If parser prebuilts are unavailable | No |
| Git | Clone source, version control, diff/review/worktree workflows | No; basic init supports a non-Git directory |

Node's floor is 22.12 because graft's commander 15 dependency is stricter than graft's own Node >=20 declaration. TypeScript 5.9.3 and @types/node 22.19.0 are build-time dependencies; the release's compiled CLI does not need a global TypeScript install. The wrapper postinstall script runs a separate locked npm ci for graft/native parsers; do not assume an --ignore-scripts install is usable. If npm script approvals are restricted, permit guardian-context-wrapper for the outer install and review the native packages marked below in the runtime policy. The nested install reads .npmrc policy itself; outer --allow-scripts flags and application package.json policies do not configure that separate installation root. No global npm configuration is changed.

On macOS a missing native toolchain can be installed with `xcode-select --install` plus a supported Python 3 installation. On Linux use your distribution's Python 3 and build tool packages (for example python3 and build-essential on Ubuntu). First target platforms are macOS and Linux. Local evidence covers macOS arm64/Node 26; Node 22/24 and macOS/Linux passed the earlier publication CI matrix; each feature release is checked again. Windows support is not claimed.

## Optional and workflow-specific requirements

| Capability | Additional requirements | Activation |
| --- | --- | --- |
| Continuous graph watch | Bash and fswatch; `brew install fswatch` on macOS, distribution fswatch package on Linux | init --watch, then explicitly start watch |
| Deep graft summaries | Provider credentials and configuration; GRAFT_API_KEY, GRAFT_PROVIDER, GRAFT_MODEL and where applicable GRAFT_BASE_URL | graft build --deep; may incur provider charges and transmit source context |
| LSP enrichment | Language-specific server executable and valid project config | graft build --lsp; runtime-specific availability |
| GitHub issues/PRs/releases | gh, authentication and repository permissions | Explicit tracker/workflow setup |
| GitLab tracking | glab, authentication and repository permissions | Select GitLab tracker |
| Other trackers | Relevant connector/CLI and auth, or local Markdown convention | Configure docs/agents/issue-tracker.md |
| Matt engineering workflow conventions | Tracker choice, triage vocabulary, GLOSSARY/domain docs and ADR location | Explicit setup-matt-pocock-skills request; inspect proposed writes |
| Parallel review/research/implementation | Host supports subagents/background work, permitted by host/project policy | Workflows requesting delegation; not a wrapper-created runtime |
| Research/UI prototypes | Browsing capability or access to supplied sources; project browser/test tools as appropriate | Relevant research/prototype task |
| git-guardrails-claude-code | Claude PreToolUse hooks, Bash and jq | Explicit opt-in hook install; Codex enforcement is not supplied |
| setup-pre-commit | Target repo package manager, Husky, lint-staged, Prettier and working project typecheck/test scripts | Explicit project change; packages are not installed by wrapper init |
| migrate-to-shoehorn | TypeScript test project and @total-typescript/shoehorn | Explicit migration |
| setup-ts-deep-modules | TypeScript repo/package layout, dependency-cruiser | Experimental explicit workflow |
| scaffold-exercises | Suitable AI Hero course project, pnpm and ai-hero-cli lint command | Specialized opt-in skill; not a generic project generator |
| claude-handoff | Claude CLI supports the upstream --bg/--name and agents interface | Experimental explicit workflow; verify current host support |
| wizard | Bash, common shell utilities/curl, target service access and any required gh/glab commands | Per generated provisioning procedure |

There is no single universal “all dependencies” installation: some skills target different environments and third-party accounts. All 40 can be installed together; full use means satisfying the relevant row for the selected workflow. Init does not authenticate hosts, configure trackers, install application dependencies, add git guards or run semantic adoption. Original user-only commands retain their policy. Shared AGENTS.md/CLAUDE.md conventions must be preserved when an upstream setup workflow proposes edits.

## Locked npm runtime inventory

Generated from runtime/npm-shrinkwrap.json on 2026-10-07; regenerate after any dependency update. Rows are installed package locations, including nested versions. runtime/npm-shrinkwrap.json preserves graft runtime resolution in the packed release. Package paths below are relative to runtime/node_modules. Licenses listed are manifest metadata; copyright/license files ship through npm, and maintainers should retain any required notices on redistribution.

| Package location | Version | Declared license | Install script |
| --- | --- | --- | --- |
| `@anthropic-ai/sdk` | 0.117.1 | MIT |  |
| `@babel/runtime` | 7.29.7 | MIT |  |
| `@nanonets/graft` | 0.21.1 | MIT | Yes |
| `@nanonets/graft/node_modules/tree-sitter` | 0.21.1 | MIT | Yes |
| `@nanonets/graft/node_modules/tree-sitter-go` | 0.23.4 | MIT | Yes |
| `@nanonets/graft/node_modules/tree-sitter-java` | 0.23.5 | MIT | Yes |
| `@nanonets/graft/node_modules/tree-sitter-javascript` | 0.23.1 | MIT | Yes |
| `@nanonets/graft/node_modules/tree-sitter-kotlin` | 0.3.8 | MIT | Yes |
| `@nanonets/graft/node_modules/tree-sitter-kotlin/node_modules/node-addon-api` | 7.1.1 | MIT |  |
| `@nanonets/graft/node_modules/tree-sitter-php` | 0.23.12 | MIT | Yes |
| `@nanonets/graft/node_modules/tree-sitter-python` | 0.21.0 | MIT | Yes |
| `@nanonets/graft/node_modules/tree-sitter-python/node_modules/node-addon-api` | 7.1.1 | MIT |  |
| `@nanonets/graft/node_modules/tree-sitter-r` | 1.3.0 | MIT | Yes |
| `@nanonets/graft/node_modules/tree-sitter-typescript` | 0.23.2 | MIT | Yes |
| `@stablelib/base64` | 1.0.1 | MIT |  |
| `argparse` | 2.0.1 | Python-2.0 |  |
| `commander` | 15.0.0 | MIT |  |
| `dotenv` | 17.4.2 | BSD-2-Clause |  |
| `esprima` | 4.0.1 | BSD-2-Clause |  |
| `extend-shallow` | 2.0.1 | MIT |  |
| `fast-sha256` | 1.3.0 | Unlicense |  |
| `gray-matter` | 4.0.3 | MIT |  |
| `is-extendable` | 0.1.1 | MIT |  |
| `isexe` | 2.0.0 | ISC |  |
| `js-yaml` | 3.15.2 | MIT |  |
| `json-schema-to-ts` | 3.1.1 | MIT |  |
| `kind-of` | 6.0.3 | MIT |  |
| `node-addon-api` | 8.9.2 | MIT |  |
| `node-gyp-build` | 4.8.4 | MIT |  |
| `openai` | 6.49.0 | Apache-2.0 |  |
| `section-matter` | 1.0.0 | MIT |  |
| `standardwebhooks` | 1.1.1 | MIT |  |
| `strip-bom-string` | 1.0.0 | MIT |  |
| `tree-sitter` | 0.22.4 | MIT | Yes |
| `tree-sitter-cli` | 0.23.2 | MIT | Yes |
| `tree-sitter-swift` | 0.7.1 | MIT | Yes |
| `tree-sitter-wasm` | 1.1.8 | MIT |  |
| `ts-algebra` | 2.0.0 | MIT |  |
| `vscode-jsonrpc` | 8.2.1 | MIT |  |
| `vscode-languageserver-protocol` | 3.18.4 | MIT |  |
| `vscode-languageserver-protocol/node_modules/vscode-jsonrpc` | 9.0.3 | MIT |  |
| `vscode-languageserver-types` | 3.18.4 | MIT |  |
| `web-tree-sitter` | 0.26.13 | MIT |  |
| `which` | 2.0.2 | ISC |  |

Provider SDKs are installed as graft dependencies even for structural-only use. Having the SDK installed does not cause an LLM request by itself. The 2026-10-07 security update removes `sprintf-js` from the installed tree. A scoped npm override replaces `js-yaml@3.15.2`'s `argparse` 1 dependency with exact `argparse` 2.0.1, which retains the legacy CLI aliases used by js-yaml and has no sprintf-js dependency. js-yaml 3 remains in place because gray-matter calls its safeLoad/safeDump API; replacing it with js-yaml 4 would break that API. Graft installs through the package postinstall script into runtime/ using its own npm ci and shrinkwrap. This isolated installation root is required because npm ignores dependency overrides belonging to installed libraries. The root lockfiles cover wrapper development tools; the runtime lock covers graft. No application dependencies or global agent settings are changed.

This eliminates the affected dependency chain for [GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c), rather than suppressing the advisory. Front-matter round trips, malformed YAML handling and YAML helper conversion/error handling are regression-tested alongside real graft builds. CI audits both the wrapper root and the isolated runtime. To audit a source checkout, run npm audit --omit=dev and npm audit --omit=dev --prefix runtime; audit an installed package by pointing --prefix at its runtime/ directory. Advisory results are time-bound and must be rechecked for each release. The internal js-yaml helper emits deprecation notices for legacy argparse aliases; its legacy --version option has no output under argparse 2. It is not a supported wrapper command, and graft uses the YAML library rather than this helper. argparse 2.0.1 uses Python-2.0; its upstream license is retained in the npm installation.

## Complete skill catalog

Default: core + engineering + productivity (30). --groups all adds misc and in-progress (40). Core is always present. The six in-progress skills retain upstream experimental status.

| Skill | Group | Source | Invocation policy |
| --- | --- | --- | --- |
| guardian | core | guardian | Host may invoke |
| i-have-adhd | core | i-have-adhd | Explicit user request |
| icm-architect | core | icm-architect | Host may invoke |
| ask-matt | engineering | mattpocock | Explicit user request |
| code-review | engineering | mattpocock | Host may invoke |
| codebase-design | engineering | mattpocock | Host may invoke |
| diagnosing-bugs | engineering | mattpocock | Host may invoke |
| domain-modeling | engineering | mattpocock | Host may invoke |
| grill-with-docs | engineering | mattpocock | Explicit user request |
| implement | engineering | mattpocock | Explicit user request |
| implement-spec | engineering | mattpocock | Explicit user request |
| improve-codebase-architecture | engineering | mattpocock | Explicit user request |
| pr | engineering | mattpocock | Host may invoke |
| prototype | engineering | mattpocock | Host may invoke |
| research | engineering | mattpocock | Host may invoke |
| retro | engineering | mattpocock | Explicit user request |
| setup-matt-pocock-skills | engineering | mattpocock | Explicit user request |
| tdd | engineering | mattpocock | Host may invoke |
| to-spec | engineering | mattpocock | Explicit user request |
| to-tickets | engineering | mattpocock | Explicit user request |
| triage | engineering | mattpocock | Explicit user request |
| wayfinder | engineering | mattpocock | Explicit user request |
| wizard | engineering | mattpocock | Host may invoke |
| claude-handoff | in-progress | mattpocock | Explicit user request |
| loop-me | in-progress | mattpocock | Explicit user request |
| setup-ts-deep-modules | in-progress | mattpocock | Explicit user request |
| writing-beats | in-progress | mattpocock | Explicit user request |
| writing-fragments | in-progress | mattpocock | Explicit user request |
| writing-shape | in-progress | mattpocock | Explicit user request |
| git-guardrails-claude-code | misc | mattpocock | Host may invoke |
| migrate-to-shoehorn | misc | mattpocock | Host may invoke |
| scaffold-exercises | misc | mattpocock | Host may invoke |
| setup-pre-commit | misc | mattpocock | Host may invoke |
| grill-me | productivity | mattpocock | Explicit user request |
| grilling | productivity | mattpocock | Host may invoke |
| handoff | productivity | mattpocock | Explicit user request |
| teach | productivity | mattpocock | Explicit user request |
| to-questionnaire | productivity | mattpocock | Explicit user request |
| wait-what | productivity | mattpocock | Explicit user request |
| writing-for-agents | productivity | mattpocock | Host may invoke |

## Guided onboarding

`onboard` requires an interactive terminal and a working Claude Code or Codex CLI in PATH. It probes both with `--version`, selects a sole available client or asks when both work. `--host claude|codex` selects explicitly. The chosen CLI must be authenticated; detection does not check login or account limits. It launches the normal interactive host with a starting prompt; it installs no SDK, connector, hook or credentials. The host's trust prompts, permissions, global configuration and account limits remain active. `--dry-run` and `migrate` require neither an authenticated host nor a provider request. External source documents may require host read-access approval. Source directories are not added as writable workspaces.

## Earlier chat discovery

No additional runtime dependency or provider SDK is added. Local Claude/Codex transcript formats and extracted ChatGPT/Claude JSON or UTF-8 text exports are supported as described in [CHAT-IMPORT.md](CHAT-IMPORT.md). ZIP files must be unpacked by the user. Discovery and selection are local; semantic review happens in the chosen existing agent. Optional Hindsight remains uninstalled.

## Optional Guardian workflows

`orchestrate` is enabled per project with `--orchestration on` or `config orchestration on`; it needs a host with permitted subagents for parallel work and Git worktrees for concurrent writers. It falls back to sequential execution when delegation is unavailable. `maintain` needs the target project's own package manager, network access for version/advisory queries and working verification commands. It starts the same authenticated interactive CLI as onboarding; no new SDK/service is installed. Both are instructions executed by the agent, not guaranteed background automation. Details: [orchestration](../assets/skills/guardian/references/orchestration.md), [maintenance](../assets/skills/guardian/references/maintenance.md).
