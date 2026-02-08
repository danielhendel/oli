# Sprint 0 Failure Audit — Final Report

**Project:** Oli Health OS  
**Sprint:** 0  
**Date Closed:** 2026-02-07  
**Owner:** Daniel Hendel  

---

## Executive Summary

Sprint 0 uncovered a multi-layer failure that prevented derived truth from appearing in the Command Center after logging weight.

This was not a single bug. It was a chained system failure across:

1. Client ingest contract (missing required `timeZone`)
2. API validation (fail-closed behavior)
3. Eventarc → Cloud Run authentication (Gen2 trigger invocation blocked)
4. Fact-only derived truth triggering semantics (weight inputs do not emit canonical events)

All issues have been fixed, deployed, and **proven in production** using runtime logs and user-visible UI evidence.

Sprint 0 is officially **closed and locked**.

---

## Failure Timeline

### Symptom
- Logging weight showed “(syncing…)” indefinitely.
- Command Center remained empty:
  - Events: 0
  - Facts: —
  - Context: —
- No failure signal was visible in the app UI at the time.

---

## Root Causes (Verified)

### 1) Client ingest contract violation

- `timeZone` was missing at the top-level ingest body for weight logs.
- API rejected the request with `400 TIMEZONE_REQUIRED`.
- No `rawEvent` was written.

**Fix**
- Added `timeZone` to ingest body in `lib/api/usersMe.ts`.

---

### 2) Eventarc → Cloud Run authentication failure (critical)

Even after ingest succeeded, Gen2 trigger delivery was blocked.

**Evidence**
- Cloud Run request logs for the Gen2 backend showed repeated `403` responses:
  > “The request was not authenticated …”

**Cause**
- The Eventarc trigger service account lacked `roles/run.invoker` on the Cloud Run service `onraweventcreated`.
- Affected trigger: `onraweventcreated-081537`.

**Fix (manual IAM change)**
```bash
gcloud run services add-iam-policy-binding onraweventcreated \
  --region us-central1 \
  --member="serviceAccount:oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com" \
  --role="roles/run.invoker"

gcloud run services add-iam-policy-binding onraweventcreated \
  --region us-central1 \
  --member="serviceAccount:service-1010034434203@gcp-sa-eventarc.iam.gserviceaccount.com" \
  --role="roles/run.invoker"
