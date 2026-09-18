# Stage 3B Body Composition — simplified three-card shell verification

**Date:** 2026-09-18
**Branch:** `feat/body-composition-stage3b-value-first-shell`
**Supersedes physical candidate:** `0695d55ab39eee9c7f25c56a1341f05d1971457b` (dense educational landing — rejected)
**Status:** Label contrast + lb/kg toggle + Apple Health Sync action — **BLOCKED pending physical-iPhone retest**
**PR:** Not opened

## Product direction correction

Landing is now a three-card summary:

1. Weight
2. Body Fat
3. Lean Tissue

Dense educational hero, dual rails, four marker cards, Evidence Levels, influences, and Plan doctrine were removed from the primary landing. Education remains available via progressive disclosure (metric detail routes + ranges explainer). Static education model files remain in-repo for disclosure / later stages — not mounted on the landing.

## Label / unit / Apple Health pass (this candidate)

- Weight classification names + numeric ranges use high-contrast semantic chrome tokens (OLED-legible).
- Shared Body mass display unit via existing `preferences.units.mass` / `setMassUnit` (Weight + Lean Tissue; Body Fat remains `%`).
- Segmented lb/kg control is interactive; presentation-only (no stored measurement rewrite).
- Card footer Sync now includes Health heart identity icon and opens `/(app)/settings/devices/apple_health` (explicit connection flow). Connected remains fail-closed / current-account scoped.
- No HealthKit / sync / ingest on mount or on unit toggle.

## Scientific / architecture limitations (documented)

- **Weight:** CDC/WHO adult BMI screening chart only (`cdc-who-adult-bmi-screening` / `2024.1`). No Body score.
- **Body Fat:** PROPOSED / UNRESOLVED — unclassified scaffold only.
- **Lean Tissue:** PROPOSED / UNRESOLVED — unclassified scaffold only.
- **More Body Composition markers** row omitted — no real advanced-markers destination (waist/VAT/DEXA) yet (Stage 3C+).
- No Body score, aggregate Health Protection / Performance Support classification, Optimized/Excellence placement.
- No new schema, DailyFacts, Insights, DEXA parsing, or Stage 3C provenance.
- RG-SOURCE-PRIVACY-01 remains open (privacy tests assert mount/toggle zero-side-effects only).

## Local verification

| Gate | Result |
|------|--------|
| `npm ci` | PASS |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run check:invariants` | PASS |
| `npm run check:client-trust-boundary` | PASS |
| Focused Body Stage 3B tests | PASS |
| `npm test -- --ci` | PASS — **1038** suites / **6409** tests / **0** skipped (baseline was 1035 / 6376) |
| `npm run check` | PASS |
| Runtime / canonical workout-summary checksums | PASS |
| `npm run -w api build` | PASS — tracked checksum unchanged |
| Functions build | PASS |
| `git diff --check` | PASS |
| `npx expo-doctor` | exit 1; exactly **five** known findings; no sixth |

**Prior polish head:** `dd63c5e83c970476074f8dd68ebc8a4b4250d603`
**Retest head:** `cf1477a3503bdaea685f92cd3671f8921b58749e`
