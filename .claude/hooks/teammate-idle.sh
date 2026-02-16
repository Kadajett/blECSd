#!/usr/bin/env bash
# TeammateIdle hook: Verify teammate's work before letting them go idle
# Checks that typecheck and lint pass on any modified files

set -euo pipefail

cd "$CLAUDE_PROJECT_DIR"

# Check if there are any uncommitted changes (teammate might have unfinished work)
if git diff --name-only --diff-filter=M 2>/dev/null | grep -q '\.ts$'; then
  echo "Teammate has uncommitted TypeScript changes. Run typecheck and lint before going idle."
  exit 2
fi

# Check for unpushed commits
UNPUSHED=$(git log --oneline @{upstream}..HEAD 2>/dev/null | wc -l || echo "0")
if [ "$UNPUSHED" -gt 0 ]; then
  echo "Teammate has $UNPUSHED unpushed commits. Push and create PR before going idle."
  exit 2
fi

exit 0
