# Phase 2 Scope — Truthful Capture & Personal Health Memory (Binding)

This document is a **binding contract** for Phase 2.
CI must fail if Phase 2 invariants are violated.

---

## Phase 2 Primary Goal

Build the most accurate, complete, and trustworthy personal health memory ever created — aligned with how humans actually live.

Phase 2 exists to ensure that:
- reality is captured with minimal friction,
- uncertainty is preserved honestly,
- history can be reconstructed without guessing,
- and users never need to double-check elsewhere.

**Authority:** If a health event is not in Oli, it did not happen. If Oli is unsure, it must say so.

---

## System Model (Binding)

Phase 2 extends Phase 1’s user-centric pipeline with first-class truth primitives:

- **Phase 1 foundation:** RawEvents → CanonicalEvents → DailyFacts → Insights → IntelligenceContext
  (see `docs/00_truth/phase1/PHASE_1_SCOPE.md`, `docs/00_truth/phase1/INGESTION_POLICY.md`)
- **Phase 2 additions:**
  - Incomplete event capture (“something happened, details later”)
  - Approximate/fuzzy time (ranges, constraints; never fake precision)
  - Unknown/fuzzy content (never force guessing)
  - Post-hoc backfilling (occurredAt vs recordedAt + provenance)

---

## Required Capabilities (Phase 2 Complete = all true)

### A) Incomplete Event Capture
- Users can log that something happened without knowing details.
- Such events are real, persistent, and explicitly marked as incomplete.
- Completing an event later must not rewrite history.
- An incomplete event is better than a missing event.

### B) Approximate / Fuzzy Time (Temporal Honesty)
- Events may be logged with time ranges, relative anchors (“last night”), approximate windows.
- Approximate time must always remain visible as approximate.
- Guessed precision is forbidden. Honest approximation is required.
- Must be preserved through replay (see `app/(app)/(tabs)/library/replay/day/[dayKey].tsx`).

### C) Unknown / Fuzzy Content
- Users may log events where what happened is partially or fully unknown.
- Unknown content is explicit and remains unresolved until the user acts.
- The system must never auto-fill without provenance.

### D) Post-hoc Backfilling (History Repair)
- Logging days, weeks, or months later is first-class.
- Backfilled events must retain:
  - event time (possibly approximate)
  - record time (when logged)
  - provenance (“backfilled”, “uploaded”, “imported”)
- Backfilling must never masquerade as real-time capture.
- The past can be repaired — but never rewritten.

### E) No Proactive Prompts or Nagging
- Oli must not interrupt, prompt, or guilt users to complete data.
- No push notifications for missing data.
- No modal interruptions or forced flows.
- Incompleteness must be obvious, legible, and easy to act on when the user chooses.

### F) Uncertainty as First-Class Truth
- Uncertainty must be visible at event/day/timeline levels.
- Events can be complete, incomplete, or uncertain — and this state is always visible.
- Days communicate completeness, confidence, and known gaps.
- The timeline must reveal gaps and fuzziness and never imply certainty where it doesn’t exist.

---

## Non-Goals (Explicitly Out of Phase 2)

- Insights or recommendations
- Coaching workflows
- Planning or simulation
- AI chat
- Behavior nudging

These are intentionally deferred until truth capture is unquestionable.

---

## Phase 2 Lock Definition (Authoritative)

The authoritative and final definition of **Phase 2 completion**
is defined exclusively in **docs/00_truth/phase2/PHASE_2_LOCK_CRITERIA.md**,
which defines **six locks**.

This document defines scope and intent only.

If any requirement, checklist, audit, roadmap, or interpretation
conflicts with the Phase 2 lock criteria,
the lock criteria prevail.

Phase 2 may be declared complete **only**
via a signed `PHASE_2_LOCK_DECLARATION.md`
that references passing CI enforcement.
