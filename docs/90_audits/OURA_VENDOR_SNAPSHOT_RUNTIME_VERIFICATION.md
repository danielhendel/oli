# Oura Vendor Snapshot Runtime Verification

## 1. Known runtime facts

**UID under test:** `1Uwhcp4OShV3QLz3VKMHW05B3033`

**Already verified from Firestore:**

| Fact | Path / detail |
|------|----------------|
| Integration doc exists | `users/1Uwhcp4OShV3QLz3VKMHW05B3033/integrations/oura` |
| `connected: true` | Same doc |
| `lastSyncAt` is recent | Same doc |
| `failureState: null` | Same doc |
| Raw Oura events exist | `users/1Uwhcp4OShV3QLz3VKMHW05B3033/rawEvents` (Oura-sourced) |
| `ouraVendorSleep` absent | Subcollection has no documents (or does not exist) |
| `ouraVendorReadiness` absent | Subcollection has no documents (or does not exist) |

**Strongest currently supported conclusion (PROVEN FROM EVIDENCE):**

- The sync pipeline has run successfully at least once for this user (integration doc exists, lastSyncAt recent, raw events present).
- Raw ingest is working for some Oura data.
- The vendor snapshot collections that power the Sleep and Readiness screens are empty or missing for this user.
- Therefore: either (a) snapshot writes were never performed for sleep/readiness, or (b) they were performed but wrote zero documents (e.g. empty fetch arrays or extract returned null for all), or (c) they threw and errors were swallowed and lastSyncAt was still updated.

**Clarification needed from Firestore:** Do the raw events include documents with `kind === "sleep"` and/or `kind === "hrv"` and `sourceId === "oura"`? If yes, then the fetch returned non-empty sleep and/or readiness data and the snapshot writers were invoked with non-empty arrays; the failure is then at snapshot write (throw swallowed or extract returned null for all). If the only raw Oura events are e.g. `kind === "oura_raw"` or `kind === "steps"`, then sleep/readiness fetch may have returned empty and snapshot writers would have been called with `[]` and written nothing (no error, no log).

---

## 2. Snapshot write code path trace

### Flow summary

```
Oura callback / foreground / scheduled pull
  → performOuraPullNowCore(uid, requestId)
  → refreshOuraAccessToken
  → fetchOuraSleep(accessToken, startStr, endStr)   // not wrapped in safeFetch
  → fetchOuraDailyReadiness(accessToken, startStr, endStr)
  → sleepDocs = sleepDocsFetched ?? [];  readinessDocs = readinessDocsFetched ?? [];
  → sleepItems = sleepDocs.map(mapOuraSleepToIngestItem).filter(...)
  → hrvItems = readinessDocs.map(mapOuraReadinessToHrvItem).filter(...)
  → writeOuraRawEvents(uid, sleepItems, hrvItems, requestId, { stepsItems, workoutItems, ouraRawItems })
  → try { Promise.all([ writeOuraVendorSleepSnapshots(uid, sleepDocs ?? [], requestId), writeOuraVendorReadinessSnapshots(uid, readinessDocs ?? [], requestId) ]) }
       catch → logger.info("oura_vendor_snapshots_error")  // swallow
  → integrationRef.set({ lastSyncAt: FieldValue.serverTimestamp() }, { merge: true })
```

### performOuraPullNowCore (exact code)

**File:** `services/api/src/routes/integrations/ouraPullNow.ts`

- **Fetch:** Sleep and readiness are fetched directly (not via `safeFetch`). If either throws, the outer try/catch logs `oura_pull_now_fetch_failed` and returns 502; raw write and snapshot write are not reached.

```ts
// Lines 241–265
const [
  sleepDocsFetched,
  readinessDocsFetched,
  ...
] = await Promise.all([
  fetchOuraSleep(accessToken, startStr, endStr),
  fetchOuraDailyReadiness(accessToken, startStr, endStr),
  ...
]);
sleepDocs = sleepDocsFetched ?? [];
readinessDocs = readinessDocsFetched ?? [];
sleepItems = sleepDocs.map(mapOuraSleepToIngestItem).filter(...);
hrvItems = readinessDocs.map(mapOuraReadinessToHrvItem).filter(...);
```

- **Raw write:** `writeOuraRawEvents(uid, sleepItems, hrvItems, requestId, { ... })`. If this runs and creates sleep/hrv raw events, then `sleepDocs`/`readinessDocs` were non-empty.

- **Snapshot write (best-effort):**

```ts
// Lines 335–348
// Tier 1: Oura vendor snapshots for Sleep and Readiness screens (best-effort; do not break sync).
try {
  await Promise.all([
    writeOuraVendorSleepSnapshots(uid, sleepDocs ?? [], requestId),
    writeOuraVendorReadinessSnapshots(uid, readinessDocs ?? [], requestId),
  ]);
} catch (snapErr) {
  logger.info({
    msg: "oura_vendor_snapshots_error",
    uid,
    requestId,
    err: snapErr instanceof Error ? snapErr.message : String(snapErr),
  });
}
```

- **Metadata:** After the try/catch, `lastSyncAt` is always updated (unless the metadata write throws, which returns 500 and logs `oura_pull_now_metadata_error`).

```ts
// Lines 350–355
try {
  const integrationRef = userCollection(uid, "integrations").doc("oura");
  await integrationRef.set(
    { lastSyncAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
} catch (metaErr) { ... return 500; }
```

**Conclusions from code (PROVEN FROM CODE):**

- `lastSyncAt` is updated even if the snapshot try block throws; the catch only logs and does not rethrow.
- Snapshot writing depends on `sleepDocs` and `readinessDocs` being passed in; if both are `[]`, both writers run but write zero docs (no exception, no log).
- Snapshot collections are created only when at least one `col.doc(id).set(...)` runs; if all `extractSleepSnapshot`/`extractReadinessSnapshot` return null or the arrays are empty, zero docs are written and the subcollection remains empty.
- There is no guard that skips calling the snapshot writers; they are always called with `sleepDocs ?? []` and `readinessDocs ?? []`.

### writeOuraVendorSleepSnapshots

**File:** `services/api/src/lib/ouraVendorSnapshot.ts`

- **Function:** `writeOuraVendorSleepSnapshots(uid: string, docs: OuraSleepDocument[], requestId: string): Promise<void>`.
- **Inputs:** `uid`, array of Oura sleep API documents, `requestId`.
- **Path written:** `userCollection(uid, "ouraVendorSleep")` → Firestore `users/{uid}/ouraVendorSleep`. Each doc: `col.doc(snapshot.id).set(snapshot, { merge: true })` where `snapshot.id` is `doc.id ?? \`oura_sleep_${start ?? doc.end_time}\``.
- **Returns:** Nothing (void). No count returned.
- **Per-doc:** For each `doc`, `extractSleepSnapshot(doc, fetchedAt)` is called. If it returns null (e.g. no `day`), the loop `continue`s. Otherwise `col.doc(snapshot.id).set(snapshot, { merge: true })` is in a try/catch; on catch, logs `oura_vendor_sleep_snapshot_write_error` (uid, requestId, snapshotId, day, err) and continues. Exceptions are swallowed.

```ts
// Lines 75–102
export async function writeOuraVendorSleepSnapshots(
  uid: string,
  docs: OuraSleepDocument[],
  requestId: string,
): Promise<void> {
  const col = userCollection(uid, "ouraVendorSleep");
  const fetchedAt = new Date().toISOString();

  for (const doc of docs) {
    const snapshot = extractSleepSnapshot(doc, fetchedAt);
    if (!snapshot) continue;

    try {
      await col.doc(snapshot.id).set(snapshot, { merge: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.info({
        msg: "oura_vendor_sleep_snapshot_write_error",
        uid,
        requestId,
        snapshotId: snapshot.id,
        day: snapshot.day,
        err: message,
      });
    }
  }
}
```

**extractSleepSnapshot:** Returns null if no `day`; `day = toYmd(bed_time ?? end_time)` or `toYmd(end_time)`; `toYmd(iso) = iso.slice(0, 10)`.

### writeOuraVendorReadinessSnapshots

**File:** `services/api/src/lib/ouraVendorSnapshot.ts`

- Same pattern: `writeOuraVendorReadinessSnapshots(uid, docs, requestId)`; path `users/{uid}/ouraVendorReadiness`; per-doc try/catch, log `oura_vendor_readiness_snapshot_write_error`; no return value. **extractReadinessSnapshot** returns null if no `day`; `day = doc.day ?? (doc.timestamp ? toYmd(doc.timestamp) : null)`.

### fetchOuraSleep / fetchOuraDailyReadiness

**File:** `services/api/src/lib/ouraApi.ts`

- `fetchOuraSleep(accessToken, startDate, endDate): Promise<OuraSleepDocument[]>` — GET `${OURA_API_BASE}/sleep?start_date=&end_date=`. On 401 throws `OuraApiError`. Returns parsed JSON (array).
- `fetchOuraDailyReadiness(accessToken, startDate, endDate): Promise<OuraDailyReadinessDocument[]>` — GET `.../daily_readiness?start_date=&end_date=`. Same pattern.

If either throws, `performOuraPullNowCore` never reaches raw or snapshot write; we would not see recent lastSyncAt and raw events for that run. So for this user (recent lastSyncAt + raw events), fetch did not throw for the run that produced lastSyncAt.

---

## 3. Exact log queries to run

**UID:** `1Uwhcp4OShV3QLz3VKMHW05B3033`  
**Time window:** Last 14–30 days (to capture callback, backfill, and any scheduled/foreground syncs).

### GCP Logging (structured logs)

Assume Cloud Run / Node logger writes to `jsonPayload` with fields such as `msg`, `uid`, `rid`/`requestId`, `err`, `startStr`, `endStr`. Adjust resource type if your API runs elsewhere.

**Single-UID filter (all Oura-related for this user):**

```
jsonPayload.uid="1Uwhcp4OShV3QLz3VKMHW05B3033"
(
  jsonPayload.msg=~"oura_.*"
  OR textPayload=~"oura_.*"
)
```

**Per-message filters (use one at a time to confirm presence/absence):**

| Log message | Exact GCP filter |
|-------------|------------------|
| oura_vendor_snapshots_error | `jsonPayload.msg="oura_vendor_snapshots_error"` `jsonPayload.uid="1Uwhcp4OShV3QLz3VKMHW05B3033"` |
| oura_vendor_sleep_snapshot_write_error | `jsonPayload.msg="oura_vendor_sleep_snapshot_write_error"` `jsonPayload.uid="1Uwhcp4OShV3QLz3VKMHW05B3033"` |
| oura_vendor_readiness_snapshot_write_error | `jsonPayload.msg="oura_vendor_readiness_snapshot_write_error"` `jsonPayload.uid="1Uwhcp4OShV3QLz3VKMHW05B3033"` |
| oura_pull_now_fetch_failed | `jsonPayload.msg="oura_pull_now_fetch_failed"` `jsonPayload.uid="1Uwhcp4OShV3QLz3VKMHW05B3033"` |
| oura_pull_now_token_refresh_failed | `jsonPayload.msg="oura_pull_now_token_refresh_failed"` `jsonPayload.uid="1Uwhcp4OShV3QLz3VKMHW05B3033"` |
| oura_pull_now_no_refresh_token | `jsonPayload.msg="oura_pull_now_no_refresh_token"` `jsonPayload.uid="1Uwhcp4OShV3QLz3VKMHW05B3033"` |
| oura_pull_now_metadata_error | `jsonPayload.msg="oura_pull_now_metadata_error"` `jsonPayload.uid="1Uwhcp4OShV3QLz3VKMHW05B3033"` |
| oura_callback_auto_sync_error | `jsonPayload.msg="oura_callback_auto_sync_error"` `jsonPayload.uid="1Uwhcp4OShV3QLz3VKMHW05B3033"` |
| oura_callback_backfill_error | `jsonPayload.msg="oura_callback_backfill_error"` `jsonPayload.uid="1Uwhcp4OShV3QLz3VKMHW05B3033"` |
| oura_backfill_chunk_done | `jsonPayload.msg="oura_backfill_chunk_done"` `jsonPayload.uid="1Uwhcp4OShV3QLz3VKMHW05B3033"` |
| oura_backfill_chunk_error | `jsonPayload.msg="oura_backfill_chunk_error"` `jsonPayload.uid="1Uwhcp4OShV3QLz3VKMHW05B3033"` |
| oura_backfill_skipped_no_token | `jsonPayload.msg="oura_backfill_skipped_no_token"` `jsonPayload.uid="1Uwhcp4OShV3QLz3VKMHW05B3033"` |
| oura_backfill_skipped_misconfig | `jsonPayload.msg="oura_backfill_skipped_misconfig"` `jsonPayload.uid="1Uwhcp4OShV3QLz3VKMHW05B3033"` |
| oura_backfill_token_failed | `jsonPayload.msg="oura_backfill_token_failed"` `jsonPayload.uid="1Uwhcp4OShV3QLz3VKMHW05B3033"` |

**Fields to inspect:** `msg`, `uid`, `rid` or `requestId`, `err`, `startStr`, `endStr`, `snapshotId`, `day`.

**Scheduled sync (no uid in payload; use time + project):**

```
jsonPayload.msg="oura_pull_scheduled_start"
```
```
jsonPayload.msg="oura_pull_scheduled_done"
```

**Alternative (gcloud):**

```bash
gcloud logging read '
resource.type="cloud_run_revision"
jsonPayload.uid="1Uwhcp4OShV3QLz3VKMHW05B3033"
jsonPayload.msg=~"^oura_"
' --limit=100 --format=json --freshness=30d
```

---

## 4. What each log result would prove

| If we see | And Firestore state | That proves |
|-----------|----------------------|-------------|
| `oura_vendor_snapshots_error` for this uid | lastSyncAt recent, raw events present, snapshot collections empty | Snapshot batch threw; exception swallowed; lastSyncAt updated anyway. **PROVEN.** |
| `oura_vendor_sleep_snapshot_write_error` (one or more) | Same as above | At least one sleep snapshot write threw; per-doc catch logged; lastSyncAt still updated. **PROVEN.** |
| `oura_vendor_readiness_snapshot_write_error` (one or more) | Same | Same for readiness. **PROVEN.** |
| Raw events present (sleep/hrv) + no snapshot errors + no snapshot collections | lastSyncAt recent | Either (1) sleep/readiness arrays were empty so writers wrote 0 docs (no log), or (2) extract returned null for every doc (no write, no log). **LIKELY.** Need to confirm raw event kinds. |
| `oura_pull_now_fetch_failed` for this uid | lastSyncAt recent | Contradiction: fetch failure returns 502 and does not update lastSyncAt. So either lastSyncAt is from a different run, or log is from a different run. **Clarifies timeline.** |
| `oura_pull_now_token_refresh_failed` / `no_refresh_token` | lastSyncAt recent | Same: that run would not reach metadata update. **Timeline.** |
| `oura_pull_now_metadata_error` | lastSyncAt recent | Contradiction: metadata error returns 500 and does not set lastSyncAt. So lastSyncAt was set in another run. **Timeline.** |
| `oura_callback_auto_sync_error` | — | First sync (after connect) failed; backfill may still have run. **LIKELY:** callback sync failed, but a later foreground/scheduled run could have set lastSyncAt. |
| `oura_callback_backfill_error` | — | Backfill promise rejected. **LIKELY:** no backfill docs. |
| `oura_backfill_chunk_done` for this uid | — | At least one backfill chunk wrote raw + snapshots. If we see this and still no snapshot docs, path mismatch or later overwrite (unlikely). **Rare.** |
| `oura_backfill_chunk_error` for this uid | — | That chunk failed; no snapshot docs from that chunk. **LIKELY** if no chunk_done. |
| No Oura logs at all for this uid | lastSyncAt recent, raw present | Logs may be in another project/label or retention expired; or sync ran from a service that does not log uid. **UNKNOWN.** |

---

## 5. Root cause decision table

| # | Candidate cause | Status | Required evidence | Repo evidence | Runtime evidence needed | User impact | Changes patch? |
|---|------------------|--------|--------------------|----------------|--------------------------|-------------|----------------|
| 1 | Sleep/readiness fetch returned empty arrays | LIKELY / UNKNOWN | Raw events for this user have no sleep/hrv kinds; or logs show fetch returned empty (no such log today). | Raw write uses same sleepDocs/readinessDocs; if fetch empty, sleepItems/hrvItems empty, so no sleep/hrv raw events. Snapshot writers get `[]`, write 0 docs, no throw. | Confirm rawEvents: any doc with kind "sleep" or "hrv" and sourceId "oura". If none, supports empty fetch. | Screens empty; device shows sync. | Yes: if empty fetch, add logging + optional label fix. |
| 2 | Snapshot write function threw | PROVEN / LIKELY | Batch throw: oura_vendor_snapshots_error. Per-doc throw: oura_vendor_sleep_snapshot_write_error or oura_vendor_readiness_snapshot_write_error. | Catch in ouraPullNow logs and swallows; per-doc catch in ouraVendorSnapshot logs and continues. lastSyncAt still updated. | See those log messages for this uid. | Same. | Yes: fix write or surface error; gate lastSyncAt. |
| 3 | Snapshot errors swallowed and lastSyncAt still updated | PROVEN FROM CODE | Code path: catch block logs then execution continues to integrationRef.set. | Lines 341–348 (catch) then 350–355 (set lastSyncAt). No condition on snapshot success. | Optional: see oura_vendor_snapshots_error for uid. | Trust: "Last sync" implies data available. | Yes: trust semantics fix. |
| 4 | Snapshot write never reached | UNKNOWN | Would require fetch to throw; then no raw events and no lastSyncAt for that run. | Fetch throw → 502, no raw write, no snapshot, no lastSyncAt. We have lastSyncAt + raw events, so at least one run reached raw write; after raw write, snapshot block is always called. | None if raw + lastSyncAt from same run. | — | No. |
| 5 | Backfill failed | LIKELY / UNKNOWN | oura_backfill_chunk_error or oura_callback_backfill_error; no oura_backfill_chunk_done for uid. | Backfill is fire-and-forget; does not set lastSyncAt; only runs after callback. | Logs above. | No historical snapshot docs from backfill. | Optional: improve backfill visibility; not sufficient alone for empty screens if pull-now also ran. |
| 6 | Only HRV raw events exist, not sleep/readiness | LIKELY / UNKNOWN | rawEvents: kind "hrv" with sourceId "oura" present; kind "sleep" absent. | If only hrv raw events, readinessDocs was non-empty, sleepDocs could be empty; sleep snapshot writer would get [] and write 0. Readiness writer would get docs; if readiness snapshots still absent, readiness write threw or extract returned null for all. | Firestore: list kinds for sourceId "oura". | Readiness could still be empty if readiness snapshot failed. | Yes: confirms which branch (sleep vs readiness). |
| 7 | Snapshot collections under unexpected path | PROVEN FALSE | Read path uses userCollection(uid, "ouraVendorSleep") and "ouraVendorReadiness"). | db.ts: userDoc(uid).collection(name) → users/{uid}/{name}. Write uses same. | N/A. | — | No. |
| 8 | Day computation issue | LIKELY / UNKNOWN | All Oura docs missing day or wrong format so extract returns null. | extractSleepSnapshot: day from bed_time/end_time toYmd; extractReadinessSnapshot: doc.day or toYmd(timestamp). Null if !day. | Inspect one raw Oura sleep/hrv payload for day/start/end/timestamp. | Zero snapshot docs. | Yes: fix extract or Oura mapping. |
| 9 | Sync semantics only (label misleading) | PROVEN FROM CODE | lastSyncAt means "last pull-now completion," not "last snapshot written." | Code updates lastSyncAt after best-effort snapshot block. | Firestore: lastSyncAt set, snapshot collections empty. | Trust. | Yes: label/copy fix. |

---

## 6. Minimal patch plan

### A. Trust semantics fix

- **File:** `app/(app)/settings/devices/[deviceId].tsx`
- **Change:** For Oura, change the label from "Last sync" to "Last refresh" (or "Last sync run"). Add one line of copy, e.g. "Sleep and Readiness show data when we have it for the day."
- **Rationale:** So the device screen does not imply that data is available on Sleep/Readiness when lastSyncAt is recent but snapshots are missing.

- **Files:** `app/(app)/recovery/sleep.tsx`, `app/(app)/recovery/readiness.tsx`
- **Change:** In the empty state ("No sleep/readiness data in the last 7 days"), add a line: "If you just connected Oura, wait a few minutes and pull to refresh, or open the Oura app to trigger an update."

### B. Data pipeline fix

- **File:** `services/api/src/routes/integrations/ouraPullNow.ts`
- **Function:** `performOuraPullNowCore`
- **Change:** Update `lastSyncAt` only when at least one vendor snapshot was successfully written in this run.
  - Option 1: Have `writeOuraVendorSleepSnapshots` and `writeOuraVendorReadinessSnapshots` return a count (or { sleepWritten, readinessWritten }). Then only call `integrationRef.set({ lastSyncAt: ... })` when (sleepWritten + readinessWritten) > 0.
  - Option 2: Move the lastSyncAt write inside the snapshot try block so it runs only when the Promise.all resolves without throw (and optionally require at least one doc written by checking return values).
- **Rationale:** So "Last sync" (or "Last refresh") is not updated when zero snapshot docs were written, restoring alignment between device label and screen data.

- **File:** `services/api/src/lib/ouraVendorSnapshot.ts`
- **Functions:** `writeOuraVendorSleepSnapshots`, `writeOuraVendorReadinessSnapshots`
- **Change:** Return `Promise<{ written: number }>` (or similar); in the loop, increment on successful set; catch still log and continue. Caller can use this to gate lastSyncAt.

### C. Logging / observability fix

- **File:** `services/api/src/routes/integrations/ouraPullNow.ts`
- **Function:** `performOuraPullNowCore`
- **Change:** After the snapshot try/catch, log a structured message with uid, requestId, and whether the batch threw and/or counts (if you add return values), e.g. `logger.info({ msg: "oura_vendor_snapshots_done", uid, requestId, snapshotBatchThrew: !!snapErr, sleepWritten, readinessWritten })`. Use return values from snapshot writers for counts.
- **File:** `services/api/src/lib/ouraVendorSnapshot.ts`
- **Change:** On catch, use `logger.warn` (or `logger.error`) instead of `logger.info` for `oura_vendor_sleep_snapshot_write_error` and `oura_vendor_readiness_snapshot_write_error` so they are easy to find.
- **Optional:** When the snapshot batch throws, write a failure entry to `users/{uid}/failures` (e.g. stage "oura.snapshots", reasonCode "OURA_VENDOR_SNAPSHOTS_FAILED") so support can see "sync ran but snapshots failed."

### D. Optional stronger invariant

- **lastSnapshotAt:** Add a field `lastSnapshotAt` on `users/{uid}/integrations/oura` set only when at least one snapshot doc is written; device screen could show "Last data: {lastSnapshotAt}" or "Last refresh: {lastSyncAt}" and "Last sleep/readiness data: {lastSnapshotAt}" to separate "we talked to Oura" from "we have data for the screens." Requires schema and UI change; only if product wants that distinction.

**Summary:**

- **Rename "Last sync"?** Yes (to "Last refresh" or equivalent) and add one-line clarification. **(A)**
- **Gate lastSyncAt?** Yes: update only when at least one snapshot written. **(B)**
- **Add lastSnapshotAt?** Optional. **(D)**
- **Log counts (fetched + written)?** Yes: log snapshot batch outcome and, if added, sleep/readiness written counts. **(C)**

---

## 7. Verification after patch

- **Firestore:** For a test user after a successful sync that writes snapshots: `users/{testUid}/integrations/oura`.lastSyncAt is recent only when `users/{testUid}/ouraVendorSleep` or `ouraVendorReadiness` has at least one doc in the last 7 days (if B is implemented). Optional: `lastSnapshotAt` present when snapshots written.
- **Logs:** After a run: `oura_vendor_snapshots_done` (or equivalent) shows written counts; snapshot write failures appear as warn/error; if batch throws, failure entry exists (if implemented).
- **UI:** Device shows "Last refresh" (or chosen label) and subline; Sleep/Readiness empty state shows the new line; when snapshots exist for today or fallback day, screens show data.
- **One API test:** In `services/api/src/routes/__tests__/usersMe.ouraView.test.ts` (or equivalent): (1) When integration has lastSyncAt but ouraVendorSleep has no doc in window, GET `/users/me/oura-sleep-view?day={today}` returns 404. (2) If B: when snapshot writers return 0 written, assert lastSyncAt is not updated (mock or integration test).
- **One regression invariant:** Comment or assertion next to the lastSyncAt write: "lastSyncAt is only updated when at least one vendor snapshot was written in this run (or when we intentionally allow metadata-only refresh)."

---

## 8. Copy-paste commands / queries

### GCP Logging (one block)

```
# All Oura-related logs for the affected UID (last 30 days)
jsonPayload.uid="1Uwhcp4OShV3QLz3VKMHW05B3033"
(
  jsonPayload.msg="oura_vendor_snapshots_error"
  OR jsonPayload.msg="oura_vendor_sleep_snapshot_write_error"
  OR jsonPayload.msg="oura_vendor_readiness_snapshot_write_error"
  OR jsonPayload.msg="oura_pull_now_fetch_failed"
  OR jsonPayload.msg="oura_pull_now_token_refresh_failed"
  OR jsonPayload.msg="oura_pull_now_no_refresh_token"
  OR jsonPayload.msg="oura_pull_now_metadata_error"
  OR jsonPayload.msg="oura_callback_auto_sync_error"
  OR jsonPayload.msg="oura_callback_backfill_error"
  OR jsonPayload.msg="oura_backfill_chunk_done"
  OR jsonPayload.msg="oura_backfill_chunk_error"
  OR jsonPayload.msg="oura_backfill_skipped_no_token"
  OR jsonPayload.msg="oura_backfill_skipped_misconfig"
  OR jsonPayload.msg="oura_backfill_token_failed"
)
```

### gcloud (optional)

```bash
# Oura logs for UID, last 30 days
gcloud logging read '
resource.type="cloud_run_revision"
jsonPayload.uid="1Uwhcp4OShV3QLz3VKMHW05B3033"
(jsonPayload.msg=~"^oura_vendor_" OR jsonPayload.msg=~"^oura_pull_now_" OR jsonPayload.msg=~"^oura_callback_" OR jsonPayload.msg=~"^oura_backfill_")
' --limit=200 --format="table(timestamp, jsonPayload.msg, jsonPayload.err)" --freshness=30d
```

### Repo grep (find log sites and snapshot path)

```bash
# Snapshot write and log sites
rg -n "oura_vendor_snapshots_error|oura_vendor_sleep_snapshot_write_error|oura_vendor_readiness_snapshot_write_error" services/api/src/

# lastSyncAt write
rg -n "lastSyncAt|FieldValue.serverTimestamp" services/api/src/routes/integrations/ouraPullNow.ts

# Snapshot writer entry points
rg -n "writeOuraVendorSleepSnapshots|writeOuraVendorReadinessSnapshots" services/api/src/
```

### Firestore (raw event kinds for this UID)

If using a script or Admin SDK:

```js
const uid = "1Uwhcp4OShV3QLz3VKMHW05B3033";
const snap = await admin.firestore().collection(`users/${uid}/rawEvents`).limit(100).get();
const byKind = {};
snap.docs.forEach(d => {
  const k = d.data().kind || "?";
  byKind[k] = (byKind[k] || 0) + 1;
});
console.log("rawEvents by kind:", byKind);
// If sleep or hrv present with sourceId "oura", fetch had data; snapshot failure or extract null.
```
