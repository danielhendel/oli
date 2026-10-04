# Body Composition Dual Score — Validation Decision Register V1

**Document type:** Validation decision register (docs only)
**Date:** 2026-10-04
**Branch:** `feat/body-composition-stage3e-body-scans-v1`
**Kind:** Documentation only. Records validation-gate state. **Does not** authorize consumer release, change score math, or start validation execution.
**Wave 1 zero-ambiguity correction:** closes methodology re-gate V2 residual Blocker 7 ambiguities against SHA `c9962e24f6632565da261feb55a706d63fa1ac06`.

| Identity | Value |
|----------|-------|
| Implementation truth-freeze SHA | `3bed6aa6012690737bb5f7455a4397ca6a3bfe64` |
| Approved runtime implementation SHA | `d940b1616b341e98b19e82f2cd6a6242dfe41691` |
| Mathematical truth-freeze SHA | `e258267d109d1d05e20270f205e5fdb29ae2aca6` |
| Prior methodology correction SHA | `c9962e24f6632565da261feb55a706d63fa1ac06` |
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
| Validation plan methodology correction (at `c9962e24…`) | **FAIL** on residual Wave 1 zero-ambiguity (Blocker 7) — historical |
| Validation plan methodology (this correction) | **COMPLETE / PENDING INDEPENDENT RE-GATE** |
| Wave 1 synthetic validation | **NOT AUTHORIZED** (pending independent re-gate + explicit WAVE 1 AUTHORIZED) |
| Wave 1 execution | **NOT STARTED** |
| Tier B de-identified / real-user validation | **NOT AUTHORIZED** |
| Validation execution | **NOT STARTED** |
| Clinical validation | **NOT ESTABLISHED** |
| Consumer validity | **NOT ESTABLISHED** |
| Public Health score | **NO-GO** |
| Public Performance-Supporting score | **NO-GO** |
| Consumer integration | **NOT AUTHORIZED** |
| PR / production | **NOT OPENED / UNTOUCHED** |

---

## 2. Experiment catalog count (authoritative)

| Count model | Value |
|-------------|-------|
| Parent BCVs | **34** (BCV-001 … BCV-034) |
| Executable subprotocols | **2** (BCV-032A, BCV-032B) |
| Wave 1 executable protocols | **16** (includes BCV-032A; excludes BCV-032B) |

Do **not** state “33 BCVs”. Do **not** count 032A/032B as additional parent BCVs.

---

## 3. Methodology FAIL → correction map

| Blocker | Topic | Status after this correction |
|---------|-------|------------------------------|
| 1 | Correlated measurement error | Conceptually closed; Wave 1 Model A+B + ρ grid frozen |
| 2 | Uncertainty propagation | Conceptually closed; intervals/quantiles/threshold grid frozen |
| 3 | Intersectional fairness | Conceptually closed; structural procedure frozen |
| 4 | Change triad | Conceptually closed; **BCV-032A P0 Wave 1** / **BCV-032B P1 later** |
| 5 | Outcome claim controls | Conceptually closed |
| 6 | Misinterpretation battery | Conceptually closed (P1; not Wave 1) |
| 7 | Experiment catalog / Wave 1 zero-ambiguity | **Target of this correction** — execution contracts frozen |
| 8 | De-identification / Tier B limits | Conceptually closed; Tier B still NOT AUTHORIZED |
| 9 | Acute-state lean confounds | Conceptually closed; BCV-034 scenario matrix frozen |
| 10 | Circularity hardening | Conceptually closed |

---

## 4. Claim level

| Item | Value |
|------|-------|
| Current claim level | **Level 0 — internal experimental index** |
| Next possible level | Level 1 — descriptive wellness index (**not authorized**) |
| Synthetic validation alone | **Cannot** advance to Level 1 |
| Clinical / diagnostic (Level 4) | **Not authorized; not draft_v1 intent** |

---

## 5. Validation execution authorization

| Wave | Authorization |
|------|---------------|
| Wave 1 synthetic | **NOT AUTHORIZED** — requires independent methodology re-gate **PASS** + explicit **WAVE 1 AUTHORIZED** |
| Tier B de-identified / real-user | **NOT AUTHORIZED** |
| Consumer pilot | **NOT AUTHORIZED** |
| Public scores | **NO-GO** |

---

## 6. Hard blockers (active)

All hard public-release blockers in the private validation plan remain **ACTIVE**. Any one is sufficient to maintain **NO-GO**.

---

## 7. Next gate

```text
WAVE 1 ZERO-AMBIGUITY CORRECTION (this phase)
        ↓
independent validation-methodology re-gate
        ↓
(only if PASS) explicit WAVE 1 AUTHORIZED
        ↓
Wave 1 synthetic execution under frozen contract
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
