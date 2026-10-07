# Guardian Wrapper 0.2.0 — prerelease

Project-local Guardian, ICM, ADHD communication, all 37 selectable Matt Pocock skills, graft 0.21.1 and optional fswatch. Shared AGENTS.md/CLAUDE.md instructions preserve existing project text.

This release adds guided onboarding with automatic Claude/Codex CLI detection, context migration from another project or saved chat, local session discovery and selected ChatGPT/Claude JSON/text export import. The agent asks questions and proposes project changes before application. Local discovery calls no model; selected evidence is available to the chosen agent during onboarding. Hindsight remains an optional design proposal, not a dependency.

```sh
npm install -g ./guardian-context-wrapper-0.2.0.tgz
guardian-wrapper onboard /path/to/project
```

Requires Node >=22.12 and npm, plus an installed/authenticated Claude Code or Codex CLI. Optional watcher requires Bash/fswatch. macOS/Linux are tested; Windows is not certified. No npm registry publication is included.

41 local tests, strict typecheck and asset integrity are recorded in VALIDATION.md. Earlier real read-only Claude plugin/Codex project-session checks passed; model behavior is not universally certified. This remains a prerelease. Chat export schemas are fixture-tested and may change. Local session discovery samples the first 256 KiB; selected sources must fit 64 MiB and the evidence packet 1 MiB. Unknown formats and ambiguous branches are reported. The selected packet is unreviewed evidence, not established product facts. ZIP exports must be unpacked first.

See README, docs/CHAT-IMPORT.md and docs/DEPENDENCIES.md for use, limits and data flow. Upstream notices are retained; SHA256SUMS covers the release package and Claude plugin archive.

Known dependency issue: the runtime audit reports five moderate affected entries from one unpatched [sprintf-js advisory](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) in graft’s transitive dependencies. No forced dependency replacement is applied; stable-release clearance remains pending.
