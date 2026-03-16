# Final Runtime Proof

**UID:** `1Uwhcp4OShV3QLz3VKMHW05B3033`  
**Project:** `oli-staging-fdbba`

---

## 1. Raw event script status

**Status:** **SUCCESS** — Script ran to completion with exit code 0.

**Command used:**
```bash
cd services/api
export FIREBASE_PROJECT_ID=oli-staging-fdbba
node scripts/oura-inspect-raw-events.mjs 1Uwhcp4OShV3QLz3VKMHW05B3033
```

**Credentials:** Application Default Credentials (e.g. `gcloud auth application-default login` or `GOOGLE_APPLICATION_CREDENTIALS`) were available; script connected to Firestore for project `oli-staging-fdbba`.

---

## 2. Raw event script output

```
--- Raw event counts (sourceId === 'oura') ---
{}

--- kind === 'sleep' exists ---
no

--- kind === 'hrv' exists ---
no

--- Latest 5 Oura raw events (id, kind, observedAt, receivedAt) ---
[]
```

---

## 3. Logging query status

**Status:** **BLOCKED / NOT OBTAINED** in this environment.

**What was tried:**
- `gcloud logging read` with the combined filter for this UID and all 11 Oura log messages, project `oli-staging-fdbba`, freshness 30d.

**What failed:**
- First run (sandbox): `gcloud` could not write to `~/.config/gcloud/` (PermissionError / Operation not permitted).
- Second run (full permissions): Command was sent to the background and did not return within 15s; no log output was captured.

**What you need to do:** Run the following in your own terminal (where gcloud is authenticated and can write config):

```bash
gcloud logging read 'jsonPayload.uid="1Uwhcp4OShV3QLz3VKMHW05B3033" (jsonPayload.msg="oura_vendor_snapshots_error" OR jsonPayload.msg="oura_vendor_sleep_snapshot_write_error" OR jsonPayload.msg="oura_vendor_readiness_snapshot_write_error" OR jsonPayload.msg="oura_pull_now_fetch_failed" OR jsonPayload.msg="oura_pull_now_token_refresh_failed" OR jsonPayload.msg="oura_pull_now_no_refresh_token" OR jsonPayload.msg="oura_pull_now_metadata_error" OR jsonPayload.msg="oura_callback_auto_sync_error" OR jsonPayload.msg="oura_callback_backfill_error" OR jsonPayload.msg="oura_backfill_chunk_done" OR jsonPayload.msg="oura_backfill_chunk_error")' --limit=100 --format="table(timestamp,jsonPayload.msg,jsonPayload.err)" --freshness=30d --project=oli-staging-fdbba
```

Alternatively use **Logs Explorer** in Cloud Console with:

```
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
)
```

Then paste the result (or “No matches”) into **§ 4. Matching logs** below.

---

## 4. Matching logs

**Status:** Not run in this environment; run the command or Logs Explorer filter above and paste here.

```
(paste gcloud or Logs Explorer output here, or write "No matches")
```

---

## 5. Preliminary interpretation

**From Firestore only (raw event script):**

| Finding | Interpretation |
|--------|------------------|
| Counts by kind for `sourceId === 'oura'` are `{}` | **PROVEN FROM EVIDENCE:** There are **zero** raw events with `sourceId === "oura"` for this UID in project `oli-staging-fdbba`. |
| `kind === 'sleep'` exists: **no** | **PROVEN FROM EVIDENCE:** No Oura sleep raw events. |
| `kind === 'hrv'` exists: **no** | **PROVEN FROM EVIDENCE:** No Oura HRV raw events. |
| Latest 5 Oura raw events: `[]` | **PROVEN FROM EVIDENCE:** No Oura raw events to list. |

**Discrepancy with prior context:**  
Prior context stated “Oura raw events exist for this user.” The script result shows **no** raw events with `sourceId === "oura"` for this UID in this project. So either:

- The “raw events exist” observation was for a **different project** or **different UID**, or  
- Raw events use a **different `sourceId`** in this project (script only counts `sourceId === "oura"`), or  
- Data was removed or the integration doc/lastSyncAt was written by a different code path that does not write to `rawEvents` for this user.

**Implication for snapshot collections:**  
In the current code path, sleep/readiness **vendor snapshots** are written only when `performOuraPullNowCore` has run and received non-empty `sleepDocs`/`readinessDocs`, which are then passed to `writeOuraVendorSleepSnapshots` / `writeOuraVendorReadinessSnapshots`. Raw sleep/HRV events are written from the same `sleepDocs`/`readinessDocs` via `writeOuraRawEvents`. So **if there are no Oura sleep/hrv raw events for this UID, the run(s) that set `lastSyncAt` either (1) never wrote sleep/hrv raw events (e.g. fetch returned empty, or only other datasets were written), or (2) ran in another project/environment where raw events do exist.**  

**Conclusion from Firestore alone:**  
- **PROVEN FROM EVIDENCE:** In `oli-staging-fdbba`, this UID has no raw events with `sourceId === "oura"` (no sleep, no hrv, no other Oura kinds).  
- **LIKELY FROM EVIDENCE:** For this project/UID, either sync runs never produced Oura raw events (e.g. empty sleep/readiness fetch), or the integration doc/lastSyncAt was created by a path that does not write Oura raw events here. That would explain absent `ouraVendorSleep` and `ouraVendorReadiness` without needing snapshot write errors.  
- **UNKNOWN / NEEDS VERIFICATION:** Why prior context said “Oura raw events exist” — re-verify project, UID, and whether any other `sourceId` or collection holds Oura-like data.

**After you add § 4 (matching logs):**  
- If you see **snapshot or pull-now errors** for this UID, that can show a run reached snapshot write and failed.  
- If you see **no Oura logs** for this UID, it supports that no successful Oura sync (or no sync that wrote raw events) ran for this user in this project in the last 30 days.

---

## 6. Anything blocked / missing

| Item | Status |
|------|--------|
| Firestore raw-event script | **Done** — ran successfully; output in § 2. |
| GCP Logging query | **Blocked** — gcloud could not run in this environment (config dir not writable / command did not return in time). Run the § 3 command or Logs Explorer filter yourself and paste into § 4. |
| Interpretation | **Preliminary** — based only on Firestore (§ 5). Final interpretation should be updated after you add matching logs in § 4. |

**Copy-paste block for ChatGPT (after you fill § 4):**

```
# Final Runtime Proof

## 1. Raw event script status
SUCCESS. Script ran: cd services/api && FIREBASE_PROJECT_ID=oli-staging-fdbba node scripts/oura-inspect-raw-events.mjs 1Uwhcp4OShV3QLz3VKMHW05B3033

## 2. Raw event script output
--- Raw event counts (sourceId === 'oura') ---
{}
--- kind === 'sleep' exists ---
no
--- kind === 'hrv' exists ---
no
--- Latest 5 Oura raw events (id, kind, observedAt, receivedAt) ---
[]

## 3. Logging query status
[BLOCKED in audit environment. Run the gcloud/Logs Explorer command in §3 above and paste result here.]

## 4. Matching logs
(paste your log output or "No matches")

## 5. Preliminary interpretation
See §5 in FINAL_RUNTIME_PROOF_RESULTS.md. Update after §4 is filled.

## 6. Anything blocked / missing
Logging: run gcloud or Logs Explorer manually; paste into §4.
```
