# 🏛️ OLI GOVERNANCE & INTERPRETATION CHARTER  
### Operational Law for Applying the Oli Constitution

**Status:** Binding  
**Authority:** Subordinate to the Oli Constitution  
**Governs:** Interpretation, enforcement, and evolution of truth, systems, and process  
**Scope:** All contributors, AI agents, CI systems, and governance bodies

> This Charter defines **how the Constitution is applied in practice**.  
> It may clarify, but never weaken, constitutional truth.

---

## 1. PURPOSE

The Oli Constitution defines **what must never be violated**.  
This Charter defines **how work proceeds correctly within those constraints**.

This document exists to:
- translate invariants into day-to-day execution
- prevent misinterpretation or over-freezing
- ensure safe evolution without erosion of trust
- give humans and AI agents unambiguous operating rules

If the Constitution answers *“Is this allowed?”*  
this Charter answers *“How do we do this correctly?”*

---

## 2. GOVERNING REFERENCES (AUTHORITATIVE)

All interpretation in this Charter is constrained by:

1. `docs/00_truth/CONSTITUTION.md`  
2. `docs/00_truth/SOURCE_OF_TRUTH.md`  
3. `docs/INDEX.md`

If this Charter conflicts with any of the above, **this Charter is wrong**.

---

## 3. GOVERNANCE MODEL

### 3.1 Authority Layers

| Layer | Purpose | Change Model |
|------|--------|--------------|
| Constitution (T0) | Defines invariants and irreversibility | Rare, explicit amendment |
| Governance Charter | Interprets application | Rare, clarifying only |
| ADRs | Record decisions | Append-only |
| RFCs | Propose change | Required for defined classes |
| Code + CI | Enforced reality | Continuous |

No lower layer may contradict a higher one.

---

## 4. INTERPRETATION PRINCIPLES

### 4.1 Principle of Irreversibility
If an action makes it impossible to reconstruct:
- what happened
- what was known
- when it was known  

…it is forbidden.

Prefer additive data, versioned interpretation, and explicit failure records.

---

### 4.2 Principle of Explicitness
If a state matters, it must be **represented as data**.

Forbidden interpretations:
- “The UI implies it”
- “We know this implicitly”
- “It’s probably correct”

Uncertainty must exist explicitly.

---

### 4.3 Principle of Additive Correction
Errors are resolved by **adding new truth**, never mutating old truth.

Historical truth is never erased.

---

### 4.4 Principle of Least Authority
Systems may only do what they are explicitly authorized to do.

Defaults:
- read-only
- non-authoritative
- advisory

This applies most strictly to AI systems.

---

## 5. AUTHORITATIVE WRITE PATHS

An **Authoritative Write Path** is a documented, audited boundary through which canonical truth may be written.

Anything not explicitly declared authoritative is **read-only by default**.

All write paths must:
- be named
- log provenance
- be replayable
- be CI-enforced

---

## 6. READINESS SEMANTICS

Readiness is a **truth statement**, not a UI convenience.

| State | Meaning |
|------|--------|
| missing | no truth exists |
| partial | truth exists but is incomplete |
| ready | all required truth exists |
| error | truth exists but cannot be verified |

UI may translate readiness, but may never override it.

---

## 7. PHASE BOUNDARIES

### Phase 1 (Kernel)
- Canonical schemas immutable
- Replay guarantees permanent
- Invariants never bypassed

Phase 1 is the kernel, not the entire OS.

### Phase ≥2
- May read Phase 1 truth
- May not write Phase 1 truth
- Must be additive and versioned

---

## 8. RFC PROCESS (MANDATORY)

RFCs are required for changes affecting:
- truth semantics
- replay behavior
- readiness meaning
- authoritative write paths
- Phase 1 boundaries
- CI invariants

RFCs propose change; they do not enact it.

---

## 9. ADR PROCESS

ADRs record **why** a decision was made.

They are append-only and must not be edited.

---

## 10. CI AS JUDICIARY

CI is the enforcement authority.

If CI blocks a change, the change is forbidden  
until rules are explicitly updated.

There is no silent override.

---

## 11. AI GOVERNANCE

AI systems are:
- non-authoritative
- advisory by default
- bound by all governance rules

AI must:
- read `docs/INDEX.md`
- produce a plan before edits
- defer to CI

AI may not:
- write canonical truth
- alter history
- bypass RFC/ADR requirements

---

## 12. FAILURE MODE

When uncertain:
1. Stop
2. Preserve raw data
3. Record failure
4. Prefer additive correction
5. Escalate via RFC

---

## 13. FINAL RULE

> **Oli must always be more honest than it is helpful.**

---

**File:** `docs/00_truth/GOVERNANCE_CHARTER.md`
