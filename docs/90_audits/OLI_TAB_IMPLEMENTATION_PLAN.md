# Oli Tab Implementation Plan — Repo Truth Based

**Source:** `docs/90_audits/OLI_REPO_AUDIT_CURRENT_TRUTH.md`  
**Date:** 2025-03-11  
**Scope:** Full implementation plan for Dash, Timeline, Manage, Library, Stats. No code; repo truth and audit only.

---

## 1. Executive Recommendation

**Best overall direction**  
- Treat the five tabs as the single navigation spine. Each tab has one canonical role; avoid duplicate surfaces.  
- **Dash:** Keep as launcher/menu and add one prominent “Today” card that navigates to Command Center. Do not move Command Center content onto Dash in the first slice—reuse by navigation, not by duplication.  
- **Manage:** Define as “quick actions and logging entry point”: concrete cards (Quick log, Log weight, Workouts, Command Center) using existing routes only.  
- **Library:** Treat as “data category browser + ingestion QA”: categories browse canonical events; Search + quick lenses handle raw-event review and resolve. Fix placeholders and misleading “Available” labels.  
- **Stats:** Ship the smallest v1: “Today’s health” using existing `useHealthScore(day)` and `useHealthSignals(day)` for today only—no range picker in v1.

**Most important product decision**  
- **Dash vs Command Center:** Decide whether the long-term home is “Dash = menu + Today card → Command Center” (current recommendation) or “Dash = the today view” (Command Center content composed on Dash, command-center route optional). The plan assumes the first for Phases A–B; the second can be a later phase if product wants a single-surface home.

**Safest implementation path**  
- **Phase A:** Manage (action cards, no new API).  
- **Phase B:** Library (fix placeholders and labels; failures → existing Failures screen).  
- **Phase C:** Dash (add Today card; optionally later evolve to embed today content). Stats v1 (today’s score/signals).  
- **Phase D:** Polish (labels, a11y, optional shared primitives).  
- No new backend endpoints or new hooks for the first slice; only screen composition and navigation.

---

## 2. Canonical Role of Each Tab

### Dash

- **Canonical purpose:** Home launcher: “Oli” branding, one place to see “today” at a glance (via Command Center), and shortcuts to manage data (body, workouts, nutrition, recovery, labs).  
- **User comes here to:** Land after login; open “Today” (Command Center); or jump to a data module.  
- **First load:** Title “Oli”, subtitle, Settings gear; one prominent “Today” or “Command Center” card (data-driven summary optional later); section “Manage your data” with existing six cards (Body, Workouts, Nutrition, Sleep, Readiness, Labs).  
- **Should NOT live here:** Inline pipeline logic; duplicate Command Center logic; Firebase or API calls in the tab file (use a single “Today” card that pushes to Command Center).  
- **Data-driven now or lightweight:** Lightweight for first slice: static menu + one new card that navigates. Optional later: today summary line (e.g. “X steps, Y min sleep”) on the Today card using existing hooks, without moving full Command Center onto Dash.  
- **Overlap:** Command Center at `/(app)/command-center/index` is the “today” surface. Dash should link to it, not replace it in Phase A/B.  
- **Decision (recommended):** Dash remains launcher/menu and gains one “Today” / “Command Center” card. Command Center stays the canonical today screen. No duplication of Command Center content on Dash in the first implementation.

### Timeline

- **Canonical purpose:** Day-by-day view of pipeline presence: which days have events, facts, insights, context; incomplete/uncertain state; drill into a single day.  
- **User comes here to:** Browse days, see completeness, open a day to see events and resolve incomplete items.  
- **First load:** Title “Timeline”, view-mode chips (7d/14d/30d), prev/next, list of days with badges (events, incomplete, facts, insights, etc.), or empty/loading/error via FailClosed.  
- **Should NOT live here:** Raw “manage” actions (those live on Manage); Library search; Stats charts.  
- **Data-driven now or lightweight:** Fully data-driven today; keep as-is.  
- **Overlap:** None. Timeline is the only day-list + day-detail tab.  
- **Decision:** Leave Timeline as the reference implementation; only optional polish (e.g. Jump modal validation message).

### Manage

- **Canonical purpose:** Entry point for “do something”: quick log, log weight, start workout, open Command Center. Not yet the place for destructive/export actions (Sprint 4+); those stay behind friction later.  
- **User comes here to:** Quickly log (incomplete, weight, workout) or open the full today view (Command Center).  
- **First load:** Title “Manage”, short subtitle; section “Quick actions” (or equivalent) with cards/rows: **Command Center** (today), **Quick log**, **Log weight**, **Workouts**. All navigate to existing routes.  
- **Should NOT live here:** Timeline day list; Library categories; Stats; account/export/delete (defer to Settings + future friction).  
- **Data-driven now or lightweight:** Lightweight: static action list; no data required for first version.  
- **Overlap:** Command Center and Quick log are linked from here and from Dash (Today card) or elsewhere; that’s intentional.  
- **Decision:** Manage = “quick actions + logging entry point” with four concrete actions using current routes only.

### Library

- **Canonical purpose:** Data category browser and ingestion QA. (1) Browse canonical events by category (strength, cardio, sleep, hrv, etc.). (2) Search and filter raw events; resolve incomplete/uncertain; review corrections. Not a “content hub” (programs/files); not a generic file manager.  
- **User comes here to:** See what data exists by category; open Search for filters and unresolved/uncertain/corrections; open a category to see events by day; optionally open event detail or body/weight.  
- **First load:** Title “Library”, subtitle; quick lenses (Unresolved, Uncertain, Corrections) → search with params; category list with real counts where we have them (failures, uploads), and neutral label where we don’t (replace “Available” with “View” or no count).  
- **Should NOT live here:** Primary “log new data” flows (those are on Manage/Dash modules); Timeline day list; Stats.  
- **Data-driven now or lightweight:** Data-driven for failures and uploads counts; category list and search already so. Fix labels and uploads/failures category behavior.  
- **Overlap:** Event detail `/(app)/event/[id]` and Failures screen `/(app)/failures` are used from Library.  
- **Decision:** Library = **(b) data category browser** with **(c) ingestion QA** (search + lenses). Not (a) content/programs hub. Resolve ambiguity by: keep current structure; replace “Available” with “View” (or hide count); make “Failures” category navigate to `/(app)/failures`; make “Uploads” show count + “View” or minimal copy (no full list—API is presence only).

### Stats

- **Canonical purpose:** Interpretive surface for derived health metrics: score and signals over time. v1 = today only.  
- **User comes here to:** See “how am I doing today” (health score, signals) in one place.  
- **First load:** Title “Stats”, subtitle; single date = today; FailClosed(useHealthScore(today), useHealthSignals(today)); show today’s health score (if any) and list of health signals (if any); empty state if no data.  
- **Should NOT live here:** Timeline; raw events; logging; Library.  
- **Data-driven now or lightweight:** Data-driven using existing hooks; v1 is minimal (today only, no range picker).  
- **Overlap:** Command Center may show some derived state; Stats is the dedicated “metrics” tab.  
- **Decision:** Smallest v1 = today’s health score + today’s health signals using `lib/data/useHealthScore.ts` and `lib/data/useHealthSignals.ts`. No new API; no charts required for v1 (list/cards enough).

---

## 3. Reuse Map

### Dash

- **Routes to reuse:** `/(app)/command-center`, `/(app)/body/weight`, `/(app)/workouts`, `/(app)/nutrition`, `/(app)/recovery/sleep`, `/(app)/recovery/readiness`, `/(app)/labs` (all existing).  
- **Hooks:** None required for first slice (menu + one Today card). Optional later: same hooks as Command Center for a one-line today summary on the card (useDailyFacts, etc.)—audit confirms these exist.  
- **UI components:** `lib/ui/ScreenContainer.tsx`, `lib/ui/PageTitleRow.tsx`, `lib/ui/SettingsGearButton.tsx`. Same card pattern as current Dash (or reuse `lib/ui/ModuleSectionLinkRow.tsx` / `lib/ui/ModuleTile.tsx` for consistency with Command Center).  
- **List patterns:** Current `MANAGE_DATA_CARDS` + `DashCard`; can align with ModuleTile/ModuleSectionLinkRow if desired.  
- **Empty/error/loading:** Not needed for static menu + one nav card.  
- **API:** None for first slice.  
- **Exact paths:**  
  - `lib/ui/ScreenStates.tsx` (ScreenContainer)  
  - `lib/ui/PageTitleRow.tsx`, `lib/ui/SettingsGearButton.tsx`  
  - `lib/ui/ModuleTile.tsx`, `lib/ui/ModuleSectionLinkRow.tsx`, `lib/ui/ModuleSectionCard.tsx` (optional for card styling)

### Timeline

- **Routes:** Already self-contained; `/(app)/event/[id]` for event detail.  
- **Hooks:** `lib/data/useTimeline.ts` (already used).  
- **UI:** `lib/ui/ScreenStates.tsx`, `lib/ui/PageTitleRow.tsx`, `lib/ui/SettingsGearButton.tsx`, `lib/ui/FailClosed.tsx`, `lib/ui/OfflineBanner.tsx`, `lib/ui/TruthIndicators.tsx`, `lib/ui/ScreenStates.tsx` (EmptyState).  
- **List patterns:** Existing FlatList + row styles in `app/(app)/(tabs)/timeline/index.tsx`.  
- **Empty/error/loading:** FailClosed + LoadingState, ErrorState, EmptyState.  
- **API:** `lib/api/usersMe.ts` getTimeline.  
- **Exact paths:** No new reuse; leave as-is. Reference: `app/(app)/(tabs)/timeline/index.tsx`, `app/(app)/(tabs)/timeline/[day].tsx`, `lib/data/useTimeline.ts`, `lib/time/timelineRange.ts`.

### Manage

- **Routes to reuse:** `/(app)/command-center`, `/(app)/log` (Quick log), `/(app)/body/weight`, `/(app)/workouts`.  
- **Hooks:** None for first version (static action list).  
- **UI:** `lib/ui/ScreenContainer.tsx`, `lib/ui/PageTitleRow.tsx`, `lib/ui/SettingsGearButton.tsx`. Card/row pattern same as Dash (or ModuleSectionLinkRow).  
- **List patterns:** Same as Dash: list of cards/rows with title + optional subtitle, onPress → router.push.  
- **Empty/error/loading:** Not needed for static actions.  
- **API:** None.  
- **Exact paths:**  
  - `lib/ui/ScreenStates.tsx`, `lib/ui/PageTitleRow.tsx`, `lib/ui/SettingsGearButton.tsx`  
  - `app/(app)/command-center/index.tsx`, `app/(app)/log/index.tsx`, `app/(app)/body/weight.tsx`, `app/(app)/workouts/index.tsx` (destinations only)

### Library

- **Routes to reuse:** `/(app)/(tabs)/library/search`, `/(app)/(tabs)/library/[category]`, `/(app)/body/weight`, `/(app)/event/[id]`, `/(app)/failures` (for Failures category).  
- **Hooks:** `lib/data/useFailuresRange.ts`, `lib/data/useUploadsPresence.ts` (already used on index); `lib/data/useRawEvents.ts`, `lib/data/useEvents.ts` (used in search and [category]).  
- **UI:** `lib/ui/ScreenContainer.tsx`, `lib/ui/PageTitleRow.tsx`, `lib/ui/SettingsGearButton.tsx`, `lib/ui/ScreenStates.tsx` (Loading, Error, Empty) in search and [category].  
- **List patterns:** Category list rows in `library/index.tsx`; event rows in `library/[category].tsx` and `library/search.tsx`.  
- **Empty/error/loading:** Already in search and [category]; index shows “…” for failures/uploads while loading.  
- **API:** `lib/api/usersMe.ts` (getUploads, getRawEvents, getEvents), `lib/api/failures.ts` (getFailuresRange).  
- **Exact paths:**  
  - `app/(app)/(tabs)/library/index.tsx`, `app/(app)/(tabs)/library/search.tsx`, `app/(app)/(tabs)/library/[category].tsx`  
  - `lib/data/useFailuresRange.ts`, `lib/data/useUploadsPresence.ts`, `lib/data/useRawEvents.ts`, `lib/data/useEvents.ts`  
  - `app/(app)/failures/index.tsx` (destination for Failures category)  
  - `components/failures/FailureList.tsx` (not used on Library index; used on failures screen if we redirect)

### Stats

- **Routes:** None beyond tab.  
- **Hooks:** `lib/data/useHealthScore.ts`, `lib/data/useHealthSignals.ts` (both take `day: string`; use today).  
- **UI:** `lib/ui/ScreenContainer.tsx`, `lib/ui/PageTitleRow.tsx`, `lib/ui/SettingsGearButton.tsx`, `lib/ui/FailClosed.tsx` (or manual Loading/Error/Empty from ScreenStates).  
- **List patterns:** List or cards for “today’s score” and “today’s signals”; can mirror Timeline row/card style.  
- **Empty/error/loading:** FailClosed or LoadingState/ErrorState/EmptyState.  
- **API:** `lib/api/usersMe.ts` (getHealthScore, getHealthSignals—used by hooks).  
- **Exact paths:**  
  - `lib/data/useHealthScore.ts`, `lib/data/useHealthSignals.ts`  
  - `lib/ui/ScreenStates.tsx`, `lib/ui/FailClosed.tsx`  
  - `lib/time/dayKey.ts` (getTodayDayKey or equivalent for today)

---

## 4. File-Level Plan

### Dash

- **Modify:**  
  - `app/(app)/(tabs)/dash.tsx` — Add one “Today” / “Command Center” card (or section) that navigates to `/(app)/command-center`. Optionally introduce a small constant array for “above the fold” cards (Today) vs “Manage your data” (existing six). Keep existing MANAGE_DATA_CARDS and DashCard behavior; add one card or reuse same pattern.
- **Create:**  
  - None for first slice.
- **Leave untouched:**  
  - `app/(app)/(tabs)/_layout.tsx`  
  - `app/(app)/_layout.tsx`  
  - `app/(app)/command-center/index.tsx`  
  - All lib/ui and lib/data used by Command Center
- **Defer / refactor later:**  
  - Extracting a shared “NavCard” or reusing ModuleTile/ModuleSectionLinkRow for Dash cards.  
  - Putting today summary (e.g. steps, sleep) on the Today card using useDailyFacts (optional Phase D).  
  - Moving Command Center content onto Dash (only if product chooses single-surface home).
- **Risk notes:** None; additive change only.

### Timeline

- **Modify:**  
  - Optional: `app/(app)/(tabs)/timeline/index.tsx` — Jump modal: show validation message when date invalid (e.g. “Enter YYYY-MM-DD”) instead of no-op.
- **Create:**  
  - None.
- **Leave untouched:**  
  - `app/(app)/(tabs)/timeline/[day].tsx`, `app/(app)/(tabs)/timeline/_layout.tsx`, `lib/data/useTimeline.ts`, timeline range and API.
- **Defer:**  
  - Any larger Timeline redesign.
- **Risk notes:** Minimal; optional polish only.

### Manage

- **Modify:**  
  - `app/(app)/(tabs)/manage.tsx` — Replace two text links with a clear structure: PageTitleRow (keep); section label “Quick actions” (or “Log & manage”); four action cards/rows: Command Center → `/(app)/command-center`, Quick log → `/(app)/log`, Log weight → `/(app)/body/weight`, Workouts → `/(app)/workouts`. Reuse same visual pattern as Dash (card with title + optional subtitle + chevron). No new routes.
- **Create:**  
  - None (reuse ScreenContainer, PageTitleRow, SettingsGearButton; inline card/row list as in Dash).
- **Leave untouched:**  
  - `app/(app)/(tabs)/_layout.tsx`, `app/(app)/command-center/index.tsx`, `app/(app)/log/index.tsx`, `app/(app)/body/weight.tsx`, `app/(app)/workouts/index.tsx`.
- **Defer:**  
  - Destructive actions, auth friction, export (Sprint 4+).  
  - Shared NavCard component (can do in Phase D).
- **Risk notes:** None; screen-only composition.

### Library

- **Modify:**  
  - `app/(app)/(tabs)/library/index.tsx` — (1) In `getCategoryCount`, for categories that currently show “Available” (weight, labs, strength, cardio, sleep, hrv), return “View” instead of “Available” (or return nothing and hide count column for those—product choice). (2) For category “failures”: on press, navigate to `/(app)/failures` instead of pushing `library/[category]` with category=failures.  
  - `app/(app)/(tabs)/library/[category].tsx` — (1) When `category === "failures"`: redirect to `/(app)/failures` (e.g. useEffect + router.replace) or remove failures from categories that hit [category] (already handled at index if we navigate from index to failures). (2) When `category === "uploads"`: replace placeholder with minimal content: show uploads count from useUploadsPresence (or pass via param/context if needed), and copy such as “X uploads” and “View in Timeline” or “Latest upload” if we have latest; do not assume a list API. If useUploadsPresence is only on index, either use it on a dedicated uploads “view” or keep a simple placeholder that says “X uploads” and link to Timeline—implementation choice: minimal is “Failures → (app)/failures; Uploads → keep simple placeholder with count + link to Timeline” to avoid adding useUploadsPresence to [category] for uploads-only, or add useUploadsPresence when category===uploads and show count + “View in Timeline”.
- **Create:**  
  - None if we resolve uploads by: “Uploads” category in index opens [category] with category=uploads; [category] when category=uploads shows a small block with count (need useUploadsPresence in [category] for uploads) and “View in Timeline” link. So one optional addition: in [category].tsx, when category===uploads, call useUploadsPresence and render count + link to timeline (no list).  
  - No new files if we instead keep uploads as “placeholder + link to Timeline” without count on the [category] screen (count already on index).  
  - Recommendation: **Modify only** — index: failures → push `/(app)/failures`. Index: uploads → keep pushing to [category].tsx? Or index: uploads → same as failures, push to a single “uploads” screen? Audit says “replace placeholder with redirect or minimal list”. There is no dedicated uploads list screen. So: [category].tsx for uploads: show “X uploads” (use useUploadsPresence in this screen when category===uploads) and “View in Timeline” (link to timeline index or today). So we **modify** [category].tsx to, when category===uploads, use useUploadsPresence and render minimal view (count + link). No new file.
- **Leave untouched:**  
  - `app/(app)/(tabs)/library/search.tsx`, `app/(app)/(tabs)/library/_layout.tsx`, quick lenses, useFailuresRange, useUploadsPresence on index.  
  - `app/(app)/failures/index.tsx`.
- **Defer:**  
  - Real counts per category from API (weight, labs, etc.); shared FilterChip/SectionHeader.  
  - Full uploads list (no API for that today).
- **Risk notes:** useUploadsPresence in [category].tsx only when category===uploads (enabled: category==='uploads') to avoid extra calls on other categories.

### Stats

- **Modify:**  
  - `app/(app)/(tabs)/stats.tsx` — Replace placeholder with: get today (e.g. getTodayDayKey from lib/time/dayKey); use useHealthScore(today) and useHealthSignals(today); wrap in FailClosed or handle partial/error/ready for both; render “Today’s health” (or “Stats”) with score and signals (structure per contract: HealthScoreDoc, HealthSignalDoc). Show EmptyState when no data; ErrorState/LoadingState from ScreenStates. No date picker in v1.
- **Create:**  
  - None; use existing hooks and ScreenStates/FailClosed.
- **Leave untouched:**  
  - `app/(app)/(tabs)/_layout.tsx`, `lib/data/useHealthScore.ts`, `lib/data/useHealthSignals.ts`, `lib/api/usersMe.ts`, contracts.
- **Defer:**  
  - Date range picker, charts, multiple days.  
  - New aggregates or backend.
- **Risk notes:** Contracts for HealthScoreDoc and HealthSignalDoc must be used as returned by API; no assumption of shape beyond what’s in lib/contracts.

---

## 5. UX / Content Plan

### Dash

- **Screen structure (top to bottom):**  
  1. Safe area + container.  
  2. PageTitleRow: “Oli”, “Manage your health and fitness — all in one place.”, Settings.  
  3. **New:** One card: “Today” (or “Command Center”) — subtitle e.g. “See your day at a glance” — tap → `/(app)/command-center`.  
  4. Section label: “Manage your data”.  
  5. Six cards: Body Composition, Workouts, Nutrition, Sleep, Readiness, Labs (unchanged).  
  6. Bottom padding.
- **Main sections:** Today card (new); Manage your data (existing).  
- **Core CTA:** Today card; each of the six cards.  
- **Empty state:** N/A (always show menu).  
- **Loading state:** N/A for first version.  
- **Error state:** N/A for first version.  
- **Hardcoded vs real data:** All hardcoded for first version; optional later: today card could show one line from useDailyFacts (e.g. “X steps • Y min sleep”) without moving full Command Center.  
- **First version ship:** Add Today card; keep existing six cards; no new hooks.

### Timeline

- **Screen structure:** Unchanged. (Optional: Jump modal validation message.)  
- **First version:** No change required; optional polish only.

### Manage

- **Screen structure (top to bottom):**  
  1. Safe area + container.  
  2. PageTitleRow: “Manage”, “Quick log, log weight, workouts, and today’s overview.” (or similar), Settings.  
  3. Section label: “Quick actions”.  
  4. Four cards/rows:  
     - **Command Center** — “Today’s overview” → `/(app)/command-center`.  
     - **Quick log** — “Log something quickly” → `/(app)/log`.  
     - **Log weight** — “Add a weight entry” → `/(app)/body/weight`.  
     - **Workouts** — “Log or view workouts” → `/(app)/workouts`.  
  5. Bottom padding.
- **Main sections:** Quick actions (four items).  
- **Core CTA:** Each of the four actions.  
- **Empty state:** N/A.  
- **Loading state:** N/A.  
- **Error state:** N/A.  
- **Hardcoded vs real data:** All hardcoded.  
- **First version ship:** Four action cards only; no auth friction or destructive actions.

### Library

- **Screen structure (top to bottom):**  
  1. PageTitleRow: “Library”, “Browse by category and search raw events.” (or keep current subtitle), Settings.  
  2. Quick lenses: Unresolved, Uncertain, Corrections (unchanged).  
  3. Category list: Search (Filters), Strength (View), Cardio (View), Sleep (View), HRV (View), Body Composition (View), Labs (View), Uploads (count), Failures (count). Tapping Failures → `/(app)/failures`. Tapping Uploads → `library/[category]` with category=uploads → minimal “X uploads” + “View in Timeline”. Other categories unchanged.  
- **Main sections:** Quick lenses; category list.  
- **Core CTA:** Lenses; each category row.  
- **Empty state:** Not needed on index (list always present).  
- **Loading state:** “…” for failures and uploads counts (existing).  
- **Error state:** Could show inline or fallback “—”; no full-screen error for index unless desired.  
- **Hardcoded vs real data:** Counts for failures and uploads real; labels “View” for categories without counts.  
- **Uploads category screen ([category] when category=uploads):** Title “Uploads”, “X uploads” (from useUploadsPresence), link “View in Timeline” → timeline tab or today. No list of uploads (API is presence only).  
- **Failures category:** No longer open [category]; open `/(app)/failures` from index.  
- **First version ship:** “Available” → “View” (or hide count); failures → navigate to failures; uploads → minimal view with count + link.

### Stats

- **Screen structure (top to bottom):**  
  1. PageTitleRow: “Stats”, “Today’s health score and signals.” (or similar), Settings.  
  2. Date line: “Today” (fixed; no picker in v1).  
  3. FailClosed (or combined outcome of useHealthScore + useHealthSignals): loading → LoadingState; error → ErrorState; ready with no data → EmptyState “No health data for today”; ready with data → show health score (if present) and list of health signals (if present).  
  4. Content: Score card/section; signals list (e.g. label + value per signal). Shape follows HealthScoreDoc and HealthSignalDoc from contracts.  
  5. Bottom padding.
- **Main sections:** Today; Health score; Health signals.  
- **Core CTA:** None beyond viewing; optional “See Timeline” link.  
- **Empty state:** “No health data for today.”  
- **Loading state:** “Loading…”  
- **Error state:** ErrorState with retry.  
- **Hardcoded vs real data:** Date “today” is derived (getTodayDayKey); score and signals from hooks.  
- **First version ship:** Today only; score + signals; no range, no charts.

---

## 6. Blockers and Decisions

### Hard blockers

- **None** for Phase A (Manage) and Phase B (Library label/placeholder fixes).  
- **Stats:** None; useHealthScore and useHealthSignals exist and take a day string.  
- **Dash:** None for “add Today card”.

### Soft blockers

- **Library “Uploads” full list:** API is presence only (count + latest); no list endpoint. So uploads category cannot show a full list until backend adds one; minimal view (count + “View in Timeline”) is acceptable.  
- **Stats contract shape:** Implementer must read HealthScoreDoc and HealthSignalDoc in lib/contracts and render only what’s there; no invented fields.

### Required product decisions

- **Dash vs Command Center (long-term):** Confirm “Dash = menu + Today card → Command Center” for now, with option to later make Dash the embedded today view.  
- **Library “View” vs “Available”:** Confirm replacing “Available” with “View” (or hiding count) for weight, labs, strength, cardio, sleep, hrv.  
- **Manage subtitle/copy:** Approve “Quick log, log weight, workouts, and today’s overview” (or final copy).  
- **Stats v1 scope:** Confirm “today only, score + signals, no range picker” is acceptable for first release.

### API gaps

- **None** for the planned first slice.  
- **Library:** No per-category count API for weight/labs/strength/cardio/sleep/hrv; use “View” instead of count.  
- **Uploads list:** No list API; uploads category shows count + link only.

### Copy/UX ambiguities

- **“Today” vs “Command Center”:** On Dash and Manage, label the card either “Today” or “Command Center”; recommend “Today” for user language.  
- **Library uploads:** Copy for “View in Timeline” vs “See latest in Timeline” etc.; decide once.

### Temporary solutions acceptable

- **Library:** “View” instead of real counts for most categories; uploads = count + link (no list).  
- **Stats:** Today only; no date range; simple list/cards, no charts.  
- **Manage:** No destructive actions or auth friction (Sprint 4+).

### Can build now

- **Manage** (four action cards).  
- **Library** (labels + failures redirect + uploads minimal view).  
- **Dash** (Today card).  
- **Stats** (today’s score + signals with existing hooks).

### Should wait

- **Dash as embedded Command Center** until product confirms.  
- **Library real counts** until API or reuse of list endpoints is defined.  
- **Stats range/charts** until v1 is shipped and prioritized.

### Needs product decision first

- **Final copy** for Manage and Library labels.  
- **Long-term Dash:** menu vs embedded today.

---

## 7. Phased Build Order

### Phase A — Quick wins (low complexity)

- **Tabs/features:** Manage.  
- **Why now:** No new API, no new routes; only recompose one screen with four clear actions. Immediate improvement: users have one place for “log / today”.  
- **Complexity:** Low.  
- **User-facing improvement:** Manage becomes a clear “quick actions” home instead of two text links.

### Phase B — Medium lift / high leverage (low–medium complexity)

- **Tabs/features:** Library (fix “Available” → “View”; Failures category → `/(app)/failures`; Uploads category → minimal view with count + “View in Timeline”).  
- **Why now:** Removes confusion and placeholders; reuses existing failures screen and useUploadsPresence.  
- **Complexity:** Low–medium.  
- **User-facing improvement:** Library categories behave consistently; no dead-end placeholders.

### Phase C — Heavier build (medium complexity)

- **Tabs/features:** Dash (add Today card); Stats v1 (today’s health score + signals).  
- **Why now:** Dash gains discoverability of “today”; Stats becomes a real tab with existing backend.  
- **Complexity:** Medium (Stats needs FailClosed + two hooks + contract-based rendering).  
- **User-facing improvement:** Home has clear “Today” entry; Stats tab shows interpretive metrics for today.

### Phase D — Polish / refactor (low–medium complexity)

- **Tabs/features:** Timeline Jump modal validation; optional shared NavCard/SectionHeader; optional today summary line on Dash Today card; copy pass; a11y pass.  
- **Why now:** After all five tabs are functional and consistent.  
- **Complexity:** Low–medium.  
- **User-facing improvement:** Clearer errors, consistent components, better a11y and copy.

---

## 8. Ready-to-Build First Slice

**What to implement first in code**

- **Manage tab: four quick-action cards.**

**Why this first**

1. **No new dependencies:** Uses only existing routes and existing UI (ScreenContainer, PageTitleRow, SettingsGearButton; same card pattern as Dash).  
2. **No API or hooks:** Purely presentational; no data layer, no Firebase, no business logic in the screen.  
3. **Immediate clarity:** Replaces the current two text links with four explicit actions (Command Center, Quick log, Log weight, Workouts), matching the defined role of Manage.  
4. **Safe:** Single file change (`app/(app)/(tabs)/manage.tsx`); no layout or route changes.  
5. **Reusable pattern:** Same structure can be used later for a shared NavCard if we extract it in Phase D.

**Exact scope of first slice**

- **File:** `app/(app)/(tabs)/manage.tsx`.  
- **Changes:**  
  - Keep ScreenContainer, PageTitleRow (update subtitle to something like “Quick log, log weight, workouts, and today’s overview.”).  
  - Remove the two standalone Text links.  
  - Add a section label (e.g. “Quick actions”).  
  - Add four cards/rows, each with title, optional subtitle, onPress → router.push(route), accessibility label:  
    - Command Center → `/(app)/command-center`  
    - Quick log → `/(app)/log`  
    - Log weight → `/(app)/body/weight`  
    - Workouts → `/(app)/workouts`  
  - Reuse the same card style as Dash (gray background, title, subtitle, chevron) so behavior and look are consistent.  
- **Do not in this slice:** Add hooks, API calls, new components, or new routes.  
- **After this:** Proceed to Library (Phase B), then Dash + Stats (Phase C), then polish (Phase D).

---

*End of implementation plan. All recommendations are grounded in the audit and repo truth; no code is produced in this document.*
