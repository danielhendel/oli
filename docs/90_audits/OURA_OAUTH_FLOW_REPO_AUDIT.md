# Oura OAuth Flow — Repo Audit Report

**Scope:** Code-only audit of Oura integration (auth, callback, complete, status, persistence, ingestion). No runtime or log inference.

---

## 1. Executive summary

- **Mobile flow:** Oura connect is started from `app/(app)/settings/devices/[deviceId].tsx` when `deviceId === "oura"`. `handleConnectOura` calls `getOuraConnectUrl(token)` then `WebBrowser.openAuthSessionAsync(authUrl, getOuraReturnUrl())`. Return URL is `EXPO_PUBLIC_BACKEND_BASE_URL` + `/integrations/oura/complete` when base is HTTPS, else `com.olifitness.oli://oura-connected`. **PROVEN IN CODE.**

- **Backend routes:** `/integrations/oura/callback` and `/integrations/oura/complete` are registered on the Express app in `services/api/src/index.ts` (exact `app.get`); `/integrations/oura/status`, `/connect`, `/revoke` live on the integrations router mounted at `/integrations` with `authMiddleware`. **PROVEN IN CODE.**

- **Callback handler:** `handleOuraCallback` in `integrations.ts` requires `code` and `state`; validates state via `validateAndConsumeState(state, OURA_OAUTH_PURPOSE)`; exchanges code at `OURA_TOKEN_URL`; persists only refresh token (Secret Manager) and integration doc at `users/{uid}/integrations/oura`; redirects to completion URL derived from callback URL (same host, path `/integrations/oura/complete`) or fallback `com.olifitness.oli://oura-connected`. **PROVEN IN CODE.**

- **Complete route:** `GET /integrations/oura/complete` serves 200 `text/html` with script + fallback link to `com.olifitness.oli://oura-connected`. No redirect; no query params used. **PROVEN IN CODE.**

- **Status:** `GET /integrations/oura/status` (auth required) reads `users/{uid}/integrations/oura` and returns `connected`, `lastSyncAt`, `revoked`, `failureState`. **PROVEN IN CODE.**

- **Persistence:** Refresh token in Secret Manager (`oura-refresh-token-{uid}`); integration metadata in Firestore `users/{uid}/integrations/oura` and registry `system/integrations/oura_connected/{uid}`. Access token and expiry are not stored. **PROVEN IN CODE.**

- **Ingestion:** `POST /integrations/oura/ingest` (auth + Idempotency-Key) accepts `sleep`/`hrv` arrays and writes raw events with `provider: "manual"`, `sourceId: "oura"`. No automatic sync or pull from Oura API in callback. **PROVEN IN CODE.**

- **Return URL alignment:** App return URL = `EXPO_PUBLIC_BACKEND_BASE_URL` + `/integrations/oura/complete`. Backend callback redirects to same host as callback + `/integrations/oura/complete`. If app uses gateway base URL, both point at gateway; match is **PROVEN IN CODE** provided env is consistent.

- **Scheme:** `app.json` declares `scheme: "com.olifitness.oli"`. Backend complete HTML and app fallback use `com.olifitness.oli://oura-connected`. No `oli://` scheme in repo; deep link is consistent. **PROVEN IN CODE.**

---

## 2. Oura flow file inventory

| File | Purpose |
|------|--------|
| `app/(app)/settings/devices/[deviceId].tsx` | Device detail UI; starts Oura connect, openAuthSessionAsync, return URL, refetch after auth |
| `app/(app)/settings/devices.tsx` | Devices list; uses `useOuraPresence`, links to `/(app)/settings/devices/oura` |
| `lib/api/oura.ts` | Client: getOuraStatus, getOuraConnectUrl, postOuraRevoke (paths /status, /connect, /revoke) |
| `lib/data/useOuraPresence.ts` | Hook: fetches Oura status, 404 backoff, exposes connected + lastSyncAt |
| `lib/integrations/oura/storage.ts` | AsyncStorage: lastCheckedAt, lastKnownConnected, status 404 backoff |
| `services/api/src/index.ts` | Mounts GET /integrations/oura/callback → handleOuraCallback; GET /integrations/oura/complete → HTML; /integrations + auth → integrationsRoutes; /integrations/oura/ingest + auth → ouraIngestRouter |
| `services/api/src/routes/integrations.ts` | Oura: getCanonicalRedirectUriOura, assertOuraRedirectUriOrFailClosed, GET /oura/status, GET /oura/connect, handleOuraCallback (exported), POST /oura/revoke; writeOuraFailureState |
| `services/api/src/lib/oauthState.ts` | createStateAsync(uid, purpose), validateAndConsumeState(state, purpose); state format uid:stateId; Firestore users/{uid}/oauthStates/{stateId} |
| `services/api/src/lib/ouraSecrets.ts` | Secret Manager: getClientSecret, setRefreshToken(uid), getRefreshToken(uid), deleteRefreshToken(uid); OuraConfigError |
| `services/api/src/routes/integrations/ouraIngest.ts` | POST /: ingest sleep/hrv arrays → rawEvents with provider "manual", sourceId "oura" |
| `services/api/src/db.ts` | userCollection(uid, "integrations").doc("oura"); ouraConnectedRegistryDoc(uid) → system/integrations/oura_connected/{uid} |
| `infra/gateway/openapi.yaml` | Paths for /integrations/oura/status, /connect, /revoke, /callback, /complete, /ingest; callback/complete security: [] |
| `app.json` | Expo scheme: "com.olifitness.oli" |
| `docs/runbooks/OURA_OAUTH_VERIFICATION_AND_REPAIR.md` | Runbook (not code truth) |

---

## 3. Mobile flow audit

| # | Claim | Evidence | Conclusion | Status |
|---|-------|----------|------------|--------|
| 1 | Screen that starts Oura connect | `app/(app)/settings/devices/[deviceId].tsx`: `isOura = id === "oura"`, `onPress={... handleConnectOura}` for Oura row | Device detail screen for `deviceId === "oura"` (e.g. route `/(app)/settings/devices/oura`) | PROVEN |
| 2 | Function called on tap | `handleConnectOura` (useCallback) — lines 166–205 | `handleConnectOura` | PROVEN |
| 3 | Auth URL construction path | `getOuraConnectUrl(token)` → `lib/api/oura.ts` → `apiGetZodAuthed("/integrations/oura/connect", ...)` → backend returns `{ url }`; authUrl = res.json.url | Backend builds URL; app uses returned URL | PROVEN |
| 4 | redirect_uri source (backend) | Backend: `getCanonicalRedirectUriOura(req)` → PUBLIC_BASE_URL or x-forwarded-proto/host → `.../integrations/oura/callback` (`integrations.ts` 119–130) | Backend; not from app | PROVEN |
| 5 | Return URL passed to openAuthSessionAsync | `getOuraReturnUrl()`: base = `process.env.EXPO_PUBLIC_BACKEND_BASE_URL`; if base and startsWith("https://") then `base/integrations/oura/complete` else `com.olifitness.oli://oura-connected` (`[deviceId].tsx` 25–31, 192) | Exact: `EXPO_PUBLIC_BACKEND_BASE_URL` + `/integrations/oura/complete` (when HTTPS) | PROVEN |
| 6 | Success/failure/cancel after auth session | `result.type === "cancel"` → Alert "Cancelled"; else `await ouraPresence.refetch()` (lines 193–199) | On success/dismiss (non-cancel): refetch; no explicit URL check in code | PROVEN |
| 7 | Polling status after auth | No polling loop. Refetch once after openAuthSessionAsync resolves (non-cancel). useOuraPresence fetches on mount and when refetch() called | No continuous poll; single refetch after return | PROVEN |
| 8 | iOS-specific logic | None found; same WebBrowser.openAuthSessionAsync for Oura as Withings | UNKNOWN (no iOS-only branch in repo) | PROVEN (no special case) |
| 9 | Deep link / scheme / universal link config | `app.json` scheme `"com.olifitness.oli"`. Android manifest has `com.olifitness.oli`; no Oura-specific linking config in repo | Scheme registered; no oura-specific linking file | PROVEN |

---

## 4. Backend route wiring audit

| Route | Registered | Handler | Middleware/Auth |
|-------|------------|---------|-----------------|
| GET /integrations/oura/callback | Yes | `app.get("/integrations/oura/callback", (req, res) => { void handleOuraCallback(req, res); })` — `index.ts` 172–174 | None (public) |
| GET /integrations/oura/complete | Yes | `app.get("/integrations/oura/complete", ...)` sends HTML — `index.ts` 179–190 | None (public) |
| GET /integrations/oura/status | Yes | Router in integrations.ts: `router.get("/oura/status", ...)`; app.use("/integrations", authMiddleware, integrationsRoutes) — `index.ts` 198 | authMiddleware |
| GET /integrations/oura/connect | Yes | `router.get("/oura/connect", ...)` — `integrations.ts` 659 | authMiddleware (via mount) |
| POST /integrations/oura/revoke | Yes | `router.post("/oura/revoke", ...)` — `integrations.ts` 851 | authMiddleware |
| POST /integrations/oura/ingest | Yes | `app.use("/integrations/oura/ingest", authMiddleware, ouraIngestRouter)` — `index.ts` 192 | authMiddleware |

**Gateway/base-url in code:** Callback uses `getCanonicalRedirectUriOura(req)` (PUBLIC_BASE_URL or forwarded host). Completion URL is derived from that callback URL: same host, path replaced with `/integrations/oura/complete`. No separate gateway host constant for Oura; same pattern as Withings.

---

## 5. /complete route audit

- **Exists:** Yes. `app.get("/integrations/oura/complete", ...)` in `services/api/src/index.ts` (179–190).
- **Content-Type:** `text/html; charset=utf-8`.
- **Cache-Control:** `no-store`.
- **Status/Body:** 200, HTML body with:
  - `<script>window.location.href = "com.olifitness.oli://oura-connected";</script>`
  - `<p>Redirecting…</p>`
  - Fallback link (same scheme) shown after 500ms.
- **Redirect:** No HTTP redirect; client-side navigation via script.
- **Intent for openAuthSessionAsync:** HTML loads in browser; script sets location to custom scheme so the app (opened with that scheme) can be resumed. Comment in Withings complete: "so WebBrowser.openAuthSessionAsync reliably auto-closes even when Safari lands on a JSON/wrong host." So yes, intended to satisfy return URL match and close the session.
- **Logging:** None in the /complete handler.

---

## 6. Callback behavior (exact sequence from code)

1. **Required query params:** `code` and `state` (both strings, trimmed). If missing → 400 `failure("BAD_REQUEST", "Missing code or state")`. (`integrations.ts` 699–708)
2. **State validation:** `validateAndConsumeState(state, OURA_OAUTH_PURPOSE)` where `OURA_OAUTH_PURPOSE = "oura_oauth"`. State format `uid:stateId`; Firestore `users/{uid}/oauthStates/{stateId}` must exist, purpose match, hash match, not expired, not used; then marked used. (`oauthState.ts` 37–73; `integrations.ts` 710–716)
3. **Pending auth state:** Loaded from Firestore `users/{uid}/oauthStates/{stateId}` inside `validateAndConsumeState`. No separate "pending auth" doc; state doc holds purpose, hash, expiresAt, usedAt.
4. **Code exchange vs state:** State is validated first (and consumed). Token exchange happens after state validation. (`integrations.ts` 710–771)
5. **Token endpoint:** `OURA_TOKEN_URL = "https://api.ouraring.com/oauth/token"`. POST, `application/x-www-form-urlencoded`, body: grant_type=authorization_code, code, redirect_uri, client_id, client_secret. (`integrations.ts` 21, 761–771)
6. **Fields persisted after exchange:** Refresh token only → Secret Manager via `ouraSecrets.setRefreshToken(uid, refreshToken)`. Integration doc: `connected: true`, `connectedAt`, `lastSyncAt: null`, `revoked: false`, `failureState: null` at `users/{uid}/integrations/oura`. Registry: `ouraConnectedRegistryDoc(uid).set({ connected: true, updatedAt })`. Access token and expiry are not persisted.
7. **Collection/document path:** `userCollection(uid, "integrations").doc("oura")` → `users/{uid}/integrations/oura`; registry `system/integrations/oura_connected/{uid}`. (`integrations.ts` 796–816; `db.ts`)
8. **Error branches:** Missing code/state → 400. Invalid state → 400 + log oura_callback_state_invalid. Redirect assert fail → assert has already sent 500 in assertOuraRedirectUriOrFailClosed; then writeOuraFailureState + return. Client secret/config error → 500 + writeOuraFailureState. Token exchange non-200 or tokenJson.error → writeOuraFailureState + 400. Missing refresh_token → writeOuraFailureState + 400. Other errors → 500 + writeOuraFailureState.
9. **Redirect target after success:** `callbackUrl = redirect.redirectUri`; `completionUrl = /\/integrations\/oura\/callback$/i.test(callbackUrl) ? callbackUrl.replace(/\/integrations\/oura\/callback$/i, "/integrations/oura/complete") : "com.olifitness.oli://oura-connected"`; `res.redirect(302, completionUrl)`. (`integrations.ts` 819–824)
10. **Fallback redirect:** If callback URL does not match regex, completionUrl = `com.olifitness.oli://oura-connected`. So redirect is either same-host /integrations/oura/complete or deep link.
11. **Logging:** `logger.info({ msg: "oura_callback_state_invalid", ... })`; `logger.error` for secret/config, token exchange failure, registry write; `console.log("[OURA_CALLBACK_REDIRECT]", { requestId, stateValid: true, completionUrl })` on success path.

---

## 7. Persistence + status + ingestion audit

- **Where Oura tokens stored:** Refresh token in Google Secret Manager, secret id `oura-refresh-token-{uid}`. (`ouraSecrets.ts`)
- **Refresh token stored:** Yes. Access token not stored.
- **Expiry stored:** No. Only integration doc fields: connected, connectedAt, lastSyncAt, revoked, failureState.
- **Scopes stored:** No. Not written in callback or status.
- **Integration status fields (Firestore):** connected, connectedAt, lastSyncAt, revoked, failureState. (`integrations.ts` 797–806)
- **Ingestion/sync endpoint:** `POST /integrations/oura/ingest` (auth + Idempotency-Key). Body: `sleep[]`, `hrv[]`; writes to `users/{uid}/rawEvents` with provider "manual", sourceId/sourceType "oura". (`ouraIngest.ts`)
- **Initial sync triggered in callback:** No. Callback does not call Oura API or ingest; no sync job triggered in callback code.
- **Downstream:** Ingest writes raw events only. No automatic pull from Oura API in repo (no equivalent of Withings pull/pull-now/backfill for Oura in this codebase).
- **TODOs/placeholders:** None found in Oura callback/status/ingest paths.

---

## 8. Environment / config dependencies

| Variable | File(s) | Required/Optional (from code) | What breaks if missing (only if shown in code) |
|----------|---------|-------------------------------|--------------------------------------------------|
| PUBLIC_BASE_URL | integrations.ts (getCanonicalRedirectUriOura) | Optional (fallback to x-forwarded-proto/host) | If unset, callback URL uses forwarded host; completion URL still derived from that. |
| OURA_CLIENT_ID | integrations.ts (connect + callback) | Required for connect and callback | Connect: 500 "Oura OAuth not configured". Callback: 500 "Oura OAuth not configured". |
| OURA_REDIRECT_URI | integrations.ts (assertOuraRedirectUriOrFailClosed) | Optional; if set must match canonical | If set and mismatch → 500 OURA_REDIRECT_URI mismatch. |
| Oura client secret | ouraSecrets.ts (Secret Manager) | Required for callback | getClientSecret() from Secret Manager; OuraConfigError or null → 500 or callback failure. |
| EXPO_PUBLIC_BACKEND_BASE_URL | [deviceId].tsx (getOuraReturnUrl), lib/api/http.ts, lib/env.ts | Required (env assert; http returns error if missing) | App: return URL becomes fallback `com.olifitness.oli://oura-connected`. API calls: return `ok: false`, error "Missing EXPO_PUBLIC_BACKEND_BASE_URL". |
| EXPO_PUBLIC_GATEWAY_API_KEY | lib/api/http.ts (requireGatewayApiKey) | Required when base URL hostname ends with `.uc.gateway.dev` | apiGetZodAuthed/apiPostZodAuthed return error "Missing EXPO_PUBLIC_GATEWAY_API_KEY (required for API Gateway)". |
| GOOGLE_CLOUD_PROJECT / GCLOUD_PROJECT / GCP_PROJECT / PROJECT_ID | ouraSecrets.ts (resolveProjectIdFromEnv) | Required for Secret Manager | getProjectId() throws OuraConfigError → callback 500. |

---

## 9. Expected end-to-end flow from code

| Step | Description | Status |
|------|-------------|--------|
| 1 | User taps connect in app (devices/oura) | PROVEN IN CODE |
| 2 | App opens browser/auth session to Oura authorize URL (from GET /integrations/oura/connect) | PROVEN IN CODE |
| 3 | Oura redirects to backend callback (GET /integrations/oura/callback?code=&state=) | DEPENDS ON RUNTIME / NOT PROVEN IN REPO |
| 4 | Backend validates state, exchanges code, writes integration state | PROVEN IN CODE |
| 5 | Backend writes integration state (Firestore + Secret Manager + registry) | PROVEN IN CODE |
| 6 | Backend redirects to /integrations/oura/complete (same host) or deep link | PROVEN IN CODE |
| 7 | Browser reaches /complete and gets HTML → script navigates to com.olifitness.oli://oura-connected | PROVEN IN CODE |
| 8 | App auth session resolves (Expo matches return URL or scheme) | DEPENDS ON RUNTIME / NOT PROVEN IN REPO |
| 9 | App calls ouraPresence.refetch() (no polling) | PROVEN IN CODE |
| 10 | Connected state appears in UI (status from GET /integrations/oura/status) | PROVEN IN CODE |

---

## 10. Repo-level gaps only

1. **No automatic Oura data pull/sync after connect:** Callback does not trigger any Oura API fetch or ingest. Ingestion is only via explicit POST /integrations/oura/ingest. So "connected" is stored but no initial sync is started in code. Evidence: callback only writes integration doc + refresh token; ouraIngest is manual POST. (`integrations.ts` callback path; `ouraIngest.ts` is standalone POST handler.)

---

## 11. Open runtime questions (repo cannot answer)

1. Whether real callback requests with valid code/state reach the backend (logs/metrics).
2. Whether the browser actually loads the gateway URL for /integrations/oura/complete after redirect (or a different host).
3. Whether Expo’s openAuthSessionAsync matches the return URL when the user lands on the gateway /complete page (same origin as return URL).
4. Whether iOS Universal Links or Android App Links are configured for the gateway domain to open the app.
5. Whether PUBLIC_BASE_URL is set in the deployed Cloud Run service and matches the gateway base URL.
6. Whether OURA_CLIENT_ID and Oura client secret (Secret Manager) are set in the deployment.

---

*End of audit. All conclusions are from repo code only; no fixes proposed unless requested.*

---

## Appendix: Expo Router handling for deep link `com.olifitness.oli://oura-connected`

**1. Whether any Expo Router file currently handles path `/oura-connected`**  
**No.** No route file exists for that path. Evidence:
- `git grep -n "oura-connected"` shows only backend/mobile usage of the string (backend fallback URL, app fallback return URL, API complete HTML). No file under `app/` is named or references a route for it.
- `Glob app/**/oura*` → 0 files under `app/`.
- `app/(app)/_layout.tsx` declares `Stack.Screen` for many routes; none is `oura-connected` or `oura-connected/index`. No `oura-connected.tsx` under `app/` or `app/(app)/`.

**Conclusion:** No route found for /oura-connected from repo code.

**2. Whether any custom linking config remaps that path**  
**No.** Evidence:
- `app.json` has only `"scheme": "com.olifitness.oli"`. No `linking`, `path`, or path-mapping config.
- No `getStateFromPath`, `getPathFromState`, or `Linking`-based path remapping in the repo.
- No `expo.config.js`/`expo.config.ts` in project root; Expo config is `app.json` only.

**Conclusion:** No custom linking config remaps `/oura-connected`.

**3. Smallest valid route file to handle it**  
Expo Router (file-based) would resolve `com.olifitness.oli://oura-connected` to a path; the path segment is `oura-connected`. To be inside the authenticated `(app)` group (so `RouteGuard` in `app/_layout.tsx` does not redirect to sign-in), the file must live under the `(app)` group. Smallest valid route file:

- **Path:** `app/(app)/oura-connected.tsx`
- **Minimal content (redirect only):**
```tsx
import { Redirect } from "expo-router";

export default function OuraConnected() {
  return <Redirect href="/(app)/settings/devices/oura" />;
}
```

**4. Which existing screen should own that route (repo conventions)**  
The Oura connect flow and UI live in **`app/(app)/settings/devices/[deviceId].tsx`** with `deviceId === "oura"` (and `router.push("/(app)/settings/devices/oura")` from `app/(app)/settings/devices.tsx` line 168). So the screen that “owns” the post-connect experience is the Oura device detail screen. Convention in this repo: index routes often only redirect (e.g. `app/index.tsx` → `Redirect href="/(app)"`, `app/(app)/index.tsx` → `Redirect href="/(app)/(tabs)/dash"`). So the route that handles the deep link should redirect to the existing owner screen: **`/(app)/settings/devices/oura`**, i.e. the same `[deviceId].tsx` screen with segment `oura`.

---

## Appendix: Oura post-connect ingestion path (repo-only audit)

**1. Whether any automatic sync is triggered after successful callback**  
**PROVEN FROM CODE: No.** The Oura callback in `services/api/src/routes/integrations.ts` (lines 759–825) after success only: exchanges token, calls `ouraSecrets.setRefreshToken(uid, refreshToken)`, writes `integrationRef.set({ connected: true, connectedAt, lastSyncAt: null, revoked: false, failureState: null })`, writes `ouraConnectedRegistryDoc(uid).set(...)`, then `res.redirect(302, completionUrl)`. There is no call to any ingest function, no fetch to Oura API, and no enqueue of a sync job. Compare Withings: `handleWithingsCallback` sets `backfill: { status: "running", ... }` and the status handler can auto-start backfill; Oura has no equivalent backfill or pull in the callback path.

**2. What POST /integrations/oura/ingest expects exactly**  
**PROVEN FROM CODE.**  
- **Route:** `POST /integrations/oura/ingest` — mounted in `services/api/src/index.ts` line 192: `app.use("/integrations/oura/ingest", authMiddleware, ouraIngestRouter)`. Handler: `services/api/src/routes/integrations/ouraIngest.ts` `router.post("/", ...)`.  
- **Auth:** JWT required (`authMiddleware`); `uid` from `(req as AuthedRequest).uid`. No uid → 401.  
- **Headers:** `Idempotency-Key` or `X-Idempotency-Key` (string, trimmed) required. Missing → 400 "Idempotency-Key header is required for Oura ingest". (Lines 58–85.)  
- **Body:** JSON matching `ouraIngestBodySchema` (lines 50–56):
  - `sleep`: optional array of items matching `sleepItemSchema` (lines 27–38): `idempotencyKey`, `start`, `end`, `timezone` (strings min 1), `day` optional YYYY-MM-DD, `totalMinutes` (number ≥ 0), `efficiency` (0–1 or null), `latencyMinutes`, `awakenings` (≥ 0 or null), `isMainSleep` (boolean).
  - `hrv`: optional array of items matching `hrvItemSchema` (lines 40–47): `idempotencyKey`, `time`, `timezone`, `day` optional, `rmssdMs`, `sdnnMs` (≥ 0 or null), `measurementType` optional enum `["nightly", "spot"]`.
  - Refine: at least one of `sleep` or `hrv` must have length > 0.  
- **Response (success):** 200 JSON `{ ok: true, requestId, eventsCreated, eventsAlreadyExists }`.

**3. Whether any caller in the app or backend currently invokes that ingest endpoint**  
**PROVEN FROM CODE: No.** Grep for `/integrations/oura/ingest`, `postOuraIngest`, or `oura.*ingest` in `*.ts`/`*.tsx` shows only: (1) `services/api/src/index.ts` (mount), (2) `services/api/src/routes/integrations/ouraIngest.ts` (handler), (3) `services/api/src/routes/integrations/__tests__/ouraIngest.test.ts` (supertest). No `lib/api/oura.ts` or other app/backend module POSTs to `/integrations/oura/ingest`. **NOT IMPLEMENTED:** no production caller.

**4. Raw event shapes written for Oura**  
**PROVEN FROM CODE.** Handler builds a doc per item and validates with `rawEventDocSchema` from `@oli/contracts` (`lib/contracts/rawEvent.ts`). Written to `userCollection(uid, "rawEvents").doc(item.idempotencyKey)` → `users/{uid}/rawEvents/{idempotencyKey}`.  
- **Sleep:** `id`, `userId`, `sourceId: "oura"`, `sourceType: "oura"`, `provider: "manual"`, `kind: "sleep"`, `receivedAt`, `observedAt: item.start`, `schemaVersion: 1`, `payload` per `manualSleepPayloadSchema` (start, end, timezone, day?, totalMinutes, efficiency?, latencyMinutes?, awakenings?, isMainSleep).  
- **HRV:** same metadata with `kind: "hrv"`, `observedAt: item.time`, `payload` per `manualHrvPayloadSchema` (time, timezone, day?, rmssdMs?, sdnnMs?, measurementType?). Duplicates: doc id = idempotencyKey; `.create()` used → duplicate counts as `eventsAlreadyExists`.

**5. Smallest production-safe first-sync implementation (from code only)**  
**From repo evidence:** Ingest is the only writer for Oura raw events and expects the body/headers above. Refresh token is stored per uid; there is no Oura API client in repo (no fetch to api.ouraring.com for sleep/HRV). Withings pattern: user-authenticated `POST /integrations/withings/pull-now` (withingsPullNow.ts) gets refresh token, fetches Withings API, builds raw-event docs, validates with `rawEventDocSchema`, writes. **Smallest production-safe first-sync:** a backend path (e.g. pull-now style route or job) that (1) is authenticated, (2) reads Oura refresh token via `ouraSecrets.getRefreshToken(uid)`, (3) exchanges for access token (refresh grant not in repo today), (4) calls Oura sleep/HRV APIs (not in repo), (5) maps to `sleepItemSchema`/`hrvItemSchema` shapes, (6) either reuses ingest write logic or POSTs to `POST /integrations/oura/ingest` with Idempotency-Key and body. **NOT IMPLEMENTED** in repo: no Oura fetch client, no pull-now/pull/backfill for Oura, no automatic trigger after callback.
