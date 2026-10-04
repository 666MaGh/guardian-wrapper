# Hindsight: optional project memory

Research date: 2026-10-04. Sources are pinned to upstream commit [`f7dd3f4`](https://github.com/vectorize-io/hindsight/tree/f7dd3f4fd7420f7beec60c32c965e5e5cf7be066). This is a source review: no Hindsight service, installer, model call or project-data ingestion was run. The proposed Guardian integration below is not implemented.

## Recommendation

Use Hindsight as an **optional memory service** for decisions, reasoning and approved session summaries shared between Claude Code and Codex. Start with explicit retrieval and user-approved writes through one project bank. Keep it out of the default installation. Guardian's checked-in instructions and approved migration remain authoritative; graft remains the current code map. Memory should help explain why a decision exists, then point the agent back to its source.

## Verified capabilities

| Operation | Upstream behavior | Potential Guardian use |
| --- | --- | --- |
| `retain` | Extracts structured memories from supplied conversations and documents | Store an approved handoff or decision summary |
| `recall` | Combines semantic, keyword, graph and temporal retrieval, then reranks structured facts | Recover related decisions before proposing a change |
| `reflect` | Uses an LLM reasoning loop over retrieved evidence, returning citations | Suggest a contextual onboarding summary for review |

The operation descriptions are documented in [Retain](https://github.com/vectorize-io/hindsight/blob/f7dd3f4fd7420f7beec60c32c965e5e5cf7be066/hindsight-docs/docs/developer/retain.md), [Recall](https://github.com/vectorize-io/hindsight/blob/f7dd3f4fd7420f7beec60c32c965e5e5cf7be066/hindsight-docs/docs/developer/api/recall.mdx) and [Reflect](https://github.com/vectorize-io/hindsight/blob/f7dd3f4fd7420f7beec60c32c965e5e5cf7be066/hindsight-docs/docs/developer/reflect.mdx). The Guardian uses in the last column are proposed designs, not upstream guarantees.

A bank contains memories, documents, entities, relationships and directives. Writes can create banks; reads of a missing bank return 404. Banks provide logical separation, but a bank identifier alone should not be treated as an authentication credential. [Memory-bank API](https://github.com/vectorize-io/hindsight/blob/f7dd3f4fd7420f7beec60c32c965e5e5cf7be066/hindsight-docs/docs/developer/api/memory-banks.mdx).

The built-in MCP server exposes a bank-specific endpoint, `http://localhost:8888/mcp/{bank_id}/`. Authentication is **off by default**; the documented API-key tenant extension enables bearer authentication. A tool allowlist can restrict exposed operations per bank. Use a single-bank endpoint and configure authentication rather than exposing unrestricted multi-bank access. [MCP documentation](https://github.com/vectorize-io/hindsight/blob/f7dd3f4fd7420f7beec60c32c965e5e5cf7be066/hindsight-docs/docs/developer/mcp-server.md), [configuration](https://github.com/vectorize-io/hindsight/blob/f7dd3f4fd7420f7beec60c32c965e5e5cf7be066/hindsight-docs/docs/developer/configuration.mdx).

## Existing coding-agent adapter

Upstream already supports Claude Code and Codex. Its coding-agents package automatically imports git history and conversations, injects memory into sessions, and builds synthesized knowledge pages. Defaults include commit-message ingestion, memory enabled for projects, and automatic runtime updates. `optInOnly` can restrict activity to approved paths; `gitIngest: "none"` disables git ingestion. These are materially different defaults from Guardian's reviewed migration. [Adapter documentation](https://github.com/vectorize-io/hindsight/blob/f7dd3f4fd7420f7beec60c32c965e5e5cf7be066/hindsight-integrations/coding-agents/README.md).

The installer writes user-level Claude settings/hooks and MCP registration, and Codex hooks/config. The current source recognizes newer Codex `features.hooks` as well as the older `codex_hooks` setting, illustrating why host compatibility must be version-tested. Guardian should not silently call `install all`, overwrite a pre-existing `hindsight` MCP registration, or combine duplicate hook pipelines. A separate global-adapter installation could be offered later with an explicit preview. [Installer source](https://github.com/vectorize-io/hindsight/blob/f7dd3f4fd7420f7beec60c32c965e5e5cf7be066/hindsight-integrations/coding-agents/src/installer.ts).

## Dependencies, data and costs

Self-hosting requires a Hindsight API service, PostgreSQL 14+ with a supported vector extension, and model inference. Docker bundles the development database and, in the full image, local embeddings/reranking; the LLM remains external to that image. Python installations require Python 3.11+. Production guidance prefers external PostgreSQL over embedded pg0. A hosted service instead needs its endpoint/token. [Installation](https://github.com/vectorize-io/hindsight/blob/f7dd3f4fd7420f7beec60c32c965e5e5cf7be066/hindsight-docs/docs/developer/installation.md), [Python dependency manifest](https://github.com/vectorize-io/hindsight/blob/f7dd3f4fd7420f7beec60c32c965e5e5cf7be066/hindsight-api-slim/pyproject.toml).

Submitted content goes to the configured Hindsight service/database and can then enter extraction, embedding, reranking or reflection providers. Local database storage therefore does not imply local-only processing. Provider selection determines network destinations and inference costs; scheduled knowledge-page synthesis can add recurring calls. Credentials belong outside committed project files. [Model configuration](https://github.com/vectorize-io/hindsight/blob/f7dd3f4fd7420f7beec60c32c965e5e5cf7be066/hindsight-docs/docs/developer/models.mdx), [adapter refresh behavior](https://github.com/vectorize-io/hindsight/blob/f7dd3f4fd7420f7beec60c32c965e5e5cf7be066/hindsight-integrations/coding-agents/README.md).

Upstream offers `openai-codex` and `claude-code` subscription-backed providers. This does **not** make an existing agent subscription a universal deployment credential: authentication, limits and provider terms still apply. Its Claude provider documentation explicitly limits that route to personal local development and recommends an Anthropic API key for production/team use. Our public setup should require an explicit API, local-model or hosted-service choice; it should not silently reuse login credentials. [Provider documentation](https://github.com/vectorize-io/hindsight/blob/f7dd3f4fd7420f7beec60c32c965e5e5cf7be066/hindsight-docs/docs/developer/models.mdx).

The root license is MIT, copyright Vectorize AI, Inc.; redistribution must retain its notice. This review confirms the upstream root license, not a complete license audit of every dependency, container layer, model weight or hosted-service term. Keep an initial adapter thin and add a pinned dependency/license inventory before bundling upstream components. [License](https://github.com/vectorize-io/hindsight/blob/f7dd3f4fd7420f7beec60c32c965e5e5cf7be066/LICENSE).

## Proposed next stage

1. Add an optional onboarding question: no memory, local service, or hosted service. Preview endpoint, project bank, provider and data scope; never ingest automatically by default.
2. Configure a project-scoped MCP adapter for each supported host, preserving existing registrations and keeping tokens local. Verify bank access and authenticated failure behavior with synthetic data.
3. Add explicit summary preview/write and retrieval operations. Record provenance, date, source commit and approval status; treat recalled material as evidence, not new instructions. Cross-project transfers require the same review as migration.
4. Test isolation, unavailable-service fallback, deletion, credential handling and Claude/Codex coexistence. Measure retrieval usefulness, latency and real inference cost before considering opt-in hooks or automatic capture.

Candidate command names and host registration mechanics should be settled during implementation. No integration or runtime acceptance is claimed by this report.
