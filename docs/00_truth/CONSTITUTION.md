# 📜 THE OLI CONSTITUTION  
### The Foundational Law of the Oli Health OS

**Status:** Ratified  
**Applies to:** All engineers, product decisions, systems, experiments, AI models, integrations, and governance bodies  
**Scope:** Personal Health Library (Phase 1) and all future systems built on top of it

> **If a decision conflicts with this Constitution, the decision is wrong.**

---

## PREAMBLE — WHY OLI EXISTS

Oli exists to be the authoritative, lifelong record of an individual’s health and fitness.

Not the smartest system.  
Not the most engaging system.  
Not the most optimized system.

**The most correct system.**

Everything else is downstream.

Oli is designed to be trusted after the fact—  
when memory matters more than prediction,  
and truth matters more than convenience.

---

## ARTICLE I — DEFINITIONS (PRECISE LANGUAGE)

To prevent ambiguity, the following terms are defined and must be used consistently across the system.

### 1. Raw Memory
What was received from the world.

- Append-only  
- Stored exactly as received  
- Never edited  
- Never inferred  
- Never deleted  

Raw memory is history, not truth.

---

### 2. Canonical Truth
What is determined to have happened.

- Derived only from raw memory  
- Append-only  
- Immutable once written  
- Versioned by time, never overwritten  

Canonical truth is what happened, as best as can be known.

---

### 3. Derived Truth
What is computed from canonical truth.

- Deterministic  
- Recomputable  
- Overwrite-authoritative  
- Never manually edited  

Derived truth is what we know, given the truth.

---

### 4. Failure Memory
What could not be processed.

- Explicit  
- Immutable  
- Time-indexed  
- Preserved  

Failure memory is honesty preserved.

---

### 5. Readiness
A declaration of epistemic confidence.

- `missing` — nothing is known  
- `partial` — something is missing or inconsistent  
- `ready` — all required truth surfaces exist and agree  
- `error` — truth cannot be verified  

Readiness is not UI state.  
Readiness is a truth statement.

---

### 6. Replay
The ability to reconstruct:

- what happened  
- what was known  
- when it was known  

If replay breaks, trust is broken.

---

### 7. Authoritative Write Path
The narrowly defined, audited system boundary through which canonical truth may be written.

- All canonical writes must occur through an authoritative write path  
- All other systems are read-only by default  

This boundary exists to make immutability enforceable, not optional.

---

## ARTICLE II — THE SEVEN INVIOLABLE INVARIANTS

These invariants define what must always be true, regardless of enforcement phase.

---

### INVARIANT 1 — Personal Health History Is Irreplaceable

Oli must preserve health history in a way that cannot be reconstructed elsewhere once lost.

- Raw memory is never destroyed  
- Canonical truth is never rewritten  
- Derived truth is always replayable  

If a user leaves Oli, they leave continuity behind.

---

### INVARIANT 2 — Truth Is Visible, Not Assumed

No part of the system may imply completeness without evidence.

- Failures must exist explicitly  
- Gaps must be representable  
- Partial data must be distinguishable  

Silence is a lie.

---

### INVARIANT 3 — Truth Cannot Be Rewritten

No feature, system, or human may mutate historical truth.

- No updates to canonical events  
- No deletions  
- Corrections are additive, never mutative  

Correction is the addition of new canonical truth that supersedes interpretation,  
never the alteration or deletion of historical truth.

**The past is not negotiable.**

---

### INVARIANT 4 — Intelligence Is a Consumer, Never an Author

No optimization, recommendation, or AI system may write truth.

- Intelligence may read  
- Intelligence may suggest  
- Intelligence may not assert facts  

AI without constraints destroys trust.

---

### INVARIANT 5 — Readiness Has One Meaning Everywhere

Readiness semantics are global and absolute.

- `ready` means truth is complete and consistent  
- `partial` means something is missing  
- `missing` means nothing is known  
- `error` means truth cannot be verified  

“Ready” must never mean “something rendered.”

---

### INVARIANT 6 — Time Must Increase Value Automatically

Oli must become more valuable with time without requiring new features.

- Longitudinal memory compounds  
- Replay adds context  
- History deepens insight  

If time does not help, the system is failing.

---

### INVARIANT 7 — Users Can Leave, But Cannot Replace Oli

Users must be able to export their data.

But no other system is required to:
- understand it  
- replay it  
- preserve its semantics  

Lock-in must be ethical, not coercive.

---

## ARTICLE III — PHASED ENFORCEMENT

The invariants define truth.  
Enforcement defines when truth becomes mandatory in practice.

Enforcement does not weaken invariants.  
It governs timing, not principle.

---

### PHASE A — STRUCTURAL INTEGRITY  
*(Early Execution Phase)*

**Purpose:** Preserve irreversibility while enabling iteration.

**Enforced from Day One**
- Raw memory is append-only  
- Canonical truth is immutable  
- Derived truth is recomputable  
- AI may never write truth  

These guarantees are irreversible.

**Deferred Enforcement**
- Failure memory may be internal  
- Replay may exist at data level only  
- Readiness may be internal-only  
- CI may warn rather than block  
- UI may temporarily suppress uncertainty  

Truth must be preserved, even if not yet surfaced.

---

### PHASE B — EPISTEMIC INTEGRITY  
*(Product Reliance Phase)*

**Purpose:** Ensure Oli never overstates what it knows.

New requirements:
- Failure memory becomes visible  
- Readiness semantics are user-facing  
- Replay must work operationally  
- Partial and missing data must be labeled  

CI escalates from warnings to blockers for Phase 1 violations.

---

### PHASE C — CONSTITUTIONAL LOCK  
*(Phase 1 Completion → Forever)*

Once entered:
- Phase 1 truth is locked permanently  
- Canonical immutability is absolute  
- Replay must never break  
- CI enforcement has no exception path  

Oli is no longer a product in flux.  
It is an operating system.

This does not prohibit evolution or new systems.  
It declares that Phase 1 truth and invariants are no longer negotiable.

All future change must occur through additive systems,  
versioned interpretation, or explicit constitutional amendment.

---

## ARTICLE IV — PHASE BOUNDARIES

### Phase 1 — Personal Health Library (Foundation)

Phase 1 is complete when:
- Truth is immutable  
- Failures are visible  
- Timeline is unified  
- Readiness is standardized  
- Replay is guaranteed  
- Invariants are enforced by CI and governance  

Once locked, Phase 1 must never change.

---

### Phase ≥2 — Intelligence, Coaching, Optimization

Phase ≥2 systems:
- MAY read Phase 1 truth  
- MUST NOT write Phase 1 truth  
- MUST declare uncertainty  
- MUST NOT alter history  

Phase 2 is a guest.  
Phase 1 is the house.

---

## ARTICLE V — COMPLIANCE, SECURITY, AND OWNERSHIP

### Compliance by Architecture
- Auditability is inherent  
- Provenance is preserved  
- Corrections are explicit  
- AI is non-authoritative  

Compliance is not bolted on.  
It emerges from truth preservation.

---

### Security by Design
- User data is isolated by default  
- Access is least-privilege  
- All actions are traceable  
- Breaches are detectable  

Security protects truth.  
It never alters it.

---

### Ownership
Users own their data.

Oli preserves:
- continuity  
- context  
- meaning  

Ownership does not require the destruction of history.

---

## ARTICLE VI — PROHIBITED ACTIONS

The following are forbidden forever:

- Auto-correcting historical data  
- Filling gaps silently  
- Inferring missing truth  
- Optimizing before surfacing uncertainty  
- Rewriting facts to “improve UX”  

A smoother lie is still a lie.

---

## ARTICLE VII — GOVERNANCE & ENFORCEMENT

### Code-Level Enforcement
- Canonical write paths are restricted  
- Phase 1 namespaces are protected  
- CI blocks invariant violations  

---

### Review Enforcement
Any change touching Phase 1 must:
- declare phase impact  
- reference affected invariants  
- receive explicit approval  

**CI is the judiciary.**  
There is no appeal.

---

## ARTICLE VIII — AMENDMENTS

This Constitution may be amended only if:

1. Trust is strengthened, not convenience  
2. Replay guarantees are preserved  
3. Canonical immutability is untouched  
4. Historical integrity survives migration  
5. CI enforcement is updated accordingly  

All amendments must be proposed via formal RFC,  
evaluated against replay guarantees,  
and enforced through updated CI invariants.

Amendments are rare by design.

---

## ARTICLE IX — THE LAST-MOVER CLAUSE

Oli is designed to be the last system a user ever moves to.

Not because it is the best today,  
but because leaving it later would mean losing:

- memory  
- continuity  
- context  
- truth  

Features can be copied.  
History cannot.

---

## RATIFICATION

This Constitution is considered active when:
- Phase A structural guarantees exist  
- Phase B enforcement is planned  
- CI is capable of enforcing invariants  

From the moment Phase C is entered:

**Oli ceases to be a product.**  
**It becomes an operating system for human health.**
