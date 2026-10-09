# Body Composition Dual Score — Tier B Evidence Decision Register V1

**Document type:** Evidence-review decision register (docs only)
**Date:** 2026-10-09
**Branch:** `feat/body-composition-stage3e-body-scans-v1`
**Kind:** Records ER-BC-01…18 evidence-review gate state. **Does not** authorize Tier B execution, clinical validity, consumer integration, or public scores.

| Identity | Value |
|----------|-------|
| Methodology SHA (PASS) | `d7714df53af661e4492c67074823902197ced0e7` |
| Wave 1 validation truth-freeze SHA | `74c6529b2ec0a8a91d1c8f246144e6cda07ee4b6` |
| Evidence review master | `docs/10_product/specs/BODY_COMPOSITION_DUAL_SCORE_TIER_B_EVIDENCE_REVIEW_V1.md` |
| Tier B empirical plan | `docs/10_product/specs/BODY_COMPOSITION_DUAL_SCORE_TIER_B_EMPIRICAL_VALIDATION_PLAN_V1.md` |
| Parent Tier B decision register | `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_TIER_B_DECISION_REGISTER_V1.md` |
| Initial evidence status | **IN REVIEW** → completed package below |
| Evidence package status | **COMPLETED / PENDING INDEPENDENT SCIENTIFIC RE-GATE** |
| Tier B execution | **NOT AUTHORIZED** |

---

## 1. Gate status (authoritative for evidence workstream)

| Domain | Status |
|--------|--------|
| Tier B methodology | **PASS** @ `d7714df5…` |
| Evidence-review workstream | **CURRENT** |
| Evidence review master V1 | **COMPLETE (docs)** |
| Independent scientific evidence re-gate | **PENDING** |
| Governance/legal/privacy planning | **CURRENT** (closure **NOT COMPLETE**) |
| Protocol freeze | **DRAFTING ONLY / WAITING ON DEPENDENCIES** |
| Tier B execution | **NOT AUTHORIZED** |
| Clinical validation | **NOT ESTABLISHED** |
| Consumer integration | **NOT AUTHORIZED** |
| Public Health / Performance-Supporting | **NO-GO** |
| PHI / human data collection | **NONE** |
| Formula / Resolver / Confidence changes | **NONE** |
| Claim level | **Level 0** |

---

## 2. Decision taxonomy (frozen for this register)

| Code | Meaning |
|------|---------|
| **PENDING** | Review not completed |
| **SUFFICIENT_FOR_PROTOCOL_FREEZE** | Evidence adequate to freeze the *named protocol-design parameter* (not execution) |
| **PARTIALLY_SUFFICIENT** | Design guidance available; numeric magnitudes / endpoints / thresholds still deferred to Tier B empirics or later gates |
| **INSUFFICIENT** | Literature inadequate; Tier B must generate evidence or parameter remains deferred |
| **SCIENTIFIC_REVIEW_REQUIRED** | Literature conflicts with or pressures draft_v1 design; escalate without silent retune |

Confidence levels in the master review (**HIGH / MODERATE / LOW / INSUFFICIENT**) are evidence-quality labels — **not** Assessment Confidence.

---

## 3. ER-BC decision rollup

| ER | Question (short) | Decision | Evidence confidence | Notes |
|----|------------------|----------|---------------------|-------|
| ER-BC-01 | DXA precision/repeatability | **PARTIALLY_SUFFICIENT** | HIGH methods / MODERATE magnitudes | Freeze ISCD-style design; Oli σ pending TB-02/03 |
| ER-BC-02 | WHO waist repeatability | **PARTIALLY_SUFFICIENT** | HIGH protocol / LOW–INSUFFICIENT σ | Freeze WHO midpoint controls; σ pending TB-01 |
| ER-BC-03 | FMI/ALMI health associations | **PARTIALLY_SUFFICIENT** | MODERATE | Candidate externals only; endpoints not frozen |
| ER-BC-04 | FFMI/performance associations | **PARTIALLY_SUFFICIENT** | MODERATE | Grip/function candidates; no sport prediction |
| ER-BC-05 | Vendor comparability | **PARTIALLY_SUFFICIENT** | HIGH non-interchangeability | Design freeze: BA + non-pooling default; local LoA pending |
| ER-BC-06 | Height-propagated index precision | **PARTIALLY_SUFFICIENT** | HIGH methods / INSUFFICIENT Σ | Shared Height rule confirmed; Σ_error via TB-05 |
| ER-BC-07 | Clinically meaningful BC change | **INSUFFICIENT** | INSUFFICIENT | No CMC freeze; triad B deferred |
| ER-BC-08 | Sarcopenia vs H3 | **SUFFICIENT_FOR_PROTOCOL_FREEZE** | HIGH mapping | Construct map only; no diagnosis claims |
| ER-BC-09 | Longer-term cardiometabolic | **PARTIALLY_SUFFICIENT** | MODERATE | Association OK; prediction forbidden |
| ER-BC-10 | Age fairness vs age-invariant score | **PARTIALLY_SUFFICIENT** + watch **SCIENTIFIC_REVIEW_REQUIRED** | MODERATE | Empirical TB-12; no age correction now |
| ER-BC-11 | Sex-specific reference limits | **PARTIALLY_SUFFICIENT** | HIGH diffs / LOW fairness proof | Empirical TB-13; knots ≠ fairness |
| ER-BC-12 | Ethnicity / intersectional bias | **PARTIALLY_SUFFICIENT** | LOW biologic universals | Legal gate; core intersections only by default |
| ER-BC-13 | SDC/MDC vs clinical vs perceived | **SUFFICIENT_FOR_PROTOCOL_FREEZE** | HIGH methods | Method freeze possible; numeric SDC pending TB-16 |
| ER-BC-14 | Prediction methodology controls | **SUFFICIENT_FOR_PROTOCOL_FREEZE** | HIGH | Claim-boundary checklist freeze |
| ER-BC-15 | Re-id + private governance | **PARTIALLY_SUFFICIENT** | MODERATE principles | Checklist ready; governance sign-off pending |
| ER-BC-16 | Acute-state DXA effects | **PARTIALLY_SUFFICIENT** | HIGH–LOW by factor | Controls A–D freezable; deltas pending TB-04 |
| ER-BC-17 | Measurement-error covariance | **INSUFFICIENT** | INSUFFICIENT magnitudes | TB-05 mandatory |
| ER-BC-18 | Numeracy / misinterpretation | **PARTIALLY_SUFFICIENT** | MODERATE | Probe classes freezable; rates pending TB-17 |

### Counts

| Decision | N |
|----------|--:|
| SUFFICIENT_FOR_PROTOCOL_FREEZE | **3** (08, 13 methods, 14) |
| PARTIALLY_SUFFICIENT | **13** |
| INSUFFICIENT | **2** (07, 17) |
| SCIENTIFIC_REVIEW_REQUIRED (standalone) | **0** (ER-BC-10 watch flag only) |
| PENDING | **0** |

---

## 4. Protocol-readiness summary

| Bucket | ERs |
|--------|-----|
| Sufficient for named protocol-design freeze | ER-BC-08 construct map; ER-BC-13 SEM/SDC methods; ER-BC-14 claim controls |
| Partial — drafting possible with deferred empirics | 01, 02, 03, 04, 05, 06, 09, 10, 11, 12, 15, 16, 18 |
| Insufficient — must wait on Tier B or later science | 07 (CMC), 17 (error Σ) |

**Protocol freeze overall:** **DRAFTING / WAITING ON DEPENDENCIES** (governance/legal + remaining partials + independent evidence re-gate).

---

## 5. Critical gaps owned by future Tier B empirics

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

## 6. SP track support (non-decisions)

| Track | Evidence register stance |
|-------|--------------------------|
| SP-01 (FFMI vs FFM / Resolver) | Evidence summary provided in master §14; **Resolver policy NOT decided** |
| SP-02 (presentation / uncertainty) | Evidence summary in master §15; **no UI**; thresholds not frozen |

---

## 7. Claim boundary (frozen)

| Claim | Status |
|-------|--------|
| Clinical / diagnostic validity | **NOT ESTABLISHED** |
| Predictive validity | **NOT ESTABLISHED** / forbidden as product claim now |
| Consumer integration | **NOT AUTHORIZED** |
| Public scores | **NO-GO** |

---

## 8. Roadmap

```text
Tier B methodology:     PASS
Evidence review:         CURRENT (package complete; independent scientific re-gate PENDING)
Governance/legal:        running separately
Protocol freeze:         DRAFTING / WAITING ON DEPENDENCIES
Execution:               NOT AUTHORIZED
```

---

## 9. Next gate

Open an **independent scientific evidence re-gate** against the evidence-review SHA.

Only after evidence re-gate **PASS** *and* governance/legal dependencies close may protocol parameters be truth-frozen.

**Do not execute Tier B.**
**Do not collect human data.**
**Do not change draft_v1.**

---

END OF TIER B EVIDENCE DECISION REGISTER V1
