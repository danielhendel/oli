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
#   A) Ingestion acknowledgement day must match canonical dayKey semantics
#   B) Invalid/missing timezone must fail closed and must not write RawEvent
#
# Step 2 adds canonical truth read guarantees:
#   C) Canonical events are retrievable via safe APIs
#   D) Returned canonical docs are runtime-validated and fail-closed
#   E) Ordering + pagination are deterministic and stable
#   F) Authz invariants: cross-user reads forbidden
#
# Step 3 adds RawEvent Library guarantees:
#   G) RawEvents list is user-scoped and validated at runtime
#   H) Deterministic ordering + stable pagination
#   I) Filtering correctness and fail-closed behavior
#   J) Upload safety (no secrets, no payload leakage)
#
# Step 4 adds Ingestion Trust Boundary guarantees:
#   K) Source Registry exists and is user-scoped
#   L) Cross-user access to sources is forbidden
#   M) Ingest gateway enforces sourceId + kind + schemaVersion (no bypass)
#   N) Upload path enforces the same source rules (no bypass)
#   O) Firestore rules deny client writes to ingestion + sources

TESTS=(
  "services/functions/src/normalization/__tests__/canonicalImmutability.test.ts"
  "services/functions/src/ingestion/__tests__/rawEventDedupe.test.ts"
  "services/functions/src/http/__tests__/authoritativeRecompute.noMerge.test.ts"
  "services/functions/src/http/__tests__/recomputeInsights.authoritative.test.ts"
  "services/functions/src/pipeline/__tests__/phase1Determinism.unit.test.ts"

  # Step 1 proof: canonical dayKey derivation
  "services/functions/src/normalization/__tests__/mapRawEventToCanonical.test.ts"

  # Step 1 proof: timezone rejection (fail-closed, no writes)
  "services/api/src/routes/__tests__/events.ingest.invalid-timezone.test.ts"

  # Step 2 proof: canonical truth read surface
  "services/api/src/routes/__tests__/canonicalEvents.test.ts"

  # Step 3 proof: RawEvent library list + filtering
  "services/api/src/routes/__tests__/rawEvents.list.test.ts"

  # Step 4 proof: source registry (user-scoped)
  "services/api/src/routes/__tests__/sources.registry.test.ts"

  # Step 4 proof: ingest gateway enforces source rules
  "services/api/src/routes/__tests__/events.ingest.source-gating.test.ts"

  # Step 4 proof: uploads enforce the same source rules
  "services/api/src/routes/__tests__/uploads.source-gating.test.ts"

  # Step 4 proof: Firestore rules deny client writes
  "services/functions/src/security/__tests__/firestore.rules.test.ts"
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
