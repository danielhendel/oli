# Oura Backfill Truth Audit

**UID:** 1Uwhcp4OShV3QLz3VKMHW05B3033  
**Project:** oli-staging-fdbba

---

## Integration state

*Run the audit script to fill this section. From `services/api`:*
*`FIREBASE_PROJECT_ID=oli-staging-fdbba node scripts/oura-backfill-truth-audit.mjs "1Uwhcp4OShV3QLz3VKMHW05B3033" oli-staging-fdbba`*

| Field | Value |
|-------|--------|
| connected | *(from Firestore)* |
| lastRefreshAt | *(from Firestore)* |
| lastSyncAt | *(from Firestore)* |
| lastSnapshotAt | *(from Firestore)* |
| backfillStatus | *(from Firestore)* |
| backfillStartedAt | *(from Firestore)* |
| backfillCompletedAt | *(from Firestore)* |
| backfillFailedAt | *(from Firestore)* |
| lastBackfillError | *(from Firestore)* |

---

## Snapshot collections

| Collection | Exists | Total docs | Latest 5 docs by day |
|------------|--------|------------|----------------------|
| users/{uid}/ouraVendorSleep | *(yes/no)* | *(count)* | *(id, day, score, fetchedAt)* |
| users/{uid}/ouraVendorReadiness | *(yes/no)* | *(count)* | *(id, day, score, fetchedAt)* |

---

## Matching logs

*Run with `RUN_LOGS=1` or use the gcloud command in `OURA_BACKFILL_TRUTH_AUDIT_RUNBOOK.md`.*

| Log message | Present? | Summary (counts / error) |
|-------------|----------|---------------------------|
| oura_backfill_started | | |
| oura_backfill_completed | | |
| oura_backfill_failed | | |
| oura_backfill_chunk_done | | |
| oura_backfill_chunk_error | | |
| oura_fetch_counts | | sleepDocCount, readinessDocCount |
| oura_ingest_item_counts | | sleepItemCount, hrvItemCount |
| oura_vendor_snapshots_done | | attempted/written/skipped/errors |
| oura_vendor_sleep_snapshot_write_error | | |
| oura_vendor_readiness_snapshot_write_error | | |

---

## Root cause

*(Classify after filling Integration state, Snapshot collections, and Matching logs.)*

**Status:** UNKNOWN / NEEDS VERIFICATION — Evidence was not run in this environment (Firestore/Logging not reachable). Run the script and log queries per `OURA_BACKFILL_TRUTH_AUDIT_RUNBOOK.md`, then set one of:

- **backfill failed** — PROVEN FROM EVIDENCE if backfillStatus=failed and lastBackfillError set and/or oura_backfill_failed in logs.
- **backfill completed but wrote zero usable data** — LIKELY FROM EVIDENCE if backfillStatus=completed, lastSnapshotAt null, both snapshot collections empty.
- **snapshot extraction dropped all records** — LIKELY FROM EVIDENCE if fetch/ingest counts > 0 but snapshot written=0 and no write_error logs.
- **snapshot writes failed** — PROVEN FROM EVIDENCE if oura_vendor_*_snapshot_write_error in logs.
- **fetch returned zero sleep/readiness docs** — PROVEN FROM EVIDENCE if oura_fetch_counts shows sleepDocCount=0 and readinessDocCount=0.
- **unknown** — if logs are empty or integration doc missing.

---

## Minimal next fix

*(Set after root cause is classified.)*

- **If backfill failed:** Address lastBackfillError (token, config, or API); optionally add retry path or manual backfill trigger.
- **If backfill completed, zero data:** Verify Oura API returns data for the window; if API has data but we wrote 0, fix snapshot mapping or write path.
- **If snapshot extraction dropped all:** Fix day extraction or filters in `services/api/src/lib/ouraVendorSnapshot.ts` (e.g. bed_time/end_time/day).
- **If snapshot writes failed:** Fix Firestore rules or write path; re-run backfill.
- **If fetch returned zero:** Confirm Oura token/scope and that the account has sleep/readiness data; no code change if account has no data.
