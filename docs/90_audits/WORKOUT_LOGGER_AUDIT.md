# Workout Logger & Adjacent Systems — Code-First Audit

**Date:** 2026-03-07  
**Scope:** Workout Logger, session screens, exercise library, exercise history, timer, volume, media, routes, data boundaries, tests, invariants.  
**Rules:** Repo-truth only; code over docs; no invented schemas; Oli boundaries respected.  
**No implementation:** Audit only.

**Update (Sprint 13.1):** Canonical strength logging path set to workouts/log; Command Center Strength "Log" redirects there. See `docs/90_audits/SPRINT_13_1_CANONICAL_LOG_DECISION.md`.

**Update (Sprint 13.2):** Exercise history/details implemented: `lib/workouts/memory/exerciseHistory.ts`, `lib/workouts/hooks/useExerciseHistory.ts`, and real `app/(app)/workouts/exercise-history.tsx` (journal-only; no charts).

---

## A. Sprint / module truth

- **Verified:** No in-repo reference to "Sprint 13" or "Sprint 13 Workouts". Grep for `Sprint 13`, `sprint.?13`, `workouts.*sprint` returned no matches.
- **Verified:** Workouts are a **module** in the app. Authority: `lib/modules/moduleSectionRoutes.ts` — `ModuleId = "workouts"` with sections: `workouts.overview`, `workouts.log`, `workouts.history` (hrefs: `/(app)/workouts/overview`, `/(app)/workouts/log`, `/(app)/workouts/history`).
- **Verified:** `lib/modules/moduleReadiness.ts` — `workouts.overview` → READY; `workouts.log` and `workouts.history` → SOON (disabled).
- **Inference:** Sprint numbering in docs refers to Phase 1.5 (Sprints 1–6) and Phase 1 (retrieval, trust layer, UI, etc.). No explicit "current sprint" for workouts. **Verdict: Unclear** whether this work is aligned to a named "Sprint 13 Workouts" or to a generic workouts module; code only knows the workouts module and section readiness.

---

## B. File map by concern

**Workout logger (session) screen**
- `app/(app)/workouts/log.tsx` — single screen component `WorkoutLogScreen`; ~1,490 lines; contains grid, header, active row, completed row, modals, timer display, "Last" summary row, add-set CTA, pickers.

**Workout session screen(s)**
- Same as above. No separate "session" screen; log.tsx is the session UI.

**Exercise library**
- `app/(app)/workouts/exercise-picker.tsx` — full-screen picker (search, filters, sections, selection, `router.replace` back to log with `pickedExerciseId`).
- `lib/workouts/exercises/catalog.ts` — `EXERCISE_CATALOG_V1` (from library.v1).
- `lib/workouts/exercises/library.v1.ts` — `EXERCISE_LIBRARY_V1` (single source of truth; 450+ items).
- `lib/workouts/exercises/librarySections.ts` — `buildExerciseLibrarySections`.
- `lib/workouts/exercises/search.ts` — `searchExercises`.
- `lib/workouts/exercises/metadata.ts` — `getExerciseMeta`, taxonomy types.
- `lib/workouts/exercises/taxonomy.ts` — equipment, muscle, movement types.

**Exercise detail / history page**
- `app/(app)/workouts/exercise-history.tsx` — stub screen; "Exercise History", "Coming soon"; receives `exerciseId` via params; Back only.

**Active set row**
- In `app/(app)/workouts/log.tsx`: inline `View` with `styles.setRowActive`; draft reps/load/RPE as `Pressable` cells; "Log" button; no separate component file.

**Completed set row**
- In `app/(app)/workouts/log.tsx`: `SwipeableSetRow` (same file) wrapping set cells (ordinal, reps, weight, RPE, checkmark); swipe-to-delete.

**Grid / header layout**
- In `log.tsx`: `styles.setGridHeader` (Set | Reps | Weight | RPE | Action); column constants `GRID_COL_SET`, `GRID_COL_REPS`, etc.; no separate component.

**Set editing inputs / pickers**
- In `log.tsx`: `draftFieldPicker` / `completedSetPicker` state; single `Modal` with `presentationStyle="pageSheet"`; reps 1–30, weight lb list (0–600 step 2.5), RPE 1–10 or "—"; `editSetDraft` modal for full edit (TextInput reps/load/RPE + Save/Cancel/Delete set).

**Previous workout summary**
- In `log.tsx`: "Last" row above set grid; `formatLastSummaryWithRpe(previousComparisonByExerciseId[ex.exerciseId], memory[ex.exerciseId]?.last)`; tappable → `router.push("/(app)/workouts/exercise-history", { exerciseId })`.
- Data: `lib/workouts/memory/previousWorkout.ts` — `getPreviousExerciseComparison(uid, exerciseId)` (journal-only); `lib/workouts/memory/exerciseMemory.ts` — `buildExerciseMemory(uid)` (last/best by e1RM).

**Timer / rest timer**
- In `log.tsx`: elapsed only — `timerLabel` from `reduced.startedAt` and `nowTick` (1s interval when active); displayed in header. Rest timer: **stub** — `timerStubModalVisible`; button "⏱" opens modal "Timer coming next"; no real rest timer.

**Volume calculations**
- **Backend:** `services/functions/src/dailyFacts/aggregateDailyFacts.ts` — `buildStrengthFacts`: `volume = set.reps * set.load` per set; `totalVolumeByUnit.lb` / `totalVolumeByUnit.kg` by set.unit. Consumed by Command Center / daily facts.
- **Logger UI:** No volume computed or displayed in `log.tsx`. Volume appears in Command Center: `lib/modules/commandCenterStrength.ts` (`totalVolumeByUnit`), `app/(app)/command-center/index.tsx` (displays lb/kg).

**Media registry / image–video pipeline**
- `lib/workouts/exercises/media/registry.ts` — `REGISTRY` (require() thumbnails), `LOOP_VIDEO_REGISTRY` (require() loop mp4); `getBundledExerciseAsset`, `hasBundledExerciseAsset`, `getExerciseMedia`, `hasLoopVideo`.
- `lib/workouts/exercises/media/types.ts` — `ExerciseMedia` type.
- `lib/workouts/exercises/media/getExerciseImage.ts` — (present; usage not fully traced in this audit).
- `components/workouts/ExerciseMediaPreview.tsx` — loop video or thumbnail or placeholder.
- `components/workouts/ThumbnailPlaceholderView.tsx` — barbell icon placeholder.
- Assets: `assets/exercises/` (e.g. `bench_press/thumb.png`, `bench_press/loop.mp4`, `squat.png`, etc.); local/bundled only in registry.

**Stores / hooks / selectors / utils / reducers / engines**
- **Journal:** `lib/workouts/journal/store.ts` (AsyncStorage append), `lib/workouts/journal/types.ts`, `lib/workouts/journal/reducer.ts`, `lib/workouts/journal/sessionIndex.ts`, `lib/workouts/journal/index.ts`.
- **Session engine:** `lib/workouts/sessionEngine/commands.ts`, `lib/workouts/sessionEngine/selectors.ts` (`loadReducedSession`), `lib/workouts/sessionEngine/activeSessionStorage.ts`, `lib/workouts/sessionEngine/index.ts`.
- **Memory:** `lib/workouts/memory/previousWorkout.ts`, `lib/workouts/memory/exerciseMemory.ts`.
- **Data hooks:** `lib/data/useWorkoutsHistory.ts` (raw events kind "workout"; used by history screen). No Firebase in screens; data via lib.

**Tests**
- `app/(app)/workouts/__tests__/workout-log-session.test.tsx` — log screen session flows (mocked commands, selectors, memory, previousWorkout).
- `app/(app)/workouts/__tests__/exercise-picker.test.tsx` — exercise picker.
- `app/(app)/workouts/__tests__/workouts-landing.test.ts` — /workouts aliases overview.
- `app/(app)/workouts/__tests__/overview-lastSyncAt.test.tsx` — overview.
- `app/(app)/workouts/__tests__/anchored-sync.test.ts` — Apple Health anchored sync.
- `lib/workouts/exercises/__tests__/exerciseLibraryV1.test.ts`, `search.test.ts`, `exerciseMediaRegistry.test.ts`, `librarySections.test.ts`.
- `lib/workouts/journal/__tests__/reducer.test.ts`, `sessionIndex.test.ts`, `store.test.ts`.
- `lib/workouts/sessionEngine/__tests__/commands.test.ts`, `activeSessionStorage.test.ts`.
- `lib/workouts/memory/__tests__/exerciseMemory.test.ts`, `previousWorkout.test.ts`.
- `lib/data/workouts/__tests__/parseWorkoutFromRawEvent.test.ts`.
- `lib/events/__tests__/manualStrengthWorkout.test.ts`.
- `lib/modules/__tests__/commandCenterStrength.test.ts`.

**check:invariants and workout-related rules**
- `scripts/ci/check-invariants.mjs` — **no workout-specific checks**. CHECK 15 (canonical vs raw event kinds) allowlists raw kinds; `rawEventKindSchema` includes `workout`, `strength_workout`. No dedicated "workout logger" or "workout journal" invariant.
- `docs/90_audits/INVARIANT_ENFORCEMENT_MAP.md` — no workout-specific invariant rows.

---

## C. Route / navigation truth

**App layout**
- `app/(app)/_layout.tsx` — Stack. Explicit screens: `workouts/index`, `workouts/log`, `workouts/exercise-picker`. No explicit `workouts/overview`, `workouts/history`, `workouts/exercise-history` (Expo file-based routing still exposes them).

**Workout logger**
- Route: `(app)/workouts/log` → `app/(app)/workouts/log.tsx`.
- Entry: Overview "Log workout" → `router.push("/(app)/workouts/log")`; Command Center "Workouts" → `router.push("/(app)/workouts")` (overview); dash tile "Workouts" → `route: "/(app)/workouts"`.

**Exercise library**
- Route: `(app)/workouts/exercise-picker` → `app/(app)/workouts/exercise-picker.tsx`.
- Entry: From log only — "+ exercise" per block → `router.push({ pathname: "/(app)/workouts/exercise-picker", params: { sessionId, blockId } })`. Return: `router.replace({ pathname: "/(app)/workouts/log", params: { pickedExerciseId, blockId } })`.

**Exercise detail / history**
- Route: `(app)/workouts/exercise-history` → `app/(app)/workouts/exercise-history.tsx`.
- Entry: Logger "Last" row tap → `router.push({ pathname: "/(app)/workouts/exercise-history", params: { exerciseId } })`. Screen is stub ("Coming soon").

**Timer UI**
- No dedicated route. Timer is header text in log.tsx; "⏱" opens stub modal "Timer coming next".

**Dead / duplicate / ambiguous**
- **Duplicate log entry:** `app/(app)/training/strength/log.tsx` — different flow: form-based, calls `logStrengthWorkout` (API ingest), `buildManualStrengthWorkoutPayload`, day param. Command center can push `training/strength/log` with `day`. So: two logging paths — (1) `workouts/log` (offline journal), (2) `training/strength/log` (API ingest form).
- **History:** `workouts/history` exists and is implemented (useWorkoutsHistory, raw events kind "workout"). Overview "View history" is **disabled**; no in-app link to `workouts/history` from overview. History screen has "Go to Training Overview" → `router.push("/(app)/workouts")`. So history is reachable only by direct route or deep link.
- **Workouts home:** `workouts/index.tsx` re-exports `overview`; no intermediate menu. Docs (W1_AUDIT_BUNDLE) described a menu with section links; **current code**: overview is home, single "Log workout" CTA.

---

## D. Workout logger UI audit

- **Parent screen/container:** `WorkoutLogScreen` in `app/(app)/workouts/log.tsx`; root `<View style={styles.screen}>` then `ScrollView`.
- **Grid/header:** Inline; `setGridHeader` row (Set | Reps | Weight | RPE | Action); column widths fixed (`GRID_COL_*`).
- **Active row:** Inline `View` with `setRowActive`; draft cells are Pressable → open sheet picker (reps/weight/RPE); "Log" calls `onLogDraftSet`.
- **Completed row:** `SwipeableSetRow` with row content (ordinal, reps, weight, RPE, ✓); tap cell → `setCompletedSetPicker` → same sheet; swipe → delete set.
- **Previous workout summary:** "Last: …" row above grid; `formatLastSummaryWithRpe`; onPress → `router.push(exercise-history, { exerciseId })`.
- **Add-set CTA:** "+ Add Set" in header action column; adds draft to `draftSetsBySlotId[slotId]`.
- **Number entry / picker:** Draft and completed both use one Modal (pageSheet); reps 1–30, weight 0–600 lb step 2.5 + BW, RPE —/1–10; no keyboard for these (picker only). Edit-set modal uses TextInput (keyboard) for reps, load, RPE.
- **Keyboard / sheet / modal:** `keyboardShouldPersistTaps="handled"` on ScrollView; picker is Modal + ScrollView of options; edit set is full modal with TextInputs.
- **Exercise media in logger:** Expanded card: `ExerciseMediaPreview` (hero); list row: `Image` from `getBundledExerciseAsset` or `ThumbnailPlaceholderView`.
- **Loading / empty / error:** `ui.status === "starting"` → "Starting…"; `ui.status === "idle"` + signed in → "Start an empty workout"; `ui.status === "error"` → error card with message + Dismiss; no blocks → "No blocks yet. Add a block above…"; completed → "Completed" card with session id and counts.
- **Accessibility:** `accessibilityRole="button"`, `accessibilityLabel` on main actions; "Last" row label describes "Last workout … Tap for exercise history"; error card `accessibilityLabel="workout-log-error"`.
- **Design vs "premium strength-training instrument":** Single large file; form-like grid and modals; functional but not instrument-like (no dedicated rest timer, no live volume, no charts in logger). Feels like a form with blocks/sets.
- **Performance risks:** (1) One component with many useState/useCallback; any state change re-renders the whole tree. (2) `nowTick` interval every 1s when active. (3) No memoization of list items; `blockExercises.map` / `loggedSets.map` / `drafts.map` inline. (4) Heavy inline JSX and styles in one file.

---

## E. Exercise library audit

- **Source of exercise data:** `EXERCISE_LIBRARY_V1` in `lib/workouts/exercises/library.v1.ts`; catalog in `lib/workouts/exercises/catalog.ts` (name, aliases, exerciseId).
- **Schema in code:** `ExerciseLibraryItemV1` (exerciseId, name, aliases, equipment, primaryBucket, movement, trainingType, primaryCoarse, secondaryCoarse, primaryDetailed, secondaryDetailed, cues?, description?); `ExerciseCatalogItem` (exerciseId, name, aliases).
- **Images/videos registered:** `lib/workouts/exercises/media/registry.ts` — `REGISTRY` (thumbnail require), `LOOP_VIDEO_REGISTRY` (loop mp4); only listed exerciseIds get assets; rest use `placeholder.png` or `ThumbnailPlaceholderView`.
- **Assets:** Local/bundled only (require()); no remote URLs in registry.
- **Missing media:** Exercises not in REGISTRY get placeholder; no 404 or retry; fallback is consistent.
- **Search, filters, categorization:** `searchExercises` (search.ts); `buildExerciseLibrarySections` (librarySections); picker has tabs "all" | "recent" | "popular", filters (equipment, primary, movement, trainingType), search input, highlight.
- **Library vs logger model:** Logger uses `exerciseId` (string) from catalog; reducer/journal use same id. No schema drift; library is source for names/ids in logger.
- **Duplication:** One library (library.v1.ts); one catalog (catalog.ts); one media registry. No duplicate exercise definitions. `training/strength/log` uses free-text exercise name (different model: ManualStrengthWorkoutPayload exercises[].name), not catalog ids — so two different models for "exercise" (catalog id vs name string).

---

## F. History / detail audit

- **Exercise history/detail page:** Exists as stub: `app/(app)/workouts/exercise-history.tsx`; route `(app)/workouts/exercise-history`; params `exerciseId`.
- **Data sources/selectors:** Stub shows no data; comment "TODO: Implement per-exercise history (sets over time from journal)". No selector/hook for per-exercise history yet.
- **Stats shown:** Stub shows only "Exercise: {exerciseId}" and "Coming soon."
- **Previous workout summary in logger:** "Last" row links to exercise-history with `exerciseId`; that screen does not yet show history.
- **Charts/insights:** No charts in exercise-history; overview has placeholder "Insights" (Load, Recovery, Volume "Coming soon"). No shared charts/insights component for workouts.
- **Tappable "Last" → history:** Implemented navigation; destination is stub. To support full experience: exercise-history needs data (e.g. journal events reduced by exerciseId + time) and UI (list/chart of past sets).

---

## G. Timer audit

- **Exists:** Elapsed timer only; rest timer is stub.
- **State:** In log.tsx: `nowTick` (useState, 1s interval when `ui.status === "active"` and `reduced?.startedAt`); `timerLabel` = `MM:SS` from `reduced.startedAt` and `nowTick`.
- **Scope:** Session/screen; no global timer store; interval cleared on unmount when status or startedAt dependency changes.
- **Persistence:** None; timer is derived from session start; if user backgrounds and returns, `nowTick` keeps updating (interval still running). No persist/restore of "rest until" or rest state.
- **Audio/haptics:** None in code.
- **Risks:** (1) Interval runs every second while active — minor CPU; cleanup on unmount is correct. (2) No rest timer → no intervals/timeouts for rest. (3) Stub modal does not leak resources.

---

## H. Volume calculation truth

- **Where computed:** Backend only: `services/functions/src/dailyFacts/aggregateDailyFacts.ts` — `buildStrengthFacts`: for each strength event set, `volume = set.reps * set.load`; accumulated by `set.unit` into `totalVolumeByUnit.lb` / `totalVolumeByUnit.kg`. Consumed by daily facts and Command Center.
- **Units:** Backend uses `set.unit` ('lb' | 'kg'); logger stores `loadKg`; conversion in UI (lb display) is local. Volume aggregation is per-unit; no normalization across units in one sum (lb and kg separate).
- **UI vs selector vs persisted:** Volume is not computed in logger UI. It is computed in backend from canonical strength events; displayed in Command Center from `factsDoc` / `buildStrengthCommandCenterModel`. Not in journal reducer or selectors.
- **Tests:** `services/functions/src/dailyFacts/__tests__/aggregateDailyFacts.test.ts` (mixed-unit volume); `lib/modules/__tests__/commandCenterStrength.test.ts` (totalVolumeByUnit in model).
- **Display vs stored:** Command Center shows `totalVolumeByUnit.lb` and `.kg`; backend stores in daily facts. Logger does not show volume; journal does not store volume (only sets with reps, loadKg).
- **Assumptions:** Backend assumes strength events have `reps`, `load`, `unit` per set. Logger journal has `loadKg`; sync path from journal to canonical/strength events (if any) must map to that shape for volume to be correct.

---

## I. Architecture boundary findings

- **Screens and Firebase/API:** No `firebase`, `getFirestore`, `doc(`, `collection(` in `app/`. Workout screens use: `lib/workouts/*` (journal, session engine, memory, exercises), `lib/auth/AuthProvider`, `lib/data/useWorkoutsHistory` (history screen only), `lib/api` only via ingest in `training/strength/log` (logStrengthWorkout). So: **no Firebase in screens**; data access via lib/hooks. **Verified.**
- **UI in components:** Logger UI is mostly in `app/(app)/workouts/log.tsx`; shared pieces: `components/workouts/ExerciseMediaPreview.tsx`, `ThumbnailPlaceholderView.tsx`. Grid/rows/header are in the screen file, not extracted to components.
- **Data in lib:** Journal store, session engine, selectors, memory, previousWorkout, catalog, registry, useWorkoutsHistory — all under `lib/`. **Respected.**
- **State:** No global "workout" store; session state in component state + journal (AsyncStorage) + activeSessionStorage. **OK.**
- **Navigation in app:** Routes and `router.push`/`replace` in app; no navigation logic in lib. **OK.**
- **Paths/schemas:** Journal: `workouts:journal:v1:u:{uid}:s:{sessionId}:events`; raw event kinds `workout`, `strength_workout` in contracts; no invented Firestore paths in client (journal is AsyncStorage). **OK.**
- **Reducers/engines/journal:** `lib/workouts/journal/reducer.ts` — `reduceWorkoutSessionV1`; `lib/workouts/sessionEngine/commands.ts` — append-only commands. These define session semantics; no other reducer for workout session. **Files that define semantics:** `lib/workouts/journal/types.ts`, `lib/workouts/journal/reducer.ts`, `lib/workouts/sessionEngine/commands.ts`, `lib/workouts/journal/store.ts`.

---

## J. Test / gate results

- **npm run typecheck:** **Pass** (exit 0).
- **npm run lint:** **Pass** (exit 0).
- **npm test:** **Not run successfully in audit environment.** Error: `listen EPERM: operation not permitted 127.0.0.1` (Firestore emulator). Test script: `node scripts/test/run-jest-with-firestore-emulator.mjs`. **Recommend re-run with network/permissions** to confirm.
- **npm run check:invariants:** **Pass** (all CHECKs 1–22 + console discipline + client trust boundary). No workout-specific checks.

**Failing files/errors:** N/A for typecheck/lint/invariants. Tests not executed; no workout-specific failure list.

---

## K. Highest-risk issues

1. **Two logging flows** — `workouts/log` (journal, offline-first) vs `training/strength/log` (API ingest, form). Different models (session + catalog ids vs free-text name + sets). User and code paths can diverge; sync from journal to backend may be undefined or separate.
2. **Logger in one giant file** — Single ~1.5k-line screen; hard to maintain; re-renders and list perf not tuned; extraction to components/selectors would reduce risk.
3. **Exercise history stub** — "Last" links to exercise-history but screen is stub; no data layer for per-exercise history from journal; product promise not yet implemented.
4. **History screen not linked** — Overview "View history" disabled; no in-app path to `workouts/history`; history route is effectively orphaned from main nav.
5. **Volume only on backend** — Logger does not show volume; no UI consistency check; if journal sync to canonical is wrong, volume in Command Center could be wrong with no logger-side visibility.
6. **moduleReadiness vs usage** — `workouts.log` and `workouts.history` marked SOON/disabled, but overview pushes to log and log is fully implemented; readiness and UI may be out of date.
7. **Rest timer missing** — Stub only; no rest logic, persistence, or cleanup to implement later.
8. **Tests require emulator** — Workout tests not run in this audit; regressions could exist; no invariant or CI guard specific to workout journal semantics.

---

## L. Highest-leverage next steps (audit only; no implementation)

1. **Unify or clearly separate logging flows** — Decide single source of truth: journal-first then sync, or API-only; document and align `workouts/log` vs `training/strength/log` and data model (catalog id vs name).
2. **Wire history into nav** — Either enable "View history" on overview and link to `workouts/history`, or remove/repurpose the disabled button; avoid orphan routes.
3. **Implement exercise-history data + UI** — Add selector/hook from journal (or future API) for sets by exerciseId over time; replace stub so "Last" tap delivers real history.
4. **Extract logger UI into components** — Move grid header, active row, completed row, "Last" summary, and possibly block section into `components/workouts/*` to reduce re-render surface and improve maintainability.
5. **Align moduleReadiness with code** — Set `workouts.log` (and optionally history) to READY if they are the supported paths, or keep SOON and hide/redirect accordingly.
6. **Add workout/journal invariants (optional)** — If journal semantics are constitutional, add a CHECK (e.g. journal event kinds, or no client write to derived workout facts) and document in INVARIANT_ENFORCEMENT_MAP.
7. **Run full test suite** — With Firestore emulator or CI; classify any failures as pre-existing vs workout-related.
8. **Define sync path journal → backend** — If journal is canonical for in-session data, document how completed sessions become raw/canonical events and daily facts (volume, strength summary); ensure one path and test it.

---

*End of audit. All paths and names are as in the repo at audit time.*
