# ADR — Body Composition Category Intelligence v1

**Status:** Accepted (architecture and standards direction; Stage 3B shell authorized; classification runtime not implemented)
**Date:** 2026-09-18
**Accepted:** 2026-09-18 — human approval with guardrails
**Canonical location:** `docs/70_adrs/`
**RFC:** [RFC-body-composition-category-intelligence-v1.md](../80_rfc/RFC-body-composition-category-intelligence-v1.md)
**Product spec:** [BODY_COMPOSITION_PRODUCT_AND_STANDARDS_V1.md](../10_product/specs/BODY_COMPOSITION_PRODUCT_AND_STANDARDS_V1.md)

**Runtime implemented:** No
**Schema/persistence authorized:** No
**Official classification authorized:** No
**Stage 3B shell authorized:** Yes (value-first educational shell only; separate implementation stage)
**Stage 3B runtime begun:** No

---

## Human approval (2026-09-18)

```text
APPROVED WITH GUARDRAILS — accept the Body Composition Category Intelligence
v1 architecture and standards direction for future staged implementation.
```

Decisions 1–20 in the companion RFC are binding product/architecture law for subsequent Body Composition stages.

---

## Context

Stage 2 (PR #217) merged profile-only onboarding and Home category navigation including Body Composition. The existing Body module is operational but architecturally and scientifically insufficient for Category Intelligence: permission-first UX, RawEvent-derived consumer trends, weak method provenance, weight/BMI-centric framing, empty DEXA surface, and unsafe historical salvage candidates from PR #178.

Stage 3A documented repository truth, evidence, and a proposed architecture. Leadership accepted that direction **with guardrails** on 2026-09-18.

---

## Decision

1. **Facts-first Category Intelligence (future official classification).** Official Body Current State and classifications must derive through the approved Oli facts-and-insights pipeline — evidence-based, versioned, provenance-aware, and recomputable. RawEvents are not official consumer truth. Today Body is fact-only without a complete CanonicalEvent path; closing that gap (or explicitly approving a versioned fact-only summary path) is required before official classification and facts-first trend claims.

2. **Value-first Body experience.** Educational purpose and reference model precede permission/source CTAs. Stage **3B** is authorized as a static value-first shell only.

3. **Two independent conceptual dimensions.** Health Protection and Performance Support remain separate. Do not average. Do not ship a combined Body Composition score.

4. **Marker-first.** Individual evidence-backed markers may be interpreted before any aggregate category position is authorized.

5. **No aggregate Performance Support position** is currently approved.

6. **“Optimized” and “Excellence”** are not approved as personal user classifications. Conceptual product language only until separate approval.

7. **Evidence tiers:**
   - Screening: height, weight, waist, WHtR
   - Composition: method-labeled BF%, fat mass, lean mass, date, provenance
   - Advanced: DEXA/DXA, VAT, ALM, regional — only when available and supported

8. **Weight and BMI** are supporting screening context only — not direct Body Composition; cannot establish excellence.

9. **Apple Health is transport, not method.** Unknown-method AH values may display with honest provenance; may not drive official classification. Reject AH→BIA inference.

10. **Like-with-like trends are mandatory** for official longitudinal interpretation.

11. **Readiness states required:** missing, partial, ready, stale, conflicting, error. Confidence and completeness remain distinct.

12. **Plan boundary.** Category analyzes and explains. Plan owns individualized targets, prescriptions, and actions.

13. **Repository gaps block classification/trend stages, not 3B shell:** incomplete CanonicalEvent path; AH and manual lack one complete DailyFacts authority; manual can remain outside overview truth; RMR incomplete (Basal Energy ≠ expected authoritative fact); RawEvent-derived user-facing trends.

14. **Durable standards-registry location** must be resolved before official marker classifications are persisted.

15. **PR #178 Body salvage:** reject physique estimate, AH→BIA, unvalidated margins, BMI-as-composition-target overlay; salvage presentation patterns only after facts authority.

16. **Release gates unchanged.** RG-LEGAL-01 and RG-SOURCE-PRIVACY-01 remain OPEN; export coverage and scalability remain OPEN; no production/TestFlight authorization from this ADR.

### Explicitly not authorized

- Universal Body Composition score
- Universal body-fat excellence range
- BMI target band
- Mixed-method trend
- Apple Health-to-BIA inference
- RawEvent-derived consumer classification
- Unvalidated physique-estimation margins
- Personalized rail marker / aggregate health or performance classification in Stage 3B
- New schema, persistence, DailyFacts fields, Insights, backend classification, or DEXA parsing in Stage 3B

---

## Alternatives considered

| Alternative | Why rejected / deferred |
|-------------|-------------------------|
| Implement two-rail personal placement immediately | False precision; repository blockers; standards unapproved |
| Keep RawEvent trends as official UI truth | Violates approved pipeline |
| Universal BF% Excellence from legacy classifications | Insufficient citation governance; method-blind; not approved |
| Aggregate Performance Support in v1 | Not approved |
| DEXA-only Body product | Excludes valid screening anthropometrics (WHtR) |
| Merge PR #178 | Scientific and architecture defects |

---

## Consequences

### Positive

- Honest missing/partial states in Stage 3B without false classification
- Scientifically separable health vs performance dimensions
- Clear blockers for later facts/classification stages
- Clear Plan boundary

### Negative / costs

- No personal rail placement until later authorized stages and repository gaps close
- Requires summary APIs, standards-registry location, and dual-truth remediation before official markers/trends

### Security / privacy

- Reinforces account-scoped source connection
- Avoids fabricating method labels that misrepresent HealthKit data
- Does not close RG-SOURCE-PRIVACY-01

---

## Unresolved scientific / architecture decisions (preserved)

- Exact educational Health Protection band wording; whether “Optimized” is ever defined as a personal classification
- Whether a Health Protection **aggregate** position is ever authorized (and bottleneck rules)
- Ethnicity-specific waist cutoff model (WHO/IDF 94/80 vs US ATP III 102/88 — do not average)
- Which method-labeled BF% reference tables (if any) are accepted
- Performance Support aggregate / “Excellence” methodology (not currently approved)
- Exact confidence scoring rules
- Durable standards-registry location
- Fact-only vs Canonical body events
- Manual vs AH DailyFacts authority unification
- RMR authoritative fact source

---

## Implementation prerequisites

### For Stage 3B (authorized; not begun here)

- Separate runtime implementation stage/PR
- Docs-only acceptance of this ADR/RFC is insufficient to claim 3B complete
- No schema/persistence/Insights/classification
- Local `npm run check` on the future 3B PR

### For official marker aggregation / rail placement / facts-first trends

- Close repository gaps in RFC §Accepted decisions item 18
- Resolve durable standards-registry location
- Separate human authorization for any aggregate health position
- Performance aggregate remains unapproved

---

## Status note

This ADR is **Accepted** for architecture, standards direction, and Stage 3B shell authorization as of **2026-09-18**. It does **not** implement Stage 3B runtime and does **not** authorize official Body Composition classification persistence.
