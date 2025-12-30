# Golden Path — Manual Weight Logging (End-to-End Truth Loop)

**Status:** Authoritative execution checklist (repo-truth)  
**Generated from:** `oli-audit-2025-12-30_1239-*` (2025-12-30)  
**Goal:** Make **manual weight logging** the undeniable template for every future domain.

---

## 0) Definition of “Done” (Non-negotiable)

This golden path is **DONE** only when all of the following are true:

1) The user can log weight in the app and see it reflected in:
   - RawEvent
   - CanonicalEvent
   - DailyFacts
   - IntelligenceContext
   - Command Center summary (or body module UI)

2) Logging the same weight twice (same payload) is **idempotent**:
   - Does **not** create duplicates
   - Returns the same `rawEventId`

3) The pipeline can be recomputed deterministically without drift:
   - DailyFacts computedAt updates
   - Derived values remain stable for the same underlying canonical events

4) Failures are explicit (no silent drops):
   - Invalid payload → 400
   - Invalid doc shape → 500 with requestId
   - Normalization rejection → warn log (functions), no write to events

---

## 1) System Contract (Truth Loop)

### The canonical truth loop (actual system today)

**Mobile UI**
→ `POST /users/me/body/weight`
→ writes Firestore: `/users/{uid}/rawEvents/{rawEventId}`

**Functions Trigger #1**
`onRawEventCreated`
→ validates RawEvent → maps to CanonicalEvent
→ writes `/users/{uid}/events/{eventId}`

**Functions Trigger #2**
`onCanonicalEventCreated`
→ recompute Day:
- `/users/{uid}/dailyFacts/{day}`
- `/users/{uid}/insights/{insightId}` (may be empty for weight-only)
- `/users/{uid}/intelligenceContext/{day}`

**Mobile read**
- `GET /users/me/daily-facts?day=YYYY-MM-DD`
- `GET /users/me/intelligence-context?day=YYYY-MM-DD`
- Command Center renders summary.

---

## 2) Files Involved (Repo-Truth)

### Mobile UI (capture)
- `app/(app)/body/weight.tsx` ✅
- `app/(app)/command-center/index.tsx` ✅ (quick action link, summary)
- `lib/events/manualWeight.ts` ✅ (payload builder + idempotency key)
- `lib/api/usersMe.ts` ✅ (`logWeight` API call)
- `lib/auth/AuthProvider.tsx` ✅ (token)

### Shared contracts (authoritative schemas)
- `lib/contracts/weight.ts` ✅ (LogWeight DTOs)
- `lib/contracts/rawEvent.ts` ✅ (`rawEventDocSchema`, payload schemas by kind)

### Cloud Run API (ingest + read surfaces)
- `services/api/src/routes/usersMe.ts` ✅
  - POST `/users/me/body/weight`
  - GET `/users/me/daily-facts`
  - GET `/users/me/intelligence-context`
- `services/api/src/middleware/auth.ts` ✅
- `services/api/src/middleware/requestId.ts` ✅
- `services/api/src/lib/dayKey.ts` ✅ (ymd calculation)
- `services/api/src/lib/idempotency.ts` ✅ (support utilities)
- `services/api/src/types/dtos.ts` ✅ (zod schemas)
- `services/api/src/types/day.ts` ✅ (query parsing)

### Functions (pipeline)
- `services/functions/src/normalization/onRawEventCreated.ts` ✅
- `services/functions/src/validation/rawEvent.ts` ✅ (`parseRawEvent`)
- `services/functions/src/normalization/mapRawEventToCanonical.ts` ✅ (manual weight mapping)
- `services/functions/src/realtime/onCanonicalEventCreated.ts` ✅ (daily recompute writes)
- `services/functions/src/dailyFacts/aggregateDailyFacts.ts` ✅ (latest weight wins)
- `services/functions/src/dailyFacts/enrichDailyFacts.ts` ✅ (baselines/averages/confidence)
- `services/functions/src/intelligence/buildDailyIntelligenceContext.ts` ✅ (stored context doc)
- `services/functions/src/insights/rules.ts` ✅ (insight engine; may output none for weight-only)

### Debug helpers (optional but useful)
- `app/debug/api-smoke.tsx` ✅ (API connectivity)
- `lib/debug/recompute.ts` ✅ (admin recompute calls)
- `services/functions/src/http/recomputeDailyFactsAdminHttp.ts` ✅
- `services/functions/src/http/recomputeInsightsAdminHttp.ts` ✅
- `services/functions/src/http/recomputeDailyIntelligenceContextAdminHttp.ts` ✅

### Tests that must stay green
- `services/functions/src/normalization/mapRawEventToCanonical.test.ts` ✅
- `services/functions/src/dailyFacts/__tests__/aggregateDailyFacts.test.ts` ✅
- `services/functions/src/dailyFacts/__tests__/enrichDailyFacts.test.ts` ✅
- `services/functions/src/intelligence/__tests__/buildDailyIntelligenceContext.test.ts` ✅
- `services/functions/src/http/__tests__/ingestRawEventHttp.test.ts` ✅ (deprecated endpoint behavior)

---

## 3) Invariants (Must Always Hold)

### Invariant A — Idempotency (manual weight)
**Source of truth (mobile):** `manualWeightIdempotencyKey(payload)` in `lib/events/manualWeight.ts`

**Rules:**
- Payload rounding must be stable:
  - `weightKg` rounded to 4 decimals before key generation
- Key format:
  - `mw_${time}_${timezone}_${roundedKg}` with non-word characters replaced

**Server behavior:**
- API reads `Idempotency-Key` or `X-Idempotency-Key`
- If present, uses it as the Firestore doc id for rawEvents
- Uses `docRef.create()`; if already exists → returns success

✅ PASS WHEN:
- Submitting same weight twice returns `ok:true` and the same `rawEventId`
- Only one rawEvents doc exists for that key

---

### Invariant B — Ownership (path correctness)
All weight data must live under `/users/{uid}/...`

✅ PASS WHEN:
- RawEvent is written to: `/users/{uid}/rawEvents/{rawEventId}`
- CanonicalEvent is written to: `/users/{uid}/events/{eventId}`
- DailyFacts: `/users/{uid}/dailyFacts/{day}`
- IntelligenceContext: `/users/{uid}/intelligenceContext/{day}`

---

### Invariant C — Runtime validation at boundaries
**API boundary:**
- `logWeightRequestDtoSchema.safeParse(req.body)` must pass
- `rawEventDocSchema.safeParse(rawEvent)` must pass before write

**Functions boundary:**
- `parseRawEvent(snapshot.data())` must pass
- Mapper must accept payload and map to canonical

✅ PASS WHEN:
- Malformed request body returns 400 with details
- Malformed rawEvent is dropped (warn logged) and does NOT create canonical events

---

## 4) Expected Data Shapes (Truth Targets)

### RawEvent doc (weight)
Written by API in `services/api/src/routes/usersMe.ts`

Expected keys:
- `schemaVersion: 1`
- `id: <rawEventId>`
- `userId: <uid>`
- `provider: "manual"`
- `kind: "weight"`
- `receivedAt: <iso>`
- `observedAt: payload.time`
- `payload.time`
- `payload.timezone`
- `payload.day` (API computes it)
- `payload.weightKg`
- `payload.bodyFatPercent` (optional, nullable allowed)

✅ PASS WHEN:
- `rawEventDocSchema` validates it

---

### CanonicalEvent doc (weight)
Written by functions mapper in `mapRawEventToCanonical.ts`

Expected keys:
- `id: raw.id` (canonical id equals rawEvent id)
- `kind: "weight"`
- `start === end === payload.time`
- `day` derived via timezone
- `weightKg`
- `bodyFatPercent` nullable

✅ PASS WHEN:
- A canonical event exists for the rawEvent id
- It matches the mapped shape exactly (no drift fields)

---

### DailyFacts doc
Computed by `aggregateDailyFactsForDay` + enrichment

Minimum keys:
- `schemaVersion: 1`
- `userId`
- `date: YYYY-MM-DD`
- `computedAt: iso`
- `body.weightKg` present after weight event exists
- `body.bodyFatPercent` present only if valid number

✅ PASS WHEN:
- For a day with multiple weights, the **latest** timestamp wins
- DailyFacts doc is updated after canonical event creation

---

### IntelligenceContext doc
Written by `buildDailyIntelligenceContextDoc(...)` in functions

✅ PASS WHEN:
- Doc exists at `/users/{uid}/intelligenceContext/{day}`
- It references today’s DailyFacts (or contains sufficient context fields)
- (No PII logging required; this is a stored doc)

---

## 5) Manual Verification Checklist (Deterministic)

### 5.1 Mobile UX (weight log)
- [ ] Open app → Command Center
- [ ] Tap **Log Weight** (routes to `/ (app)/body/weight`)
- [ ] Enter weight (lb or kg) and optional body fat %
- [ ] Tap Save
- [ ] UI shows:
  - saving → saved
  - prints `rawEventId` on success
- [ ] App returns to previous screen

✅ PASS WHEN:
- Save works with valid input
- Invalid input blocks save and shows helper text
- Auth/token failures show actionable message (including requestId when available)

---

### 5.2 API correctness (ingestion)
- [ ] Confirm request includes id token
- [ ] Confirm request includes `Idempotency-Key` header
- [ ] Confirm response schema: `{ ok:true, rawEventId, day }`

✅ PASS WHEN:
- Invalid DTO → 400 `{ ok:false, error:{ code:"INVALID_BODY", ... requestId } }`
- Invalid time parse → 400
- Valid request → 200 `ok:true`

---

### 5.3 Idempotency proof
- [ ] Submit identical weight twice in under 10 seconds
- [ ] Verify:
  - response rawEventId is identical both times
  - only one rawEvents doc exists for that id/key

✅ PASS WHEN:
- Second request does NOT create a second Firestore doc

---

### 5.4 Pipeline proof (raw → canonical → facts → context)
After logging weight:

- [ ] Verify RawEvent exists at:
  - `/users/{uid}/rawEvents/{rawEventId}`
- [ ] Verify CanonicalEvent exists at:
  - `/users/{uid}/events/{rawEventId}`
- [ ] Verify DailyFacts exists at:
  - `/users/{uid}/dailyFacts/{day}`
- [ ] Verify IntelligenceContext exists at:
  - `/users/{uid}/intelligenceContext/{day}`

✅ PASS WHEN:
- All four documents exist and validate shape expectations

---

## 6) Recompute / Determinism Checklist

### 6.1 Recompute today pipeline (admin)
Using `lib/debug/recompute.ts` + debug UI:
- [ ] Trigger recompute dailyFacts → insights → context
- [ ] Verify docs are re-written (computedAt changes)
- [ ] Verify body facts remain consistent (weightKg unchanged)

✅ PASS WHEN:
- Recompute does not duplicate insights
- DailyFacts “latest weight wins” remains true
- Context matches facts

---

## 7) Known Limitations (Repo-Truth)

- Insights may legitimately be empty for weight-only days depending on rules.
  That’s acceptable if:
  - DailyFacts and IntelligenceContext still compute correctly.
- UI may not auto-refresh instantly after save because reads are request-based,
  not Firestore listeners (this is OK for v1 if consistent and explained).

---

## 8) Required “Green Gates” (Must pass before moving on)

### Local gates
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run test`

### Functions gates
- [ ] All functions unit tests remain green (normalization + dailyFacts + intelligence)

✅ PASS WHEN:
- All gates green AND all manual verification steps above pass.

---

## 9) Next Golden Path After This

Only after **this doc is 100% checked off**, we clone the pattern for:
1) Manual Workout
2) Manual Sleep
3) Manual Steps
4) Manual HRV

Rule: **no breadth until depth is boring.**
