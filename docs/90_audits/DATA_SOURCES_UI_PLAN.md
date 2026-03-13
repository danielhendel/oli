# Data Sources UI Plan

## 1. Screen Flow

### Routes / screens

| Route | Screen | Purpose |
|-------|--------|---------|
| `/(app)/settings/data-sources` | Data Sources Home | List connected sources + metrics with preferred source; entry from Settings. |
| `/(app)/settings/data-sources/source/[sourceId]` | Connected Source Detail | Single source: status, metrics it provides, connect/disconnect, sync. |
| `/(app)/settings/data-sources/metric/[metricId]` | Metric Source Picker | Choose one preferred source for a single metric. |

- **Exact paths (file-based):**
  - `app/(app)/settings/data-sources/index.tsx` → Data Sources Home
  - `app/(app)/settings/data-sources/source/[sourceId].tsx` → Connected Source Detail
  - `app/(app)/settings/data-sources/metric/[metricId].tsx` → Metric Source Picker

- **Stack registration:** Add `Stack.Screen` entries in `app/(app)/_layout.tsx` for the two dynamic screens (or rely on Expo Router file-based discovery for `data-sources/source/[sourceId]` and `data-sources/metric/[metricId]`). If headers are desired, register with titles like "Data source" and "Source for [metric label]".

### Navigation sequence

1. **Settings** → tap "Data sources" → **Data Sources Home**
2. **Data Sources Home** → tap a connected source row → **Connected Source Detail** (with `sourceId` in route)
3. **Data Sources Home** → tap a metric row (“Source: X” or “Choose source”) → **Metric Source Picker** (with `metricId` in route)
4. **Metric Source Picker** → select a source → persist preference → **back** to Data Sources Home (or optionally to Manage / metric detail)
5. **Connected Source Detail** → “Disconnect” or “Sync” → stay or back to Home
6. **Connected Source Detail** → tap a metric this source provides → **Metric Source Picker** (same screen, with `metricId`; optional shortcut)

- **Back behavior:** Standard stack back from Detail and Picker returns to Data Sources Home. From Home, back goes to Settings.

---

## 2. Data Sources Home

### Top-to-bottom layout

1. **Header**  
   - Title: **Data sources**  
   - Subtitle: e.g. “Choose where each metric comes from. Raw history is kept for all sources.”

2. **Connected sources section**  
   - Section title: **Connected sources** (or **Devices & connections**)  
   - List of sources that can provide data (from integration status + static list of known sources).  
   - Each row:  
     - **Source name** (e.g. Withings, Apple Health, Manual, Labs, Upload, DEXA when supported)  
     - **Status** (Connected / Not connected / Unavailable)  
     - **Chevron** → navigates to **Connected Source Detail** for that `sourceId`  
   - “Manual” and “Upload” are always “available”; Withings/Apple Health show real connection status from existing APIs (`getWithingsStatus`, Apple Health status).  
   - Optional: “Connect [source]” for disconnected sources that support OAuth (e.g. Withings) → can deep-link to existing connect flow or to Detail screen that shows “Connect” CTA.

3. **Metric sources section**  
   - Section title: **Source for each metric** (or **Metric sources**)  
   - Copy: “One preferred source per metric. This affects which value is shown in your record when multiple sources have data for the same day.”  
   - List of **metrics** that support source assignment. Use the same **health category language and metric IDs as Manage** (Body & structural, Cardiovascular, Sleep & circadian, etc.).  
   - Grouping (optional but recommended): by **Manage category** (e.g. Body & structural, Cardiovascular, Sleep & circadian, Nutrition & metabolism, Recovery & autonomic, Labs & biomarkers, Imaging & documents, etc.).  
   - Each metric row:  
     - **Metric label** (same as Manage: e.g. Weight, Body fat, Sleep duration, Steps, HRV, Lab results, Uploads)  
     - **Current preferred source** (e.g. “Withings”, “Manual”, “Not set”)  
     - **Chevron** → **Metric Source Picker** for that `metricId`  
   - Only show metrics that are **supported now** in Manage (`supportedNow: true`) plus a small set of “coming soon” if desired (e.g. Labs, DEXA) so users can set preference in advance. Avoid listing every Manage metric that has `supportedNow: false` unless product wants to expose them.

4. **Footer / clarification**  
   - Short line: “Raw data from all sources is kept. Changing the preferred source only changes which value is used for your daily record and insights.”

### Data

- **Connected sources:** From existing hooks/APIs (Withings status, Apple Health status); plus static entries for Manual, Upload, Labs, and (when applicable) DEXA. No new backend for “list of source definitions”; use a client-side config of known `sourceId`s and display names.
- **Metric list:** Derive from the same **MANAGE_METRIC_MAP** (or a shared constant) used by Manage: use `id` as `metricId`, `label` for display, filter by `supportedNow === true` (and optionally include a few key “coming soon” metrics). Ensures one source of truth for labels and IDs.
- **Preferred source per metric:** Read from data-source preferences (audit: extend preferences or dedicated endpoint). If no preference for a metric, show “Not set” and apply smart defaults only when displaying (or persist defaults on first load—see Smart Defaults).

---

## 3. Connected Source Detail

### Layout

- **Header:** Source display name (e.g. Withings, Apple Health, Manual).
- **Status card:**  
  - Connected / Not connected / Unavailable / Error.  
  - For Withings: last sync or last error from existing status API.  
  - For Apple Health: last sync from existing storage/API.  
  - For Manual / Upload / Labs: no “connection” state; show short description of how data is added.
- **Metrics this source provides:** List of metrics (by metric ID + label, same as Manage) that this source can supply. For Withings: Weight, Body fat. For Apple Health: Steps, Workouts (and any other mapped kinds). For Manual: all supported metrics. For Labs: Lab results. For Upload: Uploads (and future DEXA/lab PDFs if applicable). For DEXA: Bone density / DEXA when supported.
- **Actions:**  
  - **Connect** / **Disconnect** (for OAuth sources): use existing integration routes; no new backend.  
  - **Sync now** (e.g. Withings “Update”): use existing `postWithingsPullNow`; show loading and result.  
  - **Revoke** (Withings): use existing revoke flow.
- **Metadata (displayed):**  
  - Connected at (if available from integration doc).  
  - Last sync / last error (from status).  
  - Do not expose tokens or raw config; keep to user-facing status only.

### Behavior

- If user opens Detail for a source that is not yet connected (e.g. Withings) and the app supports connect from here: show “Connect Withings” CTA that starts OAuth (reuse same flow as Devices/weight screen).  
- “Disconnect” clears connection and optionally shows that raw history from that source is preserved.

---

## 4. Metric Source Picker

### Layout

- **Header:** “Source for [Metric label]” (e.g. “Source for Weight”, “Source for Sleep duration”). Use Manage metric label from shared config.
- **Short explanation:** “Choose which source to use when multiple sources have data for this metric for the same day.”
- **Source options:** Single-select list. Each row:  
  - **Source name** (Withings, Apple Health, Manual, Labs, Upload, DEXA when relevant).  
  - **Availability:** Only show sources that **can** provide this metric (e.g. for Weight: Withings, Manual; for Steps: Apple Health, Manual; for Lab results: Labs, Upload; for Bone density: DEXA when supported, Upload).  
  - **Radio or checkmark** for current selection.  
  - Tapping a row sets that source as preferred and persists (then back or stay with success state).
- **“Not set” / Default:** One option can be “Use default” (or “Not set”) so the app uses smart-default behavior instead of a stored preference.

### Source options (per metric)

- **Weight:** Withings, Manual. (Apple Health can provide weight in future; add when backend supports it.)
- **Body fat:** Withings, Manual.
- **Sleep duration:** Apple Health, Manual (and Oura when added).
- **Steps:** Apple Health, Manual.
- **Activity minutes:** Apple Health, Manual.
- **HRV:** Apple Health, Manual (and Oura when added).
- **Workouts:** Apple Health, Manual.
- **Strength (workouts, sets, reps, volume):** Manual only (today).
- **Nutrition:** Manual only (today).
- **Lab results:** Labs (manual entry / structured), Upload (lab PDFs when parsing exists).
- **Uploads:** Upload only.
- **Bone density / DEXA:** DEXA (when supported), Upload (reports).  
Filter the list so only **possible** sources for that metric are shown; disable or hide the rest.

### Selection logic

- **One preferred source per metric:** Selecting source A overwrites preference for that `metricId` to A. Persist via extended preferences or dedicated API (audit: GET/PUT data-source preferences or preferences extension).  
- **Raw history:** No deletion or merge. Clarify in UI that “Changing source only affects which value is used for your record; past data from other sources remains.”

---

## 5. Smart Defaults

Default assignment when **no** stored preference exists (so first-time and “Not set” behave the same):

| Source | Default assignment behavior |
|--------|-----------------------------|
| **Withings** | If connected: prefer Withings for **Weight** and **Body fat**. If not connected, those metrics default to Manual. |
| **Oura** | Not in repo yet. When added: if connected, prefer Oura for **Sleep duration** and **HRV**; otherwise Manual (or Apple Health for HRV if connected). |
| **Apple Health** | If connected (and we have data): prefer Apple Health for **Steps**, **Activity minutes**, **Workouts**, and (when mapped) **Sleep** and **HRV**. Otherwise Manual. |
| **Labs** | Prefer **Labs** (structured lab entry) for **Lab results** when user has at least one lab result; otherwise no default or “Labs” as default for that metric. |
| **DEXA** | When supported: prefer **DEXA** for **Bone density / DEXA** if user has DEXA data; else **Upload** for reports. |
| **Manual** | Default for any metric that has no connected device/source, or when user chooses “Not set”. Manual is always an available fallback for every supported metric. |
| **Upload** | Default for **Uploads** (file count / latest upload). For **Lab results**, “Upload” can be second option (lab PDFs). For **DEXA reports**, Upload when DEXA integration is not available. |

- **Priority when multiple sources are connected:** Apply defaults in a fixed order (e.g. Withings > Manual for weight; Apple Health > Manual for steps) so “first-time” experience is deterministic.  
- **Persistence:** Smart defaults are **not** written to preferences until the user explicitly selects a source in the Picker (or we do a one-time “apply defaults” write—product decision). Until then, Home and Picker show “Not set” and the pipeline/display layer applies defaults at read time.

---

## 6. File-Level Plan

### Files to create

- `app/(app)/settings/data-sources/index.tsx` — Data Sources Home screen.
- `app/(app)/settings/data-sources/source/[sourceId].tsx` — Connected Source Detail screen (dynamic route).
- `app/(app)/settings/data-sources/metric/[metricId].tsx` — Metric Source Picker screen (dynamic route).
- Shared **metric/source config** used by Manage and Data Sources (optional but recommended): e.g. `lib/metrics/dataSourcesConfig.ts` or extend existing `lib/metrics/` with:
  - List of metric IDs that support source assignment (subset of Manage metric IDs).
  - For each metric: label (same as Manage), list of possible `sourceId`s.
  - List of known sources: `sourceId`, displayName, supportsConnect, statusApi (if any).  
  This avoids duplicating MANAGE_METRIC_MAP in Data Sources and keeps labels/categories aligned.

### Files to modify

- **Settings entry:** `lib/modules/moduleSectionRoutes.ts` — Add section `{ id: "settings.dataSources", moduleId: "settings", title: "Data sources", href: "/(app)/settings/data-sources" }`.  
- **Settings Home:** `app/(app)/settings/index.tsx` — No change if sections are driven by `getModuleSections("settings")`; the new section will appear automatically once added to MODULE_SECTIONS.  
- **App layout:** `app/(app)/_layout.tsx` — Register Stack screens for `settings/data-sources`, `settings/data-sources/source/[sourceId]`, and `settings/data-sources/metric/[metricId]` if you want custom titles; otherwise Expo Router file-based routes may suffice.  
- **Readiness (optional):** `lib/modules/moduleReadiness.ts` — Add `settings.dataSources` case if you use readiness/badges for settings sections.

### What can be reused

- **Integration status:** `useWithingsPresence`, `getWithingsStatus`, Withings connect/revoke/pull-now from `lib/api/withings.ts` and existing integration routes; Apple Health status from `lib/api/appleHealth.ts` and `lib/integrations/appleHealth/storage.ts`.  
- **Settings shell:** `ModuleScreenShell`, `ModuleSectionLinkRow`, section title style from `app/(app)/settings/index.tsx`.  
- **Metric labels and IDs:** Manage’s `MANAGE_METRIC_MAP` (or a shared constant extracted from it) so Data Sources uses the same `id` and `label` and `supportedNow`.  
- **Weight screen pattern:** Withings chip and “Source: X” badge pattern from `app/(app)/body/weight.tsx` can inform a small **SourceBadge** or **PreferredSourceChip** component for the metric list (optional).  
- **Preferences:** Existing `getPreferences` / `updatePreferences` (or new get/put data-source preferences) from `lib/api/preferences.ts`; extend contract in `lib/contracts/preferences.ts` when adding `dataSources` (or use a separate API module for data-source preferences).  
- **Devices / connect flow:** `app/(app)/settings/devices.tsx` and Withings OAuth flow; Data Sources Detail can link to or embed the same connect flow for “Connect Withings” instead of duplicating.

---

## 7. Build Order

### First slice (MVP)

- **Backend/contract:** Extend preferences (or add dedicated endpoint) with `dataSources: { [metricId]: preferredSourceId }` and GET/PUT. No pipeline change yet; UI just reads/writes preference.  
- **Shared config:** Add `lib/metrics/dataSourcesConfig.ts` (or equivalent): metric IDs that support source assignment, labels aligned with Manage, and possible sources per metric; known sources list with display names and status hooks.  
- **Data Sources Home:** Single screen under Settings: “Connected sources” (static list with Withings + Apple Health status from existing APIs, plus Manual, Upload, Labs); “Metric sources” (list of metrics with “Current source: Not set” or placeholder). Tapping a source row goes to Detail; tapping a metric row goes to Picker.  
- **Metric Source Picker:** One metric, one screen: list of allowed sources for that metric, single-select, persist to data-source preferences, then back.  
- **Connected Source Detail:** Withings-only first: status, “Sync now”, “Disconnect”, list of metrics it provides (Weight, Body fat). Reuse existing status and actions.  
- **Settings entry:** Add “Data sources” to settings sections and one Stack.Screen for the data-sources stack so navigation works.

**Outcome:** User can open Data Sources from Settings, see connected sources (Withings/Apple Health + static), open Withings detail and sync/disconnect, and set preferred source for Weight (and optionally Body fat) via Picker. Preferences persist; pipeline still “last trigger wins” until next slice.

### Second slice

- **Pipeline (backend):** Implement source-aware body aggregation for weight (and body fat): when recomputing dailyFacts for a day, load all weight raw events for that day, apply user preferred source for `weight` / `body_fat_percent`, then pick latest by `observedAt` within that source. Requires reading raw events by kind+day in recompute and extending preferences read in pipeline.  
- **Data Sources Home:** Show real “Current source” per metric from stored preferences + smart defaults.  
- **Metric Source Picker:** Show “Use default” option; apply smart defaults for Withings/Apple Health when no preference is set.  
- **Connected Source Detail:** Add Apple Health (status, metrics it provides, link to connect/sync in Workouts). Add Manual and Upload as read-only “sources” (no connect/disconnect).  
- **Optional:** Source badge on Body/weight screen that reflects preferred source and links to Data Sources (e.g. “Source: Withings” tappable → Data Sources or Picker for weight).

**Outcome:** Preferred source for weight (and body fat) actually changes which value is used in daily record. Home and Picker feel complete for body + a few metrics. Defaults applied when “Not set”.

### Later phases

- **More metrics:** Extend source-aware logic to sleep, steps, HRV, workouts (canonical events + sourceId); add those metrics to Picker and Home.  
- **Labs / Upload / DEXA:** Add Labs and Upload as selectable sources in Picker for lab results and uploads; when DEXA is supported, add DEXA source and Bone density metric.  
- **Oura (when in repo):** Add Oura to connected sources and to Picker for sleep/HRV; add smart default.  
- **Manage integration:** On Manage metric detail or list, show “Source: X” and link to Data Sources or directly to Metric Source Picker for that metric.  
- **Raw history UX:** Optional “View raw history” from Detail or from Library filtered by sourceId so users can see that data from all sources is preserved.

---

No code is written in this plan; it is a concrete UI/screen and file plan that fits the current app structure and the Data Sources audit.
