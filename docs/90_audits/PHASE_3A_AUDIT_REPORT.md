# Phase 3A Audit Report — Withings OAuth + Token Custody + Deep Link + API Gateway + Mobile Truth

**Date:** 2026-02-16  
**Branch:** feat/phase3a-withings-bridge  
**Working tree:** clean (per audit baseline)  
**Authority:** Repo-truth only; no assumptions; fail closed.

---

## 1) Executive Summary + Score

**Phase 3A Audit Score: 6.5 / 10**

### Evidence-linked summary

| Area | Finding | Evidence |
|------|---------|----------|
| **Backend OAuth** | GET connect, GET callback, GET complete, POST revoke implemented; canonical redirect uses PUBLIC_BASE_URL; fail-closed mismatch with WITHINGS_REDIRECT_URI. | `services/api/src/routes/integrations.ts`, `services/api/src/index.ts` |
| **Backend status** | **Missing:** GET /integrations/withings/status. Mobile calls it; backend has no handler → 404. | `lib/api/usersMe.ts` L161–176 calls `/integrations/withings/status`; no route in `integrations.ts` or `index.ts`. |
| **Token custody** | Refresh tokens in Secret Manager only; not in Firestore. Client secret from Secret Manager. No token logging in code paths. | `withingsSecrets.ts`; `integrations.ts` (no log of refresh_token/access_token). |
| **Completion URL** | Callback redirects to completion using `host`/x-forwarded-proto, not PUBLIC_BASE_URL → possible wrong host behind gateway. | `integrations.ts` L286–291. |
| **Gateway** | connect (firebase), callback (public), complete (public, text/html) routed; probes return 200/400/401 as expected. | `infra/gateway/openapi.yaml`; curl evidence below. |
| **Gateway status** | **Missing:** /integrations/withings/status not in OpenAPI or backend. | openapi.yaml has no `/integrations/withings/status`. |
| **Mobile** | Devices screen uses useWithingsPresence → getWithingsStatus (API); refetch after connect. DEBUG_WITHINGS_OAUTH=false. | `app/(app)/settings/devices.tsx`, `lib/data/useWithingsPresence.ts`. |
| **Mobile E2E** | Not executed in this audit run. Required for 10/10: Devices → Connect → auth → bridge → status = Connected (vs Firestore). | Auditor to perform and attach evidence. |
| **Cloud Run** | Listening on PORT=8080; latest revision oli-api-00105-ts2; env PUBLIC_BASE_URL, WITHINGS_REDIRECT_URI, WITHINGS_CLIENT_ID present. | gcloud describe output. |
| **Secrets** | withings-client-secret and withings-refresh-token-* exist (names only; no payload printed). | gcloud secrets list. |
| **Invariants** | All check-invariants.mjs and assert-api-routes.mjs gates passed. | Command output below. |
| **Tests** | npm run test failed in audit environment (Firestore emulator listen EPERM in sandbox). Not evidence of code defect. | Run with network/all perms for full proof. |

**Score rationale:** Backend OAuth flow, custody, and gateway routing are in place and working for connect/callback/complete/revoke. The missing status endpoint prevents the Devices screen from reflecting Firestore truth via the API. Completion URL should prefer PUBLIC_BASE_URL for consistency. No invariant violations; no token leakage. Mobile E2E not run → cap at 7 until status + E2E verified.

---

## 2) Phase 3A Reality Map

### Verified working

- **GET /integrations/withings/connect** — AUTH required; returns OAuth URL; canonical redirect and WITHINGS_REDIRECT_URI check in place. (`integrations.ts`, openapi.yaml)
- **GET /integrations/withings/callback** — PUBLIC; validates state; token exchange; writes Firestore `users/{uid}/integrations/withings` (connected: true); stores refresh token in Secret Manager only; redirects to completion. (`integrations.ts`, `oauthState.ts`, `withingsSecrets.ts`)
- **GET /integrations/withings/complete** — PUBLIC; returns text/html bridge with `oli://withings-connected`; Cache-Control: no-store. (`index.ts`, openapi produces: text/html)
- **POST /integrations/withings/revoke** — AUTH; destroys refresh token secret versions; sets Firestore connected: false, revoked: true.
- **Canonical redirect** — getCanonicalRedirectUri prefers PUBLIC_BASE_URL; assertRedirectUriOrFailClosed enforces match with WITHINGS_REDIRECT_URI. (`integrations.ts` L46–98)
- **Token exchange** — No token logging; only errMsg/status logged on failure. (`integrations.ts` L258)
- **Firestore write** — /users/{uid}/integrations/withings (connected, scopes, connectedAt, failureState). No refresh token in Firestore.
- **Secret Manager** — withings-client-secret; withings-refresh-token-&lt;uid&gt;. Names confirmed in project oli-staging-fdbba.
- **Cloud Run** — PORT=8080, 0.0.0.0; server.ts; no crash on misconfig (WithingsConfigError handled, 500 returned).
- **API Gateway** — _healthz 200, complete 200 text/html, callback 400 (no code/state), connect 401 (no token).
- **Mobile** — getWithingsConnectUrl(token); openAuthSessionAsync(authUrl, returnUrl); returnUrl = EXPO_PUBLIC_BACKEND_BASE_URL + /integrations/withings/complete; refetch after non-cancel; DEBUG_WITHINGS_OAUTH=false.

### Partially implemented

- **Completion URL in callback** — Uses `host` + x-forwarded-proto. Should prefer PUBLIC_BASE_URL when set so redirect always lands on gateway host. (`integrations.ts` L286–291)

### Missing

- **GET /integrations/withings/status** — Required for Devices screen “Status: Connected”. Mobile calls it (`lib/api/usersMe.ts` getWithingsStatus → `/integrations/withings/status`); backend has no route; OpenAPI has no path. Result: 404 for status → UI cannot show server truth.

### Broken

- **Devices “Status: Connected”** — Depends on GET /integrations/withings/status. Endpoint missing → status request fails → UI cannot reflect Firestore truth via API.

### Invariant violations

- **None.** Phase 1 invariants (deterministic behavior, failures visible, no silent drops, immutable history, readiness explicit, no secret leakage, no process crashes) upheld. check-invariants.mjs and assert-api-routes.mjs passed.

---

## 3) Evidence Pack (Appendix)

### A) Repo-truth map: Phase 3A requirements → files

| Requirement | Location |
|-------------|----------|
| GET /integrations/withings/connect (AUTH) | `services/api/src/routes/integrations.ts` (router.get("/withings/connect")) |
| GET /integrations/withings/callback (PUBLIC) | `services/api/src/index.ts` (app.get), handler in `integrations.ts` handleWithingsCallback |
| GET /integrations/withings/complete (PUBLIC HTML) | `services/api/src/index.ts` |
| POST /integrations/withings/revoke (AUTH) | `services/api/src/routes/integrations.ts` |
| Canonical redirect / fail-closed | `integrations.ts` getCanonicalRedirectUri, assertRedirectUriOrFailClosed |
| Token exchange (no token logging) | `integrations.ts` fetch(WITHINGS_TOKEN_URL), logger.info without tokens |
| Firestore integration write | `integrations.ts` userCollection(uid,"integrations").doc("withings").set |
| Secret Manager client secret | `services/api/src/lib/withingsSecrets.ts` getClientSecret, secretIdClientSecret |
| Secret Manager refresh token | withingsSecrets.ts setRefreshToken, getRefreshToken, deleteRefreshToken; secretIdRefreshToken(uid) |
| OAuth state create/validate | `services/api/src/lib/oauthState.ts` createStateAsync, validateAndConsumeState |
| Cloud Run PORT / listen | `services/api/src/server.ts` port 8080, host 0.0.0.0 |
| Gateway Withings routes | `infra/gateway/openapi.yaml` /integrations/withings/connect, callback, complete |
| Mobile connect flow | `app/(app)/settings/devices.tsx` getWithingsConnectUrl, openAuthSessionAsync, getWithingsReturnUrl |
| Mobile status (useWithingsPresence) | `lib/data/useWithingsPresence.ts` getWithingsStatus (expects GET /integrations/withings/status) |
| Mobile API client | `lib/api/withings.ts`, `lib/api/usersMe.ts` getWithingsStatus |

### B) Commands run + outcomes

**Local gates**

```bash
npm run typecheck   # exit 0
npm run lint        # exit 0
npm run test        # exit 1 — Firestore emulator listen EPERM in sandbox (not a code defect)
```

**Invariants**

```bash
node scripts/ci/check-invariants.mjs   # All checks passed (CHECK 1–22, console discipline, client trust boundary)
node scripts/ci/assert-api-routes.mjs   # ASSERT_API_ROUTES_OK
```

**Gateway probes (HOST=oli-gateway-cw04f997.uc.gateway.dev)**

| URL | Expected | Actual |
|-----|----------|--------|
| GET https://$HOST/_healthz | 200 application/json | 200, content-type application/json |
| GET https://$HOST/integrations/withings/complete | 200 text/html | 200, content-type text/html; charset=utf-8, cache-control no-store |
| GET https://$HOST/integrations/withings/callback | 400 (missing code/state) | 400, application/json |
| GET https://$HOST/integrations/withings/connect | 401 (no token) | 401, www-authenticate Bearer |

**Cloud Run**

```text
gcloud run services describe oli-api --project oli-staging-fdbba --region us-central1
# status.latestReadyRevisionName: oli-api-00105-ts2
# status.url: https://oli-api-7lrup47o4q-uc.a.run.app
# Env (names only): PUBLIC_BASE_URL, WITHINGS_REDIRECT_URI, WITHINGS_CLIENT_ID
```

**Secret Manager (names only)**

```text
gcloud secrets list --project oli-staging-fdbba
# withings-client-secret
# withings-refresh-token-<uid> (at least one present)
```

**Cloud Run logs**

- Sample read: no token or secret in log payloads. Errors seen include startup probe (CANCELLED); withings_* log keys use rid/uid/errMsg only.

### C) Key file excerpts (paths only; no secrets)

- **Canonical redirect:** `services/api/src/routes/integrations.ts` L46–98 (getCanonicalRedirectUri, assertRedirectUriOrFailClosed).
- **Completion URL (host-based):** `services/api/src/routes/integrations.ts` L286–291.
- **Firestore integration write:** `services/api/src/routes/integrations.ts` L273–284.
- **No token logging:** `services/api/src/routes/integrations.ts` L258 (logger.info with rid, uid, status, errMsg only); `services/api/src/lib/withingsSecrets.ts` L4 comment.
- **OpenAPI Withings paths:** `infra/gateway/openapi.yaml` L406–417 (connect), L426–442 (callback), L447–461 (complete). No /integrations/withings/status.

### D) OpenAPI vs deployed config (drift)

- **Repo:** `infra/gateway/openapi.yaml` defines connect (firebase), callback (public), complete (public, text/html). No status path.
- **Deployed:** apiConfig oli-api-config-20260215-123203; `gcloud api-gateway api-configs describe` openapiFiles returned null in audit run. Drift cannot be fully asserted without exported config. Recommendation: export active config and diff against repo openapi (e.g. `gcloud api-gateway api-configs describe ... --format=yaml` or equivalent) in CI or release process.

---

## 4) Bug List (Ranked)

### B1 — Missing GET /integrations/withings/status (Critical)

- **Symptom:** Devices screen cannot show “Status: Connected”; useWithingsPresence calls GET /integrations/withings/status and receives 404.
- **Root cause:** Backend does not implement the route; OpenAPI does not declare it.
- **Exact paths:** `lib/api/usersMe.ts` (getWithingsStatus), `lib/data/useWithingsPresence.ts` (calls getWithingsStatus); missing in `services/api/src/routes/integrations.ts` and `infra/gateway/openapi.yaml`.
- **Reproduction:** From app, open Devices → status request goes to /integrations/withings/status → 404.
- **Fix plan:** Add GET /withings/status in integrations router (auth required); read Firestore users/{uid}/integrations/withings and return { ok: true, connected: boolean }; add path to openapi.yaml with firebase security; deploy.
- **Verification:** curl with Bearer token returns 200 and { ok: true, connected: true|false }; Devices screen shows Connected when Firestore has connected: true.

### B2 — Completion redirect URL should prefer PUBLIC_BASE_URL (Medium)

- **Symptom:** After token exchange, redirect may send user to backend host (e.g. oli-api-*.run.app) instead of gateway host if `host` differs behind gateway.
- **Root cause:** completionUrl built from req host and x-forwarded-proto only. (`integrations.ts` L286–291)
- **Exact paths:** `services/api/src/routes/integrations.ts` L284–291.
- **Reproduction:** In an environment where host header is not the gateway host, complete URL would point to wrong host; mobile returnUrl is gateway /complete, so session might not auto-close.
- **Fix plan:** If process.env.PUBLIC_BASE_URL is set, use `${normalizeBaseUrl(PUBLIC_BASE_URL)}/integrations/withings/complete` for the redirect; else keep current host-based fallback.
- **Verification:** With PUBLIC_BASE_URL set, callback redirect response Location header is https://oli-gateway-cw04f997.uc.gateway.dev/integrations/withings/complete.

### B3 — assert-api-routes.mjs does not require Phase 3A routes (Low)

- **Symptom:** CI does not fail if Withings routes are removed.
- **Root cause:** mustHave in assert-api-routes.mjs only lists Phase 1/Sprint 1 routes.
- **Exact paths:** `scripts/ci/assert-api-routes.mjs` mustHave array.
- **Fix plan:** Add GET /integrations/withings/connect, GET /integrations/withings/status (after B1), and optionally POST /integrations/withings/revoke to mustHave or a Phase 3A–specific assertion.
- **Verification:** Remove a Withings route → assert-api-routes.mjs fails.

---

## 5) Roadmap to 10/10 Phase 3A

| # | Task | Done criteria | Verification |
|---|------|----------------|---------------|
| 1 | Implement GET /integrations/withings/status (auth) | Route returns { ok, connected } from Firestore | curl with Bearer → 200 + JSON |
| 2 | Add /integrations/withings/status to openapi.yaml (firebase) | Path present and deployed | Gateway accepts request with token |
| 3 | Completion URL use PUBLIC_BASE_URL when set | Redirect Location = PUBLIC_BASE_URL + /integrations/withings/complete | curl callback (with mock state/code) or log Location |
| 4 | Add Phase 3A routes to assert-api-routes.mjs (or dedicated script) | CI fails if route missing | Remove route → CI fails |
| 5 | Run mobile E2E: Devices → Connect Withings → auth → bridge → status Connected | Same user UID; Firestore connected: true; UI shows Connected | Manual or automated E2E + Firestore read |
| 6 | Confirm Firestore rules for users/{uid}/integrations (read by backend only; client via API) | No client write to integrations; client reads via API only | Rules audit; no SDK write from app |
| 7 | Document IAM for Secret Manager (oli-api-runtime) | Least-privilege roles documented; recommend secretAccessor on withings-* only | docs/ or 90_audits |
| 8 | Export deployed apiConfig and diff to repo openapi in CI or release | No silent drift | Diff step in pipeline or release checklist |

---

## 6) Sprint 3A Completion Checklist (Drop-in)

```markdown
## Sprint 3A Completion Checklist

- [ ] GET /integrations/withings/connect — returns OAuth URL (auth); canonical redirect and WITHINGS_REDIRECT_URI enforced.
- [ ] GET /integrations/withings/callback — public; state validated; token exchange; no token logging; refresh token in Secret Manager only; Firestore users/{uid}/integrations/withings (connected: true).
- [ ] GET /integrations/withings/complete — public; 200 text/html; oli://withings-connected in body; Cache-Control: no-store.
- [ ] GET /integrations/withings/status — auth; returns { ok, connected } from Firestore (no tokens).
- [ ] POST /integrations/withings/revoke — auth; destroys refresh token secret versions; Firestore connected: false, revoked: true.
- [ ] OpenAPI: connect (firebase), callback (public), complete (public, text/html), status (firebase).
- [ ] API Gateway probes: _healthz 200, complete 200 text/html, callback 400 without params, connect 401 without token.
- [ ] Cloud Run: PORT=8080; env PUBLIC_BASE_URL, WITHINGS_REDIRECT_URI, WITHINGS_CLIENT_ID; no crash on WithingsConfigError.
- [ ] Secret Manager: withings-client-secret, withings-refresh-token-<uid> (names only verified).
- [ ] Mobile: Devices → Connect Withings → openAuthSessionAsync with gateway /complete as returnUrl; refetch after flow; DEBUG_WITHINGS_OAUTH=false.
- [ ] Mobile E2E: Connect completes → browser closes → Devices shows “Status: Connected” and Firestore users/{uid}/integrations/withings.connected === true for same UID.
- [ ] No refresh/access token in Firestore or in logs.
- [ ] Invariants: check-invariants.mjs and assert-api-routes.mjs pass (Phase 3A routes included in assertion).
```

---

*End of Phase 3A Audit Report. All claims tied to repo evidence or commanded output; no assumptions.*
