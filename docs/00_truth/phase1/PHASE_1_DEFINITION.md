# Phase 1 Definition — Authoritative Repo-Truth (LAW)

**Status:** Authoritative  
**Purpose:** This document is the authoritative Phase 1 definition. It reflects the actual implemented system and is enforced by CI.  
**Supersedes:** Phase 1 Definition PDF (see [SUPERSEDED_SPECS.md](./SUPERSEDED_SPECS.md))

---

## Scope Summary

Phase 1 scope and intent are defined in [PHASE_1_SCOPE.md](./PHASE_1_SCOPE.md).  
Lock criteria (completion verdict) are defined in [PHASE_1_LOCK_CRITERIA.md](./PHASE_1_LOCK_CRITERIA.md).

This document codifies **repo-truth**: what CI actually enforces, what routes exist, and how to verify.

---

## Readiness Vocabulary (Canonical)

**Enforced by:** `lib/contracts/readiness.ts` + `scripts/ci/check-invariants.mjs` (CHECK 20)

The canonical readiness vocabulary is exactly:

- `missing`
- `partial`
- `ready`
- `error`

Disallowed (CI blocks): `loading`, `empty`, `invalid`, `not-ready`, `unknown`, `unready`, `pending`, `coming_soon`

**Evidence:**
- `lib/contracts/readiness.ts` — `readinessSchema`, `CANONICAL_READINESS_VALUES`
- `scripts/ci/check-invariants.mjs` — `checkReadinessDrift` (CHECK 20)

---

## Required API Routes

**Enforced by:** `scripts/ci/assert-api-routes.mjs`  
**Authority:** `.github/workflows/ci.yml` step "API route invariants"

The following routes must exist in the compiled API (`services/api/dist`). Paths are relative to `/users/me` where applicable.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/export` | Data export |
| POST | `/account/delete` | Account deletion |
| GET | `/raw-events` | List raw events |
| GET | `/events` | List canonical events |
| GET | `/timeline` | Day aggregates with presence flags |
| GET | `/lineage` | Raw → canonical → derived mapping |
| GET | `/derived-ledger/snapshot` | Replay snapshot for a day (as-of truth) |
| GET | `/derived-ledger/runs` | Derived ledger runs for a day |

**Verification:** `npm run -w api build && node scripts/ci/assert-api-routes.mjs`

**Evidence:**
- `scripts/ci/assert-api-routes.mjs` — `mustHave` array
- `docs/audit/phase1-completion/endpoints.md` — extended list (some endpoints documented but not in assert script)

---

## Required UI Routes

**Enforced by:** `scripts/ci/assert-ui-routes.mjs`  
**Authority:** `.github/workflows/ci.yml` step "UI route invariants"

The following route files must exist:

| Route | File |
|-------|------|
| Tabs layout | `app/(app)/(tabs)/_layout.tsx` |
| Dash | `app/(app)/(tabs)/dash.tsx` |
| Timeline index | `app/(app)/(tabs)/timeline/index.tsx` |
| Timeline day | `app/(app)/(tabs)/timeline/[day].tsx` |
| Manage | `app/(app)/(tabs)/manage.tsx` |
| Library index | `app/(app)/(tabs)/library/index.tsx` |
| Library category | `app/(app)/(tabs)/library/[category].tsx` |
| Stats | `app/(app)/(tabs)/stats.tsx` |
| Event detail | `app/(app)/event/[id].tsx` |
| Lineage | `app/(app)/(tabs)/library/lineage/[canonicalEventId].tsx` |
| Replay day | `app/(app)/(tabs)/library/replay/day/[dayKey].tsx` |
| Failures | `app/(app)/failures/index.tsx` |

**Verification:** `node scripts/ci/assert-ui-routes.mjs`

**Evidence:**
- `scripts/ci/assert-ui-routes.mjs` — `REQUIRED_UI_ROUTES` array
- `docs/audit/phase1-completion/routes.md` — human-readable descriptions

---

## Replay and Immutability Guarantee

**Enforced by:** `scripts/ci/proof-gate.sh` + `.github/workflows/ci.yml` step "Phase 1 proof gate"

Proof tests asserting replay and immutability:

| Test File | Guarantee |
|-----------|-----------|
| `services/api/src/routes/__tests__/phase1E2E.logRecomputeVisibleReplay.test.ts` | Log → recompute → visible → replayable |
| `services/api/src/routes/__tests__/phase1E2E.replayImmutability.test.ts` | Phase 1 Lock #5: Replay immutability |
| `services/api/src/routes/__tests__/phase1E2E.exportProof.test.ts` | Phase 1 Lock #6: Export E2E proof |

Additional proof tests (determinism, canonical immutability):

- `services/functions/src/normalization/__tests__/canonicalImmutability.test.ts`
- `services/functions/src/ingestion/__tests__/rawEventDedupe.test.ts`
- `services/functions/src/http/__tests__/authoritativeRecompute.noMerge.test.ts`
- `services/functions/src/http/__tests__/recomputeInsights.authoritative.test.ts`
- `services/functions/src/pipeline/__tests__/phase1Determinism.unit.test.ts`
- `services/functions/src/normalization/__tests__/mapRawEventToCanonical.test.ts`
- `services/api/src/routes/__tests__/events.ingest.invalid-timezone.test.ts`

**Verification:** `bash scripts/ci/proof-gate.sh`

---

## Proof Gate Requirements

**Script:** `scripts/ci/proof-gate.sh`  
**CI step:** `.github/workflows/ci.yml` — "Phase 1 proof gate (truth + determinism)"

The proof gate:

1. Runs `node scripts/ci/check-invariants.mjs`
2. Runs the explicit list of proof tests via `npm test -- --ci --runInBand --passWithNoTests=false --runTestsByPath`
3. Fails if any required proof test file is missing
4. Fails if any proof test fails

---

## How to Verify

| Check | Command | Proof Output |
|-------|---------|--------------|
| Install | `npm ci` | `docs/audit/phase1-completion/proof/npm-ci.txt` |
| Typecheck | `npm run typecheck` | `docs/audit/phase1-completion/proof/typecheck.txt` |
| Lint | `npm run lint` | `docs/audit/phase1-completion/proof/lint.txt` |
| Invariants | `npm run check:invariants` | `docs/audit/phase1-completion/proof/check-invariants.txt` |
| Proof gate | `bash scripts/ci/proof-gate.sh` | `docs/audit/phase1-completion/proof/proof-gate.txt` |
| Tests | `npm test -- --ci` | `docs/audit/phase1-completion/proof/tests-ci.txt` |
| Git head | `git rev-parse HEAD` | `docs/audit/phase1-completion/proof/git-head.txt` |
| Tags at head | `git tag --points-at HEAD` | `docs/audit/phase1-completion/proof/git-tags-at-head.txt` |

---

## Supersession

This document supersedes the Phase 1 Definition PDF ("Phase 1 Definition (what we must finish).pdf").  
See [SUPERSEDED_SPECS.md](./SUPERSEDED_SPECS.md) for the formal supersession trail.
