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
#   - Proof tests must not be skippable (no "pass with no tests").

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "🔒 Phase 1 proof gate starting…"

echo "→ Invariants (binding)"
node scripts/ci/check-invariants.mjs

echo "→ Phase 1 proof tests"

# Explicit list of tests that represent Phase 1 truth guarantees.
# Keep this list short and meaningful.
#
# Step 1 adds two guarantees:
#   A) Ingestion acknowledgement day must match canonical dayKey semantics (proved via canonical day derivation tests)
#   B) Invalid/missing timezone must fail closed (400) and must not write RawEvent (proved via API route test)
#
# Step 2 adds canonical truth read guarantees:
#   C) Canonical events are retrievable via safe APIs (list-by-day + get-by-id)
#   D) All returned canonical docs are runtime-validated and fail-closed (no silent drops)
#   E) Ordering and pagination are deterministic and stable (cursor-based)
#   F) Authz invariants: cross-user reads forbidden
#
# Step 3 adds RawEvent Library (Memory Index) guarantees:
#   G) RawEvents list surfaces are user-scoped and validated at runtime (fail-closed: invalid doc => 500)
#   H) Deterministic ordering + stable cursor pagination
#   I) Filtering correctness and invalid filters fail closed (400)
#   J) Upload safety: no payloads, no secrets (no base64, no signed URLs/tokens), only allowed summary fields
TESTS=(
  "services/functions/src/normalization/__tests__/canonicalImmutability.test.ts"
  "services/functions/src/ingestion/__tests__/rawEventDedupe.test.ts"
  "services/functions/src/http/__tests__/authoritativeRecompute.noMerge.test.ts"
  "services/functions/src/http/__tests__/recomputeInsights.authoritative.test.ts"
  "services/functions/src/pipeline/__tests__/phase1Determinism.unit.test.ts"

  # Step 1 proof: canonical dayKey derivation boundary conditions (Intl.DateTimeFormat('en-CA', { timeZone }))
  "services/functions/src/normalization/__tests__/mapRawEventToCanonical.test.ts"

  # Step 1 proof: ingestion rejects invalid/missing timezone and does not attempt RawEvent write
  "services/api/src/routes/__tests__/events.ingest.invalid-timezone.test.ts"

  # Step 2 proof: canonical truth read surface (validated DTO, fail-closed, deterministic order, stable cursor pagination, authz)
  "services/api/src/routes/__tests__/canonicalEvents.test.ts"

  # Step 3 proof: raw event library (memory index) list endpoints + filtering + upload safety + fail-closed validation
  "services/api/src/routes/__tests__/rawEvents.list.test.ts"
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
# Explicitly forbid 'pass with no tests' so this gate cannot be silently skipped.
npm test -- --ci --runInBand --passWithNoTests=false --runTestsByPath "${TESTS[@]}"

echo "✅ Phase 1 proof gate passed."