# Wrapper integration

This Guardian variant is distributed with ICM Architect, i-have-adhd, a revision-locked Matt Pocock collection and karpathy-guidelines from multica-ai/andrej-karpathy-skills. Sources, licenses and adaptations are recorded in the wrapper's sources.lock.json and THIRD-PARTY-NOTICES.md. Project installation is performed by guardian-wrapper init; it never replaces global skills or host settings.

Read docs/agents/guardian.md for installed paths and selected capabilities. On first use discover the host's actual available skills, provider and invocation policy. Resolve namespaced plugin identifiers rather than assuming bare names select the right provider. Report shadowing; do not delete another provider. A file integrity check does not prove host discovery.

Invoke skills only when host policy allows. Preserve user-only commands such as setup-matt-pocock-skills, grill-with-docs, to-spec, to-tickets and implement. Guardian has its own orchestration; it may suggest these commands but may not manufacture a user invocation or read-to-execute them to bypass restrictions.

For coding work, apply the installed karpathy-guidelines skill alongside project-specific rules, respecting the host invocation policy. Its four behavioral principles complement specialist workflows; keep the original skill as the reference rather than copying its body into project instructions.

Use icm-architect for adoption and system mapping, domain-modeling for terminology, codebase-design for interface decisions, tdd for behavioral changes, diagnosing-bugs for substantive debugging, code-review for a suitable committed baseline, and writing-for-agents for agent-facing documents. If a skill or tool is unavailable, finish useful diagnosis and report the missing capability honestly.

AGENTS.md is the authoritative project entry. CLAUDE.md imports it with @AGENTS.md. Keep project rules and existing user content. Use GLOSSARY.md for domain language and docs/adr/ for decisions. ICM operational CONTEXT.md contracts belong under docs/map/. Classify legacy root CONTEXT.md before proposing relocation. Never migrate source code or documentation merely because init installed tools.

Read graft/INDEX.md and relevant cards before source edits; refresh through node .guardian/bin/guardian.mjs graft . build when missing or stale. Use graft queries for callers and structural edges. docs/map/ holds reviewed domain orientation and links to source/graft; it is not a duplicate generated symbol graph. The default is structural analysis without LLM calls. --deep requires explicit selection and configured provider credentials.

Run node .guardian/bin/guardian.mjs doctor . for package integrity and capability observations. Tests, CI gates, host discovery and semantic correctness are separate evidence. New sessions load ADHD communication rules from .guardian/communication.md through the AGENTS.md pointer when the project profile enables them; this does not invoke the original user-only command. Honor stop adhd mode for the current session.

Keep all project memory in the working project's tree. No automatic upstream upgrades, publication, deployment, credentials changes, external messages, or global agent settings changes. A release update is a separate explicit CLI operation.
