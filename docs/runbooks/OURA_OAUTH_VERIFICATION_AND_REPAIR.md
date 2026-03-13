# Oura OAuth Integration — Full Verification and Repair Report

**Date:** 2025-03  
**Issue:** Mobile app shows "Connection failed / HTTP 404 / Cannot GET /integrations/oura/connect" — API Gateway forwards but Cloud Run backend returns 404.

---

## 1. Backend route audit

**File:** `services/api/src/routes/integrations.ts`

| Route | In integrations router? | Handler |
|-------|-------------------------|---------|
| GET /oura/status | Yes | `router.get("/oura/status", ...)` ✅ |
| GET /oura/connect | Yes | `router.get("/oura/connect", ...)` ✅ |
| POST /oura/revoke | Yes | `router.post("/oura/revoke", ...)` ✅ |
| GET /oura/callback | No (mounted on app) | `handleOuraCallback` in index.ts ✅ |
| GET /oura/complete | No (mounted on app) | app.get in index.ts ✅ |
| POST /oura/ingest | No (separate router) | ouraIngestRouter in index.ts ✅ |

**Verdict:** All Oura routes exist in code. Callback and complete are correctly mounted on the app at full path in `index.ts`; status, connect, revoke are on the integrations router with paths `/oura/status`, `/oura/connect`, `/oura/revoke`.

---

## 2. Router mount verification

**File:** `services/api/src/index.ts`

- `app.use("/integrations", authMiddleware, integrationsRoutes)` is present at line 196.
- Mount order: Oura callback, Oura complete, and Oura ingest are registered **before** the generic `/integrations` mount. So:
  - GET /integrations/oura/callback → app.get (exact match)
  - GET /integrations/oura/complete → app.get (exact match)
  - POST /integrations/oura/ingest → app.use("/integrations/oura/ingest", ...) (prefix match)
  - GET /integrations/oura/connect → falls through to `app.use("/integrations", integrationsRoutes)` → router receives path `/oura/connect` ✅

**Verdict:** Mounting is correct. No fix needed.

---

## 3. Express route paths (integrations router)

**File:** `services/api/src/routes/integrations.ts`

- `router.get("/oura/status", ...)` ✅
- `router.get("/oura/connect", ...)` ✅
- `router.post("/oura/revoke", ...)` ✅

Paths do **not** include `/integrations` (that is the mount prefix). Callback and complete are **not** on the router; they are on the app in index.ts at full path.

**Verdict:** Correct. No fix needed.

---

## 4. Client endpoint verification

**File:** `lib/api/oura.ts`

- `getOuraStatus` → `"/integrations/oura/status"` (no trailing slash) ✅
- `getOuraConnectUrl` → `"/integrations/oura/connect"` (no trailing slash) ✅
- `postOuraRevoke` → `"/integrations/oura/revoke"` (no trailing slash) ✅

**Verdict:** Client paths are correct. No trailing slashes.

---

## 5. Gateway spec verification

**File:** `infra/gateway/openapi.yaml`

| Path | Present | Security |
|------|---------|----------|
| /integrations/oura/status | Yes | firebase ✅ |
| /integrations/oura/connect | Yes | firebase ✅ |
| /integrations/oura/revoke | Yes | firebase ✅ |
| /integrations/oura/callback | Yes | public (security: []) ✅ |
| /integrations/oura/complete | Yes | public ✅ |
| /integrations/oura/ingest | Yes | firebase ✅ |

**Verdict:** Gateway spec has all Oura paths. No change made.

---

## 6. OAuth configuration usage

**File:** `services/api/src/routes/integrations.ts`

- **OURA_CLIENT_ID** — used in connect and callback (env check, authorize URL, token exchange). ✅
- **OURA_REDIRECT_URI** — optional override; canonical redirect is built from `getCanonicalRedirectUriOura(req)` which uses:
  - `PUBLIC_BASE_URL` if set (e.g. `https://oli-gateway-cw04f997.uc.gateway.dev`) → `{PUBLIC_BASE_URL}/integrations/oura/callback`
  - Else `x-forwarded-proto` + `x-forwarded-host` → `{proto}://{host}/integrations/oura/callback`
- **OURA_CLIENT_SECRET** — not in env; stored in Secret Manager and read via `ouraSecrets.getClientSecret()` in the callback. ✅

For production, set:
- `PUBLIC_BASE_URL=https://oli-gateway-cw04f997.uc.gateway.dev` (so redirect URI = `https://oli-gateway-cw04f997.uc.gateway.dev/integrations/oura/callback`)
- `OURA_REDIRECT_URI` — optional; if set must equal the canonical value above.

**Verdict:** Implementation is correct. Ensure Cloud Run env has PUBLIC_BASE_URL and OURA_CLIENT_ID; Oura developer portal redirect URI = `https://oli-gateway-cw04f997.uc.gateway.dev/integrations/oura/callback`.

---

## 7. Connect handler behavior

**Current behavior:** GET /integrations/oura/connect returns **200** with JSON `{ ok: true, url: "https://cloud.ouraring.com/oauth/authorize?..." }`. The client then opens that URL (e.g. via WebBrowser.openAuthSessionAsync). This matches the Withings pattern (connect returns URL in JSON; client performs the redirect).

**Not changed:** The handler was not changed to return a 302 redirect. The intended flow is: client calls connect → backend returns URL → client opens URL → user completes OAuth on Oura → Oura redirects to /integrations/oura/callback.

---

## 8. Debug logging added

Temporary debug logs were added so that when the backend receives a request, Cloud Run logs show it:

- **GET /oura/status:** `console.log("[OURA_STATUS_HIT]");` at handler entry.
- **GET /oura/connect:** `console.log("[OURA_CONNECT_HIT]");` at handler entry.

After confirming requests reach the backend, these can be removed or replaced with structured logger calls.

---

## 9. Root cause of 404 "Cannot GET /integrations/oura/connect"

The repo code is correct: routes exist, mount order is correct, client and gateway paths match. The message "Cannot GET /integrations/oura/connect" is Express’s default 404 when **no route matches**. So either:

1. **Deployed Cloud Run revision is old** — The image running on Cloud Run was built from a commit that does not include the Oura routes. **Fix:** Rebuild and redeploy the oli-api service so the running revision includes the current `services/api` and `routes/integrations.ts`.
2. **Gateway not updated** — If the gateway OpenAPI spec was not redeployed after adding Oura paths, the gateway would return 404 before the request reaches Cloud Run. You have already confirmed the gateway is forwarding (you see 404 from the backend). So the request is reaching Cloud Run, which points to (1).

**Conclusion:** Rebuild and redeploy the Cloud Run service (oli-api) from the current commit. No route or mount changes were required in the repo.

---

## 10. Deployment scripts (oli-api)

**Cloud Build:** `cloudbuild.api.yaml` builds from repo root (`.`), Dockerfile `services/api/Dockerfile`. The Dockerfile copies the full repo in the build stage (`COPY . .`), so the image includes current `services/api` and `routes/integrations.ts`.

**Deploy path:** Use your normal pipeline that:
1. Builds the image (e.g. Cloud Build with `cloudbuild.api.yaml` or `scripts/deploy/phase3a-withings-build-api-image.sh`).
2. Deploys to Cloud Run (e.g. `scripts/deploy/phase3a-withings-deploy-cloudrun.sh <commit_short_sha>`).

Ensure the image tag deployed to Cloud Run is the one built from the commit that contains the Oura routes and the new debug logs.

---

## 11. Required fixes applied

| Item | Action |
|------|--------|
| Backend routes | None — already present |
| Router mount | None — correct |
| Client paths | None — correct, no trailing slash |
| Gateway spec | None — Oura paths present |
| OAuth env | None — implementation correct |
| Connect handler | None — returns JSON URL (same as Withings) |
| Debug logging | **Added** — `[OURA_STATUS_HIT]` and `[OURA_CONNECT_HIT]` in integrations.ts |

---

## 12. Files modified

| File | Change |
|------|--------|
| `services/api/src/routes/integrations.ts` | Added `console.log("[OURA_STATUS_HIT]")` at start of GET /oura/status handler; added `console.log("[OURA_CONNECT_HIT]")` at start of GET /oura/connect handler. |
| `docs/runbooks/OURA_OAUTH_VERIFICATION_AND_REPAIR.md` | This report. |

---

## 13. Post-deploy verification

1. **Redeploy oli-api** to Cloud Run from the current commit (so the new code and debug logs are live).
2. From the app or curl, call GET /integrations/oura/connect with a valid Bearer token (and gateway key if required).
3. Check Cloud Run logs for `[OURA_CONNECT_HIT]`. If it appears, the request reached the backend and the 404 was from an old revision.
4. If you still get 404 and do **not** see `[OURA_CONNECT_HIT]`, the request is not reaching the integrations router (e.g. gateway path or method mismatch); re-check gateway config and that the gateway was redeployed after adding Oura paths.
