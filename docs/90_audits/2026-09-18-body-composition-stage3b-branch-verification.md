# Stage 3B Body Composition value-first shell — branch verification

**Date:** 2026-09-18  
**Branch:** `feat/body-composition-stage3b-value-first-shell`  
**Baseline main:** `b366744007bf771a0796f8499e9be224d226e6b6` (PR #219 Stage 3A merge)  
**Status:** Implemented on branch — **BLOCKED pending physical-iPhone retest**  
**PR:** Not opened (Draft after physical PASS)

## Scope delivered

- Value-first educational Body Composition landing on `/(app)/body`
- Educational reference model (Health Protection + Performance Support; no personal marker)
- Marker education, evidence tiers, baseline actions, measurement-method trust, influences, Plan boundary
- Apple Health access repositioned under Build your baseline (transport copy)
- Existing measurement cards preserved under Your measurements (not promoted as official classification)
- No schema, DailyFacts, Insights, DEXA parsing, or Stage 3C provenance

## Explicit non-goals (unchanged)

- No personal rail marker, Body score, rating, Optimized/Excellence placement
- No aggregate Health Protection / Performance Support classification
- No new APIs, Functions, Firestore paths, or contracts
- Stage 3C not begun

## Local verification (pre-physical)

| Gate | Result |
|------|--------|
| `npm ci` | PASS |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run check:invariants` | PASS |
| `npm run check:client-trust-boundary` | PASS |
| Focused Body Stage 3B tests | PASS |
| `npm test -- --ci` | PASS — **1033** suites / **6375** tests / **0** skipped (Δ +3 suites / +28 tests vs 1030/6347) |
| `npm run check` | PASS |
| Runtime workout-summary checksum | PASS |
| Canonical workout-summary checksum | PASS |
| `npm run -w api build` | PASS — tracked checksum unchanged |
| Functions build | PASS |
| `git diff --check` | PASS |
| `npx expo-doctor` | exit 1; exactly **five** known findings; no sixth |

## Privacy / release gates

- Opening Body for an unconnected account does not auto-request HealthKit in Stage 3B shell tests
- **RG-SOURCE-PRIVACY-01 OPEN** (Issue [#218](https://github.com/danielhendel/oli/issues/218) OPEN)
- **RG-LEGAL-01 OPEN**
- Export coverage / scalability OPEN
- No staging or production deployment from this branch

## Physical retest

Required before Draft PR. See Stage 3B physical checklist in the implementation prompt.
