# Body Composition Dual Score — Wave 1 Synthetic Validation Truth Freeze V1

**Document type:** Docs-only Wave 1 validation-state truth freeze
**Date:** 2026-10-07
**Branch:** `feat/body-composition-stage3e-body-scans-v1`
**Kind:** Documentation only. **Does not** change validation harness, artifacts, score engine, Resolver, Confidence, Bridge, UI, API, persistence, formulas, weights, knots, or product behavior.

| Identity | Value |
|----------|-------|
| Wave 1 execution SHA | `58a09254b1e25c34ada92598fb8cb0ecf1085fff` |
| Final corrected docs SHA | `f18c524555f6f5e79a384e76335c9b60f46ca4ab` |
| Validation-plan SHA | `4900f6e56f1eb83799513452cc4b5d2dcc20601d` |
| Approved score implementation SHA | `d940b1616b341e98b19e82f2cd6a6242dfe41691` |
| Mathematical Truth Freeze SHA | `e258267d109d1d05e20270f205e5fdb29ae2aca6` |
| Implementation Truth Freeze SHA | `3bed6aa6012690737bb5f7455a4397ca6a3bfe64` |
| Independent Final Narrow Results Re-Gate | **PASS** |
| Wave 1 Synthetic Robustness Evidence | **ACCEPTED** |
| Wave 1 truth freeze | **THIS DOCUMENT** · **CURRENT / PENDING INDEPENDENT DOCS RE-GATE** |
| Tier B validation planning | **AUTHORIZED** |
| Tier B execution | **NOT AUTHORIZED** |
| Clinical validation | **NOT ESTABLISHED** |
| Consumer integration | **NOT AUTHORIZED** |
| Public Health | **NO-GO** |
| Public Performance-Supporting | **NO-GO** |
| PR / production | **NOT OPENED / UNTOUCHED** |

> **Rule:** This freeze records the independently accepted Wave 1 synthetic-validation phase. It does **not** supersede the Mathematical Truth Freeze, Engine Implementation Truth Freeze, or Validation Plan. Any later change to accepted Wave 1 results, harness, artifacts, or score math **invalidates** this freeze for downstream authorization until a new independent re-gate.

---

## 0. Authority relationship

| Authority | Controls |
|-----------|----------|
| Mathematical Truth Freeze (`BODY_COMPOSITION_DUAL_SCORE_MATHEMATICAL_TRUTH_FREEZE_V1.md` @ `e258267d…`) | Formulas, knots, weights, eligibility, recency, age, reasons, precedence |
| Engine Implementation Truth Freeze (`BODY_COMPOSITION_DUAL_SCORE_ENGINE_IMPLEMENTATION_TRUTH_FREEZE_V1.md` @ `3bed6aa…`) | Which runtime implementation matches the mathematical freeze |
| Validation Plan (`BODY_COMPOSITION_DUAL_SCORE_PRIVATE_VALIDATION_PLAN_V1.md` @ `4900f6e…`) | Authorized Wave 1 protocols and acceptance semantics |
| **This Wave 1 Validation Truth Freeze** | What was executed, independently accepted, learned, unresolved, and authorized next |

Companion execution report: `docs/10_product/specs/BODY_COMPOSITION_DUAL_SCORE_WAVE1_SYNTHETIC_VALIDATION_REPORT_V1.md`
Companion decision register: `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_WAVE1_VALIDATION_DECISION_V1.md`

---

## 1. What “ACCEPTED” means

**Accepted means:**

the frozen score implementation has passed the approved synthetic validation protocols and the resulting synthetic robustness evidence has been independently verified.

**Accepted does NOT mean:**

- clinically validated
- biologically validated
- predictive
- consumer validated
- broadly generalizable
- release ready

Preserve this distinction explicitly. Wave 1 establishes **synthetic/internal robustness evidence only**.

---

## 2. Independent review result (frozen)

| Gate | Result |
|------|--------|
| Final Narrow Results Re-Gate | **PASS** |
| BCV-001 metric label (raw vs normalized) | **PASS** |
| BCV-012 attribution (H3_FFMI vs H1) | **PASS** |
| Wave 1 Synthetic Validation Results Re-Gate | **PASS** |
| Synthetic Robustness Evidence | **ACCEPTED** |

Docs corrections after execution SHA `58a09254…` (BCV-012 attribution, BCV-001 slope labeling) landed at final corrected docs SHA `f18c5245…` and did **not** change harness, artifacts, MC results, or score engine.

---

## 3. Protocol execution (frozen)

| Metric | Value |
|--------|------:|
| Authorized protocols | **16** |
| Executed | **16** |
| Missing | **0** |

Protocols:

`BCV-001`, `BCV-002`, `BCV-006`, `BCV-007`, `BCV-012`, `BCV-013`, `BCV-014`, `BCV-015`, `BCV-016`, `BCV-017`, `BCV-018`, `BCV-029`, `BCV-030`, `BCV-031`, `BCV-032A`, `BCV-034`.

No other BCVs executed. BCV-032B not executed.

---

## 4. Engine integrity (frozen)

| Component | Status |
|-----------|--------|
| Score engine | **Unchanged** vs approved implementation `d940b161…` |
| Resolver | **Unchanged** |
| Confidence | **Unchanged** |
| Evidence Bridge | **Unchanged** |
| UI / API / persistence / native | **No changes** |
| Validation isolation | Under `validation/body-composition/dual-score/wave1/` only |

---

## 5. Determinism (independently verified)

| Mechanism | Freeze |
|-----------|--------|
| PRNG | mulberry32 |
| Gaussian | Marsaglia polar |
| Quantiles | Hyndman–Fan Type 7 |
| Batch SE | 20 batches / divisor 19 / SE = sd / √20 |
| Monte Carlo stopping | frozen plan exact |
| Representative reproduction | exact machine-readable matches |

---

## 6. Monte Carlo evidence (frozen)

| Metric | Value |
|--------|------:|
| Configurations | **1152** |
| Score streams | **2304** |
| Converged | **2304 / 2304** |
| Hard max (nonconverged) | **0** |
| Draw range | **120000 … 490000** |

This is **computational convergence only**. It does **not** establish empirical validity.

---

## 7. Artifact evidence (frozen)

| Artifact | Count |
|----------|------:|
| Execution roots | **1166** |
| `manifest.json` | **1166** |
| `results.json` | **1166** |
| `summary.md` | **1166** |
| `results.csv` | **8** |
| SVG plots | **12** |

No partial/duplicate roots. No raw MC dump bloat.

---

## 8. Privacy (frozen)

| Check | Result |
|-------|--------|
| PHI | **None** |
| Production data | **None** |
| Real-user data | **None** |
| Real PDFs | **None** |
| Production identifiers | **None** |

Wave 1 was **synthetic only**.

---

## 9. Structural results (frozen)

Seven **invariant-bearing** protocols (do **not** imply all 16 were structural pass/fail protocols):

`BCV-001`, `BCV-006`, `BCV-013`, `BCV-015`, `BCV-016`, `BCV-031`, `BCV-032A`.

| Metric | Value |
|--------|------:|
| Structural PASS | **7** |
| Structural FAIL | **0** |

---

## 10. Per-protocol freeze

### 10.1 BCV-001 — Mathematical surface stress

| Item | Value |
|------|-------|
| Continuity | **PASS** |
| NaN/OOR | **0** |
| 2D surface IDs | six required present |
| H1 max raw absolute local slope | **≈300** |
| H1 max normalized sensitivity | **≈195** |

Raw local slope and normalized sensitivity (`|localSlope| × DOMAIN_RANGE`; H1 DOMAIN_RANGE = 0.65 → 300 × 0.65 ≈ 195) remain **distinct**. Do not call ≈300 normalized sensitivity.

### 10.2 BCV-002 — Measurement perturbation

| Item | Value |
|------|------:|
| Configurations | **384** |
| Score streams | **768** |
| Converged | **768 / 768** |

Findings: exploratory measurement-noise behavior only. **Empirical noise magnitude unresolved.**

### 10.3 BCV-006 — Structural age fairness

| Item | Value |
|------|-------|
| Ages | 20 / 40 / 60 / 80 |
| max \|Δ\| | **0** |

Meaning: frozen model is age-invariant after adult gate. **Not** proof of clinical fairness or appropriateness.

### 10.4 BCV-007 — Structural sex fairness

Sex transform contrasts: **documented**.
Fairness: **NOT established**.
Empirical fairness validation: **unresolved**.

### 10.5 BCV-012 — Sensitivity map

| Item | Value |
|------|-------|
| Maximum **normalized** sensitivity | **≈600** |
| Source | `H3_FFMI` |
| Sex | female |
| x | 14.3 |
| Local slope | ≈66.67 |
| Domain range | 9 |
| H1 max normalized | ≈195 |
| H1 raw local slope | ≈300 |

Synthetic sensitivity analysis only — not clinical instability, disease risk, consumer severity, or a release blocker.

### 10.6 BCV-013 — Knot / plateau

| Item | Value |
|------|------:|
| Knots | **48** |
| Plateaus | **6** |
| Continuity / plateau | **PASS** |

### 10.7 BCV-014 — Floor / ceiling

Floor/ceiling occupancy: **exploratory**.
Analytical bins: **not** product bands.

### 10.8 BCV-015 — Missingness + Resolver status

| Item | Value |
|------|------:|
| Fixture families | **81** |
| Resolver-status families | **49** |
| Missingness families | **32** |
| Executed | **160** |
| N/A | **2** |
| PASS | **160** |
| FAIL | **0** |

Fixture-construction patches were validation-harness adaptations defined **before** execution. **No** score-engine change. **No** post-result tuning. **No** protocol reinterpretation.

### 10.9 BCV-016 — Temporal coherence

S-01 … S-15: **15/15 structural PASS**.
Temporal eligibility/reasons: exact vs oracle.

### 10.10 BCV-017 — Personas + relation rubric

Persona relation checks: **84**.
PASS: **84/84**.

### 10.11 BCV-018 — Contribution / adverse-hide

Adverse-construct hiding: **observed in synthetic cases** (Health H3-adverse companions; personas P-03 / P-05 Health).
Treat as a **presentation/explainability concern for future study**. Do **not** invent a clinical threshold.

### 10.12 BCV-029 — Joint correlated error

| Item | Value |
|------|-------|
| Configurations | **384** |
| Model A | independent DXA error construction |
| Model B | frozen ρ grid / correlation construction |
| Correlation behavior | construction verified |
| Empirical covariance | **unresolved** |

### 10.13 BCV-030 — Aggregate uncertainty

| Item | Value |
|------|-------|
| Configurations | **384** |
| Type-7 intervals | generated |
| Signed uncertainty shares | generated |
| Variance decomposition | verified |
| Reversal median | **≈0.499** |

**IMPORTANT:** reversal ≈0.5 is expected under the frozen two-independent-noise-replicate estimator and is primarily a property of that estimator under symmetric noise. Do **NOT** characterize it as catastrophic score instability.

### 10.14 BCV-031 — Intersectional structural fairness

| Item | Value |
|------|-------|
| `hiddenPathDependenceDetected` | **false** |
| `hardFail` | **false** |
| Structural result | **PASS** |

Meaning: no hidden-path structural dependence detected.

### 10.15 BCV-032A — Change-triad methodology

| Item | Value |
|------|-------|
| `SEM_diff` | present |
| `SDC95` | present |
| `MDC95` | alias |
| Clinical meaningful change | **unresolved / no formula** |
| User-perceived meaningful change | **unresolved / no formula** |

### 10.16 BCV-034 — Acute-state sensitivity

| Stream | False-improvement rate |
|--------|------------------------|
| Health | **0.375 = 15/40** |
| Performance | **0.65 = 26/40** |

BASE excluded. Meaning: frozen synthetic acute-state perturbations can increase scores without representing durable biological improvement. This is **NOT** a real-world false-positive rate.

---

## 11. Exploratory / unresolved findings (frozen)

Major unresolved findings (scientific questions, **not** implementation failures):

- H1 steep raw slope around knots
- `H3_FFMI` highest normalized sensitivity in Wave 1
- adverse-construct hiding can occur
- acute-state perturbations can increase score
- P1 natural `policy_not_frozen` when FFMI + FFM coexist
- empirical σ/ρ unresolved
- clinical meaningful change unresolved
- user-perceived meaningful change unresolved
- fairness unresolved
- DXA/vendor empirical validation unresolved

---

## 12. P1 `policy_not_frozen` finding (frozen)

Resolver can naturally return `policy_not_frozen` when FFMI + FFM coexist under the current evidence policy. Score engine correctly fails closed.

**Do not repair this in the truth freeze.** Mark as a future Resolver / scientific-policy question.

---

## 13. Claim boundary (frozen)

Wave 1 establishes:

- synthetic / internal robustness evidence

Wave 1 does **NOT** establish:

- clinical validity
- consumer validity
- predictive validity
- biological validity
- generalizability
- disease-risk prediction
- diagnostic utility
- release readiness

Claim level remains **Level 0**.

---

## 14. Tier B status (frozen)

| Gate | Status |
|------|--------|
| Tier B **VALIDATION PLANNING** | **AUTHORIZED** |
| Tier B **EXECUTION** | **NOT AUTHORIZED** |

Do not blur these.

### 14.1 Permitted Tier B planning topics (planning only)

- empirical measurement reliability
- repeated DXA
- repeated Waist
- empirical σ/ρ
- same-machine repeatability
- cross-machine / cross-vendor agreement
- longitudinal stability
- external construct association
- fairness / subgroups
- change detectability
- user comprehension
- privacy / governance / sample design

This is **planning authorization only**. Execution requires a later explicit gate.

---

## 15. Phase status (frozen)

| Capability | Status |
|------------|--------|
| Wave 1 execution | **COMPLETE** |
| Independent results re-gate | **PASS** |
| Synthetic robustness evidence | **ACCEPTED** |
| Wave 1 validation truth freeze | **CURRENT / PENDING INDEPENDENT DOCS RE-GATE** |
| Tier B planning | **AUTHORIZED** |
| Tier B execution | **NOT AUTHORIZED** |
| Clinical validation | **NOT ESTABLISHED** |
| Consumer integration | **NOT AUTHORIZED** |
| Public Health score | **NO-GO** |
| Public Performance-Supporting score | **NO-GO** |
| PR / merge / production | **NOT OPENED / UNTOUCHED** |

---

## 16. Required sequence after this freeze

```text
score science
  ↓
mathematical freeze
  ↓
implementation
  ↓
private validation planning
  ↓
Wave 1 synthetic validation
  ↓
independent Wave 1 results re-gate PASS
  ↓
Wave 1 validation truth freeze (THIS DOCUMENT)
  ↓
independent truth-freeze docs re-gate
  ↓
Tier B empirical-validation planning
  ↓
future Tier B authorization gate
```

**Only after independent docs re-gate PASS should Tier B empirical-validation planning begin as an authorized planning workstream.** Tier B execution remains blocked until a later explicit authorization.

---

## 17. Explicit non-authorizations

This freeze **does not**:

- authorize Tier B execution
- establish clinical validation
- authorize consumer integration or score UI
- authorize public Health or Performance-Supporting scores
- advance claim level beyond Level 0
- change accepted Wave 1 numerical results

---

END OF WAVE 1 VALIDATION TRUTH FREEZE V1
