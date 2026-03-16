# Oura Deployment Execution Audit

**Scope:** Staging (project `oli-staging-fdbba`).  
**UID:** `1Uwhcp4OShV3QLz3VKMHWo5B3033`.  
**Proven runtime fact:** After the patch, this user's integration doc has `connected: true`, `lastRefreshAt: null`, `lastSyncAt: old value`, `lastSnapshotAt: null`, `backfillStatus: null`, `backfillStartedAt: null`, all backfill fields null, no snapshot collections. So the new legacy-recovery and metadata code path has **not** run for this user.

---

## 1. Expected post-patch behavior

- **Legacy recovery:** When `performOuraPullNowCore(uid, requestId)` runs and the integration doc is "legacy" (`connected: true`, no `lastSnapshotAt`, `backfillStatus` not running/completed/failed), the code:
  - Writes `backfillStatus: "running"`, `backfillStartedAt: serverTimestamp()`, `lastBackfillError: null` to `users/{uid}/integrations/oura` (merge).
  - Starts `triggerOuraBackfill(uid, requestId)` fire-and-forget.
- **Metadata after every successful pull-now run:** After fetch + raw events + vendor snapshots, the same function writes to `users/{uid}/integrations/oura` (merge):
  - `lastRefreshAt: serverTimestamp()` **always** (when the run reaches the metadata write).
  - `lastSyncAt` and `lastSnapshotAt` only when `snapshotWrittenCount > 0` (from `deriveOuraSyncMetadataFields`).

So for this user, post-patch we would expect at least one of:
- `lastRefreshAt` set (any run that completed to the metadata block), and/or
- `backfillStatus: "running"` (and `backfillStartedAt`) from the legacy block, then later `completed`/`failed` from backfill.

The observed state (all of those null, `lastSyncAt` old) implies **no run of the new code** for this UID.

---

## 2. Exact code paths that should update this doc

### 2.1 `lastRefreshAt`

- **File:** `services/api/src/routes/integrations/ouraPullNow.ts`
- **Function:** `performOuraPullNowCore`
- **Location:** Lines 438–448: after `deriveOuraSyncMetadataFields(totalSnapshotWritten)`, in a `try` block:
  - `integrationRef.set({ lastRefreshAt: FieldValue.serverTimestamp(), ... }, { merge: true })`.
- **Condition:** Only when the run does **not** early-return (no token, misconfig, token refresh failure, fetch failure). So any completion of the core through to the metadata write sets `lastRefreshAt`.

### 2.2 `backfillStatus`

- **File:** `services/api/src/routes/integrations/ouraPullNow.ts`
  - **Legacy recovery (start):** Lines 224–242. If `isLegacyOuraIntegration(integrationData)` and `backfillStatus !== "running"`, `integrationRef.set({ backfillStatus: "running", backfillStartedAt, lastBackfillError: null }, { merge: true })`.
  - **Backfill lifecycle:** `triggerOuraBackfill` in same file:
    - `setBackfillRunning()` (lines 493–500): `backfillStatus: "running"`, `backfillStartedAt: serverTimestamp()`.
    - `setBackfillFailed(err)` (lines 503–511): `backfillStatus: "failed"`, `backfillFailedAt`, `lastBackfillError`.
    - `setBackfillCompleted()` (lines 514–522): `backfillStatus: "completed"`, `backfillCompletedAt`, `lastBackfillError: null`.
- **File:** `services/api/src/routes/integrations.ts`
  - **Oura callback (new connect):** Lines 861–871. After token exchange, `integrationRef.set({ connected: true, connectedAt, lastSyncAt: null, ..., backfillStatus: "running", backfillStartedAt }, { merge: true })`. This applies only on **new** Oura connect; this user was already connected, so their doc was not written by this path (or was written by an older callback without these fields).

### 2.3 `backfillStartedAt`

- Same writes that set `backfillStatus: "running"`:
  - `services/api/src/routes/integrations/ouraPullNow.ts` legacy block line 239.
  - `services/api/src/routes/integrations/ouraPullNow.ts` `triggerOuraBackfill` → `setBackfillRunning()` lines 496–497.
  - `services/api/src/routes/integrations.ts` Oura callback lines 868–869.

**Summary:** The only path that can set `lastRefreshAt` for this user is **`performOuraPullNowCore`** in the API. The only path that can set `backfillStatus` / `backfillStartedAt` for an already-connected legacy user is **`performOuraPullNowCore`** (legacy block and/or `triggerOuraBackfill`). All of that lives in the **API service** (Express app in `services/api`), not in Firebase Functions.

---

## 3. How staging pull-now is triggered

- **User-authenticated pull-now (same code path as above):**
  - **Route:** `POST /integrations/oura/pull-now` (auth middleware; requires `Idempotency-Key`).
  - **Mount:** `services/api/src/index.ts` line 196: `app.use("/integrations/oura/pull-now", authMiddleware, ouraPullNowRouter)`.
  - **Handler:** `ouraPullNow.ts` router `POST "/"` → `performOuraPullNowCore(uid, requestId)`.
- **Callers in staging:**
  1. **App (Devices):** `app/(app)/settings/devices.tsx`: `maybeAutoOuraPullNow("focus")` on `useFocusEffect`, `maybeAutoOuraPullNow("foreground")` on `AppState` active; 15 min throttle; calls `postOuraPullNow(token, { idempotencyKey })` → `POST .../pull-now`.
  2. **Manual:** Any client (e.g. curl) with `Authorization: Bearer <Firebase ID token>` and `Idempotency-Key` → same route.
  3. **Callback:** `services/api/src/routes/integrations.ts` Oura callback: after setting integration doc and redirecting, `void performOuraPullNowCore(uid, rid).catch(...)`. Only for the user who **just** connected; not for this existing user unless they reconnect.
  4. **Scheduled:** `services/functions/src/oura/onOuraPullScheduled.ts`: every 15 minutes POSTs to `OLI_API_BASE_URL/integrations/oura/pull`. That hits `POST /integrations/oura/pull` (invoker auth), which in `services/api/src/routes/ouraPull.ts` calls `getConnectedOuraUids()` then for each UID `performOuraPullNowCore(uid, requestId)`. UIDs come from `system/integrations/oura_connected/{uid}` (see `services/api/src/db.ts`: `ouraConnectedRegistryCollection()`). So this user is included only if they have a doc there (normally created at callback when they connected).

---

## 4. Whether the patched code is deployed to staging

- **Service that must serve the new logic:** The **API** (Cloud Run service `oli-api` in project `oli-staging-fdbba`). It hosts `performOuraPullNowCore`, legacy recovery, and the metadata write including `lastRefreshAt`.
- **Scheduled job:** `onOuraPullScheduled` only HTTP-POSTs to the API; it does not contain Oura sync or metadata logic. Deploying Functions is **not** required for the new backend behavior; only the API image must include the new code.
- **How to confirm:** Check that the **revision** of `oli-api` currently receiving traffic was built from a commit that contains:
  - `isLegacyOuraIntegration` and the legacy block in `performOuraPullNowCore` (ouraPullNow.ts),
  - `lastRefreshAt` in the metadata update (ouraPullNow.ts),
  - `deriveOuraSyncMetadataFields` usage (ouraSyncMetadata.ts).
- **Conclusion:** If the staging doc for this UID is unchanged after the patch, the most likely explanation is that **the patched code is not yet deployed** to the staging Cloud Run service (old image still live), and/or **`performOuraPullNowCore` has not been invoked** for this UID since a deploy (no pull-now, no scheduled pull including this UID).

---

## 5. Why this user doc remained unchanged

One or both of:

1. **Staging API is still running an old revision**  
   The image currently deployed for `oli-api` in `oli-staging-fdbba` was built from a commit that does not include the legacy-recovery block or the `lastRefreshAt` metadata write. So even if pull-now or scheduled pull ran, the code path that writes those fields never executed.

2. **No invocation of `performOuraPullNowCore` for this UID since deploy**  
   - If the user did not open Devices / foreground the app (or did within the 15 min throttle), no app-triggered pull-now.
   - If the user is not in `system/integrations/oura_connected/{uid}`, the scheduled job would not call `performOuraPullNowCore` for this UID.
   - Callback only runs on new connect, so it did not run for this existing user.

The proven runtime fact (all new fields still null) is consistent with **either** (1) **or** (2); most likely (1) if a deploy was assumed but not verified.

---

## 6. Exact next operational step

1. **Deploy the API to staging** so the running revision includes the new code:
   - From repo root, with `gcloud` project set to `oli-staging-fdbba`:
     - Build: `./scripts/deploy/phase3a-withings-build-api-image.sh` (builds image tagged with `git rev-parse --short HEAD`).
     - Deploy: `./scripts/deploy/phase3a-withings-deploy-cloudrun.sh` (no arg = same short SHA), or `./scripts/deploy/phase3a-withings-deploy-cloudrun.sh <SHORT_SHA>` to match the built image.
   - Optionally redeploy gateway if needed: `./scripts/deploy/phase3a-withings-deploy-gateway.sh`.
2. **Force this UID through the updated code path** (smallest reliable way):
   - Call `POST <staging-gateway-or-api-url>/integrations/oura/pull-now` with:
     - `Authorization: Bearer <Firebase ID token for UID 1Uwhcp4OShV3QLz3VKMHWo5B3033>`
     - `Idempotency-Key: audit-<timestamp>` (e.g. `audit-2025-03-15T12:00:00Z`).
   - Staging gateway host (from repo): e.g. `oli-api-0drj1f1cbrv7k.apigateway.oli-staging-fdbba.cloud.goog` (see `infra/gateway/openapi.yaml`). Use the same base URL the app uses for staging.
   - Alternative: have the user (this UID) open the app, go to Settings → Devices, and allow the auto pull (focus/foreground) or wait for the next 15-min scheduled pull if they are in `system/integrations/oura_connected`.

---

## 7. Exact verification command after deploy

From the **`services/api`** directory (so `scripts/oura-backfill-truth-audit.mjs` resolves), with project set for Firestore/logging:

```bash
cd services/api && RUN_LOGS=1 node scripts/oura-backfill-truth-audit.mjs "1Uwhcp4OShV3QLz3VKMHWo5B3033" "oli-staging-fdbba"
```

Or from repo root with explicit project:

```bash
cd services/api && FIREBASE_PROJECT_ID=oli-staging-fdbba RUN_LOGS=1 node scripts/oura-backfill-truth-audit.mjs "1Uwhcp4OShV3QLz3VKMHWo5B3033" "oli-staging-fdbba"
```

After a successful run of the new code for this UID you should see:
- `lastRefreshAt` non-null,
- and for a legacy user, `backfillStatus` (and `backfillStartedAt`) set (e.g. `running` then `completed`/`failed`).

---

## Final Proof of Fix (Staging Verification)

Verified in staging on 2026-03-15:

- **POST /integrations/oura/pull-now** returned **202** with `requestId` `5ccf739f-2757-4c08-a2f5-c920105e8359`.
- **users/{uid}/integrations/oura** updated:
  - `lastRefreshAt` = 2026-03-15T18:05:36.197Z  
  - `lastSyncAt` = 2026-03-15T18:05:36.197Z  
  - `lastSnapshotAt` = 2026-03-15T18:05:36.197Z
- **users/{uid}/ouraVendorSleep** exists with **38 docs**.
- **users/{uid}/ouraVendorReadiness** exists with **88 docs**.
- Latest `fetchedAt` values refreshed to ~2026-03-15T18:05:36Z.

**Conclusion:** Pull-now now completes raw ingest synchronously, enqueues durable post-raw work successfully, and post-raw snapshots plus metadata persist correctly.

**Why this proves the fix:**

1. **HTTP request no longer blocks on post-raw persistence** — A 202 response confirms the API returns immediately after core raw writes and job enqueue, without waiting for snapshot writes or metadata.
2. **Durable Pub/Sub path is working** — The presence of `lastRefreshAt`, `lastSyncAt`, and `lastSnapshotAt` (and populated vendor snapshot collections) shows the post-raw handler ran after the request ended and wrote integration metadata and snapshots.
3. **Sleep snapshots now persist correctly** — `ouraVendorSleep` contains 38 docs with refreshed `fetchedAt`, so the sleep snapshot path (including Firestore-safe payloads and the durable handler) is functioning.
4. **Metadata is updated only after post-raw succeeds** — The integration doc’s timestamp fields are set only when the durable handler completes snapshot writes and then the metadata write; they are not set from the synchronous request path.

---

## Appendix: Code path reference

| Field / behavior        | File:Symbol / location |
|-------------------------|-------------------------|
| `lastRefreshAt`         | `services/api/src/routes/integrations/ouraPullNow.ts`: `performOuraPullNowCore`, ~line 440 |
| `backfillStatus` (legacy)| `services/api/src/routes/integrations/ouraPullNow.ts`: `performOuraPullNowCore`, lines 224–242 |
| `backfillStartedAt`     | Same legacy block line 239; `triggerOuraBackfill` → `setBackfillRunning` lines 496–497; `integrations.ts` callback 869 |
| `backfillStatus` (lifecycle) | `services/api/src/routes/integrations/ouraPullNow.ts`: `triggerOuraBackfill` (setBackfillRunning / setBackfillFailed / setBackfillCompleted) |
| Legacy detection        | `services/api/src/routes/integrations/ouraSyncMetadata.ts`: `isLegacyOuraIntegration` |
| Pull-now route         | `services/api/src/index.ts` line 196; handler in `services/api/src/routes/integrations/ouraPullNow.ts` router `POST "/"` |
| Scheduled pull          | `services/functions/src/oura/onOuraPullScheduled.ts` → POST to API `.../integrations/oura/pull`; API `services/api/src/routes/ouraPull.ts` → `getConnectedOuraUids()` then `performOuraPullNowCore` per UID |
| Registry for scheduled  | `services/api/src/db.ts`: `ouraConnectedRegistryCollection()` → `system/integrations/oura_connected` |
| Staging deploy (API)    | Build: `scripts/deploy/phase3a-withings-build-api-image.sh`; Deploy: `scripts/deploy/phase3a-withings-deploy-cloudrun.sh` [TAG] |
