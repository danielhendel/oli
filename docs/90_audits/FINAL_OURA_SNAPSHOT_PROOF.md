# Final Oura Snapshot Proof

**UID:** `1Uwhcp4OShV3QLz3VKMHW05B3033`

**Note:** Firestore and GCP Logging are not accessible from the audit environment. The sections below require you to run the script and log commands in **§ Copy-paste commands**, then paste the outputs into **§ Raw event kinds** and **§ Matching logs**. Conclusions are then drawn from that evidence.

---

## 1. Raw event kinds

**How to obtain:** Run the Firestore inspection script from `services/api` with project and credentials set (see § Copy-paste commands). Paste the script output here.

**Placeholder — replace with script output:**

```
--- Raw event counts (sourceId === 'oura') ---
{ ... }

--- kind === 'sleep' exists ---
yes | no

--- kind === 'hrv' exists ---
yes | no

--- Latest 5 Oura raw events (id, kind, observedAt, receivedAt) ---
[ ... ]
```

**Interpretation (after you have output):**

| Observation | Conclusion |
|-------------|------------|
| Counts by kind show `sleep` and/or `hrv` with count ≥ 1 | **PROVEN FROM EVIDENCE:** Fetch returned non-empty sleep/readiness; snapshot writers were invoked with non-empty arrays. Failure is at snapshot write (threw or extract returned null for all). |
| Counts by kind show only `oura_raw`, `steps`, `workout`, etc. — no `sleep`, no `hrv` | **LIKELY FROM EVIDENCE:** Sleep/readiness fetch returned empty for the run(s) that produced raw events. Snapshot writers were called with `[]` and wrote 0 docs (no throw, no log). |
| No Oura raw events at all | **UNKNOWN:** Contradicts prior statement that "raw Oura events exist." Re-verify collection path and sourceId filter. |

---

## 2. Matching logs

**How to obtain:** Run each GCP Logging query (or the combined query) in § Copy-paste commands for the UID and time window. Paste the exact log entries (or "No matches") for each message below.

**Placeholder — replace with your log results:**

| Log message | Exact matches (timestamp, uid, rid, err, startStr, endStr — or "No matches") |
|-------------|-------------------------------------------------------------------------------|
| `oura_vendor_snapshots_error` | |
| `oura_vendor_sleep_snapshot_write_error` | |
| `oura_vendor_readiness_snapshot_write_error` | |
| `oura_pull_now_fetch_failed` | |
| `oura_pull_now_token_refresh_failed` | |
| `oura_pull_now_no_refresh_token` | |
| `oura_pull_now_metadata_error` | |
| `oura_callback_auto_sync_error` | |
| `oura_callback_backfill_error` | |
| `oura_backfill_chunk_done` | |
| `oura_backfill_chunk_error` | |

**Interpretation (after you have results):**

| If you see | That proves |
|------------|-------------|
| One or more `oura_vendor_snapshots_error` or per-doc snapshot write errors for this uid | **PROVEN FROM EVIDENCE:** Snapshot write threw; exception was caught and logged; lastSyncAt was still updated (code path in ouraPullNow.ts). |
| No snapshot-related logs for this uid | **LIKELY FROM EVIDENCE:** Either (1) snapshot writers were called with empty arrays (no write, no log), or (2) logs not available for this uid/time, or (3) extract returned null for every doc (no set(), no throw). |
| `oura_pull_now_fetch_failed` for this uid | That run did not reach raw write or lastSyncAt (returns 502). So a different run set lastSyncAt. **Timeline.** |
| `oura_backfill_chunk_done` for this uid | At least one backfill chunk completed; would have written snapshot docs. If snapshot collections still empty, path/uid mismatch or backfill ran for different project. |
| `oura_backfill_chunk_error` for this uid | That chunk failed; no snapshot docs from that chunk. |

---

## 3. Root cause determination

**After you fill in §1 and §2**, use this table.

| Scenario | Raw events (sleep/hrv) | Snapshot logs | Status | Conclusion |
|----------|------------------------|---------------|--------|------------|
| A | sleep and/or hrv exist | ≥1 snapshot error for uid | **PROVEN FROM EVIDENCE** | Snapshot write threw; errors swallowed; lastSyncAt updated. Root cause: snapshot write failure + sync semantics. |
| B | sleep and/or hrv exist | No snapshot errors | **LIKELY FROM EVIDENCE** | Extract returned null for all docs (e.g. day missing/wrong), or logs missing. Investigate Oura payload shape / day field. |
| C | No sleep, no hrv (only other kinds) | No snapshot errors | **LIKELY FROM EVIDENCE** | Fetch returned empty sleep/readiness; snapshot writers got `[]`; wrote 0 docs; lastSyncAt still updated. Root cause: empty fetch + sync semantics. |
| D | No sleep, no hrv | Snapshot errors | **UNKNOWN** | Unexpected (no sleep/hrv raw events implies fetch empty, so snapshot writers get `[]` and don’t throw). Re-check raw event filter and log uid. |
| E | No Oura raw events | — | **UNKNOWN / NEEDS VERIFICATION** | Re-verify Firestore path and that "raw Oura events exist" referred to this uid. |

**Single-line root cause (choose after evidence):**

- **If A:** Snapshot write threw for this user; errors were caught and logged; lastSyncAt was still updated. **PROVEN FROM EVIDENCE** (once logs show snapshot errors for this uid).
- **If B:** Snapshot writers ran with non-empty data but wrote zero docs (extract returned null for all). **LIKELY FROM EVIDENCE** (once raw events show sleep/hrv and no snapshot errors).
- **If C:** Sleep/readiness fetch returned empty; snapshot writers were called with `[]`; lastSyncAt was updated anyway. **LIKELY FROM EVIDENCE** (once raw events show no sleep/hrv).
- **If D or E:** **UNKNOWN / NEEDS VERIFICATION.**

---

## 4. Minimal patch recommendation

**Independent of which scenario (A/B/C) is true:**

1. **Trust semantics (do in all cases)**  
   - **File:** `app/(app)/settings/devices/[deviceId].tsx`  
   - Change Oura label from "Last sync" to "Last refresh" and add one line: e.g. "Sleep and Readiness show data when we have it for the day."  
   - **Files:** `app/(app)/recovery/sleep.tsx`, `readiness.tsx`  
   - In empty state, add: "If you just connected Oura, wait a few minutes and pull to refresh, or open the Oura app to trigger an update."

2. **Data pipeline (recommended)**  
   - **File:** `services/api/src/routes/integrations/ouraPullNow.ts`  
   - In `performOuraPullNowCore`, update `lastSyncAt` only when at least one vendor snapshot was written in this run (e.g. snapshot writers return counts; only set lastSyncAt when sleepWritten + readinessWritten > 0).  
   - **File:** `services/api/src/lib/ouraVendorSnapshot.ts`  
   - Have `writeOuraVendorSleepSnapshots` and `writeOuraVendorReadinessSnapshots` return `{ written: number }`; in pull-now use that to gate lastSyncAt.

3. **If scenario A (snapshot write errors)**  
   - Upgrade per-doc snapshot write logs to `logger.warn` or `logger.error` in `ouraVendorSnapshot.ts`.  
   - Optionally write a failure entry to `users/{uid}/failures` when the snapshot batch throws.

4. **If scenario B (extract null for all)**  
   - Log when extract returns null (e.g. doc id + "no day") in `ouraVendorSnapshot.ts`; inspect Oura API payload for sleep/readiness and fix day extraction if needed.

5. **If scenario C (empty fetch)**  
   - Add a log in `performOuraPullNowCore` after fetch with sleep/readiness array lengths (e.g. `logger.info({ msg: "oura_fetch_counts", uid, requestId, sleepCount: sleepDocs.length, readinessCount: readinessDocs.length })`) so future runs are observable.

---

## 5. Copy-paste commands

### Firestore: raw events for UID

From repo root:

```bash
cd services/api
export FIREBASE_PROJECT_ID=oli-staging-fdbba
# Or: export GOOGLE_CLOUD_PROJECT=oli-staging-fdbba
# Ensure credentials: gcloud auth application-default login
# Or: export GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json

node scripts/oura-inspect-raw-events.mjs 1Uwhcp4OShV3QLz3VKMHW05B3033
```

Paste the full output into **§ 1. Raw event kinds** above.

### GCP Logging: all Oura messages for this UID

In [Google Cloud Console → Logging → Logs Explorer](https://console.cloud.google.com/logs/query), use:

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

Set time range to **Last 30 days** (or 14). Copy each matching log line (or note "No matches") into **§ 2. Matching logs**.

### gcloud (alternative)

```bash
gcloud logging read '
jsonPayload.uid="1Uwhcp4OShV3QLz3VKMHW05B3033"
(jsonPayload.msg=~"^oura_vendor_" OR jsonPayload.msg=~"^oura_pull_now_" OR jsonPayload.msg=~"^oura_callback_" OR jsonPayload.msg=~"^oura_backfill_")
' --limit=200 --format="table(timestamp, jsonPayload.msg, jsonPayload.err)" --freshness=30d
```

Replace project if needed: `gcloud config set project oli-staging-fdbba` (or your project).

### Per-message filters (if you want to run one at a time)

| Message | Filter |
|---------|--------|
| oura_vendor_snapshots_error | `jsonPayload.uid="1Uwhcp4OShV3QLz3VKMHW05B3033"` `jsonPayload.msg="oura_vendor_snapshots_error"` |
| oura_vendor_sleep_snapshot_write_error | `jsonPayload.uid="1Uwhcp4OShV3QLz3VKMHW05B3033"` `jsonPayload.msg="oura_vendor_sleep_snapshot_write_error"` |
| oura_vendor_readiness_snapshot_write_error | `jsonPayload.uid="1Uwhcp4OShV3QLz3VKMHW05B3033"` `jsonPayload.msg="oura_vendor_readiness_snapshot_write_error"` |
| oura_pull_now_fetch_failed | `jsonPayload.uid="1Uwhcp4OShV3QLz3VKMHW05B3033"` `jsonPayload.msg="oura_pull_now_fetch_failed"` |
| oura_pull_now_token_refresh_failed | `jsonPayload.uid="1Uwhcp4OShV3QLz3VKMHW05B3033"` `jsonPayload.msg="oura_pull_now_token_refresh_failed"` |
| oura_pull_now_no_refresh_token | `jsonPayload.uid="1Uwhcp4OShV3QLz3VKMHW05B3033"` `jsonPayload.msg="oura_pull_now_no_refresh_token"` |
| oura_pull_now_metadata_error | `jsonPayload.uid="1Uwhcp4OShV3QLz3VKMHW05B3033"` `jsonPayload.msg="oura_pull_now_metadata_error"` |
| oura_callback_auto_sync_error | `jsonPayload.uid="1Uwhcp4OShV3QLz3VKMHW05B3033"` `jsonPayload.msg="oura_callback_auto_sync_error"` |
| oura_callback_backfill_error | `jsonPayload.uid="1Uwhcp4OShV3QLz3VKMHW05B3033"` `jsonPayload.msg="oura_callback_backfill_error"` |
| oura_backfill_chunk_done | `jsonPayload.uid="1Uwhcp4OShV3QLz3VKMHW05B3033"` `jsonPayload.msg="oura_backfill_chunk_done"` |
| oura_backfill_chunk_error | `jsonPayload.uid="1Uwhcp4OShV3QLz3VKMHW05B3033"` `jsonPayload.msg="oura_backfill_chunk_error"` |

---

**Summary:** Run the Firestore script and the log query (or gcloud command), paste the results into §1 and §2, then read off the scenario (A/B/C) and the single-line root cause in §3, and apply the matching patches in §4.
