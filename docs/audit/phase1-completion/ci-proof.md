# Phase 1 — CI Proof Gates

**Purpose:** List CI jobs and what they enforce. Instructions to run the same commands locally.

---

## CI Jobs (`.github/workflows/ci.yml`)

| Step | Command | What It Enforces |
|------|---------|------------------|
| Install | `npm ci` | Lockfile consistency |
| Build contracts | `npm run -w @oli/contracts build` | Contracts compile |
| Typecheck | `npm run typecheck` | No TypeScript errors |
| Lint | `npm run lint` | ESLint passes |
| Invariants | `npm run check:invariants` | Constitutional invariant checks (CHECK 1–20) + client trust boundary |
| Build API | `npm run -w api build` | API dist for route assertion |
| API route invariants | `node scripts/ci/assert-api-routes.mjs` | Required API endpoints exist |
| UI route invariants | `node scripts/ci/assert-ui-routes.mjs` | Required UI route files exist (includes failures) |
| Proof gate | `bash scripts/ci/proof-gate.sh` | Phase 1 proof tests (see proof-tests.md) |
| Expo config | `npx expo config --type public` | Expo config resolves |
| Tests | `npm test -- --ci` | Full Jest suite (Firestore emulator) |
| Guardrails | `scripts/ci/guardrails.sh` | No vendored contracts, lockfile, IAM snapshots |

---

## Invariant Scripts (Sprint 6)

| Script | Command | What It Enforces |
|--------|---------|------------------|
| API routes | `node scripts/ci/assert-api-routes.mjs` | Required API endpoints exist (requires `npm run -w api build` first) |
| UI routes | `node scripts/ci/assert-ui-routes.mjs` | Required UI route files exist (includes `app/(app)/failures/index.tsx`) |

---

## Client Trust Boundary (Sprint 2 Lock)

| Item | Detail |
|------|--------|
| Script | `scripts/ci/assert-client-trust-boundary.mjs` |
| Local command | `npm run check:client-trust-boundary` |
| Where it runs | CI step `node scripts/ci/assert-client-trust-boundary.mjs`; also invoked by `npm run check:invariants` |
| What it checks | CHECK 1: `fetch(` only in `lib/api/http.ts`; CHECK 2: `apiGetJsonAuthed(` only in `lib/api/validate.ts` or debug paths; CHECK 3: Phase 1 screens (timeline, library, failures) must not import from `lib/api/http` |

---

## Readiness Drift Lock (Phase 1 Lock #3)

| Item | Detail |
|------|--------|
| Contract | `lib/contracts/readiness.ts` — canonical: `missing` \| `partial` \| `ready` \| `error` |
| Check script | `scripts/ci/readiness-drift-check.mjs` (exported functions; invoked by check-invariants) |
| CHECK ID | **CHECK 20** in `scripts/ci/check-invariants.mjs` |
| Invariant map | **I-18** in `docs/90_audits/INVARIANT_ENFORCEMENT_MAP.md` |
| What it checks | No disallowed readiness strings (loading, empty, invalid, not-ready, unknown, unready, pending, coming_soon) in app/lib/components |

---

## Proof Gate Test List (scripts/ci/proof-gate.sh)

Confirmed Phase 1 E2E proof tests in proof gate:

- `phase1E2E.logRecomputeVisibleReplay.test.ts`
- `phase1E2E.replayImmutability.test.ts`
- `phase1E2E.exportProof.test.ts`

See `proof-tests.md` for full list and descriptions.

**Confirmation:** `scripts/ci/proof-gate.sh` explicitly lists the above tests; `scripts/ci/assert-ui-routes.mjs` includes `app/(app)/failures/index.tsx`.

---

## Run Locally (Full Proof)

```bash
# 1. Install
npm ci

# 2. Build (contracts + API for assert-api-routes)
npm run -w @oli/contracts build
npm run -w api build

# 3. Typecheck, lint, invariants
npm run typecheck
npm run lint
npm run check:invariants

# 4. Invariant scripts
node scripts/ci/assert-api-routes.mjs
node scripts/ci/assert-ui-routes.mjs

# 5. Phase 1 proof gate
bash scripts/ci/proof-gate.sh

# 6. Full test suite
npm test -- --ci

# 7. Guardrails
scripts/ci/guardrails.sh
```

---

## Minimal Quick Check

```bash
npm run typecheck
npm run lint
npm test -- --ci
```
