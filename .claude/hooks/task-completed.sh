#!/usr/bin/env bash
# TaskCompleted hook: Verify task quality before marking complete
# Ensures typecheck passes and no lint errors exist in changed files

set -euo pipefail

cd "$CLAUDE_PROJECT_DIR"

# Run typecheck
if ! pnpm typecheck 2>&1 | tail -5; then
  echo "Typecheck failed. Fix type errors before marking task complete."
  exit 2
fi

# Run lint on changed files only (faster than full lint)
CHANGED_FILES=$(git diff --name-only HEAD~1 2>/dev/null | grep '\.ts$' || true)
if [ -n "$CHANGED_FILES" ]; then
  if ! echo "$CHANGED_FILES" | xargs npx biome check 2>&1 | tail -5; then
    echo "Lint errors found in changed files. Fix before marking task complete."
    exit 2
  fi
fi

exit 0
