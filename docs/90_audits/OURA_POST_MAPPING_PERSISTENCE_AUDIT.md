# Oura Post-Mapping Persistence Audit

**UID:** `1Uwhcp4OShV3QLz3VKMHWo5B3033`  
**Request IDs of interest:** `88322dcd-8e9c-4f92-9516-20ed77cbabe7`, `e9bc195c-6239-43ce-b5bc-3f92196a6807`  
**Known runtime evidence:** Runs at ~16:27 and ~16:28; `oura_fetch_counts` (sleepDocCount: 38, readinessDocCount: 30) and `oura_ingest_item_counts` (sleepItemCount: 38, hrvItemCount: 30); pull-now still returns 504; lastRefreshAt null; ouraVendorSleep missing; ouraVendorReadiness only has earlier backfill data.

---

## 1. Matching phase logs

**Evidence gathered:** Phase logs were **not** fetched in this environment (gcloud logging read failed due to local sandbox/credentials). Use the commands below on a machine with `gcloud` and project access to fill in which phase logs appear for this UID and the given requestIds.

**Command to list phase logs for this UID (all requestIds):**
```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="oli-api" AND jsonPayload.uid="1Uwhcp4OShV3QLz3VKMHWo5B3033" AND (
    jsonPayload.msg="oura_raw_events_write_start" OR
    jsonPayload.msg="oura_raw_events_write_done" OR
    jsonPayload.msg="oura_vendor_snapshots_start" OR
    jsonPayload.msg="oura_vendor_snapshots_done" OR
    jsonPayload.msg="oura_metadata_write_start" OR
    jsonPayload.msg="oura_metadata_write_done"
  )' \
  --project=oli-staging-fdbba --limit=50 --format="table(timestamp,jsonPayload.msg,jsonPayload.requestId)" --freshness=1d
```

**Command to filter by requestId (e.g. 88322dcd-8e9c-4f92-9516-20ed77cbabe7):**
```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="oli-api" AND jsonPayload.uid="1Uwhcp4OShV3QLz3VKMHWo5B3033" AND jsonPayload.requestId="88322dcd-8e9c-4f92-9516-20ed77cbabe7" AND (
    jsonPayload.msg="oura_fetch_counts" OR
    jsonPayload.msg="oura_ingest_item_counts" OR
    jsonPayload.msg="oura_raw_events_write_start" OR
    jsonPayload.msg="oura_raw_events_write_done" OR
    jsonPayload.msg="oura_vendor_snapshots_start" OR
    jsonPayload.msg="oura_vendor_snapshots_done" OR
    jsonPayload.msg="oura_metadata_write_start" OR
    jsonPayload.msg="oura_metadata_write_done"
  )' \
  --project=oli-staging-fdbba --limit=20 --format=json
```

**How to interpret (once you have log output):**
- **Last phase seen** = timeout is *after* that phase, *during* the next.
- If you see `oura_raw_events_write_start` but not `oura_raw_events_write_done` → timeout **during raw writes**.
- If you see `oura_raw_events_write_done` but not `oura_vendor_snapshots_done` → timeout **during snapshot writes**.
- If you see `oura_vendor_snapshots_done` but not `oura_metadata_write_done` → timeout **during metadata write**.
- If you see `oura_metadata_write_done` → request completed; 504 may be from gateway/client after response sent.

**Optional:** Run the audit script with logs (on a host with gcloud and project access):
```bash
cd services/api && RUN_LOGS=1 node scripts/oura-backfill-truth-audit.mjs "1Uwhcp4OShV3QLz3VKMHWo5B3033" "oli-staging-fdbba"
```
The script now includes the phase log message names in its log query.

---

## 2. Recent raw events truth

**Source:** Firestore read via `services/api/scripts/oura-backfill-truth-audit.mjs` for project `oli-staging-fdbba` at audit time.

| Kind   | sourceId=oura | total | latestReceivedAt (ISO)     |
|--------|----------------|-------|----------------------------|
| sleep  | yes            | **38**| **2026-03-15T16:05:17.337Z** |
| hrv    | yes            | 88    | 2026-03-15T15:39:38.731Z   |

**Interpretation:**
- **New Oura sleep raw events exist** from a run at ~16:05 (38 docs, matching the 38 sleep ingest items). So at least one pull-now run **completed raw-event writes for sleep** and persisted them before the request was cut off.
- **HRV** raw events: 88 total; latest receivedAt is 15:39:38, consistent with backfill. No newer hrv raw events with receivedAt ~16:05 or ~16:27 in this snapshot, so either (1) the run that wrote 38 sleep timed out before or during hrv raw writes (sleep and hrv run in parallel; if the request timed out after sleep finished, hrv may be partial or not committed), or (2) hrv from that run were all already-existing (idempotency). The critical fact is: **sleep raw writes for 38 items did complete** for a run at 16:05.

**Conclusion:** Raw-event writes (at least for sleep) have run to completion for at least one request. The current 504 boundary is **not** “before raw writes start”; it is **during or after** raw writes. Given lastRefreshAt is null and ouraVendorSleep is empty, persistence stopped before snapshot writes (or metadata) completed.

---

## 3. Timeout point

**Classification (from Firestore evidence):** **After raw writes, during snapshot writes.**

**Reasoning:**
1. **Raw writes:** 38 Oura sleep raw events with `receivedAt` 2026-03-15T16:05:17 prove that a run at ~16:05 reached and completed the raw-event write phase for sleep (and the handler had already passed `oura_ingest_item_counts` and entered `writeOuraRawEvents`). So the timeout is **not** “before raw writes start” and **not** “during raw writes” in the sense that raw writes did finish for that run.
2. **Snapshot writes:** ouraVendorSleep has 0 docs; ouraVendorReadiness has 88 docs, all with `fetchedAt` 2026-03-15T15:39:41 (backfill). No vendor sleep or readiness docs with a 16:05 or 16:27/16:28 timestamp. So snapshot writes for pull-now **did not** complete (or did not start) before the request timed out.
3. **Metadata:** lastRefreshAt is null, so the metadata write (`integrationRef.set({ lastRefreshAt, ... })`) never ran to completion for any pull-now run that reached it.

Therefore the **first** failure boundary is: the request is **timed out after raw writes, during snapshot writes** (either inside `writeOuraVendorSleepSnapshots` / `writeOuraVendorReadinessSnapshots`, or the gateway kills the request before `oura_vendor_snapshots_done` is logged). For the 16:27/16:28 runs, the same conclusion holds if they still return 504 with no new snapshots and no lastRefreshAt: timeout is again after mapping and either during raw writes or during snapshot writes; combined with the 16:05 evidence (raw sleep written, no snapshots), the consistent reading is **timeout during snapshot writes** (or before snapshot writes complete).

**If phase logs are later available:**  
- If logs show `oura_raw_events_write_done` and **no** `oura_vendor_snapshots_done` for the same requestId → confirms **during snapshot writes**.  
- If logs show `oura_raw_events_write_start` but **no** `oura_raw_events_write_done` for 16:27/16:28 → then for *those* runs timeout is **during raw writes** (the 16:05 run would still be an earlier run that got past raw writes and then timed out in snapshots).

---

## 4. Minimal next fix

**Target:** Reduce or bypass the snapshot-write phase on the critical path so the request can complete within the gateway/client timeout, or ensure snapshot writes finish in time.

**Options (minimal, in order of preference):**

1. **Shorten snapshot write time**  
   Confirm vendor snapshot writers use batched commits (they do in current code). If the batch size or number of batches is still large, consider a single batch for 38+30 docs (under 500) so one `batch.commit()` covers all sleep+readiness for the run, or ensure batches are not being retried sequentially in a way that doubles time. Verify there are no extra round-trips (e.g. per-doc reads) in the snapshot path.

2. **Raise timeout again**  
   If the gateway or client is still the limit (e.g. 90 s not deployed or not enough), increase backend deadline and/or client `timeoutMs` once more so that raw + snapshot + metadata all fit. Prefer this only if (1) is already optimized.

3. **Move snapshot writes off the request path**  
   Return 200/202 after raw writes (and optionally after metadata with a “sync in progress” flag), then perform vendor snapshot writes in a fire-and-forget continuation or a small background task. Ensures the HTTP response is sent before snapshot work, so gateway timeout does not cut off the request. Idempotency and existing semantics for snapshots can be preserved (e.g. same merge behavior, same collections).

4. **Add observability**  
   Ensure `oura_vendor_snapshots_start` and `oura_vendor_snapshots_done` (and any batch-level logs in the snapshot module) are present and that you run the phase-log query above for this UID/requestIds after the next deploy to confirm the exact phase where time is spent.

**Recommended next step:** Verify gateway and client are using the 90 s timeout; then run the phase-log command in §1 for this UID (and if possible for requestIds `88322dcd-8e9c-4f92-9516-20ed77cbabe7` and `e9bc195c-6239-43ce-b5bc-3f92196a6807`) and paste results. If logs confirm “raw_events_write_done” and no “vendor_snapshots_done”, implement (1) and/or (3) above.
