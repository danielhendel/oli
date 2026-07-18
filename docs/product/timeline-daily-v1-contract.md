# Daily Timeline v1 — Product Contract

**Status:** LOCKED (product decision after continuous-feed freeze)
**Date:** 2026-07-18
**Supersedes for v1 shipping UX:** continuous multi-day feed interaction in `docs/product/timeline-v1-contract.md`
**Does not delete:** platform Timeline feed API value for later Timeline v2

Privacy-safe. No UIDs, health values, tokens, raw logs, private dates, or identifiers.

---

## 1. Purpose

Daily Timeline v1 is the user’s **deterministic single-day health log**: one selected calendar day, honest context, chronological actions, and safe navigation into module detail surfaces.

Timeline remains a core product surface. Continuous multi-day history is **not** required for v1 acceptance.

---

## 2. User problem

Users need to answer, for a chosen day:

- how the day started (sleep / recovery / activity context);
- what actions happened, in order, at real times;
- how to open the right detail without hunting modules.

They do not need an infinite chat-style history scroll to get value from Timeline v1.

---

## 3. Locked behavior

| Rule | Requirement |
| --- | --- |
| Cold open | Always selects **Today** |
| Prior scroll/selection | Must not override a true cold Today open |
| Calendar select day D | Replaces the selected day exactly |
| Calendar cancel | Preserves the current day |
| Future dates | Disabled |
| Multi-day continuous list | Forbidden |
| Bidirectional pagination | Forbidden |
| Automatic newest/bottom chat positioning | Forbidden |
| Sticky date heading | Forbidden |
| Selected date chrome | One static compact selected-date heading |
| Today control | Visible only when viewing a non-Today day |
| Fabricated events/values | Forbidden |
| Duplicate workout sessions | Forbidden |
| Provider payload in UI | Forbidden |
| Write / backfill / refresh / ingestion on read | Forbidden |

---

## 4. Daily presentation hierarchy

### Page header

- Title: `Timeline`
- Calendar icon (min 44×44), opens day picker

### Selected date

- One centered compact line (Today vs weekday/date formatting)
- Scrolls with content or sits as static chrome — **not** sticky section spam
- No duplicate date labels for the same day

### A. Daily context (not chronological event twins)

Compact context for:

- Sleep
- Recovery
- Activity

Rules:

- visually lighter / grouped vs action rows;
- no fabricated occurrence times;
- missing stays unavailable (not zero).

### B. Chronological actions

Examples: wake-up, meals/snacks, workouts, cardio, weight/body logs, insights, bedtime, other supported canonical actions.

Rules:

- actual times only;
- chronological order within the day;
- compact density;
- clear title/subtitle;
- icon when useful;
- chevron only when navigable;
- content clears bottom navigation;
- no plain divider-only design;
- no oversized card for every context item.

---

## 5. Data boundary (decision)

### Options audited

| Option | Summary |
| --- | --- |
| A | Keep `useTimelineDay` client composition and upgrade truth/model |
| B | Use Timeline feed API as bounded single-day presentation source |
| C | Add a narrow authenticated single-day presentation endpoint |

### Selection

**Prefer server presentation built on the retained Timeline normalize/reconcile pipeline (B→C).**

Rationale vs current `useTimelineDay`:

- it issues multiple mobile reads;
- it can hydrate raw events with payload flags;
- it is not “one request for the selected day.”

Rationale vs continuous feed UI:

- feed assembly walks multiple days for continuous history;
- continuous list/scroll semantics failed physical acceptance.

**Daily Timeline v1 data rule:**

- one authenticated presentation read for the selected day;
- server applies canonical normalize + workout-session reconciliation;
- Sleep / Recovery / Activity context included when available;
- no fabricated midnight Steps;
- no duplicate Activity live marker;
- missing ≠ zero;
- auth-scoped cache keyed without UID leakage in telemetry;
- no mobile raw-event year/history hydrate;
- no per-item fan-out;
- no per-day multi-page loop for v1.

If the existing feed response cannot be constrained to a single day without client filtering hacks, add a **thin** single-day presentation route that reuses `normalizeDay` / loaders (Option C) rather than inventing new domain math.

Default shipping path while Daily v1 is unimplemented: `EXPO_PUBLIC_TIMELINE_FEED` remains **unset** (legacy single-day screen).

### Implementation note (2026-07-18 Daily v1 shipping)

Daily Timeline v1 ships on the existing `useTimelineDay` composition (Option A)
with these constraints:

- request budget: the existing focused single-day hooks only (events, bounded
  raw nutrition/incomplete, sleep night, daily facts, insights) — no continuous
  feed cursor loop;
- raw payloads are parsed only inside `buildTimelineDayVm` and never rendered;
- continuous `getTimelineFeed` is not used by the shipping tab;
- server normalize/reconcile remain retained for platform/Timeline v2;
- known debt: collapse to one authenticated single-day presentation read remains
  a follow-up (Option B/C) without blocking Daily UX.



---

## 6. Navigation

- Calendar sheet for day jump;
- Return to Today only when not on Today;
- Supported rows navigate to existing module destinations;
- Back returns to the same selected day.

---

## 7. Loading / empty / error

| State | Behavior |
| --- | --- |
| Loading | Explicit partial/loading for the selected day |
| Empty | Honest empty for that day; no silent day substitution |
| Partial | Show known sections; do not invent the rest |
| Error | Fail-closed message + retry; no provider call from retry beyond the same read |
| Retry | Re-issues the single-day presentation read only |

---

## 8. Accessibility

- VoiceOver order: header → selected date → context → chronological actions;
- Dynamic Type: compact rows must reflow without clipping critical labels;
- Interactive targets ≥ 44×44;
- Reduce Motion: no forced scroll animations for day changes;
- Light and dark mode supported;
- Context rows are not fake buttons.

---

## 9. Privacy

- No UID/email in UI state or telemetry;
- No raw cursors, URLs, tokens, titles of private events, or provider payloads in logs;
- Auth identifies the caller; no caller UID query parameter.

---

## 10. Performance budgets (v1)

- Cold open: one presentation request for Today;
- Calendar jump: one presentation request for D (when not cache-fresh);
- No prepend/chat scroll machines;
- No sticky header measurement fights;
- Physical high-speed multi-day scroll is out of scope.

---

## 11. Non-goals (v1)

- Continuous multi-day history;
- Bidirectional cursors in the mobile UX;
- Newest-bottom chat semantics;
- Sticky changing dates;
- Plan vs actual on Timeline;
- Provider pull-now / backfill / sleep-day-refresh from Timeline read.
