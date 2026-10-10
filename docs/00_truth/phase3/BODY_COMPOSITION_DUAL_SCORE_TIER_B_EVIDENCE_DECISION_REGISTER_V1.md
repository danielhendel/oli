# Body Composition Dual Score — Tier B Evidence Decision Register V1

**Document type:** Evidence-review decision register (docs only)
**Date:** 2026-10-10
**Branch:** `feat/body-composition-stage3e-body-scans-v1`
**Kind:** Records ER-BC-01…18 evidence-review gate state. **Does not** authorize Tier B execution, clinical validity, consumer integration, or public scores.

| Identity | Value |
|----------|-------|
| Methodology SHA (PASS) | `d7714df53af661e4492c67074823902197ced0e7` |
| Wave 1 validation truth-freeze SHA | `74c6529b2ec0a8a91d1c8f246144e6cda07ee4b6` |
| Historical evidence-package SHA (prior re-gate FAIL) | `754bfd5de80c21525f6ad1143f0e39eeb8448c24` |
| Prior correction SHA (V2 input) | `d342c776e5a1a370e50aba2490aecaaa2f6430ec` |
| Evidence review master | `docs/10_product/specs/BODY_COMPOSITION_DUAL_SCORE_TIER_B_EVIDENCE_REVIEW_V1.md` |
| Tier B empirical plan | `docs/10_product/specs/BODY_COMPOSITION_DUAL_SCORE_TIER_B_EMPIRICAL_VALIDATION_PLAN_V1.md` |
| Parent Tier B decision register | `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_TIER_B_DECISION_REGISTER_V1.md` |
| Prior independent scientific evidence re-gate | **FAIL** @ `754bfd5d…` (4 bounded defects) |
| Independent scientific evidence re-gate V2 | **FAIL** (evidence-confidence taxonomy only; source / WHO / readiness **PASS**) |
| Evidence package status | **ACCEPTED** @ `374e3bff2cbb6ff9cf2703ef4c978c82db49cd82` |
| Scientific evidence accepted | **YES — ACCEPTED** |
| Governance protocol | **PASS** |
| Governance closure | **NOT COMPLETE** |
| Protocol draft | **CREATED** (see protocol draft + blocker register) |
| Protocol truth freeze | **NOT COMPLETE** |
| Tier B execution | **NOT AUTHORIZED** |

---

## 1. Gate status (authoritative for evidence workstream)

| Domain | Status |
|--------|--------|
| Tier B methodology | **PASS** @ `d7714df5…` |
| Evidence-review workstream | **CURRENT** |
| Prior independent scientific evidence re-gate | **FAIL** @ `754bfd5d…` |
| Independent scientific evidence re-gate V2 | **FAIL** (confidence taxonomy only) |
| Source integrity / WHO attribution / readiness taxonomy | **PASS** (V2) |
| ER-BC-06 primary-confidence reconciliation | **COMPLETE** (this package) |
| Evidence package | **ACCEPTED** @ `374e3bff…` |
| Scientific evidence accepted | **YES — ACCEPTED** |
| Independent scientific evidence re-gate V3 | **SUPERSEDED by ACCEPTED status at `374e3bff…`** |
| Governance protocol | **PASS** |
| Governance/legal/privacy planning | **CURRENT** (closure **NOT COMPLETE**) |
| Protocol draft | **CREATED** |
| Protocol freeze | **NOT COMPLETE** |
| Tier B execution | **NOT AUTHORIZED** |
| Clinical validation | **NOT ESTABLISHED** |
| Consumer integration | **NOT AUTHORIZED** |
| Public Health / Performance-Supporting | **NO-GO** |
| PHI / human data collection | **NONE** |
| Formula / Resolver / Confidence changes | **NONE** |
| Claim level | **Level 0** |

---

## 2. Decision taxonomy (frozen for this register)

### 2.1 Protocol readiness (canonical — unchanged from V2 PASS)

| Code | Meaning |
|------|---------|
| **PENDING** | Review not completed |
| **SUFFICIENT_FOR_PROTOCOL_FREEZE** | The scoped ER question is sufficiently resolved to freeze the corresponding protocol method, control, or constraint without inventing a material scientific choice. Does **not** imply all empirical numeric values are known. |
| **PARTIALLY_SUFFICIENT** | The review supports part of the scoped protocol, but one or more material decisions still require additional evidence, an Oli empirical estimate, governance determination, or separate scientific-policy review. |
| **INSUFFICIENT** | Published evidence does not adequately resolve the scoped protocol question. |
| **SCIENTIFIC_REVIEW_REQUIRED** | Evidence exposes a model/policy conflict that protocol drafting cannot resolve without a separate governed scientific decision. |

### 2.2 Evidence confidence (separate — primary field)

Every ER has exactly one **primaryEvidenceConfidence**: **HIGH / MODERATE / LOW / INSUFFICIENT**.

Component-level conclusions may differ in strength but must not replace or double-count the primary label.

**Evidence confidence** answers: how strong is the evidence supporting the scoped scientific conclusion?
**Protocol readiness** answers: is enough of the question resolved to freeze a protocol method or constraint?
They are not interchangeable. Confidence counts and readiness counts need not match.

---

## 3. ER-BC decision rollup

| erId | Question (short) | primaryEvidenceConfidence | componentConfidenceNotes | protocolReadiness | protocolImplication | unresolvedQuestion |
|------|------------------|---------------------------|--------------------------|-------------------|---------------------|--------------------|
| ER-BC-01 | DXA precision/repeatability | **HIGH** | Component MODERATE typical magnitudes | **PARTIALLY_SUFFICIENT** | Freeze ISCD-style design | Oli σ (TB-02/03) |
| ER-BC-02 | WHO waist repeatability | **HIGH** | Component LOW–INSUFFICIENT absolute σ | **PARTIALLY_SUFFICIENT** | Landmark + expert-consultation duplicate QC; STEPS separate | Oli σ_waist (TB-01) |
| ER-BC-03 | FMI/ALMI health associations | **MODERATE** | — | **PARTIALLY_SUFFICIENT** | Candidate externals only | Primary endpoint freeze |
| ER-BC-04 | FFMI/performance associations | **MODERATE** | — | **PARTIALLY_SUFFICIENT** | Grip/function candidates; no sport prediction | Primary endpoint freeze |
| ER-BC-05 | Vendor comparability | **HIGH** | — | **PARTIALLY_SUFFICIENT** | BA + non-pooling default | Local LoA |
| ER-BC-06 | Height-propagated index precision / Σ_ε | **INSUFFICIENT** | Component **HIGH** that biological covariance ≠ measurement-error covariance; must estimate Σ_ε prospectively | **PARTIALLY_SUFFICIENT** | Shared Height + fail-closed prospective TB-05 estimation; forbid unsupported import | Empirical Σ_ε magnitude/structure |
| ER-BC-07 | Clinically meaningful BC change | **INSUFFICIENT** | — | **INSUFFICIENT** | No CMC freeze; triad B deferred | All CMC anchors |
| ER-BC-08 | Sarcopenia vs H3 | **HIGH** | — | **SUFFICIENT_FOR_PROTOCOL_FREEZE** | Construct map + no-diagnosis control | FFMI-fallback meaning (empirical/SP) |
| ER-BC-09 | Longer-term cardiometabolic | **MODERATE** | — | **PARTIALLY_SUFFICIENT** | Association OK; prediction forbidden | Calibration |
| ER-BC-10 | Age fairness vs age-invariant score | **MODERATE** | Watch: later SCIENTIFIC_REVIEW_REQUIRED possible | **PARTIALLY_SUFFICIENT** | Empirical TB-12; no age correction now | Inequity action |
| ER-BC-11 | Sex-specific reference limits | **LOW** | Component HIGH that sex diffs exist | **PARTIALLY_SUFFICIENT** | Empirical TB-13; knots ≠ fairness | Fairness thresholds |
| ER-BC-12 | Ethnicity / intersectional bias | **LOW** | — | **PARTIALLY_SUFFICIENT** | Legal gate; core intersections default | Ethnicity confirmatory? |
| ER-BC-13 | SDC/MDC vs clinical vs perceived | **HIGH** | — | **SUFFICIENT_FOR_PROTOCOL_FREEZE** | Method + triad separation freeze only | Numeric SDC; CMC = ER-BC-07 |
| ER-BC-14 | Prediction methodology controls | **HIGH** | — | **SUFFICIENT_FOR_PROTOCOL_FREEZE** | Claim/analysis-control checklist | Future predictive study |
| ER-BC-15 | Re-id + private governance | **MODERATE** | — | **PARTIALLY_SUFFICIENT** | Scientific checklist | Legal/governance sign-off |
| ER-BC-16 | Acute-state DXA effects | **MODERATE** | Factor nuance: hydration/exercise HIGH; menstrual LOW; edema INSUFFICIENT | **PARTIALLY_SUFFICIENT** | Controls A–D freezable | Oli deltas |
| ER-BC-17 | Measurement-error covariance | **INSUFFICIENT** | Component HIGH that independent-noise is inadequate as final model | **INSUFFICIENT** | TB-05 mandatory | All ρ_error |
| ER-BC-18 | Numeracy / misinterpretation | **MODERATE** | — | **PARTIALLY_SUFFICIENT** | Probe classes freezable | Rate thresholds |

### 3.1 Primary evidence-confidence counts (must = 18)

| primaryEvidenceConfidence | N | ER IDs |
|---------------------------|--:|--------|
| HIGH | **6** | 01, 02, 05, 08, 13, 14 |
| MODERATE | **7** | 03, 04, 09, 10, 15, 16, 18 |
| LOW | **2** | 11, 12 |
| INSUFFICIENT | **3** | 06, 07, 17 |
| **TOTAL** | **18** | ER-BC-01…18 |

### 3.2 Protocol-readiness counts (must = 18; preserved)

| Protocol readiness | N |
|--------------------|--:|
| SUFFICIENT_FOR_PROTOCOL_FREEZE | **3** (08, 13, 14) |
| PARTIALLY_SUFFICIENT | **13** |
| INSUFFICIENT | **2** (07, 17) |
| SCIENTIFIC_REVIEW_REQUIRED | **0** |
| PENDING | **0** |
| **TOTAL** | **18** |

**ER-BC-06 distinction:** primary evidence confidence **INSUFFICIENT** for Σ_ε magnitude, while protocol readiness remains **PARTIALLY_SUFFICIENT** because the review supports a fail-closed prospective-estimation method and forbids substitution with biological covariance.

---

## 4. Protocol-readiness summary

| Bucket | ERs |
|--------|-----|
| Sufficient for named protocol-design freeze | ER-BC-08 construct map; ER-BC-13 SEM/SDC **methods**; ER-BC-14 claim controls |
| Partially sufficient — drafting possible with deferred empirics | 01, 02, 03, 04, 05, 06, 09, 10, 11, 12, 15, 16, 18 |
| Insufficient — must wait on Tier B or later science | 07 (CMC), 17 (error Σ) |

**Protocol freeze overall:** **NOT COMPLETE** (governance closure incomplete + remaining partials/empirics + study-specific analysis freezes required). Scientific evidence package is **ACCEPTED** for integrated protocol drafting.

---

## 5. Bounded correction log

| Pass | Defect | Correction |
|------|--------|------------|
| Prior (source/readiness) | Zemski/Buehring; Thamnirat DOI; readiness conflict; WHO blending | Preserved PASS areas from V2 |
| This pass | ER-BC-06 primary confidence dual-label / omitted from INSUFFICIENT count | primaryEvidenceConfidence = **INSUFFICIENT**; component HIGH methods preserved; counts **6 / 7 / 2 / 3** |

---

## 6. Critical gaps owned by future Tier B empirics

1. Local DXA/Waist σ and SDC
2. Error covariance Σ_ε
3. Local vendor LoA
4. Acute-state score deltas
5. Confirmatory external endpoints
6. Age/sex external-meaning fairness tests
7. Access/selection magnitudes
8. Comprehension rates
9. CMC anchors (deferred beyond detectability)
10. Re-id sign-off (governance)

---

## 7. SP track support (non-decisions)

| Track | Evidence register stance |
|-------|--------------------------|
| SP-01 (FFMI vs FFM / Resolver) | Evidence summary provided in master §14; **Resolver policy NOT decided** |
| SP-02 (presentation / uncertainty) | Evidence summary in master §15; **no UI**; thresholds not frozen |

---

## 8. Claim boundary (frozen)

| Claim | Status |
|-------|--------|
| Clinical / diagnostic validity | **NOT ESTABLISHED** |
| Predictive validity | **NOT ESTABLISHED** / forbidden as product claim now |
| Consumer integration | **NOT AUTHORIZED** |
| Public scores | **NO-GO** |
| Scientific evidence accepted for protocol-freeze drafting | **YES — ACCEPTED** (drafting authorized; Protocol Truth Freeze still **NOT COMPLETE**) |

---

## 9. Roadmap

```text
Tier B methodology:              PASS
Prior scientific evidence re-gate: FAIL @ 754bfd5d…
Independent evidence re-gate V2: FAIL (confidence taxonomy only; source/WHO/readiness PASS)
Evidence package:                ACCEPTED @ 374e3bff…
Scientific evidence accepted:    YES — ACCEPTED
Governance protocol:             PASS
Governance closure:              NOT COMPLETE
Protocol draft:                  CREATED
Protocol freeze:                 NOT COMPLETE
Execution:                       NOT AUTHORIZED
```

---

## 10. Next gate

Scientific evidence is **ACCEPTED** @ `374e3bff…` for integrated protocol drafting.

Next: independent **integration review** of the Tier B protocol draft / blocker register / integration matrix; then actual counsel/ethics/security determinations and study-specific analysis freezes. Protocol Truth Freeze remains **NOT COMPLETE** until those dependencies close or are explicitly BLOCKED.

**Do not execute Tier B.**
**Do not collect human data.**
**Do not change draft_v1.**

---

END OF TIER B EVIDENCE DECISION REGISTER V1
