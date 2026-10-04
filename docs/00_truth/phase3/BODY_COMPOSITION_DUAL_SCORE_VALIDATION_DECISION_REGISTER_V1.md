# Body Composition Dual Score — Validation Decision Register V1

**Document type:** Validation decision register (docs only)
**Date:** 2026-10-04
**Branch:** `feat/body-composition-stage3e-body-scans-v1`
**Kind:** Documentation only. Records validation-gate state. **Does not** authorize consumer release, change score math, or start validation execution.
**Wave 1 execution-semantics closure:** closes eight residual execution-semantic ambiguities against SHA `1201b57f20bbca0ebe2ec366632d0cde5423fdab`.

| Identity | Value |
|----------|-------|
| Implementation truth-freeze SHA | `3bed6aa6012690737bb5f7455a4397ca6a3bfe64` |
| Approved runtime implementation SHA | `d940b1616b341e98b19e82f2cd6a6242dfe41691` |
| Mathematical truth-freeze SHA | `e258267d109d1d05e20270f205e5fdb29ae2aca6` |
| Prior computational-determinism closure SHA | `1201b57f20bbca0ebe2ec366632d0cde5423fdab` |
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
| Validation plan | **COMPLETE / PENDING INDEPENDENT EXECUTION-SEMANTICS RE-GATE** |
| Wave 1 execution semantics (docs) | **CLOSED** (pending independent confirmation) |
| Wave 1 synthetic validation | **BLOCKED pending re-gate** |
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

## 3. Execution semantics closed in this pass

| Residual | Freeze |
|----------|--------|
| Contribution metrics | `absoluteContribution`, `marginalContributionPerConstructPoint`, `weightedDeficit`, `dominantAdverseConstruct`, `changeContribution` |
| Directional-reversal probability | two-replicate noise test; zero-delta ⇒ no reversal |
| Construct uncertainty share | covariance-aware `varianceContribution` / signed share |
| False-improvement predicate | scenario − BASE > `EPS_NUM`; unavailable ⇒ null |
| BCV-015 fixtures | P-01 / P-11 baselines; Resolver + missingness factories |
| BCV-001 2D axes | `canonicalAxisGrid` Cartesian product only |
| BCV-032A SDC/MDC | `SEM_diff`, `SDC95_individual`; `MDC95` alias; no clinical/user formulas |
| BCV-017 rubric | directional `higher`/`lower`/`equal`/`not_applicable` vs §23.5.4 |

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
| Wave 1 synthetic | **BLOCKED pending re-gate** — requires independent **execution-semantics** re-gate **PASS** + explicit **WAVE 1 SYNTHETIC VALIDATION EXECUTION: AUTHORIZED** |
| Tier B | **NOT AUTHORIZED** |
| Consumer pilot | **NOT AUTHORIZED** |
| Public scores | **NO-GO** |

This register does **not** self-authorize Wave 1.

---

## 6. Next gate

```text
WAVE 1 EXECUTION-SEMANTICS CLOSURE (this phase)
        ↓
independent execution-semantics re-gate (narrow)
        ↓
PASS
        ↓
WAVE 1 SYNTHETIC VALIDATION EXECUTION: AUTHORIZED
        ↓
only then may the execution agent reopen
```

**Public Health / Public Performance-Supporting remain NO-GO.**

---

END OF VALIDATION DECISION REGISTER V1
