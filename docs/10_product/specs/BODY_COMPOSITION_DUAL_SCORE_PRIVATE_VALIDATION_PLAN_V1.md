# Body Composition Dual Score — Private / Internal Validation Plan V1

**Document type:** Validation protocol (planning only)
**Date:** 2026-10-04
**Branch:** `feat/body-composition-stage3e-body-scans-v1`
**Kind:** Documentation only. **Does not** change formulas, knots, weights, eligibility, recency, Resolver, Confidence, score names, runtime, tests, UI, API, persistence, or deployment.

| Identity | Value |
|----------|-------|
| Implementation truth-freeze SHA | `3bed6aa6012690737bb5f7455a4397ca6a3bfe64` |
| Approved runtime implementation SHA | `d940b1616b341e98b19e82f2cd6a6242dfe41691` |
| Mathematical truth-freeze SHA | `e258267d109d1d05e20270f205e5fdb29ae2aca6` |
| Health version | `body_composition_health_score_draft_v1` |
| Performance-Supporting version | `body_composition_performance_supporting_score_draft_v1` |
| Companion decision register | `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_VALIDATION_DECISION_REGISTER_V1.md` |

> **This document is a VALIDATION PROTOCOL.**
> It is **not** a score specification, mathematical freeze, clinical validation claim, or authorization for consumer release.

---

## 0. Mission and hard boundaries

### 0.1 Mission

Design the rigorous **PRIVATE / INTERNAL** validation program required before Oli may even consider exposing either Body Composition score to consumers.

Mathematical implementation correctness is already established (Exact-Math Implementation Re-Gate V2 **PASS**). That does **not** establish that either score is:

- clinically meaningful;
- stable longitudinally;
- robust to measurement error;
- fair across populations;
- interpretable;
- useful;
- suitable for consumer presentation;
- suitable for health claims.

### 0.2 Hard boundaries (this phase)

**DO NOT:**

- change any formula, knot, weight, eligibility, recency, Resolver policy, Confidence policy, or score name;
- add UI, API exposure, public score persistence, or deployment;
- claim clinical validation;
- describe scores as diagnostic;
- authorize consumer release;
- invent final acceptance numbers without literature / domain standard / scientific review.

If validation later suggests the formula should change: **document evidence** and open a **FUTURE scientific-review question**. Do **not** change draft_v1 during validation planning or execution authorization gaps.

### 0.3 Current authority state (frozen for this plan)

| Gate | Status |
|------|--------|
| Scientific foundation | **PASS** |
| Mathematical implementation | **PASS** |
| Internal engines | **PASS** |
| Implementation truth freeze | **PASS** @ `3bed6aa…` |
| Independent docs re-gate | **PASS** |
| Clinical validation | **NOT ESTABLISHED** |
| Consumer validity | **NOT ESTABLISHED** |
| Consumer integration | **NOT AUTHORIZED** |
| Public Health score | **NO-GO** |
| Public Performance-Supporting score | **NO-GO** |
| Private validation plan | **THIS DOCUMENT** · ready for independent methodology review |
| Validation execution | **NOT STARTED** / **NOT AUTHORIZED** by this plan alone |

### 0.4 Authority stack (do not reinterpret)

```text
CANONICAL EVIDENCE
  → EVIDENCE RESOLVER (truth-frozen)
  → ASSESSMENT CONFIDENCE (factual; qualitative unused)
  → SCORE ENGINE (internal draft; public NO-GO)
```

Frozen authorities:

- Mathematical: `BODY_COMPOSITION_DUAL_SCORE_MATHEMATICAL_TRUTH_FREEZE_V1.md`
- Implementation: `BODY_COMPOSITION_DUAL_SCORE_ENGINE_IMPLEMENTATION_TRUTH_FREEZE_V1.md`
- Science: `BODY_COMPOSITION_DUAL_SCORE_SCIENTIFIC_SPEC_V1.md`
- Engine map: `BODY_COMPOSITION_DUAL_SCORE_ENGINE_IMPLEMENTATION_V1.md`
- Resolver / Confidence truth freezes
- Canonical Waist / index / Body Scan foundation docs

---

## 1. Validation layers (non-collapsible)

Each layer answers a distinct question. Passing one layer never implies another.

| Layer | Name | Core question |
|-------|------|---------------|
| **V1** | Mathematical robustness | Is score behavior stable, continuous, and explainable across the practical input domain? |
| **V2** | Measurement-error robustness | How much can scores move from measurement noise alone? |
| **V3** | Longitudinal stability | Do repeated real trajectories behave sensibly under signal and noise? |
| **V4** | Biological plausibility | Are directional outcomes explainable for synthetic personas / paradoxical cases? |
| **V5** | Method/source robustness | Are DXA / Waist method variations tolerable for one scoring function? |
| **V6** | Construct validity | Do scores associate with intended external constructs (not circular inputs)? |
| **V7** | Known-groups validity | Do distributions separate groups expected to differ? |
| **V8** | Fairness / subgroup performance | Are there clinically material subgroup biases? |
| **V9** | Explainability / comprehension | Can a user understand *why* a score is what it is? |
| **V10** | False-precision / uncertainty | Does presentation imply more certainty than measurement/model support? |
| **V11** | Outcome association | Do scores associate with meaningful outcomes (cross-sectional → prospective)? |
| **V12** | Release-readiness | Have privacy, legal, fairness, reliability, and claim-level gates cleared? |

**Rule:** Do not collapse these into one generic “validation” claim.

---

## 2. V1 — Mathematical robustness

### 2.1 Purpose

Existing mathematical / implementation tests are **necessary but insufficient**. Expand stress testing across the practical input domain without changing frozen math.

### 2.2 Input coverage

| Class | Examples |
|-------|----------|
| Dense grids | WHtR, FMI, ALMI, FFMI over practical ranges by sex |
| Monte Carlo | Random draws from truncated physiological priors |
| Extreme plausible | Very low/high central adiposity; high muscularity; sarcopenic-lean |
| Extreme implausible | Negative / absurd indices; non-finite; out-of-range |
| Exact knots | All frozen knot x-values |
| ±ε around knots | Continuity / slope checks |
| Sex boundaries | male / female / missing / invalid |
| Age boundaries | day-before-20; exact-20; leap-day; elderly adults |
| Recency boundaries | `asOf±1ms`; 179d; 180d; 180d+1ms; gap 89/90/90+1 |
| Missing-data combinations | Each core construct missing alone and jointly |
| Resolver status combinations | `resolved`, `resolved_with_supporting`, `multiple_valid`, `policy_not_frozen`, `conflict`, `insufficient`, `undated_only`, `unsupported` |

### 2.3 Required analyses

| Analysis | Intent |
|----------|--------|
| Monotonic regions | Confirm intentional non-increasing / non-decreasing segments |
| Intentional non-monotonic / plateau | Confirm plateaus (e.g. H1 ≤0.40; FMI mid plateaus) |
| Discontinuity detection | No jumps except fail-closed withhold transitions |
| Derivative / slope behavior | Local slopes near knots; no explosive sensitivity |
| Local sensitivity | ∂score/∂input near operating points |
| Aggregate sensitivity | Contribution of each construct to aggregate movement |

### 2.4 Metrics (descriptive; thresholds unresolved)

- Fraction of grid cells continuous within ε
- Max jump at non-boundary points
- Local Lipschitz estimates per region
- Withhold-rate under missing/Resolver grids
- Floor / ceiling occupancy rates

**Acceptance numbers:** **UNRESOLVED** — candidates only after evidence reviews (see §16).

---

## 3. V2 — Measurement-error robustness

### 3.1 Purpose

Model realistic measurement uncertainty and quantify score movement without biological change.

### 3.2 Minimum error sources

| Input | Error model (planning) |
|-------|------------------------|
| Waist circumference | Repeated-measure protocol error (same day / short interval) |
| Height | Measurement variation / rounding |
| DXA fat mass / lean / ALM | Test–retest variability (same machine baseline) |
| FMI | Propagated from FM + height error |
| ALMI | Propagated from ALM + height error |
| FFMI | Propagated from FFM + height error |

Exact σ values are **literature-dependent** (ER-BC-01, ER-BC-02). Do not fabricate σ here.

### 3.3 Monte Carlo perturbation protocol

For each synthetic or empirical subject:

1. Hold biological truth fixed.
2. Draw measurement noise from literature-informed (or candidate) distributions.
3. Recompute indices → Resolver-eligible inputs → both scores.
4. Record absolute / signed score deltas and threshold-crossing events.

### 3.4 Questions

- How much can score move from measurement noise alone?
- How often can a person cross an apparent threshold without meaningful biological change?
- Which constructs dominate instability (H1 vs H2 vs H3; P1 vs P3)?

### 3.5 Score stability metrics

| Metric | Notes |
|--------|-------|
| Mean absolute score variation | Primary descriptive |
| Median absolute variation | Robust central |
| 90th / 95th percentile absolute variation | Tail risk |
| Intraclass correlation (ICC) | Test–retest reliability |
| Test–retest reliability coefficient | Paired repeats |
| Coefficient of variation | Only where mean ≫ 0 and meaningful |
| Threshold-crossing probability | For candidate display bands / integers |
| Rank-order stability | Spearman / Kendall across repeats |

**Separate:**

| Class | Meaning |
|-------|---------|
| Exploratory target | Research aspiration for study design |
| Evidence-supported acceptance threshold | Requires literature / domain standard / scientific review |

**Do not freeze** ICC > X, MAE < Y, fairness Δ < Z as product policy in this plan.

---

## 4. V3 — Longitudinal stability

### 4.1 Design

Evaluate repeated real (or ethically approved de-identified) measurements under scenarios:

| Scenario | Signal expectation (qualitative) |
|----------|----------------------------------|
| Stable body composition | Small score movement ≈ noise envelope |
| Fat-loss phase | Health / P3 directionally favorable if central + total adiposity improve |
| Muscle-gain phase | P1 / H3 directionally favorable if lean indices rise |
| Detraining | Lean constructs may decline |
| Aging | Composition may change; **score has no age slope** — record implications |
| Rapid weight change | Possible overreaction if DXA/Waist lag or hydration dominate |
| Acute hydration variation | DXA lean/fat noise; expect score jitter |
| Illness / recovery | Transient composition shifts |
| Training blocks | Performance-Supporting may move with FFMI/FMI |

### 4.2 Evaluations

- Within-person signal vs noise
- Trajectory smoothness
- Lag relative to known interventions
- Overreaction / underreaction relative to measured composition change
- Unscorable episodes under 180d / 90d rules

### 4.3 Temporal coherence (frozen rules — do not change)

Frozen draft_v1:

- **180-day** input-age rule (`MAX_INPUT_AGE_MS`)
- **90-day** cross-construct era rule (`MAX_GAP_MS`)
- Same verified Body Scan `sourceEventId` forces era gap 0

Questions (evidence only):

1. Does 90d permit biologically mismatched snapshots (e.g. Waist far from DXA era)?
2. How frequently would users become unscorable in realistic cadences?
3. Does the same-scan rule behave sensibly for multi-metric DXA?

If evidence suggests policy tension: open **FUTURE scientific-review question**. Do **not** alter rules in this phase.

---

## 5. V4 — Biological plausibility

### 5.1 Synthetic personas

Span low/high for:

- central adiposity (WHtR)
- FMI
- ALMI
- FFMI
- combinations (including paradoxes)

### 5.2 Paradoxical cases (must document expected directional story)

| Persona | Intent |
|---------|--------|
| Extremely lean but sarcopenic | High H1/H2-ish adiposity favorability possible; H3/P1 adverse |
| High muscularity + high central adiposity | P1 favorable; H1 adverse; aggregate tension |
| Normal BMI + high central adiposity | H1 adverse despite “normal” BMI (BMI non-scoring) |
| High BMI driven by muscularity | Lean constructs favorable; adiposity constructs may still matter |
| Low FMI + low lean reserve | Adiposity favorable; lean adverse |
| High lean reserve + poor adiposity | Lean favorable; H1/H2/P3 adverse |

Confirm: aggregate direction is explainable from construct contributions; detect hiding of adverse constructs.

---

## 6. V5 — Method / source robustness

### 6.1 Scope

Numeric draft_v1 uses:

- standardized Waist/Height (WHO midpoint WHtR)
- DXA-derived FMI / ALMI / FFMI

### 6.2 DXA variability axes

| Axis | Study need |
|------|------------|
| Same machine / same operator | Baseline precision |
| Same machine / different operator | Operator effect |
| Different machines (same vendor) | Site calibration |
| Different manufacturers | Cross-vendor bias |
| Software-version differences | Algorithm drift |
| Positioning differences | Technical error |
| Fasting / hydration / time-of-day | Physiological noise |

### 6.3 DXA cross-platform question

Explicitly study whether **Hologic**, **GE Lunar**, and other supported DXA systems produce sufficiently comparable FMI / ALMI / FFM outputs for **one** scoring function.

**Do not assume interchangeability.**

Evidence required before any consumer consideration:

- paired or bridging studies with reported bias / LoA for FMI, ALMI, FFMI;
- score-delta distributions under vendor swaps holding biology fixed;
- decision whether vendor-specific transforms would be needed (**future scientific review only** — not draft_v1 change here).

---

## 7. V6 — Construct validity

### 7.1 Health Composition

Evaluate against external constructs such as:

- central adiposity markers
- metabolic health risk markers
- cardiometabolic risk markers
- lean reserve / sarcopenia-related constructs

### 7.2 Performance-Supporting Composition

Evaluate against:

- strength
- relative strength
- physical function
- power
- aerobic / anaerobic performance where appropriate

**Important:** correlation ≠ clinical validity ≠ causal claim.

### 7.3 Candidate external variables

| Variable | Score relevance | Priority |
|----------|-----------------|----------|
| Blood pressure | Health | Primary candidate |
| Fasting glucose | Health | Primary candidate |
| HbA1c | Health | Primary candidate |
| Fasting insulin / HOMA-IR | Health | Secondary |
| Triglycerides | Health | Secondary |
| HDL | Health | Secondary |
| hs-CRP | Health | Exploratory |
| Waist / WHtR (external protocol) | Health (convergent; careful circularity) | Secondary |
| Grip strength | Performance-Supporting / lean | Primary candidate |
| Chair-rise / STS | Performance-Supporting / function | Primary candidate |
| Gait speed | Function / aging | Secondary |
| Squat / bench / deadlift (BW-normalized) | Performance-Supporting | Secondary |
| Jump / power measures | Performance-Supporting | Secondary |
| VO₂max | Performance-Supporting (divergent expected) | Exploratory |

These variables are **not** implied to exist in Oli today.

---

## 8. V7 — Known-groups validity

Test whether score distributions differentiate groups expected to differ, **avoiding circular validation** that merely reuses exact scoring inputs as group labels.

| Group (examples) | Expectation (qualitative) | Circularity guard |
|------------------|---------------------------|-------------------|
| DXA-confirmed low lean reserve (external criteria / clinical referral, not score threshold) | Lower H3 / P1 / related aggregates | Do not define group by H3 score |
| High central adiposity (external clinical / imaging criteria) | Lower H1 / Health | Prefer independent labeling |
| Favorable composition cohort | Higher scores | Independent inclusion criteria |
| Trained strength athletes | Higher P1; Health mixed | Sport/training criteria, not FFMI cut from score |
| Sedentary populations | Lower Performance-Supporting on average | Activity criteria external |

---

## 9. V8 — Fairness / subgroup performance

### 9.1 Subgroups

| Factor | Why |
|--------|-----|
| Age | Adult gate ≥20; **no age slope** — identical composition ⇒ identical score at 20/40/60/80 |
| Sex | Sex-specific transforms for FMI/ALMI/FFMI |
| Height / body size | Index denominators; measurement interaction |
| BMI range | Non-scoring but distributional context |
| Athletic status | Muscularity plateaus / ceilings |
| Menopausal status | If data permit |
| DXA platform | Method bias proxy |
| Geographic / site cohort | Selection / calibration |

### 9.2 Ethnicity

Ethnicity is **unused** in draft_v1 math. Validation must evaluate whether omission creates systematic bias.

**Do not introduce ethnicity into the formula during this phase.**

### 9.3 Age fairness (structural)

Validate whether age invariance remains defensible for:

- Health Composition
- Performance-Supporting Composition

Document evidence for future scientific review if age-invariant behavior is not defensible. **Do not change it here.**

### 9.4 Sex fairness

Evaluate sex-specific transforms for:

- score distributions
- ceiling / floor rates
- percentile behavior
- sensitivity
- known-group separation

Identify systematic compression, expansion, ceiling, or floor effects.

---

## 10. V9 — Explainability / user comprehension

### 10.1 Requirement (future internal output — no UI)

Before showing a score, determine whether a user can understand **why**.

Design requirements for future **internal** explainability payloads (not consumer UI):

**Health Composition**

- Central Adiposity (H1)
- Total Adiposity (H2)
- Lean Reserve (H3)

**Performance-Supporting Composition**

- Muscularity (P1)
- Adiposity (P3)

Requirements:

- dominant construct identifiable;
- adverse construct not hidden by aggregate;
- change attribution over time;
- withhold reasons human-translatable (internal).

### 10.2 Score contribution analysis

Quantify:

- absolute contribution
- marginal contribution
- dominant construct
- change contribution over time

Detect cases where aggregate direction hides an important adverse construct.

---

## 11. V10 — False precision / uncertainty

### 11.1 Risk

A score like `73` can imply greater certainty than measurement/model support.

### 11.2 Presentation candidates (not chosen)

| Form | Status |
|------|--------|
| Integer | Candidate |
| Range | Candidate |
| Band | Candidate |
| Rounded interval | Candidate |
| Score + confidence state | Candidate |
| Score + construct explanation | Candidate |

**Do not choose final consumer representation yet.**

### 11.3 Minimum meaningful change (MMC)

Design empirical estimation:

1. Estimate noise envelope from V2 / V3 (e.g. 90th percentile absolute retest Δ).
2. Treat MMC candidates (+1, +3, +5, +10) as **hypotheses**, not thresholds.
3. Select MMC only after evidence review + scientific review.

**Do not invent MMC threshold in this plan.**

---

## 12. V11 — Outcome association

### 12.1 Health Composition (longer-term)

Potential outcomes (only where ethically/scientifically appropriate):

- cardiometabolic deterioration
- incident metabolic syndrome
- mobility decline
- hospitalization
- all-cause mortality

### 12.2 Performance-Supporting

- strength / function / performance outcomes

### 12.3 Claim ladder (must distinguish)

| Claim type | Meaning |
|------------|---------|
| Cross-sectional association | Concurrent correlation |
| Prospective association | Temporal precedence |
| Predictive validation | Out-of-sample prediction quality |
| Causal claim | Intervention / causal identification — **not in scope for product index** |

---

## 13. V12 — Release-readiness

Release-readiness is a meta-layer: privacy/security, legal/regulatory, fairness, reliability, explainability, and claim taxonomy must all clear. See §§14–15 and risk register.

---

## 14. Calibration dataset strategy

| Tier | Content | Can prove | Cannot prove |
|------|---------|-----------|--------------|
| **A** Synthetic | Grids, Monte Carlo, personas | Math robustness, structural fairness, noise propagation under assumed σ | Clinical meaning, real-world fairness, outcomes |
| **B** De-identified internal / controlled pilot | Approved privacy-gated repeats | Test–retest, limited known-groups, method checks | Broad external validity, outcomes |
| **C** External research / reference | Legally permitted datasets | Construct / outcome associations under dataset limits | Oli product UX validity; may not match Oli methods |
| **D** Prospective Oli cohort (future) | Opt-in research cohort | Product-relevant longitudinal + outcome signals | Instant clinical validation |

Synthetic tests ≠ clinical validation. Correlation ≠ clinical validation. Internal user testing ≠ necessarily clinical validation.

---

## 15. Privacy / de-identification / real-user gates

### 15.1 Private validation dataset requirements

- minimum necessary data
- pseudonymous subject IDs
- no names / emails / phone / address
- access control
- dataset provenance
- auditability
- retention + deletion
- export restrictions
- research-purpose labeling

**Forbidden:**

- copying real user DXA PDFs into the repo
- putting PHI in fixtures
- using real-user data merely because it is available

### 15.2 Prerequisites before real-user validation

1. Consent / legal basis
2. Privacy gate
3. Data-use definition
4. Access control
5. Retention / deletion policy
6. Approved storage boundary (Oli Vault / privacy architecture)

---

## 16. Sample-size planning

Do **not** invent one magical N.

Plan N separately for:

| Study class | Planning basis |
|-------------|----------------|
| Test–retest reliability | Precision of ICC CI or SEM targets |
| Subgroup fairness | Minimum per-cell n for CI width on Δ |
| Correlations | CI width / power for expected ρ |
| Known-groups | Detectable standardized mean difference |
| Longitudinal change | Within-person variance + desired CI |
| DXA cross-platform | LoA / bias precision targets |

Actual N follows **power analysis** or **precision-based CI targets** after evidence reviews set candidate parameters.

---

## 17. Release-risk register

| ID | Risk | Severity | Likelihood | Validation method | Mitigation | Release blocker |
|----|------|----------|------------|-------------------|------------|-----------------|
| R1 | Measurement error dominates score movement | High | Medium | V2 Monte Carlo; retest | MMC; presentation dampening; protocol QC | **Yes** if clinically material |
| R2 | DXA platform bias | High | Medium | V5 cross-vendor | Vendor bridging; future model review | **Yes** if unexplained drift |
| R3 | Age invariance inappropriate | High | Medium | V8 age fairness; literature | Future scientific redesign question | **Yes** if clinically material |
| R4 | Sex transform bias | High | Medium | V8 sex fairness | Future scientific redesign question | **Yes** if clinically material |
| R5 | False precision | High | High | V10 presentation studies | Range/band/confidence experiments | **Yes** until resolved for claim level |
| R6 | Ceiling / floor effects | Medium | Medium | V1/V8 occupancy | Document; future knot review | Conditional |
| R7 | Construct dominance hides adverse signal | High | Medium | V9 contribution analysis | Explainability required | **Yes** if unexplainable adverse hide |
| R8 | Misleading health interpretation | High | Medium | V9 comprehension; claim taxonomy | Language controls; Level gate | **Yes** |
| R9 | Consumer over-trust | High | High | V9/V10 | Claim Level ≤ authorized; no diagnostic language | **Yes** |
| R10 | Longitudinal instability | High | Medium | V3 | Noise envelope; cadence guidance | **Yes** if excessive |
| R11 | Missing-data selection bias | Medium | Medium | Missingness sims; cohort audit | Fail-closed transparency; sampling design | Conditional |
| R12 | Affluent / health-conscious cohort bias | High | High | External Tier C; demographics audit | Broader sampling | **Yes** for broad consumer claims |

---

## 18. Release claim taxonomy

| Level | Meaning | Current Dual Score state |
|-------|---------|--------------------------|
| **0** | Internal experimental index | **CURRENT** |
| **1** | Descriptive wellness index | Not authorized |
| **2** | Validated association with health/performance constructs | Not authorized |
| **3** | Predictive claim | Not authorized |
| **4** | Clinical / diagnostic claim | Not authorized — out of product intent for draft_v1 |

This plan does **not** authorize advancement beyond Level 0.

---

## 19. Release criteria categories

Mark thresholds carefully:

| Category | Frozen now? | Notes |
|----------|-------------|-------|
| Measurement reliability | **Unresolved** | Candidates after ER-BC-01/02 |
| Longitudinal stability | **Unresolved** | Needs V3 |
| Subgroup fairness | **Unresolved** | Needs V8 + scientific review |
| Explainability | Requirements defined; pass/fail unresolved | V9 |
| Robustness | Unresolved | V1/V2/V5 |
| Floor/ceiling behavior | Unresolved | V1/V8 |
| Missingness | Unresolved | Simulations + empirical |
| External validity | Unresolved | V6/V7/V11 |
| Privacy/security | Process gates defined | Must PASS before Tier B+ |
| Legal/regulatory review | Required before consumer | Separate authority |
| Human comprehension | Unresolved | V9 experiments |

**Candidate / research target / unresolved** — never silent “policy.”

---

## 20. Hard public release blockers (automatic NO-GO)

Any of the following maintains **NO-GO** for public scores:

1. Clinically material subgroup bias unresolved
2. Excessive test–retest instability vs noise envelope
3. Unexplained DXA-platform drift
4. Inability to explain score changes
5. Score movement dominated by measurement noise
6. False-precision concern unresolved for intended presentation
7. Misleading consumer interpretation in comprehension tests
8. Legal / regulatory concern unresolved
9. Privacy / consent prerequisites unmet for evidence used to justify release
10. Claim Level requested exceeds evidence Level achieved

---

## 21. Validation matrix

| Question | Hypothesis | Dataset | Method | Metric | Acceptance criterion | Failure meaning | Next action |
|----------|------------|---------|--------|--------|----------------------|-----------------|-------------|
| V1 continuity | No unintended discontinuities | Tier A | Dense grid ±ε | Max jump | Candidate continuity ε **unresolved** | Math surface defect or transform bug | File scientific/impl review |
| V1 plateaus | Intentional plateaus hold | Tier A | Knot neighborhood | Slope≈0 in plateau | Qualitative match to freeze | Unexpected slope | Scientific review question |
| V2 noise | Noise Δ within research envelope | Tier A→B | Monte Carlo / retest | p90 \|Δscore\| | **Unresolved** pending ER | R1 blocker | MMC + presentation work |
| V3 stable persons | Stable biology ⇒ small Δ | Tier B/D | Longitudinal | ICC / p90 Δ | Unresolved | R10 blocker | Cadence / presentation |
| V3 temporal rules | 90d/180d sensible | Tier A/B | Simulation + empirical cadence | Unscorable rate; mismatch rate | Exploratory | Policy tension | Future scientific review (no change now) |
| V4 personas | Direction explainable | Tier A | Persona battery | Expert review pass rate | Qualitative protocol | Paradox unexplained | Contribution analysis / science Q |
| V5 same-machine | Retest σ acceptable | Tier B | DXA repeats | SEM / ICC | Unresolved (ER-BC-01) | R1/R2 | Protocol QC |
| V5 cross-vendor | Vendor bias tolerable | Tier B/C | Bridging | Bias / LoA → score Δ | Unresolved (ER-BC-05) | R2 blocker | Future redesign Q |
| V6 Health | Associates with metabolic markers | Tier C/D | Correlation / regression | ρ / AUC (exploratory) | Unresolved; not clinical proof | Weak construct | Science review |
| V6 Perf | Associates with strength/function | Tier C/D | Correlation | ρ | Unresolved | Weak construct | Science review |
| V7 known-groups | Groups separate | Tier B/C | Effect size | Cohen’s d / AUROC | Unresolved | Poor discrimination | Science review |
| V8 age | Age invariance defensible | Tier A/C | Structural + empirical | Subgroup Δ | Unresolved | R3 blocker | Future redesign Q |
| V8 sex | Sex transforms fair | Tier A/B/C | Dist / floor-ceil | KS / rate Δ | Unresolved | R4 blocker | Future redesign Q |
| V8 ethnicity omission | No material bias from omission | Tier C | Stratified analysis | Subgroup Δ | Unresolved | Fairness blocker | Future science Q (no ethnicity injection now) |
| V9 explain | Users understand why | Internal study | Comprehension tasks | Accuracy / trust calibration | Unresolved | R7/R8/R9 | Explainability redesign |
| V10 precision | Integer overclaims | Tier A/B + UX | Noise vs digit | Threshold-cross prob | Unresolved | R5 blocker | Band/range experiments |
| V11 outcomes | Prospective association | Tier C/D | Survival / incident models | HR / C-index | Unresolved; Level 3 only | No predictive claim | Stay ≤ Level 2 |
| V12 release | All blockers clear | All | Gate checklist | Binary gates | All hard blockers closed | Remain NO-GO | Scientific release review |

---

## 22. Experiment catalog

| ID | Experiment | Layer | Priority |
|----|------------|-------|----------|
| **BCV-001** | Synthetic sensitivity map (dense grids) | V1 | P0 |
| **BCV-002** | Waist measurement perturbation Monte Carlo | V2 | P0 |
| **BCV-003** | DXA repeatability (same machine) | V2/V5 | P1 |
| **BCV-004** | Longitudinal stability trajectories | V3 | P1 |
| **BCV-005** | Cross-platform DXA bridging | V5 | P1 |
| **BCV-006** | Age fairness (structural + empirical) | V8 | P0 structural / P1 empirical |
| **BCV-007** | Sex fairness (distributions / floors / ceilings) | V8 | P0 structural / P1 empirical |
| **BCV-008** | Known-groups validity | V7 | P1 |
| **BCV-009** | External construct validity (Health + Perf) | V6 | P2 |
| **BCV-010** | Explainability / comprehension study | V9 | P1 |
| **BCV-011** | Height / body-size fairness | V8 | P1 |
| **BCV-012** | FMI/ALMI/FFMI error propagation | V2 | P0 |
| **BCV-013** | Threshold / plateau / knot neighborhood analysis | V1 | P0 |
| **BCV-014** | Floor / ceiling occupancy analysis | V1/V8 | P0 |
| **BCV-015** | Missingness + Resolver status simulation | V1 | P0 |
| **BCV-016** | Temporal coherence 180d/90d/same-scan | V3 | P0 sim / P1 empirical |
| **BCV-017** | Paradoxical persona battery | V4 | P0 |
| **BCV-018** | Contribution / adverse-hide analysis | V9 | P0 |
| **BCV-019** | False-precision presentation experiments | V10 | P1 |
| **BCV-020** | MMC estimation protocol | V2/V3/V10 | P1 |
| **BCV-021** | Ethnicity-omission fairness audit | V8 | P2 |
| **BCV-022** | Athletic-status / BMI-range fairness | V8 | P2 |
| **BCV-023** | Operator / positioning DXA effects | V5 | P2 |
| **BCV-024** | Hydration / time-of-day effects | V5/V3 | P2 |
| **BCV-025** | Prospective outcome association (Health) | V11 | P3 |
| **BCV-026** | Prospective performance outcomes | V11 | P3 |
| **BCV-027** | Cohort selection-bias audit (R12) | V8/V12 | P2 |
| **BCV-028** | Release-readiness gate rehearsal | V12 | P2 |

### Priority definitions

| Priority | Meaning |
|----------|---------|
| **P0** | Required before any private/internal score viewing outside engineering |
| **P1** | Required before limited pilot |
| **P2** | Required before consumer consideration |
| **P3** | Longer-term validation |

---

## 23. First validation wave (no real PHI)

**Scope (planning only — execution not authorized by this document):**

- BCV-001 synthetic sensitivity
- BCV-002 / BCV-012 Monte Carlo noise (candidate σ from literature placeholders marked unresolved until ER)
- BCV-013 score surface / knot / plateau analysis
- BCV-006 / BCV-007 structural age/sex fairness
- BCV-014 floor/ceiling analysis
- BCV-017 explainability cases / personas
- BCV-015 missingness simulations
- BCV-016 temporal-rule simulations
- BCV-018 contribution analysis

**Real PHI:** **none**.

---

## 24. Second validation wave (de-identified empirical)

**Scope:**

- BCV-003 DXA test–retest
- Repeated Waist protocol study
- BCV-004 longitudinal scans
- BCV-005 cross-platform DXA
- BCV-008 known-groups
- BCV-009 correlations (as data permit)

**Preconditions:** §15.2 privacy/legal gates + approved storage + research-purpose labeling.

---

## 25. Clinical / regulatory boundary

### 25.1 What this score is NOT currently validated to do

- diagnose disease
- predict individual medical events
- replace clinician judgment
- prescribe treatment
- identify sarcopenia clinically
- diagnose obesity
- determine athlete readiness

### 25.2 No clinical validation claim

| Evidence type | Is clinical validation? |
|---------------|-------------------------|
| Synthetic tests | **No** |
| Correlation | **No** |
| Internal user testing | **Not necessarily** |
| Implementation Exact-Math PASS | **No** |

Preserve this language in all validation reports.

---

## 26. Evidence reviews required before freezing empirical thresholds

Do **not** fabricate references. Open bounded reviews:

| ID | Topic |
|----|-------|
| **ER-BC-01** | DXA precision / repeatability (FM, FFM, ALM) |
| **ER-BC-02** | Waist protocol repeatability (WHO midpoint) |
| **ER-BC-03** | FMI / ALMI health-outcome association |
| **ER-BC-04** | FFMI / performance association |
| **ER-BC-05** | DXA vendor comparability (Hologic / GE Lunar / other) |
| **ER-BC-06** | FMI / ALMI / FFMI precision after height propagation |
| **ER-BC-07** | Clinically meaningful body-composition change |
| **ER-BC-08** | Sarcopenia construct literature vs H3 adequacy model |
| **ER-BC-09** | Body-composition association with cardiometabolic outcomes |
| **ER-BC-10** | Age-related composition change vs age-invariant scoring defensibility |
| **ER-BC-11** | Sex-specific FMI/FFMI/ALMI reference limitations |
| **ER-BC-12** | Ethnicity / population bias when ethnicity unused |

Literature-dependent questions include at minimum: DXA test–retest precision; FMI/ALMI/FFMI precision; Waist measurement error; clinically meaningful change; cross-platform DXA comparability; sarcopenia constructs; outcome associations.

---

## 27. Decision tree after validation

```text
if validation strongly supports current model
  → scientific release review (still not consumer authorization)

if minor calibration issue
  → scientific V2 planning (draft_v1 unchanged until review)

if structural bias
  → scores remain NO-GO; model redesign required

if insufficient data
  → scores remain internal experimental (Level 0)
```

No path in this tree auto-authorizes consumer integration or public scores.

---

## 28. End-state of this planning phase

| Item | Status |
|------|--------|
| Private validation plan | **READY FOR INDEPENDENT REVIEW** |
| Validation execution | **NOT STARTED** |
| Synthetic validation execution | **NOT AUTHORIZED** by this plan alone |
| Real-user / de-identified validation | **NOT AUTHORIZED** |
| Internal engine | **PASS** |
| Consumer integration | **NOT AUTHORIZED** |
| Public Health | **NO-GO** |
| Public Performance-Supporting | **NO-GO** |

**Next action:** open a **new independent validation-methodology reviewer** to determine whether this protocol is rigorous enough before any synthetic or empirical validation execution begins.

---

END OF PRIVATE / INTERNAL VALIDATION PLAN V1
