# Phase 1 Lock Criteria

Status: Authoritative  
Scope: Phase 1 — Personal Health Library  
Enforcement Level: CI-enforceable  
Source of Truth: Oli Constitution (Ratified)

This document defines the **complete and exclusive** criteria for Phase 1 completion.

All criteria are binary.  
Phase 1 is either **PASS** or **FAIL**.

No requirement may be weakened, substituted, reinterpreted, or partially satisfied.

---

## 1. Canonical Immutability Is Enforced

**Constitutional Basis**
- Article II — Invariant 1 (Personal Health History Is Irreplaceable)
- Article II — Invariant 3 (Truth Cannot Be Rewritten)
- Article IV — Phase 1 Boundary

**Lock Criteria**
- Canonical events are append-only.
- No code path exists that mutates or deletes canonical events.
- All corrections to truth are additive.
- CI contains tests asserting canonical immutability.

**Pass Condition**
- No canonical document can be rewritten once persisted.

**Fail Condition**
- Any mutation or overwrite of canonical truth is possible.

---

## 2. Failure Memory Is Explicit and Visible

**Constitutional Basis**
- Article II — Invariant 2 (Truth Is Visible, Not Assumed)
- Article III — Phase B (Epistemic Integrity)
- Article IV — Phase 1 Completion

**Lock Criteria**
- Failure memory exists as a first-class, immutable data surface.
- Failures are time-indexed.
- Failures are user-visible in the client.
- Failures cannot be hidden by readiness or “success” states.

**Pass Condition**
- A user can always inspect what failed, when, and why.

**Fail Condition**
- Any failure can exist without a visible surface.

---

## 3. Readiness Semantics Are Canonical and Global

**Constitutional Basis**
- Article I.5 (Readiness Definition)
- Article II — Invariant 5 (Readiness Has One Meaning Everywhere)
- Article IV — Phase 1 Completion

**Lock Criteria**
- Exactly one readiness vocabulary exists:
  - missing
  - partial
  - ready
  - error
- All user-facing readiness derives from this vocabulary.
- No alternate readiness meanings exist outside an adapter layer.
- CI blocks non-canonical readiness usage.

**Pass Condition**
- Readiness has identical meaning everywhere.

**Fail Condition**
- Any component uses readiness with different semantics.

---

## 4. Health Timeline Is Unified and Time-Indexed

**Constitutional Basis**
- Article II — Invariant 6 (Time Must Increase Value Automatically)
- Article IV — Phase 1 Completion

**Lock Criteria**
- A unified timeline exists as a first-class system surface.
- Timeline aggregation includes:
  - Canonical events
  - Derived facts
  - Failures
  - Readiness state
- Time is the primary axis of navigation.
- Gaps and missing data are explicitly representable.

**Pass Condition**
- A user can traverse time and understand what is known, missing, or failed.

**Fail Condition**
- Truth is fragmented across non-temporal views.

---

## 5. Replay Is Operationally Guaranteed

**Constitutional Basis**
- Article I.6 (Replay)
- Article III — Phase B
- Article IV — Phase 1 Completion

**Lock Criteria**
- Replay reconstructs:
  - what happened
  - what was known
  - when it was known
- Replay is accessible in production.
- Replay is read-only.
- Replay reflects derived truth as-of a specific timestamp.

**Pass Condition**
- Historical system truth can always be inspected.

**Fail Condition**
- Replay is dev-only, partial, or non-deterministic.

---

## 6. Export Is End-to-End Provable

**Constitutional Basis**
- Article II — Invariant 7 (Users Can Leave, But Cannot Replace Oli)
- Article V — Ownership

**Lock Criteria**
- A user can request data export.
- Export job creation is observable.
- Export execution is observable.
- Export artifact creation is observable.
- Export status resolution is observable.
- An automated test proves the full export path.

**Pass Condition**
- Export works end-to-end with no trust assumptions.

**Fail Condition**
- Export relies on manual verification or undocumented wiring.

---

## 7. Invariants Are Enforced by CI

**Constitutional Basis**
- Article III — Phase C (Constitutional Lock)
- Article IV — Phase 1 Completion
- Article VII — Governance & Enforcement

**Lock Criteria**
- CI contains explicit checks for all Phase 1 invariants.
- CI fails on any Phase 1 regression.
- No exception or bypass mechanism exists.

**Pass Condition**
- Phase 1 truth cannot regress silently.

**Fail Condition**
- Phase 1 violations can merge without CI failure.

---

## Phase 1 Completion Verdict

Phase 1 is **COMPLETE** if and only if **all** criteria above pass.

Partial completion is invalid.  
Interpretation is forbidden.
