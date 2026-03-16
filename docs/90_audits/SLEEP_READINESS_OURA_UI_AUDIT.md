# Sleep & Readiness Oura-Style UI Redesign — Audit & Checklist

## 1. Brief audit: current screens and data sources

### Before (placeholder state)

- **Routes:** `app/(app)/recovery/sleep.tsx`, `app/(app)/recovery/readiness.tsx`.
- **Header:** No explicit `Stack.Screen` options for these routes; native header could show route path (e.g. "recovery/sleep").
- **Body:** `ModuleScreenShell` with in-page title/subtitle ("Sleep" / "Duration & quality", etc.), a small score card, and simple contributor rows (label + value only; no progress bars or rating labels). A "Details" block on Sleep showed totalMinutes, efficiency, latencyMinutes, restfulSleep from view fields.

### Data sources (unchanged)

- **Hooks:** `useSleepView(day)`, `useReadinessView(day)` from `lib/data/useSleepView.ts` and `lib/data/useReadinessView.ts`.
- **API:** `getOuraSleepView(day)`, `getOuraReadinessView(day)` in `lib/api/usersMe.ts` → GET `/users/me/oura-sleep-view?day=`, `/users/me/oura-readiness-view?day=`.
- **Backend:** Reads `ouraVendorSleep` / `ouraVendorReadiness`; returns `SleepViewDto` / `ReadinessViewDto` (`lib/contracts/ouraVendor.ts`): `score` (0–100), `contributors` (Record<string, unknown>), plus sleep-specific fields (`totalMinutes`, `efficiency`, `latencyMinutes`, `restfulSleep`, `remSleep`, `deepSleep`, etc.). Contributor keys are Oura-style (e.g. snake_case: `total_sleep`, `efficiency`, `resting_heart_rate`, `hrv_balance`).
- **No Firebase in screens:** Data flows via typed hooks → API → backend; no direct Firebase reads in the app.

### After (redesign)

- **Header:** Set at route level in `app/(app)/_layout.tsx`: `Stack.Screen name="recovery/sleep" options={{ title: "Sleep" }}`, `Stack.Screen name="recovery/readiness" options={{ title: "Readiness" }}`. Native header shows "Sleep" and "Readiness".
- **Body:** In-page title/subtitle removed via `hideTitleChrome={true}`. Body is: (1) optional fallback banner when `isFallback`, (2) score hero (large score + rating label) when `score != null`, (3) fixed-order contributor list with label, value, horizontal progress bar, and rating text. Loading, error, missing, and empty states preserved.

---

## 2. File paths and new/updated files

| Path | Change |
|------|--------|
| `app/(app)/_layout.tsx` | Added `Stack.Screen` for `recovery/sleep` (title "Sleep") and `recovery/readiness` (title "Readiness"). |
| `lib/format/ouraScore.ts` | **New.** Helpers: `scoreToRatingLabel`, `contributorValueToProgress`, `contributorValueToRatingLabel`, `formatContributorDisplayValue`, `formatSleepDurationMinutes`; ordered key configs `SLEEP_CONTRIBUTOR_KEYS`, `READINESS_CONTRIBUTOR_KEYS`. |
| `app/(app)/recovery/sleep.tsx` | Replaced body with Oura-style hero + ordered contributor rows (label, value, bar, rating); `hideTitleChrome`; Total sleep value uses `totalMinutes` when available. |
| `app/(app)/recovery/readiness.tsx` | Same pattern: hero + ordered readiness contributor rows; `hideTitleChrome`. |

No new selectors, view-models, or repositories; existing `useSleepView` and `useReadinessView` and API contracts are used as-is.

---

## 3. How the screens work now (plain English)

- **Navigation:** User opens Recovery → Sleep or Readiness. Native header shows "Sleep" or "Readiness" (set by layout options).
- **Data:** Screen uses `toTodayYmd()` for the requested day and calls `useSleepView(day)` or `useReadinessView(day)`. No Firebase; data comes from the existing API (backend reads Oura vendor snapshots).
- **States:**
  - **Loading (partial):** Spinner and "Loading …" text.
  - **Missing:** Empty-state card with context-aware copy (Oura connected vs not, import running/failed, etc.) using `useOuraPresence` and `deriveOuraImportState`.
  - **Error:** Error card with "Could not load … Try again later."
  - **Ready:** Fallback banner if `isFallback`; then score hero (big number + rating: Optimal / Good / Fair / Pay attention) when `score != null`; then a fixed-order list of contributors.
- **Contributors:** Each row shows: label (from `SLEEP_CONTRIBUTOR_KEYS` / `READINESS_CONTRIBUTOR_KEYS`), value (formatted via `formatContributorDisplayValue`; Sleep’s "Total sleep" uses `formatSleepDurationMinutes(totalMinutes)` when available), a horizontal progress bar from `contributorValueToProgress` (0–100 → 0–1), and rating text from `contributorValueToRatingLabel`. All logic is deterministic helpers in `lib/format/ouraScore.ts`.
- **Insight/headline:** Not in current DTOs; optional insight can be added later when the backend exposes it.

---

## 4. Acceptance checklist

- [ ] Native header shows **"Sleep"** on the Sleep screen (not "recovery/sleep" or route path).
- [ ] Native header shows **"Readiness"** on the Readiness screen (not "recovery/readiness" or route path).
- [ ] In-page title/subtitle block is **not** shown on either screen (no duplicate title under the nav bar).
- [ ] **Sleep:** Score hero shows large sleep score and rating label (Optimal / Good / Fair / Pay attention).
- [ ] **Sleep:** Contributor list shows, in order: Total sleep, Efficiency, Restfulness, REM sleep, Deep sleep, Latency, Timing; each row has label, value, horizontal progress bar, rating text.
- [ ] **Sleep:** "Total sleep" value shows duration (e.g. "7h 30m") when `totalMinutes` is available; otherwise contributor value.
- [ ] **Readiness:** Score hero shows large readiness score and rating label.
- [ ] **Readiness:** Contributor list shows, in order: Resting heart rate, HRV balance, Body temperature, Recovery index, Sleep, Sleep balance, Sleep regularity, Previous day activity, Activity balance; each row has label, value, bar, rating.
- [ ] Loading, error, missing, and empty states still work and show appropriate copy.
- [ ] No direct Firebase usage in screens; data from `useSleepView` / `useReadinessView` only.
- [ ] Styling is minimal and production-ready (tokens: #1C1C1E, #6E6E73, #F2F2F7, #E5E5EA).

---

## 5. Run these checks

```bash
# Lint and typecheck
npm run typecheck
npm run lint

# Unit tests (if you add tests for ouraScore helpers)
npm run test -- lib/format/ouraScore
npm run test -- "app/(app)/recovery/"

# Run app and manually verify
npm start
# Navigate to Recovery → Sleep and Recovery → Readiness; confirm headers and Oura-style layout.
```

---

## 6. Contributor key gaps (mobile read path)

- Backend forwards `contributors` as stored in the snapshot (Oura API shape). Keys are typically snake_case (e.g. `total_sleep`, `resting_heart_rate`). The app uses fixed ordered lists (`SLEEP_CONTRIBUTOR_KEYS`, `READINESS_CONTRIBUTOR_KEYS`) and looks up by key; missing keys show "—", 0% bar, and "Pay attention."
- If the vendor snapshot uses different keys (e.g. camelCase), add a key map in `lib/format/ouraScore.ts` (e.g. `contributorKeyAliases`) and resolve before lookup. No backend change required for the current Oura snake_case keys.
