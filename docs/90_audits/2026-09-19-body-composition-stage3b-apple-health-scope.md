# Stage 3B Body Composition — Apple Health scope + resumable import

**Date:** 2026-09-19
**Branch:** `feat/body-composition-stage3b-value-first-shell`
**Status:** READY FOR STAGE 3B APPLE HEALTH SCOPE AND RESUMABLE BODY IMPORT PHYSICAL RETEST
**PR:** Not opened

## Product architecture

- One account-level Apple Health source
- Progressive typed domain permission bundles (`appleHealthDomainRegistry`)
- Body Composition requests BodyMass, BodyFatPercentage, LeanBodyMass only
- Optional Connect all supported data under Settings → Devices → Apple Health
- Body Sync now continues to open the Body-specific sheet (not full Devices)

## Defects fixed (physical SHA `6a7d5d7` blocked)

1. History import failure conflated with source disconnect → giant Try again
2. Body connect unlocked Steps today/yesterday/backfill via global connected flag
3. Oversized Connected pill
4. Sheet not matching Category Card language
5. Insufficient Body import phase observability

## Proven root cause

Latest Body sync succeeded; history import failed inside `runAppleHealthBodyBackfill`
(chunk pull/ingest). The card phase mapper prioritized that history failure and
rendered source-level **Try again**, even though the account source remained
connected and latest values were kept. Independently, Body connect set the
global Apple Health connected flag without domain scopes, so Activity/Dash
Steps repair (today / yesterday / trailing backfill) ran in the same session.
Exact HealthKit/ingest batch error code was not present in prior consumer logs;
structured `apple_health_body_history_*` ops now emit safe phase + error code
buckets for the retest.

## Design

- Compact Connected action (~15–16pt semibold, ~18pt Health icon, 44pt hit target)
- `connected_attention` keeps Connected + attention dot when history incomplete
- Premium sheet uses Category Card surface / radius / spacing tokens
- Recovery CTAs live in the sheet (Resume import / Sync latest)

## Import

- Latest-first Body sync, then resumable chunked history from AsyncStorage checkpoint
- History failure keeps source Connected and does not roll back latest values
- Body trigger = `body_connect` (internal only); enables domain `body` only
- Existing ingest front door + idempotency keys reused; no new Firestore path

## Local verification

| Gate | Result |
|------|--------|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run check:invariants` | PASS |
| `npm run check:client-trust-boundary` | PASS |
| Focused AH Body / domain / sheet tests | PASS |
| `npm test -- --ci` | PASS — **1044** suites / **6424** tests / **0** skipped |
| `npm run check` | PASS |
| Runtime / canonical workout-summary checksums | PASS |
| `npm run -w api build` | PASS — tracked checksum unchanged |
| Functions build | PASS |
| `git diff --check` | PASS |
| `npx expo-doctor` | exit 1; exactly **five** known findings; no sixth |

**Blocked physical SHA (do not reuse evidence):** `6a7d5d7f2a163ee95dcc636e838e37a2f8dffea6`
**Retest head:** _(filled after commit)_

## Boundaries

- Backend unchanged
- No staging / production deploy
- No Stage 3C
- No Body Fat / Lean Tissue classification
- RG-SOURCE-PRIVACY-01 remains OPEN
