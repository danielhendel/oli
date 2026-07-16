# Timeline V1 — Architecture Audit (Complete)

**Date:** 2026-07-16
**Audit branch:** `audit/timeline-v1`
**Audit worktree:** `/Users/danielhendel/oli-timeline-audit-v1`
**Source base:** `feat/weekly-fitness-v2` @ `5423bcb` (source-equivalent; see §2)
**Related:** `docs/product/timeline-v1-contract.md`, `docs/plans/timeline-v1-implementation-plan.md`

Privacy-safe. No UIDs, health values, tokens, raw logs, event IDs, or cursor values.

---

## 1. Repository identity

| Field | Value |
|---|---|
| Worktree | `/Users/danielhendel/oli-timeline-audit-v1` |
| Branch | `audit/timeline-v1` |
| Audit HEAD (pre-doc commit) | `38b75a32dc81ab23646482ba8f10abdcd3d43d81` |
| Feature HEAD | `34a113fc47bda1a2a15345a6e49084388acb9092` |
| Merge base | `5423bcb2ae977e23b7fe9e320ca8bde9a0ca1c39` |
| Implementation branch | **Never** `audit/timeline-v1` |

---

## 2. Source-lineage verification

`git diff --name-status 5423bcb..origin/feat/weekly-fitness-v2`:

```text
M  docs/audits/2026-07-15-weekly-fitness-v2-final-gate.md
```

**Classification:** documentation-only delta since audit base. Timeline architecture assumptions remain current. Audit branch is **not** merged into feature branch per instruction.

---

## 3. Roadmap phase and sprint classification

| Source | Finding |
|---|---|
| `docs/00_truth/phase2/PHASE_2_DEFINITION.md` | Phase 2 — Timeline is **primary interface**; gaps/fuzziness required |
| `docs/10_product/roadmap/ROADMAP_REALITY.md` | Stale vs code; code wins — visualization exists beyond roadmap stub |
| Sprint classification | **Phase 2 / Command Center shell** — Timeline tab is Phase 1 shell with Phase 2 single-day rewrite |

**Why Timeline now:** Weekly Fitness runtime repairs closed; deferred WF gates documented; Timeline audit authorized without stack merge.

**Definition of done (implementation):** bounded feed API, continuous UI, privacy guards, T1–T35 acceptance, no architectural zeros violated.

**Doc/code conflict:** Phase 2 doc requires year→month→day navigation; current mobile implements **single-day** + deep link only. V1 contract defers year/month calendar to later; documents discrepancy.

---

## 4. Active route/component graph

| Layer | Active file/symbol | Responsibility | Current gap |
|---|---|---|---|
| Tab registration | `app/(app)/(tabs)/_layout.tsx` | Timeline tab | — |
| Tab route | `app/(app)/(tabs)/timeline/index.tsx` | Delegates to screen | — |
| Deep link | `app/(app)/(tabs)/timeline/[day].tsx` | `initialDay` param | Same screen; no continuous history |
| Screen | `lib/ui/timeline/TimelineDayScreen.tsx` | Day state, PTR, states | Single day only |
| Header | `TabRootScreenHeader` | Title/subtitle/gear | Gear must → calendar |
| Day nav | `TimelineDateNavigator` | Prev/next/today | **Remove in v1** |
| Plan header | `TimelinePlanVsActualHeader` | Targets | **Remove in v1** |
| List | `TimelineRail` | `FlatList` rail | Single day; not SectionList |
| Card | `TimelineEventCard` | Row UI | — |
| Empty | `TimelineEmptyState` | Empty copy | — |
| Hook | `useTimelineDay` | **Active** | 5 requests/day; limit 100 |
| Guarded hook | `useTimeline` | **Inactive on tab** | Multi-day aggregates only |
| VM builder | `buildTimelineDayVm` | Pure merge/sort | No sleep/recovery context rows |
| Client | `getEvents`, `getRawEvents`, `getSleepNight`, … | `lib/api/usersMe.ts` | Per-hook calls |
| DTOs | `@oli/contracts` retrieval schemas | Parse | No presentation feed DTO |
| API | `GET /users/me/events`, `/raw-events`, `/timeline`, … | UID-scoped reads | `/timeline` ≠ item feed |
| Storage | Firestore `users/{uid}/events`, `rawEvents`, `dailyFacts`, … | Server reads | No Day Index |

---

## 5. Hook/client/API lineage

**Active path:**

```text
TimelineDayScreen
  → useTimelineDay(day)
      → useEvents({ startIso, endIso, limit: 100 })
      → useRawEvents({ day, kinds: [nutrition, incomplete], includePayload, limit: 100 })
      → useSleepNight(day)
      → useDailyFacts(day)
      → useInsights(day)
  → buildTimelineDayVm(...)
```

**Guarded path:** `useTimeline({ start, end })` → `GET /users/me/timeline` — **zero call sites** outside `useTimeline.ts` (confirmed).

---

## 6. Current single-day behavior

| Aspect | Current |
|---|---|
| Title | `Timeline` |
| Subtitle | `Your day, in order` |
| Settings | `SettingsGearButton` (must become calendar) |
| Day navigation | `TimelineDateNavigator` prev/next + conditional Today button |
| Plan vs actual | `useTodayCommand` + `TimelinePlanVsActualHeader` on today only |
| List model | Flat chronological `TimelineDayItem[]` for one day |
| Event kinds | nutrition, incomplete, canonical workouts/steps/weight/sleep, insights, sleep_wake |
| Loading | Canonical events gate `partial`/`error` |
| Empty | `TimelineEmptyState` |
| Virtualization | `FlatList` in `TimelineRail` |
| Focus | `useIsFocused` disables fetches when blurred |
| PTR | `cacheBust: timelinePull:${Date.now()}` on all hooks |
| Telemetry | Uses shared mobile HTTP telemetry (post-#182 repair) |

---

## 7. Current guarded multi-day behavior

`GET /users/me/timeline?start&end` returns **per-day aggregates** (counts, completeness), not chronological items. Scans `events`, `rawEvents`, `dailyFacts`, `insights`, `intelligenceContext`, `derivedLedger` per day in range. **Not used** by active tab (regression test enforced).

---

## 8. Current 100-item truncation risk

| Hook | Limit | API default | Cursor followed? |
|---|---:|---:|---|
| `useEvents` | **100** | 50 | **No** |
| `useRawEvents` | **100** | 50 | **No** |

**Confirmed:** busy day with >100 canonical events or >100 nutrition/incomplete raw rows **truncates silently**. APIs support `nextCursor` (events, raw-events) but mobile ignores it.

---

## 9. Current ownership model

| Check | Status |
|---|---|
| UID from `requireUid` middleware | yes |
| Caller UID query param | no |
| User paths under `users/{uid}` | yes |
| DTO includes UID | no |
| Cross-user cursor | prevented server-side |
| Client cache UID-scoped | **NO — gap** (`timelineCache`/`eventsCache` keys omit uid) |
| Provider call on Timeline GET | no (current endpoints) |
| Writes on Timeline GET | no |

---

## 10. Current request budget (single day, tab focused)

| Request | Endpoint |
|---|---|
| 1 | `GET /users/me/events` |
| 1 | `GET /users/me/raw-events` |
| 1 | `GET /users/me/sleep-night` |
| 1 | `GET /users/me/daily-facts/:day` |
| 1 | `GET /users/me/insights` |

**Total: 5 requests per focused day.** Not one-request-per-item. **Is** one-request-per-day for each enabled hook. Continuous history would multiply without feed endpoint — **unacceptable for v1**.

---

## 11. Domain data-lineage table

| Domain | Trusted source | Read model | Current API | Timestamp | Day attribution | Destination | Gap |
|---|---|---|---|---|---|---|---|
| Sleep summary | SleepNight | `sleepNight` doc + view DTO | `GET /sleep-night` | wake/end | anchor/wake day | recovery sleep | context row not built |
| Recovery | Readiness derived | readiness view | readiness route | day | calendar day | readiness overview | context row not built |
| Activity live | DailyFacts + AH today | facts + HK card | facts + HK | now (synthetic) | today | activity day | midnight steps not used; live marker missing |
| Strength workout | Canonical | `events` | `GET /events` | `start` | event day | workouts day | in VM |
| Cardio | Canonical | `events` | `GET /events` | `start` | event day | cardio day | taxonomy-dependent |
| Meal/snack | Raw nutrition | `rawEvents` | `GET /raw-events` | `observedAt` | day range | nutrition day | in VM |
| Weight | Canonical / raw | events / rawEvents | events only today | varies | event day | body day | raw weight not queried |
| Body measurement | Derived/canonical | partial | — | — | — | body day | **defer** |
| Bedtime | SleepNight | `startedAt` | sleep-night | sleep start | start local day | sleep detail | **not in VM** |
| Note/manual | incomplete raw | rawEvents | raw-events | observedAt | day | timeline day | incomplete only |
| Lab/test | uploads/canonical | partial | labs routes | — | — | labs | **defer** |
| Reminder | — | **none** | — | — | — | — | **defer** |
| Recommendation | — | **none** | — | — | — | — | **defer** |

---

## 12. Time/day attribution

- Day keys: `YYYY-MM-DD` local for UI selection (`getTodayDayKey`).
- Sleep attribution: `SleepNightViewDto` anchor/wake fields (server).
- Events: `start` ISO filtered to day range UTC window in `useTimelineDay`.
- Raw events: `start`/`end` day params on API.
- Time labels: `toLocaleTimeString` (device local).

---

## 13. Pagination design (locked for v1)

**Decision:** additive `GET /users/me/timeline-feed` with opaque cursor (see product contract). Extend existing `/timeline` aggregates separately for calendar markers later.

| Property | Value |
|---|---|
| Default page size | 50 items |
| Max page size | 100 items |
| Busy day | cursor continues within day |
| Cross-day | page may include multiple day sections |
| anchorDay | calendar jump bootstrap |
| Provider calls | 0 |
| Writes | 0 |

---

## 14. Calendar-jump design

Reuse `MonthGrid` + sheet pattern from module calendars (`lib/ui/calendar/MonthGrid.tsx`). Jump triggers single feed request with `anchorDay`; scroll to section key `day:{DayKey}`. Return to Today resets anchor and cursor.

---

## 15. Continuous-scroll design

Replace single-day state with `useTimelineFeed` cursor accumulator. UI: **`SectionList`** — sticky headers, no new dependency (FlashList absent from `package.json`). Initial section Today; invert scroll direction for older pages per product convention (scroll down for history).

---

## 16. Day-start context

Assemble on server in feed assembler preferred (avoids 2×N per-day sleep/readiness fetches). Maps to `displayRole=day_context` items for Sleep then Recovery before chronological items.

---

## 17. Activity-live behavior

Synthetic item `activity_live:{day}` inserted at current local time for today only; updates replace same dedupeKey. Historical days use final summary milestone from DailyFacts — never midnight Steps canonical row.

---

## 18. Supported event types (v1)

See product contract §13. Unsupported: reminders, recommendations, body measurement, labs (deferred).

---

## 19. Bedtime behavior

Emit `Went to sleep` when `SleepNight.startedAt` valid; `displayRole=chronological_event`; dedupe per night.

---

## 20. Reminder/quick-add decision

**No persisted reminder model found.** V1 defers reminder persistence; reuses nutrition log hub routes (`lib/nutrition/nutritionLogHubRoutes.ts`) for quick-add navigation only.

---

## 21. Ordering and dedupe

Section order: today → older days. Within day: context → chronological (asc) with bedtime at real time. Tie-break: kind priority then id. Dedupe hierarchy in product contract §19.

---

## 22. Loading/error state matrix

Locked in product contract §20. Current screen supports partial/error/empty only for single day.

---

## 23. Accessibility

44pt targets; section headers; hide decorative rail from accessibility; physical matrix deferred to implementation (T31–T35).

---

## 24. Privacy and telemetry

Allowed: `operation`, `routeTemplate`, `itemKindCounts`, `daySectionCount`, `pageCount`, `durationMs`, `statusCode`, `requestId` (UUID), `authenticated`, `empty`, `error`, `retryCount`.

Prohibited: UID, email, titles, health values, exact days in telemetry, event IDs, cursors, URLs, tokens, payloads, stacks.

Implementation: typed helper + guards (pattern from `mobileHttpTelemetry.ts`).

---

## 25. Performance budgets

| Action | Budget |
|---|---:|
| Cold mount | 1 feed request |
| Older page | 1 feed request |
| Calendar jump | 1 feed request |
| Return to Today | 1 feed request |

Architectural zeros listed in product contract §24.

---

## 26. AI-readiness

Stable id/kind/occurredAt/day/source/status/displayRole preserved. Future AI reads CanonicalEvents/DailyFacts/Insights/IntelligenceContext — not raw provider payloads on client.

---

## 27. Backend/OpenAPI impact

- Add `GET /users/me/timeline-feed` to API + `infra/gateway/openapi.yaml`
- Additive Zod schemas in `lib/contracts`
- No Firestore schema migration required for v1

---

## 28. Migration/historical impact

Existing single-day deep links remain (`timeline/[day]`). Tab root becomes continuous feed; deep link can seed `anchorDay`. No data backfill.

---

## 29. Focused implementation plan

See `docs/plans/timeline-v1-implementation-plan.md` — 9 commits post-merge.

---

## 30. Risks

| ID | Risk |
|---|---|
| R1 | Client cache UID leak |
| R2 | Busy-day silent truncation until feed ships |
| R3 | SectionList perf on very long history |
| R4 | API/mobile deploy ordering |

---

## 31. Blockers

**None for contract lock.** Additive bounded feed design resolves pagination, calendar jump, and per-day fan-out concerns.

---

## 32. Final recommendation

Lock contracts and implement on new `feat/timeline-v1` branch after Weekly Fitness stack merges. Priority fixes: feed endpoint, UID-scoped caches, remove Plan vs actual UI, SectionList continuous feed.

**Weekly Fitness checkpoint unchanged:**

```text
WEEKLY FITNESS RUNTIME BLOCKERS REPAIRED — TIMELINE AUDIT AUTHORIZED,
IMPLEMENTATION AND STACK MERGE STILL BLOCKED
```
