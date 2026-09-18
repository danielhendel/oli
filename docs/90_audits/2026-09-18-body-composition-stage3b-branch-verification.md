# Stage 3B Body Composition — simplified three-card shell verification

**Date:** 2026-09-18
**Branch:** `feat/body-composition-stage3b-value-first-shell`
**Status:** Proposal labels + one-tap Body Apple Health sheet — **BLOCKED pending physical-iPhone retest**
**PR:** Not opened

## Product direction correction

Landing is a three-card summary: Weight → Body Fat → Lean Tissue.

## This candidate

### Weight labels (proposal match)

- Classification names use bright segment hues (cool blue / green / amber / coral).
- Numeric ranges use coordinated slightly softer tones.
- Typography: semibold name + medium range; elegant sizes; meaning not color-only.

### Apple Health Body sheet

- Sync now opens an in-context bottom sheet (not the full Devices page).
- Primary action: **Connect & import history**
- Body-only HealthKit read scope: BodyMass, BodyFatPercentage, LeanBodyMass
- Flow: permission → account connect flag → latest/recent sync → resumable 5Y chunked history import
- No Steps/Activity/Workout side effects from this Body path
- Full Apple Health page remains under Settings → Devices (Manage in Settings)

### Architecture notes

- Reuses `runAppleHealthBodySync` + `runAppleHealthBodyBackfill` + AsyncStorage checkpoint
- Checkpoint is device-global under `appleHealth:` keys; cleared on account switch (existing lifecycle)
- RG-SOURCE-PRIVACY-01 remains OPEN

## Scientific boundary

- Weight: `cdc-who-adult-bmi-screening` / `2024.1` only
- Body Fat / Lean Tissue: PROPOSED / UNRESOLVED — unclassified scaffolds
- No Body score / Stage 3C

## Local verification

| Gate | Result |
|------|--------|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run check:invariants` | PASS |
| `npm run check:client-trust-boundary` | PASS |
| Focused Body Stage 3B tests | PASS |
| `npm test -- --ci` | PASS — **1042** suites / **6419** tests / **0** skipped (prior 1038 / 6409) |
| Runtime / canonical workout-summary checksums | PASS |
| `npm run -w api build` | PASS — tracked checksum unchanged |
| Functions build | PASS |
| `git diff --check` | PASS |
| `npx expo-doctor` | exit 1; exactly **five** known findings; no sixth |

**Prior head:** `efb9907915639bbff053b55d5deb65166c5254dc`
**Retest head:** `206a082a8b7bd2998a9939831d8bc15998ed34d1`
