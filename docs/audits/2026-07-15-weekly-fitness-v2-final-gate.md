# Weekly Fitness v2 — Final Gate Record

**Date:** 2026-07-15
**Branch:** `feat/weekly-fitness-v2`
**Worktree:** isolated feature worktree
**Feature HEAD (pre-repair docs):** `9c8624812695498f75dfb0df6360ccd41d075313`
**Tree (pre-repair docs):** `b1455ac1875c8db0678b387594222c5ac5f86ef7`
**Feature PR:** #183
**Parent sync:** merge commit synchronizing `fix/pr180-runtime-privacy-bounded-sleep` into this branch

This document is privacy-safe. It contains no health values, screenshots, account
identities, tokens, provider IDs, URLs, or raw logs.

---

## RESTORED UI PROOF

```text
RESTORED UI PROOF:
PASS

Bundle source:
feat/weekly-fitness-v2

HEAD:
9c8624812695498f75dfb0df6360ccd41d075313

Metro root:
isolated feature worktree

Temporary instrumentation:
removed

Watermark after restoration:
absent

Dual hero:
present

Hero subtitles:
Weekly Progress
Body Composition Score

Metric order:
Sleep
Readiness
Activity
Strength
Cardio
Nutrition
Stress

Legacy remaining/goal column:
absent

Body Composition Score without configured goal:
honest unavailable state
```

Root-cause classification for the prior wrong-bundle session:

```text
STALE DEVICE SESSION CONFIRMED AND RESOLVED
```

---

## Full feature gate status

```text
FULL WEEKLY FITNESS PHYSICAL DEVICE GATE:
NOT COMPLETE

NAVIGATION:
physically PASS (WFN1–WFN12)

LIFECYCLE / ACCESSIBILITY / PHYSICAL TRUTH / BODY GOAL / USER ISOLATION:
NOT VERIFIED — deferred by product owner

MERGE:
not authorized

PR READY:
not authorized

TIMELINE IMPLEMENTATION:
blocked until stack is repaired, merged in order, and verified on main
```

---

## Focused human matrix

### Navigation WFN1–WFN12

```text
WFN1–WFN12 PASS
NAVIGATION FIRST FAILURE: NONE
```

Recorded meaning:

- My goal and Body Composition Score open the fitness-goals flow;
- Sleep, Readiness, Activity, Strength, Cardio, Nutrition, and Stress open the
  correct destinations;
- back navigation works;
- repeated navigation does not create duplicate screens;
- no row is dead or misrouted;
- no navigation caused a redbox or blank screen.

### Lifecycle WFL1–WFL12

```text
WFL1–WFL12 NOT VERIFIED — DEFERRED BY PRODUCT OWNER
```

### Accessibility WFA1–WFA15

```text
WFA1–WFA15 NOT VERIFIED — DEFERRED BY PRODUCT OWNER

PHYSICAL VOICEOVER NOT VERIFIED
PHYSICAL DYNAMIC TYPE NOT VERIFIED
PHYSICAL REDUCE MOTION NOT VERIFIED
```

### Truth WFT1–WFT8

```text
WFT1–WFT8 NOT VERIFIED PHYSICALLY
```

Cursor must verify the Weekly Fitness truth contract through pure model,
selector, hook, and component tests. These items are not converted to PASS
without test evidence. Existing automated coverage on this HEAD includes
contributor exclusion, missing≠zero, seven-row order, and no WF-initiated
workouts hydrate / sleep-day-refresh — but that is **not** a full WFT physical PASS.

### Body Goal mutation

```text
NOT AUTHORIZED
VALID BODY GOAL WRITE/READ/CLEAR NOT VERIFIED — MUTATION NOT AUTHORIZED
```

### User A → User B isolation

```text
PHYSICAL USER A → USER B ISOLATION NOT VERIFIED — SECOND APPROVED ACCOUNT
UNAVAILABLE
```

### Session first failure (gate status)

```text
MANUAL LIFECYCLE, ACCESSIBILITY, TRUTH, BODY-GOAL MUTATION, AND PHYSICAL
USER-ISOLATION GATES WERE DEFERRED — THEY ARE NOT PASSED OR FAILED.
```

---

## Cursor runtime aggregates (count-only)

Restricted capture stopped after navigation. Aggregate from final-worktree
evidence artifacts:

| Family | Count |
|---|---:|
| WEEKLY_FITNESS_SLEEP | 0 |
| NET_TRACE | 1 |
| OliDataHook | 28 |
| AH:steps* | 1 |
| AH/HealthKit strings | 6 |
| WORKOUT_* debug | 0 |
| sleep-day-refresh mentions | 1 |
| redbox / fatal | 0 / 0 |

Source-backed merge blockers (original captures above) repaired on PR #182 and
synced into this branch (see repair record below). Deferred physical gates remain
NOT VERIFIED.

---

## Runtime blocker repairs (2026-07-15)

| Blocker | Root cause | Owner | Repair commits on #182 | Staging deploy required? |
|---|---|---|---|---|
| Legacy `NET_TRACE` URL/query telemetry | `lib/api/http.ts` logged a URL-bearing field; cache-bust/`t=` callers could carry DayKeys into that field | PR #182 | `46d2b3bbf8aeaa89d872d450480fca7370656202` (+ typing/lint follow-ups `054a043ea96da8522b9dd0aeaf64c679631c9b90`, `668013af202a9c062cb35074bcd75bc8d862089d`) | no |
| Automatic Dash `sleep-day-refresh` → HTTP 500 | `useDailySleepCard` auto-POSTed maintenance refresh when today SleepNight was missing | PR #182 (client) | `f220badfaa1c782bd4bf50a2922c27986fc081c3` | no — client no longer auto-invokes; API left unmodified |

Repair contract:

- Mobile completion telemetry emits `mobile_http_request_completed` / `[MOBILE_HTTP]` with only: operation, method, routeTemplate, statusCode, durationMs, requestId (strict UUID), authenticated, apiKeyPresent, retryCount, safeErrorCode.
- No `url`, query, day/date, cacheBust, key, token, body, or host fields.
- Dash Daily Sleep relies on `GET /users/me/sleep-night`; automatic `sleep-day-refresh` removed from mount/focus/missing paths.
- Explicit Sleep overview / PTR coordinators unchanged.

Bounded post-repair Dash cold-smoke (2026-07-16; human Terminal Metro on port **8084**,
worktree `/Users/danielhendel/oli-weekly-fitness-v2`, HEAD `adaaeb7a50949bb1c6f004ed7f92ee4e7fb60193`):

```text
FINAL DASH COLD SMOKE: PASS
FRESH IOS BUNDLE: PASS
REDBOX: NONE
BLANK SCREEN: NONE
VISIBLE SLEEP ERROR: NONE
FIRST FAILURE: NONE
```

Machine log aggregation from the same session:

| Check | Required | Result |
|---|---:|---|
| legacy NET_TRACE | 0 | **not machine-captured** (external Terminal; no persisted Metro log) |
| raw URL / query values in telemetry | 0 | **not machine-captured** |
| day / date / cache-bust values in telemetry | 0 | **not machine-captured** |
| API-key / token values in telemetry | 0 | **not machine-captured** |
| automatic sleep-day-refresh POST | 0 | **not machine-captured** |
| sleep-day-refresh 500 | 0 | **not machine-captured** |
| redbox | 0 | **0** (human) |
| fatal | 0 | **0** (human; no crash observed) |
| request loop | 0 | **not machine-captured** |

Human-observable Dash smoke passed. Technical telemetry/network counts could not be
recomputed after the session because Metro stdout was not persisted to an aggregatable
capture path. Pre-repair aggregates above (8081/8083-era captures) are **not** post-repair
evidence.

Safe telemetry events (`mobile_http_request_completed` / `[MOBILE_HTTP]`): **not machine-captured**.

Deferred gates (still NOT VERIFIED — do not convert to PASS):

- lifecycle; accessibility; VoiceOver; Dynamic Type; Reduce Motion;
- physical truth; valid Body Goal mutation; physical User A → B isolation.

---

## Weekly Fitness checkpoint (2026-07-16)

```text
RESTORED UI: PASS
NAVIGATION: PASS

RUNTIME REPAIRS: PASS BY SOURCE, TESTS, FULL SUITE, PR #182 CI, AND HUMAN DASH SMOKE
FINAL MACHINE TELEMETRY COUNTS: NOT VERIFIED — EXTERNAL METRO STDOUT WAS NOT PERSISTED

LIFECYCLE: NOT VERIFIED — DEFERRED
ACCESSIBILITY: NOT VERIFIED — DEFERRED
PHYSICAL VOICEOVER: NOT VERIFIED
PHYSICAL DYNAMIC TYPE: NOT VERIFIED
PHYSICAL REDUCE MOTION: NOT VERIFIED
PHYSICAL TRUTH MATRIX: NOT VERIFIED — DEFERRED
BODY GOAL MUTATION: NOT AUTHORIZED
USER A → USER B: NOT VERIFIED — SECOND APPROVED ACCOUNT UNAVAILABLE
```

PR #183 exact-head CI (`5423bcb…` docs commit; prior repair sync `adaaeb7…`): **SUCCESS** (check + tf-validate).

Stack merge: **held**. Timeline audit authorized; Timeline product source **blocked** until
#180 → #182 → #183 merge in order and updated `main` passes CI + physical Dash smoke.

---

## Staging backend (unchanged)

```text
Cloud Run:
oli-api-00233-qum
100% traffic

Gateway:
oli-api-config-weekly-fitness-8788c52-20260712-201806
ACTIVE

Function:
onourapostrawrequested-00054-sen

Logging exclusion:
oli_api_request_metadata_privacy_v1
```

---

## PR stack (verified)

```text
PR #180 OPEN draft — unchanged, not marked ready
PR #182 OPEN draft — head updated with runtime repairs, not marked ready
PR #183 OPEN draft — parent synced + docs, not marked ready
```

Related audit:

- `docs/audits/2026-07-15-inherited-mobile-runtime-debt.md`
