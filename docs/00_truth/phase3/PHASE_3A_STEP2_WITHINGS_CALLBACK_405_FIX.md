# Phase 3A Step 2 — Withings callback 405 fix (deliverable)

**Branch:** `lock/phase2-2026-02-10`  
**Goal:** Withings Developer Portal “Test” and OAuth callback succeed; no 405 on POST/HEAD callback.

---

## Section 1: Root cause (PROVEN)

**Evidence (curl):**

1. **GET** `https://oli-gateway-cw04f997.uc.gateway.dev/integrations/withings/callback`  
   → **400** from Express: `{"ok":false,"error":{"code":"INVALID_CALLBACK","message":"Missing code or state"}}`  
   → Proves: request reaches Express; GET is allowed by gateway.

2. **POST** same URL  
   → **405** with message: *"matched to defined url template ... but its http method is not allowed"*  
   → Proves: Gateway rejects POST because method not defined in OpenAPI.

3. **HEAD** same URL  
   → **405** (same behavior).  
   → Proves: Gateway rejects HEAD for same reason.

4. **OPTIONS** same URL  
   → **204** from Express (CORS).  
   → Proves: OPTIONS is defined and public.

**Conclusion (PROVEN):**  
- Express has a route for **GET** `/integrations/withings/callback` (and CORS OPTIONS).  
- **OpenAPI in `infra/gateway/openapi.yaml` defined only `options` and `get`** for `/integrations/withings/callback`.  
- API Gateway only forwards methods that appear in the OpenAPI spec; undefined methods return 405 with the “http method is not allowed” message.  
- Withings Developer Portal “Test” (and any HEAD/POST probe) therefore received 405 before reaching Express.

---

## Section 2: Patch plan

| Item | Action |
|------|--------|
| **A) Gateway** | Allow **POST** and **HEAD** on `/integrations/withings/callback` with `security: []` and same `x-google-backend` as GET. |
| **B) API** | Add **no-op** handlers: **POST** → 200 "OK", **HEAD** → 200 empty. No token exchange, no logging of query/body. |
| **C) Tests** | Route tests: POST/HEAD callback return 200. Phase3A proof: OpenAPI contains `post` and `head` for callback. |
| **D) Verification** | After deploy: curl POST/HEAD → 200; Withings “Test” passes; GET with code+state in logs; status connected; pull writes RawEvents. |

---

## Section 3: Code diffs (full paths)

### 3.1 `infra/gateway/openapi.yaml`

**Change:** Under path `/integrations/withings/callback`, add `post` and `head` with `security: []` and same `x-google-backend` as `get`.

- **post:** `operationId: withingsCallbackPost`, `security: []`, `x-google-backend` → `https://oli-api-1010034434203.us-central1.run.app`, `path_translation: APPEND_PATH_TO_ADDRESS`, `responses: 200: OK`.
- **head:** `operationId: withingsCallbackHead`, same security and backend, `responses: 200: OK`.

Existing `options` and `get` unchanged.

### 3.2 `services/api/src/routes/withings.ts`

**Change:** On `withingsPublicRoutes`, add two handlers before the existing GET `/callback`:

- **POST `/callback`:** `(_req, res) => res.status(200).send("OK")`. No token exchange, no logging of body/query.
- **HEAD `/callback`:** `(_req, res) => res.status(200).end()`. No token exchange.

GET `/callback` logic (token exchange, validation, Firestore write) unchanged.

### 3.3 `services/api/src/routes/__tests__/withings.test.ts`

**Change:** Add two describe blocks:

- **POST .../callback (public no-op):** one test — `POST /integrations/withings/callback` without auth returns 200 and body "OK".
- **HEAD .../callback (public no-op):** one test — `HEAD /integrations/withings/callback` without auth returns 200.

### 3.4 `scripts/ci/__tests__/phase3a-withings-proof.test.ts`

**Change:** Add one test:

- **OpenAPI allows POST and HEAD on /integrations/withings/callback:**  
  Read `infra/gateway/openapi.yaml`, locate the path block for `/integrations/withings/callback`, assert it contains `post:`, `head:`, `operationId: withingsCallbackPost`, and `operationId: withingsCallbackHead`.

---

## Section 4: Tests

| Test | Purpose |
|------|--------|
| `services/api/src/routes/__tests__/withings.test.ts` | POST callback → 200 "OK"; HEAD callback → 200. Ensures Express no-ops are in place. |
| `scripts/ci/__tests__/phase3a-withings-proof.test.ts` | OpenAPI path contains `post`/`head` and operationIds. Prevents regression (removing POST/HEAD from spec would fail this test). |

All tests are deterministic and do not call external networks.

---

## Section 5: Deploy commands (discovery first)

**Do not assume resource names.** Run discovery, then fill placeholders.

### 5.1 Discovery (run first)

```bash
export PROJECT=oli-staging-fdbba
export REGION=us-central1

# API id (e.g. oli-api)
gcloud api-gateway apis list --project="$PROJECT"

# Gateway id and location (e.g. oli-gateway in us-central1)
gcloud api-gateway gateways list --project="$PROJECT" --location="$REGION"

# Existing configs for the API (to choose next config id, e.g. oli-api-config-v11)
gcloud api-gateway api-configs list --project="$PROJECT" --api=oli-api
```

From the list output, set:

- `API_ID` — e.g. `oli-api`
- `GATEWAY_ID` — e.g. `oli-gateway`
- `CONFIG_ID` — new config id (e.g. `oli-api-config-v11-withings-callback`; lowercase, numbers/dashes only, max 63 chars)

### 5.2 Create new API config from OpenAPI

From repo root (where `infra/gateway/openapi.yaml` lives):

```bash
gcloud api-gateway api-configs create "$CONFIG_ID" \
  --project="$PROJECT" \
  --api="$API_ID" \
  --openapi-spec=infra/gateway/openapi.yaml
```

Wait for the config to be created (or use `--async` and then wait for the operation).

### 5.3 Update gateway to new config

Full config resource name format:  
`projects/$PROJECT_NUMBER/locations/global/apis/$API_ID/configs/$CONFIG_ID`

You can use the config id with `--api-config` in the form expected by your gcloud version (e.g. resource name or short id):

```bash
# If gateway update accepts short config id:
gcloud api-gateway gateways update "$GATEWAY_ID" \
  --project="$PROJECT" \
  --location="$REGION" \
  --api="$API_ID" \
  --api-config="$CONFIG_ID"
```

If your gcloud requires the full resource name, use:

```bash
# Get project number if needed: gcloud projects describe "$PROJECT" --format='value(projectNumber)'
gcloud api-gateway gateways update "$GATEWAY_ID" \
  --project="$PROJECT" \
  --location="$REGION" \
  --api="$API_ID" \
  --api-config="projects/$PROJECT/locations/global/apis/$API_ID/configs/$CONFIG_ID"
```

(Confirm exact `--api-config` format from `gcloud api-gateway gateways update --help`.)

### 5.4 Deploy API (Cloud Run)

If Express changes are deployed via the repo script (PROVEN in this repo):

```bash
# From repo root; PROJECT_ID and REGION have defaults in script
bash scripts/deploy-api-strategy-b.sh
```

Or with explicit env:

```bash
PROJECT_ID=oli-staging-fdbba REGION=us-central1 bash scripts/deploy-api-strategy-b.sh
```

Alternative (Cloud Build): use the same image build/deploy as in your CI or `cloudbuild/oli-api.yaml` (e.g. `gcloud builds submit` with `cloudbuild.api.yaml` then `gcloud run deploy oli-api`).  
**If you use a different deploy process in practice, substitute your exact command** (marked UNPROVEN until you confirm).

---

## Section 6: Verification checklist (binary)

After **both** gateway config update and API deploy:

1. **curl (gateway hostname)**  
   Base URL: `https://oli-gateway-cw04f997.uc.gateway.dev`

   - `curl -i "https://oli-gateway-cw04f997.uc.gateway.dev/integrations/withings/callback"`  
     → GET: status **200** or **400** (missing params). Must **not** be 5xx or 405.
   - `curl -i -X POST "https://oli-gateway-cw04f997.uc.gateway.dev/integrations/withings/callback"`  
     → **200** (not 405).
   - `curl -I "https://oli-gateway-cw04f997.uc.gateway.dev/integrations/withings/callback"`  
     → HEAD: **200** (not 405).

2. **Withings Developer Portal**  
   - Registered callback URL: `https://oli-gateway-cw04f997.uc.gateway.dev/integrations/withings/callback`  
   - Click **Test** → must succeed (no 405).

3. **OAuth connect (with log tail)**  
   - Start: `gcloud beta run services logs tail oli-api --region us-central1 --project <PROJECT>`  
   - From app, run Withings connect and complete OAuth.  
   - Log line must show: `GET /integrations/withings/callback` (with query params).  
   - **Do not** paste or log actual `code` or `state` values.

4. **Status and pull**  
   - `GET .../integrations/withings/status` (with auth) → `connected: true`.  
   - `POST .../integrations/withings/pull` (with auth, Idempotency-Key, body `{ "timeZone": "America/Los_Angeles" }`) → 200, RawEvents with `kind: withings.body_measurement` via single ingestion front door; canonical weight in timeline and Withings presence.

---

## Section 7: Anything UNPROVEN

| Item | Status | Evidence needed |
|------|--------|------------------|
| Exact `--api-config` format for `gcloud api-gateway gateways update` (short id vs full resource name) | UNPROVEN | Run `gcloud api-gateway gateways update --help` and/or try with your project; document which form works. |
| Production deploy command for oli-api | PROVEN from repo | `scripts/deploy-api-strategy-b.sh` exists and deploys `oli-api` to Cloud Run. If you use a different pipeline (e.g. Cloud Build trigger), that command is UNPROVEN until you paste it. |
| Withings Portal “Test” actually uses POST or HEAD | UNPROVEN | Assumed from common 405 behavior; if Test uses another method, we can extend OpenAPI again. |
| Gateway hostname after config update | PROVEN from repo | `api-gateway-gateway.json` shows `defaultHostname: oli-gateway-cw04f997.uc.gateway.dev`; unchanged by config update. |

---

## Run these checks (local, before deploy)

```bash
npm run typecheck
npm run lint
npm test
bash scripts/ci/proof-gate-phase2.sh
bash scripts/ci/proof-gate-phase3a.sh
```

All must pass.
