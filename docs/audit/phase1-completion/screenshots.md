# Phase 1 — Screenshots Checklist

**Purpose:** Manual capture of required screenshots for third-party audit.  
**Tool:** Device or simulator; capture and store in a secure location (not committed).

---

## Required Screenshots

| # | Screen | Steps | What to Capture |
|---|--------|-------|-----------------|
| 1 | Tabs shell | Open app, land on Dash | All 5 tabs visible: Dash, Timeline, Manage, Library, Stats |
| 2 | Library index | Tap Library tab | Category list with at least one category |
| 3 | Library category | Tap a category | Events list (or empty state) |
| 4 | Timeline index | Tap Timeline tab | Day list (or empty state) |
| 5 | Timeline day | Tap a day | Day detail with events / "Replay this day" row |
| 6 | Event detail | From Library or Timeline, tap an event | Canonical fields + provenance (collapsed) |
| 7 | Lineage | From Event detail, tap "View lineage" | Raw → canonical → derived narrative |
| 8 | Replay day | From Timeline day, tap "Replay this day" | "Viewing past truth as of \<timestamp\>", run list, derived truth |
| 9 | Fail-closed | Trigger contract error (e.g. mock invalid response) | ErrorState "Data validation failed", no partial content |
| 10 | Manage | Tap Manage tab | Manage placeholder screen |
| 11 | Stats | Tap Stats tab | Stats placeholder screen |

---

## Notes

- Do NOT include real user data or PII in screenshots.
- Use test/mock data or redacted demo accounts.
- Screenshots are for manual audit evidence; not stored in repo.
