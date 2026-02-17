# Phase 3 Runtime Automation — Root Cause Report

**Purpose:** Identify exact cause of 401/403 when scheduler calls `POST /integrations/withings/backfill`.  
**Status:** Audit instrumentation added; conclusion from runtime logs or repro script.

---

## 1) Observed 401 evidence

- **Service:** Cloud Run oli-api (`oli-api-1010034434203.us-central1.run.app`).
- **Endpoint:** `POST /integrations/withings/backfill`.
- **Timestamps:** 17:21, 17:36, 17:51 UTC (scheduler every 15 min).
- **Response:** 401 Unauthorized (from Cloud Run or from API; see below).
- **Known:** IAM correct (oli-functions-runtime has roles/run.invoker); env set: `WITHINGS_PULL_INVOKER_EMAILS`, `INVOKER_TOKEN_AUDIENCE`, `OLI_API_BASE_URL`. Scheduler reaches API (userAgent google-api-nodejs-client).

**401 vs 403:** Cloud Run returns **401** when the ID token is missing or invalid (e.g. wrong audience). Our API middleware returns **403** with a JSON body (`error.code`). If the response is 401 with no JSON body, the request was likely rejected by Cloud Run before reaching our app. If the response is 403 with our `error.code`, the request reached our app and the diagnostic log will be present.

---

## 2) Audit instrumentation added

- **File:** `services/api/src/middleware/invokerAuth.ts`
- **Behavior:** On every **rejection** (no success-path logging), we log one line:
  - `msg: "invoker_auth_rejected"`
  - `rid` (request id; correlate with Cloud Run request logs)
  - `branch` (e.g. `no_header_no_bearer`, `no_audience`, `verify_failed`, `missing_email`, `token_allowlist_empty`, `email_forbidden`, `header_forbidden`, `header_allowlist_empty`)
  - `errorCode` (stable: `INVOKER_AUTH_REQUIRED`, `INVOKER_AUDIENCE_REQUIRED`, `INVOKER_TOKEN_INVALID`, `INVOKER_ALLOWLIST_REQUIRED`, `INVOKER_FORBIDDEN`)
  - `host`
  - When Bearer path: `aud`, `emailPresent`, `subPresent`, `issuer` (from decoding JWT payload only; token itself is never logged).
  - When `verify_failed`: `verifyReason` (exception message from `verifyIdToken`, e.g. wrong audience or expired).
- **Secrets:** We never log the token or the `Authorization` header.

---

## 3) Reproduce deterministically

**Script:** `services/api/scripts/call-backfill-invoker.js`

- Uses same logic as scheduler: `GoogleAuth`, `getIdTokenClient(baseUrl)`, POST to `baseUrl/integrations/withings/backfill`.
- Run from `services/api`:  
  `OLI_API_BASE_URL=https://oli-api-1010034434203.us-central1.run.app node scripts/call-backfill-invoker.js`  
  or:  
  `node scripts/call-backfill-invoker.js https://oli-api-1010034434203.us-central1.run.app`
- Uses Application Default Credentials (e.g. `gcloud auth application-default login` or the scheduler’s SA key via `GOOGLE_APPLICATION_CREDENTIALS`).
- **Output:** Single line JSON: `{"status":<number>,"errorCode":<string|null>}`. No token printed.

**Interpretation:**

- `status 401`, no or generic body → Cloud Run rejected (token missing/invalid/wrong audience).
- `status 403`, `errorCode` set → Our middleware rejected; check API logs for `invoker_auth_rejected` with same `rid` to see `branch` and token claim summary.

---

## 4) Exact branch / error code from API

*(To be filled from Cloud Run logs for oli-api after deploy.)*

- Filter: `jsonPayload.msg="invoker_auth_rejected"` or `textPayload=~"invoker_auth_rejected"`.
- Record: `rid`, `branch`, `errorCode`, `aud`, `emailPresent`, `subPresent`, `issuer`, `verifyReason` (if present).

---

## 5) Token claim summary (no token logged)

*(To be filled from same log line.)*

- `aud`: expected to match `INVOKER_TOKEN_AUDIENCE` (e.g. `https://oli-api-1010034434203.us-central1.run.app`).
- `emailPresent`: if **false**, middleware rejects with “ID token missing email claim”. GCP SA ID tokens may omit `email` unless requested with `includeEmail`; the Node library’s `getIdTokenClient` may not set it.
- `subPresent`: typically **true** for SA tokens; can be used for allowlist if email is missing.
- `issuer`: typically `https://accounts.google.com` or SA issuer.

---

## 6) Conclusion

**Likely cause (when request reaches our app):** Service account ID tokens from `getIdTokenClient` often **omit the `email` claim** unless requested with `includeEmail`. That triggers branch `missing_email` / `token_identity_not_allowed`, errorCode `INVOKER_TOKEN_INVALID`.

**Fix applied:** Invoker auth now accepts **sub** (subject) allowlist via `WITHINGS_PULL_INVOKER_SUBS` (comma-separated). If the token has no email but has `sub`, and `sub` is in the allowlist, the request is allowed. Production still requires at least one of `WITHINGS_PULL_INVOKER_EMAILS` or `WITHINGS_PULL_INVOKER_SUBS`. On reject we log `sub` in `invoker_auth_rejected` so operators can copy it into `WITHINGS_PULL_INVOKER_SUBS`.

**If request does not reach our app (401 from Cloud Run):** Token missing, malformed, or **aud** mismatch at Cloud Run. Ensure scheduler sends an ID token with `aud` equal to the Cloud Run service URL (origin).

---

*End of Root Cause Report.*
