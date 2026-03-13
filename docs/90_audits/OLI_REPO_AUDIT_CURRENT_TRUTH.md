# Oli Repo Audit — Current Truth

**Audit date:** 2025-03-11  
**Scope:** Full current-state audit for building navigation tab pages (Dash, Timeline, Manage, Library, Stats).  
**Method:** Repo as source of truth; every claim tied to file/code evidence.

---

## 1. Executive Summary

**What exists**
- **Expo Router** is the single entrypoint (`main: "expo-router/entry"`). Root layout uses AuthProvider + RouteGuard; post-login redirect goes to `/(app)/(tabs)/dash`.
- **Bottom tabs** are file-based: `app/(app)/(tabs)/_layout.tsx` defines five tabs (Dash, Timeline, Manage, Library, Stats) with deterministic order and icons.
- **Data access is layered:** Screens use hooks (`useTimeline`, `useEvents`, `useRawEvents`, `useFailuresRange`, `useUploadsPresence`, etc.); hooks call `lib/api/*` (HTTP + id token); **no Firebase/Firestore in `app/` or `components/`**. Firebase is only in `lib/auth` and `lib/firebaseConfig` for auth.
- **Timeline** is the most built tab: day list from `useTimeline`, view modes (7d/14d/30d), jump-to-date, day detail `[day].tsx` with events, incomplete, failures, resolve flows.
- **Library** is a category index plus Search (filters, raw events, resolve incomplete) and `[category]` (events by kind); failures/uploads counts are real; weight/labs/other category counts are hardcoded “Available” where not wired.
- **Dash** is a module menu: title row + “Manage your data” cards that only navigate to existing routes (body, workouts, nutrition, recovery/sleep, recovery/readiness, labs). Not a command center; Command Center is a separate stack screen.
- **Manage** is a thin placeholder: title + links to Command Center and Quick log.
- **Stats** is a placeholder: title + subtitle only.
- **Design system:** Shared primitives in `lib/ui/`: ScreenContainer, PageTitleRow, SettingsGearButton, FailClosed, ScreenStates (Loading/Error/Empty), TruthIndicators, OfflineBanner, ModuleTile, etc. No formal typography/color tokens file; hardcoded colors (e.g. `#1C1C1E`, `#8E8E93`, `#F2F2F7`) and font sizes in styles.
- **Backend:** Firestore under `/users/{uid}/...`; API (services/api) is HTTP, uses Admin SDK; client calls `EXPO_PUBLIC_BACKEND_BASE_URL` only. Pipeline (RawEvent → normalization → dailyFacts/insights/intelligenceContext) exists in Cloud Functions; app reads via API (timeline, events, raw-events, failures, uploads, dailyFacts, insights, etc.).

**What is partial**
- **Dash:** No today summary, no pipeline-derived cards; only navigation cards. Command Center (separate route) holds the rich “today” surface (DailyFacts, Insights, IntelligenceContext, failures, uploads, module tiles).
- **Library:** Category list is partly data-driven (failures count, uploads count); weight/labs/strength/cardio/sleep/hrv show “Available” or “Filters” (search) and link to `[category]` or body/weight; uploads/failures categories open placeholder text in `[category].tsx` (“Use Timeline or Failures screen”).
- **Manage:** Entry point exists; no logging shortcuts, no destructive-action friction (Sprint 4+).

**What is missing**
- **Stats:** No charts, no metrics, no data hooks; placeholder only.
- **Dash as command center:** The “command center” experience lives on `command-center/index`, not on the Dash tab. Unifying or linking is a product decision.
- **Centralized design tokens:** No single theme/tokens file; colors and type are inline.
- **Zustand / global store:** None; state is hooks + local component state.
- **Root README:** No `README.md` at repo root; `docs/README.md` is the canonical overview (and is slightly out of date vs current code).

**Biggest risks**
- **Dash vs Command Center split:** Two surfaces (Dash tab = menu, Command Center = rich today view). Building “Dash as command center” could duplicate or conflict with Command Center unless one is chosen as canonical.
- **Library “Available” labels:** Weight, Labs, and several categories show “Available” without backend-backed counts; could confuse users if they expect real counts.
- **Stats:** No data or UI; any build is greenfield on that tab.

**Biggest opportunities**
- Reuse Command Center modules and data hooks (useDailyFacts, useInsights, useIntelligenceContext, useFailuresRange, useUploadsPresence, useDerivedLedgerRuns, etc.) to enrich Dash without duplicating logic.
- Reuse Timeline/Library patterns (FailClosed, view modes, filter chips, list rows) for Stats and Manage.
- Existing data layer (lib/data/*, lib/api/*) and contracts (@oli/contracts) support building all tabs against real API; no need for Firebase in screens.

---

## 2. Verified Repo Structure

**Top-level folders (verified)**

| Path | Role | Evidence |
|------|------|----------|
| `app/` | Expo Router app routes | `app/_layout.tsx`, `app/(app)/(tabs)/_layout.tsx`, route files |
| `lib/` | Shared lib: auth, api, data hooks, ui, contracts, time, workouts, pipeline, preferences, modules | `package.json` workspaces `lib/contracts`; `tsconfig.json` references `./lib/tsconfig.build.json`; no `main` in root package points to lib |
| `components/` | Reusable UI (workouts, failures) | `components/workouts/*`, `components/failures/*`; `app/tsconfig.json` includes `../components/**/*` |
| `services/api/` | Backend HTTP API (Express) | `services/api/src/index.ts`, routes under `services/api/src/routes/` |
| `services/functions/` | Cloud Functions (Firestore triggers, pipeline) | `services/functions/src/index.ts`, `onRawEventCreated`, `realtime/onCanonicalEventCreated`, `pipeline/` |
| `scripts/` | CI, test runner, invariants | `scripts/ci/assert-client-trust-boundary.mjs`, `scripts/test/run-jest-with-firestore-emulator.mjs` |
| `docs/` | Documentation | `docs/README.md`, `docs/00_truth/`, `docs/20_architecture/`, etc. |
| `infra/`, `cloudrun/`, `ios/`, `android/`, `patches/` | Infra, native projects, patches | Present on disk |
| `archive/` | Empty | `ls archive` → empty directory |

**Active vs legacy vs unclear**
- **Active:** `app/`, `lib/`, `components/`, `services/api/`, `services/functions/`, `scripts/`, `docs/`.  
- **Legacy:** `archive/` is empty (no legacy code committed).  
- **Unclear:** No “features/” or “stores/” at top level; hooks live in `lib/data/` and `lib/workouts/hooks/`.

**Entry point**
- **Single app entry:** `package.json` → `"main": "expo-router/entry"`. Expo resolves this to Expo Router’s entry; no duplicate `index.js` or alternate entry in app.
- **Root index route:** `app/index.tsx` redirects to `/(app)`; `(app)/_layout.tsx` stacks `(tabs)` and other screens. So the **active** entry for the product shell is the `(app)` group, with tabs as the primary tab group.

**Routing truth**
- **Expo Router:** Used throughout; `expo-router` in dependencies; layouts use `<Stack>`, `<Tabs>` from `expo-router`.
- **Tab navigation:** **File-based.** Tab screens are:
  - `app/(app)/(tabs)/dash.tsx`
  - `app/(app)/(tabs)/timeline/index.tsx` (and `timeline/[day].tsx`)
  - `app/(app)/(tabs)/manage.tsx`
  - `app/(app)/(tabs)/library/index.tsx` (and `library/search.tsx`, `library/[category].tsx`, etc.)
  - `app/(app)/(tabs)/stats.tsx`
- Tabs layout: `app/(app)/(tabs)/_layout.tsx` → `<Tabs initialRouteName="dash">` with five `<Tabs.Screen name="…">` entries. No duplicate tab definitions.

---

## 3. Navigation Audit

**Tab definition file:** `app/(app)/(tabs)/_layout.tsx`

| Tab | Route path | File path | Current screen status | Notes | Issues |
|-----|------------|-----------|------------------------|-------|--------|
| **Dash** | `(tabs)/dash` | `app/(app)/(tabs)/dash.tsx` | **Partially built** | PageTitleRow + “Manage your data” cards → body, workouts, nutrition, recovery/sleep, recovery/readiness, labs. No data-driven summary. | Dash is a menu, not a command center. One card links to `/(app)/recovery/sleep`; recovery/sleep.tsx exists. |
| **Timeline** | `(tabs)/timeline` | `app/(app)/(tabs)/timeline/index.tsx` | **Fully built** | useTimeline, view modes (7d/14d/30d), prev/next, Jump modal, FailClosed, day list with badges (canonicalCount, incomplete, dayCompletenessState, uncertainty, facts, insights, context, ledger, missingReasons). Taps → `timeline/[day]`. | None. |
| **Manage** | `(tabs)/manage` | `app/(app)/(tabs)/manage.tsx` | **Placeholder** | PageTitleRow + “Open Command Center” + “Quick log (Phase 2)”. | No real “manage” flows; links only. |
| **Library** | `(tabs)/library` | `app/(app)/(tabs)/library/index.tsx` | **Partially built** | Category list + quick lenses (Unresolved, Uncertain, Corrections → search with params). useFailuresRange + useUploadsPresence for counts. Search and [category] are real screens. | Weight/labs show “Available” (hardcoded). uploads/failures in [category] show placeholder. |
| **Stats** | `(tabs)/stats` | `app/(app)/(tabs)/stats.tsx` | **Placeholder** | PageTitleRow + subtitle “Interpretive surface — placeholder for Sprint 3.” | No content, no data. |

**Determinism and consistency**
- Navigation is deterministic: one tabs layout, one set of screen names, file-based routes.
- No duplicate tab definitions; no conflicting tab names.
- Icons: Ionicons (home-outline, time-outline, add-circle-outline, book-outline, bar-chart-outline). Labels: “Dash”, “Timeline”, “Manage”, “Library”, “Stats”.
- Tab bar: `headerShown: false`; active/inactive tint and label style set in tabs layout.

**Placeholder / partial**
- **Placeholder:** Manage (links only), Stats (subtitle only).
- **Partial:** Dash (menu only), Library (categories + search real; some counts/labels hardcoded; uploads/failures category screens placeholder).

---

## 4. Screen Audit

### Dash
- **Present:** ScreenContainer, PageTitleRow (“Oli”, “Manage your health and fitness — all in one place.”), SettingsGearButton, section label “Manage your data”, six DashCards (Body Composition, Workouts, Nutrition, Sleep, Readiness, Labs). Each card navigates to a route; press animation (scale).
- **Hardcoded:** Card list `MANAGE_DATA_CARDS` (ids, titles, subtitles, routes). All copy and routes.
- **Data-driven:** Nothing; no hooks, no API.
- **Reusable UI:** ScreenContainer, PageTitleRow, SettingsGearButton. DashCard is local (could be generalized).
- **Missing states:** No loading/error/empty; not needed for static menu. No today summary, no pipeline-derived content.
- **Quality:** Accessibility labels on cards. No obvious polish gaps for a menu screen. **Not** a command center; Command Center is at `/(app)/command-center/index`.

### Timeline
- **Present:** ScreenContainer, PageTitleRow (“Timeline”, “Day list with presence and light counts”), FailClosed(useTimeline), OfflineBanner when fromCache, view mode chips (7d/14d/30d), prev/next, Jump (modal with YYYY-MM-DD), FlatList of days with day key, badges (canonicalCount, incomplete, dayCompletenessState, TruthIndicator uncertain, facts/insights/context/ledger, missingReasons). Tap day → `/(app)/(tabs)/timeline/[day]`.
- **Hardcoded:** View mode labels, copy, styles. Date range logic uses lib/time/timelineRange.
- **Data-driven:** useTimeline(range) → getTimeline from API; timeline.data.days; fromCache for offline banner.
- **Reusable UI:** ScreenContainer, PageTitleRow, SettingsGearButton, FailClosed, EmptyState, OfflineBanner, TruthIndicator. Row/chip styles are local.
- **Missing states:** Covered (loading via FailClosed, empty EmptyState, error ErrorState). Jump modal has no validation message (invalid date just no-ops).
- **Quality:** Fail-closed; accessibility on day rows. Timeline is the most complete tab.

### Manage
- **Present:** ScreenContainer, PageTitleRow (“Manage”, “Entry point for logging and management…”), two text links: “Open Command Center”, “Quick log (Phase 2)”.
- **Hardcoded:** All copy and links.
- **Data-driven:** None.
- **Reusable UI:** ScreenContainer, PageTitleRow, SettingsGearButton.
- **Missing states:** N/A for a link list.
- **Quality:** Minimal; no cards or structure. Destructive actions / auth friction not present (called out in subtitle for Sprint 4+).

### Library
- **Present:** ScreenContainer, PageTitleRow (“Library”, “Category list with presence and counts”), quick lenses (Unresolved, Uncertain, Corrections) → library/search with query params, list of LIBRARY_CATEGORIES (Search, Strength, Cardio, Sleep, HRV, Body Composition, Labs, Uploads, Failures) with title + count. Navigation: Search → library/search; weight → body/weight; others → library/[category] with category param.
- **Hardcoded:** LIBRARY_CATEGORIES (ids, titles, kinds, countLabel). “Available” / “Filters” for most categories; only failures and uploads use hooks.
- **Data-driven:** useFailuresRange(90d) for failures count; useUploadsPresence() for uploads count. getCategoryCount(cat): search → “Filters”; weight → “Available”; failures → failures.data.items.length or “…”/”—”; uploads → uploads.data.count or “…”/”—”; else countLabel ?? “Available”.
- **Reusable UI:** ScreenContainer, PageTitleRow, SettingsGearButton. Row and lens button styles local.
- **Missing states:** Loading: failures/uploads show “…” when partial. No dedicated empty state for the index (list always shows).
- **Quality:** “Presence and counts” in code = failures count and uploads count real; other counts are “Available” or “Filters”. Unresolved/Uncertain/Corrections link to library/search with unresolvedLens, uncertaintyFilter, provenanceFilter; search screen uses useRawEvents with those filters. **Uploads/Failures:** In `[category].tsx`, when category is uploads or failures, a placeholder is shown (“Use Timeline or Failures screen”); they are not full category views. **Available:** Literally the string “Available” for weight, labs, and any category without a specific count in getCategoryCount. **Search/filters:** Implemented in library/search.tsx (keyword, start/end, provenance chips, uncertainty chips, unresolved lens); useRawEvents with q, start, end, provenance, uncertaintyState.

### Stats
- **Present:** ScreenContainer, View, PageTitleRow (“Stats”, “Interpretive surface — placeholder for Sprint 3.”), SettingsGearButton.
- **Hardcoded:** All.
- **Data-driven:** None.
- **Reusable UI:** ScreenContainer, PageTitleRow, SettingsGearButton.
- **Missing states:** N/A.
- **Quality:** Placeholder only; no charts, no metrics, no data.

---

## 5. Data Flow Audit

**Current data access pattern**
- **Screens** use hooks from `lib/data/` (e.g. useTimeline, useEvents, useRawEvents, useFailuresRange, useUploadsPresence, useDailyFacts, useInsights, useIntelligenceContext, useFailures, useDayTruth, useDerivedLedgerRuns, useDerivedLedgerReplay).
- **Hooks** use `useAuth()` for user and `getIdToken()`, then call functions in `lib/api/` (e.g. getTimeline, getEvents, getRawEvents, getFailuresRange, getUploads from `lib/api/usersMe.ts` or `lib/api/failures.ts`). Those use `apiGetZodAuthed` / `apiPostZodAuthed` from `lib/api/validate.ts`, which call `apiGetJsonAuthed` / `apiPostJsonAuthed` in `lib/api/http.ts`. HTTP uses `fetch()` and `EXPO_PUBLIC_BACKEND_BASE_URL`; no Firestore in app or components.
- **Firebase:** Used only in `lib/auth` (AuthProvider, getUid, getIdToken, actions) and `lib/firebaseConfig.ts` (init, getAuth, getFirestore). `app/` and `components/` do not import firebase or firestore.

**Firebase usage map**
- **app/** — No imports of firebase/firestore. **Verified** (grep).
- **components/** — No imports of firebase/firestore. **Verified** (grep).
- **lib/auth/** — Firebase Auth (onAuthStateChanged, User, getIdToken, signOut, etc.) and getFirebaseAuth from firebaseConfig.
- **lib/firebaseConfig.ts** — initializeApp, getAuth, getFirestore (Firestore exported but not used by app screens; API is the data path).
- **lib/env.ts** — Reads Firebase-related env vars for build-time config; no runtime Firestore calls.

**Boundary violations**
- **None** in app or components: no Firebase calls in screens. CI script `scripts/ci/assert-client-trust-boundary.mjs` enforces: `fetch(` only in `lib/api/http.ts`; screens/hooks use validated API layer.

**Missing data access layers**
- Stats has no data hooks (no useHealthScore, useHealthSignals, or aggregates). If Stats is to show derived metrics, those API/hooks exist (e.g. useHealthScore, useHealthSignals in lib/data) but are not used on Stats tab.
- Dash does not use DailyFacts/Insights/IntelligenceContext on the tab itself; Command Center does. So “command center” data layer exists but is not used on the Dash tab.

**Risk areas**
- Adding Firestore or raw `fetch` in new tab code would violate the boundary; keep using lib/api and lib/data only.

---

## 6. Reusable UI / Design System Audit

**Reusable components (lib/ui/)**
- **ScreenContainer** — SafeAreaView + container (ScreenStates.tsx).
- **PageTitleRow** — Title, optional subtitle, optional rightSlot (e.g. Settings).
- **SettingsGearButton** — Navigates to settings.
- **FailClosed** — Renders loading/error/empty or children(data); used by Timeline.
- **ScreenStates:** **LoadingState**, **ErrorState**, **EmptyState** — Used across tabs and Command Center.
- **TruthIndicators** — e.g. type="incomplete" | "uncertain" with label (Timeline, Library).
- **OfflineBanner** — Shows when data is from cache (Timeline).
- **ModuleTile**, **ModuleSectionCard**, **ModuleSectionLinkRow**, **ModuleTileSkeleton**, **ModuleEmptyState** — Command Center; could be reused on Dash.
- **ProvenanceRow**, **ProvenanceDrawer**, **StateBlock** — Provenance/state display.
- **CommandCenterHeader** — Large header for Command Center.
- **HeaderIconButton**, **BaselineDrawer** — Supporting UI.
- **WeightTrendChart**, **WeightRangeSelector**, **WeightLogModal**, **WeightDeviceStatusCard**, **WeightInsightCard** — Body/weight flows.
- **ExerciseProgressChart** — Workouts.

**Duplicated / overlapping**
- **DashCard** (dash.tsx) is local; similar to ModuleSectionLinkRow / tile patterns in Command Center. Could be generalized to a single “nav card” or reuse ModuleTile.
- **Filter chips** in library/search and similar patterns are inline Pressable + styles; no shared FilterChip component.
- **Row styles** (list rows) repeated in timeline/index, library/index, library/[category], library/search — same gray background, padding; no shared ListRow.

**Missing primitives**
- **Typography tokens:** No central file; font sizes and weights are inline (e.g. 28/900, 15, 13/600, 12).
- **Color tokens:** No theme file; hex colors inline (#1C1C1E, #8E8E93, #F2F2F7, #007AFF, etc.).
- **Spacing scale:** Padding/margins are ad-hoc (16, 20, 24, etc.).
- **SearchBar:** Library search uses raw TextInput; no shared SearchBar.
- **FilterChip:** Chip rows are local; no shared component.
- **SectionHeader:** Section labels are local Text + styles.
- **Metric/status badge:** Timeline badges are local Text; TruthIndicator exists for incomplete/uncertain only.
- **Theme/dark mode:** No theme provider or token-based theming.
- **Safe area:** ScreenContainer uses SafeAreaView with configurable edges; consistent.

**Icon strategy**
- Ionicons from `@expo/vector-icons` in tabs layout and various screens. No central icon map.

---

## 7. State Management Audit

**Stores**
- **Zustand:** Not in dependencies; no create() store usage in app/lib/components (grep for zustand/create/useStore found only unrelated “create” usages). **No global store.**

**Local state**
- Tab screens use useState (and useMemo/useCallback) for UI state: view mode, anchor day, jump modal, filters, resolve modals, etc. Data is fetched in hooks (useTimeline, useRawEvents, etc.) which hold their own state (partial/ready/error + data).

**Side-effect risks**
- Data hooks (useTimeline, useEvents, etc.) perform fetch in useEffect with dependency on args and user; no fetch during render. Refetch is callback-based. No obvious render-time side effects.

**Query/cache patterns**
- **lib/data/timelineCache.ts** — getTimelineCached, setTimelineCached for read-through on error/offline (useTimeline uses it). Similarly **lib/data/timelineCache.ts** has events cache (getEventsCached, setEventsCached) used by useEvents. No global query cache (e.g. no React Query); each hook owns its state and optional cache.

**Form state**
- **log/index.tsx** (Quick log): local state for time mode, backfill day, content unknown, approximate range, submitting, error. **workouts/log.tsx**, **body/weight.tsx**, etc. use local form state. No shared form library.

**Derived UI state**
- Timeline: range derived from anchorDay + viewMode (lib/time/timelineRange). Outcome (partial/error/ready) derived from timeline status in component. FailClosed consumes outcome and renders accordingly. No global derived store.

**Summary**
- State is **hooks + local component state**. No Zustand or other global store. Cache is per-hook (timeline, events). Side effects are in useEffect/callbacks; no render-phase data fetch.

---

## 8. Backend / Schema Alignment Audit

**Firestore path helpers**
- Backend uses **services/api/src/db.ts**: `userDoc(uid)`, `userCollection(uid, name)` for `users/{uid}/{collection}`. Collections used in API: rawEvents, events, dailyFacts, insights, intelligenceContext, healthScores, healthSignals, derivedLedger, failures, profile, integrations, requestRecords, labResults, etc. Firestore rules (services/functions/firestore.rules) explicitly allow read for: rawEvents, events, dailyFacts, insights, intelligenceContext, healthScores, healthSignals, failures (and user doc, sources). **Client does not read Firestore directly;** API uses Admin SDK, so rules apply only to direct client access if ever used.

**Schema/type definitions**
- **lib/contracts** (and workspace **lib/contracts**): Zod schemas and exported types for rawEvent, dailyFacts, insights, intelligenceContext, day, dayTruth, failure, weight, preferences, labResults, retrieval (raw events list, canonical events list, timeline, lineage), uploads, readiness, healthScore, healthSignals, provenance, derivedLedger, export. API validate layer uses these for response parsing (fail-closed).

**Runtime validation**
- **lib/api/validate.ts:** apiGetZodAuthed / apiPostZodAuthed run response through Zod; on failure return ApiFailure kind "contract". Used by all lib/api/* get/post functions.

**Pipeline (RawEvent → CanonicalEvent → DailyFacts → Insights → IntelligenceContext)**
- **Cloud Functions:** onRawEventCreated (normalization), realtime/onCanonicalEventCreated (dailyFacts, insights, intelligenceContext), pipeline/recomputeForDay, derivedLedger. **App** reads via API: timeline (days with canonicalCount, hasDailyFacts, hasInsights, hasIntelligenceContext, hasDerivedLedger, missingReasons), events, raw-events, dailyFacts, insights, intelligenceContext, dayTruth, derivedLedger snapshot/replay/runs, healthScore, healthSignals, failures, uploads. So **app is aligned** with pipeline outputs; it does not read RawEvents as the primary surface for “today” (it uses timeline, events, dailyFacts, etc.).

**Fake or temporary backend**
- **lib/dev/firebaseProbe.ts** exists (dev only). No mock API or fake backend in app code; app expects real API. Tests use emulators/mocks per test file.

**What app can read today**
- Timeline (days + presence), events (canonical), raw events (list/filters), failures (by day, range), uploads presence, dailyFacts, insights, intelligenceContext, dayTruth, derivedLedger runs/snapshot/replay, healthScore, healthSignals, lineage, lab results, preferences. All via lib/api + lib/data hooks.

**Blockers**
- **Stats:** Backend has healthScore, healthSignals, dailyFacts, insights; app has hooks but Stats screen does not use them. No “blocker” other than UI not built.
- **Library “Available”:** No API for “count of weight events” or “count of lab results” on Library index; would need new endpoints or reuse of existing list endpoints to show real counts.

**Alignment**
- App is aligned with pipeline: reads derived and canonical data via API; does not write raw events directly (ingest via API). Firestore remains under /users/{uid}/...; API is the only data path from app.

---

## 9. Build Readiness by Tab

| Tab | Readiness (0–10) | Can build now? | What exists | What’s missing | Dependencies / blockers | Recommended next step |
|-----|-------------------|----------------|-------------|----------------|------------------------|------------------------|
| **Dash** | **6** | Yes (as menu). Yes (as command center) if reusing Command Center. | Route, layout, PageTitleRow, six nav cards, Command Center at separate route with full data (useDailyFacts, useInsights, useIntelligenceContext, failures, uploads, module tiles). | Dash tab has no today summary or pipeline data. No shared “today” component. | Decide: Dash = menu only vs Dash = command center (then reuse or redirect). | Either keep Dash as menu and add one “Today” card → Command Center, or move Command Center content onto Dash and deprecate separate route. |
| **Timeline** | **9** | Yes | Full index + [day], useTimeline, view modes, jump, FailClosed, badges, links to event detail. | Minor: Jump modal validation message; optional a11y tweaks. | None. | Keep as reference for other tabs; optional small polish. |
| **Manage** | **3** | Partial (links only). Full “manage” UX no. | Route, title, two links (Command Center, Quick log). Quick log (log/index) exists and works. | No “manage” flows: no logging shortcuts, no destructive-action friction. | Product spec for what Manage should do (shortcuts, friction). | Add 2–3 concrete actions (e.g. “Log weight”, “Quick log”, “Command Center”) as cards or list; later add auth friction for destructive actions. |
| **Library** | **7** | Yes | Index, search, [category], useFailuresRange, useUploadsPresence, useRawEvents, useEvents. Quick lenses and filters work. | Real counts for weight/labs/strength/cardio/sleep/hrv (or remove “Available”). uploads/failures category screens are placeholder. | Optional: list/count endpoints for categories to replace “Available”. | Wire weight/labs (or other) counts from existing APIs if available, or replace “Available” with “View” or remove count; replace uploads/failures placeholders with redirect or minimal list. |
| **Stats** | **1** | No (placeholder only). | Route, title, subtitle. useHealthScore, useHealthSignals, useDailyFacts, useInsights exist in lib/data. | Entire UI and wiring: what to show, date range, which hooks. | Product spec for Stats (which metrics, time range). | Define Stats content (e.g. health score/signals over time); then add one range selector and one chart/list using existing hooks. |

**Recommended build order (repo-truth based)**  
1) **Manage** — Add a few clear actions (reuse existing routes and Quick log); no new data layer.  
2) **Library** — Replace placeholders for uploads/failures; optionally real counts or copy change for “Available”.  
3) **Dash** — Decide menu vs command center; then either one “Today” entry to Command Center or move Command Center onto Dash.  
4) **Stats** — Define scope, then implement with existing hooks (healthScore, healthSignals, etc.).  

---

## 10. Concrete File List

**Routing**
- `app/_layout.tsx` — Root layout, AuthProvider, RouteGuard, Stack (auth, app, index, debug).
- `app/(app)/_layout.tsx` — App Stack: (tabs), event/[id], command-center, body/*, nutrition, workouts/*, recovery/*, failures, settings, training/strength/log, log.
- `app/(app)/(tabs)/_layout.tsx` — Tabs layout (dash, timeline, manage, library, stats).
- `app/(app)/(tabs)/dash.tsx`
- `app/(app)/(tabs)/timeline/index.tsx`, `app/(app)/(tabs)/timeline/[day].tsx`, `app/(app)/(tabs)/timeline/_layout.tsx`
- `app/(app)/(tabs)/manage.tsx`
- `app/(app)/(tabs)/library/index.tsx`, `app/(app)/(tabs)/library/search.tsx`, `app/(app)/(tabs)/library/[category].tsx`, `app/(app)/(tabs)/library/_layout.tsx`
- `app/(app)/(tabs)/stats.tsx`
- `app/index.tsx` — Redirect to (app).

**Screens (tab and key stack)**
- `app/(app)/command-center/index.tsx` — Command Center (modules, today summary, data hooks).
- `app/(app)/log/index.tsx` — Quick log (incomplete event).
- `app/(app)/event/[id].tsx` — Event detail (from Library/Timeline).
- `app/(app)/body/weight.tsx`, `app/(app)/recovery/index.tsx`, `app/(app)/recovery/sleep.tsx`, `app/(app)/recovery/readiness.tsx`, `app/(app)/labs/index.tsx`, etc.

**Components**
- `lib/ui/ScreenStates.tsx` — ScreenContainer, LoadingState, ErrorState, EmptyState.
- `lib/ui/PageTitleRow.tsx`, `lib/ui/SettingsGearButton.tsx`, `lib/ui/FailClosed.tsx`, `lib/ui/TruthIndicators.tsx`, `lib/ui/OfflineBanner.tsx`
- `lib/ui/ModuleTile.tsx`, `lib/ui/ModuleSectionCard.tsx`, `lib/ui/ModuleSectionLinkRow.tsx`, `lib/ui/CommandCenterHeader.tsx`
- `components/failures/FailureList.tsx`, `components/failures/FailureCard.tsx`, `components/failures/FailureDetailsModal.tsx`
- `components/workouts/WheelPicker.tsx`, `components/workouts/ExerciseMediaPreview.tsx`, `components/workouts/ThumbnailPlaceholderView.tsx`

**Hooks**
- `lib/data/useTimeline.ts`, `lib/data/useEvents.ts`, `lib/data/useRawEvents.ts`, `lib/data/useFailuresRange.ts`, `lib/data/useFailures.ts`, `lib/data/useUploadsPresence.ts`
- `lib/data/useDailyFacts.ts`, `lib/data/useInsights.ts`, `lib/data/useIntelligenceContext.ts`, `lib/data/useDayTruth.ts`, `lib/data/useDerivedLedgerRuns.ts`, `lib/data/useDerivedLedgerReplay.ts`, `lib/data/useDerivedLedgerSnapshot.ts`, `lib/data/useHealthScore.ts`, `lib/data/useHealthSignals.ts`, `lib/data/useLineage.ts`, `lib/data/useLabResults.ts`, `lib/data/useLabResult.ts`, `lib/data/useWeightSeries.ts`, `lib/data/useWorkoutsHistory.ts`, `lib/data/useWithingsPresence.ts`
- `lib/data/truthOutcome.ts`, `lib/data/timelineCache.ts`, `lib/data/readiness.ts`, `lib/data/resolveReadiness.ts`

**Lib / API**
- `lib/api/http.ts` — fetch, base URL, apiGetJsonAuthed, apiPostJsonAuthed, apiPutJsonAuthed.
- `lib/api/validate.ts` — apiGetZodAuthed, apiPostZodAuthed, apiPutZodAuthed.
- `lib/api/usersMe.ts` — getTimeline, getUploads, getEvents, getRawEvents, getDailyFacts, getInsights, getIntelligenceContext, getDayTruth, getLineage, getFailures, getHealthScore, getHealthSignals, derivedLedger endpoints, lab results, logWeight, logStrengthWorkout, etc.
- `lib/api/failures.ts` — getFailures, getFailuresRange.
- `lib/api/ingest.ts` — ingestRawEventAuthed (for resolve flows, quick log).
- `lib/api/preferences.ts`
- `lib/env.ts` — EXPO_PUBLIC_BACKEND_BASE_URL, Firebase env vars.

**Stores**
- None (no Zustand).

**Types / contracts**
- `lib/contracts/index.ts` — Re-exports.
- `lib/contracts/retrieval.ts` — Timeline, events, raw events, lineage schemas.
- `lib/contracts/rawEvent.ts`, `lib/contracts/dailyFacts.ts`, `lib/contracts/insights.ts`, `lib/contracts/intelligenceContext.ts`, `lib/contracts/dayTruth.ts`, `lib/contracts/failure.ts`, `lib/contracts/derivedLedger.ts`, `lib/contracts/uploads.ts`, `lib/contracts/healthScore.ts`, `lib/contracts/healthSignals.ts`, etc.

**Backend touchpoints**
- **API:** `services/api/src/index.ts` — Mounts /ingest, /uploads, /preferences, /users/me (usersMeRoutes), etc. `services/api/src/routes/usersMe.ts` — Timeline, events, raw-events, dailyFacts, insights, intelligenceContext, dayTruth, failures, uploads, healthScore, healthSignals, derivedLedger, lineage, lab results. `services/api/src/routes/events.ts` — POST /ingest. `services/api/src/routes/failures.ts` (if separate) or failures under usersMe. `services/api/src/db.ts` — userCollection, userDoc.
- **Functions:** `services/functions/src/index.ts`, `services/functions/src/normalization/onRawEventCreated.ts`, `services/functions/src/realtime/onCanonicalEventCreated.ts`, `services/functions/src/pipeline/recomputeForDay.ts`, `services/functions/src/pipeline/derivedLedger.ts`, `services/functions/firestore.rules`.

---

## 11. Critical Issues to Fix Before Building

1. **Dash vs Command Center** — Clarify product: is Dash the “home” (menu only) or should it show Command Center content? If the latter, avoid duplicating logic; reuse Command Center modules/hooks on Dash or redirect.
2. **Library “Available”** — Replace or clarify: either wire real counts (API) for weight/labs/strength/cardio/sleep/hrv or use neutral label (“View”) or hide count.
3. **Library uploads/failures categories** — [category].tsx shows placeholder for uploads/failures; either add minimal list (reuse failures list / uploads from API) or route to dedicated Failures screen and uploads view.
4. **Stats** — No UI or data wiring; define scope and use existing hooks (useHealthScore, useHealthSignals, etc.) before building.
5. **Manage** — Define actions (shortcuts + later auth friction); then add 2–3 concrete entry points.
6. **No design tokens** — For consistency across five tabs, consider a small theme/tokens file (colors, spacing, type) so new screens don’t drift.

---

## 12. Recommended Build Order

Based strictly on what exists in code:

1. **Manage** — Add cards or list for “Command Center”, “Quick log”, and 1–2 logging shortcuts (e.g. “Log weight” → body/weight). Uses only existing routes and log/index; no new data layer.
2. **Library** — (a) Replace uploads/failures placeholder in [category] with redirect to failures screen or minimal list; (b) Change “Available” for weight/labs to “View” or add count if API supports it.
3. **Dash** — Product decision: if Dash should be “today” view, reuse Command Center data and components on Dash (or redirect Dash to command-center). If Dash stays menu, add single “Today” or “Command Center” card for discoverability.
4. **Stats** — Define metrics and range; implement one view (e.g. health score over time) using useHealthScore/useHealthSignals and existing ScreenStates/FailClosed.
5. **Polish** — Shared FilterChip/SectionHeader/ListRow if building more list/filter screens; optional typography/color tokens file.

---

*End of audit. All claims are tied to the files and code paths cited above.*
