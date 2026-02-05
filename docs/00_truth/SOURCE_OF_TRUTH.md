# 📍 SOURCE OF TRUTH  
### How Truth Is Determined in the Oli Repository

**Status:** Binding  
**Authority:** Subordinate to the Oli Constitution  
**Scope:** All documentation, code, data, CI enforcement, and AI behavior

---

## Purpose

This document defines **how conflicts are resolved** when multiple sources of information exist.

It answers one question only:

> **When two things disagree, which one is correct?**

This document does **not** define new rules.  
It establishes **precedence** among existing ones.

---

## The Canonical Truth Order

All truth in the Oli repository is governed by the following hierarchy.  
Each level constrains the levels below it.

---

### **T0 — Constitutional Truth (Highest Authority)**

Defines what must never be violated.

Includes:
- `docs/00_truth/CONSTITUTION.md`
- `docs/00_truth/GOVERNANCE_CHARTER.md`
- Phase lock declarations
- Invariants and irreversibility guarantees

**Rules:**
- If something conflicts with T0, it is invalid.
- T0 may only change via explicit constitutional amendment.
- Convenience, UX, and velocity never override T0.

---

### **T1 — Runtime Truth (Enforced Reality)**

Defines what actually exists and is enforced today.

Includes:
- Application code
- Deployed infrastructure
- CI gates and invariant checks
- Audit receipts and proofs

**Rules:**
- If it runs and passes CI, it is real.
- If it conflicts with T0, it must be corrected.
- Runtime truth may lag intent, but may not contradict invariants.

---

### **T2 — Intent & Interpretation**

Defines what the system is designed to be and how it is understood.

Includes:
- Product intent and roadmap
- Architecture explanations
- Data semantics and design principles
- Golden paths and examples

**Rules:**
- T2 may evolve over time.
- T2 must remain compatible with T0.
- If T2 conflicts with T1, the conflict must be made explicit via RFC.

---

### **T3 — Proposals & Decisions**

Defines how change is proposed and decided.

Includes:
- RFCs (`docs/80_rfc/`)
- ADRs (`docs/70_adrs/`)

**Rules:**
- RFCs propose change; they do not enact it.
- ADRs record decisions; they do not rewrite history.
- No change to T0–T2 is valid without passing through T3 when required.

---

## Conflict Resolution Rules

When two sources disagree, resolve conflicts as follows:

1. **Constitution beats everything.**  
   If T0 says no, the answer is no.

2. **CI beats human opinion.**  
   If CI blocks it, the change is forbidden until rules are updated.

3. **Runtime truth beats intent.**  
   If code behaves differently than docs, the docs are wrong until corrected.

4. **Intent beats proposals.**  
   RFCs and ADRs may not contradict established intent without justification.

5. **Silence is not truth.**  
   Missing documentation does not imply permission.

---

## Folder Authority Is Truth Authority

Folder names encode **permission level**, not category.

- `docs/00_truth/` — constitutional law (effectively immutable)
- `docs/70_adrs/` — append-only historical decisions
- `docs/80_rfc/` — mandatory entry point for certain changes
- `docs/90_audits/` — immutable historical proof

If a change feels uncomfortable, it probably belongs in an RFC.

---

## AI and Automation Interpretation

AI systems (including Codex, CI, and tooling) are:
- non-authoritative
- advisory by default
- bound by this truth hierarchy

**AI must:**
- read `docs/INDEX.md` before acting
- treat `docs/00_truth/` as immutable unless explicitly instructed otherwise
- propose changes via RFC when required
- defer to CI enforcement without exception

AI may not infer permission from absence.

---

## Amendments and Evolution

This document may be clarified, but not weakened.

Any change that alters:
- the truth hierarchy
- conflict resolution rules
- authority boundaries

…must be evaluated as a constitutional amendment.

---

## Final Rule

> **When in doubt, preserve history, preserve replay, and escalate explicitly.**

Trust is not rebuilt by convenience.  
It is preserved by correctness.

---

### Placement & Usage Notes
- **File path:** `docs/00_truth/SOURCE_OF_TRUTH.md`
- **Must be linked from:**
  - `docs/INDEX.md`
  - `CONSTITUTION.md`
  - `CONTRIBUTING.md`
- **Change frequency:** Rare
