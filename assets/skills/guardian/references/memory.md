# Project memory

Prefer the smallest useful structure and map existing paths instead of renaming everything.

| Record | Purpose |
| --- | --- |
| AGENTS.md | Authoritative navigation entry; existing standards remain intact |
| CLAUDE.md | Imports AGENTS.md; host-specific additions only when needed |
| GLOSSARY.md | Matt-compatible domain glossary only |
| docs/agents/guardian.md | Path map, test commands, approved seams, tracker choice, completion policy |
| docs/agents/domain.md | How to consume glossary and ADRs |
| docs/agents/issue-tracker.md | Actual tracker and read/write conventions |
| docs/product/ | Approved behavior and invariants, created per real area |
| docs/map/ | ICM map citing code, incoming/outgoing dependencies and test locations |
| docs/adr/ | Significant decisions and rationale, with supersession links |
| docs/work/<id>/ | One work record per real change; spec, impact and verification can share one file |

Create only records with meaningful content. Root GLOSSARY.md is not a session log. docs/map/CONTEXT.md describes navigating the map and never redefines the product glossary.

## Evidence and freshness

For a material map claim store source path and symbol, observed revision/date, confidence/status and links to relevant tests. A document is not verified solely because it exists. Recheck source before relying on a stale card. Update cards when their owning source changes; do not claim a manually maintained map is exhaustive.

Product documents describe approved intent. Code describes observed implementation. Tests provide evidence about implemented behavior, not proof that the product requirement was right. Record discrepancies explicitly and obtain a product decision where needed.

Draft ideas live in work specs; promote to implemented product documentation only after implementation, retaining pending verification status. Automatic chat summaries are unreviewed handoffs, never policy. No vector database or transcript archive is required.

## Session continuity

Update the active work record before ending or handing off: task identifier, base revision, changed files, current state, executed checks and results, known failures, outstanding decisions and next action. Exclude secrets and bulky raw logs. If GitHub owns status, the record links to that issue and records evidence, not a competing status queue.

## Obsidian

Use the same Markdown files in the repo. No Obsidian plugin, API or sync service is required. Opening the repo as a vault also exposes root GLOSSARY.md; opening only docs/ limits that view. Obsidian edits have the same review/versioning needs as agent edits. Avoid nested vaults and a second copied documentation tree.
