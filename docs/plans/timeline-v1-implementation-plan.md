# Timeline V1 — Post-Merge Implementation Plan

**Status:** PLAN ONLY — no implementation authorized
**Date:** 2026-07-16
**Audit branch:** `audit/timeline-v1` (documentation only; **not** the implementation branch)

---

## Implementation boundary

| Rule | Detail |
|---|---|
| Start gate | PR #180 → #182 → #183 merged in order |
| Base | Verified `origin/main` after merge |
| Pre-implementation | `main` CI green + one physical Dash smoke |
| Worktree | **New** `feat/timeline-v1` worktree from verified `origin/main` |
| Docs transfer | Cherry-pick or copy approved audit/contract docs only |
| Forbidden | Timeline code on `audit/timeline-v1` or `feat/weekly-fitness-v2` |

---

## Proposed focused commits (post-merge)

### Commit 1 — `feat(api): add bounded timeline-feed cursor contract`

| Field | Value |
|---|---|
| Responsibility | Additive `GET /users/me/timeline-feed` + Zod DTOs in contracts |
| Layers | `lib/contracts`, `services/api/src/routes/usersMe.ts`, OpenAPI, gateway snapshot tests |
| Tests | API route tests: pagination, busy-day continuation, anchorDay, empty day, auth UID |
| Deployment | API + Gateway deploy required before mobile consumes |
| Gate | No provider calls/writes in handler; cursor opaque; deterministic order |

### Commit 2 — `feat(timeline): pure presentation normalization and dedupe`

| Field | Value |
|---|---|
| Responsibility | Server-side assembler + pure normalizer; dedupe hierarchy |
| Layers | `services/api/src/lib/timeline/` (new), contract tests |
| Tests | Unit: ordering, tie-break, dedupe, synthetic IDs, partial day |
| Deployment | Bundled with Commit 1 |
| Gate | No prohibited DTO fields |

### Commit 3 — `refactor(timeline): remove Plan vs actual and day arrows`

| Field | Value |
|---|---|
| Responsibility | Remove `TimelinePlanVsActualHeader`, `TimelineDateNavigator`, `useTodayCommand` from Timeline screen |
| Layers | `lib/ui/timeline/TimelineDayScreen.tsx`, tests |
| Tests | Screen tests: plan header absent; navigator absent |
| Deployment | Mobile only |
| Gate | T4–T5 |

### Commit 4 — `feat(timeline): continuous SectionList feed hook`

| Field | Value |
|---|---|
| Responsibility | `useTimelineFeed` cursor state; `SectionList` UI; sticky headers |
| Layers | `lib/features/timeline/`, `lib/ui/timeline/` |
| Tests | Hook tests: pages, merge, user-switch reset |
| Deployment | Mobile only (after API live) |
| Gate | T6–T7, T25–T26 |

### Commit 5 — `feat(timeline): calendar icon and date jump sheet`

| Field | Value |
|---|---|
| Responsibility | Replace gear with calendar; `MonthGrid` sheet; anchor jump |
| Layers | `TimelineDayScreen`, calendar sheet component |
| Tests | A11y label; jump issues one request; cancel preserves scroll |
| Deployment | Mobile only |
| Gate | T2–T3, T8 |

### Commit 6 — `feat(timeline): day context sleep recovery and activity live`

| Field | Value |
|---|---|
| Responsibility | Sleep/Recovery context rows; Activity live marker; bedtime row |
| Layers | Feed assembler + VM mapping |
| Tests | Context ordering; no midnight steps; live dedupe |
| Deployment | API + mobile |
| Gate | T10–T17, T21 |

### Commit 7 — `feat(timeline): event navigation and quick actions`

| Field | Value |
|---|---|
| Responsibility | `destination` routing; quick-add affordances when product approves |
| Layers | UI chrome, reuse log hub routes |
| Tests | `resolveTimelineItemHref` parity |
| Deployment | Mobile |
| Gate | T18–T23 |

### Commit 8 — `fix(timeline): privacy performance ownership guards`

| Field | Value |
|---|---|
| Responsibility | UID-scoped caches; telemetry helper; forbidden-key guards |
| Layers | `lib/api/mobileHttpTelemetry` pattern for Timeline; cache keys |
| Tests | Logger capture; user-switch; no cross-user cache |
| Deployment | Mobile |
| Gate | T27–T30, ownership tests |

### Commit 9 — `docs(timeline): update system state and acceptance record`

| Field | Value |
|---|---|
| Responsibility | `docs/SYSTEM_STATE.md`, audit addendum |
| Layers | docs only |
| Tests | `git diff --check` |
| Deployment | none |
| Gate | Documentation complete |

---

## Test strategy (implementation phase)

| Area | Existing tests to extend | New tests |
|---|---|---|
| API | `timeline.test.ts` | `timeline-feed.test.ts` |
| VM | `buildTimelineDayVm.test.ts` | feed normalizer tests |
| Hook | `timeline-no-multiday.test.tsx` | `useTimelineFeed` tests |
| Screen | `timeline-fail-closed.test.tsx` | continuous feed + calendar |
| CI | `phase2-timeline-ordering-stable.test.ts` | ordering parity |

---

## Physical acceptance (post-implementation)

Run T1–T35 matrix on device after staging API attached. VoiceOver, Dynamic Type, Reduce Motion, and User A→B remain gated separately.

---

## Risks

| Risk | Mitigation |
|---|---|
| API deploy before mobile | Feature-flag feed endpoint consumer |
| Cache UID leak | Commit 8 mandatory before merge-ready |
| SectionList perf | Measure; FlashList only if proven necessary + approved dependency |
| Busy-day truncation | Commit 1 cursor continuation |

---

## Not in v1 slice

- Day Index Firestore migration
- Persisted reminders
- Recommendation cards
- Raw weight hydration on mobile
