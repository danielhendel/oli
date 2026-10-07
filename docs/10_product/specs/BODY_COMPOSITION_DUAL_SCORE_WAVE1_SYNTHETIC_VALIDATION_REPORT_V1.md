# Body Composition Dual Score — Wave 1 Synthetic Validation Report V1

**Document type:** Wave 1 synthetic validation execution report  
**Date:** 2026-10-05  
**Branch:** `feat/body-composition-stage3e-body-scans-v1`  
**Kind:** Validation-only. Synthetic data only. **No PHI. No production data.**

| Identity | Value |
|----------|-------|
| Validation plan SHA | `4900f6e56f1eb83799513452cc4b5d2dcc20601d` |
| Approved implementation SHA | `d940b1616b341e98b19e82f2cd6a6242dfe41691` |
| Mathematical freeze SHA | `e258267d109d1d05e20270f205e5fdb29ae2aca6` |
| Implementation truth-freeze SHA | `3bed6aa6012690737bb5f7455a4397ca6a3bfe64` |
| Validation code SHA (harness+tests) | `17e63164a55af7d1425196340831c7b9d3c06918` |
| Artifact root | `validation/body-composition/dual-score/wave1/` |

---

## Status banner (non-negotiable)

**SYNTHETIC VALIDATION ONLY.**  
**CLINICAL VALIDATION NOT ESTABLISHED.**  
**Wave 1 execution: COMPLETE / PENDING INDEPENDENT VALIDATION RE-GATE.**  
**Tier B: NOT AUTHORIZED.**  
**Consumer integration: NOT AUTHORIZED.**  
**Public Health score: NO-GO.**  
**Public Performance-Supporting score: NO-GO.**

Synthetic findings alone **cannot** advance claim level beyond Level 0.

---

## 1. Scope executed

Exactly **16** authorized Wave 1 protocols:

`BCV-001`, `BCV-002`, `BCV-006`, `BCV-007`, `BCV-012`, `BCV-013`, `BCV-014`, `BCV-015`, `BCV-016`, `BCV-017`, `BCV-018`, `BCV-029`, `BCV-030`, `BCV-031`, `BCV-032A`, `BCV-034`.

No other BCVs executed. BCV-032B not executed.

---

## 2. Architecture / isolation

| Item | Result |
|------|--------|
| Validation root | `validation/body-composition/dual-score/wave1/` |
| Runtime app imports validation | **No** |
| Score engine files vs `d940b161…` | **No diff** |
| Resolver / Confidence / UI / API / Firebase / persistence | **Untouched** |
| PRNG | mulberry32 only; no `Math.random()` |
| Scoring for MC/surfaces | Approved pure transforms |
| Scoring for structural/fixture protocols | Full Resolver + engines (with documented P1 normalization / status patch recording where Resolver cannot emit the frozen fixture status naturally — see BCV-015 / IMPLEMENTATION_SPEC) |

---

## 3. Artifact inventory

| Artifact | Count |
|----------|------:|
| `manifest.json` | 1166 |
| `results.json` | 1166 |
| `summary.md` | 1166 |
| `results.csv` | 8 |
| plots (SVG) | 12 |
| Total artifact volume | ~36 MB (summaries only; no raw MC draw dumps) |

Every run includes required manifest identity pins (`implementationSha`, `mathematicalFreezeSha`, `validationPlanSha`, `validationCodeSha`) and `phiStatus = synthetic_no_phi`.

---

## 4. Monte Carlo (BCV-002 / 029 / 030)

| Metric | Value |
|--------|-------|
| Config runs | 384 × 3 = **1152** |
| Score streams (Health+Perf) | **2304** |
| Converged | **2304 / 2304** |
| Hard-max nonconverged | **0** |
| Draws used | min **120000**, max **490000** |
| median(\|Δ\|) across streams | min 0 · p50 ≈ 0.64 · max ≈ 3.44 |
| p95(\|Δ\|) across streams | min ≈ 0.43 · p50 ≈ 2.21 · max ≈ 8.97 |
| Directional-reversal probability | min ≈ 0.00036 · p50 ≈ 0.499 · max ≈ 0.503 |

Noise σ/ρ use frozen **synthetic_fallback** magnitudes (`exploratory_normalized_not_empirical`). Not empirical.

---

## 5. Per-protocol findings

### BCV-001 — Mathematical surface stress
- **Status:** executed  
- **Structural:** 1D knot neighborhoods continuous at `EPS_NUM` (discontinuity ≤ 1e-6); NaN/OOR = 0; six required 2D Surface IDs present via `canonicalAxisGrid` Cartesian products.  
- **Exploratory:** steep H1 slopes near knots (normalized sensitivity up to 300 on WHtR domain); floor/ceiling occupancy on 1D H1; aggregates never exact floor in 2D cells sampled.

### BCV-002 — Measurement perturbation
- **Status:** executed (384 configs; Models A+B × σ grid × personas)  
- **Convergence:** all Health/Perf streams converged  
- **Findings (exploratory / evidence-dependent):** measurement noise moves aggregates; median \|Δ\| typically < 1 score point at 1σ for favorable personas, larger at 2σ / adverse composition. Acceptance numbers unresolved.

### BCV-006 — Structural age fairness
- **Status:** executed  
- **Findings:** ages `{20,40,60,80}` with fixed composition → **identical scores** (max \|Δ\| = 0). Structural only — **not** clinical age fairness.

### BCV-007 — Structural sex fairness
- **Status:** executed  
- **Findings:** sex-matched anchors document transform contrasts; H1 sex-independent; aggregate Health ≈ 86.6 and Perf = 91 at anchors for both sexes under their own transforms. **Not** assumed fair.

### BCV-012 — Sensitivity map
- **Status:** executed  
- **Findings:** OAT + joint (±,±) FD. Maximum **normalized** sensitivity ≈ 600 comes from female `H3_FFMI` at x=14.3 (localSlope ≈ 66.67 × DOMAIN_RANGE 9). H1 remains steepest by **raw** local slope (≈ 300); H1 maximum normalized sensitivity ≈ 195. Raw local slope and normalized sensitivity (`|dScore/dx| * DOMAIN_RANGE`) are distinct metrics — do not collapse them. Contribution fields use §23.17.1 only. Synthetic structural/exploratory evidence only; not clinical instability, disease risk, consumer severity, or a release blocker.

### BCV-013 — Knot / plateau
- **Status:** executed  
- **Findings:** 48 knots continuity **PASS**; 6 plateaus flat at EPS_NUM **PASS**. Tails reported as unbounded vs synthetic domain.

### BCV-014 — Floor / ceiling
- **Status:** executed (exploratory)  
- **Findings:** H1 shows exact floor/ceiling occupancy on coarse grids (~24% / ~17%); P1 shows substantial near-ceiling occupancy; most other constructs have 0% exact floor/ceiling on coarse grids.

### BCV-015 — Missingness + Resolver status
- **Status:** executed  
- **Fixture families:** **81** (49 Resolver-status + 32 missingness/demographic)  
- **Instances:** 162 listed; **160 executed**; 2 `H1_MISSING_SEX` not_applicable  
- **Structural:** **160 PASS / 0 FAIL** against expected availability/reason  
- **Notes:** 70 instances required recorded status patches because the approved Resolver does not naturally emit some frozen statuses from observation shapes alone; 80 baseline-normalized for P1 `policy_not_frozen` (known Resolver FFMI+FFM open precedence; mirrors engine integration-test pattern). All patches recorded per row.

### BCV-016 — Temporal coherence
- **Status:** executed  
- **Findings:** S-01…S-15 all match independent age/era oracle. Notable transitions: S-05/S-06 Health era mismatch; S-09/S-13 too-old; S-14 same `sourceEventId` keeps Health eligible; S-15 same timestamp alone does not force era-zero.

### BCV-017 — Personas + relation rubric
- **Status:** executed  
- **Relation checks:** **84 / 84 PASS** (§23.17.7 vs §23.5.4 sex anchors)  
- **Failures:** none

### BCV-018 — Contribution / adverse-hide
- **Status:** executed  
- **Findings:** hide rule (construct `<40` while aggregate `≥70`) triggered for Health H3-adverse companions (male/female) and personas P-03 / P-05 Health. Metrics are §23.17.1 fields only.

### BCV-029 — Joint correlated error
- **Status:** executed (Model A + Model B ρ grid)  
- **Correlation:** Model A independent by construction (≠ B@ρ=0); Model B documents `corr(FM,ALM)=ρ²`.  
- **Findings:** covariance structure changes uncertainty allocation; exploratory / evidence-dependent.

### BCV-030 — Aggregate uncertainty
- **Status:** executed  
- **Uncertainty:** Type-7 quantiles, central 50/80/90/95%, threshold grid `{10…90}`, construct uncertainty shares (signed, unclipped).  
- **Reversal:** two-replicate directional-reversal probabilities ≈ 0.5 under symmetric noise for most configs (exploratory).

### BCV-031 — Intersectional structural fairness
- **Status:** executed  
- **Hidden-path invariance:** **HARD FAIL = false**; all unused-factor groups max \|Δ\| = 0 at EPS_NUM.

### BCV-032A — Change-triad methodology
- **Status:** executed  
- **SDC/MDC:** `SEM_diff`, `SDC95_individual`, `MDC95_individual` (= alias) computed from BCV-029/030 repeated-delta SD; algebraic identity residual ~1e-15.  
- Clinical / user-perceived change: **NO formula** (unresolved). Concepts remain definitionally separate.

### BCV-034 — Acute-state sensitivity
- **Status:** executed  
- **False-improvement (excl. BASE):** Health **0.375** (15/40); Performance **0.65** (26/40).  
- **Findings:** synthetic acute Δ can raise scores without durable biology; ER-BC-16 unresolved. Exploratory / evidence-dependent.

---

## 6. Structural summary

| Result | Count |
|--------|------:|
| Structural PASS (protocols / invariants) | **7 protocols with structural invariants all PASS** (001 continuity, 006, 013, 015, 016, 031, 032A triad separation) |
| Structural FAIL | **0** |
| Failures | none |

---

## 7. Exploratory / evidence-dependent highlights

1. Sensitivity metrics differ: **raw** local slope is highest for H1 (≈ 300); **normalized** sensitivity is highest for female H3_FFMI at x=14.3 (≈ 600). H1 also shows notable floor/ceiling occupancy.
2. Adverse-hide is possible under frozen weights when H3 (or lean) is adverse while companions are favorable.  
3. Acute-state synthetic perturbations frequently produce apparent score improvements (especially Performance).  
4. Under exploratory noise, two-replicate directional-reversal probability concentrates near 0.5.  
5. Resolver naturally marks P1 `policy_not_frozen` when FFMI and FFM coexist — recorded finding; not “fixed” in product code.

### Questions opened (not answered by Wave 1)
- Empirical σ/ρ (ER-BC-01/02/17)  
- Clinical / user-perceived change thresholds (ER-BC-13; BCV-032B)  
- Empirical acute deltas (ER-BC-16)  
- Whether adverse-hide requires presentation controls before any private display  
- Whether Resolver P1 FFMI/FFM precedence should be frozen (product/Resolver decision — out of Wave 1 score-engine scope)

---

## 8. Privacy

| Check | Result |
|-------|--------|
| PHI | **None** |
| Production data | **None** |
| Real-user data | **None** |
| Real DXA PDFs / UIDs / production Firebase refs | **None** |
| `phiStatus` | `synthetic_no_phi` on all manifests |

---

## 9. Limitations

- Synthetic only; no clinical validity.  
- Noise/acute magnitudes are synthetic fallbacks.  
- BCV-015 status patches document Resolver emission gaps vs fixture matrix; score-layer expectations still verified.  
- Claim level remains **0**.

---

## 10. Next scientific action

Open a **new independent validation-results reviewer** to inspect harness correctness, reproducibility, all 16 protocol outputs, structural PASS/FAIL, MC convergence, manifests/provenance, engine immutability, PHI absence, and claim inflation.

**Do not start Tier B. Do not expose scores publicly. Do not open a PR for consumer release.**

---

END OF WAVE 1 SYNTHETIC VALIDATION REPORT V1
