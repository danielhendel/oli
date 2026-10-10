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
| Evidence review master | `docs/10_product/specs/BODY_COMPOSITION_DUAL_SCORE_TIER_B_EVIDENCE_REVIEW_V1.md` |
| Tier B empirical plan | `docs/10_product/specs/BODY_COMPOSITION_DUAL_SCORE_TIER_B_EMPIRICAL_VALIDATION_PLAN_V1.md` |
| Parent Tier B decision register | `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_TIER_B_DECISION_REGISTER_V1.md` |
| Prior independent scientific evidence re-gate | **FAIL** @ `754bfd5d…` (4 bounded defects) |
| Evidence package status | **CORRECTED / PENDING INDEPENDENT SCIENTIFIC RE-GATE V2** |
| Scientific evidence accepted | **NO — pending re-gate** |
| Governance protocol | **PASS** |
| Governance closure | **NOT COMPLETE** |
| Tier B execution | **NOT AUTHORIZED** |

---

## 1. Gate status (authoritative for evidence workstream)

| Domain | Status |
|--------|--------|
| Tier B methodology | **PASS** @ `d7714df5…` |
| Evidence-review workstream | **CURRENT** |
| Prior independent scientific evidence re-gate | **FAIL** @ `754bfd5d…` |
| Bounded source-integrity / readiness correction | **COMPLETE** (this package) |
| Evidence package | **CORRECTED / PENDING INDEPENDENT SCIENTIFIC RE-GATE V2** |
| Scientific evidence accepted | **NO — pending re-gate** |
| Independent scientific evidence re-gate V2 | **PENDING** |
| Governance protocol | **PASS** |
| Governance/legal/privacy planning | **CURRENT** (closure **NOT COMPLETE**) |
| Protocol freeze | **NOT COMPLETE / DRAFTING ONLY** |
| Tier B execution | **NOT AUTHORIZED** |
| Clinical validation | **NOT ESTABLISHED** |
| Consumer integration | **NOT AUTHORIZED** |
| Public Health / Performance-Supporting | **NO-GO** |
| PHI / human data collection | **NONE** |
| Formula / Resolver / Confidence changes | **NONE** |
| Claim level | **Level 0** |

---

## 2. Decision taxonomy (frozen for this register)

### 2.1 Protocol readiness (canonical)

| Code | Meaning |
|------|---------|
| **PENDING** | Review not completed |
| **SUFFICIENT_FOR_PROTOCOL_FREEZE** | The scoped ER question is sufficiently resolved to freeze the corresponding protocol method, control, or constraint without inventing a material scientific choice. Does **not** imply all empirical numeric values are known. |
| **PARTIALLY_SUFFICIENT** | The review supports part of the scoped protocol, but one or more material decisions still require additional evidence, an Oli empirical estimate, governance determination, or separate scientific-policy review. |
| **INSUFFICIENT** | Published evidence does not adequately resolve the scoped protocol question. |
| **SCIENTIFIC_REVIEW_REQUIRED** | Evidence exposes a model/policy conflict that protocol drafting cannot resolve without a separate governed scientific decision. |

Competing present-state values **Yes / Partial / No** are removed as independent taxonomy. Each ER has exactly one protocol-readiness status.

### 2.2 Evidence confidence (separate)

Confidence levels in the master review (**HIGH / MODERATE / LOW / INSUFFICIENT**) are evidence-quality labels — **not** Assessment Confidence and **not** protocol readiness.

A HIGH-confidence conclusion can show with high certainty that an Oli-specific parameter remains unknown; HIGH ≠ sufficient for protocol freeze. Confidence counts and readiness counts need not match.

---

## 3. ER-BC decision rollup

| ER | Question (short) | Protocol readiness | Evidence confidence | Notes |
|----|------------------|--------------------|---------------------|-------|
| ER-BC-01 | DXA precision/repeatability | **PARTIALLY_SUFFICIENT** | HIGH methods / MODERATE magnitudes | Freeze ISCD-style design; Oli σ pending TB-02/03. Sources corrected: Zemski et al. (DOI 10.1016/j.jocd.2018.10.005); Thamnirat et al. (DOI 10.1016/j.jocd.2020.04.001). |
| ER-BC-02 | WHO waist repeatability | **PARTIALLY_SUFFICIENT** | HIGH protocol / LOW–INSUFFICIENT σ | Landmark + expert-consultation duplicate QC freezable; STEPS single-measure documented separately; σ pending TB-01 |
| ER-BC-03 | FMI/ALMI health associations | **PARTIALLY_SUFFICIENT** | MODERATE | Candidate externals only; endpoints not frozen |
| ER-BC-04 | FFMI/performance associations | **PARTIALLY_SUFFICIENT** | MODERATE | Grip/function candidates; no sport prediction |
| ER-BC-05 | Vendor comparability | **PARTIALLY_SUFFICIENT** | HIGH non-interchangeability | Design freeze: BA + non-pooling default; local LoA pending |
| ER-BC-06 | Height-propagated index precision | **PARTIALLY_SUFFICIENT** | HIGH methods / INSUFFICIENT Σ | Shared Height rule confirmed; Σ_error via TB-05 |
| ER-BC-07 | Clinically meaningful BC change | **INSUFFICIENT** | INSUFFICIENT | No CMC freeze; triad B deferred |
| ER-BC-08 | Sarcopenia vs H3 | **SUFFICIENT_FOR_PROTOCOL_FREEZE** | HIGH mapping | Scoped freeze = construct map + no-diagnosis control; FFMI-fallback meaning remains empirical/SP outside scope |
| ER-BC-09 | Longer-term cardiometabolic | **PARTIALLY_SUFFICIENT** | MODERATE | Association OK; prediction forbidden |
| ER-BC-10 | Age fairness vs age-invariant score | **PARTIALLY_SUFFICIENT** | MODERATE | Empirical TB-12; no age correction now. Watch: material inequity may later escalate to SCIENTIFIC_REVIEW_REQUIRED — not a second present-state status. |
| ER-BC-11 | Sex-specific reference limits | **PARTIALLY_SUFFICIENT** | HIGH diffs / LOW fairness proof | Empirical TB-13; knots ≠ fairness |
| ER-BC-12 | Ethnicity / intersectional bias | **PARTIALLY_SUFFICIENT** | LOW biologic universals | Legal gate; core intersections only by default |
| ER-BC-13 | SDC/MDC vs clinical vs perceived | **SUFFICIENT_FOR_PROTOCOL_FREEZE** | HIGH methods | Sufficient for **method selection** + triad separation only; numeric SDC pending TB-16; CMC remains ER-BC-07 |
| ER-BC-14 | Prediction methodology controls | **SUFFICIENT_FOR_PROTOCOL_FREEZE** | HIGH | Claim-boundary / analysis-control checklist freeze; not predictive/clinical/consumer validity |
| ER-BC-15 | Re-id + private governance | **PARTIALLY_SUFFICIENT** | MODERATE principles | Checklist ready; governance sign-off pending |
| ER-BC-16 | Acute-state DXA effects | **PARTIALLY_SUFFICIENT** | HIGH–LOW by factor | Controls A–D freezable; deltas pending TB-04; meal citation → Thamnirat et al. |
| ER-BC-17 | Measurement-error covariance | **INSUFFICIENT** | INSUFFICIENT magnitudes | TB-05 mandatory |
| ER-BC-18 | Numeracy / misinterpretation | **PARTIALLY_SUFFICIENT** | MODERATE | Probe classes freezable; rates pending TB-17 |

### Counts (recalculated from rows; total must = 18)

| Protocol readiness | N |
|--------------------|--:|
| SUFFICIENT_FOR_PROTOCOL_FREEZE | **3** (08, 13, 14) |
| PARTIALLY_SUFFICIENT | **13** |
| INSUFFICIENT | **2** (07, 17) |
| SCIENTIFIC_REVIEW_REQUIRED | **0** |
| PENDING | **0** |
| **TOTAL** | **18** |

---

## 4. Protocol-readiness summary

| Bucket | ERs |
|--------|-----|
| Sufficient for named protocol-design freeze | ER-BC-08 construct map; ER-BC-13 SEM/SDC **methods**; ER-BC-14 claim controls |
| Partially sufficient — drafting possible with deferred empirics | 01, 02, 03, 04, 05, 06, 09, 10, 11, 12, 15, 16, 18 |
| Insufficient — must wait on Tier B or later science | 07 (CMC), 17 (error Σ) |

**Protocol freeze overall:** **NOT COMPLETE / DRAFTING ONLY** (governance closure incomplete + remaining partials + independent evidence re-gate V2 required).

---

## 5. Bounded correction log (this pass)

| Defect | Correction |
|--------|------------|
| ER-BC-01 author misattribution | DOI 10.1016/j.jocd.2018.10.005 → Zemski, Hind, Keating, Broad, Marsh, Slater (Buehring association withdrawn) |
| ER-BC-01 wrong DOI | ALM precision → Thamnirat et al., DOI 10.1016/j.jocd.2020.04.001; wrong DOI 10.1016/j.jocd.2020.01.001 detached (Li et al.; unused) |
| Readiness taxonomy conflict | Master + register reconciled to canonical SUFFICIENT / PARTIALLY_SUFFICIENT / INSUFFICIENT / SCIENTIFIC_REVIEW_REQUIRED; Yes/Partial/No removed |
| WHO source blending | Expert-consultation duplicate ≤1 cm separated from cited STEPS 2017 single-measure procedure |

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
| Scientific evidence accepted for protocol-freeze drafting | **NO — pending re-gate V2** |

---

## 9. Roadmap

```text
Tier B methodology:              PASS
Prior scientific evidence re-gate: FAIL @ 754bfd5d…
Evidence package:                CORRECTED / PENDING INDEPENDENT SCIENTIFIC RE-GATE V2
Scientific evidence accepted:    NO — pending re-gate
Governance protocol:             PASS
Governance closure:              NOT COMPLETE
Protocol freeze:                 NOT COMPLETE / DRAFTING ONLY
Execution:                       NOT AUTHORIZED
```

---

## 10. Next gate

Open a **new independent scientific evidence re-gate V2** against the corrected evidence-package SHA.

Evidence Re-Gate V2 should focus on: corrected Zemski attribution; corrected Thamnirat DOI/authors; source-ledger integrity; WHO consultation vs STEPS distinction; ER-BC-08/13/14 readiness scope; canonical readiness counts; confidence/readiness distinction; no new source errors; governance preservation; no claim inflation.

Only after evidence re-gate V2 **PASS** *and* governance/legal dependencies close may protocol parameters be truth-frozen.

**Do not execute Tier B.**
**Do not collect human data.**
**Do not change draft_v1.**

---

END OF TIER B EVIDENCE DECISION REGISTER V1
