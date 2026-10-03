# Changes and fixes

Guardian owns this orchestration; it does not call Matt's user-only command chain.

## Calibrate

For a small, low-risk edit, use a short plan and the relevant existing check; skip empty spec/ADR/ticket files. For behavior changes or bug fixes, use a work record (assets/templates/work.md). Capture starting revision and dirty files. Identify what is already authorized. Reuse an existing issue/spec.

## Specify and inspect impact

Read approved behavior, affected map cards, actual code and tests. Resolve only consequential unknown product choices with the user. Explain test seams as "which real player flow should prove this works?" rather than requiring software expertise. Record reusable approval of named seams with scope in docs/agents/guardian.md; an existing approval remains valid until scope changes.

Record desired behavior, non-goals, preserved rules, acceptance examples and linked sources. Include incoming callers, outgoing consumers, shared state/API/schema changes, retries/concurrency, and tests for affected neighboring flows. Trace real dependencies; the map is a starting point, not the only evidence. For larger changes, split into small end-to-end tasks and record dependencies in the configured tracker.

Use domain-modeling for resolved terminology and significant decisions. Use codebase-design only when an interface is actually being designed. A long interview is optional; use grilling only when the user wants a thorough exploration and its full interaction pattern is appropriate.

## Implement

For behavior changes invoke tdd with the approved seams and spec. For a bug invoke diagnosing-bugs with the symptom, reproduction environment and current evidence. Honor the upstream workflow; report a missing reproducible signal rather than guessing and claiming a fix. Prefer deterministic time/location/network fixtures when relevant.

Establish existing behavior before modifying poorly tested critical code. Label known defects separately from desired behavior. Preserve a meaningful baseline. Change one coherent slice at a time; do not bundle cleanup of unrelated areas. Never remove assertions to hide a regression. Intentional rule changes require an authorized requirement and corresponding expectation changes.

## Verify and review

Read verification.md. Review actual delivered changes including staged, unstaged and new files. A commit-only review is insufficient for a dirty tree. Use Matt code-review when its contract covers the complete scope; otherwise use Guardian's explicit working-tree review and label the provider honestly.

## Finish

Update only affected rule documents, map cards and significant ADRs. Add executed checks and limitations to the work record. Separate implementation-complete, device-test-pending, verified and released states. A technical change cannot be declared released without release evidence.
