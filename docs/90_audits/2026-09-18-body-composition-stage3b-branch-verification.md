# Stage 3B Body Composition — simplified three-card shell verification

**Date:** 2026-09-18  
**Branch:** `feat/body-composition-stage3b-value-first-shell`  
**Supersedes physical candidate:** `0695d55ab39eee9c7f25c56a1341f05d1971457b` (dense educational landing — rejected)  
**Status:** Simplified landing implemented — **BLOCKED pending new physical-iPhone retest**  
**PR:** Not opened

## Product direction correction

Landing is now a three-card summary:

1. Weight  
2. Body Fat  
3. Lean Tissue  

Dense educational hero, dual rails, four marker cards, Evidence Levels, influences, and Plan doctrine were removed from the primary landing. Education remains available via progressive disclosure (metric detail routes + ranges explainer). Static education model files remain in-repo for disclosure / later stages — not mounted on the landing.

## Scientific / architecture limitations (documented)

- **Weight:** Personal BMI screening placement is withheld on Body consumer UI to avoid duplicate truth vs the deferred `classifyBodyComposition` path. Card shows value + “Weight-for-height screening” + “Reference unavailable” (no personal marker).
- **Body Fat:** Method unknown on overview — no personal marker; no Apple Health→BIA inference.
- **Lean Tissue:** No approved method-compatible standard on this surface — no personal marker; no sarcopenia/excellence labels.
- **More Body Composition markers** row omitted — no real advanced-markers destination (waist/VAT/DEXA) yet (Stage 3C+).
- No Body score, aggregate Health Protection / Performance Support classification, Optimized/Excellence placement.
- No new schema, DailyFacts, Insights, DEXA parsing, or Stage 3C provenance.

## Local verification

| Gate | Result |
|------|--------|
| `npm ci` | PASS |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run check:invariants` | PASS |
| `npm run check:client-trust-boundary` | PASS |
| Focused Body Stage 3B tests | PASS |
| `npm test -- --ci` | PASS — **1035** suites / **6376** tests / **0** skipped |
| `npm run check` | PASS |
| Runtime / canonical workout-summary checksums | PASS |
| `npm run -w api build` | PASS — tracked checksum unchanged |
| Functions build | PASS |
| `git diff --check` | PASS |
| `npx expo-doctor` | exit 1; exactly **five** known findings; no sixth |

**Retest head:** `06145bc443641dad2794c68f08af0cb500ca24ea`
