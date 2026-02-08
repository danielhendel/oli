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
| Invariants | `npm run check:invariants` | Constitutional invariant checks (CHECK 1–19) |
| Build API | `npm run -w api build` | API dist for route assertion |
| API route invariants | `node scripts/ci/assert-api-routes.mjs` | Required API endpoints exist |
| UI route invariants | `node scripts/ci/assert-ui-routes.mjs` | Required UI route files exist |
| Proof gate | `bash scripts/ci/proof-gate.sh` | Phase 1 proof tests (canonical immutability, recompute, determinism, E2E, etc.) |
| Expo config | `npx expo config --type public` | Expo config resolves |
| Tests | `npm test -- --ci` | Full Jest suite (Firestore emulator) |
| Guardrails | `scripts/ci/guardrails.sh` | No vendored contracts, lockfile, IAM snapshots |

---

## Invariant Scripts (Sprint 6)

| Script | Command | What It Enforces |
|--------|---------|------------------|
| API routes | `node scripts/ci/assert-api-routes.mjs` | Required API endpoints exist (requires `npm run -w api build` first) |
| UI routes | `node scripts/ci/assert-ui-routes.mjs` | Required UI route files exist |

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
