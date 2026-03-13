# Oura Integration Repo Audit + Architecture Plan

**Scope:** Repo-truth audit only. No code changes. No assumptions that Oura behaves like Apple Health or Withings unless verified in repo.

---

## 1. Executive Summary

**What repo truth supports today:**
- **Devices** is the canonical integration management surface: Settings → Devices lists Withings and Apple Health as hardcoded rows; each links to a detail screen at `settings/devices/[deviceId]` (today only `withings` and `apple_health` are handled; unknown deviceId shows "Unknown device").
- **Data Sources** is the metric-to-source assignment surface: config in `lib/metrics/dataSourcesConfig.ts` defines `SLICE_1_SOURCE_IDS`, `SLICE_1_METRICS`, `METRIC_ALLOWED_SOURCES`, `SOURCE_PROVIDES_METRICS`, and `SOURCE_DISPLAY_NAMES`. Preferences store `metricSources` (metricId → sourceId); API and PreferencesProvider support get/update.
- **Source-aware aggregation** exists only for **body**: `loadBodyFactsFromRawForDay` + `selectBodyFactsForDay` use `preferences.metricSources.weight` and `preferences.metricSources.body_fat_percent` to pick one source per metric per day from raw weight events. Sleep, HRV, steps, and activity are **not** source-aware; they are aggregated from canonical events only (no preference-based selection).
- **Normalization** in `mapRawEventToCanonical` accepts only `provider === "manual"`. Withings weight is written with `provider: "manual"` (pull/pullNow) or `provider: "withings"` (backfill); fact-only kind `weight` does not produce canonical events and triggers derived-truth recompute. Apple Health client sends `provider: "apple_health"`; the mapper rejects it (UNSUPPORTED_PROVIDER), so Apple Health raw events do not currently produce canonical events via this path (failure records would be written).

**What Oura can safely do now (before backend ingestion):**
- Be added to **Devices** as a third row with a detail route `settings/devices/oura` (or reuse `[deviceId]` with id `oura`) once a minimal Oura connection/status API exists or a placeholder "Connect" flow is defined.
- Be added to **Data Sources** config (`SLICE_1_SOURCE_IDS`, `SOURCE_DISPLAY_NAMES`, `SOURCE_PROVIDES_METRICS`, and for any metric where Oura is allowed, `METRIC_ALLOWED_SOURCES`) so the source appears in the list and can be chosen as preferred for metrics—with the caveat that **only body metrics** (weight, body_fat_percent) currently use that preference in aggregation; sleep/HRV/steps/activity would store the preference but aggregation would not yet select by source.
- Use the same **preferences** contract: `metricSources` is already a free-form record (metricId → sourceId); no schema change needed to store "oura" as a preferred source.

**Biggest architectural risk:**
- Adding Oura to Data Sources and Devices **without** backend ingestion or normalization support would create a "connected but no data" experience and user confusion. A larger risk is extending source-aware aggregation to sleep/HRV/readiness without a clear pipeline (raw → canonical or raw → dailyFacts) for Oura, leading to drift between "Oura as preferred source" and "no Oura data in dailyFacts."

---

## 2. Current Devices / Data Sources Architecture

### Routes

| Route | File | Purpose |
|-------|------|--------|
| `/(app)/settings` | `app/(app)/settings/index.tsx` | Settings home; sections from `getModuleSections("settings")` (moduleSectionRoutes). |
| `/(app)/settings/devices` | `app/(app)/settings/devices.tsx` | Devices list: hardcoded Withings + Apple Health rows; links to `/(app)/settings/devices/withings` and `/(app)/settings/devices/apple_health`. |
| `/(app)/settings/devices/[deviceId]` | `app/(app)/settings/devices/[deviceId].tsx` | Device detail. `DeviceId` type is `"withings" \| "apple_health"`; unknown shows "Unknown device." Withings: connect/disconnect, metrics list, backfill hint. Apple Health: status, last sync, metrics list, "Manage in Devices" only. |
| `/(app)/settings/data-sources` | `app/(app)/settings/data-sources/index.tsx` | Data Sources home: "Connected sources" from `SLICE_1_SOURCE_IDS`; "Source for each metric" from `SLICE_1_METRICS` (grouped). Status from `getSourceStatus(sourceId, withingsConnected, appleHealthStatus)` (hardcoded switch). |
| `/(app)/settings/data-sources/source/[sourceId]` | `app/(app)/settings/data-sources/source/[sourceId].tsx` | Source detail: title/status/description/metrics from config; for withings/apple_health, "Manage in Devices" CTA. Status/description are hardcoded switch on `sourceId`. |
| `/(app)/settings/data-sources/metric/[metricId]` | `app/(app)/settings/data-sources/metric/[metricId].tsx` | Metric source picker: `getAllowedSourcesForMetric(metricId)` from config; persists via `setMetricSourcePreference(metricId, sourceId)`. |

Settings sections are defined in `lib/modules/moduleSectionRoutes.ts` (`settings.devices`, `settings.dataSources`). Readiness in `lib/modules/moduleReadiness.ts` marks both ready. Layout: `app/(app)/_layout.tsx` registers `settings/devices` and `settings/devices/[deviceId]` with Stack.

### Ownership

- **Devices:** Integration lifecycle (connect, disconnect, status). Withings: OAuth + status API + storage (lastKnownConnected, lastCheckedAt); Apple Health: status API (server reads rawEvents by provider) + local storage (connected, lastSyncAt, etc.). No shared "device registry"; each device is a separate block of logic.
- **Data Sources:** Metric-to-source assignment and display. Single source of truth: `lib/metrics/dataSourcesConfig.ts`. Data Sources screens and metric picker are config-driven; status/description for each source are still switch-based in the Data Sources source-detail screen.

### Where Oura should fit

- **Devices:** Add a third row (e.g. "Oura") linking to `/(app)/settings/devices/oura`. Reuse `[deviceId].tsx` with `deviceId === "oura"`: add `isOura` and handle title, status, copy, "Metrics this device provides," and connect/disconnect or placeholder CTA. Alternatively, introduce a small device registry (id, label, route) so Devices list is data-driven; today it is hardcoded.
- **Data Sources:** Add `"oura"` to `SLICE_1_SOURCE_IDS` and corresponding entries in `SOURCE_DISPLAY_NAMES`, `SOURCE_PROVIDES_METRICS`, and (for each metric Oura will provide) `METRIC_ALLOWED_SOURCES`. Add `oura` to `getSourceStatus` and to the source-detail `statusLine`/`description` switch (or refactor to a config-driven status/description map).
- **Route structure:** Oura should use the same pattern: list entry → `settings/devices/oura` for device detail; Data Sources → `settings/data-sources/source/oura` for source detail. No new route types required.

---

## 3. Current Integration Pattern Audit

### Withings pattern

- **API** (`lib/api/withings.ts`): `getWithingsStatus`, `getWithingsConnectUrl`, `postWithingsRevoke`, `postWithingsPullNow`, `pullWithings` (admin). All authed via `lib/api/http` / validate. Status and connect URLs from backend.
- **Data** (`lib/data/useWithingsPresence.ts`): Uses `getWithingsStatus` from `lib/api/usersMe` (includes backfill in response). Optionally `getRawEvents` with `WITHINGS_WEIGHT_KIND` and `WITHINGS_SOURCE_ID` to compute `lastMeasurementAt` / `hasRecentData`. Writes `setWithingsLastKnownConnected` for list hydration.
- **Storage** (`lib/integrations/withings/storage.ts`): AsyncStorage keys for lastCheckedAt, lastKnownConnected. No other Withings-specific modules under `lib/integrations/withings`.
- **Backend write:** Withings data is written by backend (withingsPullNow, withingsPull, withingsBackfill): raw events with `sourceId: "withings"`, `sourceType: "withings"`, `provider: "manual"` (pull/pullNow) or `provider: "withings"` (backfill). Kind `weight`; payload with time, timezone, weightKg, bodyFatPercent. Fact-only: no canonical event; trigger runs `recomputeDerivedTruthForDay` with body from raw.
- **Devices UI:** devices.tsx and [deviceId].tsx use `useWithingsPresence()`, Withings-specific connect/disconnect handlers, and hardcoded copy/metrics.

### Apple Health pattern

- **API** (`lib/api/appleHealth.ts`): Only `getAppleHealthStatus(idToken, opts)` → connected, lastSyncAt. No connect URL (permissions and sync are client-driven).
- **Storage** (`lib/integrations/appleHealth/storage.ts`): lastSyncAt, lastCheckedAt, connected, notAvailable.
- **Sync** (`lib/integrations/appleHealth/runAnchoredWorkoutsSync.ts`): Client pulls from HealthKit, then calls `ingestRawEvent` with `provider: "apple_health"`, `sourceId: "healthkit"`, kinds `steps` and `workout`. Payloads match manual shapes (start, end, timezone, etc.). Normalization currently rejects `provider !== "manual"`, so these raw events do not produce canonical events via the mapper (they would hit UNSUPPORTED_PROVIDER and write failure records unless the backend has been extended).
- **Devices UI:** devices.tsx and [deviceId].tsx use `getAppleHealthStatus` and local storage for status; no OAuth; "Manage in Devices" and last sync text.

### What Oura should reuse

- **Withings-style** for **connection lifecycle** if Oura has OAuth: backend endpoints for status, connect URL, revoke; client opens URL, callback updates state; a presence hook (e.g. `useOuraPresence`) and storage for lastKnownConnected/lastCheckedAt so the Devices list can show On/Off without a round-trip. Withings also has pull-now/backfill; Oura would need an analogous ingestion path (backend or client-initiated).
- **Apple Health–style** for **status-only** if Oura is "connected when we have a token or linked account" with no in-app OAuth: status API + local storage; sync could be backend-driven (e.g. cron) or a "Sync now" that triggers backend pull.
- **Shared:** Both use the same Devices list/detail layout (row → detail with status, copy, metrics list). Both appear in Data Sources from the same config (SOURCE_*). Preference storage is generic (metricSources). So: **device row + detail screen pattern** (Withings/Apple Health), **config-driven Data Sources** (add oura to config and status/description logic), and **no new preference schema** for Oura.

### Integration concerns: shared vs duplicated

- **Duplicated:** Status is fetched and stored per integration (Withings: useWithingsPresence + storage; Apple Health: getAppleHealthStatus + storage). Devices list and Data Sources source-detail both need status → two places that know "how to get Withings/Apple Health status." Source-detail has its own `getSourceStatus` and a long switch for statusLine/description.
- **Shared:** dataSourcesConfig (single list of sources and metrics); preferences API (metricSources); Devices layout (row + chevron + status text); metric picker (getAllowedSourcesForMetric, setMetricSourcePreference). To add Oura cleanly, either (1) add a third block of status/copy in Devices and Data Sources, or (2) introduce a small "integration registry" (id, displayName, statusFn, description, metrics[]) and drive both screens from it.

---

## 4. Metric / Source Assignment Audit

### Current metricSources system

- **Contract** (`lib/contracts/preferences.ts`): `metricSources` is `z.record(z.string().min(1), z.string().min(1)).optional()`. Keys = metric IDs (e.g. weight, steps); values = sourceId (e.g. withings, manual). Absent key = not set / use default.
- **API** (`lib/api/preferences.ts`): `updateMetricSourcePreference(idToken, metricId, sourceId)` sends PUT /preferences with `metricSources: { [metricId]: sourceId }`. Backend merges into existing preferences (`services/api/src/routes/preferences.ts`).
- **Provider** (`lib/preferences/PreferencesProvider.tsx`): `setMetricSourcePreference(metricId, sourceId)` updates local state and calls `updateMetricSourcePreference(token, metricId, sourceId)`.
- **Data Sources config** (`lib/metrics/dataSourcesConfig.ts`): `SLICE_1_SOURCE_IDS`, `SOURCE_DISPLAY_NAMES`, `SLICE_1_METRICS` (id, label, group), `METRIC_ALLOWED_SOURCES` (per metric: which sourceIds can be chosen), `SOURCE_PROVIDES_METRICS` (per source: which metric IDs it provides). Metric picker uses `getAllowedSourcesForMetric(metricId)`; source detail uses `SOURCE_PROVIDES_METRICS[sourceId]`.

### Where Oura fits

- Add `"oura"` to `SLICE_1_SOURCE_IDS` and `SOURCE_DISPLAY_NAMES` (e.g. "Oura").
- For each metric Oura will provide in Slice 1, add `"oura"` to `METRIC_ALLOWED_SOURCES[metricId]` and add that metricId to `SOURCE_PROVIDES_METRICS.oura`. Repo truth does not define what Oura "natively" provides; product/API must define. Natural candidates from existing metrics: sleep_duration, hrv; optionally steps, activity_minutes if Oura provides them. Weight/body_fat_percent are not typical for Oura; do not add unless product confirms.
- No change to preferences schema or API; they already accept arbitrary metricId/sourceId.

### Which metrics already in Manage / Data Sources map to Oura

- From `SLICE_1_METRICS`: **sleep_duration**, **hrv** are the strongest fit (Oura is known for sleep and HRV/readiness). **steps**, **activity_minutes** may be provided by Oura; add only if ingestion is planned. **weight**, **body_fat_percent**: repo does not assign these to Oura; do not add without product confirmation.
- Manage (`app/(app)/(tabs)/manage.tsx`) uses `MANAGE_METRIC_MAP` with sources like `dailyFacts.body.weightKg`, `dailyFacts.recovery.hrvRmssd`, etc. It does not reference dataSourcesConfig; Data Sources is the assignment UI. So Oura’s appearance in Data Sources (and in metric picker for sleep_duration, hrv) is the main integration point; Manage will show dailyFacts once the pipeline fills them from the chosen source.

### What not to add until backend ingestion exists

- Do not add Oura to **METRIC_ALLOWED_SOURCES** for a metric unless there is a path for Oura data to reach raw events and then either canonical events or dailyFacts. Otherwise the user can select "Oura" but no Oura data will ever appear. Safe to add: Devices row + Data Sources source entry + source detail (with status "Not connected" or "Connect to sync") and optionally allow "Oura" in the picker for sleep_duration/hrv with a note that data will appear after sync.

---

## 5. Pipeline / Data Model Audit

### Raw events

- **Contract** (`lib/contracts/rawEvent.ts`): `rawEventKindSchema`: sleep, steps, workout, weight, hrv, nutrition, strength_workout, file, incomplete. `sourceId`, `provider`, `sourceType` are strings (flexible). Payloads are kind-specific; weight uses time, timezone, weightKg, bodyFatPercent. Sleep uses start, end, timezone, totalMinutes, efficiency, etc. HRV uses time, timezone, rmssdMs, sdnnMs, measurementType.
- **Ingestion gateway** (`services/api/src/types/events.ts`): `rawEventKindSchema` (no "file"; has "incomplete"). `rawEventProviderSchema = z.enum(["manual", "apple_health"])`. To accept Oura at ingest, add `"oura"` to this enum (or have Oura data written by backend only, not via POST /ingest).
- **Withings:** Writes weight raw events (backend). **Apple Health:** Client sends steps/workout with provider `apple_health`; gateway accepts; normalization rejects (mapper is manual-only).

### Canonical events

- **Mapper** (`services/functions/src/normalization/mapRawEventToCanonical.ts`): Only `provider === "manual"` is accepted. All other providers get `UNSUPPORTED_PROVIDER`. Fact-only kind: `weight` (no canonical event; trigger uses extractFactOnlyContext and recomputeDerivedTruthForDay). So: sleep, steps, workout, hrv from **manual** become canonical; weight is fact-only; file/incomplete are unsupported/memory-only.
- For Oura to flow through this mapper, either: (1) add support for `provider === "oura"` and define Oura payload shapes that map to existing canonical shapes (sleep, hrv, steps, etc.), or (2) write Oura raw events with `provider: "manual"` and `sourceId: "oura"` and payloads that match the manual payload schemas (then they would normalize without contract changes).

### dailyFacts

- **Schema** (`lib/contracts/dailyFacts.ts`): sleep (totalMinutes), activity (steps, distanceKm, moveMinutes, trainingLoad), recovery (hrvRmssd, hrvRmssdBaseline, hrvRmssdDeviation), body (weightKg, bodyFatPercent), nutrition, strength. No "readiness" or Oura-specific score in the contract.
- **Aggregation** (`services/functions/src/dailyFacts/aggregateDailyFacts.ts`): Builds from **canonical events** for sleep, activity, recovery, strength. **Body** is special: `buildBodyFacts(events)` is overridden by `factOnlyBody` when provided (from `loadBodyFactsFromRawForDay`). So body is source-aware (raw weight events + metricSources); sleep/activity/recovery are not—they merge all canonical events for the day.
- **loadBodyFactsFromRawForDay** (`services/functions/src/dailyFacts/loadBodyFactsFromRawForDay.ts`): Queries rawEvents where kind === "weight", then `selectBodyFactsForDay(events, preferences.metricSources)`. Only weight raw events are considered; sourceId is used to pick by preference.

### What Oura can populate now (without schema changes)

- **If Oura raw events are written** with existing kinds and payloads compatible with the mapper:
  - **Sleep:** kind `sleep`, payload matching manual sleep (start, end, timezone, totalMinutes, isMainSleep, etc.). If provider is supported (e.g. add "oura" and map Oura payload → same shape), or if written as provider "manual" + sourceId "oura", they would produce canonical sleep events and aggregate into dailyFacts.sleep.
  - **HRV:** kind `hrv`, payload with time, timezone, rmssdMs/sdnnMs. Same idea: support provider "oura" or write manual + sourceId "oura" → canonical hrv → dailyFacts.recovery.hrvRmssd.
  - **Steps/activity:** kind `steps` (and optionally workout). Same pattern.
- **Body (weight/body fat):** Only if product decides Oura provides weight; then weight raw events with sourceId "oura" would be selected by `selectBodyFactsForDay` when user sets metricSources.weight to "oura". No schema change.

### What would need new schema or new logic

- **Readiness / Oura-specific score:** dailyFacts has no readiness field. If Oura readiness is to be stored, either add a new dailyFacts field (and possibly a new raw/canonical kind) or store as a custom insight/signal. Defer until product defines.
- **Source-aware sleep/HRV/steps:** Today only body uses preferences.metricSources in aggregation. To "prefer Oura" for sleep or HRV when both Apple Health and Oura have data, the pipeline would need a `loadSleepFactsFromRawForDay` / `selectSleepFactsForDay` (and analogous for recovery/activity) that query raw events by kind and apply metricSources for that metric. That would be a new piece of pipeline logic, not just config.

### Minimal safe Slice 1 for Oura (pipeline view)

- **Backend:** Ingest Oura data into raw events (kind sleep, hrv; optionally steps). Either: (1) backend job that pulls from Oura API and writes raw events with `sourceId: "oura"` and `provider: "manual"` and payloads matching existing manual schemas (so current mapper works), or (2) add `provider: "oura"` and Oura-specific payload mapping in the mapper. Option (1) avoids mapper changes and reuses fact-only/canonical paths.
- **Aggregation:** For Slice 1, do **not** require source-aware sleep/HRV. Oura canonical events (if any) would be merged with others into dailyFacts; user can set "Oura" in Data Sources for display/expectation, but "prefer Oura when both have data" would require the new select*ForDay logic above. So minimal Slice 1 = Oura raw events → canonical (sleep, hrv) → existing aggregation; preference for "oura" stored and used only when source-aware aggregation is extended to those metrics, or for UI only (e.g. "Preferred source: Oura" with data still merged).

---

## 6. Recommended Oura Slice 1

### Exact minimal scope

- **Devices:** Add Oura as a device row linking to `settings/devices/oura`; [deviceId].tsx handles `deviceId === "oura"` with title "Oura", status (connected/not connected from a minimal status API or placeholder), short copy, and list of metrics Oura will provide (e.g. Sleep, HRV; optionally steps/activity). Connect/disconnect or "Connect" CTA as per product (OAuth vs account-link).
- **Data Sources:** Add `"oura"` to `SLICE_1_SOURCE_IDS`, `SOURCE_DISPLAY_NAMES`, and `SOURCE_PROVIDES_METRICS` (e.g. sleep_duration, hrv; optionally steps, activity_minutes if in scope). Add `"oura"` to `METRIC_ALLOWED_SOURCES` only for those metrics. Update Data Sources home and source-detail to show Oura and its status/description (config or switch).
- **Metric assignment:** Users can set preferred source "Oura" for sleep_duration, hrv (and any other metric added). Stored in existing metricSources; no backend change for preferences.
- **Pipeline (minimal):** Backend (or client) writes Oura data as raw events with existing kinds (sleep, hrv) and payloads compatible with current mapper. Prefer `provider: "manual"` + `sourceId: "oura"` so no mapper change. Then canonical events and dailyFacts will include Oura data; no source-aware selection for sleep/HRV in Slice 1 unless we add it.

### UI scope

- Devices: one new row + oura branch in [deviceId].tsx.
- Data Sources: config + status/description for "oura" in index and source/[sourceId].
- No new screens.

### Backend scope

- Oura connection/status (and optionally connect/revoke) endpoints; or placeholder that returns "not_connected" until OAuth/link exists.
- Ingestion path: Oura API → raw events (sleep, hrv; payloads matching manual). No change to normalization or aggregation for Slice 1 except ensuring provider/sourceId allow the events to flow (manual + oura).

### Metrics included in Slice 1

- **Provided by Oura in UI:** sleep_duration, hrv. Optionally steps, activity_minutes if product and ingestion support.
- **Not in Slice 1:** weight, body_fat_percent (unless product explicitly adds Oura for body). Readiness as a first-class metric (new field/kinds) deferred.

### Metrics deferred

- Readiness score (new schema/aggregation).
- Source-aware aggregation for sleep, HRV, steps (select*ForDay by metricSources) — defer until after Oura data flows and product prioritizes "prefer Oura over Apple Health" per metric.

---

## 7. File-Level Plan

### Keep (no change)

- `lib/contracts/preferences.ts` — metricSources already flexible.
- `lib/contracts/rawEvent.ts` — kinds and payloads sufficient for sleep/hrv; sourceId/provider are strings.
- `lib/contracts/dailyFacts.ts` — no Oura-specific field in Slice 1.
- `lib/preferences/PreferencesProvider.tsx` — already supports any metricId/sourceId.
- `lib/api/preferences.ts` — same.
- `services/api/src/routes/preferences.ts` — same.
- `app/(app)/settings/data-sources/metric/[metricId].tsx` — config-driven; just add oura to config.
- `app/(app)/_layout.tsx` — routes already cover devices and data-sources.
- `lib/modules/moduleSectionRoutes.ts` — no change (Devices / Data sources already exist).
- `lib/modules/moduleReadiness.ts` — no change.

### Modify

- **app/(app)/settings/devices.tsx** — Add third row for Oura; link to `/(app)/settings/devices/oura`. Optionally drive list from a small registry later.
- **app/(app)/settings/devices/[deviceId].tsx** — Extend `DeviceId` to include `"oura"`; add `isOura` branch for title, status, copy, metrics list, and connect/placeholder CTA. Reuse existing layout/styles.
- **app/(app)/settings/data-sources/index.tsx** — Include "oura" in source list (already from SLICE_1_SOURCE_IDS once added); extend `getSourceStatus` for `sourceId === "oura"` (e.g. from useOuraPresence or placeholder).
- **app/(app)/settings/data-sources/source/[sourceId].tsx** — Add `oura` to statusLine and description switch (or refactor to config-driven).
- **lib/metrics/dataSourcesConfig.ts** — Add `"oura"` to `SLICE_1_SOURCE_IDS`; add `SOURCE_DISPLAY_NAMES.oura`; add `SOURCE_PROVIDES_METRICS.oura` (e.g. ["sleep_duration", "hrv"]); add `"oura"` to `METRIC_ALLOWED_SOURCES` for sleep_duration, hrv (and optionally steps, activity_minutes).

### Create

- **lib/api/oura.ts** (or equivalent) — Minimal: getOuraStatus (and optionally connect URL, revoke) when backend exists. Placeholder can return not_connected.
- **lib/data/useOuraPresence.ts** (optional) — If status is async: mirror useWithingsPresence pattern (status, refetch, lastKnownConnected). Requires backend status endpoint.
- **lib/integrations/oura/storage.ts** (optional) — If we cache connection state (e.g. lastKnownConnected) for list hydration.
- **services/api** — Oura status (and connect/revoke if OAuth) routes when product is ready. Not in "create" for UI-only Slice 1.
- **services/functions or api** — Oura ingestion (write raw events from Oura API) when product is ready.

### Defer

- **mapRawEventToCanonical** — No change if Oura writes with provider "manual" + sourceId "oura". If we later want provider "oura", add branch and Oura payload mapping.
- **selectBodyFactsForDay** — No Oura-specific logic; body selection already uses metricSources; add Oura only if we allow Oura for weight/body_fat.
- **selectSleepFactsForDay / selectRecoveryFactsForDay** — New pipeline logic; defer until source-aware sleep/HRV is required.
- **dailyFacts schema** — No readiness or Oura-specific field in Slice 1.
- **Manage** — No change for Slice 1; it reads dailyFacts; once pipeline fills from Oura, data will appear.
- **Recovery/sleep/readiness screens** — No Oura-specific UI in Slice 1 beyond Data Sources and Devices.

---

## 8. Architecture Risks / Cleanup Needs

### Duplication

- **Status and copy:** Withings and Apple Health each have their own status fetch, storage, and hardcoded copy in Devices and in Data Sources source-detail. Adding Oura the same way adds a third copy. Risk: every new device requires edits in devices.tsx, [deviceId].tsx, data-sources index, and source/[sourceId].tsx. Mitigation: introduce a small device/source registry (id, label, statusKey or statusFn, description, metrics[]) and drive both Devices and Data Sources from it.
- **getSourceStatus:** Today a function with a big switch (withings, apple_health, manual, upload, labs). Adding oura is one more case; refactoring to a map or config would reduce drift.

### Drift

- **Config vs backend:** dataSourcesConfig defines what the UI shows; backend ingestion and normalization define what actually flows. Adding "oura" to config before ingestion exists creates "Oura selected but no data." Mitigation: add Oura to Devices and Data Sources only when at least a status (or placeholder) exists; add to METRIC_ALLOWED_SOURCES only when ingestion for that metric is planned.
- **Provider enum:** Gateway has `["manual", "apple_health"]`; mapper only accepts "manual". Withings writes "manual" or "withings." If we add "oura" to the gateway, we must either support it in the mapper or write Oura with provider "manual" and sourceId "oura".

### Centralization needs

- **Device/source registry:** Single list of integration ids with display name, status behavior, description, and metrics would keep Devices and Data Sources in sync and make adding Oura (and future devices) a single place.
- **Status resolution:** One place that, given sourceId, returns status (loading | connected | not_connected | error) and optional lastSyncAt, so both Devices list and Data Sources source-detail use the same truth.

---

## 9. Recommended Build Order

1. **Backend first (recommended):** Define Oura status endpoint (and connect/revoke if OAuth). Implement ingestion path: Oura API → raw events (sleep, hrv) with provider "manual", sourceId "oura", payloads matching existing schemas. Verify one day of Oura data appears in dailyFacts (sleep, recovery.hrvRmssd). Then add UI.
2. **UI-first (optional):** Add Oura to config and Devices/Data Sources UI with placeholder status ("Not connected" or "Connect"); add "oura" to allowed sources for sleep_duration and hrv. Users can select Oura; data appears only after ingestion is live. Clear in-app copy that "Data will appear after you connect and sync."
3. **Smallest correct execution order:** (1) Backend: status (or stub) + ingestion for sleep + hrv. (2) Config: add oura to dataSourcesConfig (SOURCE_*, METRIC_ALLOWED_SOURCES for sleep_duration, hrv). (3) Data Sources: oura in getSourceStatus and source-detail. (4) Devices: row + [deviceId] oura branch. (5) Optional: useOuraPresence + storage for list hydration.

---

## 10. Important Files

| Area | Path |
|------|------|
| Settings home | `app/(app)/settings/index.tsx` |
| Devices list | `app/(app)/settings/devices.tsx` |
| Device detail | `app/(app)/settings/devices/[deviceId].tsx` |
| Data Sources home | `app/(app)/settings/data-sources/index.tsx` |
| Source detail | `app/(app)/settings/data-sources/source/[sourceId].tsx` |
| Metric picker | `app/(app)/settings/data-sources/metric/[metricId].tsx` |
| Module routes | `lib/modules/moduleSectionRoutes.ts` |
| Module readiness | `lib/modules/moduleReadiness.ts` |
| Data Sources config | `lib/metrics/dataSourcesConfig.ts` |
| Preferences contract | `lib/contracts/preferences.ts` |
| Preferences provider | `lib/preferences/PreferencesProvider.tsx` |
| Preferences API (client) | `lib/api/preferences.ts` |
| Preferences API (server) | `services/api/src/routes/preferences.ts` |
| Withings API | `lib/api/withings.ts` |
| Apple Health API | `lib/api/appleHealth.ts` |
| Withings presence | `lib/data/useWithingsPresence.ts` |
| Withings storage | `lib/integrations/withings/storage.ts` |
| Apple Health storage | `lib/integrations/appleHealth/storage.ts` |
| Raw event contract | `lib/contracts/rawEvent.ts` |
| Retrieval contract | `lib/contracts/retrieval.ts` |
| DailyFacts contract | `lib/contracts/dailyFacts.ts` |
| Normalization mapper | `services/functions/src/normalization/mapRawEventToCanonical.ts` |
| Raw event trigger | `services/functions/src/normalization/onRawEventCreated.ts` |
| Aggregate daily facts | `services/functions/src/dailyFacts/aggregateDailyFacts.ts` |
| Body source selection | `services/functions/src/dailyFacts/selectBodyFactsForDay.ts` |
| Load body from raw | `services/functions/src/dailyFacts/loadBodyFactsFromRawForDay.ts` |
| Recompute pipeline | `services/functions/src/pipeline/recomputeForDay.ts` |
| Ingestion gateway types | `services/api/src/types/events.ts` |
| Metric display | `lib/metrics/metricDisplay.ts` |
| Manage screen | `app/(app)/(tabs)/manage.tsx` |
