# ADR — Body Composition Category Intelligence v1

**Status:** Proposed
**Date:** 2026-09-18
**Canonical location:** `docs/70_adrs/`
**RFC:** [RFC-body-composition-category-intelligence-v1.md](../80_rfc/RFC-body-composition-category-intelligence-v1.md)
**Product spec:** [BODY_COMPOSITION_PRODUCT_AND_STANDARDS_V1.md](../10_product/specs/BODY_COMPOSITION_PRODUCT_AND_STANDARDS_V1.md)

Do **not** self-accept. Human approval required.

**Runtime implemented:** No
**Schema/persistence authorized:** No
**Stage 3B authorized:** No (until human approval of this ADR + RFC + spec)

---

## Context

Stage 2 (PR #217) merged profile-only onboarding and Home category navigation including Body Composition. The existing Body module is operational but architecturally and scientifically insufficient for Category Intelligence: permission-first UX, RawEvent-derived consumer trends, weak method provenance, weight/BMI-centric framing, empty DEXA surface, and unsafe historical salvage candidates from PR #178 (physique estimate; Apple Health→BIA inference; unvalidated uncertainty margins).

Vision allows standards of excellence where defensible; Consumer Product Decisions forbid unsupported scores and require analytics — not prescription. Stage 3A must decide architecture before runtime.

---

## Proposed decision

1. **Facts-first Category Intelligence.** Official Body Current State and classifications derive through approved summary facts (today: fact-only Raw → DailyFacts selection; target: RawEvent → CanonicalEvent → DailyFacts/approved summaries where Canonical is authorized) → Insights/HealthState/IntelligenceContext → typed presentation DTO → UI. RawEvents are not official consumer truth. Whether Body remains explicitly fact-only or gains Canonical events requires a follow-on decision before Stage 3D.

2. **Value-first Body experience.** Educational purpose and reference spectrum precede permission requests and source connection CTAs.

3. **Two independent interpretive rails (conceptual).** Health Protection and Performance Support remain separate. Do not average. Do not ship a combined Body score.

4. **Marker-level first.** Early implementation stages show marker status with provenance; withhold aggregate user placement until approved evidence tiers and leadership decisions (especially Performance Excellence).

5. **Health aggregate only via conservative bottleneck of validated core risk markers** — and only after Stage 3E authorization. Strong lean mass must not hide central-adiposity risk.

6. **Performance aggregate / “Excellence” not authorized** without sport/goal context and approved methodology. Prefer marker-level performance context.

7. **Apple Health is transport, not method.** Unknown method stays unknown. Reject AH→BIA inference.

8. **Like-with-like trends are mandatory** for official Progress.

9. **BMI and weight are supporting/screening context**, not composition excellence targets.

10. **Standards are versioned, cited, and reprocessable.** Personal targets remain separate from evidence standards. Plan owns individualized actions.

11. **PR #178 Body salvage:** reject physique estimate, AH→BIA, unvalidated margins, and BMI healthy-weight-as-composition-target overlay; salvage presentation patterns only after facts authority.

12. **Release gates unchanged.** RG-LEGAL-01 and RG-SOURCE-PRIVACY-01 remain OPEN; no production/TestFlight authorization from this ADR.

---

## Alternatives considered

| Alternative | Why rejected / deferred |
|-------------|-------------------------|
| Implement two-rail graph immediately | False precision; standards unapproved |
| Keep RawEvent trends as official UI truth | Violates canonical pipeline; performance/privacy risk |
| Universal BF% Excellence from legacy classifications | Insufficient citation governance; method-blind |
| DEXA-only Body product | Excludes valid screening anthropometrics (WHtR) |
| Merge PR #178 | Scientific and architecture defects |

---

## Consequences

### Positive

- Honest missing/partial/stale/conflict states
- Scientifically separable health vs performance
- Recomputable, auditable classifications
- Clear Plan boundary

### Negative / costs

- Slower path to “place me on the spectrum” visuals
- Requires summary APIs and provenance model work in later stages
- Some leadership questions remain open (labels, ethnicity cutoffs, BF% tables)

### Security / privacy

- Reinforces account-scoped source connection
- Avoids fabricating method labels that misrepresent HealthKit data

---

## Unresolved scientific decisions

- Exact health-rail label set (“Optimized”?)
- Whether health aggregate ships in first classified release
- Ethnicity-specific waist cutoff model (WHO/IDF 94/80 vs US ATP III 102/88 — do not average; Alberti 2009 documents the split)
- Which BF% tables (if any) are accepted for method-labeled markers
- Performance Excellence methodology
- Exact confidence scoring rules
- Durable standards registry storage/code location
- Fact-only vs Canonical body events
- Manual weight inclusion in DailyFacts / overview vs AH-only selection

---

## Implementation prerequisites

1. Human acceptance of this ADR + RFC + product/standards spec.
2. Explicit authorization of Stage **3B** (or revised first runtime gate).
3. No schema/API invention until the authorized implementation stage’s RFC deltas (if required) are accepted.
4. Local `npm run check` gates on any future runtime PR.

---

## Status note

This ADR records a **proposed** architectural decision for Stage 3A. It does not authorize runtime Body Composition Category Intelligence implementation.
