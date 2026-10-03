#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-$(pwd)}"
ROOT="$(cd "$ROOT" && pwd -P)"
command -v fswatch >/dev/null || { echo "fswatch is required for watch mode (macOS: brew install fswatch)." >&2; exit 1; }
command -v node >/dev/null || { echo "Node is required." >&2; exit 1; }
test -f "$ROOT/.guardian/bin/guardian.mjs" || { echo "Run guardian-wrapper init for this project first." >&2; exit 1; }
echo "Watching $ROOT. Ctrl-C stops the watcher."

# Real file paths, no Git-status lookup. The receiver coalesces events and uses
# graft's own synchronization lock. Generated cards cannot trigger a loop.
fswatch -0 -r -l 1 -E \
  -e '(/(\.git|\.guardian|\.graft|\.claude|\.agents|node_modules|graft|dist|build|coverage|vendor)/|/\.tmp\.drive[^/]*|\.gdoc$|/\.DS_Store$)' \
  "$ROOT" | node "$ROOT/.guardian/bin/guardian.mjs" watch-events "$ROOT"
