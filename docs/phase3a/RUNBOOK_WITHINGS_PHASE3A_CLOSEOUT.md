# Phase 3A Closeout Runbook — Withings OAuth + Status

**Purpose:** Deploy and verify Phase 3A (Withings connect, callback, complete, status, revoke) on staging. Use this runbook for deploys and rollbacks.

---

## Scope

**Phase 3A covers:** Withings OAuth connect (auth), public callback (token exchange + Firestore + Secret Manager), public completion bridge (HTML deep link), **GET /integrations/withings/status** (auth, no tokens), revoke (auth). Token custody: refresh tokens only in Secret Manager; no tokens in Firestore or logs.

**Phase 3B will cover:** (Out of scope for this runbook; to be defined in Phase 3B planning.)

---

## Authoritative runtime identifiers (embed verbatim)

| Item | Value |
|------|--------|
| Project | oli-staging-fdbba |
| Cloud Run region | us-central1 |
| Cloud Run service | oli-api |
| Cloud Run revision (serving) | oli-api-00106-qts |
| Cloud Run image | us-central1-docker.pkg.dev/oli-staging-fdbba/cloud-run-source-deploy/oli-api:12aaa43 |
| Cloud Run service account | oli-api-runtime@oli-staging-fdbba.iam.gserviceaccount.com |
| API Gateway base URL | https://oli-gateway-cw04f997.uc.gateway.dev |
| API Gateway location (gateway resource) | us-central1 |
| Active Gateway apiConfig | projects/1010034434203/locations/global/apis/oli-api/configs/oli-api-config-20260216-125006 |

---

## Deploy commands

### 1) Cloud Build — build API image (repo root context, Dockerfile in services/api)

Compatibility approach (avoids relying on `--dockerfile` / `--config=-` in older gcloud):

**Generate config file:**

```bash
# From repo root. Writes a Cloud Build config that uses services/api/Dockerfile and repo root context.
cat > /tmp/cloudbuild-oli-api.yaml << 'EOF'
steps:
  - name: gcr.io/cloud-builders/docker
    args:
      - build
      - -f
      - services/api/Dockerfile
      - -t
      - "${_IMAGE}"
      - .

images:
  - "${_IMAGE}"

substitutions:
  _IMAGE: "us-central1-docker.pkg.dev/oli-staging-fdbba/cloud-run-source-deploy/oli-api:${SHORT_SHA}"
EOF
```

**Submit build (set SHORT_SHA if not using default):**

```bash
cd /path/to/oli   # repo root
export SHORT_SHA=$(git rev-parse --short HEAD)   # or your tag
gcloud builds submit --project=oli-staging-fdbba --config=/tmp/cloudbuild-oli-api.yaml --substitutions=SHORT_SHA=$SHORT_SHA .
```

If your Cloud Build supports `PROJECT_ID` and `$SHORT_SHA` from default substitutions, you can use:

```bash
gcloud builds submit --project=oli-staging-fdbba --config=/tmp/cloudbuild-oli-api.yaml .
```

(Cloud Build default substitutions include `$SHORT_SHA` when triggered by source; for manual runs, set `SHORT_SHA` as above or use a fixed tag in `_IMAGE`.)

### 2) Cloud Run deploy (exact image + service account)

```bash
gcloud run deploy oli-api \
  --project=oli-staging-fdbba \
  --region=us-central1 \
  --image=us-central1-docker.pkg.dev/oli-staging-fdbba/cloud-run-source-deploy/oli-api:12aaa43 \
  --service-account=oli-api-runtime@oli-staging-fdbba.iam.gserviceaccount.com
```

Use the image tag you built (e.g. replace `12aaa43` with `$SHORT_SHA` after a new build).

### 3) API Gateway — config creation and gateway update

**Gateway resource lives in us-central1.** API config is created in **global**; the gateway in us-central1 references it.

**Create new api config (from repo openapi):**

```bash
# From repo root. Create config with a unique name (e.g. timestamp).
CONFIG_ID="oli-api-config-$(date +%Y%m%d-%H%M%S)"
gcloud api-gateway api-configs create "$CONFIG_ID" \
  --api=oli-api \
  --project=oli-staging-fdbba \
  --openapi-spec=infra/gateway/openapi.yaml
```

**Update gateway to use the new config (location = us-central1):**

```bash
# Use the CONFIG_ID from above. Full config resource name:
# projects/1010034434203/locations/global/apis/oli-api/configs/<CONFIG_ID>
gcloud api-gateway gateways update oli-gateway \
  --api-config=projects/1010034434203/locations/global/apis/oli-api/configs/$CONFIG_ID \
  --location=us-central1 \
  --project=oli-staging-fdbba
```

---

## Verification commands + expected outputs

### curl — 401 without JWT

```bash
curl -sS -i "https://oli-gateway-cw04f997.uc.gateway.dev/integrations/withings/status"
```

**Expected:** HTTP 401. Body must indicate missing/invalid JWT, e.g.:

```json
{"code":401,"message":"Jwt is missing"}
```

### curl — 200 with JWT (response shape)

```bash
curl -sS -i -H "Authorization: Bearer $TOKEN" "https://oli-gateway-cw04f997.uc.gateway.dev/integrations/withings/status"
```

**Expected:** HTTP 200. JSON shape:

```json
{"ok":true,"connected":true,"scopes":["user.metrics"],"connectedAt":"2026-02-16T12:30:25.201Z","revoked":false,"failureState":null}
```

(When not connected: `connected: false`, `scopes: []`, `connectedAt: null`.)

### Show active apiConfig

```bash
gcloud api-gateway gateways describe oli-gateway \
  --location=us-central1 \
  --project=oli-staging-fdbba \
  --format="yaml(apiConfig)"
```

**Expected:** `apiConfig` points to the intended config, e.g. `projects/1010034434203/locations/global/apis/oli-api/configs/oli-api-config-20260216-125006`.

### Log scan — no token logging (expected empty output)

```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="oli-api"' \
  --project=oli-staging-fdbba \
  --limit=300 \
  --format="value(textPayload)" | egrep -i "refresh_token|access_token|authorization_code|code=" || true
```

**Expected:** No output (empty). Any match would indicate token leakage and must be investigated.

---

## Common failure modes

| Failure | Cause | Fix |
|--------|--------|-----|
| `gcloud builds submit` fails (unknown flag / config) | Older gcloud without `--dockerfile` or `--config=-` | Use the generate-then-submit approach: write `/tmp/cloudbuild-oli-api.yaml` and `gcloud builds submit --config=/tmp/cloudbuild-oli-api.yaml .` |
| Gateway update fails (wrong location) | Gateway resource is in **us-central1**, not global | Use `--location=us-central1` for `api-gateway gateways update`. Config resource remains in `locations/global`. |
| curl 401 with token: "Jwt is missing" | `$TOKEN` empty or not sent | Export a valid Firebase ID token: `export TOKEN=$(...)` and ensure `Authorization: Bearer $TOKEN` is sent. |
| Status returns 404 at gateway | New OpenAPI path not deployed | Create a new api config from `infra/gateway/openapi.yaml` and update the gateway to that config. |

---

## Rollback

**Cloud Run:** Redeploy the previous revision.

1. List revisions:  
   `gcloud run revisions list --service=oli-api --project=oli-staging-fdbba --region=us-central1`
2. Identify the previous serving revision (or the revision you want).
3. Deploy that image:  
   `gcloud run deploy oli-api --project=oli-staging-fdbba --region=us-central1 --image=us-central1-docker.pkg.dev/oli-staging-fdbba/cloud-run-source-deploy/oli-api:<TAG>`

**API Gateway:** Point the gateway back to the previous api config.

1. List configs:  
   `gcloud api-gateway api-configs list --api=oli-api --project=oli-staging-fdbba`
2. Note the previous config resource name.
3. Update gateway:  
   `gcloud api-gateway gateways update oli-gateway --api-config=projects/1010034434203/locations/global/apis/oli-api/configs/<PREVIOUS_CONFIG_ID> --location=us-central1 --project=oli-staging-fdbba`

Do not guess revision or config IDs; use `list` / `describe` to choose.
