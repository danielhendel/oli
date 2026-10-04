# Body Composition Dual Score — Validation Decision Register V1

**Document type:** Validation decision register (docs only)
**Date:** 2026-10-04
**Branch:** `feat/body-composition-stage3e-body-scans-v1`
**Kind:** Documentation only. Records validation-gate state. **Does not** authorize consumer release, change score math, or start validation execution.
**Wave 1 final protocol closure:** closes residual protocol ambiguities against SHA `a59299ff430e3dca583e39133e6dbe0a2951bd3e`.

| Identity | Value |
|----------|-------|
| Implementation truth-freeze SHA | `3bed6aa6012690737bb5f7455a4397ca6a3bfe64` |
| Approved runtime implementation SHA | `d940b1616b341e98b19e82f2cd6a6242dfe41691` |
| Mathematical truth-freeze SHA | `e258267d109d1d05e20270f205e5fdb29ae2aca6` |
| Prior Wave 1 zero-ambiguity SHA | `a59299ff430e3dca583e39133e6dbe0a2951bd3e` |
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
| Validation plan methodology | **COMPLETE / PENDING INDEPENDENT RE-GATE** |
| Wave 1 protocol zero-ambiguity (docs) | **CLOSED** (pending independent confirmation) |
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

## 3. Final protocol-closure targets

| Residual ambiguity | Status in plan |
|--------------------|----------------|
| BCV-029 Model B pairs / rho / draws | **Frozen** (FM↔FFM, FFM↔ALM; common ρ; Marsaglia construction) |
| Monte Carlo quantile SE / tolerances | **Frozen** (20-batch SE; two consecutive checkpoints) |
| PRNG stream codes / Gaussian / draw order | **Frozen** |
| BCV-001 geometry / held-fixed companions | **Frozen** (1D + specified 2D; no 3D cube) |
| BCV-012 centers / normalization / signs | **Frozen** |
| BCV-007/031 anchors / label sets | **Frozen** (`group_a/b/c` etc.) |
| BCV-034 scenario→delta / Waist | **Frozen** (no optional Waist) |
| BCV-013 plateaus / BCV-018 companions | **Frozen** |

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
| Wave 1 synthetic | **NOT AUTHORIZED** — requires independent re-gate **PASS** + explicit **WAVE 1 AUTHORIZED** |
| Tier B | **NOT AUTHORIZED** |
| Consumer pilot | **NOT AUTHORIZED** |
| Public scores | **NO-GO** |

---

## 6. Next gate

```text
WAVE 1 FINAL PROTOCOL CLOSURE (this phase)
        ↓
independent validation-methodology re-gate (narrow)
        ↓
(only if PASS) explicit WAVE 1 AUTHORIZED
        ↓
Wave 1 synthetic execution under frozen contract
```

**Public Health / Public Performance-Supporting remain NO-GO.**

---

END OF VALIDATION DECISION REGISTER V1
