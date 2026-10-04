# Body Composition Evidence Resolver V1

**Status:** Implementation completed · bounded defects R1–R5 closed · independent scientific/data-integrity re-gate **PASS** at `3ae4737b8212fa5479fa1f621028e32ad7ab5757` · docs truth freeze re-gate **PASS** at `49751716b450e6d05d607938e52624d29d680a1c` (`docs/00_truth/phase3/BODY_COMPOSITION_EVIDENCE_RESOLVER_V1_TRUTH_FREEZE.md`)
**Resolver version:** `body_composition_resolver_draft_v1`
**Authority:** Dual Score scientific/decision freeze + Stage 3E foundation truth freeze + Resolver V1 truth freeze
**Not:** clinically validated · production calibrated · score validated
**Assessment Confidence:** implementation **PASS** at `dc506bbe…` · independent re-gate **PASS** · docs truth-freeze re-gate **PASS** at `d2b0b3abba958c9ac80ec5401f90ad5227a1a0a8` (`BODY_COMPOSITION_ASSESSMENT_CONFIDENCE_V1_TRUTH_FREEZE.md`)
**Composition scores:** Internal draft engines **PASS** @ `d940b161…` · Independent Exact-Math Implementation Re-Gate V2 **PASS** · Implementation truth freeze **PENDING INDEPENDENT DOCS RE-GATE** · Consumer integration **NOT AUTHORIZED** · public numeric scores **NO-GO**

---

## Purpose

Select **which evidence represents each construct** from a Canonical Evidence Bridge bundle:

- construct eligibility
- comparable sets
- deterministic representative selection
- supporting / alternate retention
- recency **metadata** (without Confidence)
- transparent rationale codes

This phase does **not** compute Assessment Confidence, Health Composition score, or Performance-Supporting Composition score.

Architecture:

```text
SOURCE OBSERVATIONS
       ↓
CANONICAL EVIDENCE BRIDGE
       ↓
EVIDENCE RESOLVER  ← this document
       ↓
ASSESSMENT CONFIDENCE          (implementation PASS · docs truth-freeze re-gate PASS at d2b0b3ab…)
       ↓
Health / Performance score engines  (internal draft PASS @ d940b161… · Re-Gate V2 PASS · unwired · public NO-GO)
```

---

## Inputs

| Input | Rule |
|-------|------|
| `bundle` | `BodyCompositionEvidenceBundle` (caller-supplied; already account-scoped) |
| `asOf` | Explicit ISO datetime — **required**; resolver never calls `Date.now()` |
| `resolverVersion` | Must be `body_composition_resolver_draft_v1` |

No UID. No network. No Firebase. No React. No persistence.

---

## Output contract

`BodyCompositionEvidenceResolution`:

- `resolverVersion`
- `asOf`
- `evidenceBundleCompleteness` (propagated; never upgraded to account-complete)
- `constructs[]` — exactly H1, H2, H3, H4, P1, P2, P3
- `diagnostics` — safe counts / reason codes / operation notes only

Each construct result includes:

- `status`
- `channels[]` (channel-specific resolution)
- `primaryEvidenceRefs` / `supportingEvidenceRefs` / `alternateEvidenceRefs`
- `excludedCandidateSummaries`
- `rationaleCodes`
- `recencyMetadata`
- `comparabilityMetadata`

**Forbidden on output:** confidence labels/scores, composition scores, risk %, performance ratings, UID/identity fields.

Source observations remain authoritative. Resolver references them by `observationId` and does not persist a second truth store.

---

## Construct status lattice

| Status | Meaning |
|--------|---------|
| `conflict` | Genuine mutually incompatible claims (not ordinary multi-method variation) |
| `policy_not_frozen` | Selection requires an open policy (day boundary, unranked channels) |
| `multiple_valid` | Multiple valid complementary channels/families; no frozen global winner |
| `resolved_with_supporting` | Exactly one **resolved** frozen primary + governed supporting/alternates |
| `resolved` | Exactly one resolved primary; no additional valid supporting channel |
| `undated_only` | Only undated context |
| `insufficient` | No adequate eligible evidence |
| `unsupported` | Only evidence outside supported policy |

**Hard rules:**

- Channel `multiple_valid` / `policy_not_frozen` **propagates** to the construct unless a frozen construct-level pair fully resolves it.
- `resolved_with_supporting` must **not** be manufactured by placing unresolved method-family primaries into the supporting bucket.
- Primary / supporting / alternate ref sets remain disjoint and deterministic.

---

## Frozen precedence matrix (draft v1)

Eligibility ≠ precedence. Array order is never priority.

| Construct | Eligible channels | Frozen pairs | Multi-channel behavior |
|-----------|-------------------|--------------|------------------------|
| H1 | WHtR standardized, VAT mass, VAT volume | none | complementary → `multiple_valid` |
| H2 | FMI, total BF%, Fat Mass | **FMI over BF% only** | BF%+Fat Mass (no FMI) → `policy_not_frozen`; Fat Mass alone may resolve; Fat Mass may be governed supporting when FMI is primary |
| H3 | ALMI, FFMI, FFM, total Lean | **ALMI over FFMI only** | FFM+Lean (no index) → `policy_not_frozen`; lower-specificity may support when ALMI/FFMI primary |
| H4 | A/G, Android %, Gynoid % | none | complementary explanatory → `multiple_valid` |
| P1 | FFMI, FFM, total Lean | none | competing unranked → `policy_not_frozen`; sole channel may resolve |
| P2 | ALMI + limb lean by laterality | none | complementary → `multiple_valid` |
| P3 | FMI, total BF%, Fat Mass | **FMI over BF% only** | same as H2 |

Never label an unfrozen selection with `selected_frozen_channel_precedence`.

---

## Same-day DXA precedence (inactive)

Same-day DXA precedence is **authorized conceptually** by the Dual Score freeze but **inactive** in `body_composition_resolver_draft_v1` until the measurement-day boundary is separately frozen.

**UTC is not the governed day boundary.** Draft v1 does not invent:

- UTC calendar date
- source-local / profile / facility timezone date
- rolling 24-hour window

When semantically matching DXA + consumer/segmental BIA representatives exist:

- preserve both
- no averaging
- no most-favorable selection
- no same-day DXA precedence
- construct/channel status: `policy_not_frozen`
- rationale includes `same_day_boundary_not_frozen` and `same_day_precedence_not_applied`

A future Resolver version may apply same-day DXA primary once an ADR freezes day timezone, calendar boundary, required source timezone metadata, DST behavior, and missing-timezone behavior. The conceptual authorization is **deferred**, not cancelled.

---

## Calculated formula provenance

Metric-specific formula versions (exact match required):

| Metric | Version | Required input roles |
|--------|---------|----------------------|
| BMI | `bmi_v1` | body mass + height |
| WHtR | `whtr_v1` | waist + height |
| FMI | `fmi_v1` | total Fat Mass + height |
| FFMI | `ffmi_v1` | total Fat-Free Mass + height |
| ALMI | `almi_v1` | appendicular limb Lean (≥2 regions) + height |

Rules:

- all `inputObservationRefs` must resolve in the same bundle
- no dangling / duplicate / self / wrong-metric refs
- Height must be an in-bundle Height observation ref (subjectContext.height alone is insufficient)
- Resolver never searches for or invents missing inputs
- BMI is validated when present but is **not** an H2/P3 construct channel

### Standardized WHtR path

Requires:

- metric = WHtR
- `formulaVersion = whtr_v1`
- governed Waist input with `protocolId = who_midpoint_v1` and `protocolVersion = 1`
- governed Height input ref
- valid dated units; no legacy profile Waist; no future Waist

Unknown/missing protocol WHtR is not the standardized primary path.

---

## Eligibility (base)

Fail closed on:

- schema / finite value / unit / region
- missing or unparseable `measuredAt`
- `measuredAt` later than `asOf`
- unsupported / mismatched formula version
- incomplete calculated input chains
- metric not in construct policy
- standardized WHtR without WHO Waist + Height provenance
- duplicate `observationId`

Legacy profile Waist in subject context is **not** dated evidence.

Apple Health unlabeled composition remains `method=unknown` / `evidenceType=estimated` at the Bridge; Resolver does not invent BIA.

---

## Comparability

Directly comparable only when matching:

- canonical metric
- region / laterality
- canonical unit
- method family
- formula version (calculated)

**Not comparable:** Lean ≠ FFM ≠ SMM; VAT mass ≠ volume; BMC ≠ BMD; BF% ≠ Fat Mass; total Lean ≠ appendicular Lean; WHtR ≠ VAT mass.

---

## Recency metadata

Emitted: `ageDays`, Bridge `recencyClass`, dated/undated/future counts, `recencyPolicyState = threshold_not_frozen`.

**Not emitted:** freshness %, stale penalties, hard expiry, Confidence reductions, invented current/aging/historical cutovers.

---

## Completeness

Resolver preserves `evidenceBundleCompleteness.mode = caller_supplied_partial`.

A construct may be `resolved` from supplied evidence while the bundle remains partial.

---

## Persistence / API / UI

Resolver output is **runtime-derived only**.

No Firestore collection, snapshot, AsyncStorage cache, API route, Cloud Function, consumer score card, or resolver debug UI in this phase.

---

## Module locations

| Area | Path |
|------|------|
| Contracts | `lib/contracts/bodyCompositionEvidenceResolver.ts` |
| Implementation | `lib/data/body/evidence/resolver/` |
| Spec | `docs/10_product/specs/BODY_COMPOSITION_EVIDENCE_RESOLVER_V1.md` |

Presentation selectors (e.g. latest Waist for display) remain **outside** this Resolver.

---

## Open scientific policies (must remain open)

- measurement-day boundary (timezone / calendar / DST / missing-timezone)
- exact recency half-lives
- device quality coefficients
- Assessment Confidence coefficients / labels
- construct score transforms
- score weights / dampening caps / cut points
- public status labels (Deficient / Healthy / Strong / Optimal / Elite)
- clinical calibration
- unranked secondary channel winners (BF% vs Fat Mass; FFM vs Lean; P1 multi-channel)
- cross-channel H1 global winner when WHtR and VAT both current

Resolver returns `policy_not_frozen` / `multiple_valid` / `threshold_not_frozen` rather than inventing these.

---

## Authorization boundary

| Capability | State |
|------------|-------|
| Evidence Resolver | **IMPLEMENTED** · scientific re-gate **PASS** · docs freeze re-gate **PASS** |
| Assessment Confidence | **implementation PASS** · independent re-gate **PASS** · docs truth-freeze re-gate **PASS** at `d2b0b3abba958c9ac80ec5401f90ad5227a1a0a8` |
| Health Composition score | Internal draft engine **PASS** @ `d940b161…` · Independent Exact-Math Implementation Re-Gate V2 **PASS** · Implementation truth freeze **PENDING INDEPENDENT DOCS RE-GATE** · Consumer integration **NOT AUTHORIZED** |
| Performance-Supporting Composition score | Internal draft engine **PASS** @ `d940b161…` · Independent Exact-Math Implementation Re-Gate V2 **PASS** · Implementation truth freeze **PENDING INDEPENDENT DOCS RE-GATE** · Consumer integration **NOT AUTHORIZED** |
| Public numeric scores | **NO-GO** |

Approved Resolver runtime SHA: `3ae4737b8212fa5479fa1f621028e32ad7ab5757`.

Canonical freeze: `docs/00_truth/phase3/BODY_COMPOSITION_EVIDENCE_RESOLVER_V1_TRUTH_FREEZE.md`.

A future policy change requires a **new resolver version**, rationale, tests, and independent scientific gate.
