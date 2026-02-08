# Phase 1 Completion Audit — How to Audit

**Purpose:** Third-party auditable bundle for Phase 1 "Personal Health Library" completion.  
**Scope:** Endpoints, UI routes, data flow, replay, CI enforcement.

---

## Authoritative Sources (LAW)

The following documents are **binding law** for Phase 1. Auditors must treat them as authoritative.

| Document | Purpose |
|----------|---------|
| [docs/00_truth/phase1/PHASE_1_DEFINITION.md](../../00_truth/phase1/PHASE_1_DEFINITION.md) | Authoritative Phase 1 definition (repo-truth; CI-enforced) |
| [docs/00_truth/phase1/PHASE_1_LOCK_CRITERIA.md](../../00_truth/phase1/PHASE_1_LOCK_CRITERIA.md) | Lock criteria (completion verdict) |
| [docs/00_truth/phase1/PHASE_1_SCOPE.md](../../00_truth/phase1/PHASE_1_SCOPE.md) | Phase 1 scope and intent |
| [docs/00_truth/phase1/SUPERSEDED_SPECS.md](../../00_truth/phase1/SUPERSEDED_SPECS.md) | Supersession trail (PDF → repo-truth) |

---

## Superseded Documents

Specifications superseded by repo-truth LAW are listed in [docs/00_truth/phase1/SUPERSEDED_SPECS.md](../../00_truth/phase1/SUPERSEDED_SPECS.md). The Phase 1 Definition PDF is no longer authoritative.

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

- See `ci-proof.md` for full list; `proof-tests.md` for proof test descriptions.
- Run: `npm run typecheck`, `npm run lint`, `npm test`, `npm run check:invariants`, `bash scripts/ci/proof-gate.sh`
- All must pass (exit 0).

### 5. Phase 1 E2E Proof Tests

- Run: `bash scripts/ci/proof-gate.sh` (runs all proof tests)
- Key tests: `phase1E2E.logRecomputeVisibleReplay.test.ts`, `phase1E2E.replayImmutability.test.ts`, `phase1E2E.exportProof.test.ts`
- See `proof-tests.md` for paths and what each proves.

### 6. Proof Bundle (CI-equivalent outputs)

- `proof/` contains captured outputs from: `npm ci`, `typecheck`, `lint`, `check-invariants`, `proof-gate`, `npm test -- --ci`, `git rev-parse HEAD`, `git tag --points-at HEAD`, `git status --porcelain=v1`
- Third-party auditors can compare their local run outputs against these.

### 7. Screenshots (Manual)

- See `screenshots.md` for checklist.
- Capture required screenshots manually on device/simulator.

---

## No Secrets

This bundle contains **no secrets**. Sample payloads use mock/redacted data. Do not add API keys, tokens, or real user data.
