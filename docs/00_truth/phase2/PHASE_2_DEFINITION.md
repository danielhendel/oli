# Phase 2 Definition — Truthful Capture & Personal Health Memory (LAW)

## Status
Authoritative • CI-Enforced • Repo-Truth

---

## 1. Authority & Truth Contract

Phase 2 is governed by the following non-negotiable truth principles:

1. **Canonical Authority with Honesty**
   - Oli is the authoritative record of the user's health life.
   - Authority does not require certainty.
   - Uncertainty is first-class truth.

2. **User Precision Is Optional**
   - Users are not required to be accurate, detailed, or knowledgeable.
   - The system is required to be precise, conservative, and honest.

3. **No Silent Lies**
   - Missing, inferred, approximate, or reconstructed data must never appear as certain.
   - The system must never silently upgrade uncertainty into confidence.

---

## 2. Required Logging Primitives

Phase 2 is not complete unless all of the following primitives exist and are first-class.

### 2.1 Incomplete Event Capture

- Users can log that **something happened** without knowing details.
- Incomplete events:
  - are real and persistent
  - are explicitly marked as incomplete
  - affect timeline completeness honestly
- Completing an event later must not rewrite historical truth.

> An incomplete event is better than a missing event.

---

### 2.2 Approximate / Fuzzy Time

- Events may be logged with:
  - time ranges
  - relative anchors
  - approximate temporal constraints
- Approximate time:
  - must always be visible as approximate
  - must never be collapsed into false precision
  - must be preserved through replay

> Guessed precision is forbidden. Honest approximation is required.

---

### 2.3 Unknown / Fuzzy Content

- Events may exist where *what happened* is partially or fully unknown.
- Unknown content:
  - is explicit and visible
  - remains unresolved until user action
  - is never auto-filled without provenance
- Downstream interpretations must degrade conservatively.

---

### 2.4 Post-hoc Backfilling

- Logging after the fact is first-class.
- Backfilled events must retain:
  - occurredAt (possibly approximate)
  - recordedAt
  - provenance (manual backfill, upload, import)
- Backfilled data must never masquerade as real-time capture.

> History may be repaired, never rewritten.

---

## 3. User Agency & System Behavior

### 3.1 No Proactive Prompts

- The system must not:
  - prompt
  - nag
  - interrupt
  - guilt users to complete data

There are no push notifications, modals, or forced flows for completion.

---

### 3.2 Visible Completeness

- Missing or uncertain data must be:
  - obvious
  - legible
  - easy to act on
- The user decides when (or if) to resolve gaps.

> Truth is visible. Action is optional.

---

## 4. Uncertainty as First-Class Truth

Uncertainty must be explicitly modeled and surfaced.

### 4.1 Event-Level Uncertainty
- Events have explicit truth states:
  - complete
  - incomplete
  - uncertain

### 4.2 Day-Level Truth State
- Days communicate:
  - completeness
  - confidence
  - known gaps

### 4.3 Timeline-Level Truth Surface
- The timeline must reveal:
  - gaps
  - fuzziness
  - ordering ambiguity

Uncertainty is information, not a UX flaw.

---

## 5. Timeline Requirements

Phase 2 is not complete unless:

- The timeline is the **primary interface**
- It supports:
  - year → month → day → event → lineage navigation
  - cross-domain merging
  - honest ordering with fuzzy time
- Gaps and confidence are always visible

> Time is the product.

---

## 6. Library Requirements

The library must function as a **permanent personal health archive**.

Required properties:
- Every event, artifact, upload, correction, and failure is present
- Searchable by:
  - keyword
  - domain
  - time range
  - source/provenance
- Artifacts are first-class
- Lineage answers: "Where did this come from?"

---

## 7. Explicit Non-Goals

Phase 2 does not include:
- insights
- recommendations
- coaching
- planning
- AI chat
- behavior nudging

These depend on Phase 2 being complete.

---

## 8. Definition of Done

Phase 2 is complete when:

1. Users can reconstruct any meaningful health period without checking another system.
2. Missing or uncertain data is never hidden.
3. Logging never forces guessing.
4. History can be repaired safely.
5. The timeline reflects lived reality, not charts.
6. Users trust Oli more than their memory.

If users must double-check elsewhere, Phase 2 has failed.
