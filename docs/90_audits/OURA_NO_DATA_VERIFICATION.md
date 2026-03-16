# Oura No-Data Verification

## 1. User under test

**Obtaining the affected `uid`:**

| Method | Location | How |
|--------|----------|-----|
| **Client (dev)** | `lib/auth/AuthProvider.tsx` | `useAuth().user` is `User \| null`; `user.uid` is the Firebase Auth UID. |
| **Client (dev)** | `app/debug/token.tsx` | Debug screen shows UID: `<Text>{user?.uid ?? "—"}</Text>`. Navigate to Debug → Token (or `/debug/token`) while signed in; copy uid. |
| **Client (dev)** | `app/debug/re-auth.tsx` | After refresh, result includes `uid=${user.uid}`. |
| **Client (dev)** | `lib/auth/getUid.ts` | `getUid()` returns `auth.currentUser?.uid` or throws if not signed in. Can be called from any component and logged: `console.warn("DEBUG_UID", getUid());` (only in dev build). |
| **Server** | API routes | `req.uid` set by auth middleware (`AuthedRequest`). Not logged by default; add temporary log in e.g. GET `/integrations/oura/status`: `logger.info({ msg: "oura_status_uid_debug", uid: req.uid });` for the affected request. |

**Safe dev instrumentation (no PII in prod):**

- In dev, add to a screen that runs when the tester is on the Oura device detail:  
  `console.log("[OURA_DEBUG_UID]", useAuth().user?.uid);`  
  or render it in a dev-only block:  
  `{__DEV__ && <Text selectable>{user?.uid}</Text>}`.
- Fastest: have tester open **Debug → Token** and read or copy the UID shown.

**Existing admin/debug tooling:**

- No repo code that queries Firestore by uid from an admin UI. Firestore must be inspected via:
  - **Firebase Console:** Firestore → `users` → `{uid}` → subcollections `integrations`, `ouraVendorSleep`, `ouraVendorReadiness`, `rawEvents`.
  - **Script:** Use Firebase Admin SDK (or emulator) with a small script that takes `uid` as argument and reads the paths below (see §3).

---

## 2. Expected end-to-end data contract

From repo code, these conditions must hold for data to show.

**A. Oura device screen shows connected + lastSyncAt**

- **Source:** GET `/integrations/oura/status` → reads `users/{uid}/integrations/oura`.
- **Required:** Doc exists; `connected === true`; `lastSyncAt` can be any ISO string or Firestore Timestamp (returned as ISO).
- **Path:** `users/{uid}/integrations/oura` (document).
- **Fields:** `connected`, `lastSyncAt`, `connectedAt`, `revoked`, `failureState`.

**B. Sleep screen shows data**

- **Source:** GET `/users/me/oura-sleep-view?day=YYYY-MM-DD` → must return 200 with a view body.
- **Required:** At least one document in `users/{uid}/ouraVendorSleep` with:
  - `day` equal to `requestedDay`, **or**
  - `day` in range `[requestedDay - 7 days, requestedDay]` (inclusive) so the fallback query returns one doc.
- **Requested day:** Client uses `toTodayYmd()` = `new Date().toISOString().slice(0, 10)` (today in UTC). So `requestedDay` is always today UTC.
- **404 condition:** Backend returns 404 when:
  - Exact query finds no doc: `userCollection(uid, "ouraVendorSleep").where("day", "==", requestedDay).limit(1)` → empty, **and**
  - Fallback query finds no doc: `userCollection(uid, "ouraVendorSleep").where("day", ">=", fallbackStart).where("day", "<=", requestedDay).orderBy("day", "desc").limit(1)` → empty.
- **Fallback window:** `fallbackStart = dayMinus(requestedDay, 7)` (7 days before requested day, UTC). So window is `[requestedDay-7, requestedDay]` inclusive.

**C. Readiness screen shows data**

- Same as Sleep but collection `users/{uid}/ouraVendorReadiness` and GET `/users/me/oura-readiness-view?day=YYYY-MM-DD`.
- Same `requestedDay` (today UTC) and same 7-day fallback logic.

**Summary table**

| Screen / state | Required condition | Exact path / field |
|----------------|--------------------|---------------------|
| Device: connected | `users/{uid}/integrations/oura` exists, `connected === true` | Doc: `integrations/oura` |
| Device: Last sync | Same doc has `lastSyncAt` set | Field: `lastSyncAt` |
| Sleep: data | ≥1 doc in `ouraVendorSleep` with `day` in [today-7, today] (UTC) | Collection: `users/{uid}/ouraVendorSleep`, field `day` |
| Readiness: data | ≥1 doc in `ouraVendorReadiness` with `day` in [today-7, today] (UTC) | Collection: `users/{uid}/ouraVendorReadiness`, field `day` |

---

## 3. Firestore verification results

Use the affected `uid` from §1. Replace `{uid}` in paths with that value.

### A. Integration doc

**Path:** `users/{uid}/integrations/oura` (Firestore: **Firestore Database → users → (document id = uid) → integrations (subcollection) → oura (document)**).

**Verify:**

| Check | How | Proves / disproves |
|-------|-----|---------------------|
| Doc exists | Open document | If missing, status would show disconnected. |
| `connected` | Field value | Must be true for device to show "On". |
| `lastSyncAt` | Field value (Timestamp or string) | If recent: sync job completed and wrote this; does **not** prove snapshots exist. |
| `connectedAt` | Optional | When Oura was connected. |
| `failureState` | Optional | If set, may explain token/API issues. |

**Console:** Firestore → `users` → `{uid}` → `integrations` → `oura`.  
**Script (Node with firebase-admin):**

```js
const doc = await admin.firestore().doc(`users/${uid}/integrations/oura`).get();
console.log("exists:", doc.exists, "data:", doc.data());
```

---

### B. Sleep snapshots

**Path:** `users/{uid}/ouraVendorSleep` (subcollection).

**Verify:**

| Check | How | Proves / disproves |
|-------|-----|---------------------|
| Total doc count | Count documents in collection | 0 → no snapshot writes or all failed / Oura returned empty. |
| Most recent by day | Query: order by `day` desc, limit 10 | Firestore Console does not support arbitrary orderBy on subcollections without index; use script below. |
| Any doc in [requestedDay-7, requestedDay] | Compute today UTC and 7 days back; check if any doc has `day` in that range | If none, 404 is expected. |
| `day` on every doc | Inspect a few docs | Missing `day` → doc would not match exact or fallback query. |
| Doc ids | e.g. `oura_sleep_*` or Oura document ids | From ouraVendorSnapshot: `doc.id ?? \`oura_sleep_${start ?? doc.end_time}\``. |
| `fetchedAt` / `updatedAt` | Optional | Presence indicates snapshot writer ran. |

**Firestore Console:** Firestore → `users` → `{uid}` → `ouraVendorSleep`. Manually scan documents and note `day` values. For "most recent 10 by day" you need an index or a script.

**Script (firebase-admin) — list sleep snapshots and check window:**

```js
const col = admin.firestore().collection(`users/${uid}/ouraVendorSleep`);
const snap = await col.get();
const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
const today = new Date().toISOString().slice(0, 10);
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const inWindow = docs.filter(d => d.day >= sevenDaysAgo && d.day <= today);
const sortedByDay = [...docs].sort((a, b) => (b.day || "").localeCompare(a.day || ""));
console.log("total:", docs.length, "inWindow:", inWindow.length, "latest10:", sortedByDay.slice(0, 10));
```

---

### C. Readiness snapshots

**Path:** `users/{uid}/ouraVendorReadiness`.

Same checks as B, with collection name `ouraVendorReadiness`. Script same as above with collection path `users/${uid}/ouraVendorReadiness`.

---

### D. Raw events

**Path:** `users/{uid}/rawEvents`.

**Verify:**

| Check | How | Proves / disproves |
|-------|-----|---------------------|
| Recent Oura sleep raw events | Query where `sourceId == "oura"` and `kind == "sleep"` (and optionally `observedAt` in last 30 days) | If present: pull/ingest wrote raw events. If absent: fetch or write failed earlier. |
| Recent Oura HRV raw events | Same with `kind == "hrv"` | Same. |
| `observedAt`, `receivedAt` | Fields on docs | Confirm data shape. |
| provider / sourceId | From ouraIngestWrite: raw events use `sourceId: "oura"`, `provider: "manual"` | Query by `sourceId == "oura"` to get Oura-sourced events. |

**Note:** Repo writes Oura data with `provider: "manual"` and `sourceId: "oura"`. So "Oura" raw events are those with `sourceId === "oura"`.

**Script:**

```js
const col = admin.firestore().collection(`users/${uid}/rawEvents`);
const snap = await col.where("sourceId", "==", "oura").orderBy("receivedAt", "desc").limit(20).get();
console.log("oura raw count (recent 20):", snap.size);
snap.docs.forEach(d => {
  const d_ = d.data();
  console.log(d.id, d_.kind, d_.observedAt, d_.receivedAt);
});
```

If this query fails (e.g. missing index), use a simple `col.get()` and filter in memory by `sourceId === "oura"` and `kind` in `["sleep", "hrv"]`.

---

### E. Registry / scheduler participation

**Path:** `system/integrations/oura_connected/{uid}`  
(from `services/api/src/db.ts`: `ouraConnectedRegistryCollection()` → `db.collection("system").doc("integrations").collection("oura_connected")`).

**Verify:**

| Check | How | Proves / disproves |
|-------|-----|---------------------|
| Affected uid present | Document `system/integrations/oura_connected/{uid}` exists | If present, scheduled pull will include this user. If absent, only user-triggered pull-now/callback can run. |
| `connected`, `updatedAt` | Doc fields | Registry is updated on connect and revoke. |

**Console:** Firestore → `system` → `integrations` → `oura_connected` → `{uid}`.  
**Script:**

```js
const reg = await admin.firestore().doc(`system/integrations/oura_connected/${uid}`).get();
console.log("in registry:", reg.exists, reg.data());
```

---

## 4. Logs verification results

All log messages below are from repo code. Use your logging backend (e.g. Google Cloud Logging) and filter by the structured fields if available (e.g. `jsonPayload.msg`, `jsonPayload.uid`).

**Assumption:** Logs are from the same environment (e.g. staging/prod) and same project as the API/Functions. Replace `{uid}` with the affected user's uid where applicable.

### Exact log filters and what they prove

| Log / filter | Where emitted | If present | If absent |
|--------------|----------------|------------|-----------|
| `msg="oura_callback_auto_sync_error"` | integrations.ts (performOuraPullNowCore catch) | Callback sync failed for this uid (uid/rid in payload). | Callback sync did not throw (or never ran). |
| `msg="oura_callback_backfill_error"` | integrations.ts (triggerOuraBackfill catch) | Backfill promise rejected for this uid. | Backfill did not throw (or never ran). |
| `msg="oura_backfill_skipped_no_token"` uid={uid} | ouraPullNow.ts triggerOuraBackfill | Backfill exited early: no refresh token. | Token was present when backfill ran. |
| `msg="oura_backfill_skipped_misconfig"` uid={uid} | ouraPullNow.ts triggerOuraBackfill | Backfill exited: OURA_CLIENT_ID or secret missing. | Config was present. |
| `msg="oura_backfill_token_failed"` uid={uid} | ouraPullNow.ts triggerOuraBackfill | Backfill could not refresh token. | Token refresh succeeded (for backfill). |
| `msg="oura_backfill_chunk_done"` uid, startStr, endStr | ouraPullNow.ts triggerOuraBackfill | That chunk wrote raw events + snapshots. | Chunk not completed (error or not run). |
| `msg="oura_backfill_chunk_error"` uid, startStr, endStr, err | ouraPullNow.ts triggerOuraBackfill | Chunk failed (err in payload). | Chunk did not fail. |
| `msg="oura_vendor_snapshots_error"` uid, requestId | ouraPullNow.ts (outer catch around snapshot writes) | Batch snapshot write threw; lastSyncAt still updated after. | No batch snapshot exception. |
| `msg="oura_vendor_sleep_snapshot_write_error"` uid, snapshotId, day | ouraVendorSnapshot.ts (per-doc catch) | One sleep snapshot write failed. | That doc write did not throw. |
| `msg="oura_vendor_readiness_snapshot_write_error"` uid | ouraVendorSnapshot.ts | One readiness snapshot write failed. | That doc write did not throw. |
| `msg="oura_pull_now_metadata_error"` uid | ouraPullNow.ts | lastSyncAt write failed; core returns 500. | lastSyncAt write succeeded (or core failed earlier). |
| `msg="oura_pull_now_no_refresh_token"` uid | ouraPullNow.ts | No token; core returns 502. | Token was present. |
| `msg="oura_pull_now_token_refresh_failed"` uid | ouraPullNow.ts | Token refresh failed. | Token refresh succeeded. |
| `msg="oura_pull_now_fetch_failed"` uid | ouraPullNow.ts | Oura API fetch failed (sleep/readiness or other). | Fetch did not throw. |
| `msg="oura_pull_now_fetch_skipped"` uid, dataset | ouraPullNow.ts | One dataset (e.g. personal_info) skipped due to error; sleep/readiness may still have run. | That dataset was not skipped. |
| `msg="oura_pull_scheduled_start"` | onOuraPullScheduled (Functions) | Scheduled job started. | — |
| `msg="oura_pull_scheduled_done"` status, usersProcessed | onOuraPullScheduled | Scheduled pull completed; usersProcessed shows how many uids. | — |

**Structured fields to include in queries (when available):** `uid`, `rid`/`requestId`, `msg`, `startStr`, `endStr`, `err` (or `message`).

**Example GCP Logging filter (adjust for your backend):**

```
resource.type="cloud_run_revision"
jsonPayload.msg=~"oura_.*"
jsonPayload.uid="{uid}"
```

Or by message:

```
jsonPayload.msg="oura_vendor_snapshots_error"
```

```
jsonPayload.msg="oura_backfill_chunk_error"
jsonPayload.uid="{uid}"
```

**What to conclude from logs:**

- **lastSyncAt updated but no snapshots:** Look for `oura_vendor_snapshots_error` or per-doc snapshot write errors around the same time as a successful core run (no `oura_pull_now_metadata_error`, no `oura_pull_now_fetch_failed`). **PROVEN FROM EVIDENCE** if you see vendor snapshot errors and integration doc has recent lastSyncAt.
- **Backfill never ran:** No `oura_backfill_chunk_done` and no `oura_backfill_chunk_error` for this uid; possibly `oura_backfill_skipped_no_token` or `oura_callback_backfill_error`. **LIKELY FROM EVIDENCE** if skipped logs or backfill_error and no chunk_done.
- **Backfill ran but failed:** `oura_backfill_chunk_error` for one or more chunks; no or few `oura_backfill_chunk_done`. **PROVEN FROM EVIDENCE** if chunk_error present.
- **Oura API returned empty:** No snapshot write errors but zero docs; would need either a new log (e.g. "oura_fetch_sleep_count") or inference from "no snapshot errors + no docs." **UNKNOWN / NEEDS VERIFICATION** without that log.

---

## 5. Root cause determination

Evaluate each candidate against Firestore + logs. Fill "Actual evidence found" when you have run §3 and §4.

| # | Candidate state | Status | Required evidence | Actual evidence found | Conclusion |
|---|------------------|--------|--------------------|------------------------|------------|
| 1 | lastSyncAt updated but no snapshots exist | **PROVEN FROM EVIDENCE** / LIKELY / UNKNOWN | integration doc has recent lastSyncAt; ouraVendorSleep and ouraVendorReadiness empty or no doc in [today-7, today]. Optional: log oura_vendor_snapshots_error. | _[Fill after Firestore + logs]_ | If integration has lastSyncAt and both snapshot collections empty or out-of-window → **PROVEN**. |
| 2 | Raw events exist but snapshots missing | **PROVEN FROM EVIDENCE** / LIKELY / UNKNOWN | rawEvents has sourceId "oura" sleep/hrv for recent days; ouraVendorSleep/ouraVendorReadiness empty or out-of-window. | _[Fill]_ | Proves pipeline wrote raw but snapshot layer failed or was skipped. |
| 3 | Backfill never ran | **PROVEN FROM EVIDENCE** / LIKELY / UNKNOWN | No oura_backfill_chunk_done for uid; possibly oura_backfill_skipped_* or oura_callback_backfill_error. Registry may have uid (scheduler runs pull, not backfill). | _[Fill]_ | Backfill only runs from callback; if user connected long ago, backfill ran once; if logs lost, UNKNOWN. |
| 4 | Backfill ran but failed | **PROVEN FROM EVIDENCE** / LIKELY / UNKNOWN | oura_backfill_chunk_error for uid; zero or few oura_backfill_chunk_done. | _[Fill]_ | Explains missing historical docs. |
| 5 | Snapshots exist but day outside 7-day window | **PROVEN FROM EVIDENCE** / LIKELY / UNKNOWN | Docs in ouraVendorSleep/Readiness with day &lt; today-7 (e.g. only old backfill data). | _[Fill]_ | Would confirm fallback window or day logic issue. |
| 6 | Snapshots exist but day malformed/missing | **PROVEN FROM EVIDENCE** / LIKELY / UNKNOWN | Docs exist but field `day` missing or not YYYY-MM-DD. | _[Fill]_ | Read query would not match. |
| 7 | Read query should match but Firestore query/index fails | **PROVEN FROM EVIDENCE** / LIKELY / UNKNOWN | Docs in window exist; API returns 500 or throws. Check for index errors in response or logs. | _[Fill]_ | Fallback uses orderBy("day","desc"); missing index could cause 500. |
| 8 | Oura API returned empty for sleep/readiness | **UNKNOWN / NEEDS VERIFICATION** | No docs and no snapshot write errors; would need fetch-count log to prove. | _[Fill]_ | Inferred if 1+2 hold and no snapshot errors. |
| 9 | Scheduled/foreground sync runs but only writes metadata/raw events | **PROVEN FROM EVIDENCE** / LIKELY / UNKNOWN | lastSyncAt recent; rawEvents have recent Oura events; snapshot collections empty or out-of-window; optional oura_vendor_snapshots_error. | _[Fill]_ | Same as 1+2: core completes, snapshots fail or empty. |

**Root cause ranking after evidence:**

- If **1** or **9** is proven (lastSyncAt set, no snapshot docs in window): **Sync semantics / snapshot write failure** — device shows "Last sync" while screens correctly show no data because snapshots were never written or failed.
- If **2** is proven (raw events exist, snapshots missing): **Snapshot layer** — fix or harden snapshot writes and/or only set lastSyncAt when snapshots written.
- If **4** is proven (backfill chunk errors): **Backfill reliability** — improve error handling and visibility; backfill is not the only path (pull-now also writes snapshots for last 30 days).
- If **5** or **6** is proven: **Day format/window** — fix writer or query.
- If **7** is proven: **Index/query** — add index or fix query.

---

## 6. Minimal code fix

**If the verified cause is "lastSyncAt updated without snapshot success" (1 or 9):**

**Option A — Semantics/UI fix (smallest; restores trust without changing pipeline):**

- **File:** `app/(app)/settings/devices/[deviceId].tsx`  
  - Change the Oura sync label from "Last sync" to "Last refresh" (or "Last sync run") and add a short line: e.g. "Sleep and Readiness show data when we have it for the day."
- **File:** `app/(app)/recovery/sleep.tsx` and `readiness.tsx`  
  - In the empty state ("No sleep/readiness data in the last 7 days"), add: "If you just connected Oura, wait a few minutes and pull to refresh, or open the Oura app to trigger an update."

**Option B — Data pipeline fix (truthful lastSyncAt):**

- **File:** `services/api/src/routes/integrations/ouraPullNow.ts`  
  - **Function:** `performOuraPullNowCore`.  
  - **Change:** Update `lastSyncAt` only when at least one vendor snapshot was written. For example: (1) Run `writeOuraVendorSleepSnapshots` and `writeOuraVendorReadinessSnapshots` and capture whether at least one doc was written (e.g. return counts from the snapshot module, or catch and set a flag). (2) Only call `integrationRef.set({ lastSyncAt: FieldValue.serverTimestamp() }, { merge: true })` when that condition is true (or when no exception from snapshot writes).  
  - **Alternative:** If you prefer not to change when lastSyncAt is written: keep current behavior and do Option A only so the label is truthful.

**Option C — Both:** Option B + Option A (label + empty-state copy).

**If the verified cause is "snapshot writes failing" (2):**

- **Files:** `services/api/src/lib/ouraVendorSnapshot.ts`, `services/api/src/routes/integrations/ouraPullNow.ts`  
  - **Change:** (1) In ouraVendorSnapshot, ensure errors are logged with enough context (uid, requestId, day, err); consider `logger.warn` or `logger.error` for write failures. (2) In ouraPullNow, after the snapshot try/catch, if an error was caught, either do not update lastSyncAt (Option B) or write a failure entry to `users/{uid}/failures` so "sync ran but snapshots failed" is visible. (3) Fix any underlying write failure (e.g. schema, permissions) if logs show a concrete error.

**If the verified cause is "backfill failed" (4) only:**

- **File:** `services/api/src/routes/integrations/ouraPullNow.ts`  
  - **Function:** `triggerOuraBackfill`.  
  - **Change:** Log chunk errors with `logger.warn`; include startStr, endStr, err. Optionally write a failure entry per failed chunk. Do not change lastSyncAt (backfill already does not update it).

**Prefer:** Smallest fix that restores trust: **Option A** if the only issue is misleading "Last sync" with no snapshot docs. **Option B (or C)** if you want lastSyncAt to mean "last time we had at least one snapshot written."

---

## 7. Verification after patch

### Firestore

- [ ] For a test user who just synced: `users/{testUid}/integrations/oura`.lastSyncAt is recent **only** if (after Option B) at least one of `ouraVendorSleep` or `ouraVendorReadiness` has a doc in the last 7 days; or (after Option A only) no change to when lastSyncAt is set, but device label/copy updated.
- [ ] After a successful sync that writes snapshots: `users/{testUid}/ouraVendorSleep` and `users/{testUid}/ouraVendorReadiness` have at least one doc each with `day` in [today-7, today] (UTC).

### Logs

- [ ] After Option B: When Oura returns empty or snapshot writes fail, either lastSyncAt is not updated or a clear log/failure entry indicates "sync completed but no snapshots."
- [ ] No new errors from the changed code paths (e.g. no 500 from performOuraPullNowCore due to the new condition).

### App UI

- [ ] Oura device detail shows the new label ("Last refresh" or chosen copy) and optional subline.
- [ ] Sleep/Readiness empty state shows the new line about waiting/refreshing/Oura app when applicable.
- [ ] When snapshots exist for today or fallback day, Sleep and Readiness screens show data; when they do not, they show "No sleep/readiness data in the last 7 days" and the new copy.

### One test to add

- **API:** In `services/api/src/routes/__tests__/usersMe.ouraView.test.ts` (or equivalent): Add a case where `users/{uid}/integrations/oura` has recent `lastSyncAt` but `ouraVendorSleep` (and/or readiness) has no doc in the 7-day window; assert GET `/users/me/oura-sleep-view?day={today}` returns 404. Then (if Option B) add a case where lastSyncAt is only updated when at least one snapshot is written (e.g. mock snapshot writer to succeed once and assert lastSyncAt is set).
- **Client (optional):** Snapshot test that empty state renders the new copy when status is "missing."

### One regression guard

- **Invariant (e.g. in scripts/ci or docs):** "When the device shows a recent Oura Last sync/refresh, either (A) the label explicitly does not promise data on screens, or (B) lastSyncAt is only updated when at least one vendor snapshot was written in that run." Add a short comment or assertion in the code that implements Option B (e.g. next to the lastSyncAt write) stating this invariant.
