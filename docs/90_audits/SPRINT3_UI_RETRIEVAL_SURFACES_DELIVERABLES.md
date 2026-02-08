# Sprint 3: UI Scaffolding + Read-Only Retrieval Surfaces — Deliverables

**Date:** 2026-02-08  
**Status:** Complete  
**Scope:** Phase 1 UI skeleton with Library, Timeline, Event Detail, fail-closed

---

## 1. Sprint 3 Overview

Sprint 3 delivers a Phase 1 UI skeleton that makes Sprint 1 data inspectable through the Sprint 2 trust layer. Bottom tab navigation, Library, Timeline, Event Detail, and fail-closed behavior are implemented and tested.

---

## 2. Objectives + Expected Outcomes

| Objective | Outcome |
|-----------|---------|
| Bottom tab navigation | 5 tabs: Library, Manage, Timeline, Stats, Dash; Dash is initial route and rightmost |
| Library | Category list → category detail → event detail |
| Timeline | Day list → day detail → event detail |
| Event detail | Canonical fields + provenance (collapsed; auto-expand on failures) |
| Fail-closed | ApiFailure kind:"contract" → ErrorState with "Data validation failed" |
| Tests | Navigation test + fail-closed test |
| Proof gates | typecheck, lint, test all green |

---

## 3. Step-by-Step Implementation

### A) Baseline Evidence

| Evidence | Location |
|----------|----------|
| Root layout | `app/_layout.tsx` |
| App layout (Stack) | `app/(app)/_layout.tsx` |
| Existing screens | `app/(app)/command-center/index.tsx`, `failures/index.tsx`, etc. |
| Design primitives | `lib/ui/ModuleScreenShell.tsx`, `ModuleEmptyState.tsx` |
| API layer | `lib/api/usersMe.ts`, `lib/api/validate.ts`, `lib/api/failures.ts` |
| Truth outcome | `lib/data/truthOutcome.ts` |
| Sprint 1 endpoints | `GET /users/me/timeline`, `/events`, `/lineage`, `/uploads`, `/failures` |

### B) Client API Additions

| Function | File | Schema |
|----------|------|--------|
| `getTimeline(start, end, token)` | `lib/api/usersMe.ts` | timelineResponseDtoSchema |
| `getEvents(token, opts)` | `lib/api/usersMe.ts` | canonicalEventsListResponseDtoSchema |
| `getLineage(token, opts)` | `lib/api/usersMe.ts` | lineageResponseDtoSchema |

### C) Data Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useTimeline` | `lib/data/useTimeline.ts` | Timeline day aggregates |
| `useEvents` | `lib/data/useEvents.ts` | Canonical events list |
| `useLineage` | `lib/data/useLineage.ts` | Lineage for event detail |

### D) UI Primitives

| Component | File | Purpose |
|-----------|------|---------|
| `ScreenContainer` | `lib/ui/ScreenStates.tsx` | Safe area + padding |
| `ErrorState` | `lib/ui/ScreenStates.tsx` | Fail-closed error UI; `isContractError` for "Data validation failed" |
| `LoadingState` | `lib/ui/ScreenStates.tsx` | Loading spinner + message |
| `EmptyState` | `lib/ui/ScreenStates.tsx` | Calm empty message |

### E) Navigation Structure

| Route | File | Purpose |
|-------|------|---------|
| `(app)/(tabs)` | `app/(app)/(tabs)/_layout.tsx` | Tabs layout |
| `(app)/(tabs)/index` | `app/(app)/(tabs)/index.tsx` | Redirect to dash |
| `(app)/(tabs)/dash` | `app/(app)/(tabs)/dash.tsx` | System status (contextual counts) |
| `(app)/(tabs)/library` | `app/(app)/(tabs)/library/index.tsx` | Category list |
| `(app)/(tabs)/library/[category]` | `app/(app)/(tabs)/library/[category].tsx` | Category detail |
| `(app)/(tabs)/manage` | `app/(app)/(tabs)/manage.tsx` | Manage placeholder |
| `(app)/(tabs)/timeline` | `app/(app)/(tabs)/timeline/index.tsx` | Day list |
| `(app)/(tabs)/timeline/[day]` | `app/(app)/(tabs)/timeline/[day].tsx` | Day detail |
| `(app)/(tabs)/stats` | `app/(app)/(tabs)/stats.tsx` | Stats placeholder |
| `(app)/event/[id]` | `app/(app)/event/[id].tsx` | Event detail + lineage |

### F) RouteGuard Update

- `app/_layout.tsx`: Redirect to `/(app)/(tabs)/dash` (was `/(app)/command-center`)
- `app/(app)/index.tsx`: Redirect to `/(app)/(tabs)/dash`

---

## 4. Proof Mapping

### Screen → API → Schema → Fail-Closed UI → Tests

| Screen | API | Schema | Fail-Closed | Test |
|--------|-----|--------|-------------|------|
| Dash | getFailuresRange, getUploads, getTimeline | — | ErrorState on error | — |
| Library index | getFailuresRange, getUploads | — | — | — |
| Library category | getEvents | canonicalEventsListResponseDtoSchema | ErrorState isContractError | — |
| Timeline index | getTimeline | timelineResponseDtoSchema | ErrorState isContractError | timeline-fail-closed.test.tsx |
| Timeline day | getEvents, getFailures | — | ErrorState isContractError | — |
| Event detail | getEvents, getLineage, getFailures | lineageResponseDtoSchema | ErrorState isContractError | — |

### Fail-Closed Contract Error Flow

1. API returns `ApiFailure` with `kind: "contract"` (Zod schema mismatch)
2. `truthOutcomeFromApiResult` returns `{ status: "error", error, requestId }`
3. Screen checks `error.toLowerCase().includes("invalid")` → `isContractError`
4. `ErrorState` with `isContractError={true}` renders "Data validation failed" and "Try again"
5. List/content is NOT rendered

### Test Coverage

| Test | File | Assertion |
|------|------|-----------|
| Tabs layout | `tabs-navigation.test.tsx` | initialRouteName=dash; 5 tabs in order |
| ErrorState contract | `ScreenStates.test.tsx` | isContractError → "Data validation failed" |
| Timeline fail-closed | `timeline-fail-closed.test.tsx` | useTimeline error → ErrorState, no list |

---

## 5. Acceptance Checklist

```bash
npm run typecheck       # ✅
npm run lint            # ✅
npm test                # ✅ 215 tests
```

---

## 6. UNVERIFIED List

- **Manual E2E**: Tab navigation and screen flows have not been manually verified on device/simulator. Jest tests cover layout and fail-closed behavior.
- **Stats deep UI**: Stats is a placeholder; interpretive surface design deferred.
- **Manage entry flows**: Manage links to Command Center; full entry flows deferred to Sprint 4+.

---

## 7. File Paths Summary

| Category | Paths |
|----------|-------|
| API | `lib/api/usersMe.ts` (getTimeline, getEvents, getLineage) |
| Hooks | `lib/data/useTimeline.ts`, `useEvents.ts`, `useLineage.ts` |
| UI | `lib/ui/ScreenStates.tsx` |
| Tabs | `app/(app)/(tabs)/_layout.tsx`, `index.tsx`, `dash.tsx`, `manage.tsx`, `stats.tsx` |
| Library | `app/(app)/(tabs)/library/index.tsx`, `library/[category].tsx` |
| Timeline | `app/(app)/(tabs)/timeline/index.tsx`, `timeline/[day].tsx` |
| Event | `app/(app)/event/[id].tsx` |
| Layout | `app/_layout.tsx`, `app/(app)/_layout.tsx`, `app/(app)/index.tsx` |
| Tests | `lib/ui/__tests__/ScreenStates.test.tsx`, `app/(app)/(tabs)/__tests__/tabs-navigation.test.tsx`, `timeline-fail-closed.test.tsx` |
