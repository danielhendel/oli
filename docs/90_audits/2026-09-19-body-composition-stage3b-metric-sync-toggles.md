# Stage 3B — Apple Health per-metric sync-scope toggles

**Date:** 2026-09-19
**Branch:** `feat/body-composition-stage3b-value-first-shell`
**Status:** READY FOR PHYSICAL RETEST — `026c62a69793b0031bbb5ccd36f5d695ca3e2106`

## Product

- Connected Body sheet: interactive Apple Health–green Oli sync-scope toggles for Weight / Body Fat / Lean Tissue
- Apple Health Settings: grouped management page for all implemented consumer metrics
- Toggles control Oli sync scope (account-scoped AsyncStorage), not HealthKit permission truth
- System permission recovery via iOS Health access / Connect flows

## Local verification

| Gate | Result |
|------|--------|
| typecheck / lint / invariants / trust-boundary | PASS |
| `npm test -- --ci` | PASS — **1049** suites / **6442** tests / **0** skipped |
| `npm run check` | PASS |
| API + Functions build | PASS |
| `git diff --check` | PASS |

**Backend/schema/path:** NO

**Stage 3C:** NOT BEGUN
