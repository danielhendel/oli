# Oura Backfill Truth Audit — Runbook

**Affected UID:** `1Uwhcp4OShV3QLz3VKMHW05B3033`  
**Project:** `oli-staging-fdbba`

Run this in an environment where you have:
- Firebase Admin (or `gcloud auth application-default login`) for project `oli-staging-fdbba`
- Network access to Firestore and (optional) Cloud Logging

---

## 1. Firestore integration + snapshot collections

From repo root or `services/api`:

```bash
cd services/api
export FIREBASE_PROJECT_ID=oli-staging-fdbba
node scripts/oura-backfill-truth-audit.mjs "1Uwhcp4OShV3QLz3VKMHW05B3033" oli-staging-fdbba
```

This prints:
- **Integration state:** `users/1Uwhcp4OShV3QLz3VKMHW05B3033/integrations/oura` fields (connected, lastRefreshAt, lastSyncAt, lastSnapshotAt, backfillStatus, backfillStartedAt, backfillCompletedAt, backfillFailedAt, lastBackfillError).
- **Snapshot collections:** exists + total + latest 5 by day for `ouraVendorSleep` and `ouraVendorReadiness`.
- JSON block at the end for copy-paste.

---

## 2. Backfill / fetch / snapshot logs

With `gcloud` configured for `oli-staging-fdbba`:

```bash
export PROJECT=oli-staging-fdbba
export UID="1Uwhcp4OShV3QLz3VKMHW05B3033"

gcloud logging read \
  "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"oli-api\" AND jsonPayload.uid=\"$UID\" AND (jsonPayload.msg=\"oura_backfill_started\" OR jsonPayload.msg=\"oura_backfill_completed\" OR jsonPayload.msg=\"oura_backfill_failed\" OR jsonPayload.msg=\"oura_backfill_chunk_done\" OR jsonPayload.msg=\"oura_backfill_chunk_error\" OR jsonPayload.msg=\"oura_fetch_counts\" OR jsonPayload.msg=\"oura_ingest_item_counts\" OR jsonPayload.msg=\"oura_vendor_snapshots_done\" OR jsonPayload.msg=\"oura_vendor_sleep_snapshot_write_error\" OR jsonPayload.msg=\"oura_vendor_readiness_snapshot_write_error\")" \
  --project=$PROJECT \
  --limit=100 \
  --format="table(timestamp,jsonPayload.msg,jsonPayload.sleepDocCount,jsonPayload.readinessDocCount,jsonPayload.sleepItemCount,jsonPayload.hrvItemCount,jsonPayload.sleepWritten,jsonPayload.readinessWritten,jsonPayload.err)"
```

Or run the script with logs enabled (same credentials must allow Logging read):

```bash
RUN_LOGS=1 node scripts/oura-backfill-truth-audit.mjs "1Uwhcp4OShV3QLz3VKMHW05B3033" oli-staging-fdbba
```

---

## 3. Fill the audit report

Copy the output into the template below. Then classify **Root cause** and **Minimal next fix** from evidence only.

---

# Oura Backfill Truth Audit

**UID:** 1Uwhcp4OShV3QLz3VKMHW05B3033  
**Project:** oli-staging-fdbba

## Integration state

*(Paste from script: integration JSON or "Doc does not exist.")*

| Field | Value |
|-------|--------|
| connected | |
| lastRefreshAt | |
| lastSyncAt | |
| lastSnapshotAt | |
| backfillStatus | |
| backfillStartedAt | |
| backfillCompletedAt | |
| backfillFailedAt | |
| lastBackfillError | |

## Snapshot collections

| Collection | Exists | Total docs | Latest 5 by day |
|------------|--------|------------|-----------------|
| users/{uid}/ouraVendorSleep | | | |
| users/{uid}/ouraVendorReadiness | | | |

## Matching logs

*(Paste gcloud output or RUN_LOGS=1 script output.)*

- oura_backfill_started: …
- oura_backfill_completed: …
- oura_backfill_failed: …
- oura_backfill_chunk_done: …
- oura_backfill_chunk_error: …
- oura_fetch_counts: …
- oura_ingest_item_counts: …
- oura_vendor_snapshots_done: …
- oura_vendor_sleep_snapshot_write_error: …
- oura_vendor_readiness_snapshot_write_error: …

## Root cause

*(Choose one based only on evidence. Mark PROVEN / LIKELY / UNKNOWN.)*

- **backfill failed** — backfillStatus=failed and/or oura_backfill_failed in logs; lastBackfillError set.
- **backfill completed but wrote zero usable data** — backfillStatus=completed, lastSnapshotAt null, snapshot collections empty or no docs in [today-7, today].
- **snapshot extraction dropped all records** — oura_fetch_counts / oura_ingest_item_counts show >0 sleep/readiness items but oura_vendor_snapshots_done shows written=0 or snapshot collections empty.
- **snapshot writes failed** — oura_vendor_sleep_snapshot_write_error or oura_vendor_readiness_snapshot_write_error in logs.
- **fetch returned zero sleep/readiness docs** — oura_fetch_counts shows sleepDocCount=0 and readinessDocCount=0.
- **unknown** — not enough evidence; note what is missing.

## Minimal next fix

*(One concrete action based on root cause.)*

- If backfill failed: fix cause in lastBackfillError (e.g. token, misconfig), then re-run backfill or surface retry in UI.
- If backfill completed, zero data: confirm Oura API returned data in window; if API returns data but we wrote 0, fix snapshot mapping/write.
- If snapshot extraction dropped all: fix day extraction or filters in ouraVendorSnapshot (e.g. missing day, wrong window).
- If snapshot writes failed: fix Firestore permissions or write path; retry backfill.
- If fetch returned zero: confirm token/scope and Oura account has sleep/readiness; no code fix if account has no data.
