# Oura Sleep/Readiness Missing Data Audit

## 1. End-to-end trace

### A. Oura device detail

1. **Which file renders the Oura device detail screen?**  
   **PROVEN FROM CODE:** `app/(app)/settings/devices/[deviceId].tsx`. When `deviceId === "oura"`, the same component renders the Oura device detail (title "Oura", toggle, copy, sync status).

2. **What data source populates the "On" state?**  
   **PROVEN FROM CODE:** `useOuraPresence()` from `lib/data/useOuraPresence.ts`. "On" is shown when `ouraPresence.status === "ready" && ouraPresence.data.connected`. Connected comes from GET `/integrations/oura/status`.

3. **What data source populates "Last sync"?**  
   **PROVEN FROM CODE:** Same hook: `ouraPresence.data.lastSyncAt`. That value is returned by GET `/integrations/oura/status`.

4. **Which exact field is shown as "Last sync"?**  
   **PROVEN FROM CODE:** The label is the literal string `"Last sync: "` plus `new Date(ouraPresence.data.lastSyncAt).toLocaleString()`. The backing field is `lastSyncAt` from the status API response.

5. **Where is that field written in backend code?**  
   **PROVEN FROM CODE:**  
   - **Written in:** `services/api/src/routes/integrations/ouraPullNow.ts` inside `performOuraPullNowCore`, after raw events and after (best-effort) vendor snapshot writes:
     - `userCollection(uid, "integrations").doc("oura").set({ lastSyncAt: FieldValue.serverTimestamp() }, { merge: true })` (lines 352–355).
   - **Read in:** `services/api/src/routes/integrations.ts` GET `/oura/status` (lines 597–656): reads `users/{uid}/integrations/oura` and returns `data.lastSyncAt` as ISO string.

6. **Does that field mean last successful sync attempt, last successful canonical sync, last successful snapshot sync, or something else?**  
   **PROVEN FROM CODE:** It means **last time `performOuraPullNowCore` completed successfully through to the `lastSyncAt` write**. Specifically:
   - It is updated **after** `writeOuraRawEvents` and **after** the try/catch that calls `writeOuraVendorSleepSnapshots` and `writeOuraVendorReadinessSnapshots`.
   - If snapshot writes throw, the catch only logs (`logger.info`, "oura_vendor_snapshots_error") and does **not** rethrow. Execution then proceeds to update `lastSyncAt`.
   - So **lastSyncAt can be recent even when zero vendor snapshot docs were written** (e.g. snapshot writes failed or Oura returned empty sleep/readiness).

---

### B. Sleep and Readiness screens

1. **Which files render the screens?**  
   **PROVEN FROM CODE:**  
   - Sleep: `app/(app)/recovery/sleep.tsx`  
   - Readiness: `app/(app)/recovery/readiness.tsx`

2. **Which hooks/data contracts do they use?**  
   **PROVEN FROM CODE:**  
   - Sleep: `useSleepView(day)` from `lib/data/useSleepView.ts`; `day = useMemo(() => toTodayYmd(), [])` (today in UTC: `new Date().toISOString().slice(0, 10)`).  
   - Readiness: `useReadinessView(day)` from `lib/data/useReadinessView.ts`; same `day = toTodayYmd()`.

3. **Which API endpoints or client selectors populate them?**  
   **PROVEN FROM CODE:**  
   - Sleep: `getOuraSleepView(day, token)` in `lib/api/usersMe.ts` → GET `/users/me/oura-sleep-view?day=YYYY-MM-DD`.  
   - Readiness: `getOuraReadinessView(day, token)` → GET `/users/me/oura-readiness-view?day=YYYY-MM-DD`.

4. **What exact conditions produce "No sleep data in the last 7 days" / "No readiness data in the last 7 days"?**  
   **PROVEN FROM CODE:**  
   - Both screens render that copy when the hook state is `status === "missing"`.  
   - In `useSleepView` / `useReadinessView`, "missing" is set when `truthOutcomeFromApiResult(res)` returns `status: "missing"`.  
   - In `lib/data/truthOutcome.ts`, `truthOutcomeFromApiResult` returns `"missing"` when `res.ok === false` and `res.kind === "http"` and `res.status === 404`.  
   - The backend returns 404 when no snapshot doc is found for the requested day and no doc exists in the 7-day fallback window (see § D).

5. **Are those screens reading canonical daily facts, Oura vendor snapshots, raw events, or mixed?**  
   **PROVEN FROM CODE:** They read **Oura vendor snapshots only** — collections `ouraVendorSleep` and `ouraVendorReadiness` under `users/{uid}/`. No canonical events or raw events are used for these views.

---

### C. Oura vendor snapshot path (write)

1. **Where are Oura sleep vendor snapshots written?**  
   **PROVEN FROM CODE:** `services/api/src/lib/ouraVendorSnapshot.ts` — `writeOuraVendorSleepSnapshots(uid, sleepDocs, requestId)`. It writes to `userCollection(uid, "ouraVendorSleep")` → Firestore path `users/{uid}/ouraVendorSleep/{docId}`.

2. **Where are Oura readiness vendor snapshots written?**  
   **PROVEN FROM CODE:** Same file — `writeOuraVendorReadinessSnapshots(uid, readinessDocs, requestId)` → `userCollection(uid, "ouraVendorReadiness")` → `users/{uid}/ouraVendorReadiness/{docId}`.

3. **What Firestore collections/paths are used?**  
   **PROVEN FROM CODE:**  
   - Sleep: `users/{uid}/ouraVendorSleep` (subcollection name passed to `userCollection(uid, "ouraVendorSleep")`; `userDoc(uid)` is `users/{uid}`, so full path is `users/{uid}/ouraVendorSleep`).  
   - Readiness: `users/{uid}/ouraVendorReadiness`.

4. **What exact fields are written?**  
   **PROVEN FROM CODE:**  
   - Sleep snapshot (from `extractSleepSnapshot`): `id`, `day`, `score`, `contributors`, `source: "oura"`, `fetchedAt`, `updatedAt`, and optionally `totalSleepDuration`, `efficiency`, `latency`, `restfulSleep`, `remSleep`, `deepSleep`.  
   - Readiness: `id`, `day`, `score`, `contributors`, `source`, `fetchedAt`, `updatedAt`.

5. **What exact `day` field is stored?**  
   **PROVEN FROM CODE:**  
   - Sleep: `day = toYmd(start)` where `start = doc.bed_time ?? doc.end_time`; if missing, `toYmd(doc.end_time)`. `toYmd(iso) = iso.slice(0, 10)` (YYYY-MM-DD from ISO string).  
   - Readiness: `day = doc.day ?? (doc.timestamp ? toYmd(doc.timestamp) : null)`.

6. **Is the write best-effort or fail-closed?**  
   **PROVEN FROM CODE:** Best-effort. In `ouraPullNow.ts`, snapshot writes are inside a try/catch that logs and does not rethrow. Inside `ouraVendorSnapshot.ts`, each doc write is in its own try/catch; failures are logged with `logger.info` and the loop continues. Sync is considered successful and `lastSyncAt` is still updated.

7. **Are writes triggered by rolling pull-now/core sync, callback sync, backfill, scheduled pull?**  
   **PROVEN FROM CODE:**  
   - **Pull-now / core sync:** `performOuraPullNowCore` in `ouraPullNow.ts` calls `writeOuraVendorSleepSnapshots` and `writeOuraVendorReadinessSnapshots` after `writeOuraRawEvents`. Used by: POST `/integrations/oura/pull-now`, and fire-and-forget after Oura callback (in `integrations.ts` handleOuraCallback).  
   - **Scheduled pull:** `services/api/src/routes/ouraPull.ts` uses `performOuraPullNowCore` (invoker auth); same code path, so snapshots are written when that runs.  
   - **Backfill:** `triggerOuraBackfill` in `ouraPullNow.ts` calls `writeOuraVendorSleepSnapshots` and `writeOuraVendorReadinessSnapshots` per chunk; chunk errors are caught and only logged (`logger.info`, "oura_backfill_chunk_error").  
   - Callback: after token exchange and redirect, fire-and-forget `performOuraPullNowCore(uid, rid)` and `triggerOuraBackfill(uid, rid)`.

---

### D. Oura read/query path

1. **Which backend route reads sleep view?**  
   **PROVEN FROM CODE:** GET `/users/me/oura-sleep-view` in `services/api/src/routes/usersMe.ts` (router mounted under `/users/me`).

2. **Which backend route reads readiness view?**  
   **PROVEN FROM CODE:** GET `/users/me/oura-readiness-view` in the same file.

3. **What exact collection path is queried?**  
   **PROVEN FROM CODE:**  
   - Sleep: `userCollection(uid, "ouraVendorSleep")` → `users/{uid}/ouraVendorSleep`.  
   - Readiness: `userCollection(uid, "ouraVendorReadiness")` → `users/{uid}/ouraVendorReadiness`.

4. **What is the exact fallback logic?**  
   **PROVEN FROM CODE:**  
   - Query param: `day` (required, from `parseDay` → `dayQuerySchema`: YYYY-MM-DD).  
   - Step 1: exact match — `.where("day", "==", requestedDay).limit(1)`.  
   - Step 2: if no doc, fallback — `dayMinus(requestedDay, 7)` → start of 7-day window; then `.where("day", ">=", fallbackStart).where("day", "<=", requestedDay).orderBy("day", "desc").limit(1)`.  
   - If still no doc: respond with 404 `{ ok: false, error: { code: "NOT_FOUND", resource: "ouraSleepView" | "ouraReadinessView", day: requestedDay } }`.

5. **What exact `day` format is expected by the query?**  
   **PROVEN FROM CODE:** `dayQuerySchema` / `dayKeySchema`: string matching regex `^\d{4}-\d{2}-\d{2}$` (YYYY-MM-DD). Same format as written by the snapshot writer.

6. **Does the query depend on composite indexes?**  
   **LIKELY FROM CODE PATH:**  
   - Exact query: single-field equality on `day` — no composite index required.  
   - Fallback: inequality on `day` + `orderBy("day", "desc")`. Firestore may require a single-field or composite index for this. `services/functions/firestore.indexes.json` does **not** define any index for `ouraVendorSleep` or `ouraVendorReadiness`. If the fallback query fails at runtime with a "missing index" error, the route would throw and the client could get 500 rather than 404; if the collection is empty, the query returns empty and the code correctly returns 404. So **missing index could cause 500 on fallback when docs exist in a different order**, but the main symptom (no data) is more likely from no docs. **UNKNOWN without logs** whether the fallback has ever hit an index error.

7. **If no snapshot is found, what exact response is returned?**  
   **PROVEN FROM CODE:** HTTP 404, JSON `{ ok: false, error: { code: "NOT_FOUND", resource: "ouraSleepView" | "ouraReadinessView", day: requestedDay } }`. Client maps 404 → `truthOutcome` "missing" → "No sleep/readiness data in the last 7 days".

8. **Could a day-format mismatch cause no results even when docs exist?**  
   **LIKELY FROM CODE PATH:** Only if the stored `day` were not YYYY-MM-DD (e.g. different timezone or format). Snapshot writer uses `iso.slice(0, 10)` from Oura’s ISO strings; Oura API typically returns UTC. If Oura ever returned a non-ISO or local-date string, `day` could theoretically differ from the client’s `toTodayYmd()`. **UNKNOWN** without inspecting actual Oura payloads and stored docs.

---

### E. Oura sync / write path

1. **Callback auto-sync**  
   - **Entry point:** GET `/integrations/oura/callback` (public) in `integrations.ts` → after token exchange and redirect, fire-and-forget `performOuraPullNowCore(uid, rid)` and `triggerOuraBackfill(uid, rid)`.  
   - **Shared core:** `performOuraPullNowCore`.  
   - **What it fetches:** Sleep and daily readiness (and other datasets) for last 30 days via `fetchOuraSleep`, `fetchOuraDailyReadiness`, etc.  
   - **What it writes:** Raw events via `writeOuraRawEvents`; then vendor snapshots via `writeOuraVendorSleepSnapshots` / `writeOuraVendorReadinessSnapshots` (best-effort); then `lastSyncAt` on `users/{uid}/integrations/oura`.  
   - **Updates lastSyncAt:** Yes, when `performOuraPullNowCore` completes without returning an error response (including when snapshot writes fail inside the try/catch).

2. **App foreground sync**  
   - **Entry point:** Devices list screen `app/(app)/settings/devices.tsx` — on focus and on app state "active", `maybeAutoOuraPullNow("focus")` or `maybeAutoOuraPullNow("foreground")` when Oura is connected and throttle allows. That calls `postOuraPullNow(token, { idempotencyKey })` → POST `/integrations/oura/pull-now`.  
   - **Shared core:** Same `performOuraPullNowCore` (via pull-now route).  
   - **What it fetches/writes:** Same as above.  
   - **Updates lastSyncAt:** Yes, on success of `performOuraPullNowCore`.

3. **Scheduled pull**  
   - **Entry point:** POST `/integrations/oura/pull` (invoker auth) in `ouraPull.ts`; iterates over UIDs from `oura_connected` registry and calls `performOuraPullNowCore` for each.  
   - **Shared core:** Same `performOuraPullNowCore`.  
   - **Updates lastSyncAt:** Yes, on success.

**Conclusion:** **PROVEN FROM CODE:** `lastSyncAt` is updated whenever any of these paths runs `performOuraPullNowCore` to completion (raw events written, snapshot try/catch run, then integration doc updated). It can update even when **zero** vendor snapshot docs are written (e.g. Oura returns empty arrays, or snapshot writes throw and are caught).

---

### F. Oura backfill

1. **Is backfill implemented?**  
   **PROVEN FROM CODE:** Yes. `triggerOuraBackfill(uid, requestId)` in `services/api/src/routes/integrations/ouraPullNow.ts`.

2. **When is it triggered?**  
   **PROVEN FROM CODE:** Fire-and-forget after successful Oura OAuth callback in `integrations.ts` (same block as `performOuraPullNowCore`). Not triggered by pull-now or scheduled pull.

3. **Does it write snapshots?**  
   **PROVEN FROM CODE:** Yes. Each chunk calls `writeOuraVendorSleepSnapshots` and `writeOuraVendorReadinessSnapshots` after `writeOuraRawEvents`.

4. **Does it write canonical sleep/hrv?**  
   **PROVEN FROM CODE:** It writes raw events via `writeOuraRawEvents` (sleep + HRV ingest items). Canonical events are produced by a separate pipeline (normalization/ingestion), not directly in this backfill.

5. **Does it continue on chunk errors?**  
   **PROVEN FROM CODE:** Yes. Each chunk is in try/catch; on error it logs `oura_backfill_chunk_error` and continues to the next chunk. No rethrow.

6. **Does it log failures clearly?**  
   **PROVEN FROM CODE:** It logs with `logger.info` and message only (`chunkErr instanceof Error ? chunkErr.message : String(chunkErr)`). No structured error code in the log payload.

7. **Could the backfill be silently failing while device "Last sync" still updates?**  
   **PROVEN FROM CODE:** Yes. "Last sync" is updated only by `performOuraPullNowCore`, not by backfill. Backfill runs in parallel after callback and can fail (e.g. token, network, or write errors) with only info logs. So the device can show a recent "Last sync" from the initial sync while backfill (which might have written more historical snapshot days) never succeeded.

---

## 2. Most likely failure modes

| Failure mode | Evidence from code | Would it produce current screenshots? | Confidence | How to verify |
|-------------|--------------------|----------------------------------------|------------|----------------|
| lastSyncAt updates independently of snapshot success | `ouraPullNow.ts`: lastSyncAt write is after snapshot try/catch that only logs | Yes — device shows recent Last sync; screens show no data | **High** | Code review (done). Check Firestore: lastSyncAt set on integration doc but ouraVendorSleep/ouraVendorReadiness empty or stale. |
| Snapshot writes fail silently | Per-doc and outer try/catch in ouraVendorSnapshot + ouraPullNow; no rethrow | Yes | **High** | Search logs for `oura_vendor_snapshots_error`, `oura_vendor_sleep_snapshot_write_error`, `oura_vendor_readiness_snapshot_write_error`. |
| Snapshot writes never run (e.g. empty Oura response) | Pull fetches sleep/readiness; if both empty, snapshot writers get [] and write nothing | Yes — no docs to write | **Medium** | Logs: check if fetch returns empty; Firestore: no snapshot docs. |
| Oura returns data but for different days than "today" | Screen requests `toTodayYmd()`; Oura may not have "today" sleep yet (today’s sleep often next morning) | Yes if user expects "today" and only yesterday exists | **Medium** | Compare requestedDay (today) vs stored snapshot days in Firestore. |
| Backfill not triggered or failing silently | Backfill only from callback; chunk errors only logged | Yes if user connected earlier and only initial sync ran | **Medium** | Logs: `oura_backfill_chunk_error`, `oura_backfill_chunk_done`. Firestore: snapshot docs for past 7 days. |
| Wrong collection path | Read path uses `userCollection(uid, "ouraVendorSleep")`; write uses same in ouraVendorSnapshot | No — paths match | **Low** | N/A |
| Wrong UID path | Both read and write use same `uid` from auth or callback | No — same uid | **Low** | N/A |
| Day-format mismatch | Writer uses iso.slice(0,10); query uses dayKeySchema YYYY-MM-DD | Possible only if Oura sends non-ISO | **Low** | Inspect one Oura API response and one snapshot doc. |
| Fallback window query issue | Fallback uses orderBy("day","desc"); index not in firestore.indexes.json | Could cause 500 if index missing and docs exist | **Low** | Run fallback query manually; check for index error in logs. |
| Missing Firestore index | No index for ouraVendorSleep/ouraVendorReadiness in repo | Empty collection returns 0 docs without needing index; fallback might error if index required | **Low** | Deploy and trigger fallback when docs exist; check errors. |
| Read route auth/user mismatch | usersMe uses requireUid(req); same token as device screen | No | **Low** | N/A |
| Sleep/readiness API returns empty docs | Backend returns 404 when no doc in exact + 7-day fallback | Yes — that’s the intended 404 → "missing" path | **High** | Confirm 404 from GET oura-sleep-view/oura-readiness-view for requested day. |
| Today vs yesterday mismatch | Screen always requests today (toTodayYmd()); Oura often has yesterday’s sleep | Yes — "No data in the last 7 days" if no snapshot for today and no docs in last 7 days | **Medium** | Check requestedDay vs snapshot days; consider showing "latest available" more prominently. |
| Screen hook bug | useSleepView/useReadinessView map 404 → missing; no other bug found | No | **Low** | N/A |

---

## 3. Sync timestamp audit

### A. Oura

1. **What exact field is used on the device screen?**  
   **PROVEN FROM CODE:** `ouraPresence.data.lastSyncAt` (string ISO or null) from GET `/integrations/oura/status`, which reads `users/{uid}/integrations/oura`.lastSyncAt.

2. **Is the label "Last sync" accurate, or misleading?**  
   **PROVEN FROM CODE:** Misleading in the current implementation. It means "last time we successfully ran the Oura sync job (pull-now core) and updated the integration doc," not "last time sleep/readiness data was available on the Sleep/Readiness screens." So a user can see a recent "Last sync" but still see "No sleep/readiness data in the last 7 days" if snapshot writes failed or Oura returned no data for the requested window.

3. **Does it mean last canonical sync rather than last snapshot availability?**  
   **PROVEN FROM CODE:** It means last successful run of the sync job that writes raw events and (best-effort) snapshots and then updates lastSyncAt. It is not tied to canonical events or to snapshot availability.

4. **Would a better label be:**  
   - **Last successful Oura sync** — closer (reflects "we ran sync") but still implies data was synced.  
   - **Last successful sleep/readiness import** — would be accurate only if we had a separate timestamp updated only when at least one snapshot was written.  
   - **Last Oura data refresh** — reasonable and less misleading than "Last sync" (suggests "we talked to Oura" not "your screens have data").

### B. Apple Health

1. **Which file renders the Apple Health device detail?**  
   **PROVEN FROM CODE:** Same `app/(app)/settings/devices/[deviceId].tsx` when `deviceId === "apple_health"`.

2. **What exact field is shown as "Last new Apple Health data"?**  
   **PROVEN FROM CODE:** `appleLastSyncAt` (state), set from `getAppleHealthStatus(token)` response `res.json.lastSyncAt`. Backend: GET `/integrations/apple-health/status` in `services/api/src/routes/integrations/appleHealthStatus.ts`.

3. **Where is it written?**  
   **PROVEN FROM CODE:** Not written by a single "sync" endpoint. It is derived on read: query `users/{uid}/rawEvents` where `provider === "apple_health"`, orderBy `receivedAt` desc, limit 1; `lastSyncAt` = that doc’s `receivedAt`. So it reflects the most recent **received** Apple Health raw event.

4. **Is the label semantically correct based on the code?**  
   **PROVEN FROM CODE:** Yes. "Last new Apple Health data" matches "most recent raw event from Apple Health (by receivedAt)."

### C. Withings

1. **Which file renders the Withings device detail?**  
   **PROVEN FROM CODE:** Same `[deviceId].tsx` when `deviceId === "withings"`.

2. **What exact field is shown as "Last measurement"?**  
   **PROVEN FROM CODE:** `withingsPresence.data.lastMeasurementAt`. That comes from `lib/data/useWithingsPresence.ts`: after GET `/integrations/withings/status`, if connected, it calls `getRawEvents` with `kinds: ["weight"]` and filters by `sourceId === "withings"`; `lastMeasurementAt` = latest of those events’ `observedAt`.

3. **Where is it written?**  
   **PROVEN FROM CODE:** It is not a stored "last measurement" field. It is computed from raw events (weight, Withings source). So it reflects actual Withings weight data received.

4. **Is the label semantically correct based on the code?**  
   **PROVEN FROM CODE:** Yes. "Last measurement" = timestamp of the most recent Withings weight event we have.

### D. Cross-source consistency

| Source       | Display label                 | Backing field / source                    | Actual semantic meaning                                      | User trust risk | Recommended label (if misleading)     |
|-------------|-------------------------------|--------------------------------------------|--------------------------------------------------------------|------------------|---------------------------------------|
| Oura        | Last sync                     | `users/{uid}/integrations/oura`.lastSyncAt | Last time pull-now core completed (raw events + best-effort snapshots + lastSyncAt write) | **High** — implies data is on screens | "Last Oura refresh" or "Last sync run" |
| Apple Health| Last new Apple Health data     | Most recent rawEvent (provider=apple_health).receivedAt | Last time we received Apple Health data                     | Low              | —                                     |
| Withings    | Last measurement              | Latest weight rawEvent (sourceId=withings).observedAt | Last time we received a Withings weight measurement         | Low              | —                                     |

---

## 4. Autosync UX audit

1. **Does the current UX create mistrust anywhere?**  
   **LIKELY FROM CODE PATH + SCREENSHOT EVIDENCE:** Yes. Oura device shows "On" and a recent "Last sync," while Sleep/Readiness show "No sleep/readiness data in the last 7 days." The user reasonably infers that "Last sync" means their data is synced and visible; in code, "Last sync" can update even when no vendor snapshots were written. That creates mistrust.

2. **Are there mismatches between device status and screen availability?**  
   **PROVEN FROM CODE:** Yes. Connection status and lastSyncAt are independent of the existence of docs in `ouraVendorSleep` / `ouraVendorReadiness`. So device can show connected + recent sync while screens show no data.

3. **Is "100% accurate data 100% of the time" realistically achievable with Oura timing, or should the UX explicitly communicate source freshness and resolved day?**  
   **PROPOSAL:** Oura often has "today’s" sleep ready the next morning. So showing "today" by default can often be empty even with a successful sync. The UX already has a fallback (7-day window) and shows "Showing latest available Oura sleep for {resolvedDay}" when using fallback. To improve trust: either clarify that "Last sync" means "last refresh from Oura" not "last day with data on screen," and/or surface "Latest data: {resolvedDay}" on the device or on the Sleep/Readiness screen when data is from a fallback day.

4. **What exact UI/labeling changes would most improve trust without overcomplicating the app?**  
   **PROPOSAL:**  
   - Change Oura device "Last sync" label to something like "Last refresh" or "Last sync run," and optionally add a short line: "Sleep/Readiness screens show data when available for the requested day."  
   - On Sleep/Readiness, when showing fallback data, the existing "Showing latest available Oura sleep/readiness for {resolvedDay}" is good; when showing no data, consider adding: "If you just connected, try again in a few minutes or open the Oura app to trigger an update."  
   - Optionally, on the Oura device card, show "Latest sleep data: Mar 14" (or "None yet") derived from a lightweight check (e.g. latest snapshot day from an existing or new endpoint) so "Last sync" is not the only signal.

---

## 5. Firestore / log verification checklist

### A. Firestore paths to inspect

- **Oura integration status (connection + lastSyncAt):**  
  `users/{uid}/integrations/oura`  
  Fields: `connected`, `lastSyncAt`, `connectedAt`, `revoked`, `failureState`.

- **Oura vendor sleep snapshots:**  
  `users/{uid}/ouraVendorSleep`  
  Docs: one per Oura sleep document; fields include `day` (YYYY-MM-DD), `score`, `contributors`, `id`, `fetchedAt`, etc.

- **Oura vendor readiness snapshots:**  
  `users/{uid}/ouraVendorReadiness`  
  Same idea; fields include `day`, `score`, `contributors`, etc.

- **Canonical/raw (if needed for full picture):**  
  `users/{uid}/rawEvents` — filter by `sourceId == "oura"` and/or kind to see Oura ingest.  
  `users/{uid}/events` — canonical events (sleep/hrv) if you need to confirm normalization.

### B. Log queries to run

- Callback sync: `msg:"oura_callback_auto_sync_error"` or `msg:"oura_callback_backfill_error"`  
- Rolling sync (pull-now): `msg:"oura_pull_now_fetch_failed"` or `msg:"oura_pull_now_metadata_error"` or `msg:"oura_vendor_snapshots_error"`  
- Scheduled pull: same as pull-now (performOuraPullNowCore).  
- Backfill: `msg:"oura_backfill_chunk_error"` or `msg:"oura_backfill_chunk_done"` or `msg:"oura_backfill_skipped_no_token"`  
- Snapshot writer failures: `msg:"oura_vendor_sleep_snapshot_write_error"` or `msg:"oura_vendor_readiness_snapshot_write_error"`  
- Read route failures: 404/500 from GET `/users/me/oura-sleep-view` or `oura-readiness-view` (from API gateway or app logs).  
- Firestore index errors: `FIRESTORE_INDEX_MISSING` or `failed-precondition` in API responses or logs.

### C. What values to compare

- **Device "Last sync":** Value of `users/{uid}/integrations/oura`.lastSyncAt (ISO or timestamp).  
- **Snapshot latest day (sleep):** Max `day` among docs in `users/{uid}/ouraVendorSleep`.  
- **Snapshot latest day (readiness):** Max `day` among docs in `users/{uid}/ouraVendorReadiness`.  
- **Screen requested day:** Today in UTC (client `toTodayYmd()`).  
- **Screen resolved day:** If 404, there is no resolved day; if 200, response body has `resolvedDay`.  

Compare: Is lastSyncAt recent while ouraVendorSleep/ouraVendorReadiness are empty or have max day older than 7 days? That would confirm lastSyncAt is updating without snapshot availability.

---

## 6. Recommended fix plan

### Immediate bug fixes

1. **Tie "Last sync" semantics to snapshot availability (or rename and clarify)**  
   - **Option A (preferred for trust):** Only update `lastSyncAt` when at least one vendor snapshot (sleep or readiness) was successfully written in that run. If snapshot writes are in a try/catch, move the `lastSyncAt` write inside a block that runs only when snapshot writes did not throw (or when the written count > 0).  
   - **Option B (quicker):** Keep current behavior but rename the label to "Last refresh" or "Last sync run" and add one line of copy that Sleep/Readiness show data when available for the day.

2. **Make snapshot write failures visible**  
   - Upgrade snapshot write failures from `logger.info` to `logger.warn` or `logger.error` so they are easy to find.  
   - Optionally write a failure entry (e.g. to `users/{uid}/failures`) when the **entire** snapshot batch fails (e.g. outer catch in pull-now), so support or debugging can see that sync "succeeded" but snapshots did not.

3. **Verify and fix backfill reliability**  
   - Ensure backfill is actually triggered after callback (already fire-and-forget; confirm no early exit).  
   - On backfill chunk error, log with `logger.warn` and include chunk range; consider writing a failure entry so "no data" can be correlated with "backfill failed for window X–Y."

### Trust/UX improvements

1. **Oura device label and copy**  
   - Use a label that does not imply "your screens have data" (e.g. "Last refresh" or "Last sync run").  
   - Short subline: "Sleep and Readiness screens show data when we have it for the selected day."

2. **Empty-state copy on Sleep/Readiness**  
   - Add: "If you just connected Oura, wait a few minutes and pull to refresh, or open the Oura app to trigger an update."

3. **Optional: show latest available day on device**  
   - If you add a small endpoint or reuse existing data (e.g. latest snapshot day), show "Latest sleep data: Mar 14" or "No sleep data yet" on the Oura device card so users see the real state of data, not just "Last sync."

### Optional follow-ups

- Add an explicit composite index for `ouraVendorSleep` and `ouraVendorReadiness` for the fallback query (e.g. `day` DESC) if Firestore requires it and it is not auto-created.  
- Consider requesting "yesterday" by default on Sleep/Readiness when "today" has no data (or make the requested day configurable).  
- Remove temporary `console.log` debug lines in `integrations.ts` (e.g. `[OURA_STATUS_HIT]`, `[OURA_CONNECT_HIT]`, `[OURA_CALLBACK_REDIRECT]`) before production.

---

## 7. Proven / Likely / Unknown summary

- **Proven from code**  
  - Device "On" and "Last sync" come from GET `/integrations/oura/status` (integration doc).  
  - Last sync is written in `performOuraPullNowCore` after raw events and after best-effort snapshot writes; it can be updated even when no snapshot docs are written.  
  - Sleep/Readiness screens read only Oura vendor snapshots; 404 → "No sleep/readiness data in the last 7 days."  
  - Snapshot writes are best-effort (try/catch, log only); backfill chunk errors are only logged.  
  - Apple Health "Last new Apple Health data" = most recent rawEvent receivedAt; Withings "Last measurement" = latest Withings weight observedAt; both reflect actual data. Oura "Last sync" does not guarantee snapshot data.

- **Likely from code path + screenshot evidence**  
  - The observed mismatch (connected + recent Last sync vs no data) is explained by lastSyncAt updating without snapshot success and/or snapshot writes failing or Oura returning empty data.  
  - Fallback query might need an index; if the collection is empty, 404 is expected.

- **Unknown / needs logs or Firestore verification**  
  - Whether snapshot writes have ever thrown (search for `oura_vendor_snapshots_error` and per-doc snapshot write errors).  
  - Whether Oura API returned empty sleep/readiness for the last 30 days for the user.  
  - Whether backfill ran and whether it wrote any snapshot docs.  
  - Whether there is a day-format or timezone mismatch between Oura and stored `day`.  
  - Whether the fallback query has ever failed due to a missing Firestore index.
