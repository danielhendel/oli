# Sprint 5: Replay & "As-Of" Time Travel UI — Deliverables

**Date:** 2026-02-08  
**Status:** Complete  
**Scope:** User can replay past truth for a given day; powered by snapshot endpoint

---

## 1. Sprint 5 Overview

Sprint 5 delivers the Replay & "As-Of" Time Travel UI. The user can view derived truth for a day as it was stored at a specific point in time. Past views never change (determinism surfaced). Powered by `GET /users/me/derived-ledger/snapshot` (Sprint 1 alias).

---

## 2. Routes Added

| Route | File | Purpose |
|-------|------|---------|
| `/library/replay/day/[dayKey]` | `app/(app)/(tabs)/library/replay/day/[dayKey].tsx` | Replay Day screen |

**Layout:** `app/(app)/(tabs)/library/_layout.tsx` — added `Stack.Screen name="replay/day/[dayKey]"` so the route stays inside the Library tab stack.

---

## 3. API Calls + Schemas Used

| Function | Endpoint | Schema |
|----------|----------|--------|
| `getDerivedLedgerRuns(day, token)` | `GET /users/me/derived-ledger/runs?day={day}` | `derivedLedgerRunsResponseDtoSchema` |
| `getDerivedLedgerSnapshot(args, token)` | `GET /users/me/derived-ledger/snapshot?day={day}&runId={?}&asOf={?}` | `derivedLedgerReplayResponseDtoSchema` |

**Client:** `lib/api/derivedLedgerMe.ts`  
**Contracts:** `lib/contracts/derivedLedger.ts`  
**Hooks:** `useDerivedLedgerRuns`, `useDerivedLedgerSnapshot` (new in Sprint 5)

---

## 4. Baseline Audit (Pre-Sprint)

| Evidence | Location |
|----------|----------|
| Runs endpoint | `GET /users/me/derived-ledger/runs` — `services/api/src/routes/usersMe.ts` |
| Snapshot endpoint | `GET /users/me/derived-ledger/snapshot` (alias for replay) — `usersMe.ts` |
| Client API | `lib/api/derivedLedgerMe.ts` — `getDerivedLedgerRuns`, `getDerivedLedgerSnapshot` |
| Schemas | `lib/contracts/derivedLedger.ts` — `derivedLedgerRunsResponseDtoSchema`, `derivedLedgerReplayResponseDtoSchema` |
| Timeline day detail | `app/(app)/(tabs)/timeline/[day].tsx` |
| Library lineage | `app/(app)/(tabs)/library/lineage/[canonicalEventId].tsx` |

---

## 5. UI Requirements Implemented

| Requirement | Implementation |
|-------------|----------------|
| Header: "Replay" + dayKey | Title + subtitle |
| Banner: "Viewing past truth as of \<computedAt\>" | Always visible when snapshot loaded |
| "What is this?" link | Opens modal with short explanation |
| Run selector | Lists runs from runs endpoint; user picks run |
| Default: most recent run | `latestRunId` or first run |
| As-of time (optional) | TextInput for ISO 8601; API supports `asOf` query param |
| Replay content | dailyFacts, intelligenceContext, insights presence only (as in schema) |
| Fail-closed | Contract mismatch → ErrorState "Data validation failed", no partial content |
| Provenance collapsed by default | runId, computedAt, day, endpoints |
| "View current truth" | Link to `/(app)/(tabs)/timeline/[day]` |

---

## 6. Entry Points

| Entry | Location |
|-------|----------|
| "Replay this day" row | `app/(app)/(tabs)/timeline/[day].tsx` — navigates to `/library/replay/day/[dayKey]` |

---

## 7. Tests Proving Fail-Closed + Run Selection

| Test | File | Assertion |
|------|------|-----------|
| Valid render | `replay-day-valid.test.tsx` | Replay title, day, banner, derived truth sections |
| Fail-closed | `replay-day-fail-closed.test.tsx` | Contract error → "Data validation failed", no "Derived truth" or "Viewing past truth" |
| Run selection | `replay-day-run-selection.test.tsx` | `useDerivedLedgerSnapshot` called with `runId`; run_2 press → args include `run_2` |

---

## 8. Screenshots Checklist

Instructions for capturing:

1. **Timeline Day Detail** — Navigate to a day with derived runs; confirm "Replay this day" row is visible.
2. **Replay Day screen (ready)** — Tap "Replay this day"; confirm "Replay", dayKey, "Viewing past truth as of \<timestamp\>", run list, derived truth presence.
3. **What is this? modal** — Tap "What is this?"; confirm modal with explanation.
4. **Provenance (collapsed)** — Confirm provenance section is collapsed by default.
5. **View current truth** — Tap link; confirm navigation to timeline day.

---

## 9. Proof Gates

```bash
npm run typecheck   # ✅
npm run lint        # ✅
npm test            # ✅ (221 tests)
```

---

## 10. Maintenance Commit ( separate )

Prior to replay UI: `Sprint 5 (maintenance): align Expo patch versions`  
- expo: ~53.0.22 → ~53.0.26  
- expo-router: ~5.1.5 → ~5.1.11  
- jest-expo: ~53.0.10 → ~53.0.14  
- Audit: `docs/90_audits/SPRINT5_MAINTENANCE_EXPO_VERSION_ALIGNMENT.md`
