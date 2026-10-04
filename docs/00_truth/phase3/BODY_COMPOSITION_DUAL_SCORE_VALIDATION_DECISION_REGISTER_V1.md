# Body Composition Dual Score — Validation Decision Register V1

**Document type:** Validation decision register (docs only)
**Date:** 2026-10-04
**Branch:** `feat/body-composition-stage3e-body-scans-v1`
**Kind:** Documentation only. Records validation-gate state. **Does not** authorize consumer release, change score math, or start validation execution.

| Identity | Value |
|----------|-------|
| Implementation truth-freeze SHA | `3bed6aa6012690737bb5f7455a4397ca6a3bfe64` |
| Approved runtime implementation SHA | `d940b1616b341e98b19e82f2cd6a6242dfe41691` |
| Mathematical truth-freeze SHA | `e258267d109d1d05e20270f205e5fdb29ae2aca6` |
| Validation plan | `docs/10_product/specs/BODY_COMPOSITION_DUAL_SCORE_PRIVATE_VALIDATION_PLAN_V1.md` |
| Health version | `body_composition_health_score_draft_v1` |
| Performance-Supporting version | `body_composition_performance_supporting_score_draft_v1` |

---

## 1. Initial validation-state register

| Domain | Status |
|--------|--------|
| Scientific foundation | **PASS** |
| Mathematical implementation | **PASS** |
| Internal engine (Health) | **PASS** |
| Internal engine (Performance-Supporting) | **PASS** |
| Implementation truth freeze | **PASS** @ `3bed6aa…` |
| Independent docs re-gate | **PASS** |
| Private validation plan | **CREATED** · **READY FOR INDEPENDENT REVIEW** |
| Validation execution | **NOT STARTED** |
| Clinical validation | **NOT ESTABLISHED** |
| Consumer validity | **NOT ESTABLISHED** |
| Public Health score | **NO-GO** |
| Public Performance-Supporting score | **NO-GO** |
| Consumer integration | **NOT AUTHORIZED** |
| PR / production | **NOT OPENED / UNTOUCHED** |

---

## 2. Claim level

| Item | Value |
|------|-------|
| Current claim level | **Level 0 — internal experimental index** |
| Next possible level (not authorized) | Level 1 — descriptive wellness index |
| Clinical / diagnostic (Level 4) | **Not authorized; not draft_v1 intent** |

Advancement requires evidence per the private validation plan and a separate scientific release review. This register does **not** advance the claim level.

---

## 3. What mathematical PASS does and does not mean

| Established | Not established |
|-------------|-----------------|
| Formulas match mathematical freeze | Clinical meaningfulness |
| Engines fail closed per precedence | Longitudinal stability |
| Implementation Exact-Math Re-Gate V2 PASS | Measurement-error robustness in vivo |
| Pure / unwired / non-persistent | Fairness across populations |
| | Consumer interpretability |
| | Suitability for health claims |
| | Public release readiness |

---

## 4. Validation execution authorization

| Wave | Authorization |
|------|---------------|
| Synthetic validation execution | **NOT AUTHORIZED** until independent validation-methodology review PASS + separate execution authorization |
| Real-user / de-identified validation | **NOT AUTHORIZED** (privacy/legal prerequisites unmet in this register) |
| Consumer pilot | **NOT AUTHORIZED** |
| Public scores | **NO-GO** |

---

## 5. Open future scientific-review questions (placeholder)

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

## 6. Hard blockers (active)

All hard public-release blockers in the private validation plan remain **ACTIVE**. Any one is sufficient to maintain **NO-GO**.

---

## 7. Next gate

```text
PRIVATE VALIDATION PLAN (this phase)
        ↓
independent validation-methodology review
        ↓
(only if PASS) synthetic validation execution authorization
        ↓
empirical / de-identified validation (privacy-gated)
        ↓
scientific release review
        ↓
only then possible consumer integration decision
```

**Public Health / Public Performance-Supporting remain NO-GO until a later explicit authorization.**

---

END OF VALIDATION DECISION REGISTER V1
