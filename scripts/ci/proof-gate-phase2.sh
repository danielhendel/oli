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
# Phase 2 proof tests:
# - Definition doc (CHECK 22)
# - Incomplete event visible in timeline
# - Backfill preserves occurredAt, recordedAt, provenance
# - Sprint 2: Correction preserves original; timeline ordering stable; library filters deterministic
# - Sprint 3: Completeness determinism; pagination stability
TESTS=(
  "scripts/ci/__tests__/phase2-definition-invariant.test.ts"
  "scripts/ci/__tests__/phase2-incomplete-visible.test.ts"
  "scripts/ci/__tests__/phase2-backfill-provenance.test.ts"
  "scripts/ci/__tests__/phase2-correction-preserves-original.test.ts"
  "scripts/ci/__tests__/phase2-timeline-ordering-stable.test.ts"
  "scripts/ci/__tests__/phase2-library-filters-deterministic.test.ts"
  "scripts/ci/__tests__/phase2-completeness-determinism-proof.test.ts"
  "scripts/ci/__tests__/phase2-pagination-stability-proof.test.ts"
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
