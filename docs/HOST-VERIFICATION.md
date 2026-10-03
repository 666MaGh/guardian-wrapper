# Fresh host acceptance checks

File installation and native plugin manifest checks have passed. Actual model behavior in a new Claude Code or Codex conversation is not yet recorded. Run these checks before promoting v0.1.0 from a prerelease. Use a disposable project; record host version, wrapper version, profile and date, without credentials or private application code.

## Project skills — test each host separately

1. Create a small project with a named exported function, one caller and a working test command. Preserve a pre-existing AGENTS.md line to exercise merge behavior.
2. Run init --groups all --watch and doctor. Confirm graph freshness through the generated launcher. This tests installation, not agent behavior.
3. Start a genuinely new Claude Code session inside the project. Repeat with a new Codex session. Inspect discovered skills/providers; verify project-local Guardian/ICM/Matt entries and explicit-only metadata. Resolve duplicate global providers before judging the result.
4. Request a read-only Guardian inspection. Pass when the agent reads the project policy, reads the relevant graft map, identifies the fixture's function/caller and reports missing facts without claiming adoption is complete.
5. Request a bounded change to the fixture. Pass when the agent checks dependencies, changes the requested behavior and reports the actual test command/result. Assert a behavior change through an existing meaningful test.
6. Check ADHD-on output for brief actionable progress and clear next action. Disable with the project config command and begin another new session; confirm the profile is off. Also test the session-only stop request. Record whether existing global hooks affected results.
7. Request Guardian status. Pass when it reports observed state and unverified checks without silently doing pending implementation.
8. Inspect user-only skills: installation preserves policy and Guardian does not autonomously bypass it. Explicitly request one suitable user-only workflow and verify the host can invoke it.
9. If supporting a delegation-dependent workflow, separately verify the selected host's permitted subagent interface. A serial substitute is not evidence that the upstream parallel workflow ran.
10. Start watch, edit/rename/delete the fixture, check graph freshness and stop with Ctrl-C. Uninstall and compare original instructions. Record errors/unsupported capabilities rather than marking a partial run passed.

## Claude plugin alternative

Export to a new directory; run claude plugin validate. Initialize the fixture with --hosts codex and load Claude with --plugin-dir. Verify namespaced /guardian-wrapper:guardian discovery, absence of duplicate project Claude skills, startup ADHD hook behavior with and without a project profile, and the same read-only/graph/change checks above. The plugin alone does not install the project runtime or graft.

## Evidence record

For each path, record environment, command/profile, discovered provider identifier, expected/observed result, test output and unresolved limitations. Store a short sanitized report in VALIDATION.md or a linked report. The release gate passes only when both project host paths work; plugin behavior is a separate claim. Host-specific upstream experiments may remain explicitly unsupported and must not be advertised as universally verified.
