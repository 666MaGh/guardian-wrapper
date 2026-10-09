# Changes and fixes

Guardian owns this orchestration; it does not call Matt's user-only command chain.

## Calibrate

For a small, low-risk edit, use a short plan and the relevant existing check; skip empty spec/ADR/ticket files. For behavior changes or bug fixes, use a work record (assets/templates/work.md). Capture starting revision and dirty files. Identify what is already authorized. Reuse an existing issue/spec.

## Specify and inspect impact

Read approved behavior, affected map cards, actual code and tests. Resolve only consequential unknown product choices with the user. Explain test seams as "which real player flow should prove this works?" rather than requiring software expertise. Record reusable approval of named seams with scope in docs/agents/guardian.md; an existing approval remains valid until scope changes.

Record desired behavior, non-goals, preserved rules, acceptance examples and linked sources. Include incoming callers, outgoing consumers, shared state/API/schema changes, retries/concurrency, and tests for affected neighboring flows. Trace real dependencies; the map is a starting point, not the only evidence. For larger changes, split into small end-to-end tasks and record dependencies in the configured tracker.

Use guardian-domain-modeling for resolved terminology and significant decisions. Use guardian-codebase-design only when an interface is actually being designed. A long interview is optional; use guardian-grilling only when the user wants a thorough exploration and its full interaction pattern is appropriate.

## Choose the smallest complete solution

After tracing the required behavior and affected flows, use this decision ladder, adapted from [Ponytail](https://github.com/DietrichGebert/ponytail/blob/9cc65d03aa2da1db7121b912d03596409ee340b8/skills/ponytail/SKILL.md) (MIT DietrichGebert):

1. Confirm which parts the requested outcome actually needs; leave speculative additions out.
2. Reuse a suitable helper, component, service or pattern already in this codebase.
3. Prefer a fitting standard-library or platform capability, while preserving project conventions.
4. Use a suitable installed dependency before considering a new one. Weigh new dependencies against a small maintained implementation.
5. Use a compact expression when it is immediately readable; otherwise write the minimum clear implementation that fully works.

Evaluate candidates against all acceptance criteria, accessibility, trust-boundary validation, security and data-loss handling. Preserve established layers and interfaces; fewer lines alone do not justify weakening them. Apply the chosen solution to every affected caller, fixture and configuration path. This is part of Guardian's existing change workflow, not a separate session mode.

## Implement

For behavior changes invoke guardian-tdd with the approved seams and spec. For a bug invoke guardian-diagnosing-bugs with the symptom, reproduction environment and current evidence. Honor the upstream workflow; report a missing reproducible signal rather than guessing and claiming a fix. Prefer deterministic time/location/network fixtures when relevant.

Establish existing behavior before modifying poorly tested critical code. Label known defects separately from desired behavior. Preserve a meaningful baseline. Change one coherent slice at a time; do not bundle cleanup of unrelated areas. Never remove assertions to hide a regression. Intentional rule changes require an authorized requirement and corresponding expectation changes.

## Verify and review

Read verification.md. Review actual delivered changes including staged, unstaged and new files. A commit-only review is insufficient for a dirty tree. Use Matt guardian-code-review when its contract covers the complete scope; otherwise use Guardian's explicit working-tree review and label the provider honestly.

## Finish

Update only affected rule documents, map cards and significant ADRs. Add executed checks and limitations to the work record. Separate implementation-complete, device-test-pending, verified and released states. A technical change cannot be declared released without release evidence.
