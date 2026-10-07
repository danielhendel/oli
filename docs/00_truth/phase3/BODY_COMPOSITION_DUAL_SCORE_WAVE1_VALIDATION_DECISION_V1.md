# Body Composition Dual Score — Wave 1 Validation Decision V1

**Document type:** Wave 1 validation decision register
**Date:** 2026-10-07
**Branch:** `feat/body-composition-stage3e-body-scans-v1`
**Kind:** Records Wave 1 synthetic execution outcomes and independent acceptance. **Does not** authorize Tier B execution, consumer integration, clinical validity, or public scores.

| Identity | Value |
|----------|-------|
| Validation plan SHA | `4900f6e56f1eb83799513452cc4b5d2dcc20601d` |
| Approved implementation SHA | `d940b1616b341e98b19e82f2cd6a6242dfe41691` |
| Mathematical freeze SHA | `e258267d109d1d05e20270f205e5fdb29ae2aca6` |
| Implementation truth-freeze SHA | `3bed6aa6012690737bb5f7455a4397ca6a3bfe64` |
| Wave 1 execution SHA | `58a09254b1e25c34ada92598fb8cb0ecf1085fff` |
| Final corrected docs SHA | `f18c524555f6f5e79a384e76335c9b60f46ca4ab` |
| Validation code SHA | `17e63164a55af7d1425196340831c7b9d3c06918` |
| Wave 1 report | `docs/10_product/specs/BODY_COMPOSITION_DUAL_SCORE_WAVE1_SYNTHETIC_VALIDATION_REPORT_V1.md` |
| Wave 1 truth freeze | `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_WAVE1_VALIDATION_TRUTH_FREEZE_V1.md` |

---

## 1. Gate status after Wave 1 acceptance

| Domain | Status |
|--------|--------|
| Wave 1 synthetic validation execution | **COMPLETE** |
| Wave 1 independent results re-gate | **PASS** |
| Synthetic robustness evidence | **ACCEPTED** |
| Wave 1 validation truth freeze | **CURRENT / PENDING INDEPENDENT DOCS RE-GATE** |
| Tier B validation planning | **AUTHORIZED** |
| Tier B execution | **NOT AUTHORIZED** |
| Clinical validation | **NOT ESTABLISHED** |
| Consumer integration | **NOT AUTHORIZED** |
| Public Health score | **NO-GO** |
| Public Performance-Supporting score | **NO-GO** |
| PR / production | **NOT OPENED / UNTOUCHED** |

**SYNTHETIC VALIDATION ONLY. CLINICAL VALIDATION NOT ESTABLISHED.**
**Accepted = independently verified synthetic robustness evidence — not clinical, consumer, predictive, or release readiness.**

---

## 2. Per-BCV decision table

| BCV | Executed | Structural result | Exploratory result | Blocker | Follow-up |
|-----|----------|-------------------|--------------------|---------|-----------|
| BCV-001 | Yes | PASS (continuity / surface IDs / NaN=0) | Raw H1 slope ≈300; H1 normalized ≈195 | None for Wave 1 | Preserve raw vs normalized distinction |
| BCV-002 | Yes | n/a (exploratory) | Noise Δ distributions; all MC converged | Evidence-dependent unresolved | ER-BC-02 magnitudes |
| BCV-006 | Yes | PASS (age invariance Δ=0) | n/a | None structural | Empirical age fairness later |
| BCV-007 | Yes | Documented transform contrasts (not assumed fair) | Sex surface differences | None structural | Empirical sex fairness later |
| BCV-012 | Yes | n/a | Max normalized ≈600 from female H3_FFMI @ x=14.3; H1 raw ≈300 / normalized ≈195 | None | Presentation steepness review |
| BCV-013 | Yes | PASS (knots + plateaus) | Tail occupancy notes | None | — |
| BCV-014 | Yes | n/a | Floor/ceiling occupancy | None | Compression risk if UI bands invented |
| BCV-015 | Yes | PASS 160/160 executable; 81 families | Patch-rate notes (Resolver emission gaps) | None structural | Resolver natural-status coverage (separate) |
| BCV-016 | Yes | PASS (15/15 oracle match) | Transition map | None | Empirical cadence later |
| BCV-017 | Yes | n/a | Relation 84/84 PASS | None | — |
| BCV-018 | Yes | n/a | Adverse-hide observed (H3-adverse; P-03/P-05) | None for Wave 1 | Explainability before any display |
| BCV-029 | Yes | Model A ≠ B@ρ=0 enforced | Covariance sensitivity | Evidence-dependent | ER-BC-17 |
| BCV-030 | Yes | n/a | Intervals, shares; reversal median ≈0.499 (estimator property) | Evidence-dependent | False-precision controls later |
| BCV-031 | Yes | PASS; hidden-path HARD FAIL=false | n/a | None | Empirical intersectional later |
| BCV-032A | Yes | PASS (triad non-equivalence; SDC/MDC formulas only) | Candidate SDC numbers from synthetic noise | Clinical/user unresolved | BCV-032B blocked |
| BCV-034 | Yes | n/a | False-improvement Health 0.375 / Perf 0.65 | Evidence-dependent | ER-BC-16 |

---

## 3. Structural rollup

| Metric | Value |
|--------|-------|
| Structural PASS | **7** invariant-bearing protocols with zero structural failures |
| Structural FAIL | **0** |
| Failures | none |

---

## 4. Monte Carlo rollup

| Metric | Value |
|--------|-------|
| MC score-stream runs | 2304 |
| Converged | 2304 |
| Hard-max nonconverged | 0 |
| Draws | 120000 … 490000 |

---

## 5. Explicit non-authorizations

This register **does not**:

- authorize Tier B **execution** (planning is authorized; execution is not)
- establish clinical validation
- authorize consumer integration or score UI
- authorize public Health or Performance-Supporting scores
- advance claim level beyond Level 0


---

## 6. Next gate

```text
WAVE 1 SYNTHETIC EXECUTION COMPLETE
        ↓
independent validation-RESULTS re-gate PASS
        ↓
Wave 1 validation truth freeze (CURRENT)
        ↓
independent truth-freeze DOCS re-gate
        ↓
Tier B empirical-validation PLANNING (authorized after docs re-gate)
        ↓
future explicit gate required for Tier B EXECUTION
```

**Public Health / Public Performance-Supporting remain NO-GO.**

---

END OF WAVE 1 VALIDATION DECISION V1
