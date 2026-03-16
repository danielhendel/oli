# Oura Sleep/Readiness Read Path — Routing & Auth Fix

## 1. Problem summary

- **Direct Cloud Run** (`https://oli-api-7lrup47o4q-uc.a.run.app/users/me/oura-sleep-view?day=...`) returns **401** with a Firebase ID token: "access token could not be verified". Cloud Run IAM/auth validates the request **before** it reaches the app; it expects a Google-issued token (used when the gateway invokes Cloud Run), not a Firebase token.
- **Gateway** (`https://oli-gateway-cw04f997.uc.gateway.dev/users/me/oura-sleep-view?day=...`) returns **404**: `{"code":404,"message":"The current request is not defined by this API."}`. The API Gateway OpenAPI spec did **not** define these paths, so the gateway rejects the request.
- Firestore and post-raw processing are confirmed; the blocker is **app read-path routing/auth** only.

---

## 2. App: base URL and where endpoints are called

| Item | Location | Detail |
|------|----------|--------|
| Base URL env | `EXPO_PUBLIC_BACKEND_BASE_URL` | Set in `.env` or EAS/build env. No default in code; `lib/api/http.ts` returns error "Missing EXPO_PUBLIC_BACKEND_BASE_URL" if unset. |
| Resolved URL | `lib/api/http.ts` | `normalizeBaseUrl(process.env.EXPO_PUBLIC_BACKEND_BASE_URL) + path`. Path is e.g. `/users/me/oura-sleep-view?day=YYYY-MM-DD`. |
| Gateway API key | `EXPO_PUBLIC_GATEWAY_API_KEY` | Required when base URL hostname ends with `.uc.gateway.dev`; appended as query `key=...` (`lib/api/http.ts` `isGatewayBaseUrl`, `requireGatewayApiKey`). |
| Sleep view | `lib/api/usersMe.ts` | `getOuraSleepView(day, idToken, opts)` → GET `${base}/users/me/oura-sleep-view?day=${encodeURIComponent(day)}` with `Authorization: Bearer ${idToken}`. |
| Readiness view | `lib/api/usersMe.ts` | `getOuraReadinessView(day, idToken, opts)` → GET `${base}/users/me/oura-readiness-view?day=...` with Bearer token. |
| Callers | `lib/data/useSleepView.ts`, `lib/data/useReadinessView.ts` | Hooks call the above with `day = toTodayYmd()` and token from `useAuth().getIdToken()`. |
| Debug | `app/debug/token.tsx` | Shows "Backend base URL" = `process.env.EXPO_PUBLIC_BACKEND_BASE_URL`. |

**Conclusion:** The app already calls the correct paths and sends the Firebase Bearer token. It must use the **gateway** base URL (and gateway API key when applicable) so that the gateway validates the Firebase token and forwards to Cloud Run with a Google token.

---

## 3. Gateway config and why the routes were 404

- **Spec:** `infra/gateway/openapi.yaml` defines the API Gateway (Google API Gateway) paths. Only paths listed there are exposed; any other path returns 404 "The current request is not defined by this API."
- **Backend:** `x-google-backend` points to Cloud Run (`https://oli-api-...run.app`) with `path_translation: APPEND_PATH_TO_ADDRESS` and `jwt_audience` so ESPv2 mints a Google ID token when calling Cloud Run.
- **Auth:** Top-level `security: firebase: []`; Firebase JWT is validated by the gateway (issuer/audience from `securityDefinitions.firebase`). The gateway does **not** forward the raw Firebase token to Cloud Run; it uses its own token for the backend call.
- **Gap:** `/users/me/oura-sleep-view` and `/users/me/oura-readiness-view` were implemented in `services/api/src/routes/usersMe.ts` but **were not** added to `openapi.yaml`, so the gateway never exposed them.

---

## 4. Correct architecture

- **Use the gateway** for mobile traffic. Flow: **App** (Firebase ID token + optional API key) → **Gateway** (validates Firebase JWT, calls Cloud Run with Google token) → **Cloud Run** (accepts Google token, Express runs `authMiddleware` which also validates Firebase from `X-Forwarded-Authorization` or similar if present; see backend auth). So the app must use `EXPO_PUBLIC_BACKEND_BASE_URL` = gateway URL (e.g. `https://oli-gateway-cw04f997.uc.gateway.dev` or the host from your gateway deployment).
- **Do not** point the app at the direct Cloud Run URL for these endpoints; Cloud Run IAM will reject the Firebase token.
- **Fix applied:** Add the two paths to `openapi.yaml` and redeploy the gateway config so the gateway defines and exposes them.

---

## 5. Exact code/config changes

| File | Change |
|------|--------|
| `infra/gateway/openapi.yaml` | Add two path blocks: ` /users/me/oura-sleep-view` and ` /users/me/oura-readiness-view`. Each: `options` (OPTIONS, security: []), `get` (operationId, security: firebase: [], parameter `day` in query required, responses 200/400/401/404/500). |

No changes to the Express app, Firestore, or mobile app code.

---

## 6. Deploy steps

1. **Commit the openapi change** (additions to `infra/gateway/openapi.yaml`).
2. **Set gcloud project** (if not already):
   ```bash
   gcloud config set project oli-staging-fdbba
   ```
3. **Deploy the gateway config** (creates new config and updates the gateway to use it):
   ```bash
   ./scripts/deploy/phase3a-withings-deploy-gateway.sh
   ```
   This script:
   - Creates a new API config from `infra/gateway/openapi.yaml` (e.g. `oli-api-config-YYYYMMDD-HHMMSS`).
   - Updates gateway `oli-gateway` in `us-central1` to use that config.
4. **Wait for propagation** (API Gateway config updates can take a short time to propagate).
5. **Ensure app env:** `EXPO_PUBLIC_BACKEND_BASE_URL` = your gateway base URL (e.g. `https://oli-gateway-cw04f997.uc.gateway.dev`). If that hostname ends with `.uc.gateway.dev`, also set `EXPO_PUBLIC_GATEWAY_API_KEY` to the key configured for the gateway.

---

## 7. Curl verification (200 with Firebase ID token)

Get a Firebase ID token (e.g. from Debug → Token in the app, or your own auth flow). Then:

```bash
# Replace GATEWAY_BASE and ID_TOKEN and DAY as needed.
GATEWAY_BASE="https://oli-gateway-cw04f997.uc.gateway.dev"
ID_TOKEN="<firebase-id-token>"
DAY="2026-03-15"

# If the gateway requires an API key, append ?key=YOUR_API_KEY to the URL.
# Sleep view
curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer $ID_TOKEN" \
  "$GATEWAY_BASE/users/me/oura-sleep-view?day=$DAY"

# Readiness view
curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer $ID_TOKEN" \
  "$GATEWAY_BASE/users/me/oura-readiness-view?day=$DAY"
```

With API key (when base host is `*.uc.gateway.dev`):

```bash
GATEWAY_API_KEY="<your-gateway-api-key>"

curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer $ID_TOKEN" \
  "$GATEWAY_BASE/users/me/oura-sleep-view?day=$DAY&key=$GATEWAY_API_KEY"

curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer $ID_TOKEN" \
  "$GATEWAY_BASE/users/me/oura-readiness-view?day=$DAY&key=$GATEWAY_API_KEY"
```

**Expected:** HTTP 200 and JSON body with `requestedDay`, `resolvedDay`, `isFallback`, `score`, `contributors`, etc. (or 404 with JSON if no snapshot in window). Trailing line `HTTP_CODE:200` or `HTTP_CODE:404` from `-w` confirms status.

---

## 8. Final proof checklist

- [ ] **Curl sleep view:** `curl -H "Authorization: Bearer <token>" "<gateway-base>/users/me/oura-sleep-view?day=YYYY-MM-DD"` returns **200** (or 404 with JSON when no data; not 404 "not defined by this API" and not 401).
- [ ] **Curl readiness view:** Same for `/users/me/oura-readiness-view?day=YYYY-MM-DD` returns **200** (or 404 with JSON).
- [ ] **App Sleep screen:** With `EXPO_PUBLIC_BACKEND_BASE_URL` set to the gateway URL (and `EXPO_PUBLIC_GATEWAY_API_KEY` if required), open Recovery → Sleep; screen shows **score + contributors** when data exists (no "No sleep data in the last 7 days" when Firestore has vendor data).
- [ ] **App Readiness screen:** Same for Recovery → Readiness; screen shows **score + contributors** when data exists.

---

## 9. Reference: openapi path snippets added

```yaml
  # Oura Tier 1 — Sleep view (vendor snapshot read; 404 when no snapshot in window)
  /users/me/oura-sleep-view:
    options: ...
    get:
      operationId: ouraSleepViewGet
      security: [ firebase: [] ]
      parameters: [ { name: day, in: query, required: true, type: string } ]
      responses: 200 / 400 / 401 / 404 / 500

  # Oura Tier 1 — Readiness view
  /users/me/oura-readiness-view:
    options: ...
    get:
      operationId: ouraReadinessViewGet
      security: [ firebase: [] ]
      parameters: [ { name: day, in: query, required: true, type: string } ]
      responses: 200 / 400 / 401 / 404 / 500
```

Firestore ingestion and post-raw processing are unchanged; this is strictly a read-path routing/auth fix.
