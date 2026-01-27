#!/usr/bin/env bash
set -euo pipefail

# scripts/ci/proof-gate.sh
#
# Purpose:
#   Phase 1 "proof gate" for Oli.
#   Phase 1 is about memory, truth, and trust, so we maintain an explicit,
#   small set of non-negotiable checks that must stay green.
#
# Notes:
#   - This script is intended to be run in CI.
#   - It is redundant with the full test suite on purpose.
#   - If a required proof test is missing, we FAIL (missing file == missing guarantee).

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "🔒 Phase 1 proof gate starting…"

echo "→ Invariants (binding)"
node scripts/ci/check-invariants.mjs

echo "→ Phase 1 proof tests"

# Explicit list of tests that represent Phase 1 truth guarantees.
# Keep this list short and meaningful.
TESTS=(
  "services/functions/src/normalization/__tests__/canonicalImmutability.test.ts"
  "services/functions/src/ingestion/__tests__/rawEventDedupe.test.ts"
  "services/functions/src/http/__tests__/authoritativeRecompute.noMerge.test.ts"
  "services/functions/src/http/__tests__/recomputeInsights.authoritative.test.ts"
  "services/functions/src/pipeline/__tests__/phase1Determinism.unit.test.ts"
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
  echo "Phase 1 proof gate cannot run because required proof tests are missing."
  echo "Missing tests indicate missing guarantees (Phase 1 is not provable)."
  exit 1
fi

# Run ONLY the proof tests by path so CI remains stable even if unrelated tests change.
npm test -- --ci --runTestsByPath "${TESTS[@]}"

echo "✅ Phase 1 proof gate passed."