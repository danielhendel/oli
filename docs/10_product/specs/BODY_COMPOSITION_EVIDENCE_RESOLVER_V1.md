# Body Composition Evidence Resolver V1

**Status:** Implemented on branch (draft policy) — **pending independent scientific re-gate**  
**Resolver version:** `body_composition_resolver_draft_v1`  
**Authority:** Dual Score scientific/decision freeze + Stage 3E foundation truth freeze  
**Not:** clinically validated · production calibrated · score validated

---

## Purpose

Select **which evidence represents each construct** from a Canonical Evidence Bridge bundle:

- construct eligibility
- comparable sets
- deterministic representative selection
- same-day DXA vs BIA conflict handling
- supporting / alternate retention
- recency **metadata** (without Confidence)
- transparent rationale codes

This phase does **not** compute Assessment Confidence, Health Composition score, or Performance Composition score.

Architecture:

```text
SOURCE OBSERVATIONS
       ↓
CANONICAL EVIDENCE BRIDGE
       ↓
EVIDENCE RESOLVER  ← this document
       ↓
FUTURE Assessment Confidence   (BLOCKED)
       ↓
FUTURE Health / Performance score engines  (BLOCKED)
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

## Construct statuses

| Status | Meaning |
|--------|---------|
| `resolved` | One eligible representative |
| `resolved_with_supporting` | Frozen primary + supporting/alternates |
| `multiple_valid` | Multiple valid channels/families; no frozen global winner |
| `insufficient` | Required evidence missing |
| `conflict` | Reserved for mutually incompatible claims needing future policy |
| `undated_only` | Only undated context (not used for dated primary selection) |
| `unsupported` | Construct not supported by policy |
| `policy_not_frozen` | Evidence exists but precedence not authorized |

Ordinary multi-method variation is **`multiple_valid`**, not a medical conflict.

---

## Channel architecture

Constructs may have multiple scientifically distinct **channels**. Channels are not mathematically interchangeable.

Examples:

| Construct | Channels |
|-----------|----------|
| H1 | `whtr_standardized`, `vat_mass`, `vat_volume` |
| H2 | `fmi`, `body_fat_percent`, `fat_mass` |
| H3 | `almi`, `ffmi`, `fat_free_mass`, `lean_mass_total` |
| H4 | `android_gynoid_ratio`, `android_fat_percent`, `gynoid_fat_percent` |
| P1 | `ffmi`, `fat_free_mass`, `lean_mass_total` |
| P2 | `almi`, limb lean by laterality |
| P3 | `fmi`, `body_fat_percent`, `fat_mass` |

**Cross-channel precedence (frozen only where Dual Score freeze authorizes):**

- H2 / P3: FMI → BF% → Fat Mass
- H3: ALMI → FFMI → FFM → total Lean (ALMI authorized for H3 by Dual Score freeze even when Bridge soft-tag is P2-only)
- P1: FFMI → FFM → total Lean (ALMI is not a second P1 vote)
- H1 / P2: complementary → `multiple_valid` when multiple channels resolve
- H4: explanatory / optional soft refine — not an independent core score vote

---

## Eligibility

Before selection, candidates fail closed on:

- schema / finite value / unit / region
- missing or unparseable `measuredAt` (dated selection)
- `measuredAt` later than `asOf`
- calculated evidence missing `formulaVersion` or `inputObservationRefs`
- metric not in construct policy
- standardized Waist/WHtR path without WHO midpoint protocol on the waist input
- duplicate `observationId` (deduped; first kept by stable id sort)

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

**Not comparable (semantic boundaries):**

- Lean Mass ≠ Fat-Free Mass ≠ Skeletal Muscle Mass
- VAT mass ≠ VAT volume
- BMC ≠ BMD
- Body Fat % ≠ Fat Mass
- total Lean ≠ appendicular Lean
- total-body BMD ≠ hip/spine BMD
- WHtR ≠ VAT mass

---

## Same-day conflict

Frozen: same-day DXA + consumer/segmental BIA for the **same metric / region / unit**:

- DXA primary
- BIA retained as supporting
- no averaging
- no most-favorable selection

Different-day cross-method: newest per comparable family; no invented global winner → `multiple_valid` when families disagree.

---

## Recency metadata

Emitted:

- `ageDays` for dated primaries
- `recencyClass` from Bridge labels
- dated / undated / future-invalid counts
- `recencyPolicyState = threshold_not_frozen`

**Not emitted:** freshness %, stale penalties, hard expiry, Confidence reductions, invented current/aging/historical cutovers (exact thresholds remain OPEN).

---

## Completeness

Resolver preserves `evidenceBundleCompleteness.mode = caller_supplied_partial`.

A construct may be `resolved` from supplied evidence while the bundle remains partial. Omitted source categories remain distinct from explicitly empty ones (Bridge contract).

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

- exact recency half-lives
- device quality coefficients
- Assessment Confidence coefficients / labels
- construct score transforms
- score weights / dampening caps / cut points
- public status labels (Deficient / Healthy / Strong / Optimal / Elite)
- clinical calibration
- cross-channel H1 global winner when WHtR and VAT both current

Resolver returns `policy_not_frozen` / `multiple_valid` / `threshold_not_frozen` rather than inventing these.

---

## Authorization boundary

| Capability | State |
|------------|-------|
| Evidence Resolver | **Implemented — pending independent re-gate** |
| Assessment Confidence | **STILL BLOCKED** |
| Health Composition score | **STILL BLOCKED** |
| Performance Composition score | **STILL BLOCKED** |
| Public numeric scores | **NOT READY** |

A future policy change requires a **new resolver version**, rationale, tests, and independent scientific gate.
