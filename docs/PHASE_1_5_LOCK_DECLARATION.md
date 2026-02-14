# Phase 1.5 Lock Declaration (Constitutional)

**Status:** Proposed → Pending merge into `main`  
**Date:** YYYY-MM-DD  
**Owner:** Daniel Hendel  
**Scope:** Phase 1.5 (Sprints 1–6)

This declaration asserts that Phase 1.5 is **constitutionally complete and locked** according to `docs/00_truth/phase1.5/PHASE_1.5_LOCK_CRITERIA.md`.

---

## 1) What Phase 1.5 Lock Means

Phase 1.5 Lock means:

- The system's **derived truth** (HealthScore + HealthSignals) is deterministic, immutable, and replay-safe.
- Dash exposes truth with **explicit missingness**, **explicit states**, and **neutral tone**.
- Multi-baseline context is visible but UI-only.
- Provenance is accessible via explicit user action.
- Governance gates prevent drift (CI + rules + export/delete parity).
- No ingestion was added and no historical truth was rewritten.

This lock is a commitment that Phase 1.5 behavior is stable and protected against regressions.

---

## 2) Evidence (Release Anchors)

The following tags anchor the Phase 1.5 milestone set:

- `phase1.5-sprint4-signal-layer`
- `phase1.5-sprint5-epistemic-transparency`
- `phase1.5-sprint6-ux-integrity`

Sprint 1–3 artifacts are present in `main` prior to these tags and are covered by audit records.

---

## 3) Constitutional Assertions (Binary)

The owner asserts the following are true simultaneously:

### Truth Integrity
- HealthScore and HealthSignals are derived truth only.
- They are immutable (create-or-assert-identical).
- Replay determinism is proven by tests.
- Derived ledger snapshots include HealthScore and HealthSignals.

### Governance Enforcement
- Firestore rules deny client writes to derived truth.
- Export/delete include HealthScore and HealthSignals.
- CI gates pass (typecheck/lint/test).
- Console integrity guard is enforced.
- Emulator harness exits cleanly with Jest's exit code.

### Experiential Integrity
- Dash surfaces HealthScore + Signals with explicit states.
- Baselines visible (General/Personal/Optimization) and UI-only.
- Provenance accessible and does not leak raw payloads or Firestore paths.
- Accessibility compliance is enforced (labels/roles/44px targets).

### Neutrality
- No persuasion or recommendations.
- Interpretation requires explicit user action only.

If any assertion is false, Phase 1.5 is not locked.

---

## 4) Drift Policy (Post-Lock)

After Phase 1.5 is locked:

- Any change to HealthScore or HealthSignals model behavior requires:
  - explicit modelVersion bump
  - new tests proving determinism + immutability
  - new audit record
- Any UI change to Dash must preserve:
  - explicit missingness
  - explicit states
  - neutrality
  - no Firebase in screens

---

## 5) Declaration

Phase 1.5 is hereby declared **LOCKED**, pending merge of this declaration into `main`.

Signed,  
Daniel Hendel
