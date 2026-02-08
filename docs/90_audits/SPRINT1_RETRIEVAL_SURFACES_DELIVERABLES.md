# Sprint 1: Retrieval Surfaces (Library Backbone) — Deliverables

**Date:** 2026-02-08  
**Status:** Complete  
**Scope:** Phase 1 read-only retrieval endpoints (API only)

---

## 1. Sprint 1 Overview

Sprint 1 implements the Library Backbone: five read-only, fail-closed retrieval endpoints that make health data retrievable and inspectable. All endpoints are real, validated with Zod, tested, and CI-enforced.

---

## 2. Objectives + Expected Outcomes

| Objective | Outcome |
|-----------|---------|
| Raw events list/query | GET /users/me/raw-events with start/end, kind(s), cursor, limit |
| Canonical events list/query | GET /users/me/events with start/end, kind(s), cursor, limit |
| Timeline day aggregates | GET /users/me/timeline returns days with summary presence flags |
| Lineage mapping | GET /users/me/lineage maps raw → canonical → derived ledger |
| Derived ledger snapshot alias | GET /users/me/derived-ledger/snapshot mirrors replay |
| Fail-closed validation | Invalid query params → 400; invalid Firestore docs → 500 |
| Auth isolation | User can only access own data |
| CI enforcement | assert-api-routes enforces route presence |

---

## 3. Step-by-Step Implementation

### A) Baseline Evidence

| Evidence | Location |
|----------|----------|
| Raw events collection | `users/{uid}/rawEvents` — `services/functions/src/db/collections.ts:63-67` |
| Canonical events collection | `users/{uid}/events` — `collections.ts:69-74` |
| DailyFacts collection | `users/{uid}/dailyFacts` — `collections.ts:76-80` |
| Insights collection | `users/{uid}/insights` — `collections.ts:83-87` |
| IntelligenceContext | `users/{uid}/intelligenceContext` — `services/api/src/db.ts:36` |
| Derived ledger | `users/{uid}/derivedLedger/{day}/runs/{runId}` — `services/functions/src/pipeline/derivedLedger.ts` |
| Canonical schema source | `mapRawEventToCanonical.ts`, `writeCanonicalEventImmutable.ts` |
| Raw event schema | `lib/contracts/rawEvent.ts` — `rawEventDocSchema` |

### B) DTOs + Contracts

| Schema | File | Purpose |
|--------|------|---------|
| `rawEventListItemSchema` | `lib/contracts/retrieval.ts` | Raw event list item |
| `canonicalEventListItemSchema` | `lib/contracts/retrieval.ts` | Canonical event list item (observedAt = start) |
| `timelineDaySchema` | `lib/contracts/retrieval.ts` | Day summary with presence flags |
| `lineageResponseDtoSchema` | `lib/contracts/retrieval.ts` | rawEventIds, canonicalEventId, derivedLedgerRuns |
| Query schemas | `rawEventsListQuerySchema`, `canonicalEventsListQuerySchema`, `timelineQuerySchema`, `lineageQuerySchema` | Fail-closed query validation |

### C) Endpoints Implemented

| Route | Handler | File:Line |
|-------|---------|-----------|
| GET /users/me/raw-events | asyncHandler | `services/api/src/routes/usersMe.ts:400` |
| GET /users/me/events | asyncHandler | `services/api/src/routes/usersMe.ts:505` |
| GET /users/me/timeline | asyncHandler | `services/api/src/routes/usersMe.ts:695` |
| GET /users/me/lineage | asyncHandler | `services/api/src/routes/usersMe.ts:857` |
| GET /users/me/derived-ledger/snapshot | Same as replay | `usersMe.ts:468` (route array) |

### D) Tests

| Endpoint | Test File | Coverage |
|----------|-----------|----------|
| raw-events | `rawEvents.list.test.ts` | success, invalid query 400, invalid doc 500, auth isolation, ordering |
| events | `events.list.test.ts` | success, invalid query 400 |
| timeline | `timeline.test.ts` | success, invalid range 400 |
| lineage | `lineage.test.ts` | success by canonicalEventId, invalid query 400 |
| derived-ledger/snapshot | `derivedLedger.snapshot.test.ts` | missing day 400, no ledger 404 |

### E) Firestore Indexes Added

- `rawEvents`: observedAt DESC, __name__ DESC
- `rawEvents`: kind ASC, observedAt DESC, __name__ DESC
- `events`: start DESC, __name__ DESC
- `events`: day ASC, start DESC, __name__ DESC
- `events`: kind ASC, start DESC, __name__ DESC

---

## 4. Proof Section

### Endpoint Proof Table

| Endpoint | Route Path | Handler | Schema | Tests |
|----------|------------|---------|--------|-------|
| raw-events | /raw-events | usersMe.ts ~L400 | rawEventListItemSchema, rawEventsListResponseDtoSchema | rawEvents.list.test.ts |
| events | /events | usersMe.ts ~L505 | canonicalEventListItemSchema, canonicalEventsListResponseDtoSchema | events.list.test.ts |
| timeline | /timeline | usersMe.ts ~L695 | timelineResponseDtoSchema | timeline.test.ts |
| lineage | /lineage | usersMe.ts ~L857 | lineageResponseDtoSchema | lineage.test.ts |
| derived-ledger/snapshot | /derived-ledger/snapshot | usersMe.ts (shared) | derivedLedgerReplayResponseDtoSchema | derivedLedger.snapshot.test.ts |

### Stable Ordering Guarantee

- **raw-events**: `orderBy("observedAt", "desc").orderBy(documentIdPath, "desc")` — deterministic tiebreaker
- **events**: `orderBy("start", "desc").orderBy(documentIdPath, "desc")` — same pattern

### Fail-Closed Behavior Proof

- `rawEvents.list.test.ts` line ~120: seeds invalid doc with `observedAt: "invalid-date"` → expects 500 INVALID_DOC
- `uploads.list.test.ts`: invalid file payload → 500 (existing proof)

### Auth Isolation Proof

- `rawEvents.list.test.ts` line ~155: app without uid middleware → fetch returns 401

---

## 5. Acceptance Checklist

```bash
npm run typecheck       # ✅
npm run lint            # ✅
npm run check:invariants # ✅
npm test                # ✅ 203 tests
node scripts/ci/assert-api-routes.mjs  # ✅
```

---

## 6. UNVERIFIED List

None. All endpoints are implemented, validated, tested, and CI-enforced.

---

## 7. File Paths Summary

| Category | Paths |
|----------|-------|
| Contracts | `lib/contracts/retrieval.ts`, `lib/contracts/index.ts` |
| Routes | `services/api/src/routes/usersMe.ts` |
| DTOs | `services/api/src/types/dtos.ts` |
| DB | `services/api/src/db.ts` (documentIdPath export) |
| Tests | `services/api/src/routes/__tests__/rawEvents.list.test.ts`, `events.list.test.ts`, `timeline.test.ts`, `lineage.test.ts`, `derivedLedger.snapshot.test.ts` |
| CI | `scripts/ci/assert-api-routes.mjs` |
| Firestore | `services/functions/firestore.indexes.json` |
| OpenAPI | `infra/gateway/openapi.yaml` |
