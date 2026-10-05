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
| Methodology status | **COMPLETE / PENDING FINAL BCV-015 RE-GATE** |
| Wave 1 execution | **BLOCKED** |
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
| Validation plan methodology | **COMPLETE / PENDING FINAL BCV-015 RE-GATE** |
| Wave 1 synthetic execution | **BLOCKED** |
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
| DXA FM / FFM / ALM | Test–retest; Wave 1 covariance pairs frozen in §23.7 (FM↔FFM, FFM↔ALM only) |
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
| FFM ↔ ALM | Wave 1 Model B Pair 2 (canonical; LM↔ALM forbidden) |
| Repeated-scan components | Same-session component correlation |

Covariance magnitudes remain **evidence-review dependent** (ER-BC-17). Methodology requires the joint model; numbers are not frozen here.

### 3.5 Monte Carlo protocol

For each synthetic subject (biology fixed):

1. Draw joint measurement-error vector per §23.2–§23.7 (shared Height; Model A independent DXA components; Model B FM↔FFM and FFM↔ALM only).
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

Health: H1 / H2 / H3. Performance-Supporting: P1 / P3. `dominantAdverseConstruct` (§23.17.1); adverse non-hiding; change attribution; withhold-reason translatability (internal).

### 10.2 Contribution analysis (authoritative formulas → §23.17.1)

Wherever BCV-012 / BCV-017 / BCV-018 (or any Wave 1 protocol) requests contribution outputs, use **only** the §23.17.1 definitions:

- `absoluteContribution`
- `marginalContributionPerConstructPoint`
- `weightedDeficit`
- `dominantAdverseConstruct`
- `changeContribution`

Vague phrases such as “contribution analysis”, “marginal effect”, or “dominant contribution” are **non-operative** unless mapped to those equations.

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
| `directionalReversalProbability` | Exact two-replicate protocol → §23.17.2 |
| `varianceContribution` / `constructUncertaintyShare` | Covariance-aware allocation → §23.17.3 |

**Do NOT freeze:** consumer interval width; confidence label; final UI; product bands. Internal analysis only.

### 11.3 Change triad (NOT interchangeable)

| Concept | Meaning | Wave 1 formula authority |
|---------|---------|--------------------------|
| **A. SDC / MDC** | Measurement-error-derived smallest detectable change | **BCV-032A only** → §23.17.6 (`SEM_diff`, `SDC95_individual`; `MDC95` alias) |
| **B. Clinically meaningful change** | Change tied to clinically meaningful outcome or accepted external standard | **NO Wave 1 formula** — evidence-dependent unresolved |
| **C. User-perceived meaningful change** | Change a user can meaningfully perceive / understand / value | **NO Wave 1 formula** — evidence-dependent unresolved |

Final numeric thresholds remain **unresolved** (ER-BC-13). Presenting score changes below SDC/MDC as “meaningful” is a **hard release blocker**. BCV-032A must prove A/B/C remain separate and must not manufacture clinical/user thresholds.

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
| Metrics | ∂score/∂index; §23.17.1 contribution fields |
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
| Hypothesis | Aggregates explainable via §23.17.1 contributions + §23.17.7 directional relations |
| Inputs | Canonical numeric persona table W1-PERSONAS (P-01…P-12) |
| Method | Score + §23.17.1 contribution fields + §23.17.7 relation audit |
| Metrics | Relation pass rate; adverse-hide flags; `dominantAdverseConstruct` |
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
| Method | §23.17.1 contribution fields only |
| Metrics | Hide rate; `dominantAdverseConstruct` map |
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
| Objective | Enforce shared Height error into WHtR/FMI/FFMI/ALMI; run Model A (independent DXA) and Model B (FM↔FFM + FFM↔ALM only) |
| Hypothesis | Independent-per-index height noise **underestimates** aggregate uncertainty; Model A ≠ Model B@ρ=0 |
| Inputs | Joint error vector; candidate σ/ρ from ER-BC-17 (placeholders marked unresolved) |
| Method | Monte Carlo with **one ε_H**; Model A independent FM/FFM/ALM; Model B exact §23.7 correlated construction |
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
| Metrics | Distribution; median/mean/SD; central 50/80/90/95%; p05–p95; exploratory threshold-crossing {10…90}; `directionalReversalProbability` (§23.17.2); `constructUncertaintyShare` (§23.17.3); no product bands |
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
| Method | Consistency audit + §23.17.6 candidate-formula documentation; no empirical clinical anchors required in Wave 1 |
| Metrics | Triad definition checklist; `SEM_diff` / `SDC95_individual` / `MDC95` alias mapping; explicit unresolved clinical/user-perceived flags |
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
| Metrics | Score/construct Δ; `falseImprovementIndicator` / `falseImprovementRate` (§23.17.8) |
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
| BCV-017 | Numeric personas | exploratory / directional-relation audit (§23.17.7) |
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

### 23.2 Randomness / seed / PRNG / Gaussian contract

| Item | Frozen rule |
|------|-------------|
| Canonical seed | `20261004` |
| PRNG | **mulberry32** only (bit-identical port permitted; no platform RNG; no library Normal) |
| uint32 → (0,1) map | If mulberry32 emits unsigned 32-bit `x ∈ {0,…,2^32−1}`, then **`u = (x + 0.5) / 4294967296`** ⇒ always `0 < u < 1` |
| Forbidden maps | `x/2^32`, `(x+1)/2^32`, `Math.random()`, library-specific normalization |
| Gaussian transform | **Marsaglia polar method only** |
| Polar input map | For each open-unit `u`: `p = 2*u − 1` ⇒ `−1 < p < 1` |
| Polar rejection | `p1=2*u1−1`, `p2=2*u2−1`, `s=p1²+p2²`; reject if `s==0` OR `s>=1`; else `m=sqrt(−2*ln(s)/s)`; `z1=p1*m`, `z2=p2*m` |
| Cache order | Return `z1` first; cache `z2`; next Gaussian request consumes cached `z2` **before** drawing any new uniforms |
| Reproducibility | Same code SHA + same manifest + same seeds ⇒ bit-identical tables (IEEE-754). No arbitrary seeds. |

#### 23.2.1 Frozen stream-code table

| Protocol | streamCode |
|----------|------------|
| BCV-001 | 1 |
| BCV-002 | 2 |
| BCV-006 | 6 |
| BCV-007 | 7 |
| BCV-012 | 12 |
| BCV-013 | 13 |
| BCV-014 | 14 |
| BCV-015 | 15 |
| BCV-016 | 16 |
| BCV-017 | 17 |
| BCV-018 | 18 |
| BCV-029 | 29 |
| BCV-030 | 30 |
| BCV-031 | 31 |
| BCV-032A | 3201 |
| BCV-034 | 34 |

#### 23.2.2 Seed derivation (integer arithmetic only)

```text
derivedSeed =
  canonicalSeed
  + experimentStreamCode * 1_000_000
  + personaIndex * 10_000
  + sigmaIndex * 1_000
  + rhoIndex * 100
  + modelIndex * 10
  + substreamIndex
```

| Index | Order |
|-------|-------|
| `personaIndex` | P-01→0 … P-12→11; structural-only runs use `0` |
| `sigmaIndex` | `0.5×→0`, `1.0×→1`, `1.5×→2`, `2.0×→3`; non-noise runs use `0` |
| `rhoIndex` | Model A uses `0`; Model B uses ρ grid order `{-0.75,-0.50,-0.25,0,+0.25,+0.50,+0.75}` → `0…6` |
| `modelIndex` | Model A→0; Model B→1; non-noise→0 |
| `substreamIndex` | Health→0; Perf→1; directional-reversal pairs → §23.17.2 (`scoreBase + 2k` / `+1`); other fixed substreams as declared per BCV (default `0`) |

No hashed/string-derived seeds.

#### 23.2.3 Canonical per-observation Gaussian draw order

Unless an experiment does not require a variable, every Monte Carlo observation draws standardized normals in this exact order (cached Marsaglia values remain in the **same** stream and are consumed before new uniforms):

1. Height error (`z_Height`)
2. FM error source (`z_FM`)
3. FFM independent/error source (`z_FFM_ind` for Model B; independent `z_FFM` for Model A)
4. ALM independent/error source (`z_ALM_ind` for Model B; independent `z_ALM` for Model A)
5. Waist error (`z_Waist`)
6. Any experiment-specific additional stochastic term only if that experiment’s protocol explicitly lists a substream order

Do **not** skip a required canonical draw conditionally based on outcome.

Then scale by active σ\* × multiplier and apply shared-Height propagation into indices.

---

### 23.3 Monte Carlo contract (BCV-002, BCV-029, BCV-030)

| Parameter | Frozen value |
|-----------|--------------|
| Minimum draws | `100_000` |
| Checkpoint interval | every `10_000` draws after minimum |
| Hard maximum | `1_000_000` |
| Monitored statistics | `median(|Δscore|)`, `p95(|Δscore|)`, and **each** exploratory threshold-crossing probability at `{10,20,30,40,50,60,70,80,90}` (Health and Perf separately) |
| Batch-means scheme | At each checkpoint, take the largest prefix of accumulated draws divisible by 20; split into **exactly 20** contiguous equal batches; compute each monitored statistic per batch |
| Batch sample SD | With batch estimates `y_1…y_20`: `y_bar = sum(y_i)/20`; variance `= sum((y_i−y_bar)²)/(20−1)` ⇒ divisor **19**; `sampleSD = sqrt(variance)` |
| Batch-means SE | `sampleSD / sqrt(20)` — **not** population divisor 20 |
| Quantile estimator | **Hyndman–Fan Type 7** for all of median/p05/p10/p25/p50/p75/p90/p95 and batch-level quantiles (see §23.3.1) |
| Median | `Q(0.5)` via the **same** Type 7 function |
| Checkpoint delta | Absolute difference vs **immediately preceding** checkpoint estimate only (no moving average): `|Q_t(0.5)−Q_{t−1}(0.5)|`, `|Q_t(0.95)−Q_{t−1}(0.95)|`, and absolute rate deltas |
| `tol_median` | `0.01` score points |
| `tol_p95` | `0.02` score points |
| `se_tol_median` | `0.02` score points |
| `se_tol_p95` | `0.05` score points |
| `tol_rate` | `0.001` absolute probability |
| `se_tol_rate` | `0.001` absolute probability |
| Stop rule | **Two consecutive checkpoints** must satisfy all tol + SE criteria for all monitored stats |
| Hard-max behavior | stop; `converged=false`; report final estimates and SEs |
| Health vs Perf | separate streams (`substreamIndex` 0/1); each must converge independently |

These are **numerical simulation convergence tolerances only** — not clinical thresholds, release criteria, or meaningful-change cutoffs.

#### 23.3.1 Hyndman–Fan Type 7 (authoritative)

For sorted zero-based values `x[0] ≤ … ≤ x[n−1]` and `p ∈ [0,1]`:

```text
h = (n - 1) * p
j = floor(h)
g = h - j
if j >= n - 1:
  Q(p) = x[n - 1]
else:
  Q(p) = (1 - g) * x[j] + g * x[j + 1]
```

Forbidden: nearest-rank; Type 1; library-default quantile ambiguity.

---

### 23.4 Canonical epsilon policy

| Symbol | Value | Use |
|--------|-------|-----|
| `EPS_NUM` | `1e-9` | Exact floating-point knot/boundary continuity tests |
| `EPS_SURF` | `1e-4` | Practical surface / finite-difference step on index units |
| `EPS_CM` | `1e-3` cm | Practical anthropometry finite-difference when needed |

---

### 23.5 Canonical synthetic domains (shared)

Synthetic ranges are **computational domains**, not clinical ranges.

| Variable | Sex | min | max | DOMAIN_RANGE |
|----------|-----|-----|-----|--------------|
| WHtR | both | 0.30 | 0.95 | 0.65 |
| FMI | male | 0.5 | 25.0 | 24.5 |
| FMI | female | 1.0 | 30.0 | 29.0 |
| ALMI | male | 4.0 | 12.0 | 8.0 |
| ALMI | female | 3.0 | 10.0 | 7.0 |
| FFMI | male | 14.0 | 24.0 | 10.0 |
| FFMI | female | 12.0 | 21.0 | 9.0 |
| Height_cm | both | 140.0 | 210.0 | 70.0 |
| Waist_cm | both | 50.0 | 160.0 | 110.0 |

#### 23.5.1 Grid steps (1D sweeps / knot neighborhoods)

| Region | Step |
|--------|------|
| Coarse global | WHtR `0.01`; FMI `0.25`; ALMI `0.10`; FFMI `0.10` |
| Dense local around every frozen knot | ±`0.05` at step `0.005` (WHtR) or `0.05` (FMI/ALMI/FFMI) |
| Exact knot inclusion | mandatory |
| Exact ±`EPS_NUM` / ±`EPS_SURF` | mandatory |

#### 23.5.2 Frozen knots

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

#### 23.5.3 BCV-001 geometry (NOT full factorial)

BCV-001 is:

1. **Independent 1D sweeps** through each scoring transform (vary ONE input; hold companions at §23.5.4 references). Dense-local knot neighborhoods (§23.5.1) apply to **1D diagnostics only**.
2. **Deterministic 2D aggregate surfaces** with **both** governed H3 pathways (do not collapse H3):

| Surface ID | Axes | H3 Resolver primary | Non-varied construct |
|------------|------|---------------------|----------------------|
| `HEALTH_H1_H2` | H1 × H2 | n/a | H3 at sex reference (ALMI primary) |
| `HEALTH_H1_H3_ALMI` | H1 × H3 | **ALMI** | H2 at sex reference |
| `HEALTH_H1_H3_FFMI` | H1 × H3 | **FFMI** | H2 at sex reference |
| `HEALTH_H2_H3_ALMI` | H2 × H3 | **ALMI** | H1 at sex reference |
| `HEALTH_H2_H3_FFMI` | H2 × H3 | **FFMI** | H1 at sex reference |
| `PERFORMANCE_P1_P3` | P1 × P3 | n/a | n/a |

3. **No 3D Health cube** in Wave 1

**2D axis construction (authoritative — no executor step choice):**

```text
canonicalAxisGrid(variable) =
  sorted unique union of:
    1. every canonical COARSE grid point for that variable from §23.5.1
       (WHtR step 0.01; FMI step 0.25; ALMI step 0.10; FFMI step 0.10)
       over the §23.5 domain for the sex under test;
    2. every exact mathematical knot for that variable inside that domain (§23.5.2);
    3. knot - EPS_SURF when that point is inside the domain;
    4. knot + EPS_SURF when that point is inside the domain.

2D surface(x,y) = Cartesian product:
  canonicalAxisGrid(x) × canonicalAxisGrid(y)
```

Applies to **all six** Surface IDs. **Do NOT** use dense-local grids across the entire 2D surface.

These Surface IDs **must** appear in future artifacts.

1D: H3 ALMI sweep ⇒ Resolver primary ALMI; H3 FFMI sweep ⇒ Resolver primary FFMI. Perf requires P1 FFMI.

#### 23.5.4 BCV-001 companion reference anchors (validation-only)

| Sex | WHtR | FMI | ALMI | FFMI |
|-----|------|-----|------|------|
| male | 0.50 | 5.5 | 8.0 | 19.0 |
| female | 0.50 | 8.5 | 6.3 | 16.5 |

Not normative targets.

Default demographics unless overridden: completed age 30 at `asOf=2026-10-04T12:00:00.000Z`; all `measuredAt=asOf`; Resolver `resolved`; Waist protocol `who_midpoint_v1` v1.

---

### 23.6 Parameter fallback when ER σ/ρ unavailable

| Parameter | Fallback |
|-----------|----------|
| Label | `exploratory_normalized_not_empirical` |
| σ\* Waist | `1.0` cm |
| σ\* Height | `0.5` cm |
| σ\* FM | `0.25` kg |
| σ\* FFM | `0.25` kg |
| σ\* ALM | `0.20` kg |
| Multipliers | `0.5×`, `1.0×`, `1.5×`, `2.0×` |
| ρ grid (Model B) | `{-0.75,-0.50,-0.25,0,+0.25,+0.50,+0.75}` exploratory — **not** empirical |

If ER later supplies magnitudes, re-run with `parameterSource=ER`; archive exploratory runs.

---

### 23.7 Noise / covariance models (BCV-002 / BCV-029 / BCV-030)

**Critical joint-Height rule:** one shared `ε_H` per draw applied simultaneously to WHtR, FMI, FFMI, ALMI recomputation.

Wave 1 runs **both** Model A and Model B. They are **conceptually and operationally distinct**.

#### 23.7.1 Model A — independent DXA component errors

| Rule | Frozen |
|------|--------|
| Shared Height | yes — applies across WHtR/FMI/FFMI/ALMI |
| FM | independent `z_FM` |
| FFM | independent `z_FFM` |
| ALM | independent `z_ALM` |
| Waist | independent unless another frozen Wave 1 rule applies |
| DXA covariance | **none** |
| Synthetic correlations | `corr(FM,FFM)=0`, `corr(FFM,ALM)=0` by construction |

**Do NOT implement Model A as Model B with `rho=0`.**

#### 23.7.2 Model B — correlated pairs (ONLY these)

| Pair | Variables |
|------|-----------|
| Pair 1 | **FM ↔ FFM** |
| Pair 2 | **FFM ↔ ALM** |

**Forbidden:** LM↔ALM; optional/free-form pair lists; alternate covariance matrices.

Rho application:

- One Model-B run = `persona × sigmaMultiplier × one rho`
- The **same** ρ applies to **both** pairs
- ρ sweep is exploratory, not empirical

Exact construction:

```text
z_FM = independent standard normal
z_FFM_ind = independent standard normal
z_ALM_ind = independent standard normal
z_FFM = rho * z_FM + sqrt(1 - rho^2) * z_FFM_ind
z_ALM = rho * z_FFM + sqrt(1 - rho^2) * z_ALM_ind
```

Expected:

```text
corr(FM,FFM) = rho
corr(FFM,ALM) = rho
corr(FM,ALM) = rho^2
```

Document `corr(FM,ALM)=rho^2` in artifacts.

---

### 23.8 BCV-030 interval & threshold contract

Report **all** of: central 50/80/90/95%; mean; SD; p05,p10,p25,p50,p75,p90,p95 via Type 7; median=`Q(0.5)`; `directionalReversalProbability` (§23.17.2); `varianceContribution` / `constructUncertaintyShare` (§23.17.3); exploratory threshold-crossing at `{10,20,…,90}`.

**No product bands.**

---

### 23.9 Artifact + manifest + root contract

Every Wave 1 protocol MUST output:

1. `results.json`
2. `summary.md`
3. `manifest.json` (one per experiment execution)

Additionally, grid/surface/table protocols MUST output `results.csv`.

Plots (PNG/SVG) MAY be emitted but are **not** source of truth; if generated they must be listed in `artifactFiles`.

**Future artifact root (planning only — do not create now):**

```text
validation/body-composition/dual-score/wave1/<experiment-id>/<run-id>/
```

#### 23.9.1 Required top-level `manifest.json` schema

All keys are **REQUIRED**. Values may be `null` only where the experiment does not use that field. **Do not omit keys.**

```text
schemaVersion
experimentId
protocolId
runId
engineVersion
implementationSha
mathematicalFreezeSha
validationPlanSha
validationCodeSha
createdAtUtc
seed
streamCode
inputDomains
gridSteps
epsilon
monteCarloProtocol
noiseParameters
covarianceParameters
scheduleId
personaId
parameterProvenance
artifactFiles
interpretationClass
phiStatus
notes
```

#### 23.9.2 Fixed / enum values

| Field | Frozen value / rule |
|-------|---------------------|
| `schemaVersion` | `"body_composition_dual_score_wave1_manifest_v1"` |
| `phiStatus` | `"synthetic_no_phi"` |
| `interpretationClass` | exactly one of `"structural_invariant"` \| `"exploratory"` \| `"evidence_dependent_acceptance"` |
| `createdAtUtc` | informational artifact-generation timestamp only — **must not** influence analysis or reproducibility |

#### 23.9.3 `monteCarloProtocol` object

If Monte Carlo unused: `monteCarloProtocol = null`.

If used, require **exactly**:

```json
{
  "minimumDraws": 100000,
  "maximumDraws": 1000000,
  "checkpointEvery": 10000,
  "batchCount": 20,
  "requiredConsecutivePasses": 2,
  "medianDeltaTolerance": 0.01,
  "p95DeltaTolerance": 0.02,
  "medianSeTolerance": 0.02,
  "p95SeTolerance": 0.05,
  "rateDeltaTolerance": 0.001,
  "rateSeTolerance": 0.001,
  "quantileEstimator": "hyndman_fan_type_7",
  "batchSd": "sample_n_minus_1",
  "prng": "mulberry32",
  "gaussianTransform": "marsaglia_polar"
}
```

#### 23.9.4 `covarianceParameters` object

Model A:

```json
{
  "model": "A_independent_dxa",
  "sharedHeightError": true,
  "correlatedPairs": [],
  "rho": null
}
```

Model B:

```json
{
  "model": "B_correlated_dxa",
  "sharedHeightError": true,
  "correlatedPairs": [["FM","FFM"],["FFM","ALM"]],
  "rho": <one value from frozen rho grid>
}
```

No free-form pair lists.

#### 23.9.5 `parameterProvenance`

Object mapping every empirical or fallback parameter to:

| Subfield | Rule |
|----------|------|
| `sourceType` | one of `"mathematical_freeze"` \| `"validation_plan"` \| `"evidence_review"` \| `"synthetic_fallback"` |
| `sourceId` | exact document / ER-BC / protocol identifier |
| `value` | exact value used |

No unprovenanced noise/covariance parameter is allowed.

#### 23.9.6 `artifactFiles`

Enumerate all generated files relative to the run root.

Required every run: `manifest.json`, `results.json`, `summary.md`.
Grid/surface/table: also `results.csv`.
Optional plots must be listed if generated.

---

### 23.10 Canonical numeric persona table (BCV-017) — W1-PERSONAS

Synthetic only. **Not** clinical archetypes or normative cutoffs. Internally coherent enough to drive scores.

Shared defaults unless overridden:

- `asOf` = `2026-10-04T12:00:00.000Z`
- all `measuredAt` = `asOf` (S-01)
- Waist protocol `who_midpoint_v1` v1
- DXA channels `resolved`; H3 primary = ALMI unless noted
- Height/Waist/FMI/ALMI/FFMI units: cm / cm / kg·m⁻² / kg·m⁻² / kg·m⁻²

**Reference for directional predicates:** sex-specific §23.5.4 companion reference anchors. Health constructs/aggregate compare to Health scores from that sex’s §23.5.4 row (H3 via ALMI primary). Performance constructs/aggregate compare to Performance scores from that same row (P1=FFMI, P3=FMI). Comparator → §23.17.7. **No** consumer bands. **No** qualitative labels (`excellent` / `healthy` / `poor` / `optimal` / `elite`).

| ID | Sex | Age | Height | Waist | WHtR | FMI | ALMI | FFMI | H3 primary | expectedH1Relation | expectedH2Relation | expectedH3Relation | expectedHealthAggregateRelation | expectedP1Relation | expectedP3Relation | expectedPerformanceAggregateRelation | Notes (non-operative) |
|----|-----|-----|--------|-------|------|-----|------|------|------------|--------------------|--------------------|--------------------|---------------------------------|--------------------|--------------------|--------------------------------------|-----------------------|
| P-01 | male | 30 | 178 | 78 | 0.438 | 4.5 | 8.2 | 19.0 | ALMI | higher | equal | equal | higher | equal | equal | equal | Favorable all |
| P-02 | male | 40 | 175 | 105 | 0.600 | 5.0 | 8.0 | 18.8 | ALMI | lower | equal | equal | lower | lower | equal | lower | High central + favorable lean |
| P-03 | male | 35 | 180 | 80 | 0.444 | 4.0 | 6.2 | 16.2 | ALMI | higher | equal | lower | lower | lower | equal | lower | Favorable adiposity + low lean |
| P-04 | male | 28 | 182 | 92 | 0.505 | 10.0 | 8.5 | 20.8 | ALMI | lower | lower | equal | lower | higher | lower | lower | High FMI + high FFMI |
| P-05 | male | 55 | 170 | 76 | 0.447 | 3.0 | 5.8 | 15.8 | ALMI | higher | lower | lower | lower | lower | equal | lower | Low FMI + low ALMI |
| P-06 | male | 45 | 176 | 102 | 0.580 | 4.8 | 7.8 | 18.5 | ALMI | lower | equal | lower | lower | lower | equal | lower | Discordant high WHtR / favorable FMI |
| P-07 | male | 42 | 176 | 82 | 0.466 | 12.0 | 7.6 | 18.2 | ALMI | higher | lower | lower | lower | lower | lower | lower | Discordant favorable WHtR / high FMI |
| P-08 | male | 60 | 172 | 108 | 0.628 | 11.5 | 6.1 | 16.0 | ALMI | lower | lower | lower | lower | lower | lower | lower | Sarcopenic-obesity-like pattern |
| P-09 | male | 32 | 185 | 100 | 0.541 | 7.5 | 9.0 | 21.0 | ALMI | lower | lower | equal | lower | higher | lower | lower | High muscularity + high central adiposity |
| P-10 | male | 38 | 178 | 98 | 0.551 | 5.2 | 7.5 | 18.0 | ALMI | lower | equal | lower | lower | lower | equal | lower | Low BMI-like composition + high central adiposity |
| P-11 | female | 30 | 165 | 70 | 0.424 | 6.5 | 6.5 | 16.2 | ALMI | higher | equal | equal | higher | lower | equal | lower | Female favorable pattern |
| P-12 | female | 48 | 162 | 95 | 0.586 | 14.0 | 5.2 | 14.8 | ALMI | lower | lower | lower | lower | lower | lower | lower | Female adverse mixed pattern |

For each persona also evaluate Performance-Supporting using P1=FFMI and P3=FMI from the same row.

**Required BCV-017 outputs:** construct scores; aggregates; `absoluteContribution` / `weightedDeficit` / `dominantAdverseConstruct` (§23.17.1); adverse-hide flag; `expectedRelation` / `observedRelation` / pass-fail per §23.17.7 for every applicable construct and aggregate column above.

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

**Rule:** hold scoring composition inputs identical; vary only the demographic/context dimension under test. Distinguish structural demographic invariance from correlated-measurement propagation (BCV-029).

#### 23.12.1 Sex-matched structural anchors (BCV-007 / BCV-031)

| Sex | Height | Waist | WHtR | FMI | ALMI | FFMI |
|-----|--------|-------|------|-----|------|------|
| male | 175 cm | 87.5 cm | 0.50 | 5.5 | 8.0 | 19.0 |
| female | 165 cm | 82.5 cm | 0.50 | 8.5 | 6.3 | 16.5 |

Structural-test anchors only — **not** claims of biological sex equivalence.

#### 23.12.2 Frozen factor levels

| Factor | Levels |
|--------|--------|
| Age (completed years) | `{20,40,60,80}` |
| Height | short `155`, medium `175`, tall `195` cm — hold WHtR/FMI/FFMI/ALMI constant as derived scoring inputs |
| BMI-proxy (metadata only) | labels `low/mid/high` with synthetic BMI `{18.5,25.0,35.0}`; score inputs identical ⇒ no score change |
| Athletic status | `["sedentary","recreational","trained"]` |
| Menopause | `["pre","peri","post"]` |
| Ethnicity structural labels | `["group_a","group_b","group_c"]` — **non-real** Tier A code-path labels only; do **not** use named races/ethnicities |
| Vendor | `["vendor_a","vendor_b"]` |
| Site | `["site_1","site_2"]` |

| Study | Hold constant | Vary | Expected |
|-------|---------------|------|----------|
| BCV-006 | male or female structural anchors | ages `{20,40,60,80}` | identical scores |
| BCV-007 | §23.12.1 anchors | sex | document transform differences; not assumed fair |
| BCV-031 age×sex | anchors | ages × sexes | adult identity within sex |
| BCV-031 height×sex | indices fixed | heights × sex | scores identical when indices fixed |
| BCV-031 BMI-proxy×sex | score inputs fixed | BMI labels/values metadata | **invariant** |
| BCV-031 athletic×sex | score inputs fixed | athletic labels | **invariant** |
| BCV-031 menopause×age | female anchors | menopause × ages | **invariant** |
| BCV-031 ethnicity | score inputs fixed | group_a/b/c | **invariant** |
| BCV-031 vendor×site | score inputs fixed | vendor×site labels | **invariant** (hidden-path). Empirical vendor bias later |

**Outputs:** pairwise Δ; max \|Δ\|; invariance pass/fail at `EPS_NUM` for unused-factor tests.

---

### 23.13 Per-BCV Wave 1 protocol details

#### BCV-001 — Mathematical surface stress

| Item | Frozen |
|------|--------|
| Geometry | §23.5.3–23.5.4 (1D sweeps + six Surface IDs; no 3D cube) |
| 2D axes | `canonicalAxisGrid` Cartesian product only (§23.5.3 / §23.17.5) — dense-local = 1D only |
| Epsilon | EPS_NUM + EPS_SURF |
| Outputs | continuity; max jump; local slopes; occupancy; NaN/OOR=0 |
| Artifacts | `results.json`, `results.csv`, `summary.md`, `manifest.json` (+ optional plots) |
| Class | structural + exploratory |
| PHI | none |

#### BCV-002 — Measurement perturbation

| Item | Frozen |
|------|--------|
| Baselines | P-01…P-12 |
| Noise | §23.6–23.7; multipliers 0.5/1/1.5/2.0×; Models A+B |
| MC / seed | §23.3 / §23.2 |
| Outputs | MAE/median/p90/p95 \|Δ\|; exploratory threshold crossings; §23.17.1 contribution fields where construct Δ attributed; `directionalReversalProbability` (§23.17.2) when aggregate noise reported |
| Artifacts | `results.json`, `summary.md`, `manifest.json` |
| Class | exploratory / evidence-dependent |
| PHI | none |

#### BCV-012 — Sensitivity map

| Item | Frozen |
|------|--------|
| Centers | explicit midpoints of adjacent knot pairs: H1 `{0.45,0.55,0.70}`; H2 male `{2.75,4.50,7.25,12.00}`; H2 female `{4.50,7.00,10.75,17.00}`; H3 ALMI male `{6.50,7.50}`; H3 ALMI female `{5.00,5.90}`; H3 FFMI male `{16.35,17.60}`; H3 FFMI female `{14.30,15.30}`; P1 male `{16.35,17.85,19.75}`; P1 female `{14.30,15.55,17.00}`; P3 male `{2.50,5.00,8.50,13.00}`; P3 female `{4.25,7.50,12.00,18.00}` |
| Also evaluate | personas P-01…P-12 |
| OAT steps | WHtR `{EPS_SURF,0.01,0.1}`; FMI/ALMI/FFMI `{EPS_SURF,0.1,0.5}` |
| Normalized sensitivity | `\|dScore/dx\| * DOMAIN_RANGE` from §23.5 (no SD-/data-derived normalization) |
| Joint FD pairs | Health H1/H2, H1/H3-ALMI, H1/H3-FFMI, H2/H3-ALMI, H2/H3-FFMI; Perf P1/P3 |
| Joint signs | exactly `(+,+) (+,-) (-,+) (-,-)` with `EPS_SURF` on both |
| FD formula | central difference `(f(x+h)-f(x-h))/(2h)` where defined |
| Outputs | local slope; normalized sensitivity; aggregate Δ; §23.17.1 `absoluteContribution` / `marginalContributionPerConstructPoint` / `weightedDeficit` / `dominantAdverseConstruct` / `changeContribution` (no other contribution meanings) |
| Artifacts | `results.json`, `results.csv`, `summary.md`, `manifest.json` |
| Class | exploratory |
| PHI | none |

#### BCV-013 — Knot / plateau

| Item | Frozen |
|------|--------|
| Knots | §23.5.2 |
| Plateaus (exact) | H2 male score-92: FMI `[3.5,5.5]`; H2 female score-92: `[5.5,8.5]`; P3 male score-92: `[3.0,7.0]`; P3 female score-92: `[5.0,10.0]`; H1 left plateau: WHtR `≤0.40` |
| plateauWidth | `upperBoundary - lowerBoundary` in input units; inclusive both ends where transform exactly flat |
| Tails | report `left_tail` / `right_tail` as unbounded vs synthetic domain; separately report synthetic-domain occupancy — do not invent finite biological tail widths |
| Epsilon | knot±EPS_NUM and knot±EPS_SURF |
| Outputs | left/knot/right values; left/right slopes; discontinuity delta; plateauWidth |
| Continuity invariant | discontinuity delta ≤ `1e-6` score points at EPS_NUM neighborhood |
| Class | structural invariant |
| PHI | none |

#### BCV-014 — Floor / ceiling

| Item | Frozen |
|------|--------|
| Sampling | §23.5 coarse 1D/2D BCV-001 geometry by sex |
| Exact floor/ceiling | `==0` / `==100` |
| Near | `(0,5]` / `[95,100)` exploratory only |
| Artifacts | `results.json`, `results.csv`, `summary.md`, `manifest.json` |
| Class | exploratory |
| PHI | none |

#### BCV-015 — Missingness / Resolver

| Item | Frozen |
|------|--------|
| Baselines | Male **P-01**; female **P-11** only (§23.17.4) — no new numeric baselines |
| H1 multiple_valid | distinct fixtures `H1_MULTIPLE_VALID_NO_GOVERNED_WHTR` + `H1_MULTIPLE_VALID_GOVERNED_WHTR` (§23.17.4.1) |
| Demographics | exact `MISSING_SEX` / `MISSING_HEIGHT` / `MISSING_DOB` only (§23.17.4.2) — soft `MISSING_REQUIRED_DEMOGRAPHIC` non-executable |
| Conflict | same-channel value disagreement + `conflictDelta` (§23.17.4.3) |
| Executable matrix | complete §23.17.4.8 (no TBD / as-applicable rows) |
| Result fields | §23.17.4.6 |
| Expected reasons | Mathematical Truth Freeze only — no new policy |
| Artifacts | `results.json`, `summary.md`, `manifest.json` |
| Class | structural + exploratory |
| PHI | none |


#### BCV-016 — Schedules

| Item | Frozen |
|------|--------|
| Catalog | S-01…S-15 (§23.11) |
| Artifacts | `results.json`, `summary.md`, `manifest.json` |
| Class | structural |
| PHI | none |

#### BCV-017 — Personas

| Item | Frozen |
|------|--------|
| Table | P-01…P-12 (§23.10) including expectedRelation columns |
| Reference | §23.5.4 sex-specific anchors; aggregates from those anchors (§23.17.7) |
| Comparator | §23.17.7 directional predicates (`higher`/`lower`/`equal`/`not_applicable`) |
| Contribution fields | §23.17.1 only |
| Artifacts | `results.json`, `summary.md`, `manifest.json` |
| Class | exploratory |
| PHI | none |

#### BCV-018 — Contribution / adverse-hide

| Item | Frozen |
|------|--------|
| Also evaluate | P-01…P-12 |
| Health favorable companions | WHtR `0.40`; FMI male `5.5` / female `8.5`; ALMI male `8.0` / female `6.3` |
| Health adverse | WHtR `0.80`; FMI male `15.0` / female `21.0`; ALMI male `6.0` / female `4.5` |
| Perf favorable | FFMI male `20.5` / female `17.5`; FMI male `7.0` / female `10.0` |
| Perf adverse | FFMI male `16.0` / female `14.0`; FMI male `16.0` / female `22.0` |
| Exact combinations | (1) each single adverse construct + all other companions favorable; (2) dual adverse pairs for Health H1+H2, H1+H3, H2+H3 and Perf P1+P3 |
| Metrics | §23.17.1 fields only; adverse-hide if any construct `<40` while aggregate `≥70` |
| Artifacts | `results.json`, `summary.md`, `manifest.json` |
| Class | exploratory |
| PHI | none |

#### BCV-029 — Correlated error

| Item | Frozen |
|------|--------|
| Models | A independent DXA (§23.7.1) + B correlated (§23.7.2) — A ≠ B@ρ=0 |
| Pairs | Model B only: FM↔FFM and FFM↔ALM |
| ρ | common ρ per Model-B run; grid §23.6 |
| Construction | §23.7.1 / §23.7.2 |
| MC / seed / draw order | §23.3 / §23.2 |
| Baselines | P-01…P-12 |
| Outputs | tails; `varianceContribution` / `constructUncertaintyShare` (§23.17.3); document `corr(FM,ALM)=rho^2`; optional labeled non-compliant independent-height ablation |
| Artifacts | `results.json`, `summary.md`, `manifest.json` |
| Class | exploratory / evidence-dependent |
| PHI | none |

#### BCV-030 — Uncertainty propagation

| Item | Frozen |
|------|--------|
| Chain | measurement→index→construct→aggregate |
| Intervals/thresholds | §23.8 |
| Models / MC | A+B / §23.3 |
| Required fields | `directionalReversalProbability` (§23.17.2); `varianceContribution` / `constructUncertaintyShare` / Var(A) / covariance matrix (§23.17.3) |
| Artifacts | `results.json`, `summary.md`, `manifest.json` |
| Class | exploratory / evidence-dependent |
| PHI | none |

#### BCV-031 — Intersectional structural fairness

| Item | Frozen |
|------|--------|
| Procedure / levels | §23.12 |
| Artifacts | `results.json`, `results.csv`, `summary.md`, `manifest.json` |
| Class | structural |
| PHI | none |

#### BCV-032A — Change-triad methodology audit

| Item | Frozen |
|------|--------|
| Method | analysis of BCV-029/030 envelopes; triad non-equivalence checklist; **only** §23.17.6 candidate formulas |
| SEM | `SEM_diff = SD(delta) / sqrt(2)` with `delta = repeatedMeasurement2 - repeatedMeasurement1` |
| SDC95 | `SDC95_individual = 1.96 * sqrt(2) * SEM_diff` (= `1.96 * SD(delta)`) |
| MDC95 | terminology alias: `MDC95_individual = SDC95_individual` — **no** competing MDC formula |
| Group-level SDC | **SHALL NOT** calculate in Wave 1 |
| Clinical meaningful change | **NO formula** — evidence-dependent unresolved |
| User-perceived meaningful change | **NO formula** — evidence-dependent unresolved |
| Artifacts | `results.json`, `summary.md`, `manifest.json` |
| Class | structural + exploratory |
| PHI | none |

#### BCV-034 — Acute-state simulation

| Item | Frozen |
|------|--------|
| Baselines | P-01, P-08, P-11, P-12 |
| Waist | included **only** when scenario ΔWaist ≠ 0 below; otherwise unchanged — **no optional Waist** |
| Weight | metadata only; do not infer FM from FFM; do not alter FMI unless FM explicitly changed (Wave 1 matrix does not change FM) |
| Label | synthetic fallback perturbations — **not** empirical; ER-BC-16 may later replace |

Exact scenario → delta matrix:

| Scenario | ΔFFM (kg) | ΔALM (kg) | ΔWaist (cm) |
|----------|-----------|-----------|-------------|
| BASE | 0 | 0 | 0 |
| HYDRATION_DOWN | -1.0 | -0.6 | -1.0 |
| HYDRATION_UP | +1.0 | +0.6 | +1.0 |
| GLYCOGEN_DOWN | -0.5 | -0.3 | 0 |
| GLYCOGEN_UP | +0.5 | +0.3 | 0 |
| RECENT_EXERCISE | +0.5 | +0.3 | 0 |
| ILLNESS_INFLAMMATION | +1.0 | +0.6 | +1.0 |
| EDEMA | +1.5 | +0.9 | +2.0 |
| MENSTRUAL_PHASE_LOW | 0 | 0 | 0 |
| MENSTRUAL_PHASE_HIGH | +0.5 | +0.3 | +1.0 |
| TOD_MORNING | 0 | 0 | 0 |
| TOD_EVENING | +0.5 | +0.3 | +1.0 |

Menstrual scenarios: female baselines only (P-11, P-12). Recompute FFMI/ALMI from perturbed FFM/ALM with Height held fixed; recompute WHtR when ΔWaist ≠ 0.

| Item | Frozen |
|------|--------|
| Outputs | construct/aggregate Δ; `falseImprovementIndicator` / `falseImprovementRate` (§23.17.8); artifact-vs-biology label |
| Artifacts | `results.json`, `summary.md`, `manifest.json` |
| Class | exploratory / evidence-dependent |
| PHI | none |

---

### 23.14 Zero-ambiguity table (Wave 1 P0)

| BCV | Domain | Grid/MC | Epsilon | Noise | Seed | Outputs | Artifacts | Class | PHI |
|-----|--------|---------|---------|-------|------|---------|-----------|-------|-----|
| 001 | §23.5.3–4 | 1D+2D `canonicalAxisGrid` | NUM+SURF | none | N/A | continuity/slopes | json+csv+md+manifest | structural+expl | none |
| 002 | personas | MC §23.3 | n/a | A+B | §23.2 | \|Δ\|/rates/§23.17 | json+md+manifest | expl/evid | none |
| 006 | ages | grid | NUM | none | N/A | invariance | json+csv+md+manifest | structural | none |
| 007 | sex anchors | grid | NUM | none | N/A | transform contrasts | json+csv+md+manifest | structural+expl | none |
| 012 | centers+personas | FD+signs | SURF | n/a | §23.2 | sens + §23.17.1 | json+csv+md+manifest | expl | none |
| 013 | knots/plateaus | ±eps | NUM+SURF | none | N/A | L/K/R/width | json+csv+md+manifest | structural | none |
| 014 | §23.5 coarse | grid | n/a | none | N/A | floor/ceil % | json+csv+md+manifest | expl | none |
| 015 | P-01/P-11 §23.17.4.8 matrix | matrix | n/a | none | N/A | reasons §23.17.4 | json+md+manifest | structural+expl | none |
| 016 | S-01…S-15 | catalog | n/a | none | N/A | eligibility | json+md+manifest | structural | none |
| 017 | P-01…P-12 | table | NUM | none | N/A | relations §23.17.7 | json+md+manifest | expl | none |
| 018 | companion anchors | fixed combos | n/a | none | N/A | §23.17.1 + hide | json+md+manifest | expl | none |
| 029 | personas | MC | n/a | A+B pairs | §23.2 | tails/§23.17.3 | json+md+manifest | expl/evid | none |
| 030 | personas | MC | n/a | A+B | §23.2 | intervals/§23.17.2–3 | json+md+manifest | expl/evid | none |
| 031 | §23.12 | levels | NUM | none | N/A | invariance | json+csv+md+manifest | structural | none |
| 032A | 029/030 | analysis | n/a | inherits | inherits | §23.17.6 triad | json+md+manifest | structural+expl | none |
| 034 | P-01/08/11/12 | scenario matrix | n/a | §23.13 | §23.2 | Δ + §23.17.8 | json+md+manifest | expl/evid | none |

---

### 23.15 Engineer-choice audit (must all be NO)

| Choice | Remaining? |
|--------|------------|
| MC N / convergence / quantile SE | **NO** — §23.3 |
| Seed / PRNG / Gaussian / stream / draw order | **NO** — §23.2 |
| Grid geometry / held-fixed anchors | **NO** — §23.5 |
| Sensitivity centers / normalization / signs | **NO** — BCV-012 |
| Plateau bounds / widths | **NO** — BCV-013 |
| Sex-matched / fairness labels | **NO** — §23.12 |
| Covariance pairs / rho application / construction | **NO** — §23.7 |
| Acute-state deltas / Waist inclusion | **NO** — BCV-034 |
| Artifacts / manifest / root | **NO** — §23.9 |
| Parameter fallback | **NO** — §23.6 |
| Contribution equation / dominant / tie-break / change contribution | **NO** — §23.17.1 |
| Directional-reversal protocol / denominator / zero handling | **NO** — §23.17.2 |
| Uncertainty variance allocation / covariance / near-zero | **NO** — §23.17.3 |
| False-improvement predicate / unavailable / rate | **NO** — §23.17.8 |
| BCV-015 baseline / Resolver fixtures / missingness mutations | **NO** — §23.17.4 |
| BCV-015 H1 multiple_valid branches / demographic enum / conflictDelta / matrix IDs | **NO** — §23.17.4.1–§23.17.4.9 |
| BCV-001 2D axis grid | **NO** — §23.5.3 / §23.17.5 |
| BCV-032A SEM / SDC95 / MDC95 / clinical / user-perceived | **NO** — §23.17.6 |
| BCV-017 pattern comparator / aggregate reference | **NO** — §23.17.7 |

**Total material methodology choices remaining for Wave 1 execution engineer: 0.**

---

### 23.16 Wave 1 authorization gate

```text
independent FINAL BCV-015 re-gate PASS
        ↓
explicit WAVE 1 SYNTHETIC VALIDATION EXECUTION: AUTHORIZED (separate)
        ↓
only then may synthetic execution begin under this contract
```

**This document does not authorize Wave 1.**

---

### 23.17 Wave 1 execution-semantics freeze (authoritative)

Closes the eight residual execution ambiguities discovered when the authorized Wave 1 execution agent STOPPED before adding code. **Does not** reopen score formulas, weights, knots, Resolver, Confidence, Wave 1 membership, Monte Carlo/PRNG/covariance protocols, personas, schedules, or public status.

#### 23.17.1 Contribution metrics

For construct `i` with construct score `score_i ∈ [0,100]` and frozen aggregate weight `weight_i`:

| Symbol | Definition |
|--------|------------|
| `absoluteContribution_i` | `weight_i * score_i` (aggregate score points) |
| `marginalContributionPerConstructPoint_i` | `weight_i` (one additional construct-score point changes unclipped aggregate by `weight_i`; **no** counterfactual baseline) |
| `weightedDeficit_i` | `weight_i * (100 - score_i)` — descriptive validation math only; **does not** imply 100 is clinically ideal |
| `changeContribution_i` | Between states A→B: `weight_i * (score_i_B - score_i_A)` |

Frozen weights (Mathematical Truth Freeze; do not change):

| Score | Weights |
|-------|---------|
| Health | `w_H1=0.45`, `w_H2=0.35`, `w_H3=0.20` ⇒ contributions `0.45*H1`, `0.35*H2`, `0.20*H3` |
| Performance-Supporting | `w_P1=0.50`, `w_P3=0.50` ⇒ contributions `0.50*P1`, `0.50*P3` |

```text
sum_i absoluteContribution_i = unclipped aggregate
aggregateChange = sum_i changeContribution_i
```

subject only to the already-frozen aggregate calculation (`clip01` may still apply to emitted aggregate).

`dominantAdverseConstruct` = construct with **MAX** `weightedDeficit_i`.

Tie-break order:

- Health: H1 → H2 → H3
- Performance-Supporting: P1 → P3

No other contribution definition may be introduced.

#### 23.17.2 Directional-reversal probability

Two-replicate noise test for one fixed latent synthetic state with deterministic true aggregate `S0`:

1. Generate two independent noisy measurement realizations `S_A`, `S_B`.
2. `delta_A = S_A - S0`; `delta_B = S_B - S0`.
3. `reversalIndicator = 1` iff `delta_A * delta_B < 0`; else `0`.
4. If either delta is exact zero: `reversalIndicator = 0`.
5. `directionalReversalProbability = mean(reversalIndicator)` across Monte Carlo pairs.

Pair sampling under §23.2 seed contract:

```text
N_pairs = converged Monte Carlo observation count for that protocol/score under §23.3
For pair index k = 0 … N_pairs-1:
  replicate A: substreamIndex = scoreBase + 2*k
  replicate B: substreamIndex = scoreBase + 2*k + 1
scoreBase_Health = 100
scoreBase_Perf   = 200
```

Each replicate draws the full §23.2.3 Gaussian order once under its derived seed, then scores once.

Meaning: can measurement noise alone make two repeated observations imply opposite directions relative to the same latent baseline? **Not** a probability of true biological reversal.

#### 23.17.3 Construct uncertainty share

Let `C_i` = construct-score random variable, `w_i` = frozen weight, `A = sum_i (w_i * C_i)` (unclipped aggregate random variable).

```text
varianceContribution_i =
  w_i^2 * Var(C_i)
  + sum_{j ≠ i} (w_i * w_j * Cov(C_i, C_j))

SUM_i varianceContribution_i = Var(A)

constructUncertaintyShare_i =
  varianceContribution_i / Var(A)   if Var(A) > EPS_NUM
  null                               if Var(A) <= EPS_NUM
```

When `Var(A) <= EPS_NUM`, record flag `aggregate_variance_near_zero`.

Shares **may be negative** when negative covariance exists. **Do not clip** shares.

Report: raw `varianceContribution`, signed `constructUncertaintyShare`, `Var(A)`, and the construct-score covariance matrix. Estimate `Var`/`Cov` from the protocol’s Monte Carlo construct-score samples (batch SD divisor rules in §23.3 apply to reported aggregate SD; for this allocation use the same sample moments on construct scores / unclipped aggregate).

#### 23.17.4 BCV-015 canonical fixture assembly (final)

Closes the three residual BCV-015 executor choices from the independent execution-semantics re-gate at `cce4e201…`. **Does not** reopen other Wave 1 protocols.

**Baselines (exact existing IDs; no new numeric values):**

| Sex | baselinePersonaId |
|-----|-------------------|
| male | **P-01** |
| female | **P-11** |

Every executable fixture in §23.17.4.8 is instantiated once for **P-01** and once for **P-11** (two artifact rows per `fixtureId`). Factory rule: start from the fully valid baseline; mutate **only** the target under test; all non-target constructs remain bit-for-bit equivalent to baseline.

##### 23.17.4.1 H1 `multiple_valid` — two distinct fixtures (NOT interchangeable)

H1 must separately test (A) general fail-closed and (B) the frozen Mathematical Truth Freeze §10.2 exception. **Do not** use one ambiguous H1 fixture for both.

**A. `H1_MULTIPLE_VALID_NO_GOVERNED_WHTR`**

| Item | Frozen |
|------|--------|
| Resolver status | `multiple_valid` |
| Candidate count | **2** |
| Candidate relationship | `two_non_whtr_valid_candidates` |
| Candidate 1 | `channelKind=vat_mass_non_scoring`; `metricId=vat_mass_explanatory`; `method=dxa`; `measuredAt=baseline asOf`; `valueKg=0.40`; `sourceEventId="bcv015-h1-mv-vat-a"` |
| Candidate 2 | `channelKind=vat_volume_non_scoring`; `metricId=vat_volume_explanatory`; `method=dxa`; `measuredAt=baseline asOf`; `valueL=1.20`; `sourceEventId="bcv015-h1-mv-vat-b"` |
| Governed WHtR channel | **absent** — neither candidate is an independently governed/resolved `whtr_v1` scoring channel |
| Score-layer winner | **forbidden** |
| expectedAvailability | `unavailable` |
| expectedPrimaryReason | `multiple_valid_unfrozen` |

**B. `H1_MULTIPLE_VALID_GOVERNED_WHTR`**

| Item | Frozen |
|------|--------|
| Resolver status | `multiple_valid` |
| Candidate count | **2** |
| Candidate relationship | `governed_whtr_plus_vat_mass_non_scoring` |
| Candidate 1 (governed WHtR) | `metric/formula=whtr_v1`; Waist protocol `who_midpoint_v1` v1; governed Height present; `measuredAt=baseline asOf` valid/fresh; numeric WHtR = **baseline persona WHtR** (P-01:`0.438`, P-11:`0.424`); `sourceEventId="bcv015-h1-mv-whtr-primary"`; status of this channel `resolved` |
| Candidate 2 (non-scoring) | `channelKind=vat_mass_non_scoring`; `metricId=vat_mass_explanatory`; `method=dxa`; `measuredAt=baseline asOf`; `valueKg=0.50`; `sourceEventId="bcv015-h1-mv-vat-support"`; **not** eligible as WHtR scoring channel |
| Score-layer behavior | MAY score H1 **only** from the independently governed standardized WHtR channel per Mathematical Truth Freeze §10.2; must **not** choose between raw competing candidates |
| expectedAvailability | `available` |
| expectedPrimaryReason | `null` |

For **non-H1** constructs, `multiple_valid` uses exactly one general fixture family (§23.17.4.8): two otherwise-valid same-channel candidates, **identical** numeric value (= baseline), same method/measuredAt/era, different `sourceEventId`; expected `unavailable` / `multiple_valid_unfrozen`; no score-layer winner.

##### 23.17.4.2 Demographic fixtures (exact — replaces soft `MISSING_REQUIRED_DEMOGRAPHIC`)

`MISSING_REQUIRED_DEMOGRAPHIC` remains only as a **conceptual category heading**. Executable fixtures are exactly:

| fixtureId family | Target level | Exact applicable constructs / engines | Mutation | expectedPrimaryReason |
|------------------|--------------|----------------------------------------|----------|----------------------|
| `*_MISSING_SEX` | construct | **H2, H3-ALMI, H3-FFMI, P1, P3 only** | set required sex context to missing; all else baseline | `required_sex_missing` |
| `*_MISSING_HEIGHT` | construct | **H1, H2, H3-ALMI, H3-FFMI, P1, P3** (all Wave-1 constructs — Height required whenever WHtR / FMI / FFMI / ALMI are used per Mathematical Truth Freeze §5 / §4.3–§4.4) | remove governed Height context; evidence/Resolver otherwise valid | `required_height_missing` |
| `HEALTH_MISSING_DOB` / `PERF_MISSING_DOB` | **engine / aggregate** | Health aggregate; Performance-Supporting aggregate | remove DOB/age context required by aggregate engine; construct inputs otherwise valid | aggregate `required_age_missing` |

**H1 / `MISSING_SEX`:** **not part of BCV-015** — H1 is sex-independent (Mathematical Truth Freeze §5).

**MISSING_DOB:** engine-level only. No additional construct-level reason is invented merely because aggregate age context is missing. Run for Health and Performance-Supporting aggregates.

##### 23.17.4.3 Conflict fixtures — value disagreement within the same governed construct

Soft phrase “two incompatible candidates sufficient to represent conflict” is **non-operative**.

| Item | Frozen |
|------|--------|
| Fixture ID format | `<CONSTRUCT>[_CHANNEL]_CONFLICT_VALUE_DISAGREEMENT` |
| Conflict type | **VALUE DISAGREEMENT WITHIN THE SAME GOVERNED CONSTRUCT/CHANNEL** |
| Candidate count | **exactly 2** |
| Same fields | metric/construct identity; governed method class; required region where the construct uses region (none for these Wave-1 channels); `measuredAt`; source-event era; valid provenance; valid units |
| Differing field | numeric value only |
| Values | `baselineValue - conflictDelta` and `baselineValue + conflictDelta` |
| Resolver status | `conflict` |
| expectedAvailability | `unavailable` |
| expectedPrimaryReason | `conflict_unresolved` |
| Score-layer selection | **forbidden** |

```text
conflictDelta = max(EPS_SURF, 0.10 * abs(baselineValue))
if baselineValue == 0: conflictDelta = EPS_SURF
```

`conflictDelta` is synthetic fixture-construction only — not a biological/clinical threshold and not a Resolver policy change.

**H3 scope:** separate fixtures `H3_ALMI_CONFLICT_VALUE_DISAGREEMENT` and `H3_FFMI_CONFLICT_VALUE_DISAGREEMENT`. Resolver primary/channel fixed to the target channel. **No** ALMI↔FFMI cross-channel conflict fixture.

Conflict fixtures required for: H1, H2, H3-ALMI, H3-FFMI, P1, P3.

Aggregate behavior when a core construct is conflict-unavailable follows already-frozen Mathematical Truth Freeze §4.2 / missing-core consequences.

##### 23.17.4.4 Other Resolver-status fixture shapes (non-choice)

| Status | Candidate shape (all constructs/channels unless noted) | expectedAvailability | expectedPrimaryReason |
|--------|--------------------------------------------------------|----------------------|----------------------|
| `resolved` | one valid governed primary; status `resolved`; one `primaryEvidenceRef` | `available` | `null` |
| `resolved_with_supporting` | same primary as `resolved` + one additional valid supporting observation (same numeric value; different `sourceEventId`; role=supporting); `primaryEvidenceRef` remains governed primary | `available` | `null` |
| `policy_not_frozen` | status `policy_not_frozen`; do not repair downstream | `unavailable` | `policy_not_frozen` |
| `insufficient` | status `insufficient`; no governed numeric scoring channel | `unavailable` | `unresolved_construct` |
| `undated_only` | value present; required `measuredAt` absent; status `undated_only` | `unavailable` | `invalid_provenance` |
| `unsupported` | status `unsupported`; method = frozen unsupported (`consumer_bia` for DXA constructs; `unknown_waist_protocol` for H1) | `unavailable` | `unsupported_method` |

##### 23.17.4.5 Other missingness fixture shapes (non-choice)

| Mutation | Action | expectedPrimaryReason |
|----------|--------|----------------------|
| `MISSING_VALUE` | remove numeric value only; channel otherwise present | `invalid_provenance` |
| `MISSING_MEASURED_AT` | retain numeric value; remove `measuredAt` | `invalid_provenance` |
| `MISSING_REQUIRED_METHOD` | retain value/date; replace governed method with frozen unsupported method (`consumer_bia` / `unknown_waist_protocol` as above) | `unsupported_method` |

Only **one** missingness dimension may be mutated per single-factor fixture. Multi-factor combinations, if executed, compose only these frozen mutations and apply the Mathematical Truth Freeze precedence matrix — no new mutation types.

##### 23.17.4.6 Result contract fields (required every fixture row)

`fixtureId`, `baselinePersonaId`, `engine`, `targetConstruct`, `targetChannel`, `resolverStatus`, `missingnessMutation`, `demographicMutation`, `candidateCount`, `candidateRelationship`, `expectedAvailability`, `expectedPrimaryReason`, `observedAvailability`, `observedPrimaryReason`.

Use `null` for fields that do not apply to that row (e.g. `demographicMutation` on pure Resolver-status rows). Field names are frozen.

##### 23.17.4.7 Channel / baselineValue map

| targetConstruct | targetChannel | engine | baselineValue source |
|-----------------|---------------|--------|----------------------|
| H1 | `whtr_v1` | Health | persona WHtR |
| H2 | `fmi_v1` | Health | persona FMI |
| H3 | `almi_v1` | Health | persona ALMI |
| H3 | `ffmi_v1` | Health | persona FFMI |
| P1 | `ffmi_v1` | Performance | persona FFMI |
| P3 | `fmi_v1` | Performance | persona FMI |

##### 23.17.4.8 Complete BCV-015 executable fixture matrix

Instantiate each row for `baselinePersonaId ∈ {P-01, P-11}`. Fixture IDs are Wave-1 artifact identity and must be emitted unchanged.

| fixtureId | baselinePersonaId | engine | targetConstruct | targetChannel | resolverStatus | mutationType | demographicMutation | candidateCount | candidateRelationship | measuredAtState | methodState | expectedAvailability | expectedPrimaryReason | notes |
|-----------|-----------|-----------|-----------|-----------|-----------|-----------|-----------|-----------|-----------|-----------|-----------|-----------|-----------|-----------|
| H1_RESOLVED | P-01+P-11 | Health | H1 | whtr_v1 | resolved | none | none | 1 | single_governed_primary | valid | governed | available | null | primaryEvidenceRef required |
| H1_RESOLVED_WITH_SUPPORTING | P-01+P-11 | Health | H1 | whtr_v1 | resolved_with_supporting | none | none | 2 | primary_plus_supporting_same_value | valid | governed | available | null | supporting distinct sourceEventId |
| H1_MULTIPLE_VALID_NO_GOVERNED_WHTR | P-01+P-11 | Health | H1 | whtr_v1 | multiple_valid | none | none | 2 | two_non_whtr_valid_candidates | valid | dxa_vat_non_scoring | unavailable | multiple_valid_unfrozen | general fail-closed; no governed whtr_v1 |
| H1_MULTIPLE_VALID_GOVERNED_WHTR | P-01+P-11 | Health | H1 | whtr_v1 | multiple_valid | none | none | 2 | governed_whtr_plus_vat_mass_non_scoring | valid | whtr_v1_plus_vat | available | null | Mathematical Truth Freeze §10.2 exception |
| H1_POLICY_NOT_FROZEN | P-01+P-11 | Health | H1 | whtr_v1 | policy_not_frozen | none | none | 0 | status_only | n/a | n/a | unavailable | policy_not_frozen | do not repair downstream |
| H1_CONFLICT_VALUE_DISAGREEMENT | P-01+P-11 | Health | H1 | whtr_v1 | conflict | none | none | 2 | value_disagreement_same_channel | valid_same | governed_same | unavailable | conflict_unresolved | values=baseline±conflictDelta |
| H1_INSUFFICIENT | P-01+P-11 | Health | H1 | whtr_v1 | insufficient | none | none | 0 | no_governed_numeric_channel | n/a | n/a | unavailable | unresolved_construct |  |
| H1_UNDATED_ONLY | P-01+P-11 | Health | H1 | whtr_v1 | undated_only | none | none | 1 | value_present_measuredAt_absent | absent | governed | unavailable | invalid_provenance |  |
| H1_UNSUPPORTED | P-01+P-11 | Health | H1 | whtr_v1 | unsupported | none | none | 1 | unsupported_method_observation | valid | unknown_waist_protocol | unavailable | unsupported_method | unknown_waist_protocol |
| H2_RESOLVED | P-01+P-11 | Health | H2 | fmi_v1 | resolved | none | none | 1 | single_governed_primary | valid | governed | available | null | primaryEvidenceRef required |
| H2_RESOLVED_WITH_SUPPORTING | P-01+P-11 | Health | H2 | fmi_v1 | resolved_with_supporting | none | none | 2 | primary_plus_supporting_same_value | valid | governed | available | null | supporting distinct sourceEventId |
| H2_MULTIPLE_VALID | P-01+P-11 | Health | H2 | fmi_v1 | multiple_valid | none | none | 2 | two_same_value_different_sourceEventId | valid | governed | unavailable | multiple_valid_unfrozen | no score-layer winner |
| H2_POLICY_NOT_FROZEN | P-01+P-11 | Health | H2 | fmi_v1 | policy_not_frozen | none | none | 0 | status_only | n/a | n/a | unavailable | policy_not_frozen | do not repair downstream |
| H2_CONFLICT_VALUE_DISAGREEMENT | P-01+P-11 | Health | H2 | fmi_v1 | conflict | none | none | 2 | value_disagreement_same_channel | valid_same | governed_same | unavailable | conflict_unresolved | values=baseline±conflictDelta |
| H2_INSUFFICIENT | P-01+P-11 | Health | H2 | fmi_v1 | insufficient | none | none | 0 | no_governed_numeric_channel | n/a | n/a | unavailable | unresolved_construct |  |
| H2_UNDATED_ONLY | P-01+P-11 | Health | H2 | fmi_v1 | undated_only | none | none | 1 | value_present_measuredAt_absent | absent | governed | unavailable | invalid_provenance |  |
| H2_UNSUPPORTED | P-01+P-11 | Health | H2 | fmi_v1 | unsupported | none | none | 1 | unsupported_method_observation | valid | consumer_bia | unavailable | unsupported_method | consumer_bia |
| H3_ALMI_RESOLVED | P-01+P-11 | Health | H3 | almi_v1 | resolved | none | none | 1 | single_governed_primary | valid | governed | available | null | primaryEvidenceRef required |
| H3_ALMI_RESOLVED_WITH_SUPPORTING | P-01+P-11 | Health | H3 | almi_v1 | resolved_with_supporting | none | none | 2 | primary_plus_supporting_same_value | valid | governed | available | null | supporting distinct sourceEventId |
| H3_ALMI_MULTIPLE_VALID | P-01+P-11 | Health | H3 | almi_v1 | multiple_valid | none | none | 2 | two_same_value_different_sourceEventId | valid | governed | unavailable | multiple_valid_unfrozen | no score-layer winner |
| H3_ALMI_POLICY_NOT_FROZEN | P-01+P-11 | Health | H3 | almi_v1 | policy_not_frozen | none | none | 0 | status_only | n/a | n/a | unavailable | policy_not_frozen | do not repair downstream |
| H3_ALMI_CONFLICT_VALUE_DISAGREEMENT | P-01+P-11 | Health | H3 | almi_v1 | conflict | none | none | 2 | value_disagreement_same_channel | valid_same | governed_same | unavailable | conflict_unresolved | values=baseline±conflictDelta |
| H3_ALMI_INSUFFICIENT | P-01+P-11 | Health | H3 | almi_v1 | insufficient | none | none | 0 | no_governed_numeric_channel | n/a | n/a | unavailable | unresolved_construct |  |
| H3_ALMI_UNDATED_ONLY | P-01+P-11 | Health | H3 | almi_v1 | undated_only | none | none | 1 | value_present_measuredAt_absent | absent | governed | unavailable | invalid_provenance |  |
| H3_ALMI_UNSUPPORTED | P-01+P-11 | Health | H3 | almi_v1 | unsupported | none | none | 1 | unsupported_method_observation | valid | consumer_bia | unavailable | unsupported_method | consumer_bia |
| H3_FFMI_RESOLVED | P-01+P-11 | Health | H3 | ffmi_v1 | resolved | none | none | 1 | single_governed_primary | valid | governed | available | null | primaryEvidenceRef required |
| H3_FFMI_RESOLVED_WITH_SUPPORTING | P-01+P-11 | Health | H3 | ffmi_v1 | resolved_with_supporting | none | none | 2 | primary_plus_supporting_same_value | valid | governed | available | null | supporting distinct sourceEventId |
| H3_FFMI_MULTIPLE_VALID | P-01+P-11 | Health | H3 | ffmi_v1 | multiple_valid | none | none | 2 | two_same_value_different_sourceEventId | valid | governed | unavailable | multiple_valid_unfrozen | no score-layer winner |
| H3_FFMI_POLICY_NOT_FROZEN | P-01+P-11 | Health | H3 | ffmi_v1 | policy_not_frozen | none | none | 0 | status_only | n/a | n/a | unavailable | policy_not_frozen | do not repair downstream |
| H3_FFMI_CONFLICT_VALUE_DISAGREEMENT | P-01+P-11 | Health | H3 | ffmi_v1 | conflict | none | none | 2 | value_disagreement_same_channel | valid_same | governed_same | unavailable | conflict_unresolved | values=baseline±conflictDelta |
| H3_FFMI_INSUFFICIENT | P-01+P-11 | Health | H3 | ffmi_v1 | insufficient | none | none | 0 | no_governed_numeric_channel | n/a | n/a | unavailable | unresolved_construct |  |
| H3_FFMI_UNDATED_ONLY | P-01+P-11 | Health | H3 | ffmi_v1 | undated_only | none | none | 1 | value_present_measuredAt_absent | absent | governed | unavailable | invalid_provenance |  |
| H3_FFMI_UNSUPPORTED | P-01+P-11 | Health | H3 | ffmi_v1 | unsupported | none | none | 1 | unsupported_method_observation | valid | consumer_bia | unavailable | unsupported_method | consumer_bia |
| P1_RESOLVED | P-01+P-11 | Performance | P1 | ffmi_v1 | resolved | none | none | 1 | single_governed_primary | valid | governed | available | null | primaryEvidenceRef required |
| P1_RESOLVED_WITH_SUPPORTING | P-01+P-11 | Performance | P1 | ffmi_v1 | resolved_with_supporting | none | none | 2 | primary_plus_supporting_same_value | valid | governed | available | null | supporting distinct sourceEventId |
| P1_MULTIPLE_VALID | P-01+P-11 | Performance | P1 | ffmi_v1 | multiple_valid | none | none | 2 | two_same_value_different_sourceEventId | valid | governed | unavailable | multiple_valid_unfrozen | no score-layer winner |
| P1_POLICY_NOT_FROZEN | P-01+P-11 | Performance | P1 | ffmi_v1 | policy_not_frozen | none | none | 0 | status_only | n/a | n/a | unavailable | policy_not_frozen | do not repair downstream |
| P1_CONFLICT_VALUE_DISAGREEMENT | P-01+P-11 | Performance | P1 | ffmi_v1 | conflict | none | none | 2 | value_disagreement_same_channel | valid_same | governed_same | unavailable | conflict_unresolved | values=baseline±conflictDelta |
| P1_INSUFFICIENT | P-01+P-11 | Performance | P1 | ffmi_v1 | insufficient | none | none | 0 | no_governed_numeric_channel | n/a | n/a | unavailable | unresolved_construct |  |
| P1_UNDATED_ONLY | P-01+P-11 | Performance | P1 | ffmi_v1 | undated_only | none | none | 1 | value_present_measuredAt_absent | absent | governed | unavailable | invalid_provenance |  |
| P1_UNSUPPORTED | P-01+P-11 | Performance | P1 | ffmi_v1 | unsupported | none | none | 1 | unsupported_method_observation | valid | consumer_bia | unavailable | unsupported_method | consumer_bia |
| P3_RESOLVED | P-01+P-11 | Performance | P3 | fmi_v1 | resolved | none | none | 1 | single_governed_primary | valid | governed | available | null | primaryEvidenceRef required |
| P3_RESOLVED_WITH_SUPPORTING | P-01+P-11 | Performance | P3 | fmi_v1 | resolved_with_supporting | none | none | 2 | primary_plus_supporting_same_value | valid | governed | available | null | supporting distinct sourceEventId |
| P3_MULTIPLE_VALID | P-01+P-11 | Performance | P3 | fmi_v1 | multiple_valid | none | none | 2 | two_same_value_different_sourceEventId | valid | governed | unavailable | multiple_valid_unfrozen | no score-layer winner |
| P3_POLICY_NOT_FROZEN | P-01+P-11 | Performance | P3 | fmi_v1 | policy_not_frozen | none | none | 0 | status_only | n/a | n/a | unavailable | policy_not_frozen | do not repair downstream |
| P3_CONFLICT_VALUE_DISAGREEMENT | P-01+P-11 | Performance | P3 | fmi_v1 | conflict | none | none | 2 | value_disagreement_same_channel | valid_same | governed_same | unavailable | conflict_unresolved | values=baseline±conflictDelta |
| P3_INSUFFICIENT | P-01+P-11 | Performance | P3 | fmi_v1 | insufficient | none | none | 0 | no_governed_numeric_channel | n/a | n/a | unavailable | unresolved_construct |  |
| P3_UNDATED_ONLY | P-01+P-11 | Performance | P3 | fmi_v1 | undated_only | none | none | 1 | value_present_measuredAt_absent | absent | governed | unavailable | invalid_provenance |  |
| P3_UNSUPPORTED | P-01+P-11 | Performance | P3 | fmi_v1 | unsupported | none | none | 1 | unsupported_method_observation | valid | consumer_bia | unavailable | unsupported_method | consumer_bia |
| H1_MISSING_VALUE | P-01+P-11 | Health | H1 | whtr_v1 | resolved | MISSING_VALUE | none | 1 | single_governed_primary | valid | governed | unavailable | invalid_provenance | numeric removed only |
| H1_MISSING_MEASURED_AT | P-01+P-11 | Health | H1 | whtr_v1 | resolved | MISSING_MEASURED_AT | none | 1 | single_governed_primary | absent | governed | unavailable | invalid_provenance | value retained |
| H1_MISSING_REQUIRED_METHOD | P-01+P-11 | Health | H1 | whtr_v1 | resolved | MISSING_REQUIRED_METHOD | none | 1 | single_governed_primary | valid | unknown_waist_protocol | unavailable | unsupported_method | unknown_waist_protocol |
| H1_MISSING_HEIGHT | P-01+P-11 | Health | H1 | whtr_v1 | resolved | none | MISSING_HEIGHT | 1 | single_governed_primary | valid | governed | unavailable | required_height_missing | Height required for WHtR/FMI/FFMI/ALMI |
| H2_MISSING_VALUE | P-01+P-11 | Health | H2 | fmi_v1 | resolved | MISSING_VALUE | none | 1 | single_governed_primary | valid | governed | unavailable | invalid_provenance | numeric removed only |
| H2_MISSING_MEASURED_AT | P-01+P-11 | Health | H2 | fmi_v1 | resolved | MISSING_MEASURED_AT | none | 1 | single_governed_primary | absent | governed | unavailable | invalid_provenance | value retained |
| H2_MISSING_REQUIRED_METHOD | P-01+P-11 | Health | H2 | fmi_v1 | resolved | MISSING_REQUIRED_METHOD | none | 1 | single_governed_primary | valid | consumer_bia | unavailable | unsupported_method | consumer_bia |
| H2_MISSING_HEIGHT | P-01+P-11 | Health | H2 | fmi_v1 | resolved | none | MISSING_HEIGHT | 1 | single_governed_primary | valid | governed | unavailable | required_height_missing | Height required for WHtR/FMI/FFMI/ALMI |
| H2_MISSING_SEX | P-01+P-11 | Health | H2 | fmi_v1 | resolved | none | MISSING_SEX | 1 | single_governed_primary | valid | governed | unavailable | required_sex_missing | H1 excluded |
| H3_ALMI_MISSING_VALUE | P-01+P-11 | Health | H3 | almi_v1 | resolved | MISSING_VALUE | none | 1 | single_governed_primary | valid | governed | unavailable | invalid_provenance | numeric removed only |
| H3_ALMI_MISSING_MEASURED_AT | P-01+P-11 | Health | H3 | almi_v1 | resolved | MISSING_MEASURED_AT | none | 1 | single_governed_primary | absent | governed | unavailable | invalid_provenance | value retained |
| H3_ALMI_MISSING_REQUIRED_METHOD | P-01+P-11 | Health | H3 | almi_v1 | resolved | MISSING_REQUIRED_METHOD | none | 1 | single_governed_primary | valid | consumer_bia | unavailable | unsupported_method | consumer_bia |
| H3_ALMI_MISSING_HEIGHT | P-01+P-11 | Health | H3 | almi_v1 | resolved | none | MISSING_HEIGHT | 1 | single_governed_primary | valid | governed | unavailable | required_height_missing | Height required for WHtR/FMI/FFMI/ALMI |
| H3_ALMI_MISSING_SEX | P-01+P-11 | Health | H3 | almi_v1 | resolved | none | MISSING_SEX | 1 | single_governed_primary | valid | governed | unavailable | required_sex_missing | H1 excluded |
| H3_FFMI_MISSING_VALUE | P-01+P-11 | Health | H3 | ffmi_v1 | resolved | MISSING_VALUE | none | 1 | single_governed_primary | valid | governed | unavailable | invalid_provenance | numeric removed only |
| H3_FFMI_MISSING_MEASURED_AT | P-01+P-11 | Health | H3 | ffmi_v1 | resolved | MISSING_MEASURED_AT | none | 1 | single_governed_primary | absent | governed | unavailable | invalid_provenance | value retained |
| H3_FFMI_MISSING_REQUIRED_METHOD | P-01+P-11 | Health | H3 | ffmi_v1 | resolved | MISSING_REQUIRED_METHOD | none | 1 | single_governed_primary | valid | consumer_bia | unavailable | unsupported_method | consumer_bia |
| H3_FFMI_MISSING_HEIGHT | P-01+P-11 | Health | H3 | ffmi_v1 | resolved | none | MISSING_HEIGHT | 1 | single_governed_primary | valid | governed | unavailable | required_height_missing | Height required for WHtR/FMI/FFMI/ALMI |
| H3_FFMI_MISSING_SEX | P-01+P-11 | Health | H3 | ffmi_v1 | resolved | none | MISSING_SEX | 1 | single_governed_primary | valid | governed | unavailable | required_sex_missing | H1 excluded |
| P1_MISSING_VALUE | P-01+P-11 | Performance | P1 | ffmi_v1 | resolved | MISSING_VALUE | none | 1 | single_governed_primary | valid | governed | unavailable | invalid_provenance | numeric removed only |
| P1_MISSING_MEASURED_AT | P-01+P-11 | Performance | P1 | ffmi_v1 | resolved | MISSING_MEASURED_AT | none | 1 | single_governed_primary | absent | governed | unavailable | invalid_provenance | value retained |
| P1_MISSING_REQUIRED_METHOD | P-01+P-11 | Performance | P1 | ffmi_v1 | resolved | MISSING_REQUIRED_METHOD | none | 1 | single_governed_primary | valid | consumer_bia | unavailable | unsupported_method | consumer_bia |
| P1_MISSING_HEIGHT | P-01+P-11 | Performance | P1 | ffmi_v1 | resolved | none | MISSING_HEIGHT | 1 | single_governed_primary | valid | governed | unavailable | required_height_missing | Height required for WHtR/FMI/FFMI/ALMI |
| P1_MISSING_SEX | P-01+P-11 | Performance | P1 | ffmi_v1 | resolved | none | MISSING_SEX | 1 | single_governed_primary | valid | governed | unavailable | required_sex_missing | H1 excluded |
| P3_MISSING_VALUE | P-01+P-11 | Performance | P3 | fmi_v1 | resolved | MISSING_VALUE | none | 1 | single_governed_primary | valid | governed | unavailable | invalid_provenance | numeric removed only |
| P3_MISSING_MEASURED_AT | P-01+P-11 | Performance | P3 | fmi_v1 | resolved | MISSING_MEASURED_AT | none | 1 | single_governed_primary | absent | governed | unavailable | invalid_provenance | value retained |
| P3_MISSING_REQUIRED_METHOD | P-01+P-11 | Performance | P3 | fmi_v1 | resolved | MISSING_REQUIRED_METHOD | none | 1 | single_governed_primary | valid | consumer_bia | unavailable | unsupported_method | consumer_bia |
| P3_MISSING_HEIGHT | P-01+P-11 | Performance | P3 | fmi_v1 | resolved | none | MISSING_HEIGHT | 1 | single_governed_primary | valid | governed | unavailable | required_height_missing | Height required for WHtR/FMI/FFMI/ALMI |
| P3_MISSING_SEX | P-01+P-11 | Performance | P3 | fmi_v1 | resolved | none | MISSING_SEX | 1 | single_governed_primary | valid | governed | unavailable | required_sex_missing | H1 excluded |
| H1_MISSING_SEX | P-01+P-11 | Health | H1 | whtr_v1 | not_applicable | none | MISSING_SEX | 0 | not_applicable | n/a | n/a | not_applicable | not_applicable | MUST NOT execute — H1 sex-independent |
| HEALTH_MISSING_DOB | P-01+P-11 | Health | AGGREGATE | n/a | resolved | none | MISSING_DOB | n/a | engine_dob_removed | valid | governed | unavailable | required_age_missing | construct inputs otherwise valid |
| PERF_MISSING_DOB | P-01+P-11 | Performance | AGGREGATE | n/a | resolved | none | MISSING_DOB | n/a | engine_dob_removed | valid | governed | unavailable | required_age_missing | construct inputs otherwise valid |

**Matrix row count (fixture families):** 81
**Instantiations:** each family × 2 baselines (`P-01`, `P-11`) = **162** executable fixture instances (except `H1_MISSING_SEX` which is `not_applicable` and MUST NOT execute — still listed for zero-choice closure).

**`not_applicable` handling:** if a status/mutation is not meaningful for a construct/channel, the matrix freezes `not_applicable` explicitly. The executor must not decide membership.

##### 23.17.4.9 BCV-015 zero-choice audit

| Choice | Remaining? |
|--------|------------|
| H1 multiple_valid branch (general vs §10.2 exception) | **NO** — §23.17.4.1 |
| H1 exception governed WHtR / second candidate shape | **NO** — §23.17.4.1 |
| Demographic fixture types / applicability | **NO** — §23.17.4.2 |
| DOB level (engine vs construct) | **NO** — §23.17.4.2 |
| Conflict type / numeric construction / conflictDelta | **NO** — §23.17.4.3 |
| H3 conflict channel separation | **NO** — §23.17.4.3 |
| Candidate count / expected reason / fixture IDs / matrix membership | **NO** — §23.17.4.8 |

**TOTAL MATERIAL BCV-015 CHOICES: 0.**

#### 23.17.5 BCV-001 2D surface axis grid

Authoritative definition is §23.5.3 (`canonicalAxisGrid` + Cartesian product). Dense-local grids remain 1D diagnostics only. No 2D axis-step choice remains.

#### 23.17.6 BCV-032A change-method formula enumeration

Methodology-consistency audit only. Exact measurement-error formulas:

```text
SEM_diff = SD(delta) / sqrt(2)
  where delta = repeatedMeasurement2 - repeatedMeasurement1

SDC95_individual = 1.96 * sqrt(2) * SEM_diff
                 = 1.96 * SD(delta)     (algebraic identity)

MDC95_individual = SDC95_individual     (terminology alias only)
```

- Group-level SDC: **SHALL NOT** calculate in Wave 1 (no empirical study N).
- Clinical meaningful change: **NO formula** in Wave 1 — evidence-dependent unresolved.
- User-perceived meaningful change: **NO formula** in Wave 1 — evidence-dependent unresolved.

BCV-032A must prove these concepts remain separate and must not manufacture clinical/user thresholds.

#### 23.17.7 BCV-017 directional pass/fail rubric

Replace qualitative free-text pass/fail. For every persona and every applicable construct/aggregate, `expectedRelation ∈ {higher, lower, equal, not_applicable}` relative to the sex-specific §23.5.4 reference (Health vs Performance as in §23.10).

Computed predicate for scores `S_persona` vs `S_reference`:

```text
if S_persona > S_reference + EPS_NUM: observedRelation = "higher"
else if S_persona < S_reference - EPS_NUM: observedRelation = "lower"
else: observedRelation = "equal"

Pass iff observedRelation == expectedRelation
not_applicable rows are excluded from the pass denominator
```

Aggregate reference = aggregate score generated from the corresponding sex-specific frozen §23.5.4 reference anchor. No new reference score may be chosen by execution code.

#### 23.17.8 False-improvement vs BASE (BCV-034)

For each persona and scenario:

```text
baseAggregate = score under BASE
scenarioAggregate = score under scenario

falseImprovementIndicator =
  1 if scenarioAggregate - baseAggregate > EPS_NUM
  0 otherwise
  null if either aggregate is unavailable

falseImprovementRate =
  count(indicator == 1) / count(indicator ∈ {0,1})
```

Report unavailable count separately.

“False improvement” means apparent score improvement caused by the synthetic acute-state perturbation, not validated durable biological improvement. **Not** a clinical false-positive rate.

#### 23.17.9 Required result field names

Where applicable, emit exactly:

`absoluteContribution`, `marginalContributionPerConstructPoint`, `weightedDeficit`, `dominantAdverseConstruct`, `changeContribution`, `directionalReversalProbability`, `varianceContribution`, `constructUncertaintyShare`, `falseImprovementIndicator`, `falseImprovementRate`.

Use `null` only where mathematically undefined under the rules above.

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

## 28. End-state of this BCV-015 fixture-semantics closure

| Item | Status |
|------|--------|
| Private validation plan | **COMPLETE / PENDING FINAL BCV-015 RE-GATE** |
| Wave 1 execution semantics (non-BCV-015) | **CLOSED** |
| BCV-015 fixture semantics (docs) | **CLOSED** (pending independent confirmation) |
| Wave 1 execution | **BLOCKED** |
| Tier B | **NOT AUTHORIZED** |
| Validation execution | **NOT STARTED** |
| Clinical validation | **NOT ESTABLISHED** |
| Consumer integration | **NOT AUTHORIZED** |
| Public Health / Performance-Supporting | **NO-GO** |

**Next action:** open a **new independent reviewer** against the new SHA inspecting **only**: H1 `multiple_valid` general vs §10.2 exception; exact demographic fixture enumeration; exact conflict construction; complete BCV-015 fixture matrix; zero remaining BCV-015 executor choices; docs-only/status integrity. Only if that review returns **PASS** and **WAVE 1 SYNTHETIC VALIDATION EXECUTION: AUTHORIZED** may the Wave 1 execution agent be reopened.

---

END OF PRIVATE / INTERNAL VALIDATION PLAN V1 (BCV-015 FIXTURE-SEMANTICS CLOSURE)

