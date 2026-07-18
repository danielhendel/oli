# Timeline viewport and calendar continuity repair — 2026-07-18

Aggregate-only classification after failed physical feed attach on Timeline v1.

## Failed physical observations (booleans only)

| Gate | Result |
| --- | --- |
| Feed attach | PASS |
| Initial current-day positioning | FAIL |
| Sticky date-header contract | FAIL |
| Calendar newer-history continuity | FAIL |
| Rail/card design (visible sample) | PASS |
| Redbox | NONE |
| Blank screen | NONE |
| Visible backend error | NONE |

Local experimental feed flag restored to unset after classification.
Physical capture artifacts were not retained in Git.

## Root causes

1. **Initial viewport:** cold-open scroll armed without a reliable content/layout readiness barrier and without bounded `onScrollToIndexFailed` retry, so the list could remain at the oldest offset.
2. **Sticky header:** continuous feed `SectionList` used sticky section headers while inline day headings already rendered, producing a redundant pinned date under the page title.
3. **Calendar continuity:** calendar selection replaced the Today-rooted page set with an anchor-at-D older window, discarding newer days below D.

## Repair strategy

Client-only:

- intentional scroll targets (`newest` | `day`) with layout/content readiness and bounded retries;
- `stickySectionHeadersEnabled={false}` with inline `TimelineDaySectionHeader` retained;
- `jumpToDay` keeps Today as the data anchor, scrolls when D is loaded, otherwise appends bounded older pages (cap 10) without discarding newer history.

No additive bidirectional API/OpenAPI change.

## Deployment classification

- Mobile: REQUIRED
- Cloud Run / Gateway / Functions / Firestore / migration / backfill: NOT REQUIRED

## Unverified on device after repair

- cold open lands on Today
- non-sticky inline headings
- historical calendar continuity
- prepend stability, request budget, account-switch isolation, VoiceOver, Dynamic Type, light mode
