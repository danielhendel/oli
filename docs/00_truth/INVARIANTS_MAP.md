# 🧱 INVARIANTS MAP  
### Constitutional Invariants → Enforcement Reality

**Status:** Binding  
**Authority:** Subordinate to the Oli Constitution  
**Scope:** CI enforcement, system design, audits, and AI governance

> This document maps each **constitutional invariant** to its **enforcement surface**.
> It exists to make trust **verifiable**, not aspirational.

---

## Purpose

The Constitution defines **what must never be violated**.  
This map defines **how those invariants are enforced, validated, and audited**.

It answers the question:

> **“How do we know this invariant is actually being upheld?”**

If an invariant is not enforced here, it is **not enforced at all**.

---

## How to Read This Map

- Each invariant is assigned a **stable ID** (`I-01` … `I-07`)
- Enforcement may occur at multiple layers:
  - schema
  - runtime
  - CI
  - process
- Enforcement is **phase-aware**:
  - Phase A — Structural Integrity
  - Phase B — Epistemic Integrity
  - Phase C — Constitutional Lock

Where enforcement is not yet implemented, it is stated explicitly.

---

## Invariant Enforcement Table

### **I-01 — Personal Health History Is Irreplaceable**

**Constitutional Statement:**  
Raw memory is never destroyed. Canonical truth is never rewritten. Derived truth is replayable.

| Aspect | Enforcement |
|-----|-------------|
| Enforcement Type | Structural + Runtime |
| Primary Mechanisms | Append-only storage, immutable canonical writes |
| CI Enforcement | Planned (Phase B) |
| Runtime Enforcement | Write-path guards (required) |
| Audit Evidence | Presence of full event history |
| Phase A | Raw + canonical append-only required |
| Phase B | Replay verification required |
| Phase C | Absolute lock |

**Notes:**  
Any deletion or mutation of canonical truth is a constitutional violation.

---

### **I-02 — Truth Is Visible, Not Assumed**

**Constitutional Statement:**  
No system may imply completeness without evidence. Silence is forbidden.

| Aspect | Enforcement |
|-----|-------------|
| Enforcement Type | Semantic + Process |
| Primary Mechanisms | Explicit failure memory, readiness states |
| CI Enforcement | Planned (Phase B) |
| Runtime Enforcement | Readiness must be explicit |
| Audit Evidence | Presence of `missing`, `partial`, or `error` states |
| Phase A | Failures preserved internally |
| Phase B | Failures visible to users |
| Phase C | Failures cannot be hidden |

**Notes:**  
UI suppression of uncertainty is allowed only in Phase A and only temporarily.

---

### **I-03 — Truth Cannot Be Rewritten**

**Constitutional Statement:**  
Historical truth may not be mutated or deleted. Corrections are additive.

| Aspect | Enforcement |
|-----|-------------|
| Enforcement Type | Structural |
| Primary Mechanisms | Immutable canonical schema, additive correction model |
| CI Enforcement | Required |
| Runtime Enforcement | Required |
| Audit Evidence | No updates to canonical records |
| Phase A | Append-only required |
| Phase B | Additive correction required |
| Phase C | Absolute immutability |

**Notes:**  
Any “update” operation on canonical truth is invalid by definition.

---

### **I-04 — Intelligence Is a Consumer, Never an Author**

**Constitutional Statement:**  
AI and optimization systems may never write truth.

| Aspect | Enforcement |
|-----|-------------|
| Enforcement Type | Permission + Process |
| Primary Mechanisms | Write-path isolation, AI permission boundaries |
| CI Enforcement | Required |
| Runtime Enforcement | Required |
| Audit Evidence | No AI-originated canonical writes |
| Phase A | AI blocked from canonical paths |
| Phase B | AI actions logged |
| Phase C | AI permanently non-authoritative |

**Notes:**  
This invariant applies to **all** AI systems, including Codex and internal tooling.

---

### **I-05 — Readiness Has One Meaning Everywhere**

**Constitutional Statement:**  
Readiness semantics are global and absolute.

| Aspect | Enforcement |
|-----|-------------|
| Enforcement Type | Semantic |
| Primary Mechanisms | Enumerated readiness states |
| CI Enforcement | Required |
| Runtime Enforcement | Required |
| Audit Evidence | No boolean or inferred readiness |
| Phase A | Internal readiness allowed |
| Phase B | User-facing readiness required |
| Phase C | Readiness semantics locked |

**Notes:**  
“Ready” may never mean “loaded” or “rendered.”

---

### **I-06 — Time Must Increase Value Automatically**

**Constitutional Statement:**  
The system must compound value over time without feature changes.

| Aspect | Enforcement |
|-----|-------------|
| Enforcement Type | Architectural |
| Primary Mechanisms | Longitudinal data model, replay |
| CI Enforcement | Planned (Phase B) |
| Runtime Enforcement | Required |
| Audit Evidence | Ability to replay historical insight |
| Phase A | Data preserved |
| Phase B | Replay operational |
| Phase C | Replay mandatory forever |

**Notes:**  
If historical data becomes unusable, this invariant is broken.

---

### **I-07 — Users Can Leave, But Cannot Replace Oli**

**Constitutional Statement:**  
Users may export data, but continuity and semantics are preserved only in Oli.

| Aspect | Enforcement |
|-----|-------------|
| Enforcement Type | Structural + Policy |
| Primary Mechanisms | Export without semantic downgrade |
| CI Enforcement | Planned (Phase B) |
| Runtime Enforcement | Required |
| Audit Evidence | Successful export + loss of replay elsewhere |
| Phase A | Export allowed |
| Phase B | Export correctness verified |
| Phase C | Semantics preserved permanently |

**Notes:**  
This is ethical lock-in through correctness, not coercion.

---

## CI Responsibilities

CI is the **judiciary** of these invariants.

CI must:
- block changes that violate enforced invariants
- escalate warnings to blockers as phases advance
- reference this map when enforcing rules

If CI allows a violation, CI is wrong.

---

## AI Responsibilities

AI systems must:
- reference invariant IDs when proposing changes
- never bypass enforcement
- treat unenforced invariants as **pending**, not optional

AI may not claim enforcement that does not exist.

---

## Amendment Rules

Any change to:
- invariant definitions
- invariant IDs
- enforcement guarantees

must be treated as a **constitutional amendment** and processed via RFC with explicit justification.

---

## Final Rule

> **If an invariant cannot be pointed to here, it is not protected.**

---

### Placement
- **File path:** `docs/00_truth/INVARIANTS_MAP.md`
- **Change frequency:** Rare
- **Governance level:** Constitutional-adjacent
