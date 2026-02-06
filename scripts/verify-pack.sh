#!/usr/bin/env bash
# Verify that pnpm pack produces a clean, correctly-sized package.
# Exit non-zero on any problem.
set -euo pipefail

MAX_SIZE_KB=1024

echo "=== Building ==="
pnpm build

echo ""
echo "=== Packing ==="
pnpm pack 2>/dev/null

TARBALL=$(ls blecsd-*.tgz)
TARBALL_SIZE_KB=$(du -k "$TARBALL" | cut -f1)

echo ""
echo "=== Tarball contents ==="
CONTENTS=$(tar tzf "$TARBALL")
echo "$CONTENTS"

echo ""
echo "=== Verification ==="

# 1. Check size
echo "Package size: ${TARBALL_SIZE_KB}KB (limit: ${MAX_SIZE_KB}KB)"
if [ "$TARBALL_SIZE_KB" -gt "$MAX_SIZE_KB" ]; then
  echo "FAIL: Package exceeds size limit"
  rm -f "$TARBALL"
  exit 1
fi
echo "PASS: Size within limit"

# 2. Check no source files leaked
LEAKED=$(echo "$CONTENTS" | grep -E '\.(ts|tsx)$' | grep -v '\.d\.ts$' || true)
if [ -n "$LEAKED" ]; then
  echo "FAIL: Source files found in package:"
  echo "$LEAKED"
  rm -f "$TARBALL"
  exit 1
fi
echo "PASS: No source files leaked"

# 3. Check no test/example/doc files leaked
LEAKED=$(echo "$CONTENTS" | grep -E '(test|spec|__tests__|examples|docs)/' || true)
if [ -n "$LEAKED" ]; then
  echo "FAIL: Test/example/doc files found in package:"
  echo "$LEAKED"
  rm -f "$TARBALL"
  exit 1
fi
echo "PASS: No test/example/doc files leaked"

# 4. Check no secrets/credentials
LEAKED=$(echo "$CONTENTS" | grep -iE '(\.env|credentials|secret|\.key$)' || true)
if [ -n "$LEAKED" ]; then
  echo "FAIL: Potential secrets found in package:"
  echo "$LEAKED"
  rm -f "$TARBALL"
  exit 1
fi
echo "PASS: No secrets detected"

# 5. Check required files present
for REQUIRED in "package.json" "README.md" "LICENSE" "dist/index.js" "dist/index.d.ts"; do
  if ! echo "$CONTENTS" | grep -q "$REQUIRED"; then
    echo "FAIL: Required file missing: $REQUIRED"
    rm -f "$TARBALL"
    exit 1
  fi
done
echo "PASS: All required files present"

# 6. Check type definitions exist for all entry points
for ENTRY in "dist/index.d.ts" "dist/components/index.d.ts" "dist/systems/index.d.ts" "dist/widgets/index.d.ts" "dist/terminal/index.d.ts" "dist/schemas/index.d.ts" "dist/utils/index.d.ts"; do
  if ! echo "$CONTENTS" | grep -q "$ENTRY"; then
    echo "FAIL: Type definitions missing for entry point: $ENTRY"
    rm -f "$TARBALL"
    exit 1
  fi
done
echo "PASS: All entry point type definitions present"

rm -f "$TARBALL"
echo ""
echo "All checks passed!"
