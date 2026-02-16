#!/usr/bin/env bash
# TaskCompleted hook: Verify task quality before marking complete
# Ensures typecheck passes and no lint errors exist in changed files

set -euo pipefail

cd "$CLAUDE_PROJECT_DIR"

# Run typecheck
if ! pnpm typecheck 2>&1 | tail -20; then
  echo "Typecheck failed. Fix type errors before marking task complete."
  exit 2
fi

# Run lint on changed files only (faster than full lint)
if git rev-parse --verify HEAD~1 >/dev/null 2>&1; then
  CHANGED_FILES=$(git diff --name-only HEAD~1 2>/dev/null | grep -E '\.(ts|tsx|js|jsx)$' || true)
else
  CHANGED_FILES=$(git diff --cached --name-only 2>/dev/null | grep -E '\.(ts|tsx|js|jsx)$' || true)
fi

# Filter to only existing files (in case of deletions)
if [ -n "$CHANGED_FILES" ]; then
  EXISTING_FILES=""
  for f in $CHANGED_FILES; do
    [ -f "$f" ] && EXISTING_FILES="$EXISTING_FILES $f"
  done
  if [ -n "${EXISTING_FILES:-}" ]; then
    if ! echo "$EXISTING_FILES" | xargs pnpm exec biome check 2>&1 | tail -20; then
      echo "Lint errors found in changed files. Fix before marking task complete."
      exit 2
    fi
  fi
fi

exit 0
