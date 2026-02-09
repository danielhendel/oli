#!/usr/bin/env bash
set -euo pipefail

# scripts/ci/proof-gate-phase2.sh
#
# Purpose:
#   Phase 2 "proof gate" for Oli.
#   Phase 2 is about Truthful Capture & Personal Health Memory.
#   Initially runs invariants + placeholder test list.
#   As Phase 2 implementation progresses, add proof tests here.
#
# Notes:
#   - This script is intended to be run in CI.
#   - It is redundant with the full test suite on purpose.
#   - If a required proof test is missing, we FAIL (missing file == missing guarantee).
#   - Proof tests must not be skippable (no "pass with no tests").

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "🔒 Phase 2 proof gate starting…"

echo "→ Invariants (binding)"
node scripts/ci/check-invariants.mjs

echo "→ Phase 2 proof tests"

# Explicit list of tests that represent Phase 2 truth guarantees.
# Initially minimal: invariants + Phase 2 definition doc check.
# Add Phase 2-specific proof tests as implementation progresses.
#
# Placeholder: Phase 2 definition doc is validated by CHECK 22 in check-invariants.mjs.
# Unit test for CHECK 22 logic:
TESTS=(
  "scripts/ci/__tests__/phase2-definition-invariant.test.ts"
)

missing=0
for t in "${TESTS[@]}"; do
  if [[ ! -f "$t" ]]; then
    echo "❌ Missing required proof test: $t"
    missing=1
  fi
done

if [[ "$missing" -eq 1 ]]; then
  echo ""
  echo "Phase 2 proof gate cannot run because required proof tests are missing."
  echo "Missing tests indicate missing guarantees (Phase 2 is not provable)."
  exit 1
fi

# Run ONLY the proof tests by path so CI remains stable even if unrelated tests change.
# Explicitly forbid 'pass with no tests' so this gate cannot be silently skipped.
npm test -- --ci --runInBand --passWithNoTests=false --runTestsByPath "${TESTS[@]}"

echo "✅ Phase 2 proof gate passed."
