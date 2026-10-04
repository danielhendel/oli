# Body Composition Dual Score — Validation Decision Register V1

**Document type:** Validation decision register (docs only)
**Date:** 2026-10-04
**Branch:** `feat/body-composition-stage3e-body-scans-v1`
**Kind:** Documentation only. Records validation-gate state. **Does not** authorize consumer release, change score math, or start validation execution.
**Wave 1 computational determinism closure:** closes six residual computational ambiguities against SHA `30862d78eb228999672d03d26a0140515237a9a1`.

| Identity | Value |
|----------|-------|
| Implementation truth-freeze SHA | `3bed6aa6012690737bb5f7455a4397ca6a3bfe64` |
| Approved runtime implementation SHA | `d940b1616b341e98b19e82f2cd6a6242dfe41691` |
| Mathematical truth-freeze SHA | `e258267d109d1d05e20270f205e5fdb29ae2aca6` |
| Prior final protocol-closure SHA | `30862d78eb228999672d03d26a0140515237a9a1` |
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
| Validation plan methodology | **COMPLETE / PENDING FINAL INDEPENDENT AUTHORIZATION RE-GATE** |
| Wave 1 computational determinism (docs) | **CLOSED** (pending independent confirmation) |
| Wave 1 synthetic validation | **NOT AUTHORIZED** |
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

---

## 3. Computational residuals closed in this pass

| Residual | Freeze |
|----------|--------|
| uint32 → (0,1) + polar mapping | `u=(x+0.5)/4294967296`; `p=2u−1`; Marsaglia cache order |
| Model A path | Independent FM/FFM/ALM; **≠** Model B@ρ=0 |
| Batch SD + quantiles | divisor 19; Hyndman–Fan Type 7; adjacent checkpoint deltas |
| BCV-001 H3 2D coverage | H1×H3-ALMI, H1×H3-FFMI, H2×H3-ALMI, H2×H3-FFMI + surface IDs |
| Manifest schema | required keys/enums/MC/cov/provenance objects |
| BCV-029 catalog ≡ §23 | Model A independent; Model B FM↔FFM + FFM↔ALM only |

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
| Wave 1 synthetic | **NOT AUTHORIZED** — requires **FINAL RE-GATE PASS** + explicit **WAVE 1 SYNTHETIC VALIDATION EXECUTION: AUTHORIZED** |
| Tier B | **NOT AUTHORIZED** |
| Consumer pilot | **NOT AUTHORIZED** |
| Public scores | **NO-GO** |

This register does **not** self-authorize Wave 1.

---

## 6. Next gate

```text
WAVE 1 COMPUTATIONAL DETERMINISM CLOSURE (this phase)
        ↓
final independent authorization re-gate (narrow)
        ↓
FINAL RE-GATE PASS
        ↓
WAVE 1 SYNTHETIC VALIDATION EXECUTION: AUTHORIZED
        ↓
only then may the execution agent open
```

**Public Health / Public Performance-Supporting remain NO-GO.**

---

END OF VALIDATION DECISION REGISTER V1
