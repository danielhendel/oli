# 📚 Oli Documentation Index

## Purpose

This document defines **how truth, authority, and change are structured** in the Oli repository.

It is the **single canonical entry point** for understanding:
- what is true
- where that truth lives
- who may change what
- how evolution occurs without violating trust

If there is ambiguity, this index governs how it is resolved.

---

## Truth & Authority Hierarchy

Oli documentation is organized by **levels of authority**.  
Higher levels constrain lower levels. Lower levels may never contradict higher ones.

### **T0 — Constitutional Truth (Binding)**
Defines invariants, irreversibility, and the meaning of truth.

- Immutable except through explicit constitutional amendment
- Violations are invalid by definition

**Lives in:**  
`docs/00_truth/`

Includes:
- `CONSTITUTION.md`
- `GOVERNANCE_CHARTER.md`
- `SOURCE_OF_TRUTH.md`
- `INVARIANTS_MAP.md`
- Phase lock declarations

---

### **T1 — Runtime Truth (Enforced Reality)**
What actually exists and is enforced today.

- Code
- CI gates
- Deployed infrastructure
- Audits and proofs

If it runs and passes CI, it is real — but not necessarily *correct* unless aligned with T0.

**Lives in:**  
Codebase + `docs/90_audits/`

---

### **T2 — Intent & Interpretation**
What the system is designed to be and how it is understood.

- Product intent
- Architecture explanations
- Data semantics
- Design principles

May evolve, but must remain compatible with T0 and T1.

**Lives in:**  
`docs/10_product/`  
`docs/20_architecture/`  
`docs/30_data/`

---

### **T3 — Change Proposals**
How evolution is proposed, evaluated, and accepted.

- RFCs propose change
- ADRs record decisions

Nothing in T0–T2 changes without passing through T3 when required.

**Lives in:**  
`docs/70_adrs/`  
`docs/80_rfc/`

---

## Folder Authority Map

Folder names **encode permission level**, not just category.

| Folder | Authority | Mutability |
|------|----------|------------|
| `docs/00_truth/` | Constitutional law | Effectively immutable |
| `docs/10_product/` | Product intent | Evolves via RFC when required |
| `docs/20_architecture/` | System interpretation | Evolves via ADR |
| `docs/30_data/` | Truth semantics | Highly constrained |
| `docs/40_engineering/` | Execution process | Evolves normally |
| `docs/50_security_privacy/` | Trust protection | Highly constrained |
| `docs/60_process/` | Human workflow | Evolves normally |
| `docs/70_adrs/` | Decisions | Append-only |
| `docs/80_rfc/` | Proposals | Entry point for change |
| `docs/90_audits/` | Historical proof | Immutable |
| `docs/_snapshots/` | Machine artifacts | Generated only |

**Rule:**  
If you are unsure whether a change is allowed, start in `docs/80_rfc/`.

---

## How Change Happens

1. **Proposal (RFC)**  
   Required when a change affects:
   - truth semantics
   - replay guarantees
   - readiness meaning
   - authoritative write paths
   - CI invariants
   - Phase 1 boundaries

2. **Decision (ADR)**  
   Required for architectural choices or irreversible tradeoffs.

3. **Implementation**  
   Code changes occur only after required RFCs/ADRs are accepted.

4. **Enforcement**  
   CI acts as judiciary. If CI blocks it, the change is forbidden.

There is no silent override path.

---

## Starting Points by Role

### Founder / System Architect
Start with:
- `docs/00_truth/CONSTITUTION.md`
- `docs/00_truth/GOVERNANCE_CHARTER.md`
- `docs/00_truth/SOURCE_OF_TRUTH.md`
- `docs/00_truth/INVARIANTS_MAP.md`

---

### AI Agents (Codex, CI, tooling)

**Directive instructions:**

1. Read, in order:
   - `docs/INDEX.md`
   - `docs/00_truth/CONSTITUTION.md`
   - `docs/00_truth/GOVERNANCE_CHARTER.md`
   - `docs/00_truth/SOURCE_OF_TRUTH.md`

2. Produce a **plan and file list**.

3. **Do not modify any files** until explicitly instructed to proceed.

4. **Never modify `docs/00_truth/`** unless explicitly instructed to perform a constitutional amendment.

5. All AI output is advisory unless approved by human review and CI.

---

### Product or Feature Work
Start with:
- `docs/10_product/`
- `docs/30_data/` (if truth is involved)

If truth semantics may change, open an RFC first.

---

### Phase 1 Systems
Start with:
- `docs/00_truth/phase1/`
- `docs/00_truth/INVARIANTS_MAP.md`

Assume changes are forbidden unless explicitly permitted.

---

### New Contributors
Read, in order:
1. `docs/INDEX.md`
2. `docs/00_truth/SOURCE_OF_TRUTH.md`
3. `docs/20_architecture/SYSTEM_STATE.md`

---

## Warnings & Non-Negotiables

- Do not casually edit `docs/00_truth/`
- Do not rewrite history for convenience
- Do not bypass CI enforcement
- Do not allow AI systems to write canonical truth
- When uncertain, preserve history and escalate via RFC

> **Oli must always be more honest than it is helpful.**

---

### Final Note

This index is intentionally conservative.  
Velocity comes from clarity, not shortcuts.

If you follow this map, Oli can evolve for decades without losing trust.
