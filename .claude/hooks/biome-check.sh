#!/usr/bin/env bash
# PostToolUse hook: Run biome check on edited/written files
# Extracts file_path from the JSON on stdin and runs biome lint

set -euo pipefail

cd "$CLAUDE_PROJECT_DIR"

FILE=$(jq -r '.tool_input.file_path // empty')

# Skip if no file path or file doesn't exist
[ -z "$FILE" ] && exit 0
[ -f "$FILE" ] || exit 0

# Only check TypeScript/JavaScript files
case "$FILE" in
  *.ts|*.tsx|*.js|*.jsx|*.json) ;;
  *) exit 0 ;;
esac

# Run biome check (read-only, just report issues)
pnpm exec biome check "$FILE" 2>&1 || true
