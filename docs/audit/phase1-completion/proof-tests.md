# Phase 1 — Proof Tests

**Purpose:** List key Phase 1 proof tests with file paths and what they prove.  
**Authority:** `scripts/ci/proof-gate.sh` runs these tests; CI fails if any is missing or fails.

---

## Proof Test List

| Test Path | What It Proves |
|-----------|----------------|
| `services/api/src/routes/__tests__/phase1E2E.logRecomputeVisibleReplay.test.ts` | Log → recompute → visible → replayable: ingested events flow through pipeline to derived ledger and snapshot endpoint. |
| `services/api/src/routes/__tests__/phase1E2E.replayImmutability.test.ts` | Past views never change: snapshot for Run A is identical after Run B is created; fingerprint strategy (runId, dailyFacts, insights) enforces immutability. |
| `services/api/src/routes/__tests__/phase1E2E.exportProof.test.ts` | Export lifecycle: POST /export → job queued → executor runs → artifact exists with rawEvents + dailyFacts at `users/{uid}/accountExports/{exportId}/artifacts/{artifactId}`. |

---

## Other Proof Tests (in proof gate)

| Test Path | What It Proves |
|-----------|----------------|
| `services/functions/src/normalization/__tests__/canonicalImmutability.test.ts` | Canonical event normalizers produce deterministic, immutable output. |
| `services/functions/src/ingestion/__tests__/rawEventDedupe.test.ts` | Raw event deduplication by idempotency key. |
| `services/functions/src/http/__tests__/authoritativeRecompute.noMerge.test.ts` | Recompute authoritative behavior. |
| `services/functions/src/http/__tests__/recomputeInsights.authoritative.test.ts` | Insights recompute authoritative behavior. |
| `services/functions/src/pipeline/__tests__/phase1Determinism.unit.test.ts` | Phase 1 pipeline determinism. |
| `services/functions/src/normalization/__tests__/mapRawEventToCanonical.test.ts` | Canonical dayKey derivation boundary conditions (Intl.DateTimeFormat). |
| `services/api/src/routes/__tests__/events.ingest.invalid-timezone.test.ts` | Ingestion rejects invalid/missing timezone; does not write RawEvent. |

---

## Run Locally

```bash
bash scripts/ci/proof-gate.sh
```

Or run individual proof tests:

```bash
npm test -- --runTestsByPath services/api/src/routes/__tests__/phase1E2E.logRecomputeVisibleReplay.test.ts
npm test -- --runTestsByPath services/api/src/routes/__tests__/phase1E2E.replayImmutability.test.ts
npm test -- --runTestsByPath services/api/src/routes/__tests__/phase1E2E.exportProof.test.ts
```
