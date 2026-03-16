# Sleep & Readiness Data Read Path — Audit & Fix

## 1. Root cause summary

**Observed:** Sleep and Readiness screens show the empty state (“No sleep data in the last 7 days” / “No readiness data in the last 7 days”) even though staging has Oura data in `users/{uid}/ouraVendorSleep` and `users/{uid}/ouraVendorReadiness`.

**Conclusion:** The app treats **HTTP 404** from the API as “missing” and shows the empty state. So the backend that the app calls is returning 404 (no document found for the requested day, 7-day fallback, and previously no further fallback).

**Root cause (one of):**

1. **App not hitting the backend that has the data**  
   `EXPO_PUBLIC_BACKEND_BASE_URL` may point at local, production, or another env. If that API’s Firestore has no Oura docs for the logged-in user, the view routes return 404.

2. **Different user**  
   Staging data may be under user A; the app may be logged in as user B. The API uses the auth token’s UID and reads `users/{uid}/ouraVendorSleep` and `users/{uid}/ouraVendorReadiness`, so a different UID means no docs.

3. **No doc in requested/fallback window**  
   The app sends `day = today` (UTC). The backend tried exact match, then a 7-day lookback. If all stored docs were older than 7 days (or day format mismatch), both could return nothing and the API would return 404.

**Fix applied:** Add a **last-resort fallback** on the backend: when both exact and 7-day fallback return no doc, query the collection for the single most recent doc by `orderBy("day", "desc").limit(1)`. If found, return it with `isFallback: true` and `resolvedDay` from that doc. So if the collection has any document, the API returns 200 and the screens can show data. This does not change the mobile read path (still hooks → API only).

---

## 2. Full read path (end-to-end)

| Layer | Component | Location | Behavior |
|-------|-----------|----------|----------|
| Screen | Sleep / Readiness | `app/(app)/recovery/sleep.tsx`, `readiness.tsx` | Call `useSleepView(day)` / `useReadinessView(day)` with `day = toTodayYmd()` (today UTC). No Firebase. |
| Hook | useSleepView / useReadinessView | `lib/data/useSleepView.ts`, `useReadinessView.ts` | On mount and when `day`/`user` change: get token, call `getOuraSleepView(day, token)` / `getOuraReadinessView(day, token)`, map result with `truthOutcomeFromApiResult(res)`. |
| API client | getOuraSleepView / getOuraReadinessView | `lib/api/usersMe.ts` | GET `/users/me/oura-sleep-view?day=...` / `/users/me/oura-readiness-view?day=...` with Bearer token. Uses `EXPO_PUBLIC_BACKEND_BASE_URL`. Validates response with `sleepViewDtoSchema` / `readinessViewDtoSchema`. |
| Outcome | truthOutcomeFromApiResult | `lib/data/truthOutcome.ts` | 200 + valid body → `ready`; 404 → `missing`; else → `error`. |
| Backend route | GET /users/me/oura-sleep-view, oura-readiness-view | `services/api/src/routes/usersMe.ts` | Auth → parse `day` → query `users/{uid}/ouraVendorSleep` or `ouraVendorReadiness`: (1) exact `day == requestedDay`, (2) 7-day fallback `day >= requestedDay-7` and `day <= requestedDay` orderBy day desc, (3) **new** last-resort `orderBy("day", "desc").limit(1)`. 404 only if all three return no doc. Build view DTO from doc, validate with schema, return 200. |
| Firestore | users/{uid}/ouraVendorSleep, ouraVendorReadiness | — | Written by `writeOuraVendorSleepSnapshots` / `writeOuraVendorReadinessSnapshots` from Oura pull/backfill. Each doc has `day` (YYYY-MM-DD), `score`, `contributors`, etc. |

**Normalized source:** The app does **not** read from normalized facts (e.g. dailyFacts, healthScores). It only reads from the Oura vendor snapshot endpoints above; the only “source” is the backend’s Firestore collections `ouraVendorSleep` / `ouraVendorReadiness`.

---

## 3. Exact files changed

| File | Change |
|------|--------|
| `services/api/src/routes/usersMe.ts` | For both `GET /oura-sleep-view` and `GET /oura-readiness-view`: after the 7-day fallback returns no doc, add a last-resort query `orderBy("day", "desc").limit(1)` on the same collection; if a doc is found, use it and return 200 with `isFallback: true` and `resolvedDay` from the doc. 404 only when all three queries return no doc. |
| `services/api/src/routes/__tests__/usersMe.ouraView.test.ts` | (1) 404 tests: add `orderBy() -> limit() -> get()` returning empty docs so last-resort also returns empty. (2) New test: “oura-sleep-view returns 200 from last-resort when exact and 7-day fallback both empty” (mock returns one doc only from last-resort). |

No mobile app code changed; the fix is entirely in the API.

---

## 4. How the corrected read path works

1. User opens Sleep or Readiness; screen calls `useSleepView(day)` or `useReadinessView(day)` with `day = toTodayYmd()`.
2. Hook calls `getOuraSleepView(day, token)` or `getOuraReadinessView(day, token)` → GET `/users/me/oura-sleep-view?day=YYYY-MM-DD` (or readiness) against `EXPO_PUBLIC_BACKEND_BASE_URL`.
3. Backend resolves UID from auth, parses `day`, then:
   - Tries exact: `ouraVendorSleep` (or Readiness) where `day == requestedDay`; if a doc exists, uses it.
   - Else tries 7-day fallback: `day >= requestedDay - 7` and `day <= requestedDay`, orderBy `day` desc, limit 1; if a doc exists, uses it.
   - **New:** Else tries last-resort: orderBy `day` desc, limit 1 (no day filter); if a doc exists, uses it with `isFallback: true`.
   - If still no doc, returns 404.
4. On 200, backend builds the view (requestedDay, resolvedDay, isFallback, score, contributors, etc.), validates with DTO schema, returns JSON.
5. Client validates with the same schema; on success, hook sets `status: "ready", data: parsed`. Screen renders score hero and contributor list. On 404, hook sets `status: "missing"` and the screen shows the empty state.

Empty state should only appear when there is truly no document in the collection for that user (or the app is not talking to the backend that has the data).

---

## 5. Acceptance checklist

- [ ] Backend deployed with last-resort fallback (both oura-sleep-view and oura-readiness-view).
- [ ] `EXPO_PUBLIC_BACKEND_BASE_URL` points to that backend (e.g. staging) when testing.
- [ ] Logged-in user is the same UID that has Oura vendor docs in staging.
- [ ] Sleep screen shows score and contributors (Total sleep, Efficiency, Restfulness, REM sleep, Deep sleep, Latency, Timing) when the API returns 200.
- [ ] Readiness screen shows score and contributors (Resting heart rate, HRV balance, Body temperature, Recovery index, Sleep, Sleep balance, Sleep regularity, Previous day activity, Activity balance) when the API returns 200.
- [ ] Loading and error states still work; empty state only when API returns 404 (no doc in collection after all fallbacks).

---

## 6. Run these checks

```bash
# Typecheck and lint
npm run typecheck
npm run lint

# API unit tests (from repo root; may require Firestore emulator)
npm run test -- --testPathPattern="usersMe.ouraView"

# Or run API tests from services/api (Jest only)
cd services/api && npx jest --testPathPattern="usersMe.ouraView"
```

After deploying the API change, verify in the app: open Recovery → Sleep and Readiness; confirm score and contributors appear when staging has Oura data for the logged-in user.
