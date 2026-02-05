#!/bin/bash
# Check for disallowed direct imports from 'bitecs'
# Only src/core/ecs.ts, src/core/world.ts, and src/core/types.ts are allowed to import from bitecs

set -e

# Find all files importing from 'bitecs' in src/ and examples/
DISALLOWED_FILES=$(grep -r "from 'bitecs'" src/ examples/ --include="*.ts" 2>/dev/null | \
  grep -v "src/core/ecs.ts" | \
  grep -v "src/core/world.ts" | \
  grep -v "src/core/types.ts" || true)

if [ -n "$DISALLOWED_FILES" ]; then
  echo "ERROR: Direct imports from 'bitecs' are not allowed."
  echo ""
  echo "The following files import directly from 'bitecs':"
  echo "$DISALLOWED_FILES"
  echo ""
  echo "Please import from 'blecsd' (for examples) or '../core/ecs' (for internal code) instead."
  echo ""
  echo "Only these files are allowed to import from 'bitecs':"
  echo "  - src/core/ecs.ts"
  echo "  - src/core/world.ts"
  echo "  - src/core/types.ts"
  exit 1
fi

echo "✓ No disallowed bitecs imports found"
