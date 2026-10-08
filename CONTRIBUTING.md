# Contributing

Use Node >=22.12 and npm. Run npm ci and npm run build, then npm test, npm run typecheck and npm run check:assets. Bash/fswatch are needed to execute the watcher integration test; otherwise that test skips locally. CI installs fswatch on both target platforms.

Review the local graft map before code changes. Keep strict TypeScript and explicit public return types; use unknown and validation at external boundaries. Preserve project files, ownership/restoration semantics and project-local installation. Add meaningful integration coverage when behavior changes.

Vendored content is a reviewed snapshot, not an automatic dependency refresh. For an upstream update, record revision/provenance, retain licenses/credits, describe adaptations, regenerate relevant assets and run node scripts/lock-assets.mjs plus integrity checks. Regenerate docs/DEPENDENCIES.md's catalog/runtime inventory when those inputs change.

Describe the concrete change, actual checks and remaining limitations in pull requests. Report bugs with wrapper/host/Node/OS versions, selected profile and a sanitized reproduction. Keep credentials and private project files out of issues.

The initial GitHub publication and release gates are documented in docs/PUBLISHING.md.

## Dependency proposals

Weekly Dependabot PRs cover root npm, `runtime/` npm and GitHub Actions. Review the proposed version, release notes and security impact; CI does not authorize an automatic merge. After an npm change synchronize `package-lock.json` with `npm-shrinkwrap.json`, or `runtime/package-lock.json` with `runtime/npm-shrinkwrap.json`, using the reviewed resulting resolution. Run both audit commands and the normal checks. Keep the scoped argparse override until a tested replacement removes the affected chain. The runtime package-lock mirrors the release shrinkwrap for dependency-graph visibility; it is not packed or used by postinstall. Asset snapshot updates require a pinned upstream commit, licenses/adaptation review and regenerated `sources.lock.json`.
