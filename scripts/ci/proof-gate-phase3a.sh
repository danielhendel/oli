#!/usr/bin/env bash
set -euo pipefail

# scripts/ci/proof-gate-phase3a.sh
#
# Purpose:
#   Phase 3A "integration proof gate" for Oli.
#   Phase 3A is about device integrations (Withings → Oura → Apple Health → MFP)
#   respecting the Phase 2 guarantees and the Phase 3A integration strategy doc.
#
# Notes:
#   - This script is intended to be run in CI or manually by developers.
#   - It is intentionally redundant with the full test suite.
#   - Phase 3A proof tests must not be skippable (no "pass with no tests").
#   - Phase 2 proof gate must succeed before any Phase 3A checks run.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "🔒 Phase 3A integration proof gate starting…"

echo "→ Phase 2 proof gate (must be green before Phase 3A)"
bash scripts/ci/proof-gate-phase2.sh

# If we reach this point, Phase 2 proof gate has passed in this process.
export PHASE3A_PROOF_GATE=1
export PHASE2_PROOF_GATE_PASSED=1

echo "→ Phase 3A placeholder proof tests"

PHASE3A_TESTS=(
  "scripts/ci/__tests__/phase3a-integration-strategy-doc.test.ts"
  "scripts/ci/__tests__/phase3a-withings-proof.test.ts"
)

missing=0
for t in "${PHASE3A_TESTS[@]}"; do
  if [[ ! -f "$t" ]]; then
    echo "❌ Missing required Phase 3A proof test: $t"
    missing=1
  fi
done

if [[ "$missing" -eq 1 ]]; then
  echo ""
  echo "Phase 3A proof gate cannot run because required proof tests are missing."
  echo "Missing tests indicate missing guarantees (Phase 3A is not provable)."
  exit 1
fi

# Run ONLY the Phase 3A proof tests by path so this gate remains stable even
# if unrelated tests change. Forbid 'pass with no tests' so it cannot be skipped.
npm test -- --ci --runInBand --passWithNoTests=false --runTestsByPath "${PHASE3A_TESTS[@]}"

echo "✅ Phase 3A integration proof gate passed."

