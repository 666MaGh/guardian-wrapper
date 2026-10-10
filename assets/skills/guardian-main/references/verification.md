# Verification and review

## Evidence

Discover exact build/type/lint/test commands from project scripts and CI. Record command, working directory, exit status, revision/scope and concise result. Do not invent standard commands for a stack. Test changed behavior and relevant downstream flows, then the project's required suite. If the full suite cannot run, name the missing environment or known baseline failure. Never report a skipped check as passing.

For bug fixes preserve the red-before/green-after signal on the user's symptom. Test public behavior, not mirrored implementation. Include integration checks for shared persistence, authorization or concurrency when those are affected. For mobile changes distinguish simulator checks from real-device GPS/background/notification checks and keep pending tests visible.

## Review scope

Pin the base revision at task start. Matt guardian-code-review currently inspects base...HEAD, excluding uncommitted work. Invoke it with the exact base and spec only when all intended code is in authorized commits and the diff covers the task; verify working-tree status first. Re-review fixes after review.

If work is uncommitted, Guardian performs a working-tree review: inspect `git diff <base>` for tracked staged/unstaged changes plus `git ls-files --others --exclude-standard` and contents of relevant new files. Compare with the task-start dirty state so unrelated user changes are not attributed to this task. Explain any unavoidable scope ambiguity. Review separately (a) acceptance/preserved behavior and (b) repo standards/maintainability. Cite concrete findings. Label this Guardian review, not a completed Matt guardian-code-review.

Use independent reviewer agents when permitted and useful; otherwise state that review was in-session. Do not manufacture commits to make an upstream review callable. No deployment or remote merge follows automatically.

## CI

Discover existing CI first. During adoption report missing CI; adding CI is an explicit setup/change scope. Use only discovered working project commands, appropriate runtime and dependency lockfiles. A workflow file alone does not enforce branch protection. Verify required-check/ruleset settings through authorized access before claiming merges are blocked. If no access, give the precise remaining configuration task.

A SKILL.md provides workflow guidance, not a hard enforcement mechanism. Version 1 installs no shell hooks and never changes permissions or bypass flags. Actual regression protection depends on meaningful tests, runnable CI, and enforced checks.

## Outcome vocabulary

- Implemented: code exists; pending checks explicitly listed.
- Verified: applicable required checks ran successfully, with evidence.
- Blocked: essential evidence/environment/decision missing.
- Released: deployment/release was authorized and its result confirmed.

No promise of zero regressions. End with the smallest useful explanation of result and remaining risk.
