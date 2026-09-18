# RFC — Body Composition Category Intelligence v1

**Status:** Proposed
**Date:** 2026-09-18
**Stage:** 3A (documentation only)
**Canonical location:** `docs/80_rfc/`
**ADR:** `docs/70_adrs/ADR-body-composition-category-intelligence-v1.md`
**Product spec:** `docs/10_product/specs/BODY_COMPOSITION_PRODUCT_AND_STANDARDS_V1.md`
**Audit:** `docs/90_audits/2026-09-18-body-composition-repo-truth-audit.md`
**Evidence:** `docs/90_audits/2026-09-18-body-composition-evidence-matrix.md`

Do **not** mark Accepted / Approved / Implemented / Operational / Merged without human approval.

---

## Problem

The merged Body Composition surface is weight-centric, permission-first, and hydrates consumer trends/snapshots from RawEvents. Measurement method is not modeled; Apple Health is a transport misread as composition method in historical PR #178 work. Legacy classification bands exist in `lib/classifications` without a versioned, cited, consumer-approved standards governance path. Leadership wants a simple two-rail experience; scientific defensibility is not yet established for aggregate Excellence or universal BF% targets.

---

## Goals

1. Define a value-first Body Composition Category Intelligence architecture.
2. Separate Health Protection from Performance Support.
3. Enforce provenance, readiness, confidence, like-with-like trends, and facts-first derivation.
4. Version standards with citations and reprocessing rules.
5. Stage runtime work (3B+) only after human approval.

## Non-goals

- Runtime UI/graph implementation in this RFC
- New Firestore paths, APIs, DailyFacts fields, or contracts in this stage
- Closing RG-LEGAL-01 / RG-SOURCE-PRIVACY-01 / export gates
- Strength/Cardio/Nutrition/Sleep/Recovery/Health category redesign
- Cherry-picking PR #178

---

## Repository truth (summary)

- Live overview: `app/(app)/body/index.tsx` — AH permission gate → Today weight card → week/baseline/yearly weight.
- RawEvent reads: `useWeightSeries`, peeks, `useBodyMetricTrends`.
- DailyFacts.body supports weight, BF%, BMI, lean, RMR — partially used.
- DEXA route empty; DEXA structured extraction unavailable.
- Waist on profile contract; not Body measurement UX.
- PR #178 closed unmerged; AH→BIA + physique estimate rejected.

---

## Product architecture

```text
Understand → Measure → Locate → Improve → Monitor
```

Page IA: purpose → educational spectrum → markers → baseline building → evidence inventory → method-specific progress → influences → Plan boundary.

### Two-rail model

- Conceptual dual rails approved as **direction**.
- Early stages: marker-level only.
- Health aggregate (bottleneck) only after evidence + leadership (3E).
- Performance aggregate / Excellence deferred unless sport/goal methodology approved (3F).
- No combined Body score; no averaging rails.

---

## Canonical pipeline

```text
RawEvent → CanonicalEvent → DailyFacts / approved summary facts
  → Insight / HealthState / IntelligenceContext
  → typed presentation model → UI
```

RawEvents remain for lineage, replay, debug, reprocessing, provenance inspection.

**Migration sequence (smallest, later stages):**

1. 3B: Educational shell; hide permission-first; no new classification.
2. 3C: Provenance-aware inputs (waist, method labels).
3. 3D: Bounded facts/summary APIs for marker cards (stop RawEvent as official Current State).
4. 3E/3F: Server-derived classifications when standards accepted.
5. 3G: Method-specific compressed series for Progress.
6. 3H: Generalize Category Intelligence.

---

## Standards and versioning

Propose a versioned standards record (extend `lib/classifications` pattern **or** new registry — durable placement UNRESOLVED until Stage 3 analytics-truth work):

`standardId`, metric, display name, construct, unit, compatible methods, population/age/sex/ethnicity applicability, risk bands, healthy references, performance references, exclusions, contraindications, evidence grade, citations, source publication version/date, Oli standard version, effective date, supersedes, limitations, review date.

Distinguish disease-risk vs healthy reference vs performance vs sport-specific vs personal target vs uncertainty.

### Reprocessing

Every derived state must be reproducible from approved upstream truth using:

`standardVersion`, `canonicalVersion`, `factsVersion`, `insightVersion`, `computedAt`, evidence citations.

Support per-user, per-domain, and date-range reprocessing; replacement/supersession; auditability; stale classification handling when standards change.

---

## Source / provenance

Preserve when available: transport, originating source, source application, device, measurement method, measured vs estimated vs inferred vs manual, observed date, units, quality, uncertainty.

`method = unknown` when unavailable. **Prohibit** HealthKit transport → BIA inference.

---

## Readiness, confidence, classification, trends

As specified in the product/standards document. Official trends are like-with-like and server-derived. Confidence ≠ state; completeness ≠ one precise measurement.

---

## Privacy

Preserve account-scoped source connection; no HK read from OS permission alone; no cross-user source state; no health values in logs; no source tokens in UI state; no screen Firestore; export/delete coverage; disconnect semantics. **RG-SOURCE-PRIVACY-01 remains OPEN.**

---

## Performance

Body UI must not page years of RawEvents, classify in JSX, parse DEXA in route screens, or mount every source on every render. Prefer bounded facts/summary APIs, compressed series, server classifications, versioned computation, stable view models, cache/refresh rules.

---

## Alternatives considered

| Alternative | Disposition |
|-------------|-------------|
| Ship PR #178 physique + AH→BIA | Reject |
| Single Body score | Reject |
| BMI target band as composition Excellence | Reject |
| Immediate aggregate Excellence rail | Reject |
| Marker-level + educational dual rails first | **Proposed** |
| Delay all Body UX until DEXA-only | Reject — screening markers have evidence |

---

## Unresolved decisions

See product spec §17 (leadership questions). Scientific disagreements (waist ethnicity cutoffs; BF% band tables; performance Excellence methodology) remain UNRESOLVED.

---

## Phased implementation

3A (this) → 3B value-first shell → 3C baseline/provenance → 3D facts markers → 3E health classification → 3F performance iff defensible → 3G method trends → 3H reusable framework.

---

## Approval

Human approval required before any Stage 3B runtime work.
