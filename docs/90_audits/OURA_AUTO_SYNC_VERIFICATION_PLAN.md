# Audit: Verification plan for automatic Oura sync after callback

**Scope:** Live verification steps and log signatures for automatic Oura sync (callback-triggered; no app “Sync now”). No code changes.

**Source of truth:** `services/api/src/routes/integrations.ts` (callback, redirect, fire-and-forget), `services/api/src/routes/integrations/ouraPullNow.ts` (performOuraPullNowCore), `services/api/src/lib/logger.ts` (structured logs), `app/(app)/settings/devices/[deviceId].tsx` (Oura device screen, lastSyncAt display).

---

## 1. Connect Oura

**Goal:** Run the full OAuth connect flow so the callback is hit and auto-sync is triggered.

**Steps:**

1. Deploy/use staging API and app with:
   - Backend: `PUBLIC_BASE_URL` (or gateway host) and `OURA_REDIRECT_URI` aligned to the callback URL; `OURA_CLIENT_ID` and Oura client secret in Secret Manager.
   - App: `EXPO_PUBLIC_BACKEND_BASE_URL` set to the same base (e.g. gateway URL) so return URL is `{base}/integrations/oura/complete`.
2. As a test user, open the app → **Settings → Devices** → tap **Oura** (device detail screen).
3. Tap **On** (or “Turn on Oura”) to start connect. App calls `GET /integrations/oura/connect` (auth), gets OAuth URL, opens it in the browser.
4. Complete Oura authorization in the browser. Oura redirects to `GET /integrations/oura/callback?code=...&state=...` (public, no auth).
5. Backend runs `handleOuraCallback`: validates state, exchanges code, persists refresh token and integration doc, redirects to completion URL, then fires `performOuraPullNowCore(uid, rid)` (fire-and-forget).
6. Browser follows redirect to `/integrations/oura/complete` (or deep link). App returns to foreground; device screen refetches Oura status.

**Log/API checks (optional for this step):** Access log for `GET /integrations/oura/connect` (200) and later for `GET /integrations/oura/callback` (302). See steps 2 and 3 for exact signatures.

---

## 2. Confirm callback still returns 302

**Goal:** Prove the callback response is unchanged: 302 redirect to completion URL.

**Steps:**

1. Trigger the callback (either by doing “Connect Oura” as in step 1, or by replaying a valid callback URL in a browser session that has valid `code` and `state` — replay only for verification, not in production).
2. **HTTP:** From the response:
   - **Status:** `302`
   - **Location:** Either:
     - `{PUBLIC_BASE_URL or gateway host}/integrations/oura/complete` (when callback URL matches `/integrations/oura/callback`), or
     - `com.olifitness.oli://oura-connected` (when callback URL does not match that path).
   Example (gateway): `Location: https://your-gateway.uc.gateway.dev/integrations/oura/complete`

**Log queries (Cloud Run / GCP Logging):**

- **Structured log (access):** One JSON line per request on `res.on("finish")` from `accessLogMiddleware` (`services/api/src/lib/logger.ts`).

  **Query (example):**
  ```text
  jsonPayload.msg="request"
  jsonPayload.method="GET"
  jsonPayload.path=~"/integrations/oura/callback"
  jsonPayload.status=302
  ```

  **Expected signature (subset):**
  ```json
  {
    "level": "info",
    "msg": "request",
    "rid": "<request-id>",
    "method": "GET",
    "path": "/integrations/oura/callback?code=...&state=...",
    "status": 302,
    "ms": <number>,
    "uid": null
  }
  ```
  - `path` may be sanitized (e.g. query params present; `key`/token-like params redacted per `sanitizePathForLogs`). Callback has no auth, so `uid` is typically `null`.
  - `status: 302` is the proof the callback still returns redirect.

- **Console redirect log (callback handler):** Emitted immediately before `res.redirect(302, completionUrl)`.

  **Query (example):**
  ```text
  textPayload=~"OURA_CALLBACK_REDIRECT"
  ```
  or, if logs are JSON:
  ```text
  jsonPayload.message=~"OURA_CALLBACK_REDIRECT"
  ```

  **Expected signature (from `integrations.ts`):**
  ```text
  [OURA_CALLBACK_REDIRECT] { requestId: '<rid>', stateValid: true, completionUrl: '<completionUrl>' }
  ```
  - `completionUrl` must be either `.../integrations/oura/complete` (same host as callback) or `com.olifitness.oli://oura-connected`.

---

## 3. Confirm pull logic is triggered automatically

**Goal:** Prove `performOuraPullNowCore(uid, requestId)` runs after the callback without any app “Sync now” or `POST /integrations/oura/pull-now` call.

**Behavior (from code):** Right after `res.redirect(302, completionUrl)`, the handler runs `void performOuraPullNowCore(uid, rid).catch(...)`. There is **no success log** inside `performOuraPullNowCore`; only error logs. So “triggered” is evidenced by (a) absence of fire-and-forget error, and (b) downstream effects (lastSyncAt or raw events updated).

**Log queries:**

1. **Fire-and-forget error (if auto-sync fails):** If the promise rejects, the callback handler logs:

   **Query:**
   ```text
  jsonPayload.msg="oura_callback_auto_sync_error"
   ```

   **Expected signature:**
   ```json
   {
     "level": "error",
     "msg": "oura_callback_auto_sync_error",
     "rid": "<request-id>",
     "uid": "<uid>",
     "err": "<string>"
   }
   ```
   - **Success case:** This log should **not** appear (no rejection).
   - **Failure case:** If it appears, pull logic was triggered but failed; use `err` and optional pull-now error logs below to debug.

2. **Pull-now error logs (only if something fails inside performOuraPullNowCore):** Any of these indicate pull logic ran and hit an error path:

   | Log `msg` | Meaning |
   |-----------|--------|
   | `oura_pull_now_no_refresh_token` | No refresh token for uid (should not happen right after callback). |
   | `oura_pull_now_misconfig` | Missing OURA_CLIENT_ID or client secret. |
   | `oura_pull_now_token_refresh_failed` | Token refresh failed. |
   | `oura_pull_now_fetch_failed` | Sleep/HRV fetch failed. |
   | `oura_pull_now_metadata_error` | Failed to write `lastSyncAt`. |
   | `oura_pull_now_reconnect_cleanup_error` | Reconnect cleanup failed. |

   **Query (any of these):**
   ```text
  jsonPayload.msg=~"oura_pull_now_"
   ```

   **Success case:** None of these appear (pull completes without logging errors). Evidence of “triggered” is then step 4 (lastSyncAt or raw events).

3. **Correlation:** Same `rid` can appear in:
   - Access log for `GET /integrations/oura/callback` (302),
   - `[OURA_CALLBACK_REDIRECT]` (contains `requestId` = `rid`),
   - And, if any, `oura_callback_auto_sync_error` or `oura_pull_now_*` (both include `rid`). Use `rid` to tie callback request to auto-sync.

---

## 4. Confirm lastSyncAt changes without pressing any button

**Goal:** Prove that after connect, `lastSyncAt` is updated by the callback-triggered sync only (no manual “Sync now” or `POST /integrations/oura/pull-now`).

**Data (from code):**

- **Write:** `performOuraPullNowCore` updates Firestore at `users/{uid}/integrations/oura` with `{ lastSyncAt: FieldValue.serverTimestamp() }` on success (`ouraPullNow.ts`).
- **Read (API):** `GET /integrations/oura/status` (auth) returns `lastSyncAt` from that doc (`integrations.ts` status handler).
- **App:** Device detail screen (`[deviceId].tsx`) shows “Last sync: …” when `ouraPresence.status === "ready"` and `ouraPresence.data.lastSyncAt` is set (from status API).

**Steps:**

1. **Before connect:** Optionally call `GET /integrations/oura/status` for the test user and confirm no Oura connection or `lastSyncAt` null.
2. **Connect Oura** (step 1). Do **not** tap any “Sync now” (Oura device screen has none) and do **not** call `POST /integrations/oura/pull-now`.
3. Wait for auto-sync (e.g. 10–60 seconds; depends on Oura API and load).
4. **After:**
   - **API:** Call `GET /integrations/oura/status` with the user’s auth. Response must include `connected: true` and `lastSyncAt` a non-null ISO string (e.g. `"2025-03-14T12:00:00.000Z"`).
   - **Firestore (if you have access):** Read `users/{uid}/integrations/oura`. Document must have `lastSyncAt` set (server timestamp). Path: `users/<uid>/integrations/oura`, field: `lastSyncAt`.
   - **App:** Open **Settings → Devices → Oura**. After refetch, the screen must show “Last sync: &lt;date/time&gt;” (from `ouraPresence.data.lastSyncAt`).

**Log (optional):** No success log for pull; confirm again that `oura_callback_auto_sync_error` and `oura_pull_now_*` do not appear for that `rid` (or that any `oura_pull_now_*` is a known acceptable failure and lastSyncAt still updates later).

---

## 5. Confirm app no longer shows “Sync now” (Oura device screen)

**Goal:** Prove the Oura device detail screen does not show a “Sync now” button (sync is automatic only).

**Scope:** This applies only to the **Oura device detail** screen: **Settings → Devices → Oura** (route/segment `deviceId === "oura"`). The **workouts** overview screen still has its own “Sync now” for workouts; that is unrelated to Oura.

**Steps:**

1. Connect Oura (or use an account that already has Oura connected).
2. Open **Settings → Devices** → tap **Oura** so the device detail screen is visible.
3. **Check UI:**
   - There must be **no** button or link labeled **“Sync now”** (or “Sync Oura now”) on this screen.
   - There may be: “On”/“Off” toggle, description text, “Metrics this device provides”, and, if synced, “Last sync: &lt;date/time&gt;”.
4. **Automated (if running device tests):** Render the Oura device detail screen with `deviceId: "oura"` and Oura connected; assert the tree does not contain the text `"Sync now"` (see `app/(app)/settings/devices/__tests__/device-detail-oura.test.tsx`).

**Expected:** No “Sync now” on the Oura device screen. “Last sync” appears when `lastSyncAt` is set (step 4).

---

## Summary table

| # | Verification | How |
|---|--------------|-----|
| 1 | Connect Oura | App: Settings → Devices → Oura → On; complete OAuth; return to app. |
| 2 | Callback returns 302 | Response: status 302, Location = `.../integrations/oura/complete` or deep link. Log: `msg="request"`, `method="GET"`, path contains `/integrations/oura/callback`, `status=302`. |
| 3 | Pull logic triggered | No `oura_callback_auto_sync_error` for that request; optional correlation by `rid`; success path has no log, so evidence is step 4. |
| 4 | lastSyncAt changes | After connect (no manual sync): GET /integrations/oura/status returns `lastSyncAt` non-null; Firestore `users/{uid}/integrations/oura.lastSyncAt` set; app shows “Last sync: …”. |
| 5 | No “Sync now” on Oura screen | Settings → Devices → Oura: no “Sync now” button. |

---

## Log reference (exact messages)

- **Access (every request):** `msg: "request"`, `method`, `path`, `status`, `ms`, `rid`, `uid`.
- **Callback redirect (console):** `[OURA_CALLBACK_REDIRECT]` with `requestId`, `stateValid: true`, `completionUrl`.
- **Callback state invalid:** `msg: "oura_callback_state_invalid"`, `rid`, `reason`.
- **Auto-sync failure (fire-and-forget):** `msg: "oura_callback_auto_sync_error"`, `rid`, `uid`, `err`.
- **Pull-now errors:** `msg` one of: `oura_pull_now_no_refresh_token`, `oura_pull_now_misconfig`, `oura_pull_now_token_refresh_failed`, `oura_pull_now_fetch_failed`, `oura_pull_now_metadata_error`, `oura_pull_now_reconnect_cleanup_error`; all include `rid` and `uid` where relevant.

All backend logs above are JSON from `logger.info` / `logger.error` (`services/api/src/lib/logger.ts`): `console.log(JSON.stringify({ level: "info", ...o }))` or `level: "error"`. The redirect line is `console.log("[OURA_CALLBACK_REDIRECT]", ...)` (plain text unless your runtime wraps it).
