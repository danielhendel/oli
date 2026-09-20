# Body Composition Classification Standards Amendment (Proposed)

**Status:** Proposed overall — **section-level:** Weight **APPROVED** for Stage 3B; Body Fat **PROPOSED / UNRESOLVED**; Lean Tissue **PROPOSED / UNRESOLVED**  
**Date:** 2026-09-18  
**Leadership decision:** 2026-09-18 — APPROVED IN PART  
**Branch:** `feat/body-composition-stage3b-value-first-shell`  
**Does not override Stage 3A Accepted decisions** for unresolved body-fat tables, lean/performance classification, Optimized/Excellence placement, or universal BF% excellence.  
**Companions:** Stage 3A evidence matrix; ADR/RFC Body Composition Category Intelligence v1.

### Section approval metadata (2026-09-18)

| Section | Status |
|---------|--------|
| Weight (CDC/WHO adult BMI screening) | **APPROVED** for Stage 3B Body consumer UI |
| Body Fat personal classification | **PROPOSED / UNRESOLVED** — not approved for runtime |
| Lean Tissue personal classification | **PROPOSED / UNRESOLVED** — not approved for runtime |

The overall amendment document remains **Proposed**. Do not mark Body Fat or Lean Tissue methodology Accepted.

---

## 1. Source hierarchy (highest standard)

1. Government or international clinical guidance  
2. Recognized scientific/clinical consensus  
3. Nationally representative reference data  
4. Peer-reviewed classification models  
5. Professional fitness norms only when clearly labeled descriptive (not used as health truth here)  
6. Never vendor-defined classifications as Oli truth  

---

## 2. Weight — APPROVED FOR BODY CONSUMER UI (screening)

| Field | Value |
|-------|--------|
| Standard ID | `cdc-who-adult-bmi-screening` |
| Version | `2024.1` |
| Purpose | Screening |
| Authority | Government / international guideline (CDC / WHO) |
| Construct | Weight-for-height via BMI — **not** Body Composition |
| Applicability | Adults age **≥ 20**; all sexes for this screening standard |
| Required inputs | weight, height, age |
| Compatible methods | Calculated BMI from height + weight |

### Compact-card classifications (exact)

| Label | Threshold (BMI kg/m²) |
|-------|------------------------|
| Underweight | &lt; 18.5 |
| Healthy Weight | 18.5 to &lt; 25 |
| Overweight | 25 to &lt; 30 |
| Obesity | ≥ 30 |

### Detail subclasses (Obesity)

| Label | Threshold |
|-------|-----------|
| Class 1 Obesity | 30 to &lt; 35 |
| Class 2 Obesity | 35 to &lt; 40 |
| Class 3 Obesity | ≥ 40 |

### Explicit non-claims

- Not ideal weight / Optimal / performance weight  
- Not PR #178 BMI target overlay  
- Not personal prescription  
- Under 20 / unknown age / missing height → **no personal marker**; under 20 / unknown age → adult graph **not** applied  

---

## 3. Body Fat — PROPOSED (human approval required)

### Recommendation

**Primary candidate:** Gallagher et al. (2000) age- and sex-specific percentage body fat ranges linked to BMI categories (*Am J Clin Nutr*).  

**Secondary candidate:** NHANES DXA Fat Mass Index reference/classification when Oli owns FMI (fat mass / height²), not unknown-method %BF.

### Exact classifications

**Not finalized for runtime.** Candidate semantic labels pending primary-source verification:

- Underfat  
- Healthy Body Fat  
- Excess Body Fat  
- Obesity by Body Fat  

Do **not** ship these labels until verified against the primary source and approved.

### Method compatibility (required)

- Known, method-labeled measurement  
- DXA reference must not silently classify BIA (and vice versa)  
- Unknown-method Apple Health → **no classification** (Apple Health is transport)  
- Manual without method → **no classification**  

### Rejected as health truth

- ACE Essential / Athlete / Fitness / Average charts  
- Legacy ACSM/NSCA bands in `lib/classifications/bodyComposition.ts` (unverified for consumer v1 per Stage 3A)  
- Universal BF% excellence / Optimal / Elite  

### Runtime status (leadership 2026-09-18)

**NOT APPROVED FOR RUNTIME CLASSIFICATION.** Stage 3B Body Fat card: current value / provenance / actions only — **no** classification graph, **no** personal marker, **no** Gallagher or ACE labels, **no** Apple Health → BIA inference.

---

## 4. Lean Tissue — PROPOSED (human approval required)

### Owned construct today

Body overview surfaces **total lean mass** (`leanBodyMassKg`). This is **not** interchangeable with:

- appendicular lean mass (ALM)  
- appendicular lean mass index (ALMI)  
- estimated skeletal muscle mass  

### Recommendation

1. **If/when ALMI (DXA) is available:** EWGSOP2 muscle-quantity cutoffs as clinical screening for *Low Muscle Quantity* vs *Not Low by This Standard* — **not** a sarcopenia diagnosis from lean mass alone.  
2. **Population reference (NHANES DXA):** Low / Typical / High for Age and Sex — must be labeled **Population reference**, never Health/Performance/Optimal/Elite.  

### Runtime status (leadership 2026-09-18)

**NOT APPROVED FOR RUNTIME CLASSIFICATION.** Stage 3B Lean Tissue card: current total lean mass / provenance / actions only — **no** classification graph, **no** personal marker, **no** EWGSOP2 ASM/ALMI thresholds on total lean mass, **no** sarcopenia diagnosis, **no** performance rating.

---

## 5. Stage 3C boundary (proposed)

Stage 3C may implement provenance, method labeling, and baseline inputs required for approved standards. It must **not** silently activate Body Fat or Lean Tissue personal classification until this amendment (or successor) is Accepted with explicit human approval.

---

## 6. Unresolved decisions

- Exact Gallagher consumer labels and cutoffs after primary-paper verification  
- Ethnicity-specific waist / BMI applicability (out of Weight compact card scope)  
- Whether Health Protection aggregate is ever authorized (Stage 3A unresolved)  
- Durable standards-registry persistence location  

---

## Approval record

```text
APPROVED IN PART — 2026-09-18

Weight BMI screening (CDC/WHO adult categories): AUTHORIZED for Body consumer UI
  as screening presentation only (Stage 3B).

Body Fat personal classification: PROPOSED / UNRESOLVED — NOT APPROVED FOR RUNTIME.
  Do not implement Gallagher-derived personal categories in Stage 3B.

Lean Tissue personal classification: PROPOSED / UNRESOLVED — NOT APPROVED FOR RUNTIME.
  Do not apply EWGSOP2 ASM/ALMI thresholds to total lean mass.
```
---

## 7. Stage 3B display-refinement addendum (2026-09-19) — PROPOSED evidence only

**Consumer rename:** Oli landing/popups use **Lean Mass** (was Lean Tissue). Internal id `leanTissue` and HealthKit **Lean Body Mass** remain unchanged.

**Runtime classification status unchanged:**

| Metric | Status |
|--------|--------|
| Weight (CDC/WHO adult BMI screening) | **APPROVED / IMPLEMENTED** |
| Body Fat personal classification | **PROPOSED / HUMAN APPROVAL REQUIRED** |
| Lean Mass personal classification | **PROPOSED / HUMAN APPROVAL REQUIRED** |

**Explicit runtime non-ship (this pass):**

- No Body Fat classification labels/marker
- No Lean Mass classification labels/marker
- No Body score / aggregate classification
- No Apple Health → BIA inference
- No total-Lean-Mass → ALMI / EWGSOP2 mapping
- No sarcopenia diagnosis

### 7.A Body Fat evidence candidates (comparison)

| Candidate | Role | Method / population notes | Product fit |
|-----------|------|---------------------------|-------------|
| Gallagher et al. 2000 | Primary candidate for %BF ↔ BMI-linked screening bands | Age-/sex-/ethnicity-aware; provisional; DXA-era method sensitivity | Possible future health-risk screening **only** with method gate |
| Zhu et al. 2003 / NHANES III | Metabolic-syndrome risk thresholds | Population/outcome specific; calibration limits | Risk context — not universal “healthy BF%” |
| NHANES DXA %BF / FMI refs | Population reference percentiles | Age/sex/ethnicity specific; DXA | Reference ≠ health classification |
| Government universal adult BF% classes | **None adopted** as of Stage 3A/3B review | — | Do not invent universal ACE-style health classes |

**Rejected as health truth:** ACE Essential/Athletic/Fitness/Average; universal Excellence/Optimal; unknown-method Apple Health classification; mixed-method trend classification.

**Candidate consumer vocabulary (not approved for code):** Below screening reference / Reference range / Elevated / High — pending primary-source verification and leadership approval. Default remains **fail closed**.

**Method applicability (proposed):** DXA / 4C / validated MF-BIA may classify only when method-labeled and standard-compatible; consumer BIA / unknown Apple Health transport / unlabeled manual → **value + source only, no marker**.

### 7.B Lean Mass constructs (must stay separated)

| Construct | Owned in Oli today? | Classification path |
|-----------|---------------------|---------------------|
| Total Lean Body Mass | Yes (`leanBodyMassKg`) | No official class without compatible total-LMI model |
| Fat-free mass | No distinct field | Do not equate silently |
| Appendicular lean mass / ALMI | No | Future DXA advanced path only |
| Skeletal muscle / strength / performance | No | Out of Stage 3B |

**EWGSOP2:** low strength primary; quantity confirms; ALMI cutoffs apply to appendicular constructs — **not** Apple Health total Lean Body Mass.

**NHANES DXA:** population LMI/ALMI percentiles — label as Population reference only; never Optimal/High/Excellence health claims.

### 7.C Compatibility for derived display (runtime, presentation-only)

Fat mass and Lean Mass % may display when pairing is proven under this hierarchy:

1. Same measurement / raw-event identity
2. Same sourceId + identical observedAt
3. **Existing approved Body overview snapshot-day merge** (`bodyMetricsForSnapshotDay` / same-day composition merge) — metrics co-presented on one `overviewDay`

Otherwise withhold with a consumer-safe “compatible Weight needed” explanation.
Apple Health remains transport, not measurement method. No new Firestore path.
Derived values are presentation-only (not ingested, not written to HealthKit).

### 7.D Proposed standards registry contract (docs only)

```ts
type BodyMetricStandardDefinition = {
  readonly id: string;
  readonly version: string;
  readonly construct: BodyCompositionConstruct;
  readonly evidenceTier: string;
  readonly applicableMethods: readonly MeasurementMethod[];
  readonly applicability: ApplicabilityRule;
  readonly classify: PureClassifier;
  readonly sourceCitations: readonly EvidenceCitation[];
};
```

Durable location remains via RFC/ADR process — **not implemented** in this pass. No remote mutable thresholds. No JSX thresholds.

### 7.E Versioning / recomputation (proposed)

- Pure, deterministic, versioned classifiers
- Recompute on standard version bump
- Missing / conflicting / stale / unknown-method → withhold marker
- Apple Health is transport, not method

**Status of this section:** PROPOSED — do not implement Body Fat or Lean Mass classification ranges until explicit human approval is recorded.

---

## 8. Stage 3B local metric-sync preference (ACCEPTED 2026-09-20)

Narrow amendment accepted by product leadership for Stage 3B only:

- Key: `appleHealth:metricSyncScopes:{uid}`
- Device-local; UID-keyed; Oli sync scope only (not Apple native permission)
- OFF stops future sync; does not revoke system access or delete imported data
- No Firestore path; no backend record

Body Fat / Lean Mass **classification** sections above remain **PROPOSED / NOT IMPLEMENTED**.
