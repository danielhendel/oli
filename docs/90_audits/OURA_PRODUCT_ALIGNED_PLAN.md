# Revised Oura Product-Aligned Plan

**Product goal:** Make Oura Sleep and Oura Readiness first-class, Oura-equivalent user experiences in Oli. All other Oura data is raw-first for future intelligence.

---

## 1. Verdict on current implementation direction

### What is aligned

- **Sync and auth:** OAuth connect/callback/status/revoke, callback auto-sync, app focus/foreground refresh, scheduled pull, and `performOuraPullNowCore` are in place and should not change. No manual Sync button; devices screen and last sync behavior are correct.
- **Tier 2 raw ingestion:** Personal, daily_activity, workout, session, tag, spo2, heartrate are fetched and stored as raw (canonical steps/workout where applicable; rest as `oura_raw`). That matches “raw-first for future insights.”
- **Canonical sleep facts:** We already map Oura sleep to canonical sleep (totalMinutes, efficiency, latencyMinutes, awakenings, isMainSleep) and aggregate into `DailySleepFacts` (totalMinutes, mainSleepMinutes, efficiency, latencyMinutes, awakenings). So **physiological sleep facts** that Oli derives from Oura are present in the pipeline.
- **Canonical recovery (HRV):** We map Oura daily_readiness to HRV items and aggregate into `DailyRecoveryFacts.hrvRmssd`. So **one physiological input** to readiness is present.

### What is not aligned

- **Sleep as a product surface:** The **Oura Sleep experience** is score + contributors + detailed metrics, shown in a dedicated Sleep screen. Today we have:
  - **No Oura sleep score** stored or exposed (we never persist `score` from Oura’s sleep API).
  - **No sleep contributors** (total sleep, efficiency, restfulness, latency, REM, deep, timing) stored as a vendor snapshot for display.
  - **No Sleep screen content** — `app/(app)/recovery/sleep.tsx` is a shell (`{null}`). We cannot show “Oura-equivalent” Sleep without score + contributors + a contract for the screen.
- **Readiness as a product surface:** The **Oura Readiness experience** is score + contributors (RHR, HRV balance, body temperature, recovery index, sleep, sleep balance, etc.). Today we have:
  - **No Oura readiness score** stored (we only extract rmssd from daily_readiness; we drop `score`).
  - **No readiness contributors** stored.
  - **Readiness screen is a shell** — `app/(app)/recovery/readiness.tsx` is `{null}`. HRV-only aggregation is **not** sufficient for an Oura-equivalent Readiness screen; we need the vendor score and contributors.
- **Vendor vs canonical:** We treat Oura as “manual-compatible” and only persist fields that fit canonical sleep/HRV. So we **discard** Oura’s own scores and contributor breakdowns. That is correct for “canonical truth” but wrong for “vendor-faithful Sleep/Readiness screens.”

### What is missing for the product goal

| Gap | Impact |
|-----|--------|
| **Oura sleep score + contributors not stored** | Sleep screen cannot show Oura-equivalent score and contributor metrics. |
| **Oura readiness score + contributors not stored** | Readiness screen cannot show Oura-equivalent score and contributor metrics. |
| **No vendor snapshot layer for Sleep/Readiness** | All Oura-specific display data (scores, contributors, labels) is lost at ingest. |
| **Sleep/Readiness screens are empty** | Even with dailyFacts (duration, HRV), we have no UI contract or components to show Oura-style Sleep or Readiness. |
| **API/contract for Sleep/Readiness screens** | No DTO or selector that returns “sleep for day from Oura” or “readiness for day from Oura” including vendor snapshot. |

**Summary:** Current direction is aligned for **sync**, **Tier 2 raw ingestion**, and **canonical sleep/HRV facts**. It is **not** aligned for **Tier 1 product**: we do not store or surface Oura’s sleep score, readiness score, or their contributors, and the Sleep/Readiness screens have no content or contract.

---

## 2. Tiering strategy

| Dataset / capability | Tier | Why | User-facing now? | Canonical now? | Raw-only now? | Notes |
|----------------------|------|-----|------------------|----------------|---------------|--------|
| **Sleep** | 1 | Product goal: Oura-equivalent Sleep screen (score, contributors, metrics). | Yes (Dash → Sleep) | Yes (duration, efficiency, latency, awakenings already) | No | Add vendor snapshot (score, contributors) and screen contract. |
| **Readiness** | 1 | Product goal: Oura-equivalent Readiness screen (score, contributors). | Yes (Dash → Readiness) | Partial (HRV only today) | No | Add vendor snapshot (score, contributors); HRV-only is insufficient. |
| **Activity** | 2 | Future insights / activity balance; not required for Sleep/Readiness parity. | No | Optional (steps already canonical from daily_activity) | Yes for extra fields | Keep current: steps canonical, rest raw if needed. |
| **Heartrate** | 2 | Future; Gen 3–only. | No | No | Yes | Already stored as oura_raw. |
| **Workouts** | 2 | Future insights / activity balance. | No | Yes (we map to canonical workout) | No | Keep current mapping. |
| **Sessions** | 2 | Future (guided sessions). | No | No | Yes | oura_raw. |
| **Tags** | 2 | Future (user tags). | No | No | Yes | oura_raw. |
| **SpO2** | 2 | Future (sleep/health insights). | No | No | Yes | oura_raw. |
| **Profile/personal/email** | 2 | Future (demographics, account). | No | No | Yes | oura_raw (personal). |

---

## 3. Tier 1 implementation spec — Sleep + Readiness

### 3.1 Sleep

**Exact data model Oli should preserve from Oura (API v2 sleep document):**

- **Vendor snapshot (for display):**  
  `id`, `day` (or derived), `score` (0–100), `contributors` (object with contributor names and values, e.g. total_sleep, efficiency, restfulness, latency, rem_sleep, deep_sleep, timing), plus any Oura-specific labels we need for “vendor-faithful” copy.
- **Canonical physiological facts (already in use):**  
  `bed_time`/`wake_time`/`end_time` → start/end; `total_sleep_duration` → totalMinutes; `efficiency` → 0–1; `latency` → latencyMinutes; `number_of_awakenings` → awakenings; `type` → isMainSleep. These remain the source for `DailySleepFacts` and canonical sleep events.

**Vendor snapshot vs canonical:**

- **Vendor snapshot:** Oura’s `score` and `contributors` (and any other display-only fields). Stored as-is per night for the Sleep screen. Not used as the single source of truth for physiological aggregation; used for “show what Oura shows.”
- **Canonical facts:** totalMinutes, efficiency, latencyMinutes, awakenings, isMainSleep. Used for dailyFacts, insights, and cross-source truth. Already implemented.

**What the Sleep screen in Oli needs to render:**

- Primary: **Sleep score** (0–100) for the selected night (or latest).
- Contributors: **Total sleep, Efficiency, Restfulness, Latency, REM, Deep, Timing** (or Oura’s exact contributor set) with values/labels.
- Detail: **Duration, efficiency %, latency, awakenings, restful_sleep**, and any other metrics we agree to show (vendor-faithful).
- Source: Prefer “from Oura” when the night’s data is from Oura; show last sync if useful.

**Current code paths to reuse:**

- `fetchOuraSleep`, `mapOuraSleepToIngestItem`, `writeOuraRawEvents` (sleep items) — keep. Continue writing canonical sleep events and updating lastSyncAt.
- `aggregateDailyFactsForDay` and `buildSleepFacts` — keep. They already populate `DailySleepFacts` from canonical sleep events.

**What’s new:**

- **Persist Oura sleep vendor snapshot:** For each Oura sleep document, in addition to the canonical sleep write, store a **vendor snapshot** (score + contributors + any display fields). Options: (a) a new store per user/day or per document (e.g. `users/{uid}/ouraSleepSnapshots/{id}` or by day), or (b) an extended raw-event payload or sidecar that holds the snapshot and is keyed by the same id/day. Recommendation: **dedicated collection or subcollection** (e.g. `users/{uid}/ouraVendor/sleep/{id}` or `.../byDay/{day}`) so the Sleep screen can query “Oura sleep for day X” without parsing raw events. Schema: `{ id, day, score, contributors, ...displayFields, source: "oura", fetchedAt }`.
- **API/selector for Sleep screen:** Endpoint or client selector that returns “sleep view for date range” including: canonical sleep facts (from dailyFacts or events) **and** Oura vendor snapshot when the source is Oura. Contract: e.g. `SleepDayView { date, sourceId?, totalMinutes?, score?, contributors?, ... }`.
- **Screen contract and components:** `app/(app)/recovery/sleep.tsx` consumes the new contract; shows score, contributors, and detailed metrics; uses ModuleScreenShell and existing design system.

**Files/models/selectors:**

- New: **Oura sleep vendor snapshot** — schema, write path (from `performOuraPullNowCore` or shared core after we have the full sleep document), and read path (API or client hook).
- New: **Sleep screen data contract** — type/API for “sleep view for day(s)” including vendor snapshot when present.
- New or extend: **GET sleep view API** (or equivalent) that returns sleep for a day/range with vendor snapshot when from Oura.
- Edit: **ouraApi.ts** — when fetching sleep, retain full document (or score + contributors) for the snapshot write; keep existing `mapOuraSleepToIngestItem` for canonical.
- Edit: **app/(app)/recovery/sleep.tsx** — implement UI from contract (score, contributors, metrics).
- New: **lib/data or API** for “sleep view for recovery screen” (selector/hook that uses the new API/contract).

---

### 3.2 Readiness

**Exact data model Oli should preserve from Oura (API v2 daily_readiness):**

- **Vendor snapshot:**  
  `id`, `day`, `timestamp`, `score` (0–100), `contributors` (e.g. resting_heart_rate, hrv_balance, body_temperature, recovery_index, sleep, sleep_balance, previous_day_activity, activity_balance, etc. — align with Oura’s actual contributor keys). Optionally `temperature_deviation`, `temperature_trend_deviation` and other recovery-specific fields.
- **Canonical physiological facts:**  
  `rmssd_5min` / `rmssd_5min_balance` → HRV (already mapped to canonical hrv). Keep this; it feeds `DailyRecoveryFacts.hrvRmssd` and future baseline/deviation.

**Vendor snapshot vs canonical:**

- **Vendor snapshot:** Oura’s readiness `score` and `contributors`. Stored per day for the Readiness screen. Not the single source of truth for “recovery” across sources; used for “show what Oura shows.”
- **Canonical:** HRV (rmssd) and, when we add them, resting heart rate / other facts we derive or normalize. `DailyRecoveryFacts` already has `readinessScore` as an optional field; that can be populated from Oura’s score when the source is Oura, but the **full Oura experience** (contributors, labels) requires the snapshot.

**Why current HRV-only handling is insufficient:**

- Readiness in Oura is a **composite score + multiple contributors** (RHR, HRV balance, body temperature, recovery index, sleep, sleep balance, activity, activity balance). Showing only HRV does not match the Oura Readiness experience. We need the **score** and **contributors** to render an equivalent screen.

**What the Readiness screen in Oli needs to render:**

- Primary: **Readiness score** (0–100) for the selected day.
- Contributors: Same set Oura shows (RHR, HRV balance, temperature, recovery index, sleep, sleep balance, previous day activity, activity balance) with values/labels.
- Optional: temperature deviation, trend; link to Sleep when relevant.

**What’s new:**

- **Persist Oura readiness vendor snapshot:** For each daily_readiness document, store score + contributors + display fields (e.g. `users/{uid}/ouraVendor/readiness/{id}` or by day). Same pattern as sleep: dedicated store so the Readiness screen can query “Oura readiness for day X.”
- **API/selector for Readiness screen:** Contract for “readiness view for day(s)” including Oura score and contributors when present, plus canonical recovery (e.g. hrvRmssd) for non-Oura or fallback.
- **Screen contract and components:** `app/(app)/recovery/readiness.tsx` consumes it; shows score and contributors; uses existing shell and design system.

**Files/models/selectors:**

- New: **Oura readiness vendor snapshot** — schema, write path (from pull core when we have the full daily_readiness document), read path.
- New: **Readiness screen data contract** and API/hook for “readiness view for day(s).”
- Edit: **ouraApi.ts** — when fetching daily_readiness, retain full document (or score + contributors) for the snapshot write; keep `mapOuraReadinessToHrvItem` for canonical HRV.
- Edit: **app/(app)/recovery/readiness.tsx** — implement UI from contract.
- New: **lib/data or API** for “readiness view for recovery screen.”

---

## 4. Tier 2 implementation spec — raw-first ingestion for future insights

| Dataset | Canonicalize now? | Store as raw now? | Minimum safe implementation | Future Oli features |
|---------|-------------------|-------------------|-----------------------------|---------------------|
| **Activity** | Steps: yes (already). Rest: no. | Yes (daily_activity already fetched; steps mapped; extra in oura_raw if needed). | Keep current: steps → canonical; no new canonical. | Activity balance, trends, insights. |
| **Heartrate** | No | Yes (oura_raw). | Already implemented. | Recovery/RHR insights, trends. |
| **Workouts** | Yes (already) | Yes (we also have canonical workout). | Keep current. | Training load, activity balance. |
| **Sessions** | No | Yes (oura_raw). | Already implemented. | Guided session history, stress/recovery. |
| **Tags** | No | Yes (oura_raw). | Already implemented. | Context for days, insights. |
| **SpO2** | No | Yes (oura_raw). | Already implemented. | Sleep/breathing insights. |
| **Profile/personal/email** | No | Yes (oura_raw personal). | Already implemented. | Demographics, personalization. |

**Summary:** Tier 2 is already “raw-first” in the current implementation. No change required for the product pivot except to **not** prioritize canonicalizing or building screens for these until after Tier 1 (Sleep + Readiness) is product-complete.

---

## 5. Architecture recommendation

**Recommendation:** Introduce a **true Oura-specific vendor snapshot layer** for Sleep and Readiness, while **keeping** the existing manual-compatible provider transport for canonical sleep and HRV.

**Reasoning:**

- **Sleep:** We need to show Oura’s **sleep score** and **contributors**. Those are not part of the canonical sleep schema (which is duration, efficiency, latency, awakenings, isMainSleep). So we must store them separately as a **vendor snapshot**. Canonical sleep events from Oura should continue to be written with `provider: "manual"`, `sourceId: "oura"` so aggregation and dailyFacts stay correct; the **additional** snapshot is read-only for the Sleep screen.
- **Readiness:** Same. We need **readiness score** and **contributors**. HRV is already canonical; the rest of the Oura Readiness experience is not. So we add a **vendor snapshot** for readiness (score + contributors) and keep writing HRV as today.
- **Steps/activity:** Keeping current approach is fine: map Oura daily_activity to canonical steps where it fits; no need for an Oura-specific snapshot for activity for Tier 1.
- **Workouts:** Keep current: canonical workout from Oura; no vendor snapshot needed for product goal.
- **Raw-only datasets (session, tag, spo2, heartrate, personal):** Remain oura_raw. No vendor snapshot unless we later build a product feature that needs “Oura-native” display for one of them.

**Concrete shape:**

- **New store:** e.g. `users/{uid}/ouraVendor/sleep/{documentId}` and `users/{uid}/ouraVendor/readiness/{documentId}` (or by day if one-per-day). Schema: minimal stable fields (id, day, score, contributors, fetchedAt, and any display-safe fields). Written only from the Oura pull path when we have the full API response.
- **Canonical path unchanged:** Continue writing canonical sleep and hrv from Oura with provider manual, sourceId oura; no change to raw event kinds or normalization for those.
- **Separation of concerns:** Vendor snapshot = “what to show on Oura-equivalent screens.” Canonical = “what we use for dailyFacts, insights, and cross-source truth.”

---

## 6. Revised file plan

| Full path | Add/Edit | Purpose | Priority |
|-----------|----------|---------|----------|
| `services/api/src/lib/ouraApi.ts` | Edit | When mapping sleep/readiness, retain full API doc (or score + contributors) for snapshot write; keep existing ingest item mappers. | Tier 1 now |
| `services/api/src/lib/ouraVendorSnapshot.ts` (new) | Add | Write Oura sleep and readiness vendor snapshots (score, contributors) to Firestore; called from pull core after fetch. | Tier 1 now |
| `services/api/src/routes/integrations/ouraPullNow.ts` | Edit | After fetching sleep/readiness, call snapshot writer for each doc (in addition to existing canonical write). | Tier 1 now |
| `services/api/src/db.ts` | Edit | Add helpers for oura vendor snapshot collections (e.g. sleep, readiness per user). | Tier 1 now |
| `lib/contracts/ouraVendor.ts` (new) or in contracts | Add | Schema for Oura sleep snapshot and readiness snapshot (score, contributors, day, id). | Tier 1 now |
| API route or existing dayTruth/sleep/readiness | Add/Edit | GET (or equivalent) “sleep view” and “readiness view” for day/range that include vendor snapshot when source is Oura. | Tier 1 now |
| `app/(app)/recovery/sleep.tsx` | Edit | Consume sleep view contract; render score, contributors, detailed metrics (vendor-faithful). | Tier 1 now |
| `app/(app)/recovery/readiness.tsx` | Edit | Consume readiness view contract; render score, contributors (vendor-faithful). | Tier 1 now |
| `lib/data/useSleepView.ts` or similar (new) | Add | Hook that fetches sleep view for date/range (canonical + Oura snapshot). | Tier 1 now |
| `lib/data/useReadinessView.ts` or similar (new) | Add | Hook that fetches readiness view for date/range. | Tier 1 now |
| `services/functions/src/dailyFacts/` | Edit (optional) | If we want dailyFacts.recovery.readinessScore from Oura, optionally populate from snapshot; not required for screen if screen reads snapshot directly. | Tier 1 later |
| `lib/contracts/dailyFacts.ts` | Edit (optional) | Extend sleep/recovery DTO with optional vendor snapshot or sourceId for display. | Tier 1 later |
| Existing oura ingest/write/contracts for Tier 2 | — | No change for Tier 2; already raw-first. | Tier 2 (done) |

---

## 7. Revised rollout sequence

1. **Immediate next:**  
   - Add Oura **vendor snapshot** layer: schema, DB paths, and write from pull core for **sleep** and **readiness** (score + contributors).  
   - Do **not** change existing canonical sleep/HRV write path.  
   - Add **read** path for snapshots (API or client) so screens can consume them.

2. **Next after that:**  
   - Define **Sleep screen contract** (sleep view for day/range) and implement **Sleep screen** (score, contributors, metrics) using snapshot + canonical where needed.  
   - Define **Readiness screen contract** and implement **Readiness screen** (score, contributors) using snapshot + canonical where needed.

3. **Later / raw-only:**  
   - Keep Tier 2 as-is (no new canonicalization or screens).  
   - Any future use of activity, heartrate, sessions, tags, spo2, personal for insights or intelligence can read from existing raw/oura_raw.

---

## 8. Tests required for the revised plan

**Tier 1 tests**

- **Vendor snapshot write:** Given Oura API sleep/readiness responses (with score and contributors), assert we write the snapshot doc(s) with correct shape and id/day.
- **Vendor snapshot read:** API or selector returns sleep/readiness view for a day including snapshot when present.
- **Sleep screen:** Renders without error when snapshot exists; shows score and at least one contributor (or graceful empty state when no data).
- **Readiness screen:** Same.
- **Pull core:** Still writes canonical sleep and hrv; still updates lastSyncAt; snapshot write does not break pull (e.g. snapshot write failure is logged but does not fail the whole sync).
- **Regression:** Existing oura ingest tests, pull-now tests, and device/sync tests still pass.

**Tier 2 tests**

- Existing tests for Tier 2 (oura_raw, steps/workout from Oura, scheduled pull, callback) remain as-is. No new tests required for “raw-first” unless we add a new dataset.

---

## 9. Acceptance checklist

- [ ] **Sleep screen readiness:** Sleep screen shows Oura sleep score and key contributors (or clear empty state) when Oura data exists for the selected night; data comes from vendor snapshot and/or canonical as designed.
- [ ] **Readiness screen readiness:** Readiness screen shows Oura readiness score and key contributors (or clear empty state) when Oura data exists for the selected day; data comes from vendor snapshot and/or canonical as designed.
- [ ] **Background sync preserved:** Callback auto-sync, app focus/foreground refresh, and scheduled pull still run and update lastSyncAt; snapshot writes are part of the same flow without breaking it.
- [ ] **Raw ingestion preserved:** Tier 2 datasets (activity, heartrate, workouts, sessions, tags, spo2, personal) continue to be fetched and stored (canonical where applicable, oura_raw otherwise).
- [ ] **No regressions:** Existing Oura tests (OAuth, pull-now, ingest, devices, scheduler) pass; no manual Sync button; devices screen and last sync unchanged.

---

## 10. Final recommended Cursor execution prompt

Use the following prompt for the next implementation step:

---

**Mission:** Implement Tier 1 Oura product surfaces (Sleep and Readiness) so that Dash → Sleep and Dash → Readiness show Oura-equivalent, vendor-faithful experiences, while preserving all existing sync and raw ingestion.

**Constraints:**
- Do not break Oura OAuth, callback auto-sync, app focus/foreground refresh, or scheduled pull.
- Do not remove or change the existing canonical sleep and HRV write path from Oura.
- Do not reintroduce a manual Sync button.
- Keep Tier 2 (other Oura datasets) as raw-first; no new screens or canonicalization for them.

**Tasks (in order):**

1. **Oura vendor snapshot layer (Sleep + Readiness)**  
   - Add a Firestore store for Oura vendor snapshots: e.g. `users/{uid}/ouraVendor/sleep/{id}` and `users/{uid}/ouraVendor/readiness/{id}` (or by day).  
   - Schema: for sleep — `id`, `day`, `score` (0–100), `contributors` (object), and any display-safe fields from the Oura sleep API response; for readiness — same for daily_readiness (`score`, `contributors`).  
   - In `performOuraPullNowCore`, after fetching sleep and daily_readiness, write these snapshot docs (in addition to existing canonical sleep and hrv writes). Use the full API document or extract score + contributors; do not change existing `mapOuraSleepToIngestItem` or `mapOuraReadinessToHrvItem` for the canonical path.  
   - Add an API or client-accessible read path that returns “sleep view” and “readiness view” for a given day (or range) including vendor snapshot when present.

2. **Sleep screen**  
   - Define a contract (type/API) for “sleep view for day(s)” (canonical sleep facts + Oura snapshot when from Oura).  
   - Implement `app/(app)/recovery/sleep.tsx` to fetch and display: Oura sleep score, key contributors (total sleep, efficiency, restfulness, latency, REM, deep, timing or Oura’s exact set), and detailed metrics. Use ModuleScreenShell; show empty state when no data.

3. **Readiness screen**  
   - Define a contract for “readiness view for day(s)” (canonical recovery + Oura snapshot when from Oura).  
   - Implement `app/(app)/recovery/readiness.tsx` to fetch and display: Oura readiness score and key contributors (RHR, HRV balance, temperature, recovery index, sleep, sleep balance, activity, activity balance or Oura’s exact set). Use ModuleScreenShell; show empty state when no data.

4. **Tests**  
   - Add tests for vendor snapshot write (shape and id/day).  
   - Add tests for sleep/readiness view read path.  
   - Add regression tests ensuring pull core still writes canonical sleep and hrv and updates lastSyncAt when snapshot write is present.  
   - Ensure existing Oura tests (OAuth, pull-now, ingest, devices) still pass.

5. **Verification**  
   - Run typecheck, lint, tests, and check:invariants.  
   - Confirm no manual Sync button and devices/last sync behavior unchanged.

**Out of scope for this prompt:**  
- Tier 2 datasets (no new screens or canonicalization).  
- Changes to gateway or scheduler config.  
- Backfill of historical vendor snapshots (can be a follow-up).

Execute the above in order. Prefer minimal, production-safe changes. Preserve the HealthOS Great Code Standard and existing Oura sync behavior.
