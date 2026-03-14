# Audit: Existing background/scheduled sync pattern to reuse for Oura

**Scope:** Evidence-only audit of repo to identify the exact pattern for scheduled pull; no code changes. Outcome: pattern to mirror for Oura scheduled sync.

---

## 1. Proven existing pattern: Withings scheduled pull

### 1.1 Component triggered on a schedule

| Item | Evidence (file path + symbol) |
|------|-------------------------------|
| **Scheduler** | `services/functions/src/withings/onWithingsPullScheduled.ts` — exported `onWithingsPullScheduled` |
| **Trigger type** | Firebase Gen2 `onSchedule` from `firebase-functions/v2/scheduler` |
| **Schedule** | `every 15 minutes` |
| **Region** | `us-central1` |
| **Service account** | `oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com` (hardcoded in options) |
| **Behavior** | Reads `OLI_API_BASE_URL`, then `GoogleAuth().getIdTokenClient(baseUrl)` and POSTs to `baseUrl/integrations/withings/pull` with empty body `{}`. Logs `withings_pull_scheduled_start`, then on success `withings_pull_scheduled_done` with status, ok, usersProcessed, eventsCreated; on failure throws after logging. |

### 1.2 How it authenticates

| Item | Evidence |
|------|----------|
| **Mechanism** | ID token for the Cloud Run API base URL. `GoogleAuth` from `google-auth-library`; `getIdTokenClient(baseUrl)` returns a client that attaches a Bearer ID token with audience = baseUrl. |
| **API protection** | Route mounted with `requireInvokerAuth` middleware only (no user auth). |
| **Middleware** | `services/api/src/middleware/invokerAuth.ts` — `requireInvokerAuth`. Accepts (1) `x-goog-authenticated-user-email` (Cloud Run IAM-injected) or (2) `Authorization: Bearer <Google-signed ID token>` verified with `verifyIdToken` (audience + allowlist). |
| **Allowlist** | `WITHINGS_PULL_INVOKER_EMAILS` (comma-separated emails) and/or `WITHINGS_PULL_INVOKER_SUBS` (comma-separated subs). Production: fail-closed if allowlist empty. |
| **Audience** | `INVOKER_TOKEN_AUDIENCE` (required in prod for Bearer path). Scheduler uses same SA; token audience = Cloud Run service URL. |

### 1.3 How it finds connected users

| Item | Evidence |
|------|----------|
| **Registry** | `services/api/src/db.ts` — `withingsConnectedRegistryCollection()` returns `db.collection("system").doc("integrations").collection("withings_connected")`. |
| **Path** | `system/integrations/withings_connected/{uid}`. Doc fields: `{ connected: true, updatedAt }`. On revoke, doc is deleted. |
| **Query** | `services/api/src/routes/withingsPull.ts` — `getConnectedWithingsUids()`: `withingsConnectedRegistryCollection().get()`, then for each doc where `data?.connected === true` push `doc.id` (uid). Returns `string[]`. |

### 1.4 How it iterates users safely

| Item | Evidence |
|------|----------|
| **Loop** | `for (const uid of uids)` in `withingsPull.ts` router. No batching; sequential. |
| **Per user** | For each uid: `fetchWithingsMeasures(uid, startMs, endMs)` (72h window). On throw: `writeFailure(..., stage: "withings.pull", ...)`, increment failuresWritten or failureWriteErrors, `continue`. On success: write RawEvents (create; on exists count as eventsAlreadyExists). No per-user request record; idempotency via RawEvent doc id. |
| **Aggregation** | Counters: usersProcessed, eventsCreated, eventsAlreadyExists, failuresWritten, failureWriteErrors. Returned in 200 JSON. |

### 1.5 How it records failures

| Item | Evidence |
|------|----------|
| **Write** | `writeFailure` from `services/api/src/lib/writeFailure.ts` (userId, source, stage, reasonCode, message, day, details, etc.). |
| **Stages** | `withings.pull` (fetch error), `withings.pull.schema` (schema validation), `withings.pull.write` (write error). |
| **No silent drop** | On failure to write FailureEntry, `failureWriteErrors` incremented and `logger.error` with `withings_pull_failure_write_error`. |

### 1.6 How it updates integration metadata

| Item | Evidence |
|------|----------|
| **Withings pull** | Withings invoker pull does **not** update `users/{uid}/integrations/withings` (no lastSyncAt in that route). It only writes raw events and FailureEntry. Status/lastMeasurementAt for Withings come from elsewhere (e.g. status endpoint reading integration doc or derived from raw events). |
| **Oura today** | `performOuraPullNowCore` in `ouraPullNow.ts` updates `users/{uid}/integrations/oura` with `lastSyncAt: FieldValue.serverTimestamp()` on success. So an invoker route that calls this core would get lastSyncAt updated. |

### 1.7 API route registration and infra

| Item | Evidence |
|------|----------|
| **Mount** | `services/api/src/index.ts`: `app.use("/integrations/withings/pull", requireInvokerAuth, withingsPullRouter);` — no authMiddleware; invoker only. |
| **Gateway** | `integrations/withings/pull` is **not** in `infra/gateway/openapi.yaml`. Scheduler calls Cloud Run URL directly (by design; see PHASE_3_PRINCIPAL_AUDIT_REPORT.md). |
| **Deploy** | No dedicated script in `scripts/deploy` for the schedule. Scheduler is created when Firebase Functions (Gen2) are deployed; `onSchedule` registers with Cloud Scheduler. |

### 1.8 Related: Withings backfill (scheduled resume)

| Item | Evidence |
|------|----------|
| **Function** | `services/functions/src/withings/onWithingsBackfillScheduled.ts` — `onWithingsBackfillScheduled`, same schedule/region/SA, POSTs to `baseUrl/integrations/withings/backfill` with body `{ mode: "resume", yearsBack, chunkDays, maxChunks }`. |
| **API** | `services/api/src/routes/withingsBackfill.ts` — invoker-only, reads backfill state from `users/{uid}/integrations/withings.backfill`, only processes status running/error; different use case (historical backfill). |
| **Oura** | No backfill in repo for Oura; only pull-now and callback-triggered first sync. Scheduled Oura would be “recent window” pull only, analogous to Withings **pull** (not backfill). |

---

## 2. Why this is the closest fit for Oura

- **Same product shape:** “Pull recent data for all connected users on a schedule.” Withings pull = 72h for all connected; Oura = last N days (e.g. 30) for all connected.
- **Same auth model:** Invoker-only route; scheduler uses same pattern (getIdTokenClient(apiBase), POST with no user token). Same `requireInvokerAuth` and allowlist (or Oura-specific env if desired).
- **Same registry shape:** `ouraConnectedRegistryCollection()` exists in `db.ts` — path `system/integrations/oura_connected/{uid}`. Same pattern as Withings for “get all connected uids.”
- **Core already exists:** `performOuraPullNowCore(uid, requestId)` in `ouraPullNow.ts` does token refresh, fetch sleep+HRV, write raw events, update lastSyncAt. Invoker route only needs to: get uids from registry, loop, call core, aggregate counts and handle errors (writeFailure on failure, continue).
- **No backfill needed for MVP:** Withings has separate backfill (historical) and pull (recent). Oura has no backfill in repo; scheduled “pull” is the only scheduled job to add.

---

## 3. Exact files to add or modify for Oura

### 3.1 API (invoker-only route)

| Action | File | Purpose |
|--------|------|---------|
| **Add** | `services/api/src/routes/ouraPull.ts` | New router: GET connected UIDs from `ouraConnectedRegistryCollection()`, for each uid call `performOuraPullNowCore(uid, requestId)`, aggregate usersProcessed/eventsCreated/eventsAlreadyExists and failures; return 200 JSON. Use same structure as `withingsPull.ts` (getConnectedUids, loop, writeFailure on error, no requestRecords). Generate a single requestId per request (e.g. from req or uuid). |
| **Modify** | `services/api/src/index.ts` | Mount: `app.use("/integrations/oura/pull", requireInvokerAuth, ouraPullRouter);` (same order as Withings: requireInvokerAuth then router). |
| **Do not add** | `infra/gateway/openapi.yaml` | Invoker route not exposed via gateway; scheduler calls Cloud Run directly (match Withings). |

### 3.2 Functions (scheduler)

| Action | File | Purpose |
|--------|------|---------|
| **Add** | `services/functions/src/oura/onOuraPullScheduled.ts` | New scheduled function: same pattern as `onWithingsPullScheduled` — `onSchedule({ schedule: "every 15 minutes", region: "us-central1", serviceAccount: same SA })`, `OLI_API_BASE_URL`, `getIdTokenClient(baseUrl)`, POST `baseUrl/integrations/oura/pull`, log start/done/fail. |
| **Modify** | `services/functions/src/index.ts` | Import and export `onOuraPullScheduled`. |

### 3.3 Invoker auth

| Option | Files | Note |
|--------|-------|------|
| **A. Reuse allowlist** | None | Keep using `WITHINGS_PULL_INVOKER_EMAILS` / `WITHINGS_PULL_INVOKER_SUBS`. Same SA calls both Withings and Oura pull; no new env. |
| **B. Oura-specific allowlist** | `services/api/src/middleware/invokerAuth.ts` | Add `OURA_PULL_INVOKER_EMAILS` / `OURA_PULL_INVOKER_SUBS` and a separate middleware or branch that checks path + allowlist. More config, same security. |

Recommendation: **Option A** (reuse) unless you need separate allowlists.

### 3.4 Tests

| Action | File | Purpose |
|--------|------|---------|
| **Add** | `services/api/src/routes/__tests__/oura.pull.test.ts` | Invoker auth required; 403 without invoker; with mock invoker identity and mock registry/core, expect 200 and counts. Mirror `withings.pull.test.ts`. |
| **Add** | `services/functions/src/oura/__tests__/onOuraPullScheduled.test.ts` | Export exists and is scheduled trigger (mirror `onWithingsBackfillScheduled.test.ts`). |

### 3.5 Scripts / infra

| Action | File | Purpose |
|--------|------|---------|
| **None** | `scripts/deploy` | No change; Functions deploy creates the schedule. |
| **None** | `infra/` | No new Terraform for scheduler; same as Withings. |

---

## 4. Smallest production-safe implementation plan

1. **API: invoker route**  
   Add `ouraPull.ts`: get UIDs from `ouraConnectedRegistryCollection()`, loop, call `performOuraPullNowCore(uid, requestId)` for each, on error call `writeFailure(..., stage: "oura.pull", ...)` and continue; aggregate and return `{ ok: true, usersProcessed, eventsCreated, eventsAlreadyExists, failuresWritten, failureWriteErrors }`. Mount under `requireInvokerAuth` at `POST /integrations/oura/pull`.

2. **Functions: scheduler**  
   Add `onOuraPullScheduled.ts`: same schedule/region/SA as Withings pull, POST to `OLI_API_BASE_URL/integrations/oura/pull` with ID token client. Export in `index.ts`.

3. **Auth**  
   Use existing `requireInvokerAuth` and existing allowlist (same SA as Withings pull). No new env for MVP.

4. **Tests**  
   Add API test for `POST /integrations/oura/pull` (invoker required, mock registry and core). Add Functions test that scheduler export exists and is scheduled.

5. **No gateway change**  
   Do not add `/integrations/oura/pull` to openapi.yaml; invoker calls Cloud Run directly.

6. **Failure and metadata**  
   Reuse `writeFailure` with stage `oura.pull` (and sub-stages if needed). `performOuraPullNowCore` already updates `lastSyncAt` on success; no extra metadata step in the invoker route.

---

## Summary table

| Aspect | Withings (existing) | Oura (to add) |
|--------|---------------------|---------------|
| **Scheduler** | `onWithingsPullScheduled` (Functions) | `onOuraPullScheduled` (Functions) |
| **API route** | `POST /integrations/withings/pull` (invoker) | `POST /integrations/oura/pull` (invoker) |
| **Registry** | `withingsConnectedRegistryCollection()` | `ouraConnectedRegistryCollection()` |
| **Core logic** | Inline in withingsPull (fetchWithingsMeasures, write raw) | `performOuraPullNowCore(uid, requestId)` (existing) |
| **Auth** | `requireInvokerAuth`, WITHINGS_PULL_INVOKER_* | Same middleware; reuse allowlist or add OURA_* |
| **Failure** | `writeFailure`, stage withings.pull* | `writeFailure`, stage oura.pull* |
| **Metadata** | Withings pull does not set lastSyncAt | Core sets lastSyncAt on success |
| **Gateway** | Not in openapi | Not in openapi |

---

## Exact next implementation task

Implement **scheduled Oura pull** by:

1. Adding **`services/api/src/routes/ouraPull.ts`** (invoker-only): query `ouraConnectedRegistryCollection()` for connected UIDs; for each uid call `performOuraPullNowCore(uid, requestId)`; on failure call `writeFailure` with stage `oura.pull` and continue; return 200 with usersProcessed, eventsCreated, eventsAlreadyExists, failuresWritten, failureWriteErrors.
2. Mounting it in **`services/api/src/index.ts`** with `app.use("/integrations/oura/pull", requireInvokerAuth, ouraPullRouter)`.
3. Adding **`services/functions/src/oura/onOuraPullScheduled.ts`**: `onSchedule` every 15 minutes, same region/SA as Withings pull, POST to `OLI_API_BASE_URL/integrations/oura/pull` via `getIdTokenClient(baseUrl)`; export in **`services/functions/src/index.ts`**.
4. Adding tests: **`services/api/src/routes/__tests__/oura.pull.test.ts`** and **`services/functions/src/oura/__tests__/onOuraPullScheduled.test.ts`** (contract: export exists, is scheduled).
5. Leaving gateway and invoker allowlist unchanged (reuse WITHINGS_PULL_INVOKER_* for the same SA).
