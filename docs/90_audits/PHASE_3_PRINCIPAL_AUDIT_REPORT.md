# Phase 3 Principal Audit Report — Withings Weight Ingestion + Backfill + Mobile Timeline

**Role:** Principal mobile/backend systems auditor  
**Scope:** Phase 3 (Withings OAuth, token custody, backfill, raw events, mobile Weight UI, timeline, observability)  
**Source of truth:** Repo code only; no assumptions.  
**Audit type:** No guessing; citations with file paths and line references.

---

## 1) Executive summary (top 5 issues)

| # | Severity | Issue | Evidence |
|---|----------|--------|----------|
| 1 | 🔒 | **Deep link scheme mismatch:** Completion bridge and devices.tsx use `oli://withings-connected` but `app.json` declares `scheme: "com.olifitness.oli"`. OAuth return may not reopen the app on some platforms. | `app.json` L5; `services/api/src/index.ts` L137–139; `app/(app)/settings/devices.tsx` L18 |
| 2 | 🐞 | **withingsPull writes `provider: "manual"`** while backfill writes `provider: "withings"`. Contract allows any string; ingestion gateway restricts POST /ingest to "manual". Pull is inconsistent and under-represents provenance. | `services/api/src/routes/withingsPull.ts` L121–123; `services/api/src/routes/withingsBackfill.ts` L293; `services/api/src/types/events.ts` L50 |
| 3 | ⚠️ | **Invoker routes not in API Gateway OpenAPI:** `/integrations/withings/backfill` and `/integrations/withings/pull` are not defined in `openapi.yaml`. Scheduler calls Cloud Run directly (by design), but gateway docs and any gateway-level rate/audit don’t cover these. | `infra/gateway/openapi.yaml` (no backfill/pull paths); `services/functions/src/withings/onWithingsBackfillScheduled.ts` L37 |
| 4 | ✨ | **Timeline [day] does not list weight raw events:** Day view shows canonical events + incomplete raw events only. Weight raw events (Withings + manual) are shown only on the Weight page via `useWeightSeries`. Timeline does not “load and render” weight raw events as list items. | `app/(app)/(tabs)/timeline/[day].tsx` L55–62 (useEvents + rawIncomplete only); `lib/data/useWeightSeries.ts` L295–298 |
| 5 | 🔥 | **DEBUG_BACKEND_BASE_URL console.log in production path:** `lib/api/http.ts` logs base URL on every authed request (getApiBaseUrl), which can leak backend hostnames in client logs. | `lib/api/http.ts` L191–192, L221–222, L254–255 |

---

## 2) File inventory (by category)

### A) Mobile app (Expo Router v2 RN TS)

| File | Purpose |
|------|--------|
| `app/(app)/body/weight.tsx` | Weight page: device status, range selector, insights, manual log modal |
| `app/(app)/body/__tests__/weight-screen.test.tsx` | Weight screen tests (mocked useWithingsPresence, useWeightSeries) |
| `app/(app)/settings/devices.tsx` | Withings connect flow: getWithingsConnectUrl, WebBrowser.openAuthSessionAsync, returnUrl |
| `lib/ui/WeightDeviceStatusCard.tsx` | Device trust: connected, lastMeasurementAt, backfill, Connect Withings CTA |
| `lib/ui/WeightLogModal.tsx` | Manual weight entry; logWeight API, emitRefresh for command center |
| `lib/ui/WeightRangeSelector.tsx` | 7D/30D/90D/1Y/All range chips |
| `lib/ui/WeightInsightCard.tsx` | Trend insights (deterministic bullets) |
| `lib/data/useWeightSeries.ts` | Fetches raw events kind=weight, maps to WeightPoint, buildViewModel |
| `lib/data/useWithingsPresence.ts` | getWithingsStatus + getRawEvents(kinds: [WITHINGS_WEIGHT_KIND]), filter sourceId=withings |
| `lib/data/withingsPresenceContract.ts` | WITHINGS_WEIGHT_KIND="weight", WITHINGS_SOURCE_ID="withings" |
| `lib/data/__tests__/useWithingsPresence.withingsContract.test.ts` | Contract regression: kind=weight, sourceId=withings |
| `lib/api/usersMe.ts` | getWithingsStatus, getRawEvents, getRawEvent, logWeight |
| `lib/api/withings.ts` | getWithingsConnectUrl (GET /integrations/withings/connect) |
| `lib/api/http.ts` | apiGetZodAuthed, apiPostZodAuthed, getApiBaseUrl (EXPO_PUBLIC_BACKEND_BASE_URL), requestId handling |
| `app/(app)/(tabs)/timeline/[day].tsx` | Day view: useEvents (canonical), useRawEvents(incomplete), useTimeline, useFailures |
| `app/(app)/(tabs)/timeline/index.tsx` | Timeline list; useTimeline |
| `app.json` | Expo scheme: `com.olifitness.oli` (no `oli` scheme) |

### B) API (Cloud Run Express)

| File | Purpose |
|------|--------|
| `services/api/src/index.ts` | Mounts: callback/complete PUBLIC; pull/backfill requireInvokerAuth; /integrations authMiddleware |
| `services/api/src/routes/integrations.ts` | GET connect, status, callback (handleWithingsCallback), complete (in index), POST revoke; state, redirect URI, token exchange, Secret Manager |
| `services/api/src/routes/withingsPull.ts` | POST /pull: getConnectedWithingsUids, fetchWithingsMeasures, RawEvent create (idempotencyKey), FailureEntry on error |
| `services/api/src/routes/withingsBackfill.ts` | POST /backfill: mode start/resume/stop, cursor in users/{uid}/integrations/withings, RawEvent create, metrics |
| `services/api/src/routes/events.ts` | POST /ingest: ingestRawEventSchema, rawEventDocSchema, rawEvents doc id = idempotencyKey |
| `services/api/src/routes/usersMe.ts` | GET /raw-events, GET /rawEvents/:id, timeline, day-truth, etc. |
| `services/api/src/db.ts` | withingsConnectedRegistryCollection/Doc, userCollection(uid, "rawEvents" | "integrations" | …) |
| `services/api/src/middleware/auth.ts` | X-Forwarded-Authorization preferred, then Authorization; verifyIdToken; req.uid |
| `services/api/src/middleware/invokerAuth.ts` | x-goog-authenticated-user-email or Bearer ID token; allowlist (WITHINGS_PULL_INVOKER_EMAILS/SUBS); INVOKER_TOKEN_AUDIENCE |
| `services/api/src/lib/oauthState.ts` | createStateAsync, validateAndConsumeState (state = uid:stateId, Firestore oauthStates) |
| `services/api/src/lib/withingsSecrets.ts` | getRefreshToken, setRefreshToken, deleteRefreshToken, getClientSecret (Secret Manager) |
| `services/api/src/lib/withingsMeasures.ts` | getRefreshToken, getClientSecret; refresh access token; fetchWithingsMeasures; buildIdempotencyKey |
| `services/api/src/lib/logger.ts` | requestIdMiddleware, accessLogMiddleware, rid on request/response |
| `services/api/src/lib/writeFailure.ts` | writeFailure (FailureEntry) |
| `services/api/src/types/events.ts` | ingestRawEventSchema, rawEventProviderSchema = ["manual"] |

### C) Firebase Functions Gen2 + Scheduler

| File | Purpose |
|------|--------|
| `services/functions/src/withings/onWithingsBackfillScheduled.ts` | onSchedule every 15 min; GoogleAuth.getIdTokenClient(baseUrl); POST baseUrl/integrations/withings/backfill mode=resume |
| `services/functions/src/withings/__tests__/onWithingsBackfillScheduled.test.ts` | Export and run contract |
| `services/functions/src/index.ts` | Exports onWithingsBackfillScheduled |

### D) Firestore schema / raw events

| Path / concept | Evidence |
|----------------|----------|
| `users/{uid}/rawEvents/{rawEventId}` | events.ts L154–157; withingsPull L104–108; withingsBackfill L275–279 |
| `users/{uid}/integrations/withings` | integrations.ts L149, L292, L411; withingsBackfill L125, cursor/backfill status |
| `system/integrations/withings_connected/{uid}` | db.ts L28–34; integrations.ts L436; withingsPull L28–29; withingsBackfill L61–62 |
| `users/{uid}/oauthStates/{stateId}` | oauthState.ts L19, L46 |
| RawEvent doc: kind, sourceId, sourceType, provider, observedAt, payload | rawEvent.ts rawEventBaseSchema; withingsBackfill L288–299 (provider "withings"); withingsPull L117–124 (provider "manual") |

### E) API Gateway + auth routing

| File | Purpose |
|------|--------|
| `infra/gateway/openapi.yaml` | securityDefinitions firebase (x-google-issuer, x-google-jwt-locations: Authorization, X-Forwarded-Authorization); paths /integrations/withings/connect, status, callback, complete (callback/complete security: []); no /backfill or /pull |

### F) Withings OAuth + token custody + callback/complete bridge

| File | Purpose |
|------|--------|
| `services/api/src/routes/integrations.ts` | connect: createStateAsync, redirect_uri canonical, state; callback: validateAndConsumeState, token exchange, setRefreshToken(uid), Firestore integration doc (no tokens), registry set; complete URL in response |
| `services/api/src/index.ts` | GET /integrations/withings/callback → handleWithingsCallback; GET /integrations/withings/complete → HTML with oli://withings-connected |
| `services/api/src/lib/withingsSecrets.ts` | Secret Manager: withings-refresh-token-{uid}, withings-client-secret |
| `app/(app)/settings/devices.tsx` | returnUrl = backend /integrations/withings/complete or oli://withings-connected; openAuthSessionAsync(authUrl, returnUrl) |

### G) Backfill + idempotency + failure entries

| File | Purpose |
|------|--------|
| `services/api/src/routes/withingsBackfill.ts` | start/resume/stop; cursor in users/{uid}/integrations/withings; create-only RawEvent doc id = idempotencyKey; writeFailure on schema/write error; response: usersProcessed, eventsCreated, eventsAlreadyExists, failuresWritten, failureWriteErrors, backfillUpdated |
| `services/api/src/routes/withingsPull.ts` | create-only RawEvent; FailureEntry on fetch/write error; same metrics (no backfillUpdated) |
| `services/api/src/lib/withingsMeasures.ts` | buildIdempotencyKey; fetchWithingsMeasures (Withings API) |
| `services/functions/src/withings/onWithingsBackfillScheduled.ts` | POST backfill mode=resume |

### H) Timeline / Weight UI + data fetching hooks

| File | Purpose |
|------|--------|
| `lib/data/useWeightSeries.ts` | getRawEvents(kinds: ["weight"]), getRawEvent per item, buildViewModel (points, latest, insights) |
| `lib/data/useWithingsPresence.ts` | getWithingsStatus; getRawEvents(kinds: [WITHINGS_WEIGHT_KIND], limit 50, last 7 days); filter sourceId === WITHINGS_SOURCE_ID |
| `app/(app)/body/weight.tsx` | useWithingsPresence, useWeightSeries(range), WeightDeviceStatusCard, WeightLogModal, refetch on modal save |
| `app/(app)/(tabs)/timeline/[day].tsx` | useEvents (canonical), useRawEvents(incomplete only), useTimeline, useFailures; no weight raw-events list |

### I) Observability + error UX + fail-closed

| File | Purpose |
|------|--------|
| `services/api/src/lib/logger.ts` | requestIdMiddleware (x-request-id), accessLogMiddleware (msg, rid, method, path, status, ms, uid) |
| `services/api/src/middleware/auth.ts` | 401 on missing/invalid token |
| `services/api/src/middleware/invokerAuth.ts` | 403 INVOKER_*; no token logging; logInvokerReject |
| `lib/api/http.ts` | authErrorFriendlyMessage; requestId in response; contract/network error handling |
| `app/(app)/body/weight.tsx` | ErrorState with requestId, onRetry, isContractError |
| `lib/ui/ScreenStates.tsx` | LoadingState, ErrorState, EmptyState (referenced by weight and timeline) |

---

## 3) End-to-end flow diagram (text)

```
Mobile (Weight / Devices)
  │
  ├─ GET /integrations/withings/connect (Bearer Firebase ID token)
  │    → Gateway (firebase security) → Cloud Run → authMiddleware (X-Forwarded-Authorization/Authorization)
  │    → integrationsRouter → createStateAsync → return { url: Withings authorize + redirect_uri + state }
  │
  ├─ User completes Withings OAuth → Withings redirects to
  │    GET /integrations/withings/callback?code=…&state=… (PUBLIC, no auth)
  │    → Gateway (security: []) → Cloud Run → no authMiddleware
  │    → handleWithingsCallback → validateAndConsumeState → token exchange → setRefreshToken(uid) →
  │    Firestore users/{uid}/integrations/withings (connected, backfill start) + registry set →
  │    redirect to /integrations/withings/complete
  │
  ├─ GET /integrations/withings/complete (PUBLIC)
  │    → 200 text/html with oli://withings-connected → WebBrowser closes; app may not reopen (scheme mismatch risk)
  │
  ├─ GET /integrations/withings/status (Bearer)
  │    → integrationsRouter → Firestore integration doc (no tokens); returns backfill state
  │
  ├─ GET /users/me/raw-events?kinds=weight&… (Bearer)
  │    → usersMeRoutes → Firestore rawEvents orderBy observedAt desc, filter kinds
  │
  └─ POST /ingest (manual weight) (Bearer)
       → eventsRoutes → rawEventDocSchema → users/{uid}/rawEvents/{idempotencyKey}.create()

Scheduler (Firebase Functions Gen2)
  │
  └─ onWithingsBackfillScheduled (every 15 min)
       → OLI_API_BASE_URL = Cloud Run URL (not gateway)
       → GoogleAuth.getIdTokenClient(baseUrl) → POST /integrations/withings/backfill (Bearer ID token, aud=baseUrl)
       → Cloud Run (direct) → requireInvokerAuth (allowlist email/sub, INVOKER_TOKEN_AUDIENCE) →
       withingsBackfillRouter → getConnectedWithingsUids() → per user: cursor read, fetchWithingsMeasures (Secret Manager refresh token), RawEvent create (idempotencyKey), FailureEntry on error, cursor update
       → 200 { usersProcessed, eventsCreated, … }

Mobile Weight page
  │
  └─ useWeightSeries(range) → getRawEvents(kinds: ["weight"]) → getRawEvent(id) per item → buildViewModel (points, insights)
       useWithingsPresence() → getWithingsStatus + getRawEvents(kinds: ["weight"]) → filter sourceId==="withings" → lastMeasurementAt, hasRecentData
```

---

## 4) Findings table (status, severity, evidence, fix)

| ID | Area | Status | Severity | Evidence | Fix (audit-only; no impl) |
|----|------|--------|----------|----------|----------------------------|
| F1 | Deep link | 🐞 | 🔒 | app.json scheme is "com.olifitness.oli"; backend and devices.tsx use "oli://withings-connected". | Align: either add "oli" to Expo scheme or change backend/complete to com.olifitness.oli://withings-connected. |
| F2 | Pull provenance | 🐞 | Correctness | withingsPull.ts L121–123 provider: "manual"; withingsBackfill.ts L293 provider: "withings". Contract rawEvent.ts L250 provider: z.string().min(1). | In withingsPull.ts set provider: "withings" (contract allows it; only POST /ingest gateway restricts to "manual"). |
| F3 | Gateway backfill/pull | ⚠️ | Docs/ops | openapi.yaml has no /integrations/withings/backfill or /pull. Scheduler calls Cloud Run URL. | Document that invoker routes are Cloud Run–only; or add paths to openapi with security: [] and description "invoker-only, not via gateway". |
| F4 | Timeline weight list | ⚠️ | UX | [day].tsx uses useEvents (canonical) and useRawEvents(incomplete). No useRawEvents(kinds: ["weight"]). | If product requires weight raw events on timeline day view, add a query and a "Weight" section; else document that weight is only on Weight tab. |
| F5 | Console.log base URL | 🐞 | ✨ | http.ts getApiBaseUrl and callers log DEBUG_BACKEND_BASE_URL. | Remove or guard with __DEV__ / env so production builds don’t log. |
| F6 | Auth header preference | ✅ | - | auth.ts L41: X-Forwarded-Authorization then Authorization. openapi.yaml L43–45 both headers. | None. |
| F7 | Callback public | ✅ | - | index.ts L124–127 GET callback without authMiddleware; openapi callback security: []. | None. |
| F8 | State validation | ✅ | - | oauthState.ts validateAndConsumeState: format, Firestore lookup, purpose, hash, expiry, usedAt. | None. |
| F9 | Token in Secret Manager only | ✅ | - | withingsSecrets.ts; integrations callback setRefreshToken(uid); Firestore integration doc has no token fields. | None. |
| F10 | No token logging | ✅ | - | invokerAuth.ts L9; withingsMeasures comment; no logger.* with refresh_token/access_token. | None. |
| F11 | Backfill response shape | ✅ | - | withingsBackfill.ts L403–411 returns usersProcessed, eventsCreated, eventsAlreadyExists, failuresWritten, failureWriteErrors, backfillUpdated. | None. |
| F12 | Idempotency | ✅ | - | withingsPull/withingsBackfill: doc id = idempotencyKey; create(); existing.exists → eventsAlreadyExists. | None. |
| F13 | FailureEntry on error | ✅ | - | withingsPull L134–144; withingsBackfill L314–324; writeFailure with stage/reasonCode. | None. |
| F14 | useWithingsPresence kind | ✅ | - | withingsPresenceContract WITHINGS_WEIGHT_KIND="weight"; useWithingsPresence L114 kinds: [WITHINGS_WEIGHT_KIND]. | None. |
| F15 | useWeightSeries kind | ✅ | - | useWeightSeries.ts L298 kinds: ["weight"]; maps doc.kind=== "weight", payload.weightKg, raw.sourceId. | None. |
| F16 | requestId | ✅ | - | logger.ts requestIdMiddleware, accessLogMiddleware; http.ts reads x-request-id from response. | None. |
| F17 | Redirect URI fail-closed | ✅ | - | integrations.ts assertRedirectUriOrFailClosed; WITHINGS_REDIRECT_URI mismatch → 500. | None. |
| F18 | Complete bridge HTML | ✅ | - | index.ts L132–142 text/html, Cache-Control no-store, oli://withings-connected. | None (scheme fix is F1). |
| F19 | Invoker production allowlist | ✅ | - | invokerAuth.ts: isProd() && allowed.size === 0 → INVOKER_ALLOWLIST_REQUIRED; Bearer path requires INVOKER_TOKEN_AUDIENCE. | None. |
| F20 | RawEvent schema weight | ✅ | - | rawEvent.ts payloadByKindSchema weight: manualWeightPayloadSchema; backfill/pull use kind "weight", payload weightKg. | None. |
| F21 | Firestore index rawEvents | ✅ | - | firestore.indexes.json: observedAt desc + __name__; kind + observedAt + __name__. usersMe raw-events query orderBy observedAt desc. | None. |

---

## 5) Belongs / doesn’t belong (Phase 3)

**Belongs (Phase 3–relevant):**

- Mobile: `app/(app)/body/weight.tsx`, `app/(app)/body/__tests__/weight-screen.test.tsx`, `app/(app)/settings/devices.tsx`, `lib/ui/WeightDeviceStatusCard.tsx`, `lib/ui/WeightLogModal.tsx`, `lib/ui/WeightRangeSelector.tsx`, `lib/ui/WeightInsightCard.tsx`, `lib/data/useWeightSeries.ts`, `lib/data/useWithingsPresence.ts`, `lib/data/withingsPresenceContract.ts`, `lib/data/__tests__/useWithingsPresence.withingsContract.test.ts`, `lib/api/withings.ts`, relevant parts of `lib/api/usersMe.ts` (getWithingsStatus, getRawEvents, getRawEvent, logWeight), `lib/api/http.ts`, `lib/events/manualWeight.ts` (idempotency for log weight).
- API: `services/api/src/routes/integrations.ts`, `services/api/src/routes/withingsPull.ts`, `services/api/src/routes/withingsBackfill.ts`, `services/api/src/lib/oauthState.ts`, `services/api/src/lib/withingsSecrets.ts`, `services/api/src/lib/withingsMeasures.ts`, `services/api/src/middleware/invokerAuth.ts`, invoker mount and callback/complete in `services/api/src/index.ts`, `services/api/src/routes/events.ts` (ingest), `services/api/src/routes/usersMe.ts` (raw-events, timeline), `services/api/src/db.ts` (withings registry, userCollection rawEvents/integrations).
- Functions: `services/functions/src/withings/onWithingsBackfillScheduled.ts`, `services/functions/src/withings/__tests__/onWithingsBackfillScheduled.test.ts`, export in `services/functions/src/index.ts`.
- Gateway: `infra/gateway/openapi.yaml` (Withings paths).
- Contracts: `lib/contracts/rawEvent.ts` (weight, provider/sourceId/sourceType).
- Tests: `services/api/src/routes/__tests__/integrations.withings.test.ts`, `services/api/src/routes/__tests__/withings.pull.test.ts`, `services/api/src/routes/__tests__/withings.backfill.test.ts`, `services/api/src/middleware/__tests__/invokerAuth.idToken.test.ts`.

**Does not belong / remove or keep out of Phase 3 surface:**

- **Dead / dev-only:** `lib/api/http.ts` DEBUG_BACKEND_BASE_URL console.log (remove or gate for production).
- **Not Phase 3:** Other scheduler functions (onDailyFactsRecomputeScheduled, onInsightsRecomputeScheduled, etc.), account/export/delete, uploads, preferences, firebase routes — leave as-is but not part of Phase 3 scope.
- **Optional cleanup:** Duplicate or legacy docs under `docs/phase3a/`, `docs/90_audits/` that predate this audit can be superseded by this report; do not delete without product/eng agreement.
- **Dev-only artifact:** `app/(app)/settings/devices.tsx` DEBUG_WITHINGS_OAUTH (L21) is already gated; keep as dev-only.

---

## 6) Action plan (ordered)

| Step | Action | File(s) | Verification |
|------|--------|---------|--------------|
| 1 | Fix deep link scheme: either add scheme "oli" in Expo or change completion bridge + devices returnUrl to use app’s registered scheme (e.g. com.olifitness.oli://withings-connected). | `app.json`; `services/api/src/index.ts` (complete HTML); `app/(app)/settings/devices.tsx` (getWithingsReturnUrl fallback); `services/api/src/routes/integrations.ts` (complete URL in response if used elsewhere) | Build app, run OAuth flow; confirm redirect from /complete reopens app. |
| 2 | Set withingsPull provider to "withings". | `services/api/src/routes/withingsPull.ts` (L123: provider: "withings") | Unit test withings.pull.test.ts; ensure RawEvent doc has provider "withings". |
| 3 | Remove or gate DEBUG_BACKEND_BASE_URL console.log so production builds do not log base URL. | `lib/api/http.ts` (L191–192, L221–222, L254–255) | Production build; no console.log with backend URL. |
| 4 | Document invoker routes (backfill, pull) as Cloud Run–only in gateway or runbook; optionally add openapi paths with security: [] and note "invoker-only, not via gateway". | `infra/gateway/openapi.yaml` and/or runbook/docs | Readme or runbook states backfill/pull are called with Cloud Run URL and invoker auth. |
| 5 | (Product decision) If timeline day view must show weight raw events, add useRawEvents(kinds: ["weight"]) and a Weight section on [day].tsx; else document that weight is only on Weight tab. | `app/(app)/(tabs)/timeline/[day].tsx` or docs | Either new UI or doc updated. |
| 6 | Run full Phase 3 test suite and smoke: withings contract test, integrations.withings, withings.pull, withings.backfill, onWithingsBackfillScheduled. | - | `npm test -- --testPathPattern="withings|integrations.withings|onWithingsBackfillScheduled"` pass. |
| 7 | Confirm env for scheduler: OLI_API_BASE_URL (Cloud Run URL), WITHINGS_PULL_INVOKER_EMAILS or WITHINGS_PULL_INVOKER_SUBS, INVOKER_TOKEN_AUDIENCE. | Deployment/config | Scheduler logs "onWithingsBackfillScheduled completed" with usersProcessed/eventsCreated. |
| 8 | Confirm gateway forwards X-Forwarded-Authorization for user routes and callback/complete remain unauthenticated. | Infra / ESP config | User requests with Bearer hit backend with correct header; callback/complete return 200 without 401. |

---

## 7) Verification checklist (commands + expected outputs)

| Check | Command / step | Expected |
|-------|----------------|----------|
| Contract: Withings kind/sourceId | `npm test -- --testPathPattern="useWithingsPresence.withingsContract"` | Pass: kind=weight, sourceId=withings. |
| Integrations Withings routes | `npm test -- --testPathPattern="integrations.withings"` | All Withings connect/callback/status/revoke tests pass. |
| Backfill route | `npm test -- --testPathPattern="withings.backfill"` | Invoker auth, start/resume/stop, cursor, RawEvent id=idempotencyKey, FailureEntry. |
| Pull route | `npm test -- --testPathPattern="withings.pull"` | Invoker auth, RawEvent create, FailureEntry on error. |
| Scheduler export | `npm test -- --testPathPattern="onWithingsBackfillScheduled"` | Export defined; run is function. |
| Raw events list | `curl -s -H "Authorization: Bearer $TOKEN" "$BASE/users/me/raw-events?kinds=weight&limit=5"` | 200; items array; optional sourceId withings. |
| Withings status | `curl -s -H "Authorization: Bearer $TOKEN" "$BASE/integrations/withings/status"` | 200; ok, connected, scopes, connectedAt, backfill, no tokens. |
| Callback public | `curl -s -o /dev/null -w "%{http_code}" "$BASE/integrations/withings/callback"` | 400 (missing code/state) not 401. |
| Complete public | `curl -s "$BASE/integrations/withings/complete" \| head -1` | HTML with oli:// or configured scheme. |
| Backfill invoker | From machine with ADC or SA: `curl -s -X POST -H "Authorization: Bearer $(gcloud auth print-identity-token --audiences=$AUDIENCE)" -H "Content-Type: application/json" -d '{"mode":"resume"}' "$CLOUD_RUN_URL/integrations/withings/backfill"` | 200; JSON with usersProcessed, eventsCreated. |
| No token in logs | `grep -r "refresh_token\|access_token" services/api/src services/functions/src --include="*.ts" \| grep -v "body?.refresh_token\|WithingsMeasureError\|comment\|message"` | No logger.* with token values. |
| Request ID | Any authed request; response header `x-request-id` | Present; same as in access log. |

---

## 8) Phase 7 — 10/10 scorecard

| Dimension | Score | Justification |
|-----------|-------|----------------|
| **Security & privacy** | 8/10 | Token custody and no-token logging are correct (withingsSecrets, invokerAuth). Callback/complete public by design. Deduct: deep link scheme mismatch can confuse return flow; DEBUG log of base URL in client. |
| **Correctness** | 8/10 | Backfill and status/connect/callback/state/registry are correct. Deduct: withingsPull provider "manual" vs backfill "withings" inconsistency. |
| **Reliability** | 9/10 | Idempotency, FailureEntry, fail-closed redirect URI and invoker allowlist. Deduct: scheduler depends on OLI_API_BASE_URL and invoker env; no gateway path for backfill (operational clarity). |
| **Scalability** | 8/10 | Backfill chunked, create-only writes, single registry collection. Deduct: no explicit rate/backoff for Withings API in code (withingsMeasures); no pagination limit documented for raw-events beyond existing limit param. |
| **DX / maintainability** | 8/10 | Clear modules, contracts, tests. Deduct: gateway spec missing invoker routes; multiple Phase 3 docs to consolidate. |
| **UX polish** | 7/10 | Weight page has loading/error/empty and refetch. Deduct: timeline day does not show weight raw events; deep link may not reopen app. |
| **Observability** | 8/10 | requestId, structured logs, invoker rejection logged without tokens. Deduct: client-side console.log base URL; no explicit rate/error metrics for Withings API. |

**Overall (average of dimensions): ~8.1/10.** Addressing F1 (scheme), F2 (pull provider), F5 (console.log), and F4 (timeline vs product doc) would move toward 10/10 for Phase 3.

---

*End of audit. No code changes were made; findings and action plan only.*
