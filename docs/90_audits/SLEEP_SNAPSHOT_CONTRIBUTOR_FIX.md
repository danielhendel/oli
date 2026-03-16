# Sleep Snapshot Contributor Fix — Audit

## Root cause

- **Readiness** works because the Oura daily_readiness API returns a `contributors` object (e.g. resting_heart_rate, hrv_balance), and the snapshot extractor passes it through. The mobile UI expects those keys and renders bars/labels.
- **Sleep** did not render contributor rows because:
  1. The Oura sleep API may not include a `contributors` object in the response (or it was not present in the payloads we receive), and
  2. The sleep extractor only passed through `doc.contributors` when present; it did not **build** contributors from the existing top-level sleep metrics (total_sleep_duration, efficiency, latency, restful_sleep, rem_sleep_duration, deep_sleep_duration).

So the Firestore `ouraVendorSleep` documents often had no `contributors` field, and the Sleep screen showed em dashes and "Pay attention" for most rows.

## Why readiness worked but sleep did not

- Readiness: Oura API returns `score` and `contributors` on daily_readiness; we persist them as-is. Mobile reads the same keys.
- Sleep: Oura sleep documents have top-level metrics (efficiency, latency, restful_sleep, rem_sleep_duration, deep_sleep_duration, total_sleep_duration) but may not include a precomputed `contributors` object. We now **build** a contributors object from those fields when the API does not provide it (or to fill gaps), using the same keys the mobile UI expects.

## Files changed

| File | Change |
|------|--------|
| `services/api/src/lib/ouraVendorSnapshot.ts` | Added `SLEEP_CONTRIBUTOR_KEYS`, `clampScore()`, `buildSleepContributors(doc)`. `extractSleepSnapshot()` now calls `buildSleepContributors(doc)`, assigns `stripUndefined(contributors)` to `out.contributors` when non-empty, and keeps all existing top-level fields. |
| `services/functions/src/oura/ouraPostRawHandler.ts` | Mirrored the same: `SLEEP_CONTRIBUTOR_KEYS`, `clampScore()`, `buildSleepContributors(doc)`. `extractSleepSnapshot()` now uses built contributors and `stripUndefined` for Firestore-safe writes. |
| `services/api/src/lib/__tests__/ouraVendorSnapshot.test.ts` | Updated first sleep test to use `toMatchObject` and assert contributor values are numbers; added "writes contributors derived from doc when API does not send contributors" and "does not write undefined contributor values (Firestore-safe)". |
| `services/functions/src/oura/__tests__/ouraPostRawHandler.test.ts` | Added "sleep snapshot includes Firestore-safe contributors when doc has metrics" to assert sleep payload has contributors and no undefined. |
| `services/api/src/routes/usersMe.ts` | oura-sleep-view: derive `latencyMinutes` from `data.latency` (treat ≥ 60 as seconds → divide by 60). |
| `services/api/src/lib/ouraVendorSnapshot.ts` | total_sleep: derive for any duration (0–540 min → 0–100); score: fallback to `composite_score`. |
| `services/functions/src/oura/ouraPostRawHandler.ts` | Same total_sleep derivation and score fallback as API. |
| `services/api/src/lib/__tests__/ouraVendorSnapshot.test.ts` | Added "derives total_sleep contributor for short sleep (any duration)". |
| `services/api/src/routes/__tests__/usersMe.ouraView.test.ts` | Added "oura-sleep-view converts latency stored in seconds to latencyMinutes". |

- **View route** (`services/api/src/routes/usersMe.ts`): `latencyMinutes` is now derived from stored `data.latency`. When the snapshot stores latency in **seconds** (Oura API convention), values ≥ 60 are converted to minutes (`Math.round(data.latency / 60)`); otherwise we treat as minutes. This fixes the bug where the API returned e.g. `latencyMinutes: 1470` (seconds misread as minutes).
- **Score**: Snapshot extractor also reads `composite_score` as fallback when `score` is absent (some Oura payloads use this key).

## Exact fields added (contributors object)

Contributor keys written (when we have a value) match `lib/format/ouraScore.ts` `SLEEP_CONTRIBUTOR_KEYS`:

- **total_sleep** — from `total_sleep_duration` (derived 0–100 for any duration: `totalMinutes/540` capped at 1, so short sleeps get a low but non-empty value; API value used when present)
- **efficiency** — from `doc.efficiency` (0–100; if 0–1 we multiply by 100)
- **restfulness** — from `doc.restful_sleep` or `doc.restfulness` (0–100)
- **rem_sleep** — from `rem_sleep_duration` (seconds → derived 0–100)
- **deep_sleep** — from `deep_sleep_duration` (seconds → derived 0–100)
- **latency** — from `doc.latency` (minutes or seconds; inverse score: lower latency = higher value)
- **timing** — only when present in API `contributors` (we do not derive it)

Only numeric values are written; undefined and non-numeric entries are omitted. The whole snapshot (and contributors) is passed through `stripUndefined` before write.

## Assumptions about Oura payload

- **efficiency**: Oura may send 0–100 or 0–1; we treat values > 1 as 0–100 and otherwise multiply by 100.
- **latency**: We treat values &gt; 120 as seconds and convert to minutes for the inverse score; otherwise we treat as minutes.
- **restful_sleep / restfulness**: Used as 0–100; if &lt;= 1 we multiply by 100.
- **rem_sleep_duration / deep_sleep_duration**: In seconds; we derive a 0–100 score from typical optimal ranges (e.g. REM up to 120 min, deep up to 90 min).
- **timing**: Not derived from other fields; only included when the API sends it in `contributors`.

## Acceptance checklist

- [ ] Sleep snapshot docs in Firestore include `score` and `contributors` with (when available) keys: total_sleep, efficiency, restfulness, rem_sleep, deep_sleep, latency, timing.
- [ ] No undefined values in Firestore payloads (stripUndefined used for snapshot and contributors).
- [ ] Existing durability and post-raw behavior unchanged.
- [ ] Readiness snapshots and UI still work.
- [ ] Mobile Sleep screen shows score and contributor rows with bars/ratings when data exists.
- [ ] `npm run typecheck` and `npm run lint` pass.
- [ ] Relevant tests pass (ouraVendorSnapshot, ouraPostRawHandler, readiness tests unchanged).

## Run these checks

```bash
npm run typecheck
npm run lint
npm run test
```

To run only the touched tests:

```bash
cd services/api && npx jest --testPathPattern="ouraVendorSnapshot"
cd services/functions && npx jest --testPathPattern="ouraPostRawHandler"
```

(If Jest/Babel in a package fails on TypeScript syntax, run the full repo test script from the root instead.)
