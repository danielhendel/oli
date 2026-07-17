# Timeline V1 — Post-Merge Implementation Plan

**Status:** LOCAL IMPLEMENTATION COMPLETE on `feat/timeline-v1` — pending feed staging preflight authorization
**Date:** 2026-07-16
**Audit branch:** `audit/timeline-v1` (documentation only; **not** the implementation branch)
**Implementation worktree:** `/Users/danielhendel/oli-timeline-v1-impl`

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

---

## Implementation evidence (2026-07-16)

Local implementation complete on `feat/timeline-v1`. Evidence below is
aggregate-only. No screenshots, health values, event titles, dates, UIDs,
provider IDs, raw-event IDs, cursor values, URLs, query values, tokens, keys,
or raw logs are recorded.

### Compact day-date header — physical PASS

| Check | Result |
|---|---|
| Compact date header present | PASS |
| Header line count | ONE |
| Today format `Today Month D, YYYY` | PASS |
| Today/date typography identical | PASS |
| Today label size compact | PASS |
| Historical `EEE Month D, YYYY` | PASS |
| Historical weekday abbreviated | PASS |
| Centered alignment | PASS |
| Selected prior-day updates header | PASS |
| Return to Today updates header | PASS |
| Header scrolls with fallback content | PASS |
| Duplicate visible date heading | NONE |
| Dark mode | PASS |
| Redbox / blank screen | NONE |

### Explicitly unverified gates (do not convert to PASS)

| Gate | Status | Reason |
|---|---|---|
| Empty prior-day keeps header | NOT VERIFIED | not exercised on device |
| Light mode | NOT VERIFIED | not exercised on device |
| Sticky multi-day header | NOT VERIFIED | feed disabled (`EXPO_PUBLIC_TIMELINE_FEED` unset) |
| Continuous previous-day scroll | NOT VERIFIED | feed disabled; route not yet deployed |
| Feed request budget (device) | NOT VERIFIED | feed disabled |
| Busy-day pagination (device) | NOT VERIFIED | feed disabled |
| User-switch physical isolation | NOT VERIFIED | feed disabled |
| Physical VoiceOver | NOT VERIFIED | not exercised on device |
| Physical Dynamic Type | NOT VERIFIED | not exercised on device |

The live development client remains on the single-day fallback because
`EXPO_PUBLIC_TIMELINE_FEED` is unset and `/users/me/timeline-feed` is not yet
served through Cloud Run and API Gateway. Continuous history has **not** been
physically verified.

Fallback event truth is intentionally unchanged; it is not modified to imitate
the undeployed feed.

---

## Deployment impact (from the committed diff)

| Surface | Required |
|---|---|
| Cloud Run API (`services/api`) | Required — additive `GET /users/me/timeline-feed` |
| API Gateway | Required — new route must be exposed via a new config |
| Firebase Functions | Not required — no `services/functions` source change in scope |
| Firestore rules | Not required — no rules change |
| Firestore indexes | Not required — reads use existing per-user collections |
| Data migration | Not required |
| Historical backfill | Not required |
| Mobile feature flag | Required — `EXPO_PUBLIC_TIMELINE_FEED` gates the feed path |

The Timeline feed handler performs reads only within the authenticated user's
own collections. It issues no provider refresh and performs no writes during a
feed GET.

---

## Plan-only staging preflight (no cloud action taken)

This section is documentation only. No image was built, no revision deployed,
no Gateway config created or attached, no traffic shifted, and no flag enabled.

### Current known-good staging rollback baseline

Preserve the backend and Gateway state serving before any Timeline deployment:

| Surface | Known-good rollback target |
|---|---|
| Cloud Run service | `oli-api` |
| Cloud Run revision | `oli-api-00233-qum` (100% normal traffic) |
| Immutable image digest | `sha256:32f62038dff4378fecdcc2664fc77d1d7ea54ad886344a43508472cc6c44d90b` |
| API Gateway config | `projects/1010034434203/locations/global/apis/oli-api/configs/oli-api-config-weekly-fitness-8788c52-20260712-201806` |
| Firebase Functions | Unchanged; no Timeline Function deployment |
| Logging/privacy controls | Retain unchanged |

Older non-serving revisions, including `oli-api-00232-*`, are preserved
artifacts but are not the primary Timeline rollback target.

### Immutable build plan

1. Build from clean committed Timeline HEAD only.
2. Submit the repository-approved Cloud Build; record the Cloud Build ID and
   source archive.
3. Tag the image with `<FINAL_SHORT_SHA>` and record its immutable digest.
4. Deploy the API **by digest** as a **no-traffic tagged** revision using
   `timeline-feed-<FINAL_SHORT_SHA>`.
5. Diff the new revision's configuration against the current serving revision;
   only image reference and revision metadata may differ.

### Tagged-revision smoke plan (privacy-safe)

Probe the tagged, zero-traffic revision URL:

- `/health` → 200
- existing Sleep read → 200
- existing Oura status → 200
- existing preferences read → 200
- one unrelated authenticated read → 200
- `timeline-feed` unauthenticated → 401 (never 404)
- `timeline-feed` initial page → 200
- `timeline-feed` with `anchorDay` → 200
- `timeline-feed` cursor continuation → 200
- invalid limit → 400
- invalid cursor → 400
- invalid anchor → 400
- assert: no UID in response, no raw payload, no provider call, no write,
  stable ordering, busy-day continuation, no 5xx

No health values or private event dates are captured in probe evidence.

### Unattached Gateway config plan

1. Name the Gateway config
   `oli-api-config-timeline-feed-<FINAL_SHORT_SHA>-<TIMESTAMP>` for
   provenance.
2. Create it **ACTIVE but unattached**.
3. Verify the `timeline-feed` route, Firebase JWT security, and OPTIONS/CORS.
4. Confirm existing routes are preserved.
5. Leave the live Gateway unchanged during preflight.

### Cutover order (later authorization only)

1. Shift Cloud Run traffic to the verified Timeline revision.
2. Smoke existing routes before Gateway attachment.
3. Attach the verified Gateway config.
4. Wait for propagation.
5. Verify invalid auth → 401 (not 404).
6. Run the authenticated Timeline feed matrix.
7. Monitor errors, latency, and privacy-safe telemetry.
8. Preserve rollback artifacts.

### Mobile enablement (after backend/Gateway cutover)

- Add `EXPO_PUBLIC_TIMELINE_FEED=1` to the approved staging mobile environment.
- Do not commit `.env.local`.
- Restart Metro with `--clear`; force-quit and reopen the dev client.
- Confirm the client runs from the Timeline implementation worktree.
- Run the continuous-feed physical matrix.

### Rollback order (later authorization only)

1. Roll back the Gateway first to
   `oli-api-config-weekly-fitness-8788c52-20260712-201806`.
2. Roll back Cloud Run traffic second to `oli-api-00233-qum` at immutable
   digest
   `sha256:32f62038dff4378fecdcc2664fc77d1d7ea54ad886344a43508472cc6c44d90b`.
3. Retain/restore a Function only if the diff proves a Function deploy was
   required (it does not in this slice).
4. Preserve logging privacy controls.
5. Disable the mobile feature flag.
6. Restart the development client.

---

## Physical verification matrix (continuous feed) — for later

Required later on a physical device once the feed is deployed and enabled:

Today initial · compact Today header · scroll to prior day ·
historical abbreviated-weekday header · multiple day sections ·
sticky header transitions · older-page loading · scroll back up ·
Return to Today · calendar jump · empty anchored day ·
no duplicate sections · no duplicate items · Sleep then Recovery ·
one Activity-live marker · no midnight fabricated Steps ·
chronological actions · bedtime · no spinner loop · no redbox ·
request budget · account-switch isolation · accessibility ·
light and dark modes.
