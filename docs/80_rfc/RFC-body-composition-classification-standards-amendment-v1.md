# Body Composition Classification Standards Amendment (Proposed)

**Status:** Proposed — human approval required for Body Fat and Lean Tissue runtime classification  
**Date:** 2026-09-18  
**Branch:** `feat/body-composition-stage3b-value-first-shell`  
**Does not override Stage 3A Accepted decisions** for unresolved body-fat tables, lean/performance classification, Optimized/Excellence placement, or universal BF% excellence.  
**Companions:** Stage 3A evidence matrix; ADR/RFC Body Composition Category Intelligence v1.

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

### Runtime status

**PROPOSED — HUMAN APPROVAL REQUIRED.** Fail closed: no segments, no personal marker.

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

### Runtime status

**PROPOSED — HUMAN APPROVAL REQUIRED.** Fail closed for total lean mass / unknown method.

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
Weight BMI screening (CDC/WHO adult categories): AUTHORIZED for Body consumer UI
  as screening presentation only (2026-09-18 product direction).

Body Fat personal classification: PROPOSED — HUMAN APPROVAL REQUIRED.

Lean Tissue personal classification: PROPOSED — HUMAN APPROVAL REQUIRED.
```
