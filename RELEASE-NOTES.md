# Guardian Wrapper 0.1.0 — prerelease

Project-local setup for Claude Code and Codex: Guardian with ICM Architect, default ADHD communication, all 37 Matt Pocock skills in selectable groups (40 skills total), pinned graft 0.21.1 and optional Bash/fswatch monitoring.

Includes managed AGENTS.md and importing CLAUDE.md, conflict detection, file ownership/restoration, update/doctor/config/uninstall, Claude plugin export, source/license inventory and public documentation.

## Install

Download guardian-context-wrapper-0.1.0.tgz from the release assets, then:

```sh
npm install -g ./guardian-context-wrapper-0.1.0.tgz
guardian-wrapper init /path/to/project --groups all
```

Requires Node >=22.12 and npm. Claude Code or Codex must be installed and authenticated separately. Native parser installation may need Python/build tools. Watch mode additionally needs Bash/fswatch and is started explicitly. See README and docs/DEPENDENCIES.md for workflow-specific requirements.

## Verification and compatibility

20 local integration tests passed, including actual fswatch graph updates; strict typecheck, asset hashes/licenses and native Claude plugin validation passed. Release tarball installation is checked separately. Remote CI results are recorded in VALIDATION.md.

This is a prerelease. Fresh Claude Code and Codex model sessions have not been verified; file installation and plugin-manifest validation do not prove agent behavior. Experimental upstream skills and host-specific workflows require their own capabilities. Windows is not supported in this release.

No npm registry publication or global agent configuration change is included. Original upstream licenses/credits are preserved. SHA256SUMS covers the attached npm package and Claude plugin archive.
