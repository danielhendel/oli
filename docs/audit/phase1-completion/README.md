# Phase 1 Completion Audit — How to Audit

**Purpose:** Third-party auditable bundle for Phase 1 "Personal Health Library" completion.  
**Scope:** Endpoints, UI routes, data flow, replay, CI enforcement.

---

## What "Done" Means

Phase 1 is **done** when:

1. **Truth is immutable** — RawEvents append-only; CanonicalEvents immutable; Derived truth recomputable.
2. **Failures are visible** — Explicit failure memory; no silent drops.
3. **Timeline is unified** — Day-indexed, longitudinal reads.
4. **Readiness is standardized** — `ready` / `partial` / `missing` / `error` semantics.
5. **Replay is guaranteed** — Derived ledger snapshot endpoint exposes "as-of" truth.
6. **Invariants are enforced by CI** — API routes, UI routes, and structural checks block regression.

---

## Audit Steps

### 1. Verify API Endpoints

- See `endpoints.md` for required endpoints.
- Run: `npm run -w api build && node scripts/ci/assert-api-routes.mjs`
- All endpoints must be present (assert exits 0).

### 2. Verify UI Routes

- See `routes.md` for required UI route files.
- Run: `node scripts/ci/assert-ui-routes.mjs`
- All route files must exist (assert exits 0).

### 3. Validate Sample Payloads

- Inspect `sample-payloads/*.json`.
- Payloads are redacted/mock but schema-valid per `lib/contracts`.

### 4. Run Proof Gates

- See `ci-proof.md` for full list.
- Run: `npm run typecheck`, `npm run lint`, `npm test`, `npm run check:invariants`, `bash scripts/ci/proof-gate.sh`
- All must pass (exit 0).

### 5. E2E Proof (Log → Recompute → Visible → Replayable)

- Run: `npm test -- --runTestsByPath services/functions/src/pipeline/__tests__/phase1E2E.logRecomputeVisibleReplay.test.ts`
- Test must pass deterministically (no flake).

### 6. Screenshots (Manual)

- See `screenshots.md` for checklist.
- Capture required screenshots manually on device/simulator.

---

## No Secrets

This bundle contains **no secrets**. Sample payloads use mock/redacted data. Do not add API keys, tokens, or real user data.
