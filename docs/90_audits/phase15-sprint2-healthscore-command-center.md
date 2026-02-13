# Phase 1.5 — Sprint 2  
## Command Center Integration (HealthScore)  
**Constitutional Certification Record**

---

## 1. Sprint Identity

- **Sprint:** Phase 1.5 — Sprint 2  
- **Scope:** Surface HealthScore (derived, immutable, server-computed) in Dash  
- **Merge Strategy:** Squash & Merge  
- **Certification Commit SHA:** 8241b2b  
- **Base Branch:** main  
- **Merge Date:** 2026-02-13  

---

## 2. Objective (Binary)

Integrate HealthScore into Dash under constitutional constraints:

Dash must show:

- Composite score (0–100) + tier (Excellent / Good / Fair / Poor)
- Four domain scores (Recovery / Training / Nutrition / Body)
- Status: stable | attention_required | insufficient_data
- Explicit missing inputs per domain (missing[])
- Metadata: modelVersion + computedAt
- Explicit states:
  - loading
  - empty (missing)
  - error
  - offline (fail-closed)

Dash must NOT:

- Perform client-side scoring
- Query Firestore directly
- Add recommendation layer
- Add interpretation language
- Create ingestion paths
- Modify derivation logic

---

## 3. Files Modified / Added

### Modified
- app/(app)/(tabs)/dash.tsx
- lib/api/usersMe.ts

### Added
- lib/data/useHealthScore.ts
- lib/format/healthScore.ts
- lib/format/__tests__/healthScore.test.ts

---

## 4. Architectural Compliance Verification

### 4.1 No Firebase in Screens
Dash imports only hook + UI components.
No firebase/firestore imports.
Data flows exclusively via useHealthScore.

Status: PASS

---

### 4.2 No Client-Side Scoring
useHealthScore.ts:
- Calls getHealthScore
- Uses truthOutcomeFromApiResult
- Contains no scoring logic

All scoring originates from server-derived immutable document.

Status: PASS

---

### 4.3 Derived Truth Only (Server-Computed)
API call:
GET /users/me/health-score?day=YYYY-MM-DD

Validated against healthScoreDocSchema.
Read-only UI surface.

Status: PASS

---

### 4.4 Explicit State Handling

Loading → status === "partial"
Missing → status === "missing"
Error → status === "error"
Offline → reason === "network"

Status: PASS

---

### 4.5 Neutral / Trust-First UX

Missing state copy:

Title: "Health Score not available"
Description: "No Health Score has been computed for this day."
Explanation: "Health Score is derived server-side from available inputs."

No advisory language.
No recommendations.

Status: PASS

---

## 5. Determinism & Replay Safety

- No ingestion logic added.
- No mutation of canonical events.
- No modification to ledger.
- No modification to derived computation.
- Pure read-only surface.

Status: PASS

---

## 6. Testing & Gates

Post-merge on main:

npm run typecheck → Exit code 0  
npm run lint → Exit code 0  
npm test → 76 test suites, 296 tests, all passed  

All gates green on main at SHA 8241b2b.

---

## 7. Acceptance Checklist

Typed API helper (getHealthScore) → PASS  
Hook with partial | missing | error | ready → PASS  
Offline fail-closed behavior → PASS  
Composite score + tier displayed → PASS  
Four domain scores + tiers → PASS  
Per-domain missing[] displayed → PASS  
Metadata displayed → PASS  
No Firebase in screens → PASS  
No client-side scoring → PASS  
No new ingestion paths → PASS  
Neutral UX language → PASS  
Gates green → PASS  

---

## 8. Certification Statement

Sprint 2 satisfies all Phase 1.5 constitutional constraints.

Dash now surfaces HealthScore as:

- Immutable
- Deterministic
- Server-derived
- Fail-closed
- Read-only
- Trust-first

No architectural boundaries were weakened.
No invariants were compromised.

Sprint 2 is constitutionally complete and locked at commit SHA 8241b2b.
