# RFC — Body Composition Category Intelligence v1

**Status:** Accepted (architecture and standards direction; Stage 3B shell authorized and **implemented on branch**)
**Date:** 2026-09-18
**Accepted:** 2026-09-18 — human approval with guardrails
**Stage:** 3A complete (docs); Stage 3B **MERGED** (PR #220; physical `c962d36…`); Stage 3C **MERGED** (PR #221 at `58350517…`); Stage 3D **NOT BEGUN / DEFERRED**; Stage 3E Body Scans **ACTIVE**
**Canonical location:** `docs/80_rfc/`
**ADR:** `docs/70_adrs/ADR-body-composition-category-intelligence-v1.md`
**Product spec:** `docs/10_product/specs/BODY_COMPOSITION_PRODUCT_AND_STANDARDS_V1.md`
**Audit:** `docs/90_audits/2026-09-18-body-composition-repo-truth-audit.md`
**Evidence:** `docs/90_audits/2026-09-18-body-composition-evidence-matrix.md`

---

## Human approval (2026-09-18)

```text
APPROVED WITH GUARDRAILS — accept the Body Composition Category Intelligence
v1 architecture and standards direction for future staged implementation.
```

Full decision list is recorded in §Accepted decisions below and in the companion ADR.

**Authorized now:** Stage **3B** value-first Body Composition shell (separate implementation stage).

**Not authorized in this acceptance:** Stage 3B+ classification, persistence, schema, Insights, DEXA parsing, RawEvent classification, personalized rails, or runtime work inside the Stage 3A documentation Agent.

---

## Problem

The merged Body Composition surface is weight-centric, permission-first, and hydrates consumer trends/snapshots from RawEvents. Measurement method is not modeled; Apple Health is a transport misread as composition method in historical PR #178 work. Legacy classification bands exist in `lib/classifications` without a versioned, cited, consumer-approved standards governance path.

---

## Goals

1. Value-first Body Composition Category Intelligence architecture.
2. Separate Health Protection from Performance Support (conceptual; not averaged).
3. Marker-first interpretation before any aggregate position.
4. Provenance, readiness, confidence, like-with-like trends, and facts-first derivation.
5. Versioned standards with citations and reprocessing rules.
6. Stage 3B static educational shell after this acceptance; later stages gated on repository and scientific prerequisites.

## Non-goals (this RFC / Stage 3A)

- Runtime UI implementation in Stage 3A
- New Firestore paths, APIs, DailyFacts fields, Insights, or contracts in Stage 3A
- Closing RG-LEGAL-01 / RG-SOURCE-PRIVACY-01 / export gates
- Strength/Cardio/Nutrition/Sleep/Recovery/Health category redesign
- Cherry-picking PR #178
- Aggregate Performance Support position
- “Optimized” / “Excellence” as personal user classifications

---

## Accepted decisions (2026-09-18)

1. Two independent conceptual dimensions: **Health Protection** and **Performance Support**.
2. Dimensions must not be averaged, combined, or converted into one universal Body Composition score.
3. **V1 is marker-first.** Evidence-backed markers may be interpreted before any aggregate category position is authorized.
4. **No aggregate Performance Support position** is currently approved.
5. **“Optimized” and “Excellence”** are not approved as personal user classifications. They may remain conceptual product language only until separate approval of definitions, evidence, populations, and minimum-data rules.
6. **Screening-level** evidence may use: height, weight, waist circumference, waist-to-height ratio.
7. **Weight and BMI** are supporting screening context only — not direct Body Composition measurements; cannot establish Body Composition excellence.
8. **Composition-level** evidence may use method-labeled: body-fat percentage, fat mass, lean mass, measurement date, measurement provenance.
9. **Advanced** evidence may include DEXA/DXA, VAT, appendicular lean mass, regional composition — only when available and methodologically supported.
10. **Unknown-method Apple Health** values may be displayed with honest provenance but may **not** drive official Body Composition classification.
11. **Apple Health is a transport layer**, not a measurement method.
12. Official longitudinal interpretation must compare **like with like**. DEXA, BIA, manual estimates, and unknown-method measurements must not be silently merged.
13. Required readiness states: `missing` | `partial` | `ready` | `stale` | `conflicting` | `error`.
14. **Confidence and completeness** remain distinct.
15. Category **analyzes and explains**; **Plan** owns individualized targets, prescriptions, and actions.
16. Future official classification must be evidence-based, versioned, provenance-aware, recomputable, and derived through the approved Oli facts-and-insights pipeline.
17. **Do not authorize:** universal Body score; universal body-fat excellence range; BMI target band; mixed-method trend; Apple Health-to-BIA inference; RawEvent-derived consumer classification; unvalidated physique-estimation margins.
18. **Repository gaps (blockers for facts/classification stages):** incomplete CanonicalEvent path for Body; AH and manual do not yet share one complete DailyFacts authority; manual Body values can remain outside overview truth; RMR incomplete (Basal Energy does not produce expected authoritative fact); user-facing trends still include RawEvent-derived paths.
19. Those gaps **do not block** a static value-first Stage 3B shell; they **do block** official marker aggregation, personal rail placement, and facts-first trend claims.
20. **Durable standards-registry location** must be resolved before official marker classifications are persisted.

---

## Stage 3B authorization (shell only)

### In scope

- Body Composition purpose
- Educational reference model
- Marker explanations
- Screening / composition / advanced evidence tiers
- Ways to build a baseline
- Honest missing and partial states
- Source and measurement-method education
- Links to existing real measurement actions

### Out of scope

- Personalized rail marker
- Body score
- Aggregate health classification
- Aggregate performance classification
- “Optimized” or “Excellence” placement
- New schema or persistence
- New DailyFacts fields
- New Insights
- New backend classification
- New DEXA parsing
- Client-side RawEvent classification
- Autonomous Body targets or prescriptions

---

## Repository truth (summary)

- Live overview: `app/(app)/body/index.tsx` — AH permission gate → Today weight card → week/baseline/yearly weight.
- RawEvent reads: `useWeightSeries`, peeks, `useBodyMetricTrends`, composition log.
- `weight` / `body_composition` are **fact-only** (`FACT_ONLY_RAW_EVENT_KINDS`) — **no CanonicalEvent**.
- DailyFacts.body selection is **Apple Health / healthkit only** — manual ingest excluded from facts and overview filters (duplicate truth vs log).
- DailyFacts.body fields: weight, BF%, BMI, lean, RMR — RMR rarely populated; HK BasalEnergyBurned intentionally not mapped.
- DEXA route empty; DEXA structured extraction unavailable.
- Waist on profile contract; not Body measurement UX.
- PR #178 closed unmerged; AH→BIA + physique estimate rejected.

---

## Product architecture

```text
Understand → Measure → Locate → Improve → Monitor
```

Page IA: purpose → educational reference model → markers → baseline building → evidence inventory → method-specific progress (later) → influences → Plan boundary.

### Two-dimension model (accepted)

- Health Protection and Performance Support are independent conceptual dimensions.
- No averaging; no universal Body score.
- Marker-first before any aggregate.
- No aggregate Performance Support position currently.
- Health aggregate (if ever) only after later authorization (e.g. 3E) and repository blockers closed.
- “Optimized” / “Excellence” not personal classifications.

---

## Canonical pipeline

```text
RawEvent → (today: fact-only for weight/body_composition; no CanonicalEvent)
  → DailyFacts / approved summary facts
  → Insight / HealthState / IntelligenceContext
  → typed presentation model → UI
```

Target architecture remains:

```text
RawEvent → CanonicalEvent → DailyFacts / approved summary facts
  → Insight / HealthState / IntelligenceContext
  → typed presentation model → UI
```

Whether Body stays on an **explicit versioned fact-only** path or gains Canonical events remains **UNRESOLVED** and blocks official classification/trend claims until resolved. RawEvents remain for lineage, replay, debug, reprocessing, provenance inspection — not official consumer Current State.

**Migration sequence:**

1. **3B (authorized):** Value-first static shell — educational only.
2. **3C:** Baseline-building inputs + provenance (after product sequencing).
3. **3D:** Facts-first marker summaries — requires closing DailyFacts/Canonical/manual dual-truth blockers.
4. **3E:** Approved health-protection classification — only if authorized and blockers closed.
5. **3F:** Performance-support aggregate — **not currently approved**.
6. **3G:** Method-specific longitudinal trends — requires like-with-like + facts authority.
7. **3H:** Reusable Category Intelligence framework.

---

## Standards and versioning

Versioned standards record required before official marker classifications are persisted. Durable registry location (**extend `lib/classifications` vs new registry**) remains **UNRESOLVED**.

Required fields include: `standardId`, metric, display name, construct, unit, compatible methods, population/age/sex/ethnicity applicability, risk bands, healthy references, performance references, exclusions, contraindications, evidence grade, citations, source publication version/date, Oli standard version, effective date, supersedes, limitations, review date.

Distinguish disease-risk vs healthy reference vs performance vs sport-specific vs personal target vs uncertainty.

### Reprocessing

Every derived state must be reproducible using `standardVersion`, `canonicalVersion`, `factsVersion`, `insightVersion`, `computedAt`, evidence citations.

---

## Source / provenance

Preserve when available: transport, originating source, source application, device, measurement method, measured vs estimated vs inferred vs manual, observed date, units, quality, uncertainty.

`method = unknown` when unavailable. **Prohibit** HealthKit transport → BIA inference. Unknown-method AH may display; may not classify.

---

## Readiness, confidence, classification, trends

Readiness states (required): missing, partial, ready, stale, conflicting, error.

Confidence ≠ state; completeness ≠ one precise measurement.

Official trends: like-with-like and server-derived — blocked until repository gaps close.

---

## Privacy

Preserve account-scoped source connection; no HK read from OS permission alone; no cross-user source state; no health values in logs; no source tokens in UI state; no screen Firestore; export/delete coverage; disconnect semantics.

**RG-LEGAL-01 OPEN. RG-SOURCE-PRIVACY-01 OPEN. Export coverage OPEN. Export scalability OPEN.**

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
| Immediate aggregate Excellence / Performance position | Reject (not approved) |
| Marker-first + educational dual dimensions + 3B shell | **Accepted** |
| Delay all Body UX until DEXA-only | Reject — screening markers have evidence |

---

## Unresolved decisions (preserved)

- Exact educational label wording for Health Protection bands (including whether “Optimized” is ever defined as a personal classification)
- Whether a Health Protection **aggregate** position is ever authorized (and bottleneck rules)
- Ethnicity-specific waist cutoff model (WHO/IDF 94/80 vs US ATP III 102/88 — do not average)
- Which method-labeled BF% reference tables (if any) are accepted
- Performance Support aggregate / “Excellence” methodology (not currently approved)
- Exact confidence scoring rules
- Durable standards-registry location
- Fact-only vs Canonical body events
- Manual vs AH DailyFacts authority unification
- RMR authoritative fact source (Basal Energy is insufficient as currently mapped)

---

## Release gates (unchanged)

- RG-LEGAL-01 OPEN
- RG-SOURCE-PRIVACY-01 OPEN
- Export coverage closure OPEN
- Export scalability OPEN
- Infrastructure validation truth gap OPEN
- Consent persistence NOT IMPLEMENTED
- Legal assent INACTIVE
- Production deploy NONE

---

## Status note

This RFC is **Accepted** for architecture, standards direction, and Stage 3B shell authorization. It does **not** implement Stage 3B runtime, does **not** authorize official classification persistence, and does **not** close release gates.
