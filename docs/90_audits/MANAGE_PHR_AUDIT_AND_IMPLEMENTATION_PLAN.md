# Manage Tab Audit + PHR Implementation Plan

**Source:** Repo-truth audit for Manage-as–Personal Health Record.  
**Date:** 2025-03-11.  
**Scope:** Manage tab only; no code produced. All claims verified against code.

---

## Critical product correction (supersedes “implemented-only” scope)

**Manage must represent the whole human health system, not just current app modules.** It is the world’s greatest personal health record: system-level, biologically organized, showing both tracked and **missing** parts of the record.

The **authoritative plan** for that direction is:

- **`docs/90_audits/MANAGE_PHR_FULL_HEALTH_RECORD_PLAN.md`**

That document defines:
1. **Full biological system categories** (14 categories that belong in the record by design).
2. **What repo supports today** (routes, hooks, data).
3. **Record state per category:** Implemented | Partial | **Missing** — with explicit “Not yet in app” for missing domains.

Manage should show **all** categories and label what is implemented, partial, or missing. Do **not** reduce Manage to only the modules currently in code. This file remains the repo-truth audit for *what exists*; the full health record plan is the product authority for *what Manage shows*.

---

## 1. Executive Summary

**What this means for Manage**  
Manage should function as the user’s **structured Personal Health Record (PHR)** inside Oli: a single place to see health domains, what data exists, what is missing, and where to drill in. It is a **category-based health record index**, not a quick-log or command center.

**What the current quick-actions approach gets wrong**  
The current Manage tab is a **quick-actions / logging launcher** (Today, Quick log, Log weight, Workouts). That treats Manage as a utility bar. It does not:
- Reflect the user’s health data model.
- Show availability, latest result, or missing state per domain.
- Act as a master index for “what do I have and what’s missing?”

**Best repo-truth direction**  
- **Repurpose Manage** into a **PHR-style category navigator**: one screen listing health categories (Body, Training, Nutrition, Recovery, Labs, Uploads, Failures) with **summary status** (latest value or “No data” / “View”) and **drill-in** to existing routes.
- **Reuse** existing routes, hooks, and contracts. **Do not** add new APIs or backend. Use **useDailyFacts(today)** as the main source for body, sleep, activity, recovery, nutrition, strength; **useLabResults**, **useUploadsPresence**, **useFailuresRange** for labs, uploads, failures. Command Center already proves this data is sufficient for “today” and per-domain readiness.
- **Defer** “what it means” / educational copy: no metric explanation or glossary exists in the repo; keep PHR v1 to **structure + presence + latest + navigation**.
- **Differentiate** from other tabs: Library = browse/search events and raw data; Timeline = when things happened; Dash = home launcher (+ optional Today); Stats = interpretive metrics; **Manage = health record index and category status**.

---

## 2. Verified Repo Support for Manage-as-PHR

### Routes (verified in `app/(app)/_layout.tsx` and directory listing)

| Route | Purpose | File(s) |
|-------|---------|---------|
| `/(app)/body/weight` | Body composition / weight | `app/(app)/body/weight.tsx` |
| `/(app)/body/index` | Body overview | `app/(app)/body/index.tsx` |
| `/(app)/body/overview` | Body overview | `app/(app)/body/overview.tsx` |
| `/(app)/body/dexa` | DEXA | `app/(app)/body/dexa.tsx` |
| `/(app)/workouts` | Workouts (strength + cardio entry) | `app/(app)/workouts/index.tsx` |
| `/(app)/nutrition` | Nutrition | `app/(app)/nutrition/index.tsx` |
| `/(app)/recovery` | Recovery index | `app/(app)/recovery/index.tsx` |
| `/(app)/recovery/sleep` | Sleep | `app/(app)/recovery/sleep.tsx` |
| `/(app)/recovery/readiness` | Readiness | `app/(app)/recovery/readiness.tsx` |
| `/(app)/labs` | Labs index | `app/(app)/labs/index.tsx` |
| `/(app)/labs/overview` | Labs overview | present |
| `/(app)/failures` | Failures list | `app/(app)/failures/index.tsx` |
| `/(app)/command-center` | Today / command center | `app/(app)/command-center/index.tsx` |
| `/(app)/log` | Quick log | `app/(app)/log/index.tsx` |
| `/(app)/event/[id]` | Event detail | from Library/Timeline |

There is **no** dedicated “uploads list” screen; uploads are presence-only (count + latest) in API and Library.

### Hooks (verified in `lib/data/` and `lib/api/`)

| Hook | Input | Returns | Use for PHR |
|------|--------|--------|-------------|
| **useDailyFacts** | `day: string` | DailyFactsDto (sleep, activity, recovery, body, nutrition, strength) or missing/error | **Primary**: latest/presence for body, sleep, activity, recovery, nutrition, strength for one day (e.g. today). |
| **useHealthScore** | `day: string` | HealthScoreDoc (compositeScore, domainScores, status) or missing/error | Optional PHR section “Overall” or leave to Stats. |
| **useHealthSignals** | `day: string` | HealthSignalDoc (status, reasons, domainEvidence) or missing/error | Same as health score. |
| **useLabResults** | `opts?: { limit? }` | `{ items: LabResultDto[], nextCursor }` | Labs: count = items.length; latest = items sorted by collectedAt desc, first. |
| **useUploadsPresence** | — | `{ count, latest: { rawEventId, observedAt, ... } \| null }` | Uploads: count + “latest” (e.g. last upload time). |
| **useFailuresRange** | `{ start, end, limit }, { mode? }` | `{ items, nextCursor, truncated }` | Failures: count = items.length; no “latest result” in health sense. |
| **useEvents** | `{ start, end, kinds?, limit }` | `{ items: CanonicalEventListItem[], nextCursor }` | Can derive count and “latest” per kind if needed; useDailyFacts already aggregates for today. |
| **useWeightSeries** | (range, etc.) | WeightSeriesViewModel | Body-specific; optional for “latest weight” if not using dailyFacts.body. |
| **useDayTruth** | `day: string` | DayTruthDto (eventsCount, latestCanonicalEventAt) | Readiness / “has data today”; used by Command Center. |
| **useInsights** | `day: string` | Insights response | Command Center; optional for PHR “insights count.” |
| **useIntelligenceContext** | `day: string` | IntelligenceContext | Command Center; optional for PHR. |

**Conclusion:** One call to **useDailyFacts(today)** plus **useLabResults**, **useUploadsPresence**, and **useFailuresRange** is enough to drive a PHR category list with “latest or missing” and counts where applicable. No new backend required.

### Contracts (verified in `lib/contracts/`)

- **dailyFacts.ts:** `sleep.totalMinutes`, `activity.{steps, distanceKm, moveMinutes, trainingLoad}`, `recovery.{hrvRmssd, hrvRmssdBaseline, hrvRmssdDeviation}`, `body.{weightKg, bodyFatPercent}`, `nutrition.{totalKcal, proteinG, carbsG, fatG}`, `strength.{workoutsCount, totalSets, totalReps, totalVolumeByUnit}`. All optional; absence implies “no data” for that domain.
- **healthScore.ts:** `compositeScore`, `compositeTier`, `domainScores` (recovery, training, nutrition, body), `status` (stable | attention_required | insufficient_data).
- **healthSignals.ts:** `status`, `readiness`, `reasons`, `missingInputs`, `domainEvidence`.
- **retrieval.ts:** `canonicalEventKindSchema`: sleep, steps, workout, weight, hrv, nutrition, strength_workout.
- **rawEvent.ts:** `rawEventKindSchema`: sleep, steps, workout, weight, hrv, nutrition, strength_workout, file, incomplete.
- **labResults.ts:** `LabResultDto`: collectedAt, biomarkers[]; list response with items, nextCursor.
- **uploads.ts:** count, latest (rawEventId, observedAt, receivedAt, originalFilename?, mimeType?).
- **failure.ts:** FailureListItemDto (type, code, message, day, createdAt, ...); list with items, nextCursor.
- **readiness.ts:** Canonical readiness: missing | partial | ready | error.

### Reusable UI (verified)

- **lib/ui/ScreenStates.tsx:** ScreenContainer, LoadingState, ErrorState, EmptyState.
- **lib/ui/PageTitleRow.tsx,** **lib/ui/SettingsGearButton.tsx:** Used on all tab screens.
- **lib/ui/FailClosed.tsx:** Loading/error/empty or children(data).
- **Dash:** Card pattern (title, subtitle, chevron, press scale) in `app/(app)/(tabs)/dash.tsx`; styles: sectionLabel, cards, card, cardPressed, cardRow, cardTitle, cardSubtitle.
- **Library index:** Row pattern (rowTitle, rowCount) in `app/(app)/(tabs)/library/index.tsx`; list with gap, row, white background.
- **Command Center:** ModuleTile, ModuleSectionCard, ModuleSectionLinkRow, CommandCenterHeader; **lib/modules/commandCenterModules.ts** (COMMAND_CENTER_MODULES: body, training, nutrition, recovery, labs, settings); **lib/modules/commandCenterReadiness.ts** (getModuleBadge, isModuleDisabled); **lib/modules/commandCenterBody.ts** (buildBodyCommandCenterModel), and sibling modules for cardio, nutrition, recovery, labs.

So: category list can reuse **Library-style rows** (title + right-hand status/count) or **Dash-style cards**; status text can follow **getModuleBadge**-style vocabulary (Ready, Empty, Needs input, etc.) where it matches readiness.

### Overlaps with other tabs

- **Library:** Category list + counts (failures, uploads) and search; [category] shows events by kind. Library is “browse my data by category” and “search raw events.” **Manage** should be “health record index: what domains do I have, what’s the status, where do I go?” — same categories can appear on both; Manage focuses on **status and meaning** (latest/missing), Library on **browse and search**.
- **Timeline:** Day list and day detail (events, incomplete, failures). Timeline is “when”; Manage is “what domains and status.”
- **Command Center:** Today summary + module tiles with readiness and CTAs. Command Center is “today at a glance” + launcher. Manage is “full health record index” (can include today but not only today); we can reuse the same **readiness and module model** (e.g. buildBodyCommandCenterModel) for consistency, or a lighter “presence + latest” row.
- **Dash:** Home launcher; may link to Command Center or Today. No overlap with PHR index.
- **Stats:** Placeholder; will be interpretive (e.g. health score over time). Manage shows **category status**; Stats shows **derived metrics and trends**.

---

## 3. Canonical Role of Manage

**Exact purpose**  
Manage is the user’s **structured Personal Health Record (PHR) and category navigator**: a single screen that lists health domains, shows whether data exists (and optionally latest value or last updated), shows missing state, and links to the correct place to view or add data.

**What it should show on first load**  
- Title (e.g. “Manage” or “Health record”) and subtitle (e.g. “Your health data by category”).
- Settings access (existing pattern).
- A single list of **health categories** (see Information Architecture). Each row/card shows:
  - Category name.
  - **Status**: either a short “latest” summary (e.g. “72.5 kg”, “3 workouts”, “8 results”) or “No data” / “View” / “Empty” (repo uses “missing” | “partial” | “ready” | “error” in readiness; “Empty” and “Needs input” exist in commandCenterReadiness).
  - Tap → navigate to the existing route for that category (body/weight, workouts, nutrition, recovery, labs, failures; uploads → minimal view or Timeline as today).

**What it should NOT show**  
- Quick-log or “log something” as the primary focus (that can remain a secondary CTA on Dash or inside modules).
- Command Center “today” summary duplicated in full (link to Command Center is fine).
- Timeline day list, Library search, or Stats charts.
- Metric explanations or glossary content until such content exists in the repo (no “what it means” copy today).
- Any category or metric not backed by existing routes/hooks/contracts.

**Category-first vs metric-first vs hybrid**  
**Category-first.** One row per health domain (Body, Training, Nutrition, Recovery, Labs, Uploads, Failures). Optionally one “Overall” row for health score/signals (or leave to Stats). Metrics (e.g. “weight”, “steps”) appear only as **summary inside** the category row (e.g. “72.5 kg” under Body), not as a separate top-level list.

**Drill-in**  
Always to **existing routes** (see Data Availability Matrix). No new detail routes required for v1.

**Static structure vs real data**  
**Hybrid for v1:** List of categories is fixed (from repo truth). Per-row **status and summary** are **data-driven** where hooks exist (useDailyFacts(today), useLabResults, useUploadsPresence, useFailuresRange). Where data is missing, show “No data” or “View” (no fake values).

**What to exclude because repo support is missing**  
- Per-category “last updated” timestamps unless derived from existing payloads (e.g. dailyFacts.computedAt, lab collectedAt, uploads latest.observedAt).
- “Normal range” or “what’s healthy” — no such content in repo.
- “Learn more” / “What this metric means” — no glossary or educational copy; defer or link to “View” only.
- New categories not represented in routes/contracts (e.g. “Medications”, “Conditions”) — do not add.

---

## 4. Recommended Information Architecture

Top-level categories are derived from **existing routes + dailyFacts + Library + Command Center**:

| Category | Title | Purpose | Route (drill-in) | Summary data today | Missing |
|----------|--------|---------|-------------------|---------------------|--------|
| **Body** | Body composition | Weight, body fat, DEXA | `/(app)/body/weight` (or body/index) | useDailyFacts(today).body → weightKg, bodyFatPercent; or useWeightSeries for latest | “No data” when body missing |
| **Training** | Training | Strength + cardio | `/(app)/workouts` | useDailyFacts(today).strength (workoutsCount, totalSets, etc.) and/or activity (steps, trainingLoad) | “No data” when both missing |
| **Nutrition** | Nutrition | Macros, meals | `/(app)/nutrition` | useDailyFacts(today).nutrition → totalKcal, proteinG, etc. | “No data” when missing |
| **Sleep** | Sleep | Sleep duration/quality | `/(app)/recovery/sleep` | useDailyFacts(today).sleep.totalMinutes | “No data” when missing |
| **Recovery** | Recovery / Readiness | HRV, readiness | `/(app)/recovery/readiness` (or recovery) | useDailyFacts(today).recovery (hrvRmssd, etc.) | “No data” when missing |
| **Labs** | Labs | Bloodwork, biomarkers | `/(app)/labs` | useLabResults → count; latest item collectedAt (or count only) | “No results” when items.length === 0 |
| **Uploads** | Uploads | File uploads / scans | No dedicated list screen | useUploadsPresence → count; latest.observedAt or “X uploads” | “No uploads” when count === 0 |
| **Failures** | Data quality | Ingestion failures | `/(app)/failures` | useFailuresRange → items.length | “None” when 0 |

Optional **Overall** row: useHealthScore(today) / useHealthSignals(today) → “Score: 72” or “View in Stats”. Defer to Stats if product prefers; otherwise one row “Overall health” → `/(app)/command-center` or a future Stats route.

**What each category row contains (v1)**  
- **Title** (e.g. “Body composition”, “Training”).  
- **Status/summary** (right side or subtitle):  
  - If data: short line (e.g. “72.5 kg”, “3 workouts”, “8 lab results”, “12 uploads”).  
  - If no data: “No data” or “View” or “Empty” (align with commandCenterReadiness vocabulary).  
- **Tap** → existing route.  
- No “learn more” in v1 (no repo content).

**What is deferred**  
- “Last updated” per category (unless we derive from computedAt / collectedAt / observedAt).  
- Metric explanations, normal ranges, glossary.  
- New categories or new APIs.  
- Expandable sections or sub-metrics (v1 is flat list).

---

## 5. Data Availability Matrix

Per category, **verified** from code only:

| Category | Existing route? | Existing hook? | API support? | Latest value possible? | Count possible? | Missing-state possible? | Explanatory copy in repo? | Ship now? |
|----------|-----------------|----------------|--------------|------------------------|-----------------|--------------------------|----------------------------|-----------|
| **Body** | Yes (body/weight, body/index) | useDailyFacts (body), useWeightSeries | Yes (dailyFacts, rawEvents) | Yes (dailyFacts.body.weightKg, etc.) | Yes (events or weight series) | Yes (missing/empty) | No | **Yes** |
| **Training** | Yes (workouts) | useDailyFacts (strength, activity) | Yes | Yes (strength.workoutsCount, activity.steps, etc.) | Yes | Yes | No | **Yes** |
| **Nutrition** | Yes (nutrition) | useDailyFacts (nutrition) | Yes | Yes (totalKcal, proteinG, …) | Yes (events) | Yes | No | **Yes** |
| **Sleep** | Yes (recovery/sleep) | useDailyFacts (sleep) | Yes | Yes (sleep.totalMinutes) | Yes (events) | Yes | No | **Yes** |
| **Recovery** | Yes (recovery/readiness) | useDailyFacts (recovery) | Yes | Yes (recovery.hrvRmssd, etc.) | Yes (events) | Yes | No | **Yes** |
| **Labs** | Yes (labs) | useLabResults | Yes (GET lab results list) | Yes (latest item by collectedAt) | Yes (items.length) | Yes (0 results) | No | **Yes** |
| **Uploads** | No list screen (presence only) | useUploadsPresence | Yes (count + latest) | Yes (latest.observedAt) | Yes (count) | Yes (count 0) | No | **Yes** (row with count + “View” or link to Timeline) |
| **Failures** | Yes (failures) | useFailuresRange, useFailures | Yes | N/A (not a “result”) | Yes (items.length) | Yes (0) | No | **Yes** |
| **Overall (health score)** | Command Center / Stats | useHealthScore, useHealthSignals | Yes | Yes (compositeScore, etc.) | N/A | Yes | No | Optional (or leave to Stats) |

**Explanatory copy:** Grep found no user-facing “what it means” or “learn more” for metrics; only lineage/provenance explainability and internal severity “info”. So **explanatory copy = No** for all; ship without it.

---

## 6. UX / Screen Plan

**Structure (top to bottom)**  
1. **Safe area + container** (ScreenContainer).  
2. **Header:** PageTitleRow — title “Manage” (or “Health record”), subtitle “Your health data by category” (or similar), rightSlot = SettingsGearButton.  
3. **Section label:** “Health record” or “Categories” (uppercase, gray, same as Dash/Library section labels).  
4. **Category list:** One row (or card) per category in a fixed order (e.g. Body, Training, Nutrition, Sleep, Recovery, Labs, Uploads, Failures). Each row: left = category title; right = status/summary (e.g. “72.5 kg”, “No data”, “8 results”). Chevron or disclosure for tap.  
5. **Bottom padding.**

**Section layout**  
- Single section “Categories” (or “Health record”) with a flat list. No expandable sections in v1.  
- Optional: group “Data quality” (Uploads, Failures) under a subheading; if so, keep one section label and two visual groups (health domains vs data quality). Prefer **one list** for v1.

**Row/card style**  
- **Recommendation:** Reuse **Library-style row** (white row, title left, status/count right, tap full row) for consistency with “list of categories with status.” Alternative: Dash-style card (gray card, title + subtitle, chevron) if product wants more emphasis. **Hybrid:** Library row layout with a short subtitle under title for “Latest: X” when data exists (so two lines: title, subtitle = status).  
- Use existing colors/fonts from Library and Dash (#1C1C1E, #8E8E93, #F2F2F7, 17/15 pt, etc.).

**Summary per row**  
- **Body:** “72.5 kg” or “No data”.  
- **Training:** “3 workouts” or “X steps” or “No data”.  
- **Nutrition:** “1,840 kcal” or “No data”.  
- **Sleep:** “7h 12m” or “No data”.  
- **Recovery:** “HRV 42 ms” or “No data”.  
- **Labs:** “8 results” or “Latest: Jan 15” or “No results”.  
- **Uploads:** “12 uploads” or “No uploads”.  
- **Failures:** “0” or “3” (count only).  

**“What it means”**  
- **v1:** No “what it means” or info icon (no content in repo).  
- **Later:** Inline tooltip, or “View” → existing screen, or a future glossary route. Recommend: **defer**; optional “View details” label only.

**Empty state**  
- If **all** categories show “No data” / “0”, optional short line under the list: “Log weight, workouts, or other data to see summaries here.” Not required for v1; list always shows.

**Loading / error**  
- **Option A:** Single useDailyFacts(today) + useLabResults + useUploadsPresence + useFailuresRange; wrap in FailClosed or show LoadingState until at least dailyFacts is ready; then render list with “…” or “— ” for labs/uploads/failures until their hooks resolve.  
- **Option B:** Per-row loading: show list immediately with “…” for each category; replace with value or “No data” as each hook resolves.  
- **Recommendation:** **Option A** — one loading state for the screen (e.g. “Loading health record…”); then render full list with real or “No data” / count. Error: ErrorState with retry for the primary data (dailyFacts); if labs/uploads/failures fail, show “—” or “Error” for those rows and keep the rest.

**Apple-clean, not overwhelming**  
- One scrollable list; no tabs or nested sections in v1.  
- Short labels; no long paragraphs.  
- Status right-aligned or below title; chevron for “drill in.”  
- Same typography and spacing as Library/Dash.

**Recommendation: Manage should feel like**  
**B) A health record dashboard** — structured list of domains with clear status and one-tap navigation. Not only a registry (A), not a chart-heavy explorer (C). Hybrid (D) if we add an “Overall” score row; still category-first.

---

## 7. File-Level Implementation Plan

**Modify**  
- **app/(app)/(tabs)/manage.tsx** — Replace quick-actions content with PHR category list. Keep ScreenContainer, PageTitleRow, SettingsGearButton. Add: section label; list of categories; for each category, call the appropriate hook(s) or derive from useDailyFacts(today) + useLabResults + useUploadsPresence + useFailuresRange; render row with title + status/summary; onPress → existing route. No new routes.  
- Optionally **lib/modules/commandCenterModules.ts** — Do **not** change module list or hrefs; possible reuse of id/title/href for “Training” (workouts), “Recovery” (recovery), “Body” (body), “Nutrition” (nutrition), “Labs” (labs). If we want a single source of truth for “category id + route,” we could add a small **PHR_CATEGORIES** or reuse COMMAND_CENTER_MODULES (minus settings) and add Uploads, Failures. **Recommendation:** Define a **local** constant in manage.tsx for v1 (e.g. PHR_CATEGORIES with id, title, route, and which hook/slice to use); refactor to shared constant later if desired.

**Create**  
- **None** for v1. No new screens, no new shared component required if we inline the row (same as Library index).  
- Optional later: **lib/modules/phrCategories.ts** or extend commandCenterModules with PHR-specific list (including Uploads, Failures) and a helper “getPhrSummary(categoryId, data)” that returns display string.

**Leave untouched**  
- app/(app)/(tabs)/_layout.tsx  
- app/(app)/_layout.tsx  
- app/(app)/command-center/index.tsx  
- app/(app)/(tabs)/library/index.tsx  
- app/(app)/(tabs)/dash.tsx  
- app/(app)/(tabs)/timeline/*  
- app/(app)/(tabs)/stats.tsx  
- lib/data/* (use as-is)  
- lib/api/*  
- lib/contracts/*  
- lib/ui/* (use as-is)  
- lib/modules/commandCenter*.ts (use as-is; optional reuse only)

**Defer**  
- New route under `manage/` (e.g. manage/[category]) — not needed; drill to existing routes.  
- Shared “PhrCategoryRow” component — inline in manage.tsx first; extract in polish phase if duplicated.  
- Educational / “what it means” screen or modal — no content in repo.  
- “Last updated” per category — optional later from computedAt/collectedAt.  
- Health score/signals row — optional; can add one “Overall” row or leave to Stats.

---

## 8. Blockers / Decisions

**Hard blockers**  
- None. All data needed is available via existing hooks and API.

**Soft blockers**  
- **Uploads:** No list screen; only count + latest. Manage can show “X uploads” and link to Timeline or a minimal “uploads” view (e.g. Library’s uploads category behavior).  
- **Copy:** Subtitle and section label (“Your health data by category”, “Categories”) and exact “No data” vs “Empty” vs “View” — product to confirm.  
- **Order of categories:** Product preference (e.g. Body first vs Lifestyle first).

**Product decisions**  
- Title: “Manage” vs “Health record” vs “My data”.  
- Whether to include an “Overall” (health score/signals) row and link (Command Center vs Stats).  
- Whether Uploads row should open a dedicated screen later or only “View in Timeline” / Library uploads view.  
- Whether to group “Data quality” (Uploads, Failures) under a subheading.  
- Exact wording for missing state: “No data”, “Empty”, “View”, “—”.

---

## 9. Recommended Build Order for Manage

**First slice (ship)**  
- **Single file:** `app/(app)/(tabs)/manage.tsx`.  
- Replace quick-actions with:  
  - PageTitleRow (“Manage”, “Your health data by category”), SettingsGearButton.  
  - Section label “Categories”.  
  - One **useDailyFacts(today)** (today = getTodayDayKey()).  
  - **useLabResults({ limit: 10 })** (or 5) for labs count + latest.  
  - **useUploadsPresence()**, **useFailuresRange({ start, end, limit: 100 })** for uploads/failures (same 90d range as Library or 30d).  
  - List of 8 categories (Body, Training, Nutrition, Sleep, Recovery, Labs, Uploads, Failures). For each row: title; summary from facts/labs/uploads/failures or “No data”; onPress → existing route.  
  - Loading: FailClosed or LoadingState until dailyFacts is ready; then show list (use “…” or “—” for labs/uploads/failures until ready).  
  - Error: ErrorState with retry if dailyFacts fails; partial failure for other hooks → show “—” for that row.  
- Reuse Library-style row (title + status right) or Dash-style card; keep styles local.  
- No new components, no new routes.

**Second slice (optional)**  
- Add “Overall” row (useHealthScore(today)) → link to Command Center or Stats.  
- Or add short “Last updated” from dailyFacts.computedAt / lab latest collectedAt.  
- Extract shared constant (e.g. PHR_CATEGORIES) to lib/modules if we want one source of truth for category id/title/route.

**Polish**  
- Extract **PhrCategoryRow** (or reuse ModuleSectionLinkRow with different content) if we use it elsewhere.  
- Accessibility pass (labels, order).  
- Copy pass (subtitle, “No data” vs “View”).  
- Optional: group Uploads + Failures under “Data quality” subheading.

---

*End of audit and implementation plan. All claims are tied to verified files and code paths; no assumptions presented as facts.*
