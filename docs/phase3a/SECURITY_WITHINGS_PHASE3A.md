# Phase 3A — Withings Security & Token Custody Statement

**Status:** Binding for Phase 3A closeout.  
**Scope:** Withings OAuth, token custody, and integration status endpoint.

---

## Token custody

- **Refresh tokens:** Stored only in Google Secret Manager. Secret names: `withings-refresh-token-<uid>`. No refresh tokens in Firestore or in application logs.
- **Client secret:** Stored only in Secret Manager as `withings-client-secret`. Not in environment variables or code.
- **Firestore:** `users/{uid}/integrations/withings` holds only metadata: `connected`, `scopes`, `connectedAt`, `revoked`, `failureState`. No tokens, no authorization codes, no access tokens.

---

## No token logging

- **Rule:** Auth codes, access tokens, and refresh tokens must never be logged (request bodies, response bodies, or log payloads).
- **Status response:** GET /integrations/withings/status returns only `ok`, `connected`, `scopes`, `connectedAt`, `revoked`, `failureState`. It must never include secrets or tokens.
- **Verification:** Run the log scan below; expected result is empty output.

---

## Log scan command (exact) + expected result

**Command:**

```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="oli-api"' \
  --project="oli-staging-fdbba" \
  --limit=300 \
  --format="value(textPayload)" | egrep -i "refresh_token|access_token|authorization_code|code=" || true
```

**Expected:** No output (empty). Any line printed indicates possible token leakage and must be investigated.

---

## Deployed identifiers (authoritative)

| Identifier | Value |
|------------|--------|
| Project | oli-staging-fdbba |
| Cloud Run service | oli-api |
| Cloud Run region | us-central1 |
| Cloud Run revision (serving) | oli-api-00106-qts |
| Cloud Run image | us-central1-docker.pkg.dev/oli-staging-fdbba/cloud-run-source-deploy/oli-api:12aaa43 |
| Cloud Run service account | oli-api-runtime@oli-staging-fdbba.iam.gserviceaccount.com |
| API Gateway base URL | https://oli-gateway-cw04f997.uc.gateway.dev |
| Active Gateway apiConfig | projects/1010034434203/locations/global/apis/oli-api/configs/oli-api-config-20260216-125006 |

---

## Runtime proofs (verbatim)

**401 without JWT:**

```json
{"code":401,"message":"Jwt is missing"}
```

**200 with JWT (example):**

```json
{"ok":true,"connected":true,"scopes":["user.metrics"],"connectedAt":"2026-02-16T12:30:25.201Z","revoked":false,"failureState":null}
```
