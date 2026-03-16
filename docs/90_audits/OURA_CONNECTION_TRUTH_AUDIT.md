# Oura Connection Truth Audit

**UID:** 1Uwhcp4OShV3QLz3VKMHW05B3033  
**Project (script):** oli-staging-fdbba

---

## 1. Proven runtime contradiction

- **Backend (Firestore):** `users/1Uwhcp4OShV3QLz3VKMHW05B3033/integrations/oura` = **missing** (script on oli-staging-fdbba).
- **App UI:** Devices → Oura = **On**; Sleep/Readiness = connected but no data.

So the app shows Oura as connected while the authoritative integration document does not exist for that UID in the checked project.

---

## 2. Exact UI source of truth for Oura = On

**Devices list (Oura row):** `app/(app)/settings/devices.tsx`

The Oura row label is `ouraStatusSummary`. It is derived as follows:

```tsx
// app/(app)/settings/devices.tsx (lines 149–161)
const ouraConnected = ouraPresence.status === "ready" && ouraPresence.data.connected;
const ouraStatusSummary =
  ouraPresence.status === "error"
    ? "Error"
    : ouraPresence.status === "ready"
      ? ouraConnected
        ? "On"
        : "Off"
      : ouraHydrated !== null
        ? ouraHydrated
          ? "On"
          : "Off"
        : "Loading…";
```

- **When `ouraPresence.status === "ready"`:** "On" is shown iff `ouraPresence.data.connected === true` (i.e. from the **status API**).
- **When `ouraPresence.status !== "ready"`** (e.g. `"partial"` or before first fetch): the label comes from **`ouraHydrated`**, which is **local AsyncStorage**, not the API:
  - `ouraHydrated === true` → **"On"**
  - `ouraHydrated === false` → "Off"
  - `ouraHydrated === null` → "Loading…"

`ouraHydrated` is set from:

```tsx
// app/(app)/settings/devices.tsx (lines 90–92, 123–125)
getOuraLastKnownConnected().then((connected) => {
  setOuraHydrated(connected);
});
```

So the **exact** sources of truth for showing "On" are:

1. **Authoritative:** `ouraPresence.status === "ready" && ouraPresence.data.connected` (status API).
2. **Fallback (non-authoritative):** `ouraPresence.status !== "ready" && ouraHydrated === true` (AsyncStorage key `oura:lastKnownConnected`).

**Rendered label:**

```tsx
// app/(app)/settings/devices.tsx (lines 212–214)
<Text style={styles.rowStatus}>{ouraStatusSummary}</Text>
```

**Device detail screen** uses the same presence for the toggle; it does not use hydration for the pill:

```tsx
// app/(app)/settings/devices/[deviceId].tsx (line 250)
const ouraConnected = ouraPresence.status === "ready" && ouraPresence.data.connected;
// Toggle shows "On" only when ouraConnected is true (API only).
```

So the **only** place that can show "On" from non-API state is the **Devices list** when status is not "ready" and `ouraHydrated === true`.

---

## 3. Exact backend source of truth for Oura status

**Endpoint:** `GET /integrations/oura/status`  
**Route:** `services/api/src/routes/integrations.ts` (around 597–680).

**UID resolution:** From the authenticated request (Firebase ID token):

```ts
// services/api/src/middleware/auth.ts (implied)
req.uid = decoded.uid;  // from ID token
// integrations route:
const uid = assertAuthedUid(req, res);
if (!uid) return;
```

**Firestore read:**

```ts
// services/api/src/routes/integrations.ts (605–607)
const ref = userCollection(uid, "integrations").doc("oura");
const snap = await ref.get();
```

**When the integration doc is missing:**

```ts
// services/api/src/routes/integrations.ts (608–623)
if (!snap.exists) {
  return res.status(200).json({
    ok: true as const,
    requestId: rid,
    connected: false,
    lastSyncAt: null,
    lastRefreshAt: null,
    lastSnapshotAt: null,
    revoked: false,
    failureState: null,
    backfillStatus: null,
    backfillStartedAt: null,
    backfillCompletedAt: null,
    backfillFailedAt: null,
    lastBackfillError: null,
  });
}
```

So when the doc is missing, the backend **always** returns **200** with **`connected: false`**. There is no path where a missing doc returns `connected: true`.

---

## 4. Possible mismatch points

| # | Mismatch point | Explanation |
|---|----------------|-------------|
| 1 | **Stale/cached client state** | Devices list shows "On" when `ouraPresence.status !== "ready"` and `ouraHydrated === true`. `ouraHydrated` comes from AsyncStorage `oura:lastKnownConnected`, which can be `true` from a previous session or different environment. Until the status API returns 200, the list uses this value. |
| 2 | **Wrong UID** | If the app is logged in as a different Firebase user than `1Uwhcp4OShV3QLz3VKMHW05B3033`, the backend would read a different Firestore path. The script checked a specific UID; the in-app user might differ. |
| 3 | **Wrong environment / project** | App API base URL is `EXPO_PUBLIC_BACKEND_BASE_URL`. If that points to a different deployment (e.g. prod) than the Firestore project the script used (oli-staging-fdbba), the status API could read a different project and return `connected: true` if the doc exists there. Firebase Auth project is separate from backend; backend uses its own Firestore (project where API runs). |
| 4 | **Status API never returns 200** | If the status request fails (network, 401, 5xx) or never completes, `useOuraPresence` keeps status `"partial"` or sets `"error"`. For `"partial"`, the list uses `ouraHydrated`; for `"error"` it shows "Error", not "On". So for persistent "On" from cache we need status to remain non-"ready" (e.g. request hangs or is never sent). |
| 5 | **Incorrect fallback behavior** | The fallback uses `ouraHydrated` whenever status is not "ready". That is by design for "list hydration" so the list can show something before the API responds. That same fallback allows showing "On" from stale storage when the authoritative doc does not exist. |

---

## 5. Most likely root cause

**Ranking (evidence-based):**

1. **Stale optimistic / hydrated state (LIKELY FROM CODE + EVIDENCE)**  
   - **Evidence:** Backend doc is missing for the given UID; backend returns `connected: false` when doc is missing (code above).  
   - **Code:** The only way the list can show "On" without the API saying `connected: true` is `ouraPresence.status !== "ready"` and `ouraHydrated === true`.  
   - So the app is showing "On" from AsyncStorage (`oura:lastKnownConnected === "true"`) while either the status API has not yet returned 200 for this session, or the user is looking at a state where the list is still using the hydration path.  

2. **Wrong environment (POSSIBLE, NEEDS VERIFICATION)**  
   - If `EXPO_PUBLIC_BACKEND_BASE_URL` points to an API that uses a different Firestore project where the integration doc exists, the API could return `connected: true`. Verifying requires confirming which backend URL the app uses and which project that backend uses.  

3. **Wrong UID (POSSIBLE, NEEDS VERIFICATION)**  
   - If the in-app user is not UID `1Uwhcp4OShV3QLz3VKMHW05B3033`, the script’s Firestore check is for a different user. Verifying requires showing the in-app UID (e.g. on a debug screen) and comparing.  

4. **Status endpoint bug (PROVEN NOT THE CAUSE)**  
   - When the doc is missing, the endpoint returns `connected: false`. No code path returns `connected: true` for a missing doc.  

5. **Status hook bug (PARTIAL)**  
   - The hook itself does not set `connected: true` without a successful API response. The issue is the **list’s use** of `ouraHydrated` when status is not "ready", not the hook returning wrong data.  

**Conclusion:** The most likely root cause is **stale/cached client state**: the Devices list shows "On" from `getOuraLastKnownConnected()` (AsyncStorage) when `useOuraPresence` has not yet reached `status === "ready"` with data from the API, or the list is still rendering from the hydration path. For the **device detail** screen, "On" comes only from the API; if that screen also shows "On", then either the API is returning `connected: true` (e.g. different env/project/UID) or there is another code path to confirm.

---

## 6. Minimal fix plan

**Goal:** The Oura row must not show "On" unless the authoritative backend status (for the current uid/environment) is connected.

**Minimal safe change:**

- **Do not show "On" from hydration alone.**  
  When `ouraPresence.status !== "ready"`, treat Oura as **not** connected for the purpose of the On/Off label. Use hydration only for "Off" or "Loading…", never for "On".

**Concrete change in `app/(app)/settings/devices.tsx`:**

- Today: when status is not "ready", set  
  `ouraStatusSummary = ouraHydrated !== null ? (ouraHydrated ? "On" : "Off") : "Loading…"`.  
- New: when status is not "ready", set  
  `ouraStatusSummary = ouraHydrated === true ? "Loading…" : (ouraHydrated === false ? "Off" : "Loading…")`  
  i.e. **never show "On" when status !== "ready"**. Equivalently: when status is not "ready", always show "Loading…" (or "Off" if you prefer to avoid implying an in-flight request).

Example:

```tsx
const ouraStatusSummary =
  ouraPresence.status === "error"
    ? "Error"
    : ouraPresence.status === "ready"
      ? ouraConnected
        ? "On"
        : "Off"
      : "Loading…";  // was: ouraHydrated !== null ? (ouraHydrated ? "On" : "Off") : "Loading…"
```

Effect: "On" is shown only when `ouraPresence.status === "ready" && ouraPresence.data.connected`, i.e. only when the status API has returned 200 with `connected: true`. Stale AsyncStorage can no longer cause "On" when the backend has no integration doc.

**Optional (hardening):** On first successful status response with `connected: false`, ensure `setOuraLastKnownConnected(false)` is called (already done in `useOuraPresence`). No change needed there.

---

## 7. Exact manual verification steps

1. **Confirm in-app UID and backend**
   - In dev, ensure the app logs or displays the current user’s UID (e.g. Debug → Token or a temporary `console.log(useAuth().user?.uid)` on Devices or Oura detail).
   - Confirm it is `1Uwhcp4OShV3QLz3VKMHW05B3033` when reproducing the issue.
   - Log or display `process.env.EXPO_PUBLIC_BACKEND_BASE_URL` (or the resolved API base) and confirm it points to the same environment as the script (e.g. staging gateway for oli-staging-fdbba).

2. **Confirm status API response when doc is missing**
   - With the app logged in as that UID, call `GET /integrations/oura/status` with the same token (e.g. from browser or curl).  
   - Expect **200** and **`connected: false`** when the integration doc is missing.

3. **Reproduce "On" and check status**
   - Open Devices so the Oura row shows "On".
   - Before the minimal fix: if the status API has not yet returned, the list uses `ouraHydrated`; if it’s true, the row shows "On".
   - After the minimal fix: the row should show "Loading…" until the API returns, then "Off" when the response is `connected: false`.

4. **Verify Firestore again**
   - Re-run the Firestore script for `users/1Uwhcp4OShV3QLz3VKMHW05B3033/integrations/oura` on oli-staging-fdbba and confirm the doc is still missing (or document if it exists).

5. **Optional: clear hydration**
   - Clear AsyncStorage key `oura:lastKnownConnected` (or reinstall the app), reopen Devices, and confirm whether the row still shows "On" after a refetch. If it switches to "Off" after the status API returns, that supports the stale-hydration explanation.

These steps use only code paths and behavior described above; no guessing.
