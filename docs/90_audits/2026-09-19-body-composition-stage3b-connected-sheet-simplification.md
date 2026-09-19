# Stage 3B — Apple Health connected sheet simplification

**Date:** 2026-09-19
**Branch:** `feat/body-composition-stage3b-value-first-shell`
**Status:** READY FOR STAGE 3B APPLE HEALTH CONNECTED SHEET PHYSICAL RETEST
**Supersedes physical evidence from:** `78a005080d49c13749b4e5fd5c6994ab92a4b5dc`

## Product

- Red Apple Health heart aligned with the source title
- Healthy connected sheet: Last updated + Body history + Done
- No Sync latest / Review access / Manage Apple Health in healthy state
- Auto latest-only refresh on connected sheet open (`body_status_sheet_open`)
- Pull-to-refresh latest only (does not restart history)
- Central Apple Health page is a simple access summary

## Local verification

| Gate | Result |
|------|--------|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run check:invariants` | _(pending full gate)_ |
| Focused sheet / refresh / access-page tests | PASS |

**Retest head:** `6daaf59e7b96e978d7a8ecdaad3c32f720555197`

## Boundaries

- Backend unchanged
- No Stage 3C
- No Body Fat / Lean classification
- RG-SOURCE-PRIVACY-01 remains OPEN
