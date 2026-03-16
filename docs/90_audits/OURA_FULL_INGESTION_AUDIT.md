# Oura Full Ingestion Audit

**Purpose:** Repo-only audit of Oura integration, then gap analysis and implementation-ready spec for ingesting everything Oura officially offers via its API.

**Labeling:** Every claim is one of **PROVEN FROM CODE**, **UNKNOWN / NOT IN REPO**, or **INFERENCE / PROPOSAL**.

---

## 1. Repo-only audit

### A. OAuth + token custody

| # | Question | Answer | Label |
|---|----------|--------|--------|
| 1 | Where is Oura OAuth connect implemented? | **`services/api/src/routes/integrations.ts`** — router handler `GET /integrations/oura/connect` (around lines 416–447). Creates state via `createStateAsync(uid, OURA_OAUTH_PURPOSE)`, builds URL with `OURA_AUTHORIZE_URL`, `OURA_SCOPE`, `redirect.redirectUri`, returns `{ ok: true, url }`. Mounted under `/integrations` with `authMiddleware` in `services/api/src/index.ts` (integrations routes); gateway exposes GET `/integrations/oura/connect` (openapi.yaml). | PROVEN FROM CODE |
| 2 | Where is Oura callback implemented? | **`services/api/src/routes/integrations.ts`** — exported `handleOuraCallback(req, res)` (lines 453–534). Validates `code` and `state`, calls `validateAndConsumeState(state, OURA_OAUTH_PURPOSE)`, exchanges code at `OURA_TOKEN_URL`, persists refresh token via `ouraSecrets.setRefreshToken(uid, refreshToken)`, writes integration doc and registry, redirects to completion URL. Mounted in **`services/api/src/index.ts`** as `app.get("/integrations/oura/callback", ...)` (no auth — public). | PROVEN FROM CODE |
| 3 | What scopes are currently requested in code? | **`OURA_SCOPE = "daily heartrate"`** — single string in `integrations.ts` line 23, used in connect URL `url.searchParams.set("scope", OURA_SCOPE)`. | PROVEN FROM CODE |
| 4 | Where are Oura client id / client secret read from? | **Client ID:** `process.env.OURA_CLIENT_ID` in `integrations.ts` (connect, callback) and `ouraPullNow.ts` (pull-now). **Client secret:** **`services/api/src/lib/ouraSecrets.ts`** — `getClientSecret()` reads Secret Manager secret id `oura-client-secret` (from `secretIdClientSecret()`), project from env (`GOOGLE_CLOUD_PROJECT`, `GCLOUD_PROJECT`, `GCP_PROJECT`, `PROJECT_ID`) or ADC. Never from env. | PROVEN FROM CODE |
| 5 | How are refresh tokens stored? | **Secret Manager only.** `ouraSecrets.setRefreshToken(uid, value)` creates/updates secret `oura-refresh-token-${uid}` (see `secretIdRefreshToken(uid)`). `getRefreshToken(uid)` reads latest version. `deleteRefreshToken(uid)` destroys all versions. No Firestore storage of tokens. | PROVEN FROM CODE |
| 6 | Is refresh token rotation implemented? | **Yes.** In `services/api/src/lib/ouraApi.ts`, `refreshOuraAccessToken()` returns both `access_token` and `refresh_token`. In `ouraPullNow.ts` (and thus in callback’s fire-and-forget `performOuraPullNowCore`), after refresh the new refresh token is persisted: `await ouraSecrets.setRefreshToken(uid, tokens.refresh_token)` (line 145). Oura’s refresh tokens are single-use. | PROVEN FROM CODE |
| 7 | What env vars / secrets / secret-manager lookups exist for Oura? | **Env:** `OURA_CLIENT_ID`, `OURA_REDIRECT_URI` (optional, must match canonical), `PUBLIC_BASE_URL` (for canonical redirect/completion). **Secrets (Secret Manager):** `oura-client-secret`, `oura-refresh-token-${uid}`. **Project id** for Secret Manager: env `GOOGLE_CLOUD_PROJECT` / `GCLOUD_PROJECT` / `GCP_PROJECT` / `PROJECT_ID` or ADC `getProjectId()`. | PROVEN FROM CODE |
| 8 | What tests cover OAuth / callback / status / pull-now? | **Callback:** `services/api/src/routes/integrations/__tests__/ouraCallback.test.ts` — redirect and fire-and-forget `performOuraPullNowCore`. **Status:** `services/api/src/routes/integrations/__tests__/ouraStatus.test.ts` — 401 when no uid, 200 with connected/lastSyncAt when doc exists. **Pull-now:** `services/api/src/routes/integrations/__tests__/ouraPullNow.test.ts` — 401, 400 missing Idempotency-Key, OURA_NOT_CONNECTED, idempotency replay, success with writeOuraRawEvents. **Connect/revoke:** Not covered by dedicated tests in repo (only via integration route mounting). | PROVEN FROM CODE |

---

### B. Existing Oura sync paths

| # | Question | Answer | Label |
|---|----------|--------|--------|
| 1 | Is auto-sync after callback implemented? | **Yes.** In `integrations.ts` inside `handleOuraCallback`, after redirect: `void performOuraPullNowCore(uid, rid).catch(...)`. Fire-and-forget; does not block redirect. | PROVEN FROM CODE |
| 2 | Is app foreground/open sync implemented? | **Yes.** In **`app/(app)/settings/devices.tsx`**: `maybeAutoOuraPullNow("focus")` on `useFocusEffect`, and `maybeAutoOuraPullNow("foreground")` on `AppState.addEventListener("change", ...)` when state === "active". Throttled by `getOuraLastCheckedAt` / `OURA_AUTO_MIN_MS` (15 min). | PROVEN FROM CODE |
| 3 | Is scheduled background sync implemented? | **Yes.** **`services/functions/src/oura/onOuraPullScheduled.ts`** — `onSchedule({ schedule: "every 15 minutes", region: "us-central1", serviceAccount: "oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com" })`. POSTs to `OLI_API_BASE_URL/integrations/oura/pull` with ID token client. | PROVEN FROM CODE |
| 4 | What exact routes/functions handle each? | **Callback-triggered:** `handleOuraCallback` → `performOuraPullNowCore(uid, rid)`. **Foreground/focus:** App calls `postOuraPullNow(token, { idempotencyKey })` to **POST /integrations/oura/pull-now** (see `lib/api/oura.ts`). **Scheduled:** Cloud Scheduler invokes **POST /integrations/oura/pull** (invoker-only); handler in **`services/api/src/routes/ouraPull.ts`** — gets UIDs from `ouraConnectedRegistryCollection()`, for each calls `performOuraPullNowCore(uid, requestId)`. | PROVEN FROM CODE |
| 5 | What shared core pull logic exists? | **`performOuraPullNowCore(uid, requestId)`** in **`services/api/src/routes/integrations/ouraPullNow.ts`**. Refreshes token, fetches sleep + daily_readiness (HRV) for last 30 days, maps to ingest items, calls `writeOuraRawEvents(uid, sleepItems, hrvItems, requestId)`, updates `users/{uid}/integrations/oura` `lastSyncAt`. Used by pull-now route and by ouraPull (scheduler) and by callback. | PROVEN FROM CODE |
| 6 | What auth protects each route? | **Callback:** None (public). **Complete:** None (public). **Connect, status, revoke, ingest, pull-now:** `authMiddleware` (Firebase ID token). **Pull (batch):** `requireInvokerAuth` only (no user token). | PROVEN FROM CODE |
| 7 | What allowlist/env for scheduler invoker? | **`services/api/src/middleware/invokerAuth.ts`** — `WITHINGS_PULL_INVOKER_EMAILS` and/or `WITHINGS_PULL_INVOKER_SUBS`. Oura pull reuses the same middleware; no separate `OURA_PULL_INVOKER_*` in repo. **Bearer path:** `INVOKER_TOKEN_AUDIENCE` required in prod. Scheduler uses same SA as Withings pull (see `onOuraPullScheduled.ts` comment). | PROVEN FROM CODE |
| 8 | What logs/errors exist for these paths? | **Callback:** `oura_callback_state_invalid`, `oura_callback_secret_manager_config_missing`, `oura_callback_misconfig`, `oura_token_exchange_failed`, `oura_registry_write_error`, `oura_callback_auto_sync_error`, `oura_callback_error`; `console.log("[OURA_CALLBACK_REDIRECT]", ...)`. **Pull-now:** `oura_pull_now_no_refresh_token`, `oura_pull_now_misconfig`, `oura_pull_now_token_refresh_failed`, `oura_pull_now_fetch_failed`, `oura_pull_now_metadata_error`, `oura_pull_now_reconnect_cleanup_error`. **Pull (batch):** `oura_pull_query_error`, `oura_pull_failure_write_error`. **Scheduler:** `oura_pull_scheduled_start`, `oura_pull_scheduled_done`, throws on HTTP error. | PROVEN FROM CODE |

---

### C. Existing datasets

| Dataset | Status | Fetch code | File / path | Raw event kind | Payload shape | Canonical mapping | UI | Tests |
|--------|--------|------------|-------------|----------------|---------------|------------------|-----|-------|
| **profile / personal / email** | NOT IMPLEMENTED | No fetch from Oura API | — | — | — | — | — | — |
| **sleep** | IMPLEMENTED | `fetchOuraSleep()` | `services/api/src/lib/ouraApi.ts` (GET `/v2/usercollection/sleep`) | `sleep` | manual-compatible: start, end, timezone, day, totalMinutes, efficiency, latencyMinutes, awakenings, isMainSleep | Raw written with provider `manual`, sourceId `oura`; normalized by `mapRawEventToCanonical` (sleep branch, same as manual) | Data sources / devices; metrics “Sleep duration” from oura | ouraIngest, ouraPullNow, mapRawEventToCanonical (sleep) |
| **readiness** | IMPLEMENTED (as HRV) | `fetchOuraDailyReadiness()` | `services/api/src/lib/ouraApi.ts` (GET `/v2/usercollection/daily_readiness`) | `hrv` | manual-compatible: time, timezone, day, rmssdMs, sdnnMs, measurementType | Same; mapper uses manual HRV payload → canonical hrv | “HRV” from oura | Same as above (hrv) |
| **activity daily** | NOT IMPLEMENTED | No fetch | — | — | — | — | — | — |
| **heart-rate time series** | NOT IMPLEMENTED | No fetch | — | — | — | — | — | — |
| **workouts** | NOT IMPLEMENTED | No fetch | — | — | — | — | — | — |
| **sessions** | NOT IMPLEMENTED | No fetch | — | — | — | — | — | — |
| **tags** | NOT IMPLEMENTED | No fetch | — | — | — | — | — | — |
| **spo2** | NOT IMPLEMENTED | No fetch | — | — | — | — | — | — |

**Details (PROVEN FROM CODE):**

- **Sleep:** `ouraApi.ts` defines `OuraSleepDocument`, `fetchOuraSleep(accessToken, startDate, endDate)`, `mapOuraSleepToIngestItem()`. `ouraPullNow.ts` uses 30-day window, calls `fetchOuraSleep` and `mapOuraSleepToIngestItem`, passes to `writeOuraRawEvents`. `ouraIngestWrite.ts` writes to `users/{uid}/rawEvents` with `kind: "sleep"`, `provider: "manual"`, `sourceId: "oura"`, payload matching manual sleep schema.
- **Readiness:** Same pattern; `OuraDailyReadinessDocument`, `fetchOuraDailyReadiness`, `mapOuraReadinessToHrvItem`; raw `kind: "hrv"`, same provider/sourceId.
- **Normalization:** `services/functions/src/normalization/mapRawEventToCanonical.ts` accepts only `provider === "manual"`; payload is validated as manual sleep/hrv. Oura writes with provider `"manual"` and sourceId `"oura"`, so events normalize to canonical sleep/hrv with `sourceId: "oura"`.

---

### D. Storage / schema / normalization

| # | Question | Answer | Label |
|---|----------|--------|--------|
| 1 | What raw event kinds exist for Oura? | Only **`sleep`** and **`hrv`**. Same as canonical kinds; no separate “oura_sleep” kind. Stored with `provider: "manual"`, `sourceId: "oura"`, `sourceType: "oura"`. | PROVEN FROM CODE |
| 2 | What shared write path exists for Oura raw events? | **`writeOuraRawEvents(uid, sleepItems, hrvItems, requestId)`** in **`services/api/src/lib/ouraIngestWrite.ts`**. Used by **POST /integrations/oura/ingest** and by **performOuraPullNowCore** (pull-now and pull). Writes to `userCollection(uid, "rawEvents")`; doc id = item’s `idempotencyKey`. | PROVEN FROM CODE |
| 3 | Where are payload schemas defined? | **`lib/contracts/rawEvent.ts`** — `manualSleepPayloadSchema`, `manualHrvPayloadSchema` (and others). `rawEventDocSchema` validates payload by `kind` via `payloadByKindSchema[kind]`. Oura ingest body validated in **`ouraIngest.ts`** with inline zod (sleepItemSchema, hrvItemSchema) matching same shape. | PROVEN FROM CODE |
| 4 | Which Oura payloads are normalized downstream? | **Sleep and HRV only.** Firestore trigger **`onRawEventCreated`** (functions) runs `mapRawEventToCanonical(rawEvent)`. Mapper returns canonical only for `provider === "manual"` and kind in manual set (sleep, hrv, steps, workout, weight, strength_workout). Oura docs use same payload shape as manual sleep/hrv, so they normalize. | PROVEN FROM CODE |
| 5 | Which collections/paths are touched? | **API:** `users/{uid}/integrations/oura` (connect, callback, revoke, pull-now lastSyncAt), `users/{uid}/rawEvents/{id}` (writeOuraRawEvents), `users/{uid}/requestRecords/{idempotencyKey}` (pull-now idempotency), `users/{uid}/oauthStates/{stateId}` (OAuth state), `system/integrations/oura_connected/{uid}` (registry). **Failures:** `writeFailure` (see writeFailure module for path — not enumerated here). | PROVEN FROM CODE |
| 6 | Is provenance/source metadata stored? | **Source:** `sourceId`, `sourceType` on raw event (`"oura"`). **Provenance:** Raw event has `receivedAt`, `observedAt`; no `provenance` or `occurredAt` set in ouraIngestWrite. Contract allows optional `provenance` (e.g. backfill). | PROVEN FROM CODE |
| 7 | Are vendor scores separated from canonical truth? | **No.** Oura sleep efficiency/readiness scores are mapped into the same canonical sleep/HRV payload (e.g. efficiency, rmssdMs). No separate “vendor score” or “oura_readiness_score” store. | PROVEN FROM CODE |

---

### E. Routes

| Method | Path | Auth | Request body/headers | Response shape | File path |
|--------|------|------|----------------------|----------------|-----------|
| GET | /integrations/oura/status | authMiddleware (Firebase) | — | `{ ok, requestId?, connected, lastSyncAt, revoked?, failureState? }` | integrations.ts (router), index.ts mount, openapi.yaml |
| GET | /integrations/oura/connect | authMiddleware | — | `{ ok, url }` | integrations.ts, openapi.yaml |
| GET | /integrations/oura/callback | None (public) | query: code, state | Redirect 302 or 400 JSON | index.ts (app.get), openapi.yaml |
| GET | /integrations/oura/complete | None (public) | — | HTML redirect to deep link | index.ts (app.get), openapi.yaml |
| POST | /integrations/oura/revoke | authMiddleware | — | `{ ok: true }` or 500 | integrations.ts, openapi.yaml |
| POST | /integrations/oura/ingest | authMiddleware | Idempotency-Key; body: `{ sleep?: [], hrv?: [] }` | `{ ok, requestId, eventsCreated, eventsAlreadyExists }` | integrations/ouraIngest.ts, index.ts, openapi.yaml |
| POST | /integrations/oura/pull-now | authMiddleware | Idempotency-Key required | `{ ok, requestId, windowDays, eventsCreated, eventsAlreadyExists }` or error | integrations/ouraPullNow.ts, index.ts, openapi.yaml |
| POST | /integrations/oura/pull | requireInvokerAuth | — | `{ ok, usersProcessed, eventsCreated, eventsAlreadyExists, failuresWritten, failureWriteErrors }` | ouraPull.ts, index.ts; **not** in openapi.yaml (invoker-only) |

---

### F. UI surface

| Component / screen | What it does | Label |
|--------------------|--------------|--------|
| **app/(app)/settings/devices.tsx** | Devices list: Oura row (icon, “Oura”, status On/Off from useOuraPresence + lastKnownConnected). On focus: refetch presence, `maybeAutoOuraPullNow("focus")` (throttled 15 min). On AppState active: `maybeAutoOuraPullNow("foreground")`. No explicit “Sync” button. | PROVEN FROM CODE |
| **app/(app)/settings/devices/[deviceId].tsx** | Device detail for deviceId === "oura": title “Oura”, connect/disconnect toggle (getOuraConnectUrl, postOuraRevoke), copy “Oura can provide sleep and HRV…”, metrics list “Sleep duration”, “HRV”, “Sync status” with lastSyncAt when connected. No “Sync now” button. | PROVEN FROM CODE |
| **app/(app)/oura-connected.tsx** | Redirect only: `<Redirect href="/(app)/settings/devices/oura" />`. | PROVEN FROM CODE |
| **lib/data/useOuraPresence.ts** | Hook: getOuraStatus(token), returns connected + lastSyncAt; 404 backoff (OURA_STATUS_404_BACKOFF_UNTIL); refetch. Used by devices list and device detail and data-sources source detail. | PROVEN FROM CODE |
| **lib/integrations/oura/storage.ts** | AsyncStorage: lastCheckedAt (throttle), lastKnownConnected (list hydration), status 404 backoff until. | PROVEN FROM CODE |
| **app/(app)/settings/data-sources/source/[sourceId].tsx** | When sourceId === "oura": shows SOURCE_PROVIDES_METRICS for oura (sleep_duration, hrv), status from useOuraPresence. | PROVEN FROM CODE |
| **lib/metrics/dataSourcesConfig.ts** | `oura` in SLICE_1_SOURCE_IDS; SOURCE_PROVIDES_METRICS.oura = ["sleep_duration", "hrv"]; METRIC_ALLOWED_SOURCES for hrv and sleep_duration include "oura". | PROVEN FROM CODE |

Screens that consume Oura-derived data (e.g. daily facts, insights) do so via canonical events / dailyFacts with sourceId “oura”; no Oura-specific screen beyond devices and data-sources.

---

### G. Tests + gaps

**Oura-related test files (PROVEN FROM CODE):**

- `services/api/src/routes/integrations/__tests__/ouraCallback.test.ts` — callback redirect and performOuraPullNowCore invocation.
- `services/api/src/routes/integrations/__tests__/ouraStatus.test.ts` — status 401, 200 with/without integration doc.
- `services/api/src/routes/integrations/__tests__/ouraPullNow.test.ts` — 401, 400 Idempotency-Key, OURA_NOT_CONNECTED, success and replay.
- `services/api/src/routes/integrations/__tests__/ouraIngest.test.ts` — 401, 400 body/Idempotency-Key, 200 and raw event writes (sleep, hrv).
- `services/api/src/routes/__tests__/oura.pull.test.ts` — POST /integrations/oura/pull: invoker auth (403 without), 200 with mock registry/core, FailureEntry on core failure/throw.
- `services/functions/src/oura/__tests__/onOuraPullScheduled.test.ts` — export exists and has run function (contract only).
- `services/functions/src/normalization/__tests__/mapRawEventToCanonical.test.ts` — includes sleep (and oura provider sleep with empty payload → fail).
- `app/(app)/settings/devices/__tests__/devices-status.test.tsx` — devices screen, Oura row, auto-refresh when connected and lastCheckedAt null.
- `app/(app)/settings/devices/__tests__/device-detail-oura.test.tsx` — device detail Oura (exists in repo).
- `lib/metrics/__tests__/dataSourcesConfig.oura.test.ts` — data sources config for oura (exists in repo).

**Not tested but should be (INFERENCE / PROPOSAL):**

- GET /integrations/oura/connect (success and misconfig).
- POST /integrations/oura/revoke (success and failure).
- OAuth state creation with OURA_OAUTH_PURPOSE and validation in callback.
- writeOuraRawEvents schema failure path and write failure path (partial coverage via ingest test).
- performOuraPullNowCore token refresh failure and reconnect cleanup.
- Scheduler: actual HTTP call to pull (integration/e2e); currently only contract test.
- Normalization: explicit test that raw event with provider "manual" and sourceId "oura" produces canonical with sourceId "oura".

---

## 2. Gap analysis

| Area | Current repo status | What is missing | Missing piece type | Needs Oura API docs? |
|------|--------------------|-----------------|--------------------|------------------------|
| **email** | Not requested or stored | Scope (if any), endpoint, storage, UI | Backend + schema + UI | YES (scopes / user info) |
| **personal/profile** | Not implemented | Fetch, raw kind (or reuse), canonical mapping, UI | Backend + schema + normalization + UI | YES |
| **sleep** | Implemented | — | — | No (already using v2 sleep) |
| **readiness** | Implemented as HRV | Optional: store full readiness payload separately | Schema + storage (optional) | Optional |
| **activity daily** | NOT IMPLEMENTED | Scope, fetch daily_activity, raw kind, mapping to steps/activity_minutes, UI | Backend + schema + normalization + UI | YES |
| **heartrate** | NOT IMPLEMENTED | Scope, heartrate endpoint, time-series raw kind, schema, normalization (if any) | Backend + schema + normalization | YES |
| **workout** | NOT IMPLEMENTED | Scope, workout endpoint, raw kind (workout), mapping to canonical workout | Backend + schema + normalization | YES |
| **session** | NOT IMPLEMENTED | Scope, session endpoint, raw kind, mapping | Backend + schema + normalization | YES |
| **tag** | NOT IMPLEMENTED | Scope, tag endpoint, raw kind, mapping / association | Backend + schema | YES |
| **spo2** | NOT IMPLEMENTED | Scope, daily_spo2 or equivalent, raw kind, mapping | Backend + schema + normalization | YES |
| **Scopes** | Only "daily heartrate" | Full list for personal, activity, workout, session, tag, spo2, heartrate | Backend (connect URL) | YES |
| **Endpoints** | sleep, daily_readiness only | All v2 usercollection endpoints used | Backend (ouraApi) | YES |
| **Storage** | sleep + hrv raw events | New raw event kinds and/or payloads for activity, workout, session, tag, spo2, heartrate, profile | Schema + write path | Partially (field names) |
| **Canonical mapping** | sleep, hrv (via manual shape) | activity → steps/activity_minutes; workout → workout; session; spo2; heartrate (if exposed) | Normalization (mapRawEventToCanonical or new pipeline) | YES |
| **Sync triggers** | Callback, foreground/focus, scheduled | No change required for “full” ingestion; same triggers can run broader fetch | — | — |
| **Background scheduling** | Every 15 min, same as today | May want same schedule; backfill not in repo | Backfill: new job/route (optional) | — |
| **Replay/backfill** | Not in repo for Oura | Historical backfill job (optional) | Backend (route + windowing) | YES (date ranges) |
| **Observability** | Logs and writeFailure | Structured metrics for per-dataset success/fail (optional) | Infra / code | No |
| **Deployment/env** | OURA_* and invoker allowlist | No new env for current scope; new scopes don’t require new env | — | — |

---

## 3. Full implementation spec

### 3.1 Overview

- **What exists today:** OAuth (connect, callback, status, revoke), token custody (Secret Manager, refresh rotation), sync paths (callback auto-sync, app focus/foreground pull-now, scheduled pull). Only **sleep** and **readiness (as HRV)** are fetched, stored as raw events (provider "manual", sourceId "oura"), and normalized to canonical sleep/hrv.
- **What is missing for “ingest everything Oura offers”:** Remaining Oura API v2 datasets: profile/personal, daily activity, heart rate (time series), workouts, sessions, tags, spo2 (and any newer endpoints). For each: scope(s), fetch function, raw event kind and payload schema, write path, canonical mapping (if applicable), and optional UI.
- **Smallest path:** (1) Confirm official Oura API v2 docs for scopes and endpoint list (NEEDS DOC VERIFICATION). (2) Extend scopes in connect URL. (3) Add fetch + map + write for each new dataset; reuse existing sync triggers (pull-now core + scheduled pull). (4) Add raw payload schemas and normalization where Oli has canonical types (e.g. activity → steps/activity_minutes, workout → workout). (5) Optional: backfill route/job; optional: vendor-score separation.

### 3.2 Architecture (proposal)

- **Scopes:** Extend `OURA_SCOPE` (or use multiple) to include all needed Oura v2 scopes (personal, daily, activity, workout, session, tag, spo2, heartrate — exact names from Oura docs).
- **Fetchers / endpoints:** One function per dataset in `ouraApi.ts`: e.g. `fetchOuraPersonal`, `fetchOuraDailyActivity`, `fetchOuraHeartRate`, `fetchOuraWorkouts`, `fetchOuraSessions`, `fetchOuraTags`, `fetchOuraSpo2` (endpoint paths from Oura v2 docs).
- **Raw event kinds:** Keep `sleep`, `hrv`. Add as needed: e.g. `activity` or reuse `steps` with sourceId oura; `workout` (canonical kind exists); `session`; `tag`; `spo2`; `heartrate` (time series). Profile/personal may be stored as user integration metadata or a dedicated raw/doc type.
- **Payload schemas:** In `lib/contracts/rawEvent.ts` (and/or API ingest validation): define payloads for any new kind; ensure `payloadByKindSchema` and mapper accept them.
- **Canonical mappings:** Map Oura activity → canonical steps/activity_minutes where applicable; Oura workout → canonical workout; session/tag/spo2/heartrate per product decision (canonical types or fact-only).
- **Sync windows:** Keep 30-day window for pull-now/scheduled; backfill (if added) with configurable range.
- **Backfill policy:** Optional: separate backfill route or job with date range and idempotent writes (doc id = stable id from Oura).
- **Idempotency:** Keep doc id = Oura entity id (or stable composite); create-only in rawEvents; requestRecords for pull-now.
- **Provenance:** Continue storing sourceId/sourceType; optionally set `provenance: "device"` or `"backfill"` for Oura-sourced events.
- **Vendor-score vs canonical:** Optional: store raw Oura scores in payload or separate field; canonical remains our single truth (e.g. efficiency, rmssd) as today.

### 3.3 File plan

| Action | Full path | Why | What it should contain |
|--------|-----------|-----|-------------------------|
| Edit | services/api/src/routes/integrations.ts | Extend scopes | Set OURA_SCOPE to full space-separated list (after doc verification). |
| Edit | services/api/src/lib/ouraApi.ts | Add fetchers | Types and fetch functions for personal, daily_activity, heartrate, workouts, sessions, tags, spo2 (URLs and response shapes from Oura v2). |
| Edit | services/api/src/routes/integrations/ouraPullNow.ts | Full ingestion | In performOuraPullNowCore: call new fetch functions; map to ingest items; pass to write path. Extend writeOuraRawEvents or add write functions for new kinds. |
| Edit | services/api/src/lib/ouraIngestWrite.ts | New kinds | Accept new item types; write raw events with appropriate kind and payload (and provider/sourceId). |
| Edit | lib/contracts/rawEvent.ts | New payloads | Add payload schemas and payloadByKindSchema entries for new kinds (e.g. activity, workout, session, tag, spo2, heartrate) if stored as raw. |
| Edit | services/functions/src/normalization/mapRawEventToCanonical.ts | New mappings | If provider "oura" is introduced: add branch for oura; or keep provider "manual" and same payload shapes; map new kinds to canonical steps, workout, etc. |
| Add (optional) | services/api/src/routes/integrations/ouraBackfill.ts | Backfill | Invoker or auth route: date range, fetch all datasets, idempotent write (same as pull). |
| Add (optional) | services/functions/src/oura/onOuraBackfillScheduled.ts | Scheduled backfill | Schedule job calling backfill route. |

(Exact list of files and edits depends on final Oura API field names and product choice for canonical vs fact-only.)

### 3.4 Test plan

- **Unit:** ouraApi: each new fetch function (mock fetch, assert URL and parse). ouraIngestWrite: new item types and write counts.
- **Route:** POST /integrations/oura/pull-now: with mocks, assert new datasets included in fetch and write. Ingest: new kinds in body, 200 and doc shape.
- **Scheduler:** onOuraPullScheduled: still exports and runs; optional integration test against real API.
- **Normalization:** mapRawEventToCanonical for new kinds (and provider/sourceId) → expected canonical or fact-only.
- **Integration/smoke:** Connect Oura with full scopes, pull-now, assert raw events and canonical events for new types.

### 3.5 Deployment / config plan

- **Env vars:** No new vars for “full” ingestion; existing OURA_CLIENT_ID, PUBLIC_BASE_URL, OURA_REDIRECT_URI, OLI_API_BASE_URL, WITHINGS_PULL_INVOKER_* (reused for Oura pull).
- **Secrets:** Existing: oura-client-secret, oura-refresh-token-{uid}. No change.
- **Scheduler:** Existing onOuraPullScheduled; no change unless backfill job added.
- **Cloud Run / Functions:** No change except code deploy.
- **Gateway:** No change; pull remains invoker-only, not in openapi.

### 3.6 Acceptance checklist

- [ ] Oura developer app has all required scopes enabled; connect URL includes those scopes.
- [ ] After connect, callback triggers performOuraPullNowCore; lastSyncAt updates.
- [ ] Pull-now (and scheduled pull) fetches all implemented Oura datasets (sleep, readiness, + new ones).
- [ ] Raw events written with correct kind, sourceId "oura", and validated payload; idempotent by doc id.
- [ ] Canonical events (sleep, hrv, and any new mapped kinds) created from Oura raw events with sourceId "oura".
- [ ] No duplicate canonical events for same Oura entity on replay.
- [ ] Revoke clears token and integration doc and registry; status returns connected: false.
- [ ] Devices and data-sources UI show Oura status and last sync; auto-refresh and scheduled pull run without error.
- [ ] All new code covered by unit/route tests; normalization tests for new kinds.

---

## 4. “Proven / Unknown / Proposed” summary

### Proven from code

- Oura OAuth: connect, callback, status, revoke in integrations.ts; state with OURA_OAUTH_PURPOSE; token exchange and refresh; refresh token rotation in pull-now and callback.
- Token custody: Secret Manager only (oura-client-secret, oura-refresh-token-{uid}); ouraSecrets.ts.
- Scopes requested: single string "daily heartrate".
- Sync: callback fire-and-forget performOuraPullNowCore; pull-now with Idempotency-Key and requestRecords; scheduled POST /integrations/oura/pull every 15 min; app focus and foreground auto pull-now (throttled 15 min).
- Datasets: only sleep and daily_readiness (→ HRV) fetched and stored; raw events provider "manual", sourceId "oura"; normalized via mapRawEventToCanonical (manual sleep/hrv).
- Routes, mounts, gateway paths, invoker auth (WITHINGS_PULL_INVOKER_*), env vars, and UI components and hooks as enumerated in sections 1E and 1F.
- Test files listed in section 1G.

### Unknown / needs Oura docs verification

- Exact Oura API v2 scope names for: personal, daily activity, heart rate, workout, session, tag, spo2.
- Exact v2 endpoint paths and query params (e.g. date range) for each dataset.
- Response field names and shapes for: personal, daily_activity, heartrate, workouts, sessions, tags, spo2.
- Rate limits and pagination (next_token) for each endpoint.

### Proposed implementation

- Extend OURA_SCOPE and add fetchers + write path + optional normalization for: profile/personal, activity daily, heart-rate, workouts, sessions, tags, spo2.
- Keep raw event idempotency by Oura entity id; optional backfill route and job; optional vendor-score storage; optional provenance and “oura” provider branch in mapper.
