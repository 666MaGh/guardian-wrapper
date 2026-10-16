# Start by answering questions

Open your coding client in the project folder. With Guardian installed, write:

Claude Code:
```text
/guardian-main Hjälp mig komma igång. Ställ onboardingfrågorna och fråga om lokalt projektminne med Honcho.
```

Codex:
```text
$guardian-main Hjälp mig komma igång. Ställ onboardingfrågorna och fråga om lokalt projektminne med Honcho.
```

Without Guardian, give the coding agent this request:

```text
Install and set up Guardian from https://github.com/666MaGh/guardian-wrapper in this project. Read its README and docs/ONBOARDING.md. Guide me in this chat using its guided setup reference. Discover technical details yourself, ask unresolved questions in small rounds and show proposed changes before applying them. Ask whether I want local Honcho memory and whether new conversations may be saved automatically. Preserve existing project instructions and settings.
```

The agent performs the README's source installation in a separate tooling folder, builds the CLI and follows `assets/skills/guardian-main/references/onboarding.md`. Existing tool checkouts must be inspected and preserved, not overwritten. You should not have to edit JSON or use an API. The client still needs permission to run tools and download dependencies.

## Your choices

The agent reads existing files first, then asks only unresolved questions:

1. Project name, purpose and earlier work to bring along.
2. Claude Code, Codex or both; Standard Guardian profile or selected parts.
3. Whether to use local project memory with Honcho.
4. If yes, whether new conversations may be saved automatically or only on explicit request.

You can decline memory: Guardian, skills and structural graft still work. ADHD mode means smaller, clearer steps and can be disabled. Archive import is a separate choice. Existing answers are reused.

You see the proposed clients, profile, memory/capture choice, file changes and instructions to preserve. The agent installs approved parts and records settled answers, checks and remaining steps in `.guardian/onboarding.md`.

## Local memory

One Honcho server runs on the computer; each project gets its own workspace. Both coding clients use the same project memory and user identity. A workspace is a memory container, separate from the folder containing code. Generated IDs include a short unique suffix to avoid equally named folders colliding.

A healthy existing local server is reused. Otherwise onboarding offers a pinned Docker stack with Honcho, PostgreSQL/pgvector, Ollama, local text/embedding models and OpenConcho. First run downloads about 3.1 GB of models plus images. Docker needs at least 6 GiB assigned (8 GiB recommended). Portable Docker mode uses CPU on Mac; an existing native-GPU Honcho server is reused. Large-history quality/performance is not certified.

Honcho's processing stays local; the coding client's own model connection remains as configured. Automatic capture can retain conversation text and Codex tool notes. Memory observations remain evidence to review against project rules. No external model key is required by this local stack.

Connections, official hook runtimes and caches live in the project and are ignored by Git. No global Claude/Codex settings or shared global Honcho configuration are edited. Other MCP servers, hooks, permissions and instructions are preserved. Modified managed settings stop for review.

Workspace IDs give logical separation, not security isolation. This personal service binds to loopback with API authentication disabled; do not expose its ports as a production service.

## Last step

Open a new client session and review project/MCP/hook trust prompts. Guardian cannot approve those for you. Save a harmless fact, open the other selected client and ask it to recall that fact. Configuration and server health alone do not certify automatic capture.

Dashboard: http://127.0.0.1:8088. Select your workspace. API documentation: http://127.0.0.1:8008/docs. Opening the dashboard does not activate hooks.

## Commands for agents and experienced users

Use `node /path/to/guardian-wrapper/dist/cli.js` as the executable prefix after building, or `guardian-wrapper` if installed on PATH:

```sh
guardian-wrapper onboard /path/to/project
guardian-wrapper memory inspect /path/to/project
guardian-wrapper memory service start --dry-run
guardian-wrapper memory service start
guardian-wrapper memory setup /path/to/project --provider honcho --name "My app" --peer user --capture on --dry-run
guardian-wrapper memory setup /path/to/project --provider honcho --name "My app" --peer user --capture on
guardian-wrapper doctor /path/to/project
```

Core `init` must precede `memory setup`; the agent handles this staging. Repeated `onboard` without new sources resumes the brief. Omitted memory choices preserve a saved profile. `--capture off` removes managed automatic hooks while retaining MCP; `--provider none` records no memory.

A moved/copied profile requires a reviewed `--rebind` to reuse memory. An older manual connection needs reviewed `--adopt-existing`; supply its existing workspace if it should be retained. New clones without private profiles receive new IDs. Adoption keeps a private, Git-ignored backup of the old connection; switching capture off or disconnecting does not reactivate legacy capture hooks.

`memory remove <project> --dry-run` previews disconnection. Removal restores managed client fields while retaining server data and caches; run it before uninstalling Guardian. `memory service stop` stops only the wrapper-provisioned stack and keeps volumes. Independently installed servers keep their own Docker management.

Dry runs write nothing and make no downloads, API calls or Docker invocations. Workspace creation is separate from transactional file writes: a later file failure can leave a workspace behind. Retry reuses the same ID; saved data is never automatically deleted.
