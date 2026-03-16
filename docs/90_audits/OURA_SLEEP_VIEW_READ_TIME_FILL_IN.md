# Oura Sleep View — Read-Time Fill-In Audit & Fix

## Root cause

1. **Why live sleep was missing `contributors.total_sleep` and `restfulness`**  
   The response for a given day can come from an **older snapshot** (e.g. fallback to `resolvedDay: 2026-03-13`) that was written **before** write-time contributor derivation was implemented, or by a code path that didn’t persist those keys. The **view route** was only passing through `data.contributors` from Firestore. So if the stored doc had partial contributors (e.g. only `deep_sleep`, `efficiency`, `latency`, `rem_sleep`), the API returned exactly that. No read-time logic was filling missing keys from stored top-level fields (`totalSleepDuration`, `restfulSleep`, etc.).

2. **Why sleep score was absent**  
   Either (a) Oura did not send `score` or `composite_score` in the payload for that night, or (b) we never persisted `composite_score` and only used it to set `score` at write time; for older docs written by a path that didn’t read `composite_score`, the stored doc has no score. The view route also did not use `composite_score` as a fallback when building the response; it only passed `data.score`.

3. **Summary**  
   - **total_sleep / restfulness**: Missing because the **response** was built from **stored contributors only**, with no read-time fill from stored top-level metrics.  
   - **Score**: Not surfaced when only `composite_score` existed on the doc, and we didn’t use it in the view.

## Preferred fix (smallest and safest)

- **Keep** write-time derivation in snapshot writers (API + Functions); new snapshots continue to get full contributors and score when Oura provides data.
- **Add** read-time fill-in in `GET /users/me/oura-sleep-view`: merge stored contributors with derived values **only for missing keys**, using stored top-level fields (`totalSleepDuration`, `efficiency`, `restfulSleep`, `remSleep`, `deepSleep`, `latency`). Do not override existing contributor values; do not derive `timing`; do not invent a score.
- **Score**: In the view, set response score from `data.score ?? data.composite_score` (only when one is a number). Do not invent a score.

This guarantees the API returns the expected contributor shape even for **older snapshot docs** already in Firestore, without changing Firestore document shape or the mobile app.

## Files changed

| File | Change |
|------|--------|
| `services/api/src/lib/ouraVendorSnapshot.ts` | Added `StoredSleepSnapshotData` type and `fillSleepContributorsFromStored(data)`. Fills only missing sleep contributor keys from stored top-level fields; never overrides existing or derives `timing`. Exported for use by the view route. |
| `services/api/src/routes/usersMe.ts` | Sleep view: build `mergedContributors` via `fillSleepContributorsFromStored(storedData)`; response score from `data.score ?? data.composite_score`; added temporary proof log `oura_sleep_view_proof` (requestedDay, resolvedDay, storedContributorKeys, responseContributorKeys, scoreOnDoc, scoreOnResponse, compositeScoreOnDoc). |
| `services/api/src/lib/__tests__/ouraVendorSnapshot.test.ts` | New tests for `fillSleepContributorsFromStored`: fills total_sleep for short sleep when missing; fills restfulness from restfulSleep; does not override existing contributor values. |
| `services/api/src/routes/__tests__/usersMe.ouraView.test.ts` | New tests: sleep view returns total_sleep for short sleep when key missing but totalSleepDuration exists; preserves existing contributor values and only fills missing keys; returns score when doc has score; returns score when doc has composite_score but not score; does not invent score when neither exists. |

No changes to readiness route, mobile app, or Firestore document shape. Read-time derivation affects only the response DTO.

## Plain-English explanation

- The Sleep screen was getting partial data because the API returned whatever was stored in `contributors` for the chosen snapshot. Many of those snapshots were written before we derived all contributor keys, or from a path that didn’t have full Oura payload, so they had only a subset of keys (e.g. no `total_sleep`, no `restfulness`). We fixed this by **filling in missing contributor keys at read time** using the same formulas we use at write time, but applied to the **stored** top-level fields (totalSleepDuration, restfulSleep, etc.). Existing contributor values are never overwritten. We also use **composite_score** when **score** is missing so that if Oura sent only composite_score, the response still includes a score. Temporary logging was added so you can see in logs exactly which keys came from storage vs. after fill-in, and whether score/composite_score were present.

## Run these checks

```bash
npm run typecheck
npm run lint
npm run test
```

To run only the touched tests:

```bash
cd services/api && npx jest --testPathPattern="ouraVendorSnapshot|usersMe.ouraView" --watchAll=false
```

## Test summary

- **ouraVendorSnapshot.test.ts**
  - `fillSleepContributorsFromStored` fills total_sleep for short sleep when missing from stored contributors (totalSleepDuration 2460 → total_sleep ~8).
  - Fills restfulness from stored restfulSleep when missing.
  - Does not override existing contributor values (e.g. efficiency 99 preserved when doc also has efficiency 85).
- **usersMe.ouraView.test.ts**
  - Sleep view returns `contributors.total_sleep` when missing in stored contributors but derivable from stored totalSleepDuration (short sleep).
  - Sleep view preserves existing contributors and only fills missing keys (efficiency 99 kept; total_sleep, restfulness, rem_sleep, deep_sleep, latency filled).
  - Sleep view returns score when doc has score (82).
  - Sleep view returns score when doc has composite_score but not score (72).
  - Sleep view does not invent score when neither exists (score undefined).
  - Existing test: latency stored in seconds (1470) → latencyMinutes 25.
  - Readiness tests unchanged (oura-readiness-view returns 200 with requestedDay/resolvedDay/score/contributors).

## Final manual proof checklist

Use gateway base `https://oli-gateway-cw04f997.uc.gateway.dev` with your Firebase ID token and gateway API key.

1. **Sleep view returns 200**
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" \
     -H "Authorization: Bearer YOUR_ID_TOKEN" \
     "https://oli-gateway-cw04f997.uc.gateway.dev/users/me/oura-sleep-view?day=2026-03-15&key=YOUR_GATEWAY_API_KEY"
   ```
   Expected: `200`

2. **Sleep response includes contributors.total_sleep**
   ```bash
   curl -s \
     -H "Authorization: Bearer YOUR_ID_TOKEN" \
     "https://oli-gateway-cw04f997.uc.gateway.dev/users/me/oura-sleep-view?day=2026-03-15&key=YOUR_GATEWAY_API_KEY"
   ```
   Inspect JSON: `contributors.total_sleep` should be a number 0–100.

3. **Sleep response shows sensible latencyMinutes (not raw seconds)**
   Same curl as above; check `latencyMinutes` is in a reasonable range (e.g. 20–30), not 1470.

4. **Score appears only when stored doc has score or composite_score**
   If the snapshot has neither, response should not include a synthetic score.

5. **Readiness response remains unchanged**
   ```bash
   curl -s \
     -H "Authorization: Bearer YOUR_ID_TOKEN" \
     "https://oli-gateway-cw04f997.uc.gateway.dev/users/me/oura-readiness-view?day=2026-03-15&key=YOUR_GATEWAY_API_KEY" \
     | jq '{ requestedDay, resolvedDay, score, contributors: (.contributors | keys) }'
   ```
   Expected: same shape and behavior as before.

6. **App renders sleep rows**
   After deploy, Sleep screen shows real contributor rows (and score hero when score exists) instead of em dashes.

## Temporary proof logging

The sleep view route logs once per request:

- `msg: "oura_sleep_view_proof"`
- `requestedDay`, `resolvedDay`
- `storedContributorKeys`: keys present in Firestore `contributors`
- `responseContributorKeys`: keys on the response `contributors` after merge/fill
- `scoreOnDoc`: whether `score` existed on the stored doc
- `scoreOnResponse`: whether the response includes a score
- `compositeScoreOnDoc`: whether `composite_score` existed on the stored doc

Use this to confirm where `total_sleep` and score appear or drop. Remove or reduce this log after verification if desired.

## Acceptance checklist

- [x] Read-time fill only for missing keys; existing contributor values preserved.
- [x] total_sleep derived for any duration from stored `totalSleepDuration`.
- [x] restfulness derived from stored `restfulSleep` when missing.
- [x] timing never derived; only from stored contributors.
- [x] Score from `score` or `composite_score`; no synthetic score.
- [x] latencyMinutes conversion unchanged (seconds → minutes when ≥ 60).
- [x] Firestore document shape unchanged; no new fields written.
- [x] Readiness behavior unchanged.
- [x] Unit tests added/updated; typecheck and lint pass.
- [ ] Manual: curl sleep view returns 200 with `contributors.total_sleep` and sensible `latencyMinutes`.
- [ ] Manual: Score present only when Oura provided score or composite_score.
- [ ] Manual: App renders all available sleep rows instead of em dashes.
