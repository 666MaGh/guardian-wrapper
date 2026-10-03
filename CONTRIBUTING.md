# Contributing

Use Node >=22.12 and npm. Run npm ci and npm run build, then npm test, npm run typecheck and npm run check:assets. Bash/fswatch are needed to execute the watcher integration test; otherwise that test skips locally. CI installs fswatch on both target platforms.

Review the local graft map before code changes. Keep strict TypeScript and explicit public return types; use unknown and validation at external boundaries. Preserve project files, ownership/restoration semantics and project-local installation. Add meaningful integration coverage when behavior changes.

Vendored content is a reviewed snapshot, not an automatic dependency refresh. For an upstream update, record revision/provenance, retain licenses/credits, describe adaptations, regenerate relevant assets and run node scripts/lock-assets.mjs plus integrity checks. Regenerate docs/DEPENDENCIES.md's catalog/runtime inventory when those inputs change.

Describe the concrete change, actual checks and remaining limitations in pull requests. Report bugs with wrapper/host/Node/OS versions, selected profile and a sanitized reproduction. Keep credentials and private project files out of issues.

The initial GitHub publication and release gates are documented in docs/PUBLISHING.md.
