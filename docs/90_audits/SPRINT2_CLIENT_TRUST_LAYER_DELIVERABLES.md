# Sprint 2: Client Trust Layer — Deliverables

**Project:** Oli Health OS  
**Sprint:** 2  
**Date:** 2026-02-08  
**Goal:** Client must be incapable of trusting unvalidated server data.

---

## 1. Sprint 2 Overview

Sprint 2 implements the **Client Trust Layer** (Runtime Validation + Fail-Closed UI). All API responses crossing the trust boundary are now runtime-validated with Zod on the client. Failures are fail-closed: no partial rendering, no silent drop.

---

## 2. Objectives + Expected Outcomes

| Objective | Outcome |
|-----------|---------|
| Single reusable validation helper | `apiGetZodAuthed`, `apiPostZodAuthed`, `apiPutZodAuthed` in `lib/api/validate.ts` |
| All API modules use runtime validation | usersMe, preferences, derivedLedgerMe, failures, ingest |
| Hooks fail-closed via TruthOutcome | All `use*` hooks use `truthOutcomeFromApiResult`; errors propagate to UI |
| Invalid payload rejection tests | `lib/api/__tests__/validate.test.ts` + `lib/data/__tests__/truthOutcome.test.ts` |
| CI enforcement | typecheck + lint clean; tests pass |

---

## 3. Step-by-Step Changes (File Paths)

### A) Baseline Audit

| API Function | Endpoint | Previous State | Now |
|--------------|----------|----------------|-----|
| getDailyFacts | GET /users/me/daily-facts | Unvalidated (cast) | apiGetZodAuthed + dailyFactsDtoSchema |
| getInsights | GET /users/me/insights | Unvalidated | apiGetZodAuthed + insightsResponseDtoSchema |
| getIntelligenceContext | GET /users/me/intelligence-context | Unvalidated | apiGetZodAuthed + intelligenceContextDtoSchema |
| getDayTruth | GET /users/me/day-truth | Unvalidated | apiGetZodAuthed + dayTruthDtoSchema |
| getUploads | GET /users/me/uploads | Unvalidated | apiGetZodAuthed + uploadsPresenceResponseDtoSchema |
| getLabResults | GET /users/me/labResults | Unvalidated | apiGetZodAuthed + labResultsListResponseDtoSchema |
| getLabResult | GET /users/me/labResults/:id | Unvalidated | apiGetZodAuthed + labResultDtoSchema |
| createLabResult | POST /users/me/labResults | Unvalidated | apiPostZodAuthed + createLabResultResponseDtoSchema |
| logWeight | POST /ingest | Unvalidated | apiPostZodAuthed + logWeightResponseDtoSchema |
| logStrengthWorkout | POST /ingest | Unvalidated | apiPostZodAuthed + ingestAcceptedResponseDtoSchema |
| getPreferences | GET /preferences | SafeParse inline | apiGetZodAuthed |
| updateMassUnit | PUT /preferences | SafeParse inline | apiPutZodAuthed |
| getDerivedLedgerRuns | GET /users/me/derived-ledger/runs | SafeParse inline (kind:parse) | apiGetZodAuthed (kind:contract) |
| getDerivedLedgerReplay | GET /users/me/derived-ledger/replay | SafeParse inline | apiGetZodAuthed |
| getDerivedLedgerSnapshot | GET /users/me/derived-ledger/snapshot | NEW | apiGetZodAuthed |
| getFailures | GET /users/me/failures | Direct apiGetJsonAuthed | apiGetZodAuthed via lib/api/failures.ts |
| getFailuresRange | GET /users/me/failures/range | Direct apiGetJsonAuthed | apiGetZodAuthed via lib/api/failures.ts |
| ingestRawEventAuthed | POST /ingest | Unvalidated | apiPostZodAuthed |
| callFunctionAuthed | POST /functions/:name | Generic, no schema | UNVERIFIED (JsonValue rationale) |

### B) Hooks (all use truthOutcomeFromApiResult)

- useDailyFacts, useInsights, useIntelligenceContext, useDayTruth, useLabResult, useLabResults, useUploadsPresence
- useDerivedLedgerReplay, useDerivedLedgerRuns
- useFailures, useFailuresRange

---

## 4. Drop-in Code Blocks (Key Additions)

### lib/api/http.ts (FailureKind extension)

```ts
export type FailureKind = "network" | "http" | "parse" | "contract" | "unknown";
```

### lib/api/validate.ts (new file)

- `apiGetZodAuthed<T>(path, token, schema, opts?) => ApiResult<T>`
- `apiPostZodAuthed<T>(path, body, token, schema, opts?) => ApiResult<T>`
- `apiPutZodAuthed<T>(path, body, token, schema, opts?) => ApiResult<T>`
- On schema mismatch: returns `ApiFailure` with `kind: "contract"` and `json.issues`

### lib/contracts additions

- **failure.ts:** `failureListItemDtoSchema`, `failureListResponseDtoSchema`
- **labResults.ts:** `createLabResultResponseDtoSchema`
- **rawEvent.ts:** `ingestAcceptedResponseDtoSchema`
- **uploads.ts:** `uploadsPresenceResponseDtoSchema`, `uploadsPresenceLatestDtoSchema`

### lib/api/failures.ts (new file)

- `getFailures(day, token, opts?)` — validated
- `getFailuresRange(args, token, opts?)` — validated

### lib/api/derivedLedgerMe.ts

- Added `getDerivedLedgerSnapshot(args, token, opts?)` for `/users/me/derived-ledger/snapshot`
- Refactored to use `apiGetZodAuthed` (removed inline validation)

### Deleted

- `lib/api/derivedLedger.ts` (unvalidated duplicate; consolidated into derivedLedgerMe)

---

## 5. Proof Section (API → endpoint → schema → helper → tests)

| API Function | Endpoint | Schema | Helper | Test |
|--------------|----------|--------|--------|------|
| getDailyFacts | /users/me/daily-facts | dailyFactsDtoSchema | apiGetZodAuthed | validate.test.ts |
| getInsights | /users/me/insights | insightsResponseDtoSchema | apiGetZodAuthed | — |
| getIntelligenceContext | /users/me/intelligence-context | intelligenceContextDtoSchema | apiGetZodAuthed | — |
| getDayTruth | /users/me/day-truth | dayTruthDtoSchema | apiGetZodAuthed | — |
| getUploads | /users/me/uploads | uploadsPresenceResponseDtoSchema | apiGetZodAuthed | — |
| getLabResults | /users/me/labResults | labResultsListResponseDtoSchema | apiGetZodAuthed | — |
| getLabResult | /users/me/labResults/:id | labResultDtoSchema | apiGetZodAuthed | — |
| createLabResult | POST /users/me/labResults | createLabResultResponseDtoSchema | apiPostZodAuthed | — |
| logWeight | POST /ingest | logWeightResponseDtoSchema | apiPostZodAuthed | validate.test.ts |
| logStrengthWorkout | POST /ingest | ingestAcceptedResponseDtoSchema | apiPostZodAuthed | — |
| getPreferences | GET /preferences | preferencesSchema | apiGetZodAuthed | — |
| updateMassUnit | PUT /preferences | preferencesSchema | apiPutZodAuthed | — |
| getDerivedLedgerRuns | /users/me/derived-ledger/runs | derivedLedgerRunsResponseDtoSchema | apiGetZodAuthed | — |
| getDerivedLedgerReplay | /users/me/derived-ledger/replay | derivedLedgerReplayResponseDtoSchema | apiGetZodAuthed | — |
| getDerivedLedgerSnapshot | /users/me/derived-ledger/snapshot | derivedLedgerReplayResponseDtoSchema | apiGetZodAuthed | — |
| getFailures | /users/me/failures | failureListResponseDtoSchema | apiGetZodAuthed | — |
| getFailuresRange | /users/me/failures/range | failureListResponseDtoSchema | apiGetZodAuthed | — |
| ingestRawEventAuthed | POST /ingest | ingestAcceptedResponseDtoSchema | apiPostZodAuthed | — |

---

## 6. Acceptance Checklist

| Command | Expected |
|---------|----------|
| `npm run typecheck` | Exit 0 |
| `npm run lint` | Exit 0 |
| `npx jest lib/api/__tests__ lib/data/__tests__/truthOutcome.test.ts --watchman=false` | 8 tests pass |

**Full `npm test`** requires Java (Firestore emulator) and runs all suites.

---

## 7. UNVERIFIED List

| Item | Rationale |
|------|-----------|
| callFunctionAuthed | Generic function caller; no fixed DTO. Callers must validate at call site. Documented in `lib/api/functions.ts`. |

---

## 8. Test Coverage

- **validate.test.ts:** valid payload → ApiOk; invalid payload → ApiFailure kind:"contract"; HTTP 404 → unchanged
- **truthOutcome.test.ts:** contract failure → status:"error" (fail-closed)
