# Phase 1.5 — Sprint 1  
## HealthScore Derivation  
**Constitutional Certification Record**

---

## 1. Sprint Identity

- **Sprint:** Phase 1.5 — Sprint 1  
- **Scope:** Server-side HealthScore derivation (compute, write immutable, expose via API)  
- **Merge Strategy:** Squash & Merge  
- **Base Branch:** main  
- **Merge Date:** 2026-02-13  

Implementation Commit SHA: b13e90a  
Merge Commit SHA: 51e19d0  

---

## 2. Objective (Binary)

Implement HealthScore derivation under constitutional constraints:

Derivation must:

- Compute composite score (0–100) + tier from four domains (Recovery / Training / Nutrition / Body)
- Produce status: stable | attention_required | insufficient_data
- Expose explicit missing inputs per domain (missing[])
- Write immutable document with modelVersion + computedAt
- Be triggered from pipeline (e.g. recomputeForDay) after derived ledger
- Be read-only via GET /users/me/health-score?day=YYYY-MM-DD
- Validate against healthScoreDocSchema

Derivation must NOT:

- Be computed on the client
- Be mutable after write
- Add recommendation or interpretation logic
- Create new ingestion paths for raw/canonical events

---

## 3. Files Modified / Added

### Modified
- services/functions/src/pipeline/recomputeForDay.ts
- services/functions/src/pipeline/derivedLedger.ts
- services/api/src/routes/usersMe.ts
- lib/contracts/index.ts

### Added
- services/functions/src/healthScore/computeHealthScoreV1.ts
- services/functions/src/healthScore/writeHealthScoreImmutable.ts
- services/functions/src/healthScore/__tests__/writeHealthScoreImmutable.test.ts
- services/functions/src/healthScore/__tests__/healthScore.v1.determinism.test.ts
- lib/contracts/healthScore.ts
- services/api/src/types/dtos.ts (health-score DTO as needed)

---

## 4. Architectural Compliance Verification

### 4.1 Server-Only Derivation
All scoring logic lives in services/functions (computeHealthScoreV1).
No scoring in API route or client.
Read path: API reads stored document only.

Status: PASS

---

### 4.2 Immutable Write
writeHealthScoreImmutable writes once per day to users/{uid}/healthScores/{day}.
No update path; recompute overwrites by design or creates new run.
Schema enforces modelVersion + computedAt.

Status: PASS

---

### 4.3 Pipeline Integration
recomputeForDay (or equivalent) runs derivation after derived ledger for the day.
HealthScore is a derived artifact from canonical/derived data only.

Status: PASS

---

### 4.4 API Read-Only
GET /users/me/health-score returns stored document.
Validated against healthScoreDocSchema.
No mutation endpoints.

Status: PASS

---

### 4.5 Determinism
Determinism tests (healthScore.v1.determinism.test.ts) verify same inputs → same output.
No client-side or non-deterministic scoring.

Status: PASS

---

## 5. Determinism & Replay Safety

- Derivation uses only canonical/derived inputs.
- No mutation of canonical events.
- HealthScore document is derived artifact; replay of day recomputes consistently.
- No modification to ledger write path other than triggering derivation.

Status: PASS

---

## 6. Testing & Gates

Post-merge on main:

npm run typecheck → Exit code 0  
npm run lint → Exit code 0  
npm test → Suites and tests passed  

All gates green on main at implementation SHA b13e90a.

---

## 7. Acceptance Checklist

computeHealthScoreV1 (deterministic) → PASS  
writeHealthScoreImmutable (immutable write) → PASS  
Pipeline triggers derivation after ledger → PASS  
GET /users/me/health-score (read-only, validated) → PASS  
healthScoreDocSchema in contracts → PASS  
Determinism tests → PASS  
No client-side scoring → PASS  
No new ingestion paths → PASS  
Gates green → PASS  

---

## 8. Certification Statement

Sprint 1 satisfies all Phase 1.5 constitutional constraints for HealthScore derivation.

HealthScore is:

- Immutable
- Deterministic
- Server-derived only
- Fail-closed (API returns stored truth or error)
- Read-only at API boundary
- Trust-first (single source of truth)

No architectural boundaries were weakened.
No invariants were compromised.

Sprint 1 is constitutionally complete and locked at implementation commit SHA b13e90a (merge 51e19d0).
