# Saved Log Queries (Cloud Run)

All queries scoped to:
- service_name="oli-api"
- resource.type="cloud_run_revision"

---

## 1. By requestId

```bash
gcloud logging read \
  'resource.type="cloud_run_revision"
   AND resource.labels.service_name="oli-api"
   AND jsonPayload.rid="<RID>"' \
  --limit=200 \
  --format="value(timestamp,jsonPayload.level,jsonPayload.msg,jsonPayload.code,jsonPayload.err,httpRequest.status)"
2. Pull-Now Failures
gcloud logging read \
  'resource.type="cloud_run_revision"
   AND resource.labels.service_name="oli-api"
   AND jsonPayload.msg="withings_pull_now_fetch_failed"' \
  --limit=50 \
  --format="value(timestamp,jsonPayload.rid,jsonPayload.uid,jsonPayload.code,jsonPayload.err)"
3. Token Refresh Failures
gcloud logging read \
  'resource.type="cloud_run_revision"
   AND resource.labels.service_name="oli-api"
   AND jsonPayload.code="WITHINGS_TOKEN_REFRESH_FAILED"' \
  --limit=50 \
  --format="value(timestamp,jsonPayload.rid,jsonPayload.uid,jsonPayload.err)"
4. Raw Events 400s
gcloud logging read \
  'resource.type="cloud_run_revision"
   AND resource.labels.service_name="oli-api"
   AND httpRequest.status=400' \
  --limit=50 \
  --format="value(timestamp,jsonPayload.rid,jsonPayload.path,jsonPayload.msg)"
5. Firestore Index Errors
gcloud logging read \
  'resource.type="cloud_run_revision"
   AND resource.labels.service_name="oli-api"
   AND jsonPayload.msg="raw_events_list_firestore_index_missing"' \
  --limit=50
6. Backfill Errors
gcloud logging read \
  'resource.type="cloud_run_revision"
   AND resource.labels.service_name="oli-api"
   AND jsonPayload.msg="withings_backfill_failure_write_error"' \
  --limit=50
7. Invoker Auth Rejections
gcloud logging read \
  'resource.type="cloud_run_revision"
   AND resource.labels.service_name="oli-api"
   AND jsonPayload.msg="invoker_auth_rejected"' \
  --limit=50