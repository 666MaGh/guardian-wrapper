# Earlier chats as project evidence

Local Claude Code/Codex sessions and exported ChatGPT/Claude conversations feed the same onboarding review. No Hindsight, database or new provider SDK is required.

## Start onboarding

```sh
guardian-wrapper onboard .
# From a built source checkout:
node /path/to/guardian-wrapper/dist/cli.js onboard /path/to/project
```

Use an existing folder, including an empty folder for a new project. The wrapper selects the available client or asks when both work. It offers local sessions, exported chats, both, or skipping chats. These terminal questions select evidence before the agent starts; project-purpose, conflict and migration questions happen in the agent chat. Choose candidate numbers or IDs, up to ten conversations. Blank selection skips import.

Only selected message text is saved in `.guardian/chat-context.md`. The migration brief references that packet. The agent separates intent, decisions, tentative ideas and implementation claims, asks unresolved questions, then presents concrete proposed changes before application. Original histories remain intact.

```sh
guardian-wrapper onboard . --no-chats
guardian-wrapper onboard . --resume
```

## Find local sessions

```sh
guardian-wrapper chats . --query "puzzle offline"
guardian-wrapper chats . --source codex --query "puzzle"
guardian-wrapper onboard . --chats --query "puzzle"
```

Codex uses `$CODEX_HOME/sessions` and `archived_sessions` (default `~/.codex`); Claude Code uses `$CLAUDE_CONFIG_DIR/projects` (default `~/.claude`). See [Codex storage](https://learn.chatgpt.com/docs/reference/troubleshooting#feedback-and-logs) and [Claude storage](https://code.claude.com/docs/en/sessions#where-transcripts-are-stored). Recognized subagent/sidechain transcripts are excluded.

All query words must match the inspected title, directory or message text, ignoring case. Exact project-directory association ranks first, then source-file modification date. This timestamp is not proof of when a decision was made. Retrieval is keyword matching, not an AI suitability verdict. JSONL formats are internal and can change; unknown/malformed inputs are reported. A rendered client text export is the fallback.

## Bring web/app chats

Request an account export, download it and unpack the ZIP yourself. [ChatGPT export instructions](https://help.openai.com/en/articles/7260999-exporting-your-chatgpt-history-and-data) and [Claude export instructions](https://support.claude.com/en/articles/9450526-export-your-claude-data) describe availability and steps. Account/workspace restrictions can apply. A copied conversation saved as UTF-8 `.md` or `.txt` also works.

```sh
guardian-wrapper onboard . --source exports --export /path/to/unpacked-export --query "puzzle"
guardian-wrapper chats . --source exports --export /path/to/conversations.json
guardian-wrapper chats . --source exports --export /path/to/saved-chat.md
```

Repeat `--export` to combine sources. JSON import recognizes ChatGPT `mapping` conversations and Claude `chat_messages`. ChatGPT follows `current_node`; without that pointer only a single unambiguous leaf is accepted. Alternative branches are not combined. These shapes are fixture-tested, not a guarantee for future export schemas. Use focused text for unsupported formats.

Structured import keeps user/assistant text and excludes system/developer messages, tool payloads, hidden reasoning and attachments. Supplied text is retained as provided and requires review. Excluded material cannot prove implementation. The wrapper does not log into accounts, scrape browser profiles, inspect cookies or retrieve cloud histories.

## Preview and select

Browsing writes nothing and calls no model. It reads bounded local content, so it is not metadata-only scanning. Private candidate titles/excerpts appear in the terminal. Selection records source paths, identifiers and SHA-256 hashes.

```sh
# Use IDs from discovery with the same source/query flags.
guardian-wrapper chats . --query "puzzle" --select ID1,ID2 --dry-run
guardian-wrapper chats . --query "puzzle" --select ID1,ID2
guardian-wrapper onboard . --from-chat .guardian/chat-context.md
# Preview combined onboarding/selection without a provider request:
guardian-wrapper onboard . --host codex --source exports --export /path/to/conversations.json --select ID1 --dry-run
```

The packet and brief are never overwritten. Move completed files before another import; `--resume` reopens a brief. Both are user-editable and survive update/uninstall. A new `.guardian/.gitignore` excludes these two private files; existing ignore files are preserved, and init adds managed root exclusions. Previously tracked files and explicit Git overrides still require review. Remove credentials and unrelated personal facts before adopting or sharing content.

When onboarding starts, selected evidence becomes available to the chosen Claude/Codex client and its normal provider processing, authentication and permissions. Local discovery makes no provider request. The workflow asks the agent to read the selected packet rather than reopen complete source histories.

## Limits

- Local discovery inspects the first 256 KiB per transcript. Late matches can be missed; sampled candidates are labelled.
- Discovery is bounded to 1,000 files and 256 MiB read, with eight folder levels and 10,000 entries per walk. An export file must fit 64 MiB and contain at most 10,000 conversations. Fifty candidates are displayed; narrow sources/query for focused selection.
- Selected sources are read completely up to 64 MiB each; the packet must fit 1 MiB. Larger selections fail without writes. Use fewer chats or focused exports.
- Symlinks, binary input, malformed JSON, ambiguous branches, duplicate conversation IDs and changing sources are refused/reported. No background ingestion, semantic ranking or Hindsight integration is claimed.

The packet is evidence for the existing [migration workflow](../assets/skills/guardian/references/migration.md), not another authority for project policy.
