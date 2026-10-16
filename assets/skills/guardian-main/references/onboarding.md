# Guided project setup

Use when the user asks to set up Guardian, get started, add project memory, or reconcile an installation. Work in the current agent chat; do not launch a nested agent to ask questions. Discover technical facts yourself. Speak the user's language (Swedish by default), explain unfamiliar terms once, and ask at most two questions per round.

## Inspect first

Read the target's AGENTS.md, CLAUDE.md, README, nested rules, package/test commands and existing Guardian profile. Read prepared migration evidence and `.guardian/onboarding.md` when present. Keep settled answers; report the actual remaining step instead of restarting the interview.

Run `guardian-wrapper memory inspect <project>` through the real installed CLI prefix. It reports the saved choice and local server health; `--dry-run` inspects files without API calls. The project folder must already exist. Never infer working clients or memory from file creation alone.

## Ask only unresolved questions

1. **Purpose and context:** propose the name/purpose from project files and ask the user to correct them. Ask whether to bring in earlier chats or another project only if unsettled. Follow migration's explicit source-selection process; never ingest an entire archive automatically.
2. **Profile:** recommend the current client and ask whether to support the other too. Offer Standard (core + engineering + productivity, ADHD on, structural graft, no watcher) or a selective profile. Preserve existing choices. Explain ADHD as clearer, smaller steps that can be disabled.
3. **Memory:** ask "Vill du att projektet ska kunna minnas mellan chattar med lokal Honcho?" Recommend it when available; explain that Guardian also works without it. A workspace is this project's memory container, separate from its source-code folder.
4. If yes, ask "Får nya konversationer i det här projektet sparas automatiskt, eller vill du bara spara när du ber om det?" Recommend automatic capture, but wait for an explicit answer. Explain that conversation text and Codex tool notes can be retained locally. Local memory does not make the coding client's own model local. Propose a short stable user ID if none is known.

Declined memory is recorded with provider none; no Docker integrations are installed. Preserve existing workspace/identity/capture choices unless a change is requested. A copied/moved profile needs an explicit reuse/new choice (`--rebind` only for reviewed reuse).

For older manual connections, inspect the project's workspace and hook commands. Offer to keep the workspace. Use `--adopt-existing` only after showing the connection/hooks to replace. Preserve other MCP servers, hooks and permissions. Never edit global client settings or the shared global Honcho config.

## Prepare one concrete proposal

Summarize project/purpose, selected evidence, clients, profile, ADHD, graft, memory, automatic capture and preserved instructions. `memory setup --dry-run` proposes a collision-resistant workspace ID if omitted. The human need not invent IDs, edit JSON, or run curl.

If no local server responds, ask whether to install the additional Docker service or continue without memory. `memory service start --dry-run` previews without commands/network/writes. Fresh portable setup downloads about 3.1 GB of models plus images, needs Docker running and at least 6 GiB assigned (8 GiB recommended), and uses CPU on macOS. A healthy existing native-GPU Honcho setup is reused. Do not promise speed/quality for large histories. If opening/installing Docker or changing its resource allocation needs human action, give that one action and resume from the same point afterwards.

Show the agreed init/update dry run. Memory setup requires core installation: on a new project, explain that staging, install the approved core, then show the memory dry run before applying that portion. Show conflicts and exact replacements before seeking approval. Existing authorization for the same concrete scope persists. Source projects remain intact.

## Apply the approved answers

Use the actual wrapper executable. These describe its arguments; perform them for the user:

- `init <project> ...` or `update <project> ...` for the agreed profile.
- If needed and approved: `memory service start` once per computer. Never start a server per project. Failed starts retain downloads/data; diagnose or retry without deleting volumes.
- No memory: `memory setup <project> --provider none --name <name>`.
- Local memory: preview then apply `memory setup <project> --provider honcho --name <name> --peer <user-id> --capture on|off [--workspace <existing-id>] [--adopt-existing]`. Use identical arguments for dry run and apply. Omitted workspace preserves the saved choice or generates a new ID shared by both clients.

No separate plugin installer or manual dashboard workspace creation is needed. `--capture off` keeps MCP for explicit memory operations and removes managed automatic hooks. Modified managed settings stop for review. Local file application is transactional; workspace creation is a separate server action. If later file application fails, report the retained workspace and retry without deleting it.

## Verify and hand off

Run `doctor <project>` and `memory inspect <project>`. Confirm the profile, workspace, health, instruction pointers and preserved content. Record settled answers, selected sources, exact checks and completed/pending status in `.guardian/onboarding.md`. Exclude secrets and raw transcripts.

Finish with one next action: open a fresh client in this folder and review project/MCP/hook trust prompts. Never bypass those decisions. In that session save a harmless test fact; open the other selected client and ask for it. Mark automatic capture and cross-client recall verified only with actual client evidence. Give the dashboard's project link and explain any test workspaces. The user should know what is ready, what remains and how to continue without repeating answers.
