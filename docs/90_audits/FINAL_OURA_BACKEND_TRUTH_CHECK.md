# Final Oura Backend Truth Check

**Observed app session:**
- Devices list: Oura = **Loading…**
- Oura detail: **On**
- Sleep / Readiness: **no data**

**Goal:** Determine whether the remaining issue is wrong UID, wrong backend/project, missing integration doc, backfill/import failure, snapshot collections missing, or inconsistent frontend API state between list and detail.

---

## 1. Current app identity / env

**Where to read in the app:**

| What | Location | How |
|------|----------|-----|
| **Current UID** | `app/debug/token.tsx` | Navigate to **Debug → Token**. First block shows **UID** (selectable). Same value: `useAuth().user?.uid`. |
| **Backend base URL** | `app/debug/token.tsx` | Same screen: **Backend base URL** block shows `process.env.EXPO_PUBLIC_BACKEND_BASE_URL` (selectable). |
| **Backend URL at request time** | `lib/api/http.ts` (line 304) | In `__DEV__`, `apiGetJsonAuthed` logs `DEBUG_BACKEND_BASE_URL` to console when any authed GET runs (e.g. when Oura status is fetched). |

**Environment / project identifier:**

- The app does **not** display a single “environment” or “Firebase project” label. Backend project is determined by **which API base URL** the app hits (e.g. staging gateway vs prod). Firebase Auth project is configured at build time (Expo/React Native config); the same build can talk to different backends via `EXPO_PUBLIC_BACKEND_BASE_URL`.
- To know which backend/project is in use: note the **Backend base URL** from Debug → Token and match it to your deployment (e.g. staging gateway URL → Cloud Run project that uses Firestore oli-staging-fdbba).

**Exact code (UID + backend URL on Debug Token):**

```tsx
// app/debug/token.tsx — UID block
<Text selectable style={{ fontWeight: "700" }}>{user?.uid ?? "—"}</Text>

// app/debug/token.tsx — Backend base URL block (added for truth check)
<Text selectable style={{ fontWeight: "700", fontSize: 12 }}>
  {typeof process.env.EXPO_PUBLIC_BACKEND_BASE_URL === "string"
    ? process.env.EXPO_PUBLIC_BACKEND_BASE_URL.trim() || "(empty)"
    : "(not set)"}
</Text>
```

---

## 2. Oura status endpoint truth

**Backend:**

- **Route:** `GET /integrations/oura/status`
- **File:** `services/api/src/routes/integrations.ts` (handler around 597–710).
- **UID:** From auth middleware: `req.uid = decoded.uid` (Firebase ID token). Resolved via `assertAuthedUid(req, res)`.
- **Firestore read:** `userCollection(uid, "integrations").doc("oura").get()` → `users/{uid}/integrations/oura`.
- **When doc is missing:** Returns **200** with `connected: false` and all other fields null (see §3).

**Client:**

- **Call:** `getOuraStatus(idToken, opts)` in `lib/api/oura.ts` → `apiGetZodAuthed("/integrations/oura/status", idToken, ouraStatusResponseSchema, ...)`.
- **URL:** `EXPO_PUBLIC_BACKEND_BASE_URL` + `/integrations/oura/status` (plus cache-bust query if provided).

**Truth:** For a given request, the response is determined only by the **backend** that served that request and the **uid** in the token. Same UID + same backend → same response. If the app shows Oura detail **On**, that screen’s status request received **200** with **`connected: true`** from that backend (for that UID).

---

## 3. Firestore integration truth

**Path:** `users/{uid}/integrations/oura`

**Fields (when doc exists):** `connected`, `connectedAt`, `lastSyncAt`, `lastRefreshAt`, `lastSnapshotAt`, `backfillStatus`, `backfillStartedAt`, `backfillCompletedAt`, `backfillFailedAt`, `lastBackfillError`, `revoked`, `failureState`.

**How to verify for the app session:**

1. Read **UID** and **Backend base URL** from Debug → Token.
2. Resolve which Firestore project that backend uses (e.g. oli-staging-fdbba for staging gateway).
3. In that project, read `users/<UID from app>/integrations/oura`:
   - **Missing** → status API returns 200 with `connected: false`.
   - **Exists** with `connected: true` → status API returns 200 with `connected: true`.

**Script (same as prior audit):** From `services/api` with credentials for that project:

```bash
FIREBASE_PROJECT_ID=<project> node scripts/oura-backfill-truth-audit.mjs "<UID from Debug Token>" <project>
```

Use the **same UID** shown in the app and the **project** that backs the **Backend base URL** the app is using.

---

## 4. Snapshot truth

**Paths:**

- `users/{uid}/ouraVendorSleep` (subcollection)
- `users/{uid}/ouraVendorReadiness` (subcollection)

**Purpose:** Sleep and Readiness screens show data only when these collections have at least one doc with `day` in the last 7 days (exact + fallback query). No docs or no doc in window → “no data”.

**How to verify:** Same script as §3 reports exists/total/latest 5 by day for both collections. If backend returns `connected: true` but both collections are empty or have no recent `day`, the issue is **backfill/import or snapshot writes**, not connection state.

---

## 5. List vs detail mismatch explanation

**Exact hook/state path:**

| Screen | File | Hook / state |
|--------|------|--------------|
| **Devices list** | `app/(app)/settings/devices.tsx` | `const ouraPresence = useOuraPresence();` (line 36). Summary: `ouraStatusSummary` = "On" only when `ouraPresence.status === "ready"` and `ouraPresence.data.connected`; otherwise "Error" or "Loading…". |
| **Oura detail** | `app/(app)/settings/devices/[deviceId].tsx` | `const ouraPresence = useOuraPresence();` (line 44). Toggle "On" when `ouraConnected = ouraPresence.status === "ready" && ouraPresence.data.connected`. |

**Why list can be Loading… while detail is On:**

- **Each screen has its own `useOuraPresence()` instance.** The hook keeps state in `useState` inside the hook; there is no shared cache or global store. So:
  - **List** and **detail** each run their own `getOuraStatus(token)` and maintain their own `status` and `data`.
- **Typical sequence:**
  1. User is on Devices list. List’s `useOuraPresence` mounts, starts with `status: "partial"`, calls `getOuraStatus`. List shows **Loading…** because `status !== "ready"`.
  2. User taps Oura before the list’s request completes. List may unmount (or stay in stack); **Oura detail** mounts.
  3. Detail’s `useOuraPresence` runs, calls `getOuraStatus` (its own request). That request completes with 200 and `connected: true`. Detail sets `status: "ready"`, `data.connected: true` → shows **On**.
  4. List never received a response (or received it after navigate); list’s state may still be `"partial"` or may have updated later. So when the user later goes back to the list, the list can still show **Loading…** if its instance never reached `"ready"`, or **On** if it did.

**Conclusion (from code):** List = Loading… and detail = On is **consistent**: two independent status fetches; the list’s fetch had not yet produced `status === "ready"` when the user left, while the detail’s fetch did and returned `connected: true`. So for that session, **the backend the detail’s request hit did return `connected: true`** for the UID in the app’s token. So either:

- The integration doc **exists** for that UID in the backend’s project, or  
- The detail’s request went to a **different** backend (different URL/project) where the doc exists.

There is no “inconsistent frontend API state” in the sense of a single state being wrong; the two screens simply have **two separate states**, and only the detail’s state has reached "ready" with `connected: true`.

---

## 6. Root cause

**Classification (evidence-based):**

| Possibility | How to conclude |
|-------------|------------------|
| **Wrong UID** | Compare UID on Debug → Token with UID used in Firestore/script. If different → wrong UID. |
| **Wrong backend/project** | Compare Backend base URL on Debug → Token with the API/gateway that serves your Firestore project. If URL points to another project (e.g. prod) where the doc exists → wrong backend. |
| **Missing integration doc** | If UID and project match the app and `users/{uid}/integrations/oura` is missing → backend returns `connected: false`. Then detail could not show On unless (a) detail’s request hit a different backend, or (b) doc was created between list and detail request. |
| **Backfill/import failure** | If integration doc exists and has `backfillStatus: "failed"` or no `lastSnapshotAt` and empty snapshot collections → backfill or snapshot writes failed. |
| **Snapshot collections missing** | If integration doc exists but `ouraVendorSleep` and `ouraVendorReadiness` are empty or have no recent `day` → no data is expected; fix is backfill/snapshot pipeline, not connection. |
| **Inconsistent frontend state** | Not a bug: list and detail use separate `useOuraPresence()` instances. List = Loading… and detail = On is explained by list’s fetch not having completed with "ready" before navigate; detail’s fetch completed with `connected: true`. |

**Most likely for “detail = On, Sleep/Readiness = no data”:**

- **Backend is connected for that UID** (doc exists in the project that served the detail’s request), and **snapshot collections are empty or have no recent data** (backfill not run, failed, or wrote nothing). So: **backfill/import or snapshot writes** is the problem, not connection or wrong UID/project.

Verify by: same UID and project as app → run script; if doc exists and snapshot collections are empty, that confirms it.

---

## 7. Exact next backend fix

**Only after verifying** (same UID as app, same project as Backend base URL):

1. **If `users/{uid}/integrations/oura` is missing**  
   - Then status API would return `connected: false` for that UID. If the app still shows detail = On, confirm the app’s Backend base URL and that the script’s project matches. No backend “fix” for connection state; ensure app and script use same env.

2. **If integration doc exists but `backfillStatus: "failed"` or no snapshots**  
   - **Next backend fix:** Fix cause of backfill failure (e.g. `lastBackfillError`), then re-run backfill for that UID (or expose a retry path). Ensure `triggerOuraBackfill` (or equivalent) runs and that snapshot writers run and write to `users/{uid}/ouraVendorSleep` and `users/{uid}/ouraVendorReadiness`.

3. **If integration doc exists, backfill completed, but snapshot collections still empty**  
   - **Next backend fix:** Investigate snapshot pipeline: why `writeOuraVendorSleepSnapshots` / `writeOuraVendorReadinessSnapshots` wrote 0 docs (e.g. Oura API returned no sleep/readiness in window, or day extraction filtered everything out). Fix mapping or backfill window; re-run backfill.

4. **If snapshot collections have docs but not in last 7 days**  
   - Backend is correct; app “no data” is expected. Optional: extend fallback window or show “latest available” messaging.

**Minimal “next” fix (once root cause is known):** Apply the fix that matches the case above (wrong env vs backfill failure vs snapshot pipeline). Do not change backend status semantics; they are correct (missing doc → `connected: false`).

---

## Checks summary

1. **Print in app:** Use **Debug → Token** for **UID** and **Backend base URL** (and console for `DEBUG_BACKEND_BASE_URL` on first authed GET).
2. **List vs detail:** List and detail each use **separate** `useOuraPresence()`; no shared state. List = Loading… and detail = On means detail’s request returned `connected: true`; list’s had not reached "ready" before navigate.
3. **For the same app UID and backend env:** Run the audit script for that UID and the project that backs that Backend base URL; inspect status response (or infer from doc existence), `users/{uid}/integrations/oura`, and the two snapshot collections.
4. **Conclusion:** If doc exists for that UID in that project, backend is “connected” and the remaining issue is backfill/snapshots. If doc is missing, confirm app and script use the same backend/project; then connection state is correct (`connected: false`) and list/detail mismatch is timing (separate hook instances).
