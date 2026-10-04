# Body Composition Dual Score — Private / Internal Validation Plan V1

**Document type:** Validation protocol (planning only)
**Date:** 2026-10-04
**Branch:** `feat/body-composition-stage3e-body-scans-v1`
**Kind:** Documentation only. **Does not** change formulas, knots, weights, eligibility, recency, Resolver, Confidence, score names, runtime, tests, UI, API, persistence, or deployment.
**Methodology correction:** closes independent methodology re-gate **FAIL** (10 blockers) against SHA `6f97bb6ec815981733fab0747a7b7491250670d5`.

| Identity | Value |
|----------|-------|
| Implementation truth-freeze SHA | `3bed6aa6012690737bb5f7455a4397ca6a3bfe64` |
| Approved runtime implementation SHA | `d940b1616b341e98b19e82f2cd6a6242dfe41691` |
| Mathematical truth-freeze SHA | `e258267d109d1d05e20270f205e5fdb29ae2aca6` |
| Prior plan SHA (methodology FAIL) | `6f97bb6ec815981733fab0747a7b7491250670d5` |
| Health version | `body_composition_health_score_draft_v1` |
| Performance-Supporting version | `body_composition_performance_supporting_score_draft_v1` |
| Companion decision register | `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_VALIDATION_DECISION_REGISTER_V1.md` |
| Methodology status | **COMPLETE / PENDING INDEPENDENT RE-GATE** (Wave 1 zero-ambiguity correction) |
| Wave 1 execution | **NOT AUTHORIZED** |
| Tier B | **NOT AUTHORIZED** |

> **This document is a VALIDATION PROTOCOL.**
> It is **not** a score specification, mathematical freeze, clinical validation claim, Wave 1 authorization, or consumer-release authorization.

---

## 0. Mission and hard boundaries

### 0.1 Mission

Design the rigorous **PRIVATE / INTERNAL** validation program required before Oli may even consider exposing either Body Composition score to consumers.

Mathematical implementation correctness is already established (Exact-Math Implementation Re-Gate V2 **PASS**). That does **not** establish clinical meaningfulness, longitudinal stability, measurement-error robustness, fairness, interpretability, usefulness, consumer suitability, or health-claim suitability.

### 0.2 Hard boundaries

**DO NOT:**

- change any formula, knot, weight, eligibility, recency, Resolver policy, Confidence policy, or score name;
- execute validation in this authoring pass;
- add UI, API exposure, public score persistence, or deployment;
- claim clinical validation;
- describe scores as diagnostic;
- authorize consumer release;
- invent final acceptance numbers without literature / domain standard / scientific review;
- advance claim level via synthetic validation alone.

If validation later suggests the formula should change: **document evidence** and open a **FUTURE scientific-review question**. Do **not** change draft_v1 here.

### 0.3 Current authority state

| Gate | Status |
|------|--------|
| Scientific foundation | **PASS** |
| Mathematical implementation | **PASS** |
| Internal engines | **PASS** |
| Implementation truth freeze | **PASS** @ `3bed6aa…` |
| Independent docs re-gate | **PASS** |
| Validation plan methodology (at `6f97bb6e…`) | **FAIL** (10 blockers) — historical |
| Validation plan methodology (Wave 1 zero-ambiguity correction) | **COMPLETE / PENDING INDEPENDENT RE-GATE** |
| Wave 1 synthetic execution | **NOT AUTHORIZED** |
| Tier B de-identified / real-user | **NOT AUTHORIZED** |
| Clinical validation | **NOT ESTABLISHED** |
| Consumer validity | **NOT ESTABLISHED** |
| Consumer integration | **NOT AUTHORIZED** |
| Public Health / Performance-Supporting | **NO-GO** |

### 0.4 Authority stack (do not reinterpret)

```text
CANONICAL EVIDENCE
  → EVIDENCE RESOLVER (truth-frozen)
  → ASSESSMENT CONFIDENCE (factual; qualitative unused)
  → SCORE ENGINE (internal draft; public NO-GO)
```

---

## 1. Validation layers (non-collapsible)

| Layer | Name | Core question |
|-------|------|---------------|
| **V1** | Mathematical robustness | Stable / continuous / explainable across practical domain? |
| **V2** | Measurement-error robustness | Score movement from measurement noise alone (incl. **joint** error)? |
| **V3** | Longitudinal stability | Sensible repeated trajectories under signal and noise? |
| **V4** | Biological plausibility | Directionally explainable for personas / paradoxes? |
| **V5** | Method/source robustness | DXA / Waist method variations tolerable for one function? |
| **V6** | Construct validity | Associates with **independent** external constructs? |
| **V7** | Known-groups validity | Separates groups defined **without** circular score-input cuts? |
| **V8** | Fairness / subgroup (+ intersectional) | Material single-factor or intersectional bias? |
| **V9** | Explainability / comprehension / misconception | Understand why — and avoid false inferences? |
| **V10** | False-precision / uncertainty propagation | Measurement→index→construct→aggregate uncertainty? |
| **V11** | Outcome association / prediction controls | Association vs discrimination vs calibration vs prediction? |
| **V12** | Release-readiness | Privacy, legal, fairness, reliability, claim gates clear? |

**Rule:** Do not collapse these into one generic “validation” claim.

---

## 2. V1 — Mathematical robustness

### 2.1 Purpose

Existing Exact-Math tests are necessary but insufficient. Expand stress testing without changing frozen math.

### 2.2 Input coverage

Dense grids; Monte Carlo; extreme plausible/implausible; exact knots; ±ε; sex/age/recency boundaries; missing-data combinations; Resolver status combinations.

### 2.3 Required analyses

Monotonic regions; intentional plateaus; discontinuity detection; derivative/slope; local sensitivity; aggregate sensitivity.

### 2.4 Metrics

Continuity within ε; max non-boundary jump; local Lipschitz; withhold rates; floor/ceiling occupancy.

**Acceptance numbers:** **UNRESOLVED** (evidence-dependent).

---

## 3. V2 — Measurement-error robustness (incl. correlated error)

### 3.1 Purpose

Quantify score movement from measurement noise with **joint** error propagation. Independent per-index height perturbation is **forbidden**.

### 3.2 Minimum error sources

| Input | Error model (methodology frozen; magnitudes unresolved) |
|-------|---------------------------------------------------------|
| Waist | Repeated-measure protocol error |
| Height | Shared measurement variation / rounding |
| DXA FM / FFM / LM / ALM | Test–retest; optional covariances where justified |
| FMI / ALMI / FFMI / WHtR | **Propagated** from raw errors — not independently noised as if raw |

Exact σ / ρ values: **ER-BC-01, ER-BC-02, ER-BC-17**. Do not fabricate.

### 3.3 Critical joint-Height rule (methodology freeze)

For each Monte Carlo replicate:

1. Draw **one** Height error ε_H.
2. Apply the **same** ε_H simultaneously when recomputing:
   - WHtR
   - FMI
   - FFMI
   - ALMI
3. Do **not** draw independent height errors per index.

### 3.4 Optional DXA covariance structures (methodology freeze; magnitudes unresolved)

Where evidence justifies, include covariance among:

| Pair / structure | Intent |
|------------------|--------|
| FM ↔ FFM | Partition / total-mass constraints |
| LM ↔ ALM | Regional lean coupling |
| Repeated-scan components | Same-session component correlation |

Covariance magnitudes remain **evidence-review dependent** (ER-BC-17). Methodology requires the joint model; numbers are not frozen here.

### 3.5 Monte Carlo protocol

For each synthetic subject (biology fixed):

1. Draw joint measurement-error vector (shared Height; Waist; DXA components ± optional cov).
2. Recompute indices → eligible score inputs → Health + Performance-Supporting aggregates.
3. Record |Δ|, signed Δ, threshold/band crossings, construct-level Δ contributions.

### 3.6 Stability metrics

MAE; median |Δ|; p90/p95 |Δ|; ICC; SEM; SDC/MDC; Bland–Altman; heteroscedasticity checks; threshold-crossing probability; rank-order stability.

Separate **exploratory targets** from **evidence-supported acceptance thresholds**. Do not freeze ICC > X etc. as product policy here.

---

## 4. V3 — Longitudinal stability

Scenarios: stable composition; fat-loss; muscle-gain; detraining; aging (no age slope — record implications); rapid weight change; acute hydration; illness/recovery; training blocks.

Evaluate: within-person signal vs noise; smoothness; lag; over/under-reaction; unscorable episodes under frozen 180d / 90d / same-scan rules (**do not change rules** — evidence only for future scientific review).

Also analyze **selection / scorability bias**: who becomes scorable vs unscorable over time (see §13).

---

## 5. V4 — Biological plausibility

Synthetic personas spanning low/high WHtR, FMI, ALMI, FFMI and paradoxes (lean-sarcopenic; muscular + high central adiposity; normal BMI + high WHtR; high BMI from muscularity; low FMI + low lean; high lean + poor adiposity). Aggregate direction must be explainable from construct contributions.

---

## 6. V5 — Method / source robustness + agreement hardening

### 6.1 Axes

Same machine/operator; same machine/different operator; different machines; different manufacturers; software version; positioning; fasting/hydration/time-of-day.

### 6.2 Cross-vendor

Do **not** assume Hologic / GE Lunar / other interchangeability.

### 6.3 Agreement metrics (high correlation alone is insufficient)

Require as appropriate:

| Metric | Role |
|--------|------|
| Mean bias | Systematic shift |
| Limits of agreement | Agreement interval |
| Proportional bias | Magnitude-dependent bias |
| Heteroscedasticity | Error variance structure |
| ICC | Reliability |
| SEM | Precision |
| SDC/MDC | Detectable change |
| Calibration / bridging | Vendor/site mapping assessment |

---

## 7. V6 — Construct validity (circularity hardening)

### 7.1 Primary evidence must be independent

Health: metabolic / cardiometabolic / lean-reserve constructs **external** to score inputs.
Performance-Supporting: strength / relative strength / function / power (as appropriate).

Correlation ≠ clinical validity ≠ causal claim.

### 7.2 Circularity rule (HARD)

Validation against direct score inputs (WHtR, FMI, ALMI, FFMI) may be labeled **only**:

> **convergent / implementation sanity analysis**

It may **NOT** by itself establish:

- construct validity
- clinical validity
- known-groups validity

Example of **forbidden** validity claim:

> “high FMI group has worse FMI-derived score”

That is circular.

### 7.3 Candidate external variables

| Variable | Relevance | Priority | Circularity class |
|----------|-----------|----------|-------------------|
| Blood pressure | Health | Primary | Independent |
| Fasting glucose | Health | Primary | Independent |
| HbA1c | Health | Primary | Independent |
| Fasting insulin / HOMA-IR | Health | Secondary | Independent |
| Triglycerides / HDL | Health | Secondary | Independent |
| hs-CRP | Health | Exploratory | Independent |
| Grip strength | Perf / lean | Primary | Independent |
| Chair-rise / STS | Perf / function | Primary | Independent |
| Gait speed | Function | Secondary | Independent |
| BW-normalized lifts / jump-power | Perf | Secondary | Independent |
| VO₂max | Perf (divergent expected) | Exploratory | Independent |
| External WHtR / FMI / ALMI / FFMI | Sanity only | Secondary | **Convergent only** |

Variables are **not** implied to exist in Oli today.

---

## 8. V7 — Known-groups validity (circularity hardening)

Groups must use **independent** inclusion criteria (clinical referral, sport/training status, imaging criteria not equal to the exact score-input thresholds under test, activity criteria, etc.).

**Forbidden:** defining known groups solely from the same score-input thresholds being validated.

---

## 9. V8 — Fairness (single-factor + intersectional)

### 9.1 Single-factor subgroups

Age; sex; height/body size; BMI range; athletic status; menopausal status (if data permit); DXA platform; geographic/site cohort.

Ethnicity unused in formula — evaluate omission bias; **do not inject ethnicity into draft_v1**.

### 9.2 Fairness metrics (evaluate; do not freeze cutoffs)

Score distribution; floor/ceiling; mean/median differences; variance; score sensitivity; external association consistency; missingness/scorability; error/reliability differences; calibration differences where prediction is later studied.

### 9.3 Age fairness

Age invariance (identical composition ⇒ identical adult score at 20/40/60/80) is mathematically intentional. Validate defensibility. Do not change here.

### 9.4 Sex transform validation (do not assume knots ⇒ fairness)

Require explicit evaluation of:

| Property | Question |
|----------|----------|
| Equal information content | Do sex-specific transforms convey comparable resolution? |
| Differential external association | Do associations with independent externals differ unfairly by sex? |
| Compression / expansion | Are score ranges squeezed/stretched differently? |
| Floor / ceiling | Differential saturation rates? |
| Sensitivity | Differential local sensitivity to input noise/change? |

### 9.5 Intersectional fairness (required where sample permits)

At minimum consider:

- age × sex
- height × sex
- BMI × sex
- athletic status × sex
- menopause × age
- ethnicity/race × sex (only where legally/ethically appropriate)
- DXA vendor × site
- vendor × site × sex

**Sparse cells:** do not make unsupported conclusions. Record **insufficient sample / uncertainty** with intervals. Do not overinterpret.

---

## 10. V9 — Explainability + misinterpretation battery

### 10.1 Internal explainability requirements (no UI)

Health: H1 / H2 / H3. Performance-Supporting: P1 / P3. Dominant construct; adverse non-hiding; change attribution; withhold-reason translatability (internal).

### 10.2 Contribution analysis

Absolute / marginal / dominant / change contribution; detect adverse-hide.

### 10.3 Misinterpretation battery (release-critical before private pilot display)

Test whether users incorrectly infer at least:

1. “90 means 90% healthy”
2. “70 means I have 30% disease risk”
3. “Health Composition means I am clinically healthy”
4. “Performance-Supporting Composition predicts athletic performance”
5. “a lower score means disease”
6. “not calculated means bad”
7. “score change proves biological improvement”
8. “Health and Performance-Supporting mean the same thing”
9. “a high overall score means every underlying construct is good”

See BCV-033. Supported by ER-BC-18.

---

## 11. V10 — False precision + uncertainty propagation

### 11.1 Propagation chain (required methodology)

```text
raw measurement uncertainty
        ↓
derived index uncertainty (WHtR / FMI / ALMI / FFMI)
        ↓
construct-score uncertainty (H1/H2/H3 or P1/P3)
        ↓
aggregate-score uncertainty
```

Use joint/correlated draws from §3 wherever applicable.

### 11.2 Required internal analysis outputs

| Output | Notes |
|--------|-------|
| Score distribution | Per subject / scenario |
| Median | Central tendency under noise |
| Central intervals | Report **all** of central 50%, 80%, 90%, 95% — none privileged for UI |
| Quantiles | mean, SD, p05, p10, p25, p50, p75, p90, p95 |
| Exploratory threshold-crossing | Internal thresholds `{10,20,…,90}` only — **NOT** product bands |
| Directional-reversal probability | Sign flip under noise alone |
| Construct contribution to total uncertainty | Which construct drives spread |

**Do NOT freeze:** consumer interval width; confidence label; final UI; product bands. Internal analysis only.

### 11.3 Change triad (NOT interchangeable)

| Concept | Meaning | Methods (examples) |
|---------|---------|--------------------|
| **A. SDC / MDC** | Measurement-error-derived smallest detectable change | SEM, SDC/MDC formulas, Bland–Altman, heteroscedasticity |
| **B. Clinically meaningful change** | Change tied to clinically meaningful outcome or accepted external standard | Anchor-based and/or distribution-based methods where appropriate |
| **C. User-perceived meaningful change** | Change a user can meaningfully perceive / understand / value | Comprehension / perception research |

Final numeric thresholds remain **unresolved** (ER-BC-13). Presenting score changes below SDC/MDC as “meaningful” is a **hard release blocker**.

---

## 12. V11 — Outcome association + prediction claim controls

### 12.1 Distinguish claim types

| Type | Meaning | Authorized now? |
|------|---------|-----------------|
| Association | Concurrent or prospective co-occurrence | Study design only; no product claim |
| Discrimination | Separates outcomes (e.g. AUC/C-index) | Study design only |
| Calibration | Predicted vs observed rates | Required if prediction studied |
| Prognostic prediction | Out-of-sample risk prediction | **Not authorized** as product claim |
| Causal inference | Causal effect identification | **Out of scope** for product index |

### 12.2 Controls required for any future predictive study

- Prespecified hypothesis
- Held-out validation set
- External validation where feasible
- Optimism correction / bootstrap where appropriate
- No post-hoc threshold tuning on validation cohort
- Transparent missing-data handling
- Calibration assessment
- Discrimination assessment
- Decision-utility assessment only if later justified

No predictive claim is authorized now. See ER-BC-14.

---

## 13. Missingness / scorability / access / selection bias

Require analysis of:

| Topic | Question |
|-------|----------|
| Scorability | Who becomes scorable vs remains unscorable? |
| DXA access | Who can obtain DXA-eligible evidence? |
| Socioeconomic / access differences | Does access skew the scorable population? |
| Site availability | Geographic / clinic access bias? |
| Health-conscious-user bias | Affluent / wellness-seeking overrepresentation? |
| Repeated-scan selection | Who returns for repeats? |
| Survivorship / retention bias | Who remains in longitudinal cohorts? |

These feed the risk register (R11–R12 and R13–R20).

---

## 14. Privacy / de-identification limits / Tier B governance

### 14.1 Hard truth

Pseudonymization / de-identification does **NOT** automatically eliminate re-identification risk.

Body-composition records can remain re-identifiable when combined with age, sex, dates, site, vendor, rare phenotype, and/or repeated measurements.

### 14.2 Tier B requirements (all mandatory before any Tier B work)

- Minimum necessary variables + data minimization
- Pseudonymous subject ID
- Role-based access
- Approved private storage (not repo)
- Audit logs
- Retention + deletion
- Export restrictions
- Data-use register
- Dataset provenance
- Small-cell / rare-combination risk review

### 14.3 Provenance fields (where available)

DXA vendor; model; software version; site; operator metadata category; waist protocol; measurement date; quality flags; cohort.

**Forbidden:** PHI in repo; real user DXA PDFs in Git; fixtures with PHI.

**Tier B status:** **BLOCKED / NOT AUTHORIZED** until governance + ER-BC-15 complete and separate authorization.

---

## 15. Acute-state lean confounds

### 15.1 Factors to model / study

Hydration; glycogen; food intake; recent training; inflammation; acute illness; edema; menstrual-cycle phase where relevant; time of day.

### 15.2 Distinguish

| Class | Meaning |
|-------|---------|
| Measurement / physiologic artifact | Short-term state shifting DXA lean/FFM without lasting composition change |
| Real biological change | True tissue change |

Affects Lean Mass, FFM, ALMI, FFMI → H3 / P1 (and related aggregates). See ER-BC-16 + BCV-034.

---

## 16. Calibration dataset tiers

| Tier | Content | Can prove | Cannot prove |
|------|---------|-----------|--------------|
| **A** Synthetic | Grids, joint Monte Carlo, personas | Math/robustness/structural fairness under assumed error models | Clinical meaning; real-world fairness; outcomes |
| **B** De-identified controlled | Privacy-gated repeats | Retest, limited known-groups, method checks | Broad external validity; not auto-safe from re-id |
| **C** External research | Legally permitted | Construct/outcome associations under dataset limits | Oli UX validity; method mismatch risk |
| **D** Prospective Oli | Future opt-in | Product-relevant longitudinal/outcome signals | Instant clinical validation |

Synthetic ≠ clinical validation. Correlation ≠ clinical validation. Internal user testing ≠ necessarily clinical validation.

**Synthetic validation cannot independently advance claim Level 0 → Level 1.**

---

## 17. Sample-size planning

Study-specific N via power analysis or precision-based CI targets (retest; fairness; correlations; known-groups; longitudinal; cross-platform).

**Intersectional warning:** do not overinterpret sparse cells; always report uncertainty intervals; record insufficient sample rather than false precision.

---

## 18. Release-risk register

| ID | Risk | Severity | Likelihood | Detection / validation | Mitigation | Release blocker |
|----|------|----------|------------|------------------------|------------|-----------------|
| R1 | Measurement error dominates movement | High | Medium | V2; BCV-002/012/029 | MMC/SDC; presentation dampening | **Yes** if material |
| R2 | DXA platform bias | High | Medium | V5; BCV-005 | Bridging; future redesign Q | **Yes** if unexplained |
| R3 | Age invariance inappropriate | High | Medium | V8; BCV-006 | Future redesign Q | **Yes** if material |
| R4 | Sex transform bias | High | Medium | V8; BCV-007 | Future redesign Q | **Yes** if material |
| R5 | False precision | High | High | V10; BCV-019/030 | Band/range experiments | **Yes** until resolved |
| R6 | Ceiling / floor effects | Medium | Medium | V1/V8; BCV-014 | Document; future knot review | Conditional |
| R7 | Construct dominance / adverse-hide | High | Medium | V9; BCV-018 | Explainability required | **Yes** if unexplainable |
| R8 | Misleading health interpretation | High | Medium | V9; BCV-033 | Language / Level gates | **Yes** |
| R9 | Consumer over-trust | High | High | V9/V10; BCV-033 | Claim Level controls | **Yes** |
| R10 | Longitudinal instability | High | Medium | V3; BCV-004 | Noise envelope; cadence | **Yes** if excessive |
| R11 | Missing-data selection bias | Medium | Medium | §13; BCV-015 | Fail-closed transparency | Conditional |
| R12 | Affluent / health-conscious cohort bias | High | High | Cohort audit; BCV-027 | Broader sampling | **Yes** for broad claims |
| R13 | Regression to the mean | Medium | Medium | Longitudinal design | Control / replicate design | Conditional |
| R14 | Dataset shift | High | Medium | External Tier C; temporal splits | External validation | **Yes** for broad claims |
| R15 | Vendor/site temporal drift | High | Medium | V5 longitudinal vendor | Bridging refresh | **Yes** if unexplained |
| R16 | Simpson’s paradox | Medium | Medium | Intersectional BCV-031 | Stratified analysis | Conditional |
| R17 | Survivorship / retention bias | Medium | Medium | §13 longitudinal | Retention analysis | Conditional |
| R18 | Label / construct leakage | High | Medium | V6/V7 circularity audit | Independent labels only | **Yes** if circular “validity” |
| R19 | Over-reliance on score deltas | High | High | Change triad BCV-032 | SDC vs clinical vs perceived | **Yes** if Δ < SDC sold as meaningful |
| R20 | Selective DXA access / socioeconomic bias | High | High | §13 scorability | Access analysis; claim limits | **Yes** for broad claims |
| R21 | Intersectional subgroup bias | High | Medium | BCV-031 | Stratified + sparse-cell honesty | **Yes** if material |
| R22 | Acute-state lean instability | High | Medium | BCV-034; ER-BC-16 | Protocol controls; presentation | **Yes** if material |
| R23 | Residual re-identification risk | High | Medium | ER-BC-15; Tier B gates | Minimization; cell risk review | **Yes** if unresolved for used data |
| R24 | Correlated-error underestimation | High | Medium | BCV-029 | Joint Height + DXA cov | **Yes** if ignored in noise claims |

---

## 19. Release claim taxonomy

| Level | Meaning | Current |
|-------|---------|---------|
| **0** | Internal experimental index | **CURRENT** |
| **1** | Descriptive wellness index | Not authorized; synthetic alone cannot advance |
| **2** | Validated association with constructs | Not authorized |
| **3** | Predictive claim | Not authorized |
| **4** | Clinical / diagnostic | Not authorized |

---

## 20. Hard public release blockers (automatic NO-GO)

1. Unexplained single-factor or **intersectional** subgroup bias
2. Unstable repeatability / excessive noise
3. High uncertainty unresolved for intended presentation
4. Score changes below detectable change (SDC/MDC) presented as meaningful
5. Unexplained vendor/site drift
6. Material acute-state instability unresolved
7. Misleading user interpretation (misconception battery fail)
8. Missingness / access / socioeconomic bias unresolved for claim scope
9. Privacy / re-identification risk unresolved for evidence used
10. Legal / regulatory uncertainty
11. Unresolved false precision
12. Circular “validity” evidence treated as construct/clinical proof
13. Claim Level requested exceeds evidence Level achieved

---

## 21. Validation matrix (layer summary)

| Layer | Primary BCVs | Acceptance type | Failure meaning |
|-------|--------------|-----------------|-----------------|
| V1 | 001, 012, 013, 014, 015 | Exploratory / evidence-dependent | Surface defect or freeze mismatch |
| V2 | 002, 012, 029, 030, 032 | Evidence-dependent | R1/R24 blocker |
| V3 | 004, 016 | Evidence-dependent | R10/R13/R17 |
| V4 | 017 | Exploratory | Paradox unexplained |
| V5 | 003, 005, 023, 024 | Evidence-dependent | R2/R15 |
| V6 | 009 | Evidence-dependent | Weak independent construct |
| V7 | 008 | Evidence-dependent | Poor non-circular separation |
| V8 | 006, 007, 011, 021, 022, 031 | Evidence-dependent | R3/R4/R16/R21 |
| V9 | 010, 018, 033 | Evidence-dependent | R7/R8/R9 |
| V10 | 019, 020, 030, 032 | Evidence-dependent | R5/R19 |
| V11 | 025, 026 | Evidence-dependent | No predictive claim |
| V12 | 027, 028 + governance | Gate checklist | Remain NO-GO |

---

## 22. Experiment catalog (34 experiments)

### 22.1 Required fields (every BCV)

Each entry includes: ID; title; layer; priority; dataset tier; objective; hypothesis; required inputs; method; output metrics; dependencies; acceptance-status type (`exploratory` / `candidate` / `evidence-dependent`); failure meaning; next action; PHI status.

**Do not invent final acceptance numbers.**

### 22.2 Catalog

#### BCV-001 — Synthetic sensitivity map (dense grids)

| Field | Value |
|-------|-------|
| Layer | V1 |
| Priority | P0 |
| Tier | A |
| Objective | Map Health/Perf score surfaces across practical WHtR/FMI/ALMI/FFMI grids by sex |
| Hypothesis | Surfaces match frozen transforms; no unintended discontinuities |
| Inputs | Synthetic indices; sex; eligible demographics; frozen engine |
| Method | Dense grids + exact knots + ±ε |
| Metrics | Continuity, max jump, local slopes, floor/ceiling occupancy |
| Dependencies | Mathematical freeze; approved engine SHA |
| Acceptance type | exploratory / evidence-dependent |
| Failure meaning | Math surface defect or implementation drift |
| Next action | File impl/science review; do not change knots here |
| PHI | none |

#### BCV-002 — Waist measurement perturbation

| Field | Value |
|-------|-------|
| Layer | V2 |
| Priority | P0 |
| Tier | A (σ from ER-BC-02) |
| Objective | Quantify score Δ from Waist noise with **shared Height** coupling (see BCV-029) |
| Hypothesis | Waist noise alone can move H1/Health materially near steep segments |
| Inputs | Synthetic Waist/Height; joint ε_H; candidate σ_waist |
| Method | Monte Carlo; biology fixed |
| Metrics | MAE, p90/p95 \|Δ\|, exploratory threshold-crossing {10…90}, H1 contribution |
| Dependencies | ER-BC-02; BCV-029 joint model |
| Acceptance type | evidence-dependent |
| Failure meaning | R1 — noise dominates |
| Next action | MMC/presentation work; no formula change here |
| PHI | none |

#### BCV-003 — DXA repeatability (same machine)

| Field | Value |
|-------|-------|
| Layer | V2/V5 |
| Priority | P1 |
| Tier | B |
| Objective | Empirical same-machine precision for FM/FFM/ALM → indices → scores |
| Hypothesis | Retest score Δ concentrates within SDC envelope |
| Inputs | Paired DXA; provenance; demography |
| Method | Test–retest; ICC/SEM/SDC; Bland–Altman |
| Metrics | ICC, SEM, SDC/MDC, LoA, score \|Δ\| |
| Dependencies | Tier B governance; ER-BC-01; ER-BC-15 |
| Acceptance type | evidence-dependent |
| Failure meaning | Unstable repeatability blocker |
| Next action | Protocol QC; presentation dampening |
| PHI | Tier B only; never in repo |

#### BCV-004 — Longitudinal stability trajectories

| Field | Value |
|-------|-------|
| Layer | V3 |
| Priority | P1 |
| Tier | B/D |
| Objective | Within-person signal vs noise across scenarios |
| Hypothesis | Stable biology ≈ noise envelope; directed phases move constructs coherently |
| Inputs | Repeated Waist/DXA; intervention labels if any |
| Method | Trajectory analysis; scorability over time |
| Metrics | ICC, smoothness, lag, over/under-reaction, unscorable rate |
| Dependencies | Tier B/D; BCV-016; §13 |
| Acceptance type | evidence-dependent |
| Failure meaning | R10/R13/R17 |
| Next action | Cadence/presentation; possible FSR on windows |
| PHI | gated |

#### BCV-005 — Cross-platform DXA bridging

| Field | Value |
|-------|-------|
| Layer | V5 |
| Priority | P1 |
| Tier | B/C |
| Objective | Vendor comparability for one scoring function |
| Hypothesis | Vendor bias may induce material score Δ; correlation alone insufficient |
| Inputs | Paired/bridging DXA across vendors |
| Method | Bias, LoA, proportional bias, heteroscedasticity, ICC, SEM, SDC, bridging |
| Metrics | Bias/LoA → score Δ distributions |
| Dependencies | ER-BC-05; Tier gates |
| Acceptance type | evidence-dependent |
| Failure meaning | R2/R15 blocker |
| Next action | Future redesign Q if non-interchangeable |
| PHI | gated |

#### BCV-006 — Age fairness (structural + empirical)

| Field | Value |
|-------|-------|
| Layer | V8 |
| Priority | P0 structural / P1 empirical |
| Tier | A structural; C/D empirical |
| Objective | Test defensibility of age-invariant adult scoring |
| Hypothesis | Structural identity holds; empirical defensibility unresolved |
| Inputs | Identical composition across ages; external age-stratified datasets later |
| Method | Structural identity proofs + empirical subgroup Δ with CIs |
| Metrics | Exact structural equality; empirical Δ + intervals |
| Dependencies | ER-BC-10 |
| Acceptance type | evidence-dependent |
| Failure meaning | R3 |
| Next action | FSR-BC-02 if indefensible |
| PHI | none for structural |

#### BCV-007 — Sex fairness

| Field | Value |
|-------|-------|
| Layer | V8 |
| Priority | P0 structural / P1 empirical |
| Tier | A/B/C |
| Objective | Evaluate sex transforms for equal information, differential association, compression/expansion, floor/ceiling, sensitivity |
| Hypothesis | Sex-specific knots do **not** automatically imply fairness |
| Inputs | Sex-stratified synthetic + empirical |
| Method | Distributional comparisons; sensitivity; external association consistency |
| Metrics | KS/mean-median Δ; floor/ceiling rates; sensitivity; association Δ |
| Dependencies | ER-BC-11 |
| Acceptance type | evidence-dependent |
| Failure meaning | R4 |
| Next action | FSR-BC-03 if material |
| PHI | none for structural |

#### BCV-008 — Known-groups validity

| Field | Value |
|-------|-------|
| Layer | V7 |
| Priority | P1 |
| Tier | B/C |
| Objective | Separation under **non-circular** group definitions |
| Hypothesis | Independent groups differ in score distributions as expected |
| Inputs | External group labels (not FMI/WHtR/ALMI/FFMI score cuts) |
| Method | Effect sizes / AUROC with CIs |
| Metrics | Cohen’s d, AUROC, overlap |
| Dependencies | Circularity rules §7–8 |
| Acceptance type | evidence-dependent |
| Failure meaning | Poor discrimination or circular design reject |
| Next action | Redesign labels; science review |
| PHI | gated |

#### BCV-009 — External construct validity

| Field | Value |
|-------|-------|
| Layer | V6 |
| Priority | P2 |
| Tier | C/D |
| Objective | Independent external associations for Health and Perf |
| Hypothesis | Moderate associations possible; not clinical proof |
| Inputs | Labs/function/performance externals |
| Method | Correlation/regression; pre-specify; avoid leakage |
| Metrics | ρ / partial ρ / model metrics with CIs |
| Dependencies | Circularity hardening; ER-BC-03/04/09 |
| Acceptance type | evidence-dependent |
| Failure meaning | Weak independent construct support |
| Next action | Science review; stay Level 0/1 constraints |
| PHI | gated |

#### BCV-010 — Explainability / comprehension study

| Field | Value |
|-------|-------|
| Layer | V9 |
| Priority | P1 |
| Tier | A materials / human subjects as authorized |
| Objective | Can users understand why a score is produced? |
| Hypothesis | Without construct breakdown, comprehension fails |
| Inputs | Internal explainability cases (no consumer UI build) |
| Method | Structured comprehension tasks |
| Metrics | Accuracy; trust calibration |
| Dependencies | BCV-018; BCV-033 |
| Acceptance type | evidence-dependent |
| Failure meaning | R7/R8 |
| Next action | Explainability redesign |
| PHI | none for synthetic cases |

#### BCV-011 — Height / body-size fairness

| Field | Value |
|-------|-------|
| Layer | V8 |
| Priority | P1 |
| Tier | A/B/C |
| Objective | Detect unfair height/size interactions with indices and noise |
| Hypothesis | Extreme heights may amplify index/score sensitivity |
| Inputs | Height-stratified grids + empirical |
| Method | Stratified sensitivity and distributional Δ |
| Metrics | Sensitivity, Δ by height band + CIs |
| Dependencies | Joint Height error BCV-029 |
| Acceptance type | evidence-dependent |
| Failure meaning | Size-related bias |
| Next action | Science review |
| PHI | gated if empirical |

#### BCV-012 — FMI/ALMI/FFMI error propagation map

| Field | Value |
|-------|-------|
| Layer | V1/V2 |
| Priority | P0 |
| Tier | A |
| Objective | Local sensitivity of constructs/aggregates to index perturbations |
| Hypothesis | Steep knot neighborhoods dominate instability |
| Inputs | Synthetic indices; joint error model |
| Method | Local derivatives / finite differences + MC |
| Metrics | ∂score/∂index; construct contribution |
| Dependencies | BCV-001; BCV-029 |
| Acceptance type | exploratory / evidence-dependent |
| Failure meaning | Unexpected explosive sensitivity |
| Next action | Document; presentation/MMC work |
| PHI | none |

#### BCV-013 — Threshold / plateau / knot neighborhood analysis

| Field | Value |
|-------|-------|
| Layer | V1 |
| Priority | P0 |
| Tier | A |
| Objective | Verify intentional plateaus and knot continuity |
| Hypothesis | Plateaus and shared endpoints behave as frozen |
| Inputs | Exact knots ±ε |
| Method | Neighborhood sweeps |
| Metrics | Slope≈0 in plateaus; continuity at knots |
| Dependencies | Mathematical freeze |
| Acceptance type | exploratory |
| Failure meaning | Freeze mismatch |
| Next action | Impl/science review |
| PHI | none |

#### BCV-014 — Floor / ceiling occupancy analysis

| Field | Value |
|-------|-------|
| Layer | V1/V8 |
| Priority | P0 |
| Tier | A (+ empirical later) |
| Objective | Quantify saturation rates by sex and regions |
| Hypothesis | Some regions saturate; sex differentials possible |
| Inputs | Grids; optional empirical |
| Method | Occupancy histograms |
| Metrics | Floor/ceiling rates by subgroup |
| Dependencies | BCV-001; BCV-007 |
| Acceptance type | exploratory / evidence-dependent |
| Failure meaning | R6 material compression |
| Next action | Document; future knot review if needed |
| PHI | none for synthetic |

#### BCV-015 — Missingness + Resolver status simulation

| Field | Value |
|-------|-------|
| Layer | V1 + §13 |
| Priority | P0 |
| Tier | A |
| Objective | Map withhold reasons and scorability under missing/Resolver grids |
| Hypothesis | Fail-closed reasons match freeze; scorability is selective |
| Inputs | Missingness + Resolver status combinations |
| Method | Combinatorial simulation |
| Metrics | Withhold-reason rates; scorable fraction |
| Dependencies | Resolver/score reason freezes |
| Acceptance type | exploratory |
| Failure meaning | Reason/precedence defect or severe selection |
| Next action | Impl review if reason mismatch; R11 analysis |
| PHI | none |

#### BCV-016 — Temporal coherence 180d/90d/same-scan

| Field | Value |
|-------|-------|
| Layer | V3 |
| Priority | P0 sim / P1 empirical |
| Tier | A/B |
| Objective | Behavior of frozen recency/era/same-scan rules |
| Hypothesis | 90d may allow mismatched snapshots; unscorable rates material under sparse cadence |
| Inputs | Synthetic timelines; optional empirical cadences |
| Method | Simulation of measurement schedules |
| Metrics | Unscorable rate; mismatch indicators |
| Dependencies | Frozen recency policy (do not change) |
| Acceptance type | exploratory / evidence-dependent |
| Failure meaning | Policy tension → FSR-BC-01 only |
| Next action | Record evidence; no rule change here |
| PHI | none for sim |

#### BCV-017 — Paradoxical persona battery

| Field | Value |
|-------|-------|
| Layer | V4 |
| Priority | P0 |
| Tier | A |
| Objective | Directional explainability for paradoxes |
| Hypothesis | Aggregates explainable via construct contributions |
| Inputs | Canonical numeric persona table W1-PERSONAS (P-01…P-12) |
| Method | Score + contribution audit |
| Metrics | Expert review pass; adverse-hide flags |
| Dependencies | BCV-018 |
| Acceptance type | exploratory |
| Failure meaning | Unexplainable paradox |
| Next action | Contribution/science Q |
| PHI | none |

#### BCV-018 — Contribution / adverse-hide analysis

| Field | Value |
|-------|-------|
| Layer | V9 |
| Priority | P0 |
| Tier | A |
| Objective | Detect aggregate direction hiding adverse constructs |
| Hypothesis | Weighted sums can hide clinically concerning construct lows |
| Inputs | Synthetic construct combinations |
| Method | Absolute/marginal/dominant/change contributions |
| Metrics | Hide rate; dominant construct map |
| Dependencies | Frozen weights (do not change) |
| Acceptance type | exploratory / evidence-dependent |
| Failure meaning | R7 |
| Next action | Explainability requirements tighten |
| PHI | none |

#### BCV-019 — False-precision presentation experiments

| Field | Value |
|-------|-------|
| Layer | V10 |
| Priority | P1 |
| Tier | A + human study as authorized |
| Objective | Compare integer/range/band/interval+explanation candidates |
| Hypothesis | Integer-alone overclaims certainty given noise |
| Inputs | Uncertainty outputs from BCV-030 |
| Method | Comprehension + threshold-cross communication tests |
| Metrics | Misinterpretation rates; preferred formats (no UI freeze) |
| Dependencies | BCV-030; BCV-033 |
| Acceptance type | candidate / evidence-dependent |
| Failure meaning | R5 |
| Next action | Presentation science review (no UI build here) |
| PHI | none for synthetic |

#### BCV-020 — MMC / change-threshold estimation protocol

| Field | Value |
|-------|-------|
| Layer | V2/V3/V10 |
| Priority | P1 |
| Tier | A/B |
| Objective | Estimate candidate change thresholds without freezing policy |
| Hypothesis | +1/+3/+5/+10 are hypotheses only; SDC may exceed small integers |
| Inputs | Noise envelopes; optional anchors |
| Method | Distribution-based + later anchor-based where appropriate |
| Metrics | Candidate SDC/MMC tables (unresolved policy) |
| Dependencies | BCV-029/030/032; ER-BC-13 |
| Acceptance type | evidence-dependent |
| Failure meaning | Cannot support delta claims |
| Next action | Keep thresholds unresolved until review |
| PHI | gated if empirical |

#### BCV-021 — Ethnicity-omission fairness audit

| Field | Value |
|-------|-------|
| Layer | V8 |
| Priority | P2 |
| Tier | C |
| Objective | Assess bias from unused ethnicity |
| Hypothesis | Omission may create material subgroup error |
| Inputs | External datasets with race/ethnicity where lawful |
| Method | Stratified Δ; intersectional with sex where appropriate |
| Metrics | Subgroup Δ + CIs; sparse-cell flags |
| Dependencies | ER-BC-12; legal/ethics |
| Acceptance type | evidence-dependent |
| Failure meaning | Fairness blocker; FSR-BC-05 (no formula injection now) |
| Next action | Science review only |
| PHI | gated |

#### BCV-022 — Athletic-status / BMI-range fairness

| Field | Value |
|-------|-------|
| Layer | V8 |
| Priority | P2 |
| Tier | B/C |
| Objective | Ceiling/compression in athletic and BMI strata |
| Hypothesis | Athletes may saturate Perf muscularity; BMI strata differ |
| Inputs | Athletic/BMI labels independent of score cuts |
| Method | Stratified distributions + intersection with sex |
| Metrics | Floor/ceiling; Δ; sensitivity |
| Dependencies | BCV-031 |
| Acceptance type | evidence-dependent |
| Failure meaning | Subgroup compression |
| Next action | Science review |
| PHI | gated |

#### BCV-023 — Operator / positioning DXA effects

| Field | Value |
|-------|-------|
| Layer | V5 |
| Priority | P2 |
| Tier | B |
| Objective | Operator/positioning contribution to score noise |
| Hypothesis | Positioning can rival machine precision |
| Inputs | Controlled repeats with operator/position factors |
| Method | Variance components |
| Metrics | Component σ → score Δ |
| Dependencies | Tier B; ER-BC-01 |
| Acceptance type | evidence-dependent |
| Failure meaning | Protocol insufficiency |
| Next action | Protocol QC |
| PHI | gated |

#### BCV-024 — Hydration / time-of-day effects

| Field | Value |
|-------|-------|
| Layer | V5/V3 |
| Priority | P2 |
| Tier | B |
| Objective | Short-interval physiologic noise on lean indices/scores |
| Hypothesis | Hydration/TOD can move FFMI/ALMI without lasting change |
| Inputs | Controlled short-interval scans |
| Method | Paired contrasts |
| Metrics | Score Δ; construct Δ |
| Dependencies | ER-BC-16; BCV-034 |
| Acceptance type | evidence-dependent |
| Failure meaning | R22 |
| Next action | Protocol timing guidance |
| PHI | gated |

#### BCV-025 — Prospective Health outcome association

| Field | Value |
|-------|-------|
| Layer | V11 |
| Priority | P3 |
| Tier | C/D |
| Objective | Prospective associations (not product predictive claim) |
| Hypothesis | Some association possible; not causal |
| Inputs | Outcomes under ethics |
| Method | Prespecified models; discrimination/calibration if prediction attempted |
| Metrics | HR/OR/C-index/calibration — study-only |
| Dependencies | ER-BC-14; claim taxonomy Level ≤0/1 |
| Acceptance type | evidence-dependent |
| Failure meaning | No predictive advancement |
| Next action | Stay non-predictive |
| PHI | gated |

#### BCV-026 — Prospective performance outcomes

| Field | Value |
|-------|-------|
| Layer | V11 |
| Priority | P3 |
| Tier | C/D |
| Objective | Association with strength/function outcomes |
| Hypothesis | Perf score associates modestly with function; not sport prediction |
| Inputs | Strength/function outcomes |
| Method | Prespecified association; prediction controls if attempted |
| Metrics | ρ / predictive metrics study-only |
| Dependencies | ER-BC-04; ER-BC-14 |
| Acceptance type | evidence-dependent |
| Failure meaning | No sport-readiness claim |
| Next action | Keep claim Level constrained |
| PHI | gated |

#### BCV-027 — Cohort selection-bias audit (R12/R20)

| Field | Value |
|-------|-------|
| Layer | V8/V12 |
| Priority | P2 |
| Tier | B/C/D |
| Objective | Quantify affluent/health-conscious and DXA-access bias |
| Hypothesis | Scorable cohorts skew privileged/access-rich |
| Inputs | Cohort demographics; access proxies |
| Method | Comparability tables; scorability by strata |
| Metrics | Representation gaps; scorability rates |
| Dependencies | §13 |
| Acceptance type | evidence-dependent |
| Failure meaning | R12/R20 blocker for broad claims |
| Next action | Narrow claims or broaden sampling |
| PHI | gated |

#### BCV-028 — Release-readiness gate rehearsal

| Field | Value |
|-------|-------|
| Layer | V12 |
| Priority | P2 |
| Tier | n/a (checklist) |
| Objective | Rehearse hard blockers + claim Level gates |
| Hypothesis | Multiple blockers remain open at Level 0 |
| Inputs | Prior BCV/ER outputs |
| Method | Gate checklist |
| Metrics | Binary blocker status |
| Dependencies | All prior layers |
| Acceptance type | evidence-dependent |
| Failure meaning | Remain NO-GO |
| Next action | No consumer authorization |
| PHI | none |

#### BCV-029 — Joint correlated measurement error propagation

| Field | Value |
|-------|-------|
| Layer | V2 |
| Priority | **P0** |
| Tier | A |
| Wave | **Wave 1** |
| Objective | Enforce shared Height error into WHtR/FMI/FFMI/ALMI; optional DXA cov |
| Hypothesis | Independent-per-index height noise **underestimates** aggregate uncertainty |
| Inputs | Joint error vector; candidate σ/ρ from ER-BC-17 (placeholders marked unresolved) |
| Method | Monte Carlo with **one ε_H** applied to all height-indexed metrics; optional FM↔FFM, LM↔ALM |
| Metrics | Joint vs independent-noise Δ comparison; p90/p95; construct contributions |
| Dependencies | ER-BC-17; BCV-002; BCV-012 |
| Acceptance type | exploratory / evidence-dependent |
| Failure meaning | R24 — correlated-error underestimation |
| Next action | Use joint model in all noise claims |
| PHI | none |

#### BCV-030 — Aggregate uncertainty propagation

| Field | Value |
|-------|-------|
| Layer | V10 |
| Priority | **P0** |
| Tier | A |
| Wave | **Wave 1** |
| Objective | Propagate uncertainty measurement→index→construct→aggregate |
| Hypothesis | Aggregate intervals can span multiple integer scores |
| Inputs | Joint draws from BCV-029 |
| Method | Full propagation chain; report distributional outputs |
| Metrics | Distribution; median/mean/SD; central 50/80/90/95%; p05–p95; exploratory threshold-crossing {10…90}; directional-reversal; construct uncertainty share (no product bands) |
| Dependencies | BCV-029; no UI freeze |
| Acceptance type | exploratory / evidence-dependent |
| Failure meaning | R5 — false precision |
| Next action | Inform presentation candidates only |
| PHI | none |

#### BCV-031 — Intersectional fairness analysis

| Field | Value |
|-------|-------|
| Layer | V8 |
| Priority | **P0 structural** / **P1–P2 empirical** (data-dependent) |
| Tier | A structural; B/C empirical |
| Wave | Wave 1 structural |
| Objective | Intersectional Δ where sample permits; honesty for sparse cells |
| Hypothesis | Single-factor fairness can mask intersectional bias (incl. Simpson risk) |
| Inputs | age×sex, height×sex, BMI×sex, athletic×sex, menopause×age, ethnicity×sex (if lawful), vendor×site, vendor×site×sex |
| Method | Stratified comparisons with CIs; mark insufficient-n cells |
| Metrics | Intersectional Δ; variance; scorability; no unsupported conclusions |
| Dependencies | BCV-006/007; sample-size warning §17 |
| Acceptance type | evidence-dependent |
| Failure meaning | R16/R21 |
| Next action | Science review; do not invent cutoffs |
| PHI | none for structural |

#### BCV-032 — Change-interpretation triad (parent)

| Field | Value |
|-------|-------|
| Layer | V10 (+ V2/V3/V9) |
| Parent ID | **BCV-032** |
| Executable subprotocols | **BCV-032A** (P0 Wave 1) · **BCV-032B** (P1 Tier B/C later) |
| Objective | Separate SDC/MDC vs clinically meaningful vs user-perceived change |
| Catalog counting | Counts as **1 parent BCV**; **2 executable subprotocols** |
| Dependencies | ER-BC-13; BCV-020; BCV-030 |
| Failure meaning | R19 |
| Next action | Forbid meaningful-Δ claims below SDC |

#### BCV-032A — Change-Triad Methodology Consistency Audit

| Field | Value |
|-------|-------|
| Layer | V10 |
| Priority | **P0** |
| Wave | **Wave 1** (docs/analysis only; Tier A) |
| Tier | A |
| Objective | Prove the triad is definitionally separated in Wave 1 artifacts; map noise envelopes from BCV-029/030 to SDC-candidate *methodology* (not acceptance numbers) |
| Hypothesis | SDC/MDC, clinical meaningful change, and user-perceived change are non-interchangeable constructs |
| Inputs | Wave 1 noise outputs; frozen triad definitions; ER-BC-13 placeholders |
| Method | Consistency audit + candidate-formula documentation; no empirical clinical anchors required in Wave 1 |
| Metrics | Triad definition checklist; mapped candidate SDC formulas; explicit “unresolved policy” flags |
| Dependencies | ER-BC-13; BCV-029; BCV-030 |
| Acceptance type | structural invariant (definitions) / exploratory (numeric candidates) |
| Failure meaning | Triad collapsed or ambiguous |
| Next action | Keep thresholds unresolved; gate R19 language |
| PHI | none |

#### BCV-032B — Empirical Change-Triad Validation

| Field | Value |
|-------|-------|
| Layer | V10 |
| Priority | **P1** |
| Wave | **Not Wave 1** |
| Tier | B/C |
| Objective | Empirically estimate SDC/MDC vs clinical vs user-perceived change |
| Hypothesis | Empirical thresholds diverge across the triad |
| Inputs | Retest data; optional clinical anchors; perception tasks |
| Method | SEM/SDC/MDC; Bland–Altman; heteroscedasticity; anchor/distribution; perception research |
| Metrics | Triad table (still unresolved as product policy until scientific review) |
| Dependencies | Tier B governance; ER-BC-13; BCV-003/004 |
| Acceptance type | evidence-dependent |
| Failure meaning | R19 |
| Next action | Scientific review before any delta presentation claim |
| PHI | gated |

#### BCV-033 — Score misinterpretation battery

| Field | Value |
|-------|-------|
| Layer | V9 |
| Priority | **P1** (release-critical before limited private pilot display) |
| Tier | Human-subjects as authorized; materials Tier A |
| Objective | Detect dangerous misconceptions listed in §10.3 |
| Hypothesis | Users will infer probability/disease/performance meanings without controls |
| Inputs | Score vignettes; withhold states; dual-score contrasts |
| Method | Forced-choice / open misconception probes |
| Metrics | Misconception endorsement rates; calibration |
| Dependencies | ER-BC-18; BCV-010/019 |
| Acceptance type | evidence-dependent |
| Failure meaning | R8/R9 — release-critical |
| Next action | Language/presentation redesign; keep NO-GO |
| PHI | none for vignettes |

#### BCV-034 — Acute-state sensitivity simulation

| Field | Value |
|-------|-------|
| Layer | V2/V3/V5 |
| Priority | **P0 synthetic methodology** / **P1 empirical** |
| Tier | A / B |
| Wave | **Wave 1** synthetic |
| Objective | Simulate short-term physiologic effects on LM/FFM/ALMI/FFMI → scores |
| Hypothesis | Acute state can move lean constructs without lasting biology |
| Inputs | Candidate acute deltas from ER-BC-16 (magnitudes unresolved) |
| Method | Scenario simulation; artifact vs real-change labeling |
| Metrics | Score/construct Δ; false-improvement rates |
| Dependencies | ER-BC-16; BCV-024 |
| Acceptance type | exploratory / evidence-dependent |
| Failure meaning | R22 |
| Next action | Protocol controls; presentation caution |
| PHI | none for synthetic |

### 22.3 Priority summary

| Priority | Experiments |
|----------|-------------|
| **P0** | 001, 002, 006(struct), 007(struct), 012, 013, 014, 015, 016(sim), 017, 018, 029, 030, 031(struct), **032A**, 034(synth) |
| **P1** | 003, 004, 005, 006(emp), 007(emp), 008, 010, 011, 016(emp), 019, 020, **032B**, 033, 034(emp) |
| **P2** | 009, 021, 022, 023, 024, 027, 028, 031(emp as data allow) |
| **P3** | 025, 026 |

**Catalog count model:** **34 parent BCVs** (BCV-001 … BCV-034) + **2 executable subprotocols** (BCV-032A, BCV-032B). Do not count 032A/032B as additional parents.

---

## 23. WAVE 1 SYNTHETIC EXECUTION CONTRACT

> **Status:** Protocol frozen for independent methodology re-gate.
> **Authorization:** Wave 1 synthetic execution remains **NOT AUTHORIZED** until re-gate **PASS** + explicit WAVE 1 AUTHORIZED decision.
> **Scope:** Tier A synthetic only. **No PHI. No production data. No score-engine changes. No clinical claims. No release-status changes.**

### 23.0 Wave 1 membership (complete P0 set)

| ID | Title | Interpretation class |
|----|-------|----------------------|
| BCV-001 | Mathematical surface stress | structural invariant + exploratory maps |
| BCV-002 | Measurement perturbation | exploratory / evidence-dependent |
| BCV-006 | Structural age fairness | structural invariant |
| BCV-007 | Structural sex fairness | structural invariant + exploratory maps |
| BCV-012 | Sensitivity map | exploratory |
| BCV-013 | Knot/plateau analysis | structural invariant |
| BCV-014 | Floor/ceiling | exploratory |
| BCV-015 | Missingness + Resolver status | structural invariant (reasons) + exploratory rates |
| BCV-016 | Temporal coherence schedules | structural invariant (eligibility) + exploratory rates |
| BCV-017 | Numeric personas | exploratory / qualitative pattern audit |
| BCV-018 | Contribution / adverse-hide | exploratory |
| BCV-029 | Joint correlated measurement error | exploratory / evidence-dependent |
| BCV-030 | Aggregate uncertainty propagation | exploratory / evidence-dependent |
| BCV-031 | Structural intersectional fairness | structural invariant |
| **BCV-032A** | Change-triad methodology consistency audit | structural invariant (definitions) + exploratory candidates |
| BCV-034 | Acute-state sensitivity simulation | exploratory / evidence-dependent |

**Catalog count model (authoritative):**

- **34 parent BCVs** (BCV-001 … BCV-034)
- **+ 2 executable subprotocols** under parent BCV-032: **BCV-032A** (Wave 1 P0), **BCV-032B** (P1 later)
- Wave 1 executes **16 protocols** listed above (includes 032A; excludes 032B)

---

### 23.1 Global engine / identity pins

| Pin | Value |
|-----|-------|
| Health engine version | `body_composition_health_score_draft_v1` |
| Performance-Supporting engine version | `body_composition_performance_supporting_score_draft_v1` |
| Approved implementation SHA | `d940b1616b341e98b19e82f2cd6a6242dfe41691` |
| Mathematical freeze SHA | `e258267d109d1d05e20270f205e5fdb29ae2aca6` |
| Implementation truth-freeze SHA | `3bed6aa6012690737bb5f7455a4397ca6a3bfe64` |
| Score engine mutation | **FORBIDDEN** |

---

### 23.2 Randomness / seed contract

| Item | Frozen rule |
|------|-------------|
| Canonical seed | `20261004` |
| PRNG | IEEE-754 double arithmetic; **mulberry32** (or bit-identical port) when a PRNG is required in JS/TS; document exact library/path in artifact manifest |
| Experiment seed | `seed_exp = (canonical_seed * 1_000_003 + experiment_numeric_id) mod 2^32` |
| Experiment numeric IDs | 001→1 … 034→34; **032A→3201**; **032B→3202** |
| Stream derivation | For substreams (Model A/B, σ multiplier, persona, schedule): `seed_stream = (seed_exp * 1_000_033 + stream_code) mod 2^32` with stream_code documented in manifest |
| Reproducibility | Same code SHA + same manifest + same seeds ⇒ bit-identical numeric tables (within IEEE-754). No arbitrary seeds. |

---

### 23.3 Monte Carlo contract (BCV-002, BCV-029, BCV-030, and any Wave 1 MC)

Deterministic convergence-based Monte Carlo (independent of clinical acceptance):

| Parameter | Frozen value |
|-----------|--------------|
| Minimum draws | `100_000` |
| Checkpoint interval | every `10_000` draws after minimum |
| Hard maximum | `1_000_000` |
| Monitored statistics | median(\|Δscore\|), p95(\|Δscore\|), and for BCV-030 also p05/p95 of score and exploratory threshold-crossing rates at {10,50,90} |
| Convergence rule | At checkpoint *k*, for each monitored statistic *s*: `|s_k − s_{k−1}| ≤ tol_s` **and** estimated Monte Carlo SE for that statistic ≤ `se_tol_s` |
| `tol_median` | `1e-3` score points |
| `tol_p95` | `5e-3` score points |
| `tol_quantile` (BCV-030 score quantiles) | `5e-3` score points |
| `tol_rate` (threshold-crossing rates) | `1e-3` absolute probability |
| `se_tol_median` | `5e-3` |
| `se_tol_p95` | `1e-2` |
| `se_tol_rate` | `2e-3` |
| SE estimator | Batch-means SE using non-overlapping blocks of 10_000 draws |
| Stop | First checkpoint after minimum where **all** monitored stats for that BCV meet tol + se_tol; else continue to hard max and mark `converged=false` |
| Health vs Perf | Run separately with independent streams; both must satisfy their own convergence |

These tolerances are **simulation-estimate precision** rules only — **not** clinical acceptance thresholds.

---

### 23.4 Canonical epsilon policy

Reuse repository score-test numerical convention (`1e-9` in piecewise-linear score tests).

| Symbol | Value | Use |
|--------|-------|-----|
| `EPS_NUM` | `1e-9` | Exact floating-point knot/boundary continuity tests |
| `EPS_SURF` | `1e-4` | Practical surface / finite-difference step on index units (WHtR/FMI/ALMI/FFMI) |
| `EPS_CM` | `1e-3` cm | Practical anthropometry finite-difference on Waist/Height when needed |

Distinguish:

- **numerical epsilon** (`EPS_NUM`) — implementation continuity
- **surface epsilon** (`EPS_SURF` / `EPS_CM`) — local sensitivity geometry
- **physiologic perturbation** — measurement-error / acute-state models (not epsilons)

---

### 23.5 Canonical synthetic domains & grids (BCV-001 / shared)

Synthetic ranges are **computational domains**, not clinical ranges.

#### 23.5.1 Domains

| Variable | Sex | min | max | Notes |
|----------|-----|-----|-----|-------|
| WHtR | both | 0.30 | 0.95 | covers ≤0.40 plateau, knots 0.50/0.60/0.80, upper tail |
| FMI | male | 0.5 | 25.0 | covers H2/P3 male knots |
| FMI | female | 1.0 | 30.0 | covers H2/P3 female knots |
| ALMI | male | 4.0 | 12.0 | covers H3 ALMI male knots |
| ALMI | female | 3.0 | 10.0 | covers H3 ALMI female knots |
| FFMI | male | 14.0 | 24.0 | covers H3/P1 male knots |
| FFMI | female | 12.0 | 21.0 | covers H3/P1 female knots |
| Height_cm | both | 140.0 | 210.0 | structural/size studies |
| Waist_cm | both | 50.0 | 160.0 | with Height ⇒ WHtR domain |
| Age_years (completed) | both | 20 | 90 | adult gate only; no age slope |
| Sex | — | `male` \| `female` | only governed values |

#### 23.5.2 Grid steps

| Region | Step |
|--------|------|
| Coarse global | WHtR `0.01`; FMI `0.25`; ALMI `0.10`; FFMI `0.10` |
| Dense local around every frozen knot | ±`0.05` in index units at step `0.005` (WHtR) or `0.05` (FMI/ALMI/FFMI) |
| Exact knot inclusion | **mandatory** — every frozen knot x must appear exactly |
| Exact ±`EPS_NUM` | include `knot ± EPS_NUM` for continuity |
| Exact ±`EPS_SURF` | include `knot ± EPS_SURF` for practical neighborhood |

#### 23.5.3 Frozen knots (from mathematical / implementation freeze; do not alter)

| Construct | Sex | Knot x values |
|-----------|-----|---------------|
| H1 WHtR | both | 0.40, 0.50, 0.60, 0.80 |
| H2 FMI | male | 2.0, 3.5, 5.5, 9.0, 15.0 |
| H2 FMI | female | 3.5, 5.5, 8.5, 13.0, 21.0 |
| H3 ALMI | male | 6.0, 7.0, 8.0 |
| H3 ALMI | female | 4.5, 5.5, 6.3 |
| H3 FFMI | male | 16.0, 16.7, 18.5 |
| H3 FFMI | female | 14.0, 14.6, 16.0 |
| P1 FFMI | male | 16.0, 16.7, 19.0, 20.5 |
| P1 FFMI | female | 14.0, 14.6, 16.5, 17.5 |
| P3 FMI | male | 2.0, 3.0, 7.0, 10.0, 16.0 |
| P3 FMI | female | 3.5, 5.0, 10.0, 14.0, 22.0 |

#### 23.5.4 Default eligible demographics for surface grids

Unless a BCV overrides:

- `sex` as grid factor
- `dateOfBirth` such that completed UTC years = 30 at `asOf`
- `asOf` = `2026-10-04T12:00:00.000Z`
- all scoring `measuredAt` = `asOf` (same-day eligible)
- Resolver constructs/channels: `resolved` with DXA primary as required; H1 WHtR `who_midpoint_v1` v1
- H3 primary: ALMI when ALMI is the swept lean index; FFMI when FFMI is swept (never invent score-layer fallback)

---

### 23.6 Parameter fallback when ER σ/ρ unavailable

Do **not** invent σ. If ER-BC-01/02/16/17 have not frozen magnitudes at execution start:

| Parameter | Fallback |
|-----------|----------|
| Base σ placeholders | Use **unit-normalized exploratory σ\*** labeled `exploratory_normalized_not_empirical` in manifest |
| σ\* Waist | `1.0` cm |
| σ\* Height | `0.5` cm |
| σ\* FM | `0.25` kg |
| σ\* FFM | `0.25` kg |
| σ\* ALM | `0.20` kg |
| Multipliers (always run) | `0.5×`, `1.0×`, `1.5×`, `2.0×` of the active σ vector |
| ρ grid (Model B) | `{-0.75,-0.50,-0.25,0,+0.25,+0.50,+0.75}` exploratory — **not** empirical estimates |

If ER later supplies magnitudes, re-run with ER values and mark `parameterSource=ER`; keep exploratory runs archived.

---

### 23.7 Noise / covariance models (BCV-002 / BCV-029 / BCV-030)

**Critical joint-Height rule:** one shared `ε_H` per draw applied simultaneously to WHtR, FMI, FFMI, ALMI recomputation.

| Model | Definition | Wave 1 |
|-------|------------|--------|
| **Model A** | Shared Height error; Waist independent; DXA FM/FFM/ALM independent Gaussian (zero-mean) after Height coupling | **REQUIRED** |
| **Model B** | Model A + DXA covariance: apply ρ from frozen ρ grid to (FM,FFM) and (LM/FFM,ALM) pairs as specified in manifest; if ER-BC-17 supplies a covariance, use it **in addition to** the ρ-grid sensitivity labeled exploratory | **REQUIRED** |

Wave 1 runs **both** Model A and Model B. Engineer may not choose only one.

---

### 23.8 BCV-030 interval & threshold contract

**No authorized consumer score bands exist.** Do not use product bands.

Report **all** of:

- central 50%, central 80%, central 90%, central 95% intervals
- mean, SD
- quantiles: p05, p10, p25, p50, p75, p90, p95
- median
- directional-reversal probability (sign of Δscore under noise)
- construct-level contribution to total uncertainty (variance share or absolute |Δ| share)
- **exploratory internal threshold-crossing** at thresholds `{10,20,30,40,50,60,70,80,90}`

These thresholds are **NOT** product bands, health categories, or release thresholds.

---

### 23.9 Artifact + parameter manifest contract

Every Wave 1 BCV MUST emit:

1. Machine-readable results: `JSON` and/or `CSV`
2. Human-readable: Markdown summary
3. Optional plots for surface/grid studies

Every artifact MUST include:

| Field | Required |
|-------|----------|
| experimentId | yes |
| engineVersion(s) | yes |
| implementationSha | yes |
| mathematicalFreezeSha | yes |
| seed / stream seeds | yes |
| parameterManifest | yes |
| runTimestampUtc | yes |
| codeSha | yes |
| resultSummary | yes |
| phi | must be `none` |

#### Canonical parameter manifest schema (planning only — do not implement code yet)

```text
experimentId
engineVersion
implementationSha
mathematicalFreezeSha
seed
inputDomains
gridSteps
epsilon { EPS_NUM, EPS_SURF, EPS_CM }
monteCarloProtocol { min, checkpoint, max, tol*, se_tol*, converged }
noiseParameters { source, sigmaStar?, multipliers, modelA, modelB }
covarianceParameters { rhoGrid?, erSource? }
scheduleId?
personaId?
provenance
notes
```

---

### 23.10 Canonical numeric persona table (BCV-017) — W1-PERSONAS

Synthetic only. **Not** clinical archetypes or normative cutoffs. Internally coherent enough to drive scores.

Shared defaults unless overridden:

- `asOf` = `2026-10-04T12:00:00.000Z`
- all `measuredAt` = `asOf` (S-01)
- Waist protocol `who_midpoint_v1` v1
- DXA channels `resolved`; H3 primary = ALMI unless noted
- Height/Waist/FMI/ALMI/FFMI units: cm / cm / kg·m⁻² / kg·m⁻² / kg·m⁻²

| ID | Sex | Age | Height | Waist | WHtR | FMI | ALMI | FFMI | H3 primary | Qualitative pattern |
|----|-----|-----|--------|-------|------|-----|------|------|------------|---------------------|
| P-01 | male | 30 | 178 | 78 | 0.438 | 4.5 | 8.2 | 19.0 | ALMI | Favorable all |
| P-02 | male | 40 | 175 | 105 | 0.600 | 5.0 | 8.0 | 18.8 | ALMI | High central + favorable lean |
| P-03 | male | 35 | 180 | 80 | 0.444 | 4.0 | 6.2 | 16.2 | ALMI | Favorable adiposity + low lean |
| P-04 | male | 28 | 182 | 92 | 0.505 | 10.0 | 8.5 | 20.8 | ALMI | High FMI + high FFMI |
| P-05 | male | 55 | 170 | 76 | 0.447 | 3.0 | 5.8 | 15.8 | ALMI | Low FMI + low ALMI |
| P-06 | male | 45 | 176 | 102 | 0.580 | 4.8 | 7.8 | 18.5 | ALMI | Discordant high WHtR / favorable FMI |
| P-07 | male | 42 | 176 | 82 | 0.466 | 12.0 | 7.6 | 18.2 | ALMI | Discordant favorable WHtR / high FMI |
| P-08 | male | 60 | 172 | 108 | 0.628 | 11.5 | 6.1 | 16.0 | ALMI | Sarcopenic-obesity-like pattern |
| P-09 | male | 32 | 185 | 100 | 0.541 | 7.5 | 9.0 | 21.0 | ALMI | High muscularity + high central adiposity |
| P-10 | male | 38 | 178 | 98 | 0.551 | 5.2 | 7.5 | 18.0 | ALMI | Low BMI-like composition + high central adiposity |
| P-11 | female | 30 | 165 | 70 | 0.424 | 6.5 | 6.5 | 16.2 | ALMI | Female favorable pattern |
| P-12 | female | 48 | 162 | 95 | 0.586 | 14.0 | 5.2 | 14.8 | ALMI | Female adverse mixed pattern |

For each persona also evaluate Performance-Supporting using P1=FFMI and P3=FMI from the same row.

**Required BCV-017 outputs:** construct scores; aggregates; dominant construct; adverse-hide flag; qualitative pattern match pass/fail with rationale.

---

### 23.11 Temporal schedule catalog (BCV-016) — W1-SCHEDULES

`asOf = 2026-10-04T12:00:00.000Z`. `DAY_MS = 86_400_000`. Timestamps are exact.

Base eligible subject: P-01 demographics/indices with construct inputs as listed; only `measuredAt` / `sourceEventId` vary.

| ID | Definition | Exact timestamps relative to asOf |
|----|------------|-----------------------------------|
| S-01 | Same-day all constructs | all `measuredAt = asOf` |
| S-02 | 30d separation | H1(Waist+Height)=asOf; DXA(H2/H3/P1/P3)=asOf−30d |
| S-03 | 89d separation | H1=asOf; DXA=asOf−89d |
| S-04 | 90d separation | H1=asOf; DXA=asOf−90d |
| S-05 | 90d + 1ms | H1=asOf; DXA=asOf−(90d+1ms) |
| S-06 | 91d | H1=asOf; DXA=asOf−91d |
| S-07 | one input age 179d | all=asOf except Waist=asOf−179d |
| S-08 | 180d | Waist=asOf−180d; others=asOf |
| S-09 | 180d + 1ms | Waist=asOf−(180d+1ms); others=asOf |
| S-10 | H1 fresh + DXA old | H1=asOf; DXA=asOf−120d |
| S-11 | DXA fresh + H1 old | DXA=asOf; H1=asOf−120d |
| S-12 | rolling monthly waist + semiannual DXA | Waist=asOf−30d; Height=asOf−30d; DXA=asOf−180d |
| S-13 | annual DXA + monthly waist | Waist/Height=asOf−30d; DXA=asOf−365d |
| S-14 | same sourceEventId scan constructs | DXA constructs share `sourceEventId="scan-A"` at asOf−10d; Waist=asOf−10d different event |
| S-15 | same timestamp, different sourceEventId | all `measuredAt=asOf−10d` but Waist `sourceEventId="w1"` and DXA `"scan-B"` (gap not forced 0) |

**Required outputs per schedule:** aggregate status; primaryReason; constructReasons; eligibility boolean; era/age gate hit flags.

---

### 23.12 Structural fairness procedure (BCV-006 / 007 / 031)

**Rule:** hold scoring composition inputs identical; vary only the demographic/context dimension under test.

| Study | Hold constant | Vary | Expected structural result |
|-------|---------------|------|----------------------------|
| BCV-006 age | P-01 composition inputs | completed ages {20,30,40,50,60,70,80,90} via DOB | identical scores (adult-eligible) |
| BCV-007 sex | sex-appropriate matched index *z*-positions near mid knots + cross-sex identical raw indices where defined | male/female | document transform differences; not assumed fair |
| BCV-031 age×sex | composition | ages × sexes grid | report cells; adult identity within sex |
| BCV-031 height×sex | FMI/ALMI/FFMI/WHtR fixed; recompute Waist=WHtR×Height | heights {150,160,170,180,190,200} × sex | scores identical when indices fixed |
| BCV-031 BMI-proxy×sex | indices fixed; label BMI bands only as metadata | labels underweight/normal/overweight/obese | **score invariant** (BMI unused) |
| BCV-031 athletic×sex | indices fixed; athletic label metadata | athletic/non-athletic × sex | **score invariant** (label unused) |
| BCV-031 menopause×age | female indices fixed; menopause label metadata | pre/post × ages | **score invariant** (label unused) |
| BCV-031 ethnicity label | indices fixed; ethnicity metadata | label variants | **score invariant** (unused) |
| BCV-031 vendor×site hidden-path | indices fixed; vendor/site metadata only | Hologic/GE × site A/B | **score invariant** (no hidden code-path dependence). Empirical vendor bias = later Tier B/C |

**Outputs:** pairwise score deltas; max |Δ|; invariance pass/fail at `EPS_NUM` for unused-factor tests; tables for sex-transform exploratory contrasts.

---

### 23.13 Per-BCV Wave 1 protocol details

#### BCV-001 — Mathematical surface stress

| Item | Frozen |
|------|--------|
| Domain/grid | §23.5 |
| Method | Evaluate Health and Perf on coarse+dense+knot±EPS grids by sex; H3 ALMI and H3 FFMI sweeps separate |
| Epsilon | EPS_NUM + EPS_SURF |
| Noise | none |
| Seed | N/A (deterministic grid) |
| Outputs | continuity flags; max jump off withhold boundaries; local slopes; floor/ceiling occupancy; NaN/OOR counts (must be 0 for finite eligible inputs) |
| Artifacts | CSV grids + MD summary + optional plots |
| Class | structural invariant (continuity/NaN/OOR); exploratory (maps) |
| PHI | none |

#### BCV-002 — Measurement perturbation

| Item | Frozen |
|------|--------|
| Baseline cases | P-01…P-12 |
| Noise | §23.6–23.7; multipliers 0.5/1/1.5/2.0× |
| Shared Height | mandatory |
| Models | A and B |
| MC | §23.3 |
| Seed | §23.2 |
| Outputs | MAE/median/p90/p95 \|Δ\|; threshold-crossing on exploratory grid; construct contribution |
| Artifacts | JSON/CSV + MD |
| Class | exploratory / evidence-dependent |
| PHI | none |

#### BCV-012 — Sensitivity map

| Item | Frozen |
|------|--------|
| Domains | §23.5 around personas P-01…P-12 and mid-knot centers |
| One-at-a-time | perturb each of WHtR,FMI,ALMI,FFMI by ±EPS_SURF and ±0.01 / ±0.1 as secondary practical steps `{EPS_SURF, 0.01, 0.1}` for WHtR; `{EPS_SURF, 0.1, 0.5}` for FMI/ALMI/FFMI |
| Joint cases | simultaneous ±EPS_SURF on all indices; Model A unit noise single draw set seed-fixed n=10_000 diagnostic (non-convergent diagnostic stream `stream_code=12`) |
| Finite difference | central difference where possible: `(f(x+h)-f(x-h))/(2h)` |
| Outputs | local slope; normalized sensitivity `\|slope\|·scale`; dominant construct; aggregate delta |
| Artifacts | CSV + MD + optional heatmaps |
| Class | exploratory |
| PHI | none |

#### BCV-013 — Knot / plateau

| Item | Frozen |
|------|--------|
| Knots/plateaus | §23.5.3; H1 plateau x≤0.40; FMI mid plateaus per freeze |
| Epsilon | left/right at knot±EPS_NUM and knot±EPS_SURF |
| Outputs | left value; knot value; right value; left slope; right slope; discontinuity delta (`|left-right|` across EPS_NUM); plateau width |
| Continuity invariant | discontinuity delta ≤ 1e-6 score points at EPS_NUM neighborhood for continuous transforms |
| Class | structural invariant |
| PHI | none |

#### BCV-014 — Floor / ceiling

| Item | Frozen |
|------|--------|
| Sampling | full §23.5 coarse grids by sex for Health and Perf |
| Exact floor | score `== 0` |
| Exact ceiling | score `== 100` |
| Near floor | `0 < score ≤ 5` |
| Near ceiling | `95 ≤ score < 100` |
| Outputs | % exact floor; % near floor; % exact ceiling; % near ceiling; histogram edges `[0,5,10,…,100]` + quantiles p05…p95 |
| Note | near band width 5 is exploratory analysis only — **not** a release threshold |
| Class | exploratory |
| PHI | none |

#### BCV-015 — Missingness / Resolver

| Item | Frozen |
|------|--------|
| Matrix | each core construct missing alone + all pairs + all three (Health) / both (Perf); Resolver statuses `{resolved, resolved_with_supporting, multiple_valid, policy_not_frozen, conflict, insufficient, undated_only, unsupported}` applied per construct |
| Outputs | status; primaryReason; constructReasons; match to freeze precedence |
| Class | structural invariant on reasons; exploratory on rates |
| PHI | none |

#### BCV-016 — Schedules

| Item | Frozen |
|------|--------|
| Catalog | S-01…S-15 exact (§23.11) |
| Outputs | eligibility; reasons; gate flags |
| Class | structural invariant |
| PHI | none |

#### BCV-017 — Personas

| Item | Frozen |
|------|--------|
| Table | P-01…P-12 (§23.10) |
| Outputs | scores; contributions; pattern audit |
| Class | exploratory |
| PHI | none |

#### BCV-018 — Contribution / adverse-hide

| Item | Frozen |
|------|--------|
| Cases | P-01…P-12 + synthetic adverse-hide set: each construct set to low-tail while others mid-plateau (exact index picks: H1=0.70, H2 male FMI=12 / female=16, H3 ALMI male=6.2 / female=4.7, with other constructs at mid favorable knots) |
| Metrics | absolute contribution; marginal contribution; dominant; adverse-hide boolean if any construct < 40 while aggregate ≥ 70 |
| Class | exploratory |
| PHI | none |

#### BCV-029 — Correlated error

| Item | Frozen |
|------|--------|
| Models | A and B required |
| ρ grid | §23.6 |
| MC | §23.3 |
| Baselines | P-01…P-12 |
| Outputs | joint vs independent-height ablation (independent-height ablation is diagnostic only and must be labeled non-compliant vs production methodology); p90/p95; construct shares |
| Class | exploratory / evidence-dependent |
| PHI | none |

#### BCV-030 — Uncertainty propagation

| Item | Frozen |
|------|--------|
| Chain | measurement→index→construct→aggregate |
| Intervals/quantiles/thresholds | §23.8 |
| MC | §23.3 |
| Models | A and B |
| Product bands | **none** |
| Class | exploratory / evidence-dependent |
| PHI | none |

#### BCV-031 — Intersectional structural fairness

| Item | Frozen |
|------|--------|
| Procedure | §23.12 |
| Outputs | invariance tables; max \|Δ\| |
| Class | structural invariant |
| PHI | none |

#### BCV-032A — Change-triad methodology audit

| Item | Frozen |
|------|--------|
| Method | Docs/analysis using BCV-029/030 envelopes; define candidate SDC formulas; assert triad non-equivalence in text+tables |
| Must produce | triad checklist; candidate SDC from SEM-style mapping; explicit unresolved flags for clinical and user-perceived thresholds |
| Must not | freeze acceptance numbers; run Tier B |
| Class | structural invariant (definitions) + exploratory (candidates) |
| PHI | none |

#### BCV-034 — Acute-state simulation

| Item | Frozen |
|------|--------|
| Baseline | P-01, P-08, P-11, P-12 |
| Scenario matrix (multipliers on ER-BC-16 placeholders; if unavailable use normalized exploratory deltas below) | see table |
| Exploratory default deltas (labeled non-empirical) | FFM ±{0.5,1.0,1.5} kg; ALM ±{0.3,0.6,0.9} kg; optional Waist ±{1,2} cm; Weight metadata only (non-scoring) ±{0.5,1.0,1.5} kg |
| Scenarios | hydration↑; hydration↓; glycogen↑; glycogen↓; recent exercise; illness/inflammation; edema; menstrual-phase (female baselines only); morning vs evening TOD label (metadata + apply TOD delta set = hydration↓ exploratory) |
| Outputs | construct/aggregate Δ; false-improvement rate vs baseline; artifact-vs-biology label column |
| Class | exploratory / evidence-dependent |
| PHI | none |

---

### 23.14 Zero-ambiguity table (Wave 1 P0)

| BCV | Exact input domain | Grid/MC | Epsilon | Noise model | Seed | Dependencies | Outputs | Artifact | Interpretation class | PHI |
|-----|--------------------|---------|---------|-------------|------|--------------|---------|----------|----------------------|-----|
| 001 | §23.5 | grid | NUM+SURF | none | N/A | freeze SHAs | continuity/slopes/occupancy | CSV+MD(+plots) | structural+exploratory | none |
| 002 | personas | MC §23.3 | n/a | A+B + σ multipliers | §23.2 | ER-01/02/17 or fallback | \|Δ\| quantiles; crossings | JSON/CSV+MD | exploratory/evid-dep | none |
| 006 | P-01 ages | grid ages | NUM | none | N/A | adult gate | invariance Δ | CSV+MD | structural | none |
| 007 | sex grids | grid | NUM+SURF | none | N/A | sex transforms | dist/floor/sens | CSV+MD | structural+exploratory | none |
| 012 | personas+knots | FD steps | SURF | diagnostic n=10k | §23.2 | 001 | slopes/sens/dominant | CSV+MD(+plots) | exploratory | none |
| 013 | knots | knot±eps | NUM+SURF | none | N/A | freeze knots | L/K/R values&slopes | CSV+MD | structural | none |
| 014 | §23.5 coarse | grid | n/a | none | N/A | 001 | floor/near/ceil % | CSV+MD | exploratory | none |
| 015 | missing×status | combinatorial | n/a | none | N/A | reason freeze | reasons/status | JSON+MD | structural+exploratory | none |
| 016 | S-01…S-15 | schedule catalog | n/a | none | N/A | recency freeze | eligibility/reasons | JSON+MD | structural | none |
| 017 | P-01…P-12 | persona table | n/a | none | N/A | — | scores/patterns | JSON+MD | exploratory | none |
| 018 | personas+hide set | fixed cases | n/a | none | N/A | weights freeze | contributions/hide | JSON+MD | exploratory | none |
| 029 | personas | MC §23.3 | n/a | A+B + ρ grid | §23.2 | ER-17 or fallback | joint vs ablation; tails | JSON/CSV+MD | exploratory/evid-dep | none |
| 030 | personas | MC §23.3 | n/a | A+B | §23.2 | 029 | intervals/quantiles/thresholds | JSON/CSV+MD | exploratory/evid-dep | none |
| 031 | §23.12 | structural grids | NUM | none | N/A | 006/007 | invariance tables | CSV+MD | structural | none |
| 032A | 029/030 outputs | analysis | n/a | inherited | inherits | ER-13 | triad checklist+candidates | MD+JSON | structural+exploratory | none |
| 034 | P-01/08/11/12 | scenario matrix | n/a | acute deltas | §23.2 | ER-16 or fallback | Δscore; false-improve | JSON+MD | exploratory/evid-dep | none |

---

### 23.15 Engineer-choice audit (must all be NO)

| Choice | Remaining? |
|--------|------------|
| N / stopping rule | **NO** — §23.3 |
| Seed / PRNG | **NO** — §23.2 |
| Domain / grid / step | **NO** — §23.5 |
| Epsilon | **NO** — §23.4 |
| Persona values | **NO** — §23.10 |
| Schedules | **NO** — §23.11 |
| Covariance mode | **NO** — both A and B + ρ grid |
| Interval set | **NO** — §23.8 |
| Threshold set | **NO** — exploratory 10…90; no product bands |
| Output metrics | **NO** — per-BCV |
| Artifacts / manifest | **NO** — §23.9 |
| Parameter fallback | **NO** — §23.6 |

If any answer becomes YES after review, Wave 1 zero-ambiguity is **not** closed.

---

### 23.16 Wave 1 authorization gate

```text
independent methodology re-gate PASS
        ↓
explicit WAVE 1 AUTHORIZED decision (separate)
        ↓
only then may synthetic execution begin under this contract
```

**This document does not authorize Wave 1.**

---

## 24. Wave 2 (Tier B) — still blocked

Empirical retest, repeated Waist, longitudinal, cross-platform, known-groups, correlations — only after privacy/re-id governance + ER-BC-15 + separate authorization.

BCV-032B is **P1 / Tier B–C**, not Wave 1.

---

## 25. Evidence review catalog (ER-BC-01 … ER-BC-18)

Every ER includes: question; why needed; scope; evidence types; output needed; what decision it may inform; what it may **NOT** prove.

| ID | Question | Why needed | Scope | Evidence types | Output needed | May inform | May NOT prove |
|----|----------|------------|-------|----------------|---------------|------------|---------------|
| ER-BC-01 | DXA precision/repeatability | Noise/SDC baselines | FM/FFM/ALM | Lit + vendor docs | σ/SEM candidates | V2/V5; §23.6 | Clinical validity |
| ER-BC-02 | Waist WHO-midpoint repeatability | H1 noise | Protocol error | Lit + methods | σ_waist candidates | BCV-002 | Clinical meaning |
| ER-BC-03 | FMI/ALMI health-outcome association | Construct support | Health externals | Epidem. lit | Association map | V6/V11 | Causality |
| ER-BC-04 | FFMI/performance association | Perf construct | Strength/function | Lit | Association map | V6/V11 | Sport prediction |
| ER-BC-05 | DXA vendor comparability | One-function scoring | Hologic/GE/other | Bridging studies | Bias/LoA | V5/R2 | Interchangeability assumption |
| ER-BC-06 | Index precision after height propagation | Joint Height | FMI/ALMI/FFMI/WHtR | Methods + ER-01/02 | Propagated σ | BCV-029/030 | UI intervals |
| ER-BC-07 | Clinically meaningful BC change | Triad B | Clinical anchors | Lit | CMC candidates | BCV-032B | Product MMC freeze |
| ER-BC-08 | Sarcopenia constructs vs H3 | Lean adequacy meaning | ALMI/FFMI lit | Consensus defs | Construct map | V6/V7 | Clinical sarcopenia diagnosis |
| ER-BC-09 | BC ↔ cardiometabolic outcomes | Longer-term Health | Outcomes | Cohorts | Association map | V11 | Predictive product claim |
| ER-BC-10 | Age-related change vs age-invariant score | Age fairness | Aging lit | Lit | Defensibility brief | BCV-006 | Formula change authorization |
| ER-BC-11 | Sex-specific reference limitations | Sex fairness | FMI/FFMI/ALMI | Lit | Fairness caveats | BCV-007 | Automatic fairness |
| ER-BC-12 | Ethnicity omission bias | Fairness | Population lit | Lit/datasets | Bias hypotheses | BCV-021 | Ethnicity injection now |
| ER-BC-13 | SDC/MDC vs clinical vs user-perceived | Change triad | All three | Lit + methods | Triad framework | BCV-032A/B | Interchangeable thresholds |
| ER-BC-14 | Prediction/calibration methodology | V11 controls | Prognostic methods | Methods lit | Study checklist | Future predictive studies | Current predictive claim |
| ER-BC-15 | Re-identification + private validation governance | Tier B safety | Privacy | Governance + risk methods | Tier B checklist | Tier B auth | That de-id = anonymous |
| ER-BC-16 | Acute-state effects on DXA lean/indices | Artifact vs biology | Hydration etc. | Lit | Acute delta candidates | BCV-034 | That Δscore = remodeling |
| ER-BC-17 | Correlated anthropometric/index error | Joint model magnitudes | Height+DXA cov | Methods lit | σ/ρ candidates | BCV-029 | Independent-noise sufficiency |
| ER-BC-18 | Score/numeracy misinterpretation | Misconception battery | Consumer cognition | HCI/health lit | Probe set | BCV-033 | That UI copy alone is enough |

---

## 26. Clinical / regulatory boundary

Not currently validated to: diagnose disease; predict individual medical events; replace clinician judgment; prescribe treatment; identify sarcopenia clinically; diagnose obesity; determine athlete readiness.

Synthetic tests ≠ clinical validation. Correlation ≠ clinical validation. Internal user testing ≠ necessarily clinical validation. Exact-Math PASS ≠ clinical validation.

---

## 27. Decision tree after validation

```text
if strongly supports current model → scientific release review (still not consumer auth)
if minor calibration issue → scientific V2 planning (draft_v1 unchanged until review)
if structural bias → remain NO-GO; redesign required
if insufficient data → remain Level 0 internal experimental
```

No path auto-authorizes consumer integration or public scores. Synthetic alone cannot advance to Level 1.

---

## 28. End-state of this Wave 1 zero-ambiguity correction

| Item | Status |
|------|--------|
| Private validation plan methodology | **COMPLETE / PENDING INDEPENDENT RE-GATE** |
| Wave 1 zero-ambiguity | **CLOSED in docs** (pending independent confirmation) |
| Wave 1 execution | **NOT AUTHORIZED** |
| Tier B | **NOT AUTHORIZED** |
| Validation execution | **NOT STARTED** |
| Clinical validation | **NOT ESTABLISHED** |
| Consumer integration | **NOT AUTHORIZED** |
| Public Health / Performance-Supporting | **NO-GO** |

**Next action:** open a **new independent methodology reviewer** against the new SHA focusing on Wave 1 zero-ambiguity, catalog consistency, decision-register count, numeric personas, schedules, MC/grid/epsilon, covariance default, interval/threshold handling, and BCV-032A/B membership. Only after **PASS** + explicit **WAVE 1 AUTHORIZED** may synthetic execution begin.

---

END OF PRIVATE / INTERNAL VALIDATION PLAN V1 (WAVE 1 ZERO-AMBIGUITY CORRECTION)
