#!/usr/bin/env bash
# TeammateIdle hook: Verify teammate's work before letting them go idle
# Checks that typecheck and lint pass on any modified files

set -euo pipefail

cd "$CLAUDE_PROJECT_DIR"

# Check if there are any uncommitted changes (teammate might have unfinished work)
if git diff --name-only --diff-filter=M 2>/dev/null | grep -qE '\.(ts|tsx|js|jsx)$'; then
  echo "Teammate has uncommitted source changes. Run typecheck and lint before going idle."
  exit 2
fi

# Check for unpushed commits (only if upstream is configured)
if git rev-parse --abbrev-ref @{upstream} >/dev/null 2>&1; then
  UNPUSHED=$(git log --oneline @{upstream}..HEAD 2>/dev/null | wc -l)
else
  UNPUSHED=0
fi

if [ "$UNPUSHED" -gt 0 ]; then
  echo "Teammate has $UNPUSHED unpushed commits. Push and create PR before going idle."
  exit 2
fi

exit 0
