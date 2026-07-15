# Weekly Fitness v2 — Final Gate Record

**Date:** 2026-07-15
**Branch:** `feat/weekly-fitness-v2`
**Worktree:** isolated feature worktree
**Feature HEAD:** `9c8624812695498f75dfb0df6360ccd41d075313`
**Tree:** `b1455ac1875c8db0678b387594222c5ac5f86ef7`
**Feature PR:** #183

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

Source-backed merge blockers identified for follow-up (see inherited debt audit):

1. NET_TRACE residual query / cacheBust DayKey leakage class
2. sleep-day-refresh 500 path active from Dash Daily Sleep sibling

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
PR #180 OPEN draft — not marked ready
PR #182 OPEN draft — not marked ready
PR #183 OPEN draft — not marked ready
head #183: 9c8624812695498f75dfb0df6360ccd41d075313
```

Related audit:

- `docs/audits/2026-07-15-inherited-mobile-runtime-debt.md`
