# Integration Data Truth Audit

## A. Repo entrypoint discovery

### Oura OAuth connect/callback

| File | Responsibility | Relevant code / participation |
|------|----------------|--------------------------------|
| `services/api/src/routes/integrations.ts` | OAuth connect URL, callback handler, token exchange, integration doc write, fire-and-forget sync/backfill | `GET /oura/connect`, `GET /integrations/oura/callback` (exported `handleOuraCallback`). Callback: token exchange → `userCollection(uid, "integrations").doc("oura").set({ connected: true, connectedAt, lastSyncAt: null, ... })`; then `void performOuraPullNowCore(uid, rid).catch(...)` and `void triggerOuraBackfill(uid, rid).catch(...)`. |
| `services/api/src/index.ts` | Mounts callback (public) and auth-protected Oura routes | `app.get("/integrations/oura/callback", ...)`; `app.use("/integrations/oura/pull-now", authMiddleware, ouraPullNowRouter)`. |

**Exact callback snippet (sync + backfill):**

```ts
// integrations.ts (lines 828–844)
res.redirect(302, completionUrl);
void performOuraPullNowCore(uid, rid).catch((err: unknown) =>
  logger.error({ msg: "oura_callback_auto_sync_error", rid, uid, err: ... }),
);
void triggerOuraBackfill(uid, rid).catch((err: unknown) =>
  logger.error({ msg: "oura_callback_backfill_error", rid, uid, err: ... }),
);
```

### Oura sync jobs

| File | Responsibility | Relevant code |
|------|----------------|---------------|
| `services/api/src/routes/integrations/ouraPullNow.ts` | Core sync: fetch sleep/readiness, write raw events, write vendor snapshots (best-effort), update lastSyncAt | `performOuraPullNowCore(uid, requestId)`: `writeOuraRawEvents(...)` then try/catch `writeOuraVendorSleepSnapshots`, `writeOuraVendorReadinessSnapshots` then `userCollection(uid, "integrations").doc("oura").set({ lastSyncAt: FieldValue.serverTimestamp() }, { merge: true })`. |
| `services/api/src/routes/ouraPull.ts` | Invoker-only batch: for each connected UID call `performOuraPullNowCore` | `getConnectedOuraUids()` from `ouraConnectedRegistryCollection()`; for each uid `performOuraPullNowCore(uid, requestId)`. |
| `services/functions/src/oura/onOuraPullScheduled.ts` | Scheduled trigger every 15 minutes | `onSchedule({ schedule: "every 15 minutes", ... })`; POST `${baseUrl}/integrations/oura/pull` with getIdTokenClient. |

### Oura backfill

| File | Responsibility | Relevant code |
|------|----------------|---------------|
| `services/api/src/routes/integrations/ouraPullNow.ts` | Backfill 90 days in chunks of 30; writes raw events + vendor snapshots; does not update lastSyncAt | `triggerOuraBackfill(uid, requestId)`: loop `offsetEnd = 90, 60, 30`; per chunk `fetchOuraSleep`, `fetchOuraDailyReadiness` → `writeOuraRawEvents` → `writeOuraVendorSleepSnapshots`, `writeOuraVendorReadinessSnapshots`; chunk errors logged with `msg: "oura_backfill_chunk_error"`. |
| `services/api/src/routes/integrations.ts` | Invokes backfill after callback (fire-and-forget) | See callback snippet above. |

**Backfill chunk ranges (PROVEN FROM CODE):**

```ts
// ouraPullNow.ts
const BACKFILL_TOTAL_DAYS = 90;
const BACKFILL_CHUNK_DAYS = 30;
// ...
for (let offsetEnd = BACKFILL_TOTAL_DAYS; offsetEnd > 0; offsetEnd -= BACKFILL_CHUNK_DAYS) {
  const offsetStart = Math.max(0, offsetEnd - BACKFILL_CHUNK_DAYS);
  const startStr = dayMinus(today, offsetEnd);
  const endStr = dayMinus(today, offsetStart);
  // Chunks: 90→60, 60→30, 30→0 days ago.
```

### Oura sleep/readiness ingestion (raw events)

| File | Responsibility | Relevant code |
|------|----------------|---------------|
| `services/api/src/lib/ouraIngestWrite.ts` | Writes Oura sleep/HRV/steps/workout/raw to `users/{uid}/rawEvents` | `writeOuraRawEvents(uid, sleepItems, hrvItems, requestId, { stepsItems, workoutItems, ouraRawItems })`. |
| `services/api/src/lib/ouraApi.ts` | Fetch Oura API v2 sleep + daily_readiness; map to ingest items | `fetchOuraSleep`, `fetchOuraDailyReadiness`; `mapOuraSleepToIngestItem`, `mapOuraReadinessToHrvItem`. |

### Oura vendor snapshot writes

| File | Responsibility | Relevant code |
|------|----------------|---------------|
| `services/api/src/lib/ouraVendorSnapshot.ts` | Write to `ouraVendorSleep` and `ouraVendorReadiness` | `writeOuraVendorSleepSnapshots(uid, docs, requestId)` → `userCollection(uid, "ouraVendorSleep").doc(snapshot.id).set(snapshot, { merge: true })`; same for readiness. Day: sleep from `toYmd(bed_time ?? end_time)`; readiness from `doc.day ?? toYmd(doc.timestamp)`. Per-doc try/catch; logs `oura_vendor_sleep_snapshot_write_error` / `oura_vendor_readiness_snapshot_write_error`. |

### Oura sleep/readiness read APIs

| File | Responsibility | Relevant code |
|------|----------------|---------------|
| `services/api/src/routes/usersMe.ts` | GET sleep/readiness view from vendor snapshots | `GET /oura-sleep-view`, `GET /oura-readiness-view` (router mounted under `/users/me`). Query `userCollection(uid, "ouraVendorSleep")` / `ouraVendorReadiness` with `day`; fallback last 7 days `orderBy("day", "desc").limit(1)`; 404 if no doc. |
| `lib/api/usersMe.ts` | Client: get Oura sleep/readiness view | `getOuraSleepView(day, idToken)` → `GET /users/me/oura-sleep-view?day=`; `getOuraReadinessView(day, idToken)` → `GET /users/me/oura-readiness-view?day=`. |

### Device settings / detail screen

| File | Responsibility | Relevant code |
|------|----------------|---------------|
| `app/(app)/settings/devices/[deviceId].tsx` | Single device detail for Withings, Apple Health, Oura | Oura: `useOuraPresence()`; "On" when `ouraPresence.data.connected`; "Last sync" from `ouraPresence.data.lastSyncAt` → `Last sync: {new Date(ouraPresence.data.lastSyncAt).toLocaleString()}`. |
| `app/(app)/settings/devices.tsx` | Devices list; foreground/focus auto Oura sync | `useOuraPresence()`; `maybeAutoOuraPullNow("focus")` on useFocusEffect, `maybeAutoOuraPullNow("foreground")` on AppState active; throttle `OURA_AUTO_MIN_MS = 15 * 60 * 1000`; `postOuraPullNow(token, { idempotencyKey })`. |

### Sleep and Readiness screens/hooks

| File | Responsibility | Relevant code |
|------|----------------|---------------|
| `app/(app)/recovery/sleep.tsx` | Sleep screen | `day = useMemo(() => toTodayYmd(), [])` (today UTC); `useSleepView(day)`; empty state when `sleepState.status === "missing"` → "No sleep data in the last 7 days". |
| `app/(app)/recovery/readiness.tsx` | Readiness screen | Same pattern with `useReadinessView(day)`. |
| `lib/data/useSleepView.ts` | Hook: fetch sleep view, map to state | `getOuraSleepView(dayRef.current, token)`; `truthOutcomeFromApiResult(res)` → 404 ⇒ `status: "missing"`. |
| `lib/data/useReadinessView.ts` | Hook: fetch readiness view | Same with `getOuraReadinessView`. |
| `lib/data/useOuraPresence.ts` | Hook: Oura connected + lastSyncAt | `getOuraStatus(token)` → GET `/integrations/oura/status`; exposes `connected`, `lastSyncAt`. |

### Apple Health sync label

| File | Responsibility | Relevant code |
|------|----------------|---------------|
| `app/(app)/settings/devices/[deviceId].tsx` | Renders "Last new Apple Health data" | `appleLastSyncAt` from `getAppleHealthStatus(token)`; label: `Last new Apple Health data: {new Date(appleLastSyncAt).toLocaleString()}`. |
| `services/api/src/routes/integrations/appleHealthStatus.ts` | Returns connected + lastSyncAt | Query `userCollection(uid, "rawEvents").where("provider", "==", "apple_health").orderBy("receivedAt", "desc").limit(1)`; `lastSyncAt` = that doc’s `receivedAt`. |

### Withings sync label

| File | Responsibility | Relevant code |
|------|----------------|---------------|
| `app/(app)/settings/devices/[deviceId].tsx` | Renders "Last measurement" | `withingsPresence.data.lastMeasurementAt`; `Last measurement: {new Date(withingsPresence.data.lastMeasurementAt).toLocaleString()}`. |
| `lib/data/useWithingsPresence.ts` | Computes lastMeasurementAt from raw events | After `getWithingsStatus`, if connected calls `getRawEvents` with `kinds: ["weight"]`, filters `sourceId === "withings"`; `lastMeasurementAt` = latest of those `observedAt`. |

---

## H. Firestore path & schema audit

- **users/{uid}/rawEvents:** Built via `userCollection(uid, "rawEvents")` in `services/api/src/db.ts` (`userDoc(uid).collection(name)` → `db.collection("users").doc(uid).collection("rawEvents")`). Write path: `ouraIngestWrite.ts` uses same `userCollection(uid, "rawEvents")`. **PROVEN FROM CODE** — read and write paths match.
- **users/{uid}/ouraVendorSleep:** Only as collection name string `"ouraVendorSleep"` passed to `userCollection(uid, "ouraVendorSleep")`. No separate constant; same helper for read (usersMe) and write (ouraVendorSnapshot). **PROVEN FROM CODE** — paths match.
- **users/{uid}/ouraVendorReadiness:** Same as above. **PROVEN FROM CODE.**
- **Device/source metadata:** Oura integration doc at `users/{uid}/integrations/oura` (via `userCollection(uid, "integrations").doc("oura")`). No `/sources`, `/devices`, `/connections` used for Oura in code. **PROVEN FROM CODE.**
- **UID:** All routes use `req.uid` (auth) or callback-validated `uid`; no evidence of emulator/prod path difference or competing paths. **PROVEN FROM CODE.**

---

## I. Raw event / canonical mapping audit

- **mapRawEventToCanonical** (`services/functions/src/normalization/mapRawEventToCanonical.ts`): Handles `kind === "sleep"` and `kind === "hrv"`; uses `parseManualPayload` and `mapManualSleep` / `mapManualHrv`. Oura raw events are written with kind `sleep` and `hrv` (from ouraApi map functions); normalization runs in Cloud Functions trigger `onRawEventCreated` when a raw event is created. **PROVEN FROM CODE.**
- **Sleep/HRV mapping:** Sleep and HRV raw events (including from Oura) are mapped to canonical; `oura_raw` is memory-only (no canonical output). **PROVEN FROM CODE.**
- **Screen layer:** Sleep and Readiness screens call only `getOuraSleepView` / `getOuraReadinessView`; they read **vendor snapshots only**. They do **not** read canonical `users/{uid}/events` for display. So canonical data can exist even if vendor snapshots don’t; screens ignore canonical for these views. **PROVEN FROM CODE.**

---

## J. Fallback query logic audit

- **Implementation:** In `usersMe.ts`, `OURA_VIEW_FALLBACK_DAYS = 7`. After exact match on `day`, fallback: `fallbackStart = dayMinus(requestedDay, 7)`; query `userCollection(uid, "ouraVendorSleep").where("day", ">=", fallbackStart).where("day", "<=", requestedDay).orderBy("day", "desc").limit(1)`. Same for readiness. **PROVEN FROM CODE.**
- **orderBy:** Written snapshot docs include `day` (string YYYY-MM-DD). Query uses `orderBy("day", "desc")`. **PROVEN FROM CODE.**
- **Index:** `services/functions/firestore.indexes.json` has no index for `ouraVendorSleep` or `ouraVendorReadiness`. Inequality on `day` + orderBy("day", "desc") may require a composite index in Firestore. **PROVEN FROM CODE.** If index missing and collection has docs, query could throw (500); if collection empty, result is empty and 404 is correct. **UNKNOWN / NEEDS VERIFICATION** whether index is auto-created or ever fails.
- **Missing `day`:** If a doc had no `day` field, it would not match the equality or range; would not be returned. **PROVEN FROM CODE.**
- **Error handling:** No try/catch around the fallback query in usersMe; if Firestore throws (e.g. index), asyncHandler will propagate 500. Empty result is handled (no doc → 404). **PROVEN FROM CODE.**

---

## End-to-end trace

### Oura device screen

- **Connection status:** From `useOuraPresence()` → GET `/integrations/oura/status` → reads `users/{uid}/integrations/oura`; `connected: Boolean(data.connected)`. **PROVEN FROM CODE.**
- **Sync label text:** Literal "Last sync: " plus formatted `ouraPresence.data.lastSyncAt`. **PROVEN FROM CODE.**
- **Sync timestamp source:** Response field `lastSyncAt` from GET `/integrations/oura/status`, which reads `users/{uid}/integrations/oura`.lastSyncAt (converted to ISO string). **PROVEN FROM CODE.**
- **Semantic meaning of timestamp:** It is the **last time `performOuraPullNowCore` completed successfully through to the integration doc update** — i.e. after raw events write and after the **best-effort** vendor snapshot try/catch (which only logs on error). It is **not** "last new data imported" and **not** "last time vendor snapshots were written." **PROVEN FROM CODE.**

**Who writes the field:** In `performOuraPullNowCore` (ouraPullNow.ts):

```ts
const integrationRef = userCollection(uid, "integrations").doc("oura");
await integrationRef.set(
  { lastSyncAt: FieldValue.serverTimestamp() },
  { merge: true },
);
```

This runs **after** the snapshot write block that catches and logs errors without rethrowing. So **the UI can show a recent "Last sync" even when zero vendor snapshot docs exist.** **PROVEN FROM CODE.**

### Sleep screen

- **Path:** Screen → `useSleepView(day)` → `getOuraSleepView(day, token)` → GET `/users/me/oura-sleep-view?day=YYYY-MM-DD` → backend `requireUid(req, res)`, `parseDay(req, res)` → query `userCollection(uid, "ouraVendorSleep").where("day", "==", requestedDay).limit(1)`; if no doc, fallback `dayMinus(requestedDay, 7)` then `.where("day", ">=", fallbackStart).where("day", "<=", requestedDay).orderBy("day", "desc").limit(1)`; if still no doc → 404. **PROVEN FROM CODE.**
- **Auth/user:** `requireUid` from `req.uid` (auth middleware). **PROVEN FROM CODE.**
- **Collection:** `users/{uid}/ouraVendorSleep`. **PROVEN FROM CODE.**
- **Filters/orderBy/limit:** Exact: `day == requestedDay`, limit 1. Fallback: `day >= fallbackStart`, `day <= requestedDay`, `orderBy("day", "desc")`, limit 1. **PROVEN FROM CODE.**
- **Day field:** Query uses `day` (YYYY-MM-DD from `dayQuerySchema`). Screen passes `toTodayYmd()` = `new Date().toISOString().slice(0, 10)`. **PROVEN FROM CODE.**
- **Fallback:** Last 7 days, then most recent day in that window. **PROVEN FROM CODE.**
- **Empty state:** 404 → client `truthOutcomeFromApiResult` → `status: "missing"` → "No sleep data in the last 7 days". **PROVEN FROM CODE.**
- **Data source:** Vendor snapshots only; **no canonical fallback** — screen does not read `users/{uid}/events` or rawEvents for display. **PROVEN FROM CODE.**

### Readiness screen

- Same as Sleep: `useReadinessView(day)` → GET `/users/me/oura-readiness-view?day=` → `userCollection(uid, "ouraVendorReadiness")`, same exact + 7-day fallback, 404 → "missing" → "No readiness data in the last 7 days". Vendor snapshots only; no canonical fallback. **PROVEN FROM CODE.**

### Vendor snapshot write path

- **Writers:** `writeOuraVendorSleepSnapshots` and `writeOuraVendorReadinessSnapshots` in `services/api/src/lib/ouraVendorSnapshot.ts`. **PROVEN FROM CODE.**
- **Trigger sources:** (1) `performOuraPullNowCore` (callback auto-sync, POST pull-now, scheduled pull); (2) `triggerOuraBackfill` (callback only, fire-and-forget). **PROVEN FROM CODE.**
- **Document ID:** Sleep: `doc.id ?? \`oura_sleep_${start ?? doc.end_time}\``; Readiness: `doc.id ?? \`oura_readiness_${day}\``. **PROVEN FROM CODE.**
- **Stored fields:** Include `id`, `day`, `score`, `contributors`, `source`, `fetchedAt`, `updatedAt`; sleep also optional totalSleepDuration, efficiency, latency, restfulSleep, remSleep, deepSleep. **PROVEN FROM CODE.**
- **Day computation:** Sleep: `toYmd(bed_time ?? end_time)` (ISO slice 0–10); Readiness: `doc.day ?? toYmd(doc.timestamp)`. **PROVEN FROM CODE.**
- **Errors:** Per-doc try/catch; log only, no rethrow. Outer call in pull-now is try/catch with `logger.info("oura_vendor_snapshots_error")`. **PROVEN FROM CODE.**
- **Today’s docs after successful sync:** Only if Oura API returns sleep/readiness for that day and snapshot writes succeed. **LIKELY FROM CODE + EVIDENCE:** If snapshot writes throw or Oura returns empty, no docs. **PROVEN FROM CODE:** Backfill writes 30→0 (including recent days); pull-now window is last 30 days, so today can be included. **PROVEN FROM CODE.**
- **Day format mismatch:** Writer uses `iso.slice(0, 10)`; read uses `dayQuerySchema` (YYYY-MM-DD). Mismatch possible only if Oura sent non-ISO. **UNKNOWN / NEEDS VERIFICATION** without live payloads.

### Backfill + autosync path

- **Backfill:** Called only from Oura callback as fire-and-forget; not awaited; failures logged (`oura_callback_backfill_error`). Chunk errors logged as `oura_backfill_chunk_error`; no retry; idempotent writes. **PROVEN FROM CODE.**
- **Foreground sync:** `devices.tsx` → `maybeAutoOuraPullNow("foreground")` when AppState active; throttled 15 min; calls `postOuraPullNow` → same `performOuraPullNowCore`; writes vendor snapshots (best-effort) and updates lastSyncAt. **PROVEN FROM CODE.**
- **Scheduled sync:** `onOuraPullScheduled` every 15 minutes → POST `/integrations/oura/pull` → for each connected UID `performOuraPullNowCore`; same pipeline, writes snapshots + lastSyncAt. **PROVEN FROM CODE.**
- **Partial sync and "recently synced":** If core completes (raw events written, snapshot try/catch run, lastSyncAt updated), device shows recent sync even if snapshot writes failed or Oura returned empty. **PROVEN FROM CODE.**

---

## Failure modes

| Failure mode | Status | Evidence | Affected layers | User impact |
|-------------|--------|----------|-----------------|-------------|
| lastSyncAt updated without any vendor snapshot written | **PROVEN FROM CODE** | lastSyncAt write is after snapshot try/catch that only logs; no condition on snapshot success | Device UI, trust | "Last sync" recent but Sleep/Readiness empty |
| Snapshot writes fail silently (per-doc or batch) | **PROVEN FROM CODE** | ouraVendorSnapshot.ts per-doc try/catch; ouraPullNow.ts outer catch logs `oura_vendor_snapshots_error` | ouraVendorSleep, ouraVendorReadiness | No docs for read endpoints → 404 → empty screens |
| Snapshot docs never written (Oura returns empty) | **LIKELY FROM CODE + EVIDENCE** | Pull uses same core; if fetch returns [] for sleep/readiness, snapshot writers get [] and write nothing | Same | Same |
| Backfill never runs or fails silently | **PROVEN FROM CODE** | Backfill only from callback; fire-and-forget; chunk errors only `logger.info` | Historical 7-day fallback | No historical docs for fallback |
| Screen reads wrong collection/path | **UNKNOWN** | Read and write both use `userCollection(uid, "ouraVendorSleep")` / `ouraVendorReadiness`; db.ts builds users/{uid}/{name} | — | — |
| UID mismatch | **UNKNOWN** | Same uid from auth and callback; no evidence of mismatch | — | — |
| Snapshot day missing or wrong format | **UNKNOWN / NEEDS VERIFICATION** | Writer uses ISO slice; Oura API format not verified in repo | Read query could miss docs | Possible if Oura sends non-ISO |
| Fallback query incorrect or index missing | **LIKELY FROM CODE** | Fallback uses orderBy("day", "desc"); firestore.indexes.json has no ouraVendor* index; single-field inequality + orderBy may need index | usersMe read route | Empty if index required and missing; 500 possible |
| Sync metadata updated on partial success | **PROVEN FROM CODE** | lastSyncAt updated after best-effort snapshots; partial = "raw events ok, snapshots failed" still updates lastSyncAt | Device UI | Same as first row |
| Endpoint returns empty due to auth bug | **UNKNOWN** | requireUid(req); no evidence of wrong user | — | — |
| Hook/screen wrong endpoint or response field | **UNKNOWN** | Hooks call correct URLs; 404 → missing mapped in truthOutcome | — | — |

---

## Sync timestamp audit

### Oura

- **Field shown:** `lastSyncAt` from GET `/integrations/oura/status` (backing doc: `users/{uid}/integrations/oura`).
- **Who writes:** `performOuraPullNowCore` only (not backfill): `integrationRef.set({ lastSyncAt: FieldValue.serverTimestamp() }, { merge: true })`.
- **Meaning:** Last successful completion of the pull-now core (after raw events and after best-effort snapshot block). **Not** "last new data imported"; **not** "last time sleep/readiness docs were written."
- **Label:** "Last sync" is misleading when snapshot writes fail or Oura returns no data; user infers data is available. **PROVEN FROM CODE.**

### Apple Health

- **Field shown:** "Last new Apple Health data" = `appleLastSyncAt` from GET `/integrations/apple-health/status`.
- **Who writes:** Not a single writer; value is **derived on read**: most recent `rawEvents` doc with `provider === "apple_health"` by `receivedAt`. So it is "latest imported raw event receivedAt."
- **Meaning:** Last time we received Apple Health data. Label is accurate. **PROVEN FROM CODE.**

### Withings

- **Field shown:** "Last measurement" = `withingsPresence.data.lastMeasurementAt`.
- **Who writes:** Not stored; **computed** in `useWithingsPresence`: after status, fetch raw events (kind weight), filter `sourceId === "withings"`, take max `observedAt`.
- **Meaning:** Timestamp of most recent Withings weight event. Label is accurate. **PROVEN FROM CODE.**

---

## Autosync UX audit

- **Does the current UX ever imply freshness without proving data availability?**  
  **Yes.** Oura device shows "Last sync" (recent) which users reasonably interpret as "my data has been synced and is available." Code can update that timestamp without writing any vendor snapshot docs. **PROVEN FROM CODE.**

- **Where can trust break?**  
  (1) Device detail: "Last sync" vs actual presence of docs in ouraVendorSleep/ouraVendorReadiness. (2) Empty Sleep/Readiness copy ("No sleep/readiness data in the last 7 days") without explaining that "Last sync" means "last refresh run," not "last day with data." **LIKELY FROM CODE + EVIDENCE.**

- **What wording changes are warranted?**  
  (1) Rename or qualify Oura "Last sync" (e.g. "Last refresh" or "Last sync run") and/or add one line that Sleep/Readiness show data when we have it for the day. (2) Empty state: add that if they just connected, they can wait and refresh or open Oura app. **PROPOSAL.**

---

## Firestore verification checklist

- **Oura integration (connection + lastSyncAt)**  
  - Path: `users/{uid}/integrations/oura`  
  - Fields: `connected`, `lastSyncAt`, `connectedAt`, `revoked`, `failureState`  
  - Check: Is `lastSyncAt` recent? Are there any docs in ouraVendorSleep/ouraVendorReadiness for the same uid?

- **Oura vendor sleep snapshots**  
  - Path: `users/{uid}/ouraVendorSleep`  
  - Fields: `day` (YYYY-MM-DD), `id`, `score`, `contributors`, `fetchedAt`, etc.  
  - Check: Any docs? What is the latest `day`? Does it fall in the last 7 days?

- **Oura vendor readiness snapshots**  
  - Path: `users/{uid}/ouraVendorReadiness`  
  - Same checks as sleep.

- **Raw events (Oura)**  
  - Path: `users/{uid}/rawEvents`  
  - Filter: by sourceId or provider for Oura if needed.  
  - Check: Are sleep/hrv raw events present for recent days?

- **Registry (scheduled pull)**  
  - Path: `system/integrations/oura_connected/{uid}`  
  - Fields: `connected`, `updatedAt`  
  - Check: Is uid present when expecting scheduled sync?

---

## Logs verification checklist

- **Sync attempt / fetch:**  
  - `oura_pull_now_no_refresh_token`, `oura_pull_now_misconfig`, `oura_pull_now_token_refresh_failed`, `oura_pull_now_fetch_failed` — prove token/fetch failure.  
  - No explicit "records fetched count" in repo for Oura; would need to add to prove empty response.

- **Vendor snapshot writes:**  
  - `oura_vendor_snapshots_error` — batch snapshot failure in pull-now.  
  - `oura_vendor_sleep_snapshot_write_error`, `oura_vendor_readiness_snapshot_write_error` — per-doc write failure.  
  - No "snapshot write success" or "records written count" in repo.

- **Canonical / raw:**  
  - Raw events written in `writeOuraRawEvents`; no dedicated Oura "canonical write" log in API; normalization is in functions (onRawEventCreated).

- **Backfill:**  
  - `oura_backfill_skipped_no_token`, `oura_backfill_skipped_misconfig`, `oura_backfill_token_failed` — backfill did not run or failed early.  
  - `oura_backfill_chunk_done` — chunk succeeded (startStr, endStr).  
  - `oura_backfill_chunk_error` — chunk failed (err, startStr, endStr).  
  - `oura_callback_backfill_error` — backfill promise rejected.

- **Sync metadata:**  
  - `oura_pull_now_metadata_error` — lastSyncAt write failed (core returns 500).

- **Read endpoints:**  
  - No specific log for "oura-sleep-view 404" or "oura-readiness-view 404"; would need API/gateway access logs to confirm 404.

---

## Root cause ranking

1. **lastSyncAt updates even when no vendor snapshots are written (sync semantics)**  
   **Evidence:** Code updates lastSyncAt after a try/catch that swallows snapshot errors. Device shows "Last sync" from that field; screens read only vendor snapshots. **PROVEN FROM CODE.**  
   **Rank:** Most likely cause of "connected + recent sync but screens empty."

2. **Vendor snapshot writes failing or Oura returning empty for window**  
   **Evidence:** Snapshots are best-effort; per-doc and batch errors only logged. If Oura returns [] or writes throw, zero docs. **PROVEN FROM CODE.**  
   **Rank:** Second; would need logs/Firestore to confirm.

3. **Backfill not running or failing silently**  
   **Evidence:** Backfill only from callback; fire-and-forget; chunk errors only info logs. If backfill never ran or all chunks failed, no historical docs for 7-day fallback. **PROVEN FROM CODE.**  
   **Rank:** Third; explains missing historical fallback.

4. **Fallback query or index**  
   **Evidence:** Fallback uses orderBy("day", "desc"); no index in repo for ouraVendor*. If collection empty, 404 is correct; if index missing when docs exist, could see 500. **UNKNOWN / NEEDS VERIFICATION.**  
   **Rank:** Lower unless logs show index errors.

5. **Day format / timezone mismatch**  
   **Evidence:** Writer uses ISO slice; client uses UTC today. Theoretically possible if Oura sends non-UTC or non-ISO. **UNKNOWN / NEEDS VERIFICATION.**  
   **Rank:** Lower.

---

## Minimal fix plan

### Fix now

1. **Tie lastSyncAt to snapshot availability (or rename and clarify)**  
   - **Option A:** Update `lastSyncAt` only when at least one vendor snapshot (sleep or readiness) was successfully written in that run (e.g. run snapshot writes, then set lastSyncAt only if no throw or if written count > 0).  
   - **Option B:** Keep current behavior; rename device label to "Last refresh" or "Last sync run" and add one line: "Sleep and Readiness show data when we have it for the day."

2. **Make snapshot failures visible**  
   - In `ouraPullNow.ts`, treat the snapshot block failure as worth at least `logger.warn` (or `logger.error`) and consider writing a failure entry to `users/{uid}/failures` when the entire snapshot batch fails, so "sync succeeded but no snapshots" is observable.

3. **Backfill observability**  
   - Log backfill chunk errors with `logger.warn`; optionally write a failure entry per failed chunk so support can see backfill failures.

### Verify after fix

- In Firestore for a test user: run sync, confirm `lastSyncAt` is recent only when at least one of `ouraVendorSleep` / `ouraVendorReadiness` has a doc in last 7 days (if Option A).  
- Confirm Sleep/Readiness screens show data when such docs exist for requested or fallback day.  
- Confirm device label and copy match implemented semantics.

### UX trust improvements

- Implement the chosen label/copy change (Option A or B above).  
- Empty state: add line such as "If you just connected Oura, wait a few minutes and pull to refresh, or open the Oura app to trigger an update."

### Logging improvements

- Add a log when vendor snapshot batch writes at least one doc (e.g. "oura_vendor_snapshots_written" with counts or "none").  
- Ensure backfill chunk failure is at least warn level with chunk range and error message.  
- Optional: log 404 for oura-sleep-view/oura-readiness-view with requestedDay and uid (if privacy allows) to correlate with "no data" reports.
