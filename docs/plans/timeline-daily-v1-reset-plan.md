# Daily Timeline v1 — Reset Plan

**Status:** READY FOR AUTHORIZATION (documentation only; not executed)
**Date:** 2026-07-18
**Feature worktree truth:** `/Users/danielhendel/oli-timeline-v1-impl` · `feat/timeline-v1` @ `c3a550ae5c08b5811195720c82f468724ddd7fb0`
**Feature PR:** #187 (OPEN draft) · base `main` · head `feat/timeline-v1`

Privacy-safe. Aggregate decisions only.

---

## 1. Decision summary

Freeze the continuous multi-day Timeline feed as a **shipping interaction**.

Retain Timeline as a core capability.

Reset Timeline v1 to a **deterministic Daily Timeline** (one selected day).

Continuous history becomes **Timeline v2 research**, not v1 acceptance.

---

## 2. Why freeze continuous feed

Physical classification (aggregate):

| Gate | Result |
| --- | --- |
| Attach / provenance | PASS |
| Cold open → current day | FAIL |
| Calendar target alignment | FAIL |
| Fast-scroll stability | FAIL |
| Rail/card presence | PASS |
| Visual hierarchy | NEEDS REDESIGN |
| Redbox / blank / visible backend error | 0 / 0 / 0 |

Root product finding: continuous list + auto-position + calendar-in-stream semantics remain unsuitable for release even after viewport/calendar repair work.

---

## 3. Local / platform freeze actions (this authorization)

| Action | Result |
| --- | --- |
| Local `EXPO_PUBLIC_TIMELINE_FEED` | Unset (`LOCAL_TIMELINE_FEED_FLAG_ROLLBACK: PASS`) |
| Metro 8084 | Stopped / free |
| Raw capture evidence | Deleted |
| Live API `oli-api-00239-pih` @ 100% | Retained |
| Timeline Gateway config ACTIVE | Retained |
| Function / logging exclusion | Unchanged |
| PR #187 ready/merge | Not performed |
| Source commit/push | Not performed |

---

## 4. PR #187 decomposition

### Group 1 — Timeline backend/API foundation

**Files (examples):** `services/api/src/routes/usersMe.ts` (feed route), `services/api/src/lib/timeline/*`, `lib/api/usersMe.ts` (`getTimelineFeed`)
**Commits (examples):** `487b53e`, merges through runtime-resolution `#190`
**Classification:** **RETAIN FOR DAILY TIMELINE V1** (platform)
**Rationale:** Authenticated, bounded, schema-valid, privacy-oriented presentation pipeline; already live on staging.

### Group 2 — Runtime DTO/schema and OpenAPI

**Files:** `lib/contracts/timelineFeed.ts`, `lib/contracts/index.ts`, `infra/gateway/openapi.yaml`, gateway contract tests
**Classification:** **RETAIN FOR DAILY TIMELINE V1** (with possible additive single-day constraint later)
**Rationale:** Contract already deployed via Gateway; keep parity with staging.

### Group 3 — Canonical Timeline normalization

**Files:** `normalizeDay.ts`, `order.ts`, `dedupe.ts`, `loadDaySources.ts`, tests
**Classification:** **RETAIN FOR DAILY TIMELINE V1**
**Rationale:** Server truth for context + chronological actions.

### Group 4 — Workout-session reconciliation

**Files:** `lib/domain/workouts/reconcileWorkoutSessionsCore.ts`, API emit-safe import, bundle/runtime guards
**Commits:** `e911dce`, `#190` stack
**Classification:** **RETAIN FOR DAILY TIMELINE V1**
**Rationale:** Correct duplicate-session truth; required for Daily v1.

### Group 5 — Privacy/runtime/build guards

**Files:** sleep-night telemetry redaction (`#188`), runtime module-resolution guards (`#190`), privacy/ownership tests
**Classification:** **RETAIN FOR DAILY TIMELINE V1**
**Rationale:** Production safety independent of continuous UX.

### Group 6 — Shared calendar improvements

**Files:** `lib/ui/calendar/*`, module calendar consumers, deterministic calendar tests
**Commits:** `1b25958`, `358a5a3`
**Classification:** **RETAIN FOR DAILY TIMELINE V1**
**Rationale:** Calendar jump UX needed for single-day selection.

### Group 7 — Single-day Timeline improvements

**Files:** `TimelineDayScreen` legacy path, `TimelineCalendar*`, rail/card primitives, day section heading, fail-closed tests
**Classification:** **RETAIN FOR DAILY TIMELINE V1** (as the default shipping surface while flag is unset; then redesign density)
**Rationale:** Safe default when feed flag is unset; needs visual reset, not continuous list.

### Group 8 — Continuous-feed mobile state

**Files:** `useTimelineFeed.ts`, `timelineFeedOrder.ts`, `timelineFeedScrollIntent.ts`
**Commits:** `aa4dfa5`, `#189`/`#191` mobile state repairs
**Classification:** **DEFER TO TIMELINE V2**
**Rationale:** Continuous pagination/scroll intent not accepted for v1.

### Group 9 — Continuous-feed list/orchestration

**Files:** `TimelineFeedScreen.tsx`, `TimelineFeedList.tsx`, feed-only tests for scroll/sticky/continuity
**Classification:** **DEFER TO TIMELINE V2** (keep flag-gated; do not enable in EAS/shared env)
**Rationale:** Physical FAIL on cold open, calendar alignment, fast-scroll stability.

### Group 10 — Tests and audit documents

**Files:** feed/privacy/runtime tests; `docs/audits/*timeline*`; prior continuous contracts
**Classification:**
- Platform/privacy/runtime tests → **RETAIN**
- Continuous scroll/continuity guards → **DEFER** (keep as research evidence)
- New Daily v1 contract/plan/decision docs → **RETAIN FOR DAILY TIMELINE V1**
**Rationale:** Preserve evidence; rewrite product docs toward Daily v1.

---

## 5. Data-boundary implementation plan (not executed)

1. Keep live feed platform retained (no rollback).
2. Design Daily v1 mobile against **one selected-day presentation read** using retained `normalizeDay` + reconciliation.
3. If feed page semantics cannot honestly return a single day without multi-day walk leakage, authorize a thin single-day presentation endpoint reusing the same server core (Option C).
4. Do not promote `useTimelineDay`’s multi-hook + raw payload composition as the long-term Daily v1 truth without removing raw hydration and collapsing to one presentation read.
5. Keep `EXPO_PUBLIC_TIMELINE_FEED` unset in all shared environments.

---

## 6. Visual reset specification (Daily Timeline v1)

### Hierarchy

1. Page header: Timeline + calendar
2. Selected date: one compact centered line
3. Daily context: one compact summary surface **or** three compact non-event rows
4. Chronological history: denser rows; rail only if it improves scanning

### Avoid

- Excessive card height
- Identical weight for context vs events
- Chevrons on non-actionable rows
- Large empty gaps
- Duplicated date labels
- Sticky section dates
- Newest-bottom chat behavior
- Invisible automatic scrolling
- Clipped rows under bottom nav

### Modes / a11y

Dark, light, Dynamic Type, VoiceOver order, ≥44×44 targets, Reduce Motion, loading/empty/partial/error/retry.

---

## 7. Timeline v2 deferral

Deferred capabilities:

- continuous multi-day list;
- bidirectional cursors in mobile UX;
- prepend position preservation;
- calendar anchoring inside an infinite stream;
- sticky/multi-section day headers in a continuous list;
- high-speed physical scroll acceptance.

Prerequisites before revisit:

- proven user demand;
- explicit bidirectional cursor contract;
- stable measured/estimated row layout;
- profiled list technology;
- tested prepend preservation;
- deterministic calendar anchoring;
- memory + request budgets;
- high-speed physical scrolling tests;
- accessibility reading-order tests;
- no duplicate truth across page boundaries.

Risks if forced into v1: App Store UX rejection, scroll instability, calendar confusion, maintenance burden.

---

## 8. PR restructuring recommendation

### Evaluated

| Plan | Idea |
| --- | --- |
| A | Keep #187; add Daily simplification before merge |
| B | Split platform foundation from continuous mobile UI |
| C | Merge #187 with continuous permanently disabled/experimental, Daily later |

### Selected: **PLAN A** (with PLAN B intent, without history rewrite)

**Why:**

- Staging API already matches the platform portion of #187; no backend rollback needed.
- Continuous mobile remains flag-off → lower App Store risk if #187 is not marked ready until Daily v1 UX replaces continuous acceptance criteria.
- Reviewability: add a focused Daily Timeline v1 mobile PR stacked on `feat/timeline-v1` (or land Daily changes on the feature branch) **before** marking #187 ready.
- Avoid force-split/rebase of already-merged stacked fixes (#188–#191).
- Dead continuous modules may remain flag-gated as deferred research until a later deletion PR — do not enable them.

### Sequencing (authorize separately; not executed here)

1. Keep #187 **draft**.
2. Implement Daily Timeline v1 mobile + presentation data boundary on the feature branch.
3. Update product docs/tests so continuous path is explicitly non-shipping.
4. Physical Daily matrix.
5. Only then consider #187 ready/merge.
6. Timeline v2 continuous work stays out of acceptance.

### Exact retain / defer / reverse (source not changed in this task)

| Action | Target |
| --- | --- |
| Retain | Groups 1–7, 5 (platform/privacy/calendar/single-day default) |
| Defer | Groups 8–9 continuous mobile + continuous-only tests as shipping UX |
| Reverse later (separate PR) | Optional deletion of continuous mobile once Daily v1 owns the tab |
| Do not reverse | Live API revision / Gateway / workout reconciliation / privacy guards |

---

## 9. Explicit non-actions

This plan document does not authorize:

- committing/pushing;
- PR ready/merge;
- Cloud Build / traffic / Gateway / Functions / Firestore jobs;
- enabling the feed flag;
- starting Metro;
- deleting branches/worktrees/artifacts;
- history rewrite.
