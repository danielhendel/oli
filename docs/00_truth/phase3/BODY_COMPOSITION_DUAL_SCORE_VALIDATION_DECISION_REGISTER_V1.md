# Body Composition Dual Score — Validation Decision Register V1

**Document type:** Validation decision register (docs only)
**Date:** 2026-10-04
**Branch:** `feat/body-composition-stage3e-body-scans-v1`
**Kind:** Documentation only. Records validation-gate state. **Does not** authorize consumer release, change score math, or start validation execution.
**BCV-015 fixture-semantics closure:** closes three residual BCV-015 executor choices against SHA `cce4e201e8465283de391d37c700c880ff86a099`.

| Identity | Value |
|----------|-------|
| Implementation truth-freeze SHA | `3bed6aa6012690737bb5f7455a4397ca6a3bfe64` |
| Approved runtime implementation SHA | `d940b1616b341e98b19e82f2cd6a6242dfe41691` |
| Mathematical truth-freeze SHA | `e258267d109d1d05e20270f205e5fdb29ae2aca6` |
| Prior execution-semantics closure SHA | `cce4e201e8465283de391d37c700c880ff86a099` |
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
| Validation plan | **COMPLETE** @ `4900f6e…` |
| Wave 1 execution semantics (non-BCV-015) | **CLOSED** |
| BCV-015 fixture semantics (docs) | **CLOSED** · FINAL BCV-015 RE-GATE **PASS** |
| Wave 1 synthetic validation | **COMPLETE / PENDING INDEPENDENT VALIDATION RE-GATE** |
| Wave 1 execution | **COMPLETE** (artifacts under `validation/body-composition/dual-score/wave1/`; report `docs/10_product/specs/BODY_COMPOSITION_DUAL_SCORE_WAVE1_SYNTHETIC_VALIDATION_REPORT_V1.md`; decision `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_WAVE1_VALIDATION_DECISION_V1.md`) |
| Tier B de-identified / real-user validation | **NOT AUTHORIZED** |
| Validation execution | **Wave 1 COMPLETE / PENDING INDEPENDENT VALIDATION RE-GATE** |
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

---

## 3. BCV-015 residuals closed in this pass

| Residual | Freeze |
|----------|--------|
| H1 `multiple_valid` | Distinct `H1_MULTIPLE_VALID_NO_GOVERNED_WHTR` vs `H1_MULTIPLE_VALID_GOVERNED_WHTR` (§10.2 exception) |
| Demographics | Exact `MISSING_SEX` / `MISSING_HEIGHT` / `MISSING_DOB` — soft `MISSING_REQUIRED_DEMOGRAPHIC` non-executable |
| Conflict | Same-channel value disagreement; `conflictDelta = max(EPS_SURF, 0.10*|baseline|)` |
| Matrix | Complete §23.17.4.8 executable fixture table; `not_applicable` explicit |

---

## 4. Claim level

| Item | Value |
|------|-------|
| Current claim level | **Level 0 — internal experimental index** |
| Synthetic alone | **Cannot** advance to Level 1 |
| Clinical / diagnostic | **Not authorized** |

---

## 5. Validation execution authorization

| Wave | Authorization |
|------|---------------|
| Wave 1 synthetic | **EXECUTED** — FINAL BCV-015 RE-GATE **PASS** + WAVE 1 AUTHORIZED + execution **COMPLETE / PENDING INDEPENDENT VALIDATION RE-GATE** |
| Tier B | **NOT AUTHORIZED** |
| Consumer pilot | **NOT AUTHORIZED** |
| Public scores | **NO-GO** |

This register does **not** authorize Tier B, consumer integration, or public scores.

---

## 6. Next gate

```text
WAVE 1 SYNTHETIC VALIDATION EXECUTION COMPLETE
        ↓
independent validation-RESULTS reviewer (new)
        ↓
PASS / FAIL / BLOCKED
        ↓
only an explicit later authorization may open Tier B
```

**Public Health / Public Performance-Supporting remain NO-GO.**

---

END OF VALIDATION DECISION REGISTER V1
