# 🚫 CODEBASE RULES  
### Non-Negotiable Guardrails for the Oli Repository

**Status:** Binding  
**Authority:** Subordinate to the Oli Constitution  
**Applies to:** All contributors, AI agents, CI systems, and automation

---

## 1. SOURCE OF AUTHORITY

This file operationalizes, in order:

1. `docs/00_truth/CONSTITUTION.md`  
2. `docs/00_truth/SOURCE_OF_TRUTH.md`  
3. `docs/00_truth/GOVERNANCE_CHARTER.md`  
4. `docs/INDEX.md`

Conflicts invalidate the change.

---

## 2. FOLDER AUTHORITY

- `docs/00_truth/` — immutable  
- `docs/70_adrs/` — append-only  
- `docs/80_rfc/` — proposal entry  
- `docs/90_audits/` — immutable  

When unsure, open an RFC.

---

## 3. TRUTH WRITE RULES

### Canonical Truth
- Written only via authoritative paths
- Never mutated or deleted
- Corrections are additive

### Derived Truth
- Deterministic
- Recomputable
- Never manually edited

Forbidden:
- Rewriting history
- Silent fixes
- Inferring missing truth

---

## 4. REPLAY GUARANTEES

All changes must preserve replay:
- what happened
- what was known
- when it was known

Breaking replay is forbidden.

---

## 5. READINESS SEMANTICS

Allowed states:
- missing
- partial
- ready
- error

UI may not reinterpret readiness.

---

## 6. PHASE 1 BOUNDARIES

Phase 1 is locked:
- schemas immutable
- invariants enforced forever
- replay guaranteed

Phase ≥2 systems are guests.

---

## 7. AI RULES

AI must:
- read `docs/INDEX.md`
- plan before edits
- defer to CI

AI may never:
- write canonical truth
- modify `docs/00_truth/`
- bypass governance

---

## 8. CI ENFORCEMENT

CI is the judiciary.

Blocked by CI = forbidden.

---

## 9. ESCALATION RULE

RFCs are mandatory for changes affecting:
- truth semantics
- replay
- readiness
- write paths
- Phase 1
- CI invariants

---

## 10. FINAL RULE

> **Preserve history. Escalate explicitly.**
