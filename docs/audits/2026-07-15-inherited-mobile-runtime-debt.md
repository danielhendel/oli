# Inherited Mobile Runtime Debt — Weekly Fitness Stack Gate

**Date:** 2026-07-15
**Feature HEAD:** `9c8624812695498f75dfb0df6360ccd41d075313`
**Worktree:** isolated `feat/weekly-fitness-v2`
**PR stack:** #180 → #182 → #183

Privacy-safe. No raw log lines, health values, dates, IDs, URLs, tokens, or keys.

---

## Session classification

| Item | Result |
|---|---|
| Restored UI proof | PASS (prior session) |
| Navigation WFN1–WFN12 | physically PASS |
| Lifecycle / accessibility / physical truth | NOT VERIFIED — deferred by product owner |
| Body Goal mutation | NOT AUTHORIZED |
| Physical User A→B | NOT VERIFIED — second account unavailable |
| Stack merge | **blocked pending privacy/runtime repairs + deferred gates** |
| Timeline source implementation | **blocked** until stack merges and main verifies |

---

## Runtime capture aggregates (count-only)

Bounded final-worktree capture (Metro evidence mirror + prior diagnostic logs; not a 20-minute full matrix):

| Event family | Count |
|---|---:|
| WEEKLY_FITNESS_SLEEP / weekly_fitness_sleep_average | 0 |
| NET_TRACE | 1 |
| OliDataHook | 28 |
| AH:steps* | 1 |
| AH / HealthKit strings | 6 |
| WORKOUT_* debug | 0 |
| EnergyBaseline | 0 |
| sleep-day-refresh mentions | 1 |
| raw-events-list / range-hydrate / backfill | 0 |

Signals:

| Signal | Count |
|---|---:|
| full-URL-like strings | 6 |
| query-value-like patterns | 1 |
| redbox | 0 |
| fatal | 0 |

Notes:

- Capture was sparse relative to a full navigated matrix because Metro stdout was not fully mirrored for the whole physical session.
- Zero count does **not** mean source absence; source ownership below is authoritative for follow-up.
- `WEEKLY_FITNESS_SLEEP` has a logger helper but no production caller on this HEAD (test-only).

---

## Ownership matrix

| Finding | Reproduced on final branch this session? | Trigger | Owner module | Introduced by | Severity | Merge blocker? | Required follow-up |
|---|---:|---|---|---|---|---:|---|
| NET_TRACE residual query values, esp. `t=` cacheBust carrying DayKeys from Dash WF / activity shells | Partially (NET_TRACE count ≥1; URL-like strings present). Source confirms | Any authed HTTP in `__DEV__` / `EXPO_PUBLIC_NET_TRACE` | `lib/api/http.ts` + Dash cacheBust callers (`useWeeklyFitnessDailyFactsRollup`, activity shell) | Partial redact #182; residual `t=` / focus busts #183 + pre-existing | privacy | **yes** | `fix(privacy): redact cacheBust and remaining NET_TRACE query values` |
| sleep-day-refresh 500 on Dash when today SleepNight missing | Mention count 1; source confirms Dash path via Daily Sleep card | Dash cold/focus recovery | Sleep recovery client + `ouraSleepDayRefresh` API | Pre-existing / stack parents; not introduced by #183 WF card | correctness (+ server privacy risk if UID/day logged) | **yes** (Dash sibling path) | Own on #182/#180 sleep path: `fix(api): sleep-day-refresh recompute failure path` + keep client backoff |
| Year-scale Activity transport | Not exercised this session (nav opened Activity once earlier in other sessions) | Activity overview mount registering strip | `lib/data/activity/*` | Pre-existing | perf | no — off Dash shell unless overview registers | `perf(activity): keep year rollup off shell/Dash` |
| Year-scale Workout/raw-event hydration | Not exercised as WF-initiated | Workouts overview/calendar | `lib/data/workouts/*` | Pre-existing; #183 asserts WF does not hydrate | perf | no — off WF card path | `perf(workouts): stop year-scale raw-event hydrate on overview` |
| Raw-event cursors / diagnostic IDs in WORKOUT_TRUTH_DEBUG | Not in this capture (0) | Workout calendar hydrate (dev) | workouts calendar | Pre-existing | privacy | no — off WF Dash | `fix(privacy): scrub WORKOUT_TRUTH_DEBUG cursors and ids` |
| Health dates / magnitudes / anchors / IDs in AH / gated DF logs | AH strings present; magnitudes not projected here | AH repair/enrich paths; DF dump flag-gated | Apple Health + optional DF debug | Pre-existing (+ #182 partial scrub) | privacy | no if flag-gated / off Dash default; residual couples with NET_TRACE blocker | `fix(privacy): scrub AH STEP_ENRICH and daily-facts debug dump` |
| Repeated Apple Health repair/backfill | Not observed as loop in this capture (0 backfill family) | Activity/workouts/body focus coordinators | AH steps repair coordinator | Pre-existing | perf | no — not scheduled from WF Dash | `perf(activity): bound focus-triggered AH steps repair` |
| Repeated render/focus telemetry (WF sleep average / focus refetch) | Sleep-average log count 0; focus refetch architecture present in source | Dash focus return | `useWeeklyFitnessCard` focus cascade | #183 model + #182 logger shape; sleep logger orphaned | perf | no — orphaned sleep logger; noisy focus refetch still repairable | `chore(dash): remove orphan WEEKLY_FITNESS_SLEEP and throttle focus telemetry` |

---

## Merge-blocking vs deferred physical verification

### Merge-blocking privacy/runtime defects (must repair before stack ready)

1. **NET_TRACE query residual** — DayKeys in `cacheBust`/`t=` can survive redaction; privacy violation class.
2. **sleep-day-refresh 500 on Dash** — active sibling of Weekly Fitness on Dash; correctness defect and prior 500 loop risk.

### Explicitly NOT VERIFIED (deferred by product owner — not PASS/FAIL)

- Lifecycle WFL1–WFL12
- Accessibility WFA1–WFA15
- Physical VoiceOver / Dynamic Type / Reduce Motion
- Physical truth WFT1–WFT8 (test-based truth evidence required separately)
- Body Goal write/read/clear
- Physical User A→B isolation

These deferred gates must not be converted to PASS without evidence. They remain open before declaring the stack merge-ready, together with merge-blocking repairs above.

### Non-blocking inherited module debt (document; fix on owning module)

- Year-scale Activity transport
- Year-scale Workout hydrate / WORKOUT_TRUTH_DEBUG
- AH repair/backfill loops on Activity/Workouts focus
- Orphaned WEEKLY_FITNESS_SLEEP logger

---

## Test-based Weekly Fitness truth contract

Physical WFT1–WFT8 were deferred. Existing automated evidence on this HEAD (must not be treated as full physical PASS):

- `buildWeeklyFitnessCardModel` tests — contributor exclusion (Readiness/Nutrition/Stress/Body), missing≠zero, seven-row order
- `weeklyProgressV1` / dash progress tests — progress rules
- `useWeeklyFitnessCard.regression` — no workouts calendar hydrate / no sleep-day-refresh from WF card
- UI card tests — dual hero labels

Cursor must expand pure/test coverage before converting deferred physical truth items to PASS. No new product commits created in this deferral session.

---

## Timeline authorization under this gate

Allowed now:

- repository Timeline audit
- architecture / data-lineage analysis
- UX / product / data contract documentation only

Blocked until #180 → #182 → #183 are repaired, merged in order, and verified on main:

- Timeline source implementation
- Timeline backend/API deployment
- Timeline draft PR with product code

---

## Actions explicitly not performed

- PR ready transition
- PR merge
- Timeline implementation
- Backend traffic/Gateway/Function changes
- Oura pull-now / backfill / sleep-day-refresh
- Body Goal mutation
- User creation
- Force-push / history rewrite
