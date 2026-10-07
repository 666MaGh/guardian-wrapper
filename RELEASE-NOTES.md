# Guardian Wrapper 0.2.0 — prerelease

Project-local Guardian, ICM, ADHD communication, all 37 selectable Matt Pocock skills, graft 0.21.1 and optional fswatch. Shared AGENTS.md/CLAUDE.md instructions preserve existing project text.

This release adds guided onboarding with automatic Claude/Codex CLI detection, context migration from another project or saved chat, local session discovery and selected ChatGPT/Claude JSON/text export import. The agent asks questions and proposes project changes before application. Local discovery calls no model; selected evidence is available to the chosen agent during onboarding. Hindsight remains an optional design proposal, not a dependency.

```sh
npm install -g ./guardian-context-wrapper-0.2.0.tgz
guardian-wrapper onboard /path/to/project
```

Requires Node >=22.12 and npm, plus an installed/authenticated Claude Code or Codex CLI. Optional watcher requires Bash/fswatch. macOS/Linux are tested; Windows is not certified. No npm registry publication is included.

43 local tests, strict typecheck and asset integrity are recorded in VALIDATION.md. Earlier real read-only Claude plugin/Codex project-session checks passed; model behavior is not universally certified. This remains a prerelease. Chat export schemas are fixture-tested and may change. Local session discovery samples the first 256 KiB; selected sources must fit 64 MiB and the evidence packet 1 MiB. Unknown formats and ambiguous branches are reported. The selected packet is unreviewed evidence, not established product facts. ZIP exports must be unpacked first.

See README, docs/CHAT-IMPORT.md and docs/DEPENDENCIES.md for use, limits and data flow. Upstream notices are retained; SHA256SUMS covers the release package and Claude plugin archive.

Security update: a scoped, locked argparse 2.0.1 override removes sprintf-js from graft’s dependency chain. Graft installs into a separate runtime through its own locked npm ci so the security update reaches package consumers. Front-matter parsing/stringifying and internal YAML helper conversion/error handling are regression-tested; no advisory suppression or upstream source patch is used. The runtime advisory audit is a required CI step.
