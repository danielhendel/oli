# Stage 3B — Body page refresh ownership + Apple Health access indicators

**Date:** 2026-09-19
**Branch:** `feat/body-composition-stage3b-value-first-shell`
**Status:** READY FOR STAGE 3B BODY PAGE REFRESH AND ACCESS INDICATORS PHYSICAL RETEST
**Supersedes physical evidence from:** `75e9af207dc64177bc09292785f178e79a29d90e`

## Product

- Body Composition page owns latest-only refresh (page entry + pull-to-refresh)
- Connected Apple Health popup is status/management only — no refresh on open, no normal loading dial
- Card-level Apple Health heart uses muted red; popup/header keeps strong Apple Health red
- Healthy popup: per-metric noninteractive ON scope indicators + Apple Health settings link
- Explanatory “Oli keeps these measurements up to date” removed

## Refresh contract

| Trigger | Behavior |
|---------|----------|
| Connected page focus | One latest-only Body refresh (`body_page_entry`), silent, throttled |
| Pull-to-refresh | Latest-only (`body_page_pull_refresh`), native RefreshControl |
| Popup open | Zero latest / history / authorization work |

## Local verification

| Gate | Result |
|------|--------|
| `npm ci` | PASS |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run check:invariants` | PASS |
| `npm run check:client-trust-boundary` | PASS |
| Focused Body refresh / sheet / card tests | PASS |
| `npm test -- --ci` | PASS — **1048** suites / **6435** tests / **0** skipped |
| `npm run check` | PASS |
| Workout-summary checksums | PASS |
| `npm run -w api build` | PASS — tracked checksum unchanged |
| Functions build | PASS |
| `git diff --check` | PASS |
| `npx expo-doctor` | exit 1; exactly **five** known findings |

**Delta from prior branch baseline (1047 / 6436 / 0):** +1 suite, −1 test, 0 skipped.

**Retest head:** `c0929245c7453a2d1d5caea9dc115b29b5a4d4f7`

## Boundaries

- Backend unchanged
- No Stage 3C
- No Body Fat / Lean classification
- Scope indicators represent Oli Body sync scope, not HealthKit permission truth
- RG-SOURCE-PRIVACY-01 remains OPEN
