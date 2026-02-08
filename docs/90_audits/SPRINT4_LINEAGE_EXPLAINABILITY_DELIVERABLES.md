# Sprint 4: Lineage & Explainability UI — Deliverables

**Date:** 2026-02-08  
**Status:** Complete  
**Scope:** Lineage screen, explainability narrative, fail-closed contract

---

## 1. Sprint 4 Overview

Sprint 4 delivers the Lineage & Explainability UI. Every data point is explainable: the user can navigate to a Lineage screen and see raw events, canonical event, derived references, and a clear "why this value exists" narrative. No orphaned facts allowed; fail-closed on contract mismatch.

---

## 2. Objectives + Expected Outcomes

| Objective | Outcome |
|-----------|---------|
| Lineage route | `/library/lineage/[canonicalEventId]` reachable from Event Detail |
| "View lineage" CTA | Event Detail screen has CTA to lineage |
| Lineage sections | Canonical Event, Raw Events, Derived, Narrative |
| Provenance collapsed | Sections collapsed by default; auto-expand on failures/anomalies |
| Fail-closed | Contract error → ErrorState, no partial render |
| Missing references | FailureState with next action when lineage incomplete |
| Tests | Valid render + fail-closed contract error |
| Proof gates | typecheck, lint, test all green |

---

## 3. Step-by-Step Implementation

### A) Baseline Audit

| Evidence | Location |
|----------|----------|
| Event Detail screen | `app/(app)/event/[id].tsx` |
| Lineage API client | `lib/api/usersMe.ts` — `getLineage(idToken, opts)` |
| Lineage hook | `lib/data/useLineage.ts` — `useLineage(args, options)` |
| UI primitives | `lib/ui/ScreenStates.tsx` — ScreenContainer, LoadingState, ErrorState |
| Lineage schema | `lib/contracts/retrieval.ts` — `lineageResponseDtoSchema` |

### B) Route + Screen

| Item | Path |
|------|------|
| Lineage screen | `app/(app)/(tabs)/library/lineage/[canonicalEventId].tsx` |
| Library layout | `app/(app)/(tabs)/library/_layout.tsx` — added Stack.Screen for lineage |

### C) Event Detail CTA

| Change | Location |
|--------|----------|
| "View lineage" link | `app/(app)/event/[id].tsx` — `router.push(\`/library/lineage/${eventId}\`)` |

### D) Fail-closed + Auto-expand

| Rule | Behavior |
|------|----------|
| Contract error | `lineage.status === "error"` + `error.toLowerCase().includes("invalid")` → ErrorState isContractError, no sections |
| Missing canonical | `lineageData.canonicalEventId` null → FailureState |
| Auto-expand | `hasFailures \|\| hasAnomalies` (empty rawEventIds) → sections expanded by default |

---

## 4. Proof Mapping

### Route → Screen → API → Schema → Tests

| Route | Screen | API | Schema | Tests |
|-------|--------|-----|--------|-------|
| `/library/lineage/[canonicalEventId]` | `lineage/[canonicalEventId].tsx` | `getLineage` | `lineageResponseDtoSchema` | lineage-screen-valid.test.tsx, lineage-screen-fail-closed.test.tsx |

### File Paths Summary

| Category | Paths |
|----------|-------|
| Screen | `app/(app)/(tabs)/library/lineage/[canonicalEventId].tsx` |
| Layout | `app/(app)/(tabs)/library/_layout.tsx` |
| Event CTA | `app/(app)/event/[id].tsx` |
| API | `lib/api/usersMe.ts` — getLineage |
| Hook | `lib/data/useLineage.ts` |
| Schema | `lib/contracts/retrieval.ts` — lineageResponseDtoSchema |
| Tests | `app/(app)/(tabs)/library/lineage/__tests__/lineage-screen-valid.test.tsx`, `lineage-screen-fail-closed.test.tsx` |

---

## 5. Acceptance Checklist

```bash
npm run typecheck       # ✅
npm run lint            # ✅
npm test                # ✅
```

---

## 6. UNVERIFIED List

| Item | Rationale |
|------|-----------|
| Raw event details (observedAt, provider, kind) | Lineage API returns `rawEventIds` only; no endpoint returns full raw event by id for display. Display shows IDs. |
| Derived facts mapping | Linking derived values → source event IDs not available in lineage response. Derived section shows hasDerivedLedgerDay + runs only. |
