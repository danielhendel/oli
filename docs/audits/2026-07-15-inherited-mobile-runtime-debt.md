# Inherited Mobile Runtime Debt — Weekly Fitness Stack Gate

**Date:** 2026-07-15
**Feature HEAD (pre-repair docs):** `9c8624812695498f75dfb0df6360ccd41d075313`
**Worktree:** isolated `feat/weekly-fitness-v2`
**PR stack:** #180 → #182 → #183
**PR #182 head after repairs:** `668013af202a9c062cb35074bcd75bc8d862089d`

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
| Stack merge | **blocked pending deferred physical gates** (two active runtime blockers repaired on #182; not merge-ready) |
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
| NET_TRACE residual query values, esp. `t=` cacheBust carrying DayKeys from Dash WF / activity shells | Pre-repair: yes (count ≥1). **Repaired on #182** — legacy label removed; route-template telemetry only | Any authed HTTP in `__DEV__` | `lib/api/mobileHttpTelemetry.ts` + `lib/api/http.ts` | Residual on #182; callers may still cache-bust operationally | privacy | **repaired (await Dash proof zeros)** | Keep source guards; do not reintroduce URL fields |
| sleep-day-refresh 500 on Dash when today SleepNight missing | Pre-repair: yes. **Repaired on #182 (client)** — auto POST removed from `useDailySleepCard` | Was: Dash cold/focus + missing today | formerly Daily Sleep card recovery | Pre-existing / stack parents | correctness | **repaired client-side (await Dash proof zeros)** | Keep maintenance refresh explicit; do not auto-call from Dash |
| Year-scale Activity transport | Not exercised this session (nav opened Activity once earlier in other sessions) | Activity overview mount registering strip | `lib/data/activity/*` | Pre-existing | perf | no — off Dash shell unless overview registers | `perf(activity): keep year rollup off shell/Dash` |
| Year-scale Workout/raw-event hydration | Not exercised as WF-initiated | Workouts overview/calendar | `lib/data/workouts/*` | Pre-existing; #183 asserts WF does not hydrate | perf | no — off WF card path | `perf(workouts): stop year-scale raw-event hydrate on overview` |
| Raw-event cursors / diagnostic IDs in WORKOUT_TRUTH_DEBUG | Not in this capture (0) | Workout calendar hydrate (dev) | workouts calendar | Pre-existing | privacy | no — off WF Dash | `fix(privacy): scrub WORKOUT_TRUTH_DEBUG cursors and ids` |
| Health dates / magnitudes / anchors / IDs in AH / gated DF logs | AH strings present; magnitudes not projected here | AH repair/enrich paths; DF dump flag-gated | Apple Health + optional DF debug | Pre-existing (+ #182 partial scrub) | privacy | no if flag-gated / off Dash default; residual couples with NET_TRACE blocker | `fix(privacy): scrub AH STEP_ENRICH and daily-facts debug dump` |
| Repeated Apple Health repair/backfill | Not observed as loop in this capture (0 backfill family) | Activity/workouts/body focus coordinators | AH steps repair coordinator | Pre-existing | perf | no — not scheduled from WF Dash | `perf(activity): bound focus-triggered AH steps repair` |
| Repeated render/focus telemetry (WF sleep average / focus refetch) | Sleep-average log count 0; focus refetch architecture present in source | Dash focus return | `useWeeklyFitnessCard` focus cascade | #183 model + #182 logger shape; sleep logger orphaned | perf | no — orphaned sleep logger; noisy focus refetch still repairable | `chore(dash): remove orphan WEEKLY_FITNESS_SLEEP and throttle focus telemetry` |

---

## Post-repair Dash cold smoke (2026-07-16)

Human result on port **8084** feature worktree Metro (not 8081/8083):

```text
PASS — redbox none, blank screen none, visible sleep error none
```

Machine telemetry/network recomputation from the same session: **not available**
(external Terminal; Metro log not persisted). Do not treat pre-repair capture
counts in the table above as post-repair proof.

---

## Merge-blocking vs deferred physical verification

### Former merge-blocking privacy/runtime defects (repaired on PR #182)

1. **NET_TRACE query residual** — **repaired**: emit `mobile_http_request_completed` with route templates only (`46d2b3bb…` + typing/lint follow-ups).
2. **sleep-day-refresh auto from Dash** — **repaired (client)**: removed automatic invocation from `useDailySleepCard` (`f220badf…`). Normal Dash uses SleepNight GET. No API deploy required for this path.

These remain separate from deferred physical gates. Inherited non-blocking debt below was **not** treated as fixed.

### Explicitly NOT VERIFIED (deferred by product owner — not PASS/FAIL)

- Lifecycle WFL1–WFL12
- Accessibility WFA1–WFA15
- Physical VoiceOver / Dynamic Type / Reduce Motion
- Physical truth WFT1–WFT8 (test-based truth evidence required separately)
- Body Goal write/read/clear
- Physical User A→B isolation

These deferred gates must not be converted to PASS without evidence. They remain open before declaring the stack merge-ready, together with merge-blocking repairs above.

### Non-blocking inherited module debt (document; fix on owning module — not fixed here)

- Year-scale Activity analytics transport
- Year-scale Workout/raw-event hydration
- Workout diagnostic identifiers (`WORKOUT_TRUTH_DEBUG`)
- Apple Health focus-triggered repair/backfill
- Energy audit verbosity
- Orphaned Weekly Fitness Sleep logger
- Dedicated Weekly Progress detail route
- Nutrition logging-coverage edge under-count
- Gateway API-key query transport
- Health-range query transport

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
