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

## Start here (current truth, in order)

1. **Constitution / authority rules** — `docs/00_truth/CONSTITUTION.md`, `SOURCE_OF_TRUTH.md`, `GOVERNANCE_CHARTER.md`, `INVARIANTS_MAP.md`
2. **Current repo-truth progress map** — `docs/00_truth/REPO_TRUTH_PROGRESS_MAP.md`
3. **Current consumer-launch roadmap** — `docs/10_product/roadmap/ROADMAP_REALITY.md`
4. **Current system state** — `docs/20_architecture/SYSTEM_STATE.md`
5. **Current product decisions (consumer launch)** — `docs/10_product/decisions/CONSUMER_LAUNCH_PRODUCT_DECISIONS.md`
6. **Schema / contracts (code)** — `lib/contracts` TypeScript + Zod source (package `@oli/contracts`; generated `dist/` is gitignored; build via `npm run build:contracts`)
7. **Audit evidence (historical)** — `docs/audits/2026-08-10-consumer-launch-*.md` and `docs/90_audits/`
8. **Reference vision / product folders** — `docs/10_product/`, `docs/20_architecture/`, `docs/30_data/` (must not contradict T0 or code)
9. **Legacy / non-current** — `docs/authoritative/` (legacy redirect / exercise-media standards), older `docs/README.md` overview, superseded audits

**There is no titled “Canonical Schema PDF” or “Unified Master Roadmap vNext” file in this repository.** Schema truth lives in code (`lib/contracts`). Execution roadmap truth lives in `ROADMAP_REALITY.md` above.

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
- `REPO_TRUTH_PROGRESS_MAP.md` (operational snapshot; **code overrides** on conflict)
- Phase lock declarations

---

### **T1 — Runtime Truth (Enforced Reality)**
What actually exists and is enforced today.

- Code (including `lib/contracts`)
- CI gates
- Deployed infrastructure
- Audits and proofs

If it runs and passes CI, it is real — but not necessarily *correct* unless aligned with T0.

**Lives in:**
Codebase + `docs/90_audits/` + dated artifacts under `docs/audits/`

---

### **T2 — Intent & Interpretation**
What the system is designed to be and how it is understood.

- Product intent and decisions
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
| `docs/00_truth/` | Constitutional law + operational progress map | Effectively immutable except explicit amendments / map updates |
| `docs/10_product/` | Product intent + decisions | Evolves via RFC when required |
| `docs/20_architecture/` | System interpretation | Evolves via ADR |
| `docs/30_data/` | Truth semantics | Highly constrained |
| `docs/40_engineering/` | Execution process | Evolves normally |
| `docs/50_security_privacy/` | Trust protection | Highly constrained |
| `docs/60_process/` | Human workflow | Evolves normally |
| `docs/70_adrs/` | Decisions | Append-only |
| `docs/80_rfc/` | Proposals | Entry point for change |
| `docs/90_audits/` | Historical proof | Immutable |
| `docs/audits/` | Dated audit artifacts | Immutable snapshots |
| `docs/authoritative/` | **Legacy** path (not current Health OS constitution) | Do not treat as current execution truth |
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
- `docs/00_truth/REPO_TRUTH_PROGRESS_MAP.md`

---

### AI Agents (Codex, CI, tooling)

**Directive instructions:**

1. Read, in order:
   - `docs/INDEX.md`
   - `docs/00_truth/CONSTITUTION.md`
   - `docs/00_truth/REPO_TRUTH_PROGRESS_MAP.md`
   - `docs/10_product/roadmap/ROADMAP_REALITY.md`
   - `docs/10_product/decisions/CONSUMER_LAUNCH_PRODUCT_DECISIONS.md`
   - `docs/00_truth/GOVERNANCE_CHARTER.md`
   - `docs/00_truth/SOURCE_OF_TRUTH.md`

2. Produce a **plan and file list**.

3. **Do not modify any files** until explicitly instructed to proceed.

4. **Never modify constitutional law under `docs/00_truth/`** unless explicitly instructed (progress map updates are allowed when refreshing operational truth).

5. All AI output is advisory unless approved by human review and CI.

---

### Product or Feature Work
Start with:
- `docs/00_truth/REPO_TRUTH_PROGRESS_MAP.md`
- `docs/10_product/roadmap/ROADMAP_REALITY.md`
- `docs/10_product/decisions/CONSUMER_LAUNCH_PRODUCT_DECISIONS.md`
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
2. `docs/00_truth/REPO_TRUTH_PROGRESS_MAP.md`
3. `docs/00_truth/SOURCE_OF_TRUTH.md`
4. `docs/20_architecture/SYSTEM_STATE.md`
5. `docs/40_engineering/local-dev/LOCAL_DEV.md`

---

## Warnings & Non-Negotiables

- Do not casually edit constitutional articles under `docs/00_truth/`
- Do not rewrite history for convenience
- Do not bypass CI enforcement
- Do not allow AI systems to write canonical constitutional truth
- Do not treat `docs/authoritative/` as current Health OS constitution
- When uncertain, preserve history and escalate via RFC

> **Oli must always be more honest than it is helpful.**

---

### Final Note

This index is intentionally conservative.
Velocity comes from clarity, not shortcuts.

If you follow this map, Oli can evolve for decades without losing trust.
