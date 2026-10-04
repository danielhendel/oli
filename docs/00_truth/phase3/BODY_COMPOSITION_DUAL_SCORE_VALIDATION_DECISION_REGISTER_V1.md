# Body Composition Dual Score — Validation Decision Register V1

**Document type:** Validation decision register (docs only)
**Date:** 2026-10-04
**Branch:** `feat/body-composition-stage3e-body-scans-v1`
**Kind:** Documentation only. Records validation-gate state. **Does not** authorize consumer release, change score math, or start validation execution.
**Methodology correction:** closes independent methodology re-gate **FAIL** (10 blockers) against SHA `6f97bb6ec815981733fab0747a7b7491250670d5`.

| Identity | Value |
|----------|-------|
| Implementation truth-freeze SHA | `3bed6aa6012690737bb5f7455a4397ca6a3bfe64` |
| Approved runtime implementation SHA | `d940b1616b341e98b19e82f2cd6a6242dfe41691` |
| Mathematical truth-freeze SHA | `e258267d109d1d05e20270f205e5fdb29ae2aca6` |
| Prior plan SHA (methodology FAIL) | `6f97bb6ec815981733fab0747a7b7491250670d5` |
| Validation plan | `docs/10_product/specs/BODY_COMPOSITION_DUAL_SCORE_PRIVATE_VALIDATION_PLAN_V1.md` |
| Health version | `body_composition_health_score_draft_v1` |
| Performance-Supporting version | `body_composition_performance_supporting_score_draft_v1` |

---

## 1. Validation-state register

| Domain | Status |
|--------|--------|
| Scientific foundation | **PASS** |
| Mathematical implementation | **PASS** |
| Internal engine (Health) | **PASS** |
| Internal engine (Performance-Supporting) | **PASS** |
| Implementation truth freeze | **PASS** @ `3bed6aa…` |
| Independent docs re-gate | **PASS** |
| Validation plan methodology (at `6f97bb6e…`) | **FAIL** (10 blockers) — historical |
| Validation plan methodology (correction) | **CORRECTED / PENDING INDEPENDENT RE-GATE** |
| Wave 1 synthetic validation | **NOT AUTHORIZED** |
| Tier B de-identified / real-user validation | **NOT AUTHORIZED** |
| Validation execution | **NOT STARTED** |
| Clinical validation | **NOT ESTABLISHED** |
| Consumer validity | **NOT ESTABLISHED** |
| Public Health score | **NO-GO** |
| Public Performance-Supporting score | **NO-GO** |
| Consumer integration | **NOT AUTHORIZED** |
| PR / production | **NOT OPENED / UNTOUCHED** |

---

## 2. Methodology FAIL → correction map

| Blocker | Topic | Correction locus |
|---------|-------|------------------|
| 1 | Correlated measurement error | Plan §3 + BCV-029 + ER-BC-17 |
| 2 | Uncertainty propagation | Plan §11 + BCV-030 |
| 3 | Intersectional fairness | Plan §9.5 + BCV-031 |
| 4 | Change triad | Plan §11.3 + BCV-032 + ER-BC-13 |
| 5 | Outcome claim controls | Plan §12 + ER-BC-14 |
| 6 | Misinterpretation battery | Plan §10.3 + BCV-033 + ER-BC-18 |
| 7 | Experiment catalog completeness | Plan §22 — 33 BCVs with required fields |
| 8 | De-identification / Tier B limits | Plan §14 + ER-BC-15 |
| 9 | Acute-state lean confounds | Plan §15 + BCV-034 + ER-BC-16 |
| 10 | Circularity hardening | Plan §7–8 |

---

## 3. Claim level

| Item | Value |
|------|-------|
| Current claim level | **Level 0 — internal experimental index** |
| Next possible level | Level 1 — descriptive wellness index (**not authorized**) |
| Synthetic validation alone | **Cannot** advance to Level 1 |
| Clinical / diagnostic (Level 4) | **Not authorized; not draft_v1 intent** |

---

## 4. What mathematical PASS does and does not mean

| Established | Not established |
|-------------|-----------------|
| Formulas match mathematical freeze | Clinical meaningfulness |
| Engines fail closed per precedence | Longitudinal stability |
| Implementation Exact-Math Re-Gate V2 PASS | Joint measurement-error robustness in vivo |
| Pure / unwired / non-persistent | Fairness (single-factor or intersectional) |
| | Consumer interpretability / misconception resistance |
| | Suitability for health claims |
| | Public release readiness |

---

## 5. Validation execution authorization

| Wave | Authorization |
|------|---------------|
| Wave 1 synthetic | **NOT AUTHORIZED** — requires independent methodology re-gate **PASS** + separate execution authorization |
| Tier B de-identified / real-user | **NOT AUTHORIZED** — privacy/re-id governance incomplete |
| Consumer pilot | **NOT AUTHORIZED** |
| Public scores | **NO-GO** |

---

## 6. Open future scientific-review questions (placeholder)

No formula changes are authorized. Questions may be opened when validation evidence warrants:

| ID | Question | Trigger |
|----|----------|---------|
| FSR-BC-01 | Should 90d era / 180d age windows change? | Temporal coherence evidence |
| FSR-BC-02 | Is age invariance defensible? | Age fairness evidence |
| FSR-BC-03 | Do sex transforms require recalibration? | Sex fairness evidence |
| FSR-BC-04 | Is single-function cross-vendor DXA scoring defensible? | Cross-platform evidence |
| FSR-BC-05 | Should ethnicity enter a future model? | Ethnicity-omission bias evidence |
| FSR-BC-06 | Knot / weight recalibration? | Construct / known-groups / outcome evidence |

Empty until evidence is filed. Listing a question ≠ approving a change.

---

## 7. Hard blockers (active)

All hard public-release blockers in the private validation plan remain **ACTIVE**, including unexplained subgroup/intersectional bias, unstable repeatability, high uncertainty/noise, Δ below SDC presented as meaningful, vendor/site drift, acute-state instability, misleading interpretation, missingness/access bias, privacy/re-identification risk, regulatory/legal uncertainty, and unresolved false precision.

Any one is sufficient to maintain **NO-GO**.

---

## 8. Next gate

```text
VALIDATION PLAN METHODOLOGY CORRECTION (this phase)
        ↓
independent validation-methodology re-gate
        ↓
(only if PASS) Wave 1 synthetic execution authorization
        ↓
Tier B empirical / de-identified validation (privacy-gated)
        ↓
scientific release review
        ↓
only then possible consumer integration decision
```

**Public Health / Public Performance-Supporting remain NO-GO until a later explicit authorization.**

---

END OF VALIDATION DECISION REGISTER V1
