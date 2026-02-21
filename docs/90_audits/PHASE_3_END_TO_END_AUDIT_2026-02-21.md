# Phase 3 End-to-End Audit Report

**Date:** 2026-02-21  
**Scope:** Implemented, deployed, and functioning state only. No fixes applied.  
**Constraints:** Fail-closed mindset; real iPhone (Expo Dev Client); Cloud Run IAM-protected; API Gateway only client entrypoint; no mock/simulator.

---

## Executive Summary

- **Gateway → backend is broken in production:** All gateway probes (`/health`, `/_healthz`) return **HTTP 403** with `www-authenticate: Bearer error="insufficient_scope"` and HTML body from Google Frontend. Request never reaches the Cloud Run container.
- **Root cause hypothesis (evidence-based):** API config uses `gatewayServiceAccount: 1010034434203-compute@developer.gserviceaccount.com`. Cloud Run IAM grants `roles/run.invoker` to `service-1010034434203@gcp-sa-apigateway.iam.gserviceaccount.com` (API Gateway SA) but **not** to the default compute SA. If ESPv2 uses the gateway service account for backend calls, that identity lacks run.invoker → 403.
- **Client and backend code are aligned:** Single gateway host enforced; Withings returnUrl and API base URL are gateway-only; raw-events list + single-doc paths and query schema (including `_`) are implemented; auth middleware prefers `X-Forwarded-Authorization` then `Authorization`.
- **OpenAPI spec:** Paths for health, _healthz, raw-events (list + both single-doc variants), Withings connect/status/callback/complete are present; security is api_key only (no Firebase/OAuth in spec); top-level `x-google-backend` with `jwt_audience` set.
- **Active gateway config:** `oli-api-config-apikeyonly-nofirebase-20260221-2018`; gateway `oli-gateway` ACTIVE, hostname `oli-gateway-cw04f997.uc.gateway.dev`.
- **No DEBUG_BACKEND_BASE_URL console.log** in current `lib/api/http.ts`; previous audit referenced lines that no longer exist (removed or refactored).
- **Deep link:** app.json scheme `com.olifitness.oli` and backend/complete use `com.olifitness.oli://withings-connected` — aligned.

---

## A) Mobile Client

### Implemented & correct

| Item | Evidence | Reproduce |
|------|----------|-----------|
| Base URL resolution: only gateway host allowed | `lib/api/http.ts` L41–42 `REQUIRED_GATEWAY_BASE_URL` / `REQUIRED_GATEWAY_HOST`; L119–158 `getRequiredApiBaseUrl()`: env must equal `https://oli-gateway-cw04f997.uc.gateway.dev`; otherwise returns contract error. | Set `EXPO_PUBLIC_BACKEND_BASE_URL` to a different host → app fails with "Client misconfigured: EXPO_PUBLIC_BACKEND_BASE_URL must equal ...". |
| Withings returnUrl uses gateway only | `app/(app)/settings/devices.tsx` L11 `OLI_GATEWAY_BASE_URL`; L19–31 `getWithingsReturnUrl()` builds `https://oli-gateway-cw04f997.uc.gateway.dev/integrations/withings/complete` and validates host; throws on mismatch. | Inspect `getWithingsReturnUrl()`; no env fallback. |
| API requests use same base (gateway) | All authed calls go through `getRequiredApiBaseUrl()` in `apiGetJsonAuthed` / `apiPostJsonAuthed` / `apiPutJsonAuthed` (`lib/api/http.ts`). | Any authed request uses single base from env validated against gateway. |
| Cache-bust via header only (no `?t=` or `?_=`) | `lib/api/http.ts` L243–248: comment "strict backend rejects unknown query params"; cache-bust only via `X-Cache-Bust` header. `lib/api/usersMe.ts` getRawEvents builds query from allowed params only (no `_` in client-built qs). | Search codebase for query cache-buster: only header path. |
| Weight screen data path: list + single-doc | `lib/data/useWeightSeries.ts` L281–284: `getRawEvents(token, { kinds: ["weight"], limit, cacheBust })`; L314: `getRawEvent(item.id, token, optsUnique)`. `lib/api/usersMe.ts` L255–258 list path `/users/me/raw-events?...`; L271–273 single path `/users/me/raw-events/${id}`. | Weight screen → useWeightSeries → getRawEvents (list) then getRawEvent (single) per item. |
| Required query/headers for raw-events | List: allowed query keys in `usersMe.ts` L236–253 (start, end, kinds, provenance, uncertaintyState, q, cursor, limit); backend accepts `_` (see Backend). Auth: Bearer in header via `apiGetZodAuthed` → `apiGetJsonAuthed`. | `curl -H "Authorization: Bearer $TOKEN" "$GATEWAY/users/me/raw-events?kinds=weight&limit=1"` (once gateway works). |
| Deep link scheme aligned | `app.json` L5 `"scheme": "com.olifitness.oli"`. `services/api/src/index.ts` L137–139 and `integrations.ts` L450 use `com.olifitness.oli://withings-connected`. | Compare app.json scheme and backend/complete redirect URL. |
| Env requirement for backend URL | `lib/env.ts` L60 `requiredEnv("EXPO_PUBLIC_BACKEND_BASE_URL")`; exported in `Env.EXPO_PUBLIC_BACKEND_BASE_URL`. | Missing var → assert at startup. |

### Implemented but broken

| Item | Evidence | Reproduce | Hypothesis / What to fix |
|------|----------|-----------|---------------------------|
| All gateway calls (including health) | Any request to gateway (e.g. `/health?key=...`) returns 403 before backend. | `curl -s -o /dev/null -w "%{http_code}" -D - "https://oli-gateway-cw04f997.uc.gateway.dev/health?key=AIzaSy..."` → 403; headers include `www-authenticate: Bearer error="insufficient_scope"`, `server: Google Frontend`. | Gateway → Cloud Run invocation fails (IAM/scope). Fix: ensure the identity used by API Gateway to call Cloud Run has `roles/run.invoker` on the service (e.g. add `1010034434203-compute@developer.gserviceaccount.com` if that is the actual caller). |

### Missing

- None identified in client for Phase 3 scope (gateway-only URL, Withings returnUrl, Weight raw-events path, cache-bust semantics).

### Risky / needs hardening

- **Env validation at runtime:** `lib/env.ts` requires `EXPO_PUBLIC_BACKEND_BASE_URL` but does not enforce that it equals the gateway URL; `lib/api/http.ts` does that at request time. If env is set to a non-gateway URL, first API call fails with contract error — acceptable but could be caught at app init for clearer UX.
- **Withings DEBUG_WITHINGS_OAUTH:** `devices.tsx` L14 `DEBUG_WITHINGS_OAUTH = false`; when true, logs redirect_uri and scope (no tokens). Low risk; keep false in production.

### Debug logs

- **No DEBUG_BACKEND_BASE_URL or base-URL console.log** in `lib/api/http.ts` (grep for `console.(log|debug|info)` in that file: no matches). Previous audit referenced L191–192, L221–222, L254–255; current file has no such logs. Either removed or in a different layer; current codebase: **none present**.

---

## B) Backend (Cloud Run)

### Implemented & correct

| Item | Evidence | Reproduce |
|------|----------|-----------|
| GET /health, GET /_healthz | `services/api/src/health.ts` L69–76: `router.get("/health", publicHealthHandler)`, `router.get("/healthz", ...)`, `router.get("/_healthz", ...)`. | Run API locally; `GET /health` and `GET /_healthz` → 200 JSON. |
| GET /integrations/withings/status | `services/api/src/routes/integrations.ts` L143 (comment), handler; mounted under `app.use("/integrations", authMiddleware, integrationsRoutes)` in `index.ts` L157. | Local: `GET /integrations/withings/status` with Bearer → 200. |
| GET /users/me/raw-events (list) | `services/api/src/routes/usersMe.ts` L500–501 `router.get("/raw-events", ...)`; uses `rawEventsListQuerySchema.safeParse(req.query)` L506. | Local: `GET /users/me/raw-events?kinds=weight&limit=1` with Bearer → 200. |
| GET /users/me/raw-events/:id and /users/me/rawEvents/:id (single) | `usersMe.ts` L328 (shared handler), L493–494 `router.get("/rawEvents/:id", ...)` and `router.get("/raw-events/:id", ...)`. | Local: `GET /users/me/raw-events/:id` and `GET /users/me/rawEvents/:id` with Bearer → 200 for existing doc. |
| Auth: X-Forwarded-Authorization then Authorization | `services/api/src/middleware/auth.ts` L36–50: `extractBearerToken` reads `x-forwarded-authorization` / `X-Forwarded-Authorization` first, then `authorization` / `Authorization`; Bearer match. | Unit tests or local request with `X-Forwarded-Authorization: Bearer <token>`. |
| Strict query schema with `_` allowed | `lib/contracts/retrieval.ts` L195–221: `rawEventsListQuerySchema` includes `_: z.string().optional()` (L217), `.strict()`. Backend uses this in usersMe L506. | Local: `GET /users/me/raw-events?kinds=weight&limit=1&_=123` with Bearer → 200 (no INVALID_QUERY). |
| Withings connect, callback, complete, revoke | `integrations.ts`: connect L251, callback (exported, mounted in index L123–125), status L143; complete in index L130–141; revoke in integrations. | Local tests: `integrations.withings.test.ts`, `withings.pull.test.ts`, `withings.backfill.test.ts`. |

### Implemented but broken

- **Not applicable at code level.** Backend routes and middleware are correctly implemented. The only breakage is gateway → Cloud Run not reaching the service (403 before container).

### Missing

- None identified for the audited routes (health, _healthz, withings status/connect/callback/complete, raw-events list and single-doc).

### Risky / needs hardening

- **Public callback/complete:** Intentionally public; ensure no token or PII in logs or response (audit already confirms no tokens in status/complete).

---

## C) API Gateway Spec & Config

### Implemented & correct

| Item | Evidence | Reproduce |
|------|----------|-----------|
| Paths: /health, /_healthz | `infra/gateway/openapi.yaml` L41–59 (/health), L90–108 (/_healthz); both GET with security api_key. | Inspect openapi.yaml. |
| Paths: /integrations/withings (connect, status, callback, complete) | L459–468 (connect), L479–502 (status), L527–541 (callback), L527–545 (complete). | Inspect openapi.yaml. |
| Paths: /users/me/raw-events (list), raw-events/{id}, rawEvents/{id} | L218–227 (list), L234–246 (raw-events/{id}), L255–267 (rawEvents/{id}). | Inspect openapi.yaml. |
| securityDefinitions: api_key only | L31–35: `api_key` type apiKey, name `key`, in query. No firebase, no oauth2. | Grep securityDefinitions, security in openapi.yaml. |
| security: api_key required globally | L37–39: `security: - api_key: []`. | Same. |
| x-google-backend (top-level) | L24–29: `x-google-backend` with `address: https://oli-api-1010034434203.us-central1.run.app`, `path_translation: APPEND_PATH_TO_ADDRESS`, `jwt_audience: https://oli-api-1010034434203.us-central1.run.app`. | Same. |
| Active apiConfig on oli-gateway | `gcloud api-gateway gateways describe oli-gateway --location=us-central1` → `apiConfig: projects/.../configs/oli-api-config-apikeyonly-nofirebase-20260221-2018`. | Run describe command. |

### Implemented but broken

| Item | Evidence | Reproduce | Hypothesis / What to fix |
|------|----------|-----------|---------------------------|
| /health?key=... (and all gateway calls) return 403 insufficient_scope | curl to `https://oli-gateway-cw04f997.uc.gateway.dev/health?key=...` and `/_healthz?key=...` → 403, `www-authenticate: Bearer error="insufficient_scope"`, body HTML "Your client does not have permission to get URL ...". | `curl -sS -D - "https://oli-gateway-cw04f997.uc.gateway.dev/health?key=AIzaSyDPSrs2QRvTimY8ELBM6LC__CTaQaqQ0Vg"`. | Gateway validates API key then calls Cloud Run with an ID token. Cloud Run (or Google Frontend) rejects with 403. **Hypothesis:** The identity used for that call is `gatewayServiceAccount: 1010034434203-compute@developer.gserviceaccount.com` (from api config describe). Cloud Run IAM has `roles/run.invoker` for `service-1010034434203@gcp-sa-apigateway.iam.gserviceaccount.com` but **not** for the default compute SA. If ESPv2 uses the gateway service account (compute SA) to mint the token, that SA lacks run.invoker. **Fix (high-level):** Grant `roles/run.invoker` on the Cloud Run service to `1010034434203-compute@developer.gserviceaccount.com`, **or** change gateway config to use a service account that already has run.invoker, then redeploy/update gateway. |

### Missing

- None. All required paths and security are present in the spec.

### Risky / needs hardening

- **Callback/complete with api_key:** OpenAPI currently requires api_key for callback and complete (L527–545). If Withings redirects without `?key=...`, gateway may reject before backend. Confirm whether callback/complete are called with key in redirect_uri or whether operation-level `security: []` is needed for those two paths so they are truly public at the gateway.

---

## D) Firebase / Auth

- **Client:** Uses Firebase Auth; token obtained via `useAuth().getIdToken()` and sent as Bearer in all authed requests (e.g. `lib/api/http.ts`, `validate.ts`).
- **Backend:** Firebase Admin `verifyIdToken` in `auth.ts`; token taken from `X-Forwarded-Authorization` or `Authorization`.
- **Gateway:** OpenAPI uses api_key only; no Firebase in spec. Backend still enforces Firebase for protected routes when request reaches it.
- **Stale tokens:** Not audited in depth; refresh semantics are in AuthProvider/getIdToken usage — list as "needs verification" below.

---

## E) Withings Integration / Raw Events

- **Status:** Backend routes (connect, callback, complete, status, revoke, pull, backfill) and Firestore/Secret Manager usage are implemented and covered by tests. Client uses gateway base for returnUrl and connect/status API calls.
- **Raw events:** Stored under `users/{uid}/rawEvents`; composite index READY for kind/sourceId/observedAt; list and single-doc routes and both URL forms (raw-events, rawEvents) are implemented. Client Weight screen uses list then single-doc; backend allows `_` in raw-events list query.
- **Blocker:** End-to-end cannot be verified on real device until gateway → backend returns 2xx (currently 403 for all gateway calls).

---

## Deployed State (Commands Run)

| Command | Result |
|--------|--------|
| `gcloud run services describe oli-api --region us-central1` | latestReadyRevisionName: **oli-api-00119-k9f**; status.url: https://oli-api-7lrup47o4q-uc.a.run.app (and project URL). |
| `gcloud api-gateway gateways describe oli-gateway --location=us-central1` | **apiConfig:** projects/1010034434203/locations/global/apis/oli-api/configs/oli-api-config-apikeyonly-nofirebase-20260221-2018. **defaultHostname:** oli-gateway-cw04f997.uc.gateway.dev. **state:** ACTIVE. |
| `gcloud api-gateway api-configs describe oli-api-config-apikeyonly-nofirebase-20260221-2018 --api=oli-api` | **gatewayServiceAccount:** projects/-/serviceAccounts/1010034434203-compute@developer.gserviceaccount.com. state ACTIVE. |
| `gcloud run services get-iam-policy oli-api --region us-central1` | **run.invoker:** oli-api-runtime@..., oli-functions-runtime@..., **service-1010034434203@gcp-sa-apigateway.iam.gserviceaccount.com**. No binding for 1010034434203-compute@developer.gserviceaccount.com. |
| `curl "https://oli-gateway-cw04f997.uc.gateway.dev/health?key=AIzaSy..."` | **403**; headers: www-authenticate: Bearer error="insufficient_scope", server: Google Frontend. |
| `curl "https://oli-gateway-cw04f997.uc.gateway.dev/_healthz?key=AIzaSy..."` | **403**; same. |

---

## Phase 3 Completion Checklist (Current Status)

| Item | Status | Notes |
|------|--------|-------|
| Client uses only gateway host for API + Withings returnUrl | ✅ Implemented | Enforced in http.ts and devices.tsx. |
| Weight screen: list + single-doc raw-events, allowed query params + `_` | ✅ Implemented | useWeightSeries → getRawEvents, getRawEvent; backend schema allows `_`. |
| Backend: health, _healthz, withings routes, raw-events list and both single-doc paths | ✅ Implemented | All present; auth prefers X-Forwarded-Authorization. |
| Gateway OpenAPI: paths and api_key-only security, x-google-backend jwt_audience | ✅ Implemented | Spec and active config match. |
| Gateway → Cloud Run returns 2xx for /health, /_healthz | ❌ Broken | 403 insufficient_scope; gateway never reaches backend. |
| Cloud Run IAM: identity used by gateway has run.invoker | ❌ Unknown / likely no | run.invoker granted to API Gateway SA; config uses compute SA — verify which identity ESPv2 uses and add run.invoker for that identity. |
| No DEBUG_BACKEND_BASE_URL or base URL console.log in production path | ✅ Verified | No such logs in current http.ts. |
| Token refresh / no stale tokens | ⏳ Not verified | Audit refresh + token usage semantics separately. |
| Real iPhone (Expo Dev Client), no mock data | ⏳ Assumed | No code changes; manual verification. |
| Withings E2E: connect → callback → complete → status | ⏳ Blocked | Depends on gateway returning 2xx. |

---

## What to Fix Next (High-Level Only)

1. **Gateway → Cloud Run 403:** Confirm which service account ESPv2 uses when calling Cloud Run (likely `gatewayServiceAccount` from api config). Grant that identity `roles/run.invoker` on the Cloud Run service `oli-api` in us-central1, or switch gateway config to an SA that already has it. Re-test `curl "$GATEWAY/health?key=$KEY"` until 200.
2. **Callback/complete public at gateway:** If Withings redirects to callback/complete without `?key=...`, add operation-level `security: []` for those two operations in OpenAPI so gateway does not require API key for them; redeploy config.
3. **Token refresh audit:** Explicitly verify refresh and token usage semantics (no stale tokens) per non-negotiables.
4. **E2E on device:** After gateway returns 2xx, run Withings connect flow and Weight screen (list + single-doc) on real iPhone with Expo Dev Client and confirm no mock data.

---

*End of audit. No code or config changes were made.*
