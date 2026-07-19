# Timeline V1 — Product and Data Contract

**Status:** LOCKED (documentation only)
**Date:** 2026-07-16
**Base ref:** `feat/weekly-fitness-v2` @ `5423bcb` (source-equivalent for Timeline analysis)
**Implementation:** blocked until Weekly Fitness stack merges to `main`

Privacy-safe. No UIDs, health values, tokens, raw logs, or private identifiers.

---

## 1. Purpose

Timeline V1 is the user's **continuous chronological health day log**: one vertically scrollable feed anchored on Today, with honest gaps, trusted server read models, and safe navigation to module detail surfaces.

## 2. User problem

Users need to understand **what happened today and recently** across sleep, recovery, activity, workouts, nutrition, and manual captures — without hunting module-by-module or inferring truth from partial client joins.

## 3. Product principles

1. **Server truth first** — UI renders approved read models; no on-device scoring or trend math.
2. **Honest uncertainty** — missing ≠ zero; incomplete ≠ complete; reminders ≠ facts.
3. **Bounded reads** — no full-history hydration; no raw-event year scans on mobile.
4. **One feed** — continuous scroll replaces day-arrow paging and Plan vs actual on Timeline.
5. **Settings elsewhere** — Timeline gear becomes calendar; settings stay on Settings surfaces.

## 4. In-scope v1

- Header: `Timeline` / `Your day, in order` + calendar icon (44×44).
- Continuous virtualized feed with sticky day headers.
- Today initial anchor; older days load on scroll-down.
- Calendar sheet date jump + Return to Today.
- Day-start **Sleep** and **Recovery** context rows (not midnight fabrications).
- Chronological actions from trusted canonical/raw read models.
- **Activity so far** live marker (today only) at current-time position.
- **Went to sleep** at actual sleep-start when trustworthy.
- Distinct presentation for facts vs quick-add entry points.
- Bounded server pagination with opaque cursor.
- Fail-closed errors; partial-day honesty; user-switch reset.

## 5. Non-goals

- Plan vs actual / program targets on Timeline.
- Left/right day arrows or `< Today >` row on Timeline.
- Multi-day `GET /users/me/timeline` aggregate scan on tab mount.
- Mobile raw-event history hydration.
- Provider refresh/backfill triggered by Timeline mount.
- On-device AI inference.
- Persisted reminder creation (deferred — see §15).
- Year→month drill-down navigation (deferred).

## 6. Header and calendar

```text
Timeline                                      [calendar icon]
Your day, in order
```

| Control | Requirement |
|---|---|
| Calendar icon | Replaces `SettingsGearButton`; min 44×44; `accessibilityRole=button`; label `Open timeline calendar` |
| Sheet | Native-feeling month grid (reuse `MonthGrid` / existing calendar primitives) |
| Cancel | Preserves scroll position |
| Select date | Loads bounded page anchored at selected day; scroll to day header |
| Empty selected day | Honest empty state; no silent fallback to another day |

## 7. Removed Plan vs actual UI

Remove from Timeline entirely:

- `TimelineDateNavigator` prev/next/today row
- `TimelinePlanVsActualHeader`
- `useTodayCommand` on Timeline screen
- Plan completion % and target rows (Activity, Workout, Cardio, Food calories, Protein)

**Files to change at implementation (not in this task):**

- `lib/ui/timeline/TimelineDayScreen.tsx`
- `lib/ui/timeline/TimelinePlanVsActualHeader.tsx` (bypass/remove usage)
- `lib/ui/timeline/TimelineDateNavigator.tsx` (remove from Timeline screen)

Program/goal surfaces remain on Dash / fitness-goals / module overviews.

## 8. Continuous feed

| Behavior | Contract |
|---|---|
| Initial anchor | Today (device local `DayKey`) |
| Scroll down | Load older bounded pages |
| Day headers | Sticky `SectionList` sections |
| Virtualization | `SectionList` (no new dependency; FlashList not in repo) |
| Keys | Stable `dedupeKey` / `id` per item |
| Memory | Drop distant pages optional in v1.1; v1 caps in-memory pages |
| Focus return | Preserve scroll offset |
| Later-page failure | Keep loaded pages; bounded retry |

## 9. Day headers

| Case | Label pattern |
|---|---|
| Today | `TODAY` |
| Yesterday | `YESTERDAY` |
| Other | `WEEKDAY, MONTH DAY` (local timezone) |

- `accessibilityRole=header`
- Deterministic section keys: `day:{DayKey}`
- No duplicate Today section
- No future days

## 10. Sleep context (day-start)

First row in each day section (display role `day_context`).

| Field | Rule |
|---|---|
| Score | Trusted SleepNight score when present |
| Duration | Trusted total/main sleep minutes |
| Summary | Concise server-provided or VM summary |
| Attribution | Wake day / attributed calendar day |
| Timestamp | Wake time when shown on rail; context block is not a midnight event |
| Destination | Recovery Sleep route for day |
| Unavailable | Honest empty copy; no Readiness substitution |

## 11. Recovery context (day-start)

Second row (display role `day_context`).

| Field | Rule |
|---|---|
| Score | Exact-day Readiness from `useReadinessView` equivalent server truth |
| States | connected / disconnected / no-data honest |
| Destination | Readiness overview |
| No fallback | Prior-day readiness never labeled as current |

## 12. Activity live / final

| Day | Behavior |
|---|---|
| Today | One `Activity so far` live marker (`isSynthetic=true`, `dedupeKey=activity_live:{day}`) at current local time position; updates in place |
| Historical | Final activity summary milestone when DailyFacts/activity read model supports it; **no** midnight Steps row |
| Forbidden | `12:00 AM — Steps` canonical fabrication |
| AH boundary | No broad Apple Health backfill on Timeline mount; reuse existing today-steps read path with bounded refresh |

Refresh cadence: focus return + explicit pull-to-refresh only.

## 13. Supported chronological actions (v1)

| Domain | v1 | Source | Notes |
|---|---:|---|---|
| Strength workout | yes | Canonical `strength_workout` / `workout` | Actual `start` timestamp |
| Cardio session | yes | Canonical workout kinds → cardio route | When classified cardio |
| Meal/snack | yes | Raw `nutrition` with payload | Canonical nutrition skipped in VM today |
| Caffeine | yes | Nutrition raw heuristic | Same pipeline |
| Incomplete capture | yes | Raw `incomplete` | Actionable |
| Weight | partial | Canonical `weight` events | Raw weight not fetched on Timeline today — extend feed query |
| Body measurement | defer | — | No stable Timeline feed item yet |
| Lab/test | defer | — | Route exists; feed assembly deferred |
| Insight | yes | Insights list | Passive; not a user action |
| Note/manual | defer | — | No dedicated note kind in active builder |
| Bedtime | yes | SleepNight `startedAt` when trustworthy | Separate from next-day sleep summary |
| Reminder | defer | — | No persisted reminder model |
| Recommendation | defer | — | No recommendation feed model |

## 14. Bedtime

- Title: `Went to sleep`
- Timestamp: `SleepNight.startedAt` when valid
- Day: local date of sleep start
- Destination: Sleep detail when supported
- Absent when timestamp missing/untrusted
- Dedupe: one per attributed night (`dedupeKey=sleep_start:{anchorDay}`)

## 15. Reminders and quick add

**Repository truth:** no canonical persisted reminder collection for Timeline.

| Capability | v1 |
|---|---|
| Persisted reminder create | **Deferred** |
| Quick-add routes | Reuse existing module log routes |
| Log meal | `/(app)/nutrition/search` + day param |
| Log workout | Workouts log routes |
| Log cardio | Cardio log routes |
| Log weight | Body log routes |
| Add note | Defer until note model exists |
| Add reminder | Defer persistence |

Presentation roles `reminder` and `recommendation` reserved for future; v1 must not fabricate them.

## 16. Calendar jump

| Step | Behavior |
|---|---|
| User picks day | Single `GET /users/me/timeline-feed?anchorDay=…&limit=…` |
| Response | Selected day section + bounded older sections |
| Scroll | Focus selected day header |
| Return to Today | Reset anchor to today; clear cursor; scroll to top |

No per-day fan-out. No full-history scan.

## 17. Timeline presentation DTO

Additive contract (names illustrative; implement in `@oli/contracts` at implementation time):

```typescript
type TimelineDisplayRole =
  | "day_context"
  | "chronological_event"
  | "live_marker"
  | "reminder"      // reserved
  | "recommendation"; // reserved

type TimelinePresentationItem = {
  id: string;
  kind: string;              // closed union grounded in repo kinds
  day: string;               // DayKey
  occurredAt: string;        // ISO
  timezone: string;          // IANA
  title: string;
  summary?: string;
  status: "ready" | "missing" | "disconnected" | "partial" | "incomplete";
  source: string;            // closed provenance union
  provenance?: string;
  destination: string;     // app route template
  accessibilityLabel: string;
  dedupeKey: string;
  isSynthetic: boolean;
  displayRole: TimelineDisplayRole;
};
```

**Prohibited on DTO:** UID, email, token, key, raw path, raw provider payload, provider cursor, raw-event body, debug fields.

## 18. Pagination and cursor

**Endpoint (additive):** `GET /users/me/timeline-feed`

| Parameter | Rule |
|---|---|
| `anchorDay` | Optional DayKey; default today |
| `cursor` | Opaque server-issued; omitted on first page |
| `limit` | Default 50; max 100 items per page |

| Response field | Rule |
|---|---|
| `items` | `TimelinePresentationItem[]` deterministic order |
| `sections` | Day keys present in page |
| `nextCursor` | Opaque; null when end of history window |
| `hasMore` | boolean |

**Page semantics:** counts **items**, not days. Busy day continues with same day before crossing to prior day.

**Ordering:** `occurredAt` asc → kind priority → `id` asc.

**Kind priority (equal `occurredAt`):** `sleep_start` < `nutrition` < `incomplete` < `workout_strength` < `workout_cardio` < `workout` < `steps` < `weight` < `insight` < `sleep_wake` < `live_marker`.

**Cursor internals (server-only):** encode last `(occurredAt, kindPriority, id)` — never exposed.

## 19. Ordering and dedupe

| Level | Rule |
|---|---|
| Sections | Today first; older days descending |
| Within day | Sleep context → Recovery context → chronological block (includes bedtime at real time) |
| Dedupe | (1) canonical id (2) domain id (3) server source identity (4) synthetic id |
| Forbidden alone | title + displayed time |

## 20. State matrix

| State | UX |
|---|---|
| Initial loading | Full-screen loading |
| Older-page loading | Footer spinner |
| Calendar-jump loading | Inline loading; preserve prior list optional |
| Today empty | `TimelineEmptyState` variant |
| Historical empty | Honest per-day empty |
| Partial day | Badge when pagination truncated |
| Provider disconnected | Module-specific honest copy on context rows |
| Provider no data | Distinct from zero |
| Recoverable API error | `ErrorState` + retry |
| Pagination error | Inline retry; keep pages |
| Selected date unavailable | Error; no date substitution |
| Offline/cached | Read-through only when existing cache helpers are UID-scoped |
| User switch | Clear pages, cursor, selection, synthetic live state |
| Unauthorized | Auth gate |
| Contract error | Fail-closed `ErrorState` |

## 21. Navigation

Item tap uses `destination` route templates only (`resolveTimelineItemHref` rules preserved).

## 22. Accessibility

Physical acceptance matrix (implementation gate — **not passed in this doc task**):

- T2–T4, T8–T9, T22–T23, T31–T35 from audit acceptance list
- 44pt calendar and row targets
- Headings announced per section
- Decorative rail hidden from a11y
- Dynamic Type / Reduce Motion / light-dark parity

## 23. Privacy and ownership

| Rule | Requirement |
|---|---|
| UID | Auth middleware only |
| Caller UID param | Forbidden |
| Cross-user cache | Forbidden — **fix required:** current `timelineCache` keys omit UID |
| DTO | No UID/email |
| Telemetry | Allowlist only (see audit §31) |
| Provider GET | Zero provider calls during Timeline feed GET |
| Writes | Zero during GET |

## 24. Request budgets (targets)

| Action | Max requests | Notes |
|---|---:|---|
| Cold mount | 1 | `timeline-feed` first page |
| Older page | 1 | cursor continuation |
| Calendar jump | 1 | anchor reset |
| Return to Today | 1 | anchor=today |
| Focus return | 0–1 | optional bounded refetch |
| User switch | 0 | reset local state |

Architectural zeros: raw-event mobile hydration 0; provider GET 0; writes 0; per-item fan-out 0; per-day long-history fan-out 0; full-year hydrate 0; auto backfill 0; auto refresh 0; loops 0.

## 25. AI-readiness

V1 performs no inference. Preserve stable fields for future IntelligenceContext consumption. Recommendations remain distinct from facts.

## 26. Acceptance criteria

T1–T35 defined in implementation plan. **None marked PASS** in this documentation task.

## 27. Deployment and migration impact

- Additive API route + contract types
- Gateway OpenAPI registration required at implementation
- No Firestore migration for v1 feed (reads existing collections)
- No mobile deploy until stack on `main`

## 28. Deferred follow-ups

- Persisted reminders
- Recommendations feed
- Body measurement / lab rows on Timeline
- Day Index backend optimization
- FlashList evaluation if SectionList perf insufficient
- UID-scoped cache hardening across all Timeline hooks
