# Phase 1 — Locks Evidence

**Purpose:** Concrete evidence for Phase 1 verified locks. Third-party auditors can verify paths and run commands.

---

## Lock #2 — Failures UI Proof

| Item | Path / Detail |
|------|---------------|
| Route | `app/(app)/failures/index.tsx` |
| Contract | `lib/contracts/failure.ts` — `failureListResponseDtoSchema` |
| Tests | `app/(app)/failures/__tests__/failures-screen-renders.test.tsx`, `failures-screen-fail-closed.test.tsx` |
| CI enforcement | `scripts/ci/assert-ui-routes.mjs` (failures route required) |

---

## Lock #3 — Readiness Drift CI Enforcement

| Item | Path / Detail |
|------|---------------|
| Contract | `lib/contracts/readiness.ts` |
| Drift check | `scripts/ci/readiness-drift-check.mjs` |
| CHECK ID | **CHECK 20** in `scripts/ci/check-invariants.mjs` |
| Invariant map | **I-18** in `docs/90_audits/INVARIANT_ENFORCEMENT_MAP.md` |
| Run | `npm run check:invariants` (includes CHECK 20) |

---

## Lock #5 — Replay Immutability Proof

| Item | Path / Detail |
|------|---------------|
| E2E test | `services/api/src/routes/__tests__/phase1E2E.replayImmutability.test.ts` |
| Strategy | Fingerprint: `day`, `runId`, `pipelineVersion`, `dailyFacts.weightKg`, `insights` — snapshot for Run A unchanged after Run B |
| Proof gate | `scripts/ci/proof-gate.sh` (included) |

---

## Lock #6 — Export E2E Proof

| Item | Path / Detail |
|------|---------------|
| Contracts | `lib/contracts/export.ts` — `exportRequestResponseDtoSchema`, `exportJobDocSchema`, `exportArtifactPayloadSchema` |
| Executor | `services/functions/src/account/runExportJobForTest.ts` |
| E2E test | `services/api/src/routes/__tests__/phase1E2E.exportProof.test.ts` |
| Artifact path | Firestore: `users/{uid}/accountExports/{exportId}/artifacts/{artifactId}` (artifactId = `${exportId}_artifact`) |
| Proof gate | `scripts/ci/proof-gate.sh` (included) |

---

## Sprint 2 — Client Trust Boundary CI Guard

| Item | Path / Detail |
|------|---------------|
| Script | `scripts/ci/assert-client-trust-boundary.mjs` |
| Local run | `npm run check:client-trust-boundary` |
| CI | Invoked by `npm run check:invariants` and directly in `.github/workflows/ci.yml` |
| Checks | fetch only in http.ts; apiGetJsonAuthed only in validate.ts/debug; Phase 1 screens no raw HTTP import |
