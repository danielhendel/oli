# Body Composition Dual Score — Tier B Empirical Validation Plan V1

**Document type:** Tier B empirical-validation **planning authority** (docs only)
**Date:** 2026-10-07
**Branch:** `feat/body-composition-stage3e-body-scans-v1`
**Kind:** Documentation only. **Does not** authorize Tier B execution, recruit subjects, collect data, change score formulas/weights/knots, change Resolver/Confidence, add consumer UI, expose score API, persist public scores, or deploy.

| Identity | Value |
|----------|-------|
| Wave 1 validation truth-freeze SHA | `74c6529b2ec0a8a91d1c8f246144e6cda07ee4b6` |
| Wave 1 execution SHA | `58a09254b1e25c34ada92598fb8cb0ecf1085fff` |
| Validation-plan SHA | `4900f6e56f1eb83799513452cc4b5d2dcc20601d` |
| Approved score implementation SHA | `d940b1616b341e98b19e82f2cd6a6242dfe41691` |
| Mathematical Truth Freeze SHA | `e258267d109d1d05e20270f205e5fdb29ae2aca6` |
| Implementation Truth Freeze | `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_ENGINE_IMPLEMENTATION_TRUTH_FREEZE_V1.md` |
| Resolver Truth Freeze | `docs/00_truth/phase3/BODY_COMPOSITION_EVIDENCE_RESOLVER_V1_TRUTH_FREEZE.md` |
| Assessment Confidence Truth Freeze | `docs/00_truth/phase3/BODY_COMPOSITION_ASSESSMENT_CONFIDENCE_V1_TRUTH_FREEZE.md` |
| Wave 1 Synthetic Robustness Evidence | **ACCEPTED** |
| Companion decision register | `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_TIER_B_DECISION_REGISTER_V1.md` |
| Parent private validation plan | `docs/10_product/specs/BODY_COMPOSITION_DUAL_SCORE_PRIVATE_VALIDATION_PLAN_V1.md` |

> **This document is PLANNING AUTHORITY for future Tier B protocol freeze.**
> It is **NOT** Tier B execution authorization.
> It is **NOT** clinical validation.
> It is **NOT** consumer or public-score authorization.

---

## 0. Mission and hard boundaries

### 0.1 Mission

Define the complete empirical-validation program required **before** Oli may execute any de-identified / controlled human-data validation of the Body Composition dual-score system.

Tier B must answer empirical questions that synthetic Wave 1 **cannot**:

- real measurement repeatability
- real Waist protocol variability
- DXA repeatability
- real covariance among FM / FFM / ALM
- longitudinal score stability
- acute-state sensitivity
- same-machine variability
- operator / positioning variability
- cross-machine / vendor agreement
- construct association
- fairness / subgroup behavior
- empirical SDC / MDC
- score comprehension
- missingness / scorability

### 0.2 Hard boundaries (non-negotiable)

**DO NOT (this planning phase and until later explicit gates):**

- use real user data, production data, or PHI
- recruit subjects or contact clinics / DXA centers
- collect DXA scans, Waist measurements, or PDFs
- create a research dataset
- change score formulas, weights, knots
- change Resolver or Confidence
- alter Wave 1 findings
- add consumer UI, expose score API, persist public scores, or deploy
- authorize Tier B execution

If empirical work later suggests formula change: **document evidence** and open a **future scientific-review question**. Do **not** alter draft_v1 here.

### 0.3 Authority stack (do not reinterpret)

```text
Mathematical Truth Freeze
  → Engine Implementation Truth Freeze
  → Evidence Resolver Truth Freeze
  → Assessment Confidence Truth Freeze
  → Private Validation Plan (Wave 1 protocols)
  → Wave 1 Validation Truth Freeze (synthetic ACCEPTED)
  → THIS Tier B Empirical Validation Plan (planning only)
  → future Tier B Protocol Truth Freeze (not yet)
  → future explicit Tier B Execution Authorization (not yet)
```

Frozen score policy is **not** open for reinterpretation in this plan.

### 0.4 Current authorization state

| Gate | Status |
|------|--------|
| Wave 1 synthetic robustness | **ACCEPTED** |
| Tier B validation planning | **AUTHORIZED / CURRENT** |
| Tier B protocol freeze | **NOT COMPLETE** |
| Tier B execution | **NOT AUTHORIZED** |
| Clinical validation | **NOT ESTABLISHED** |
| Consumer integration | **NOT AUTHORIZED** |
| Public Health score | **NO-GO** |
| Public Performance-Supporting score | **NO-GO** |
| Claim level | **Level 0 — internal experimental index** |

---

## 1. What Tier B can and cannot prove

### 1.1 Tier B may eventually support (if later authorized and successful)

- Empirical measurement-error magnitudes (σ) for Waist / DXA components
- Empirical within-/between-person covariance candidates (ρ)
- Test–retest reliability and agreement for indices and scores
- Empirical SDC / MDC candidates (triad A only)
- Limited known-groups and external-construct associations under dataset limits
- Subgroup / fairness empirical signals with uncertainty
- Scorability / access / selection-bias quantification
- Comprehension / misconception rates under controlled materials (no consumer UI)

### 1.2 Tier B cannot prove (even if successful)

- Clinical / diagnostic validity
- Disease-risk prediction
- Sport / athlete performance prediction
- Broad population generalizability from a convenience cohort
- That de-identification equals anonymity
- That age-invariant scoring is clinically appropriate solely because Wave 1 Δ=0
- That sex-specific knots equal fairness
- Consumer release readiness
- Advancement of claim level beyond what evidence + governance independently authorize

**Synthetic Wave 1 ≠ clinical validation. Correlation ≠ clinical validation. Tier B success ≠ consumer authorization.**

---

## 2. Priority taxonomy

### 2.1 Two distinct axes (do not collapse)

| Axis | Meaning |
|------|---------|
| **Protocol prerequisite** | Must be frozen / approved **before any** Tier B human-data execution authorization |
| **Execution priority** | Order / necessity of running studies **after** execution is authorized |

### 2.2 Execution-priority classes for studies

| Class | Meaning |
|-------|---------|
| **P0** | Protocol package for these studies must be frozen before **any** Tier B human-data execution may be authorized; they form the first empirical wave once authorized |
| **P1** | Required before limited controlled internal / private pilot consideration |
| **P2** | Required before any consumer-consideration gate |
| **P3** | Long-term validation (prospective / broad external) |

### 2.3 Protocol prerequisites (block all execution if unresolved)

These are **not** TB studies; they are hard gates:

1. Legal basis
2. Consent model
3. Data-use purpose limitation
4. Minimum necessary data specification
5. Approved storage boundary
6. Encryption at rest / in transit
7. RBAC
8. Audit logging
9. Access-approval workflow
10. Retention schedule
11. Deletion / destruction policy
12. Export controls
13. Breach-response ownership
14. Re-identification risk review (ER-BC-15)
15. Small-cell policy
16. Dataset destruction policy
17. Study catalog freeze
18. Measurement protocols freeze
19. Analysis plan + confirmatory/exploratory split freeze
20. Sample-size **method** freeze (numeric N may remain pending power analysis)
21. Stop/go criteria categories freeze (numeric thresholds evidence-dependent)
22. Independent methodology review **PASS**
23. Independent protocol re-gate **PASS**
24. Explicit Tier B execution authorization document

**If any remains unresolved: Tier B execution stays BLOCKED.**

---

## 3. Governance gate

### 3.1 Legal / consent / purpose (must freeze before execution)

| Item | Planning requirement | Status |
|------|----------------------|--------|
| Legal basis | Document lawful basis for each processing purpose (research / validation / quality) under applicable law | **UNRESOLVED** |
| Consent model | Written consent / e-consent version; withdrawal path; what continues after withdrawal | **UNRESOLVED** |
| Data-use purpose | Explicit: private dual-score empirical validation only — not marketing, not product training without separate basis | **UNRESOLVED** |
| Secondary use | Forbidden unless separately consented and registered | **UNRESOLVED** |
| Clinic / site agreements | DUA / BAAs / research agreements as applicable — planning only; no outreach in this phase | **UNRESOLVED** |

### 3.2 Security / access / retention

| Item | Planning requirement | Status |
|------|----------------------|--------|
| Storage boundary | Approved private validation store **outside** git / production consumer DB | **UNRESOLVED** |
| Encryption | At rest + in transit standards named in protocol freeze | **UNRESOLVED** |
| RBAC | Named roles: steward, analyst, auditor, PI/designee; least privilege | **UNRESOLVED** |
| Audit logging | Access, export, schema change, deletion events | **UNRESOLVED** |
| Access approval | Dual control for analysis dataset export; time-bounded grants | **UNRESOLVED** |
| Retention | Maximum retention clock from collection / last use | **UNRESOLVED** |
| Deletion | Subject-level and dataset-level deletion procedures + verification | **UNRESOLVED** |
| Export controls | No repo commit; no uncontrolled local copies; approved analytic environments only | **UNRESOLVED** |
| Breach-response ownership | Named owner + escalation path | **UNRESOLVED** |

### 3.3 Re-identification / small-cell / destruction

| Item | Planning requirement | Status |
|------|----------------------|--------|
| Re-identification risk review | Completes ER-BC-15 checklist before execution auth | **UNRESOLVED** |
| Small-cell policy | Suppress / aggregate cells below threshold; no rare-phenotype publication without review | **UNRESOLVED** |
| Dataset destruction | End-of-study destruction certificate; backup purge | **UNRESOLVED** |
| Date minimization | Prefer measurement-day or study-day offsets over full DOB/timestamps where scientifically adequate | **PLANNED** |

---

## 4. Privacy architecture — Tier B private-validation dataset contract

### 4.1 Required separation

```text
IDENTITY / CONTACT STORE          VALIDATION ANALYSIS STORE
─────────────────────────         ─────────────────────────
legal name                        studySubjectId (pseudonym)
email / phone                     measurements + provenance
address                           derived indices
account UID (if any)              score outputs (offline)
consent artifacts                 external outcomes
site contact logistics            protocol / quality flags
```

Linkage between stores is held by a **minimal key map** under stricter access than the analysis store. Analysts working on scores must not need identity/contact data.

### 4.2 Analysis dataset MUST NOT contain

- name
- email
- phone
- address
- account UID
- unnecessary free text
- raw identifiable PDF filenames that embed identity
- direct production Firebase document paths tied to a person

### 4.3 Preferred identifiers

| Field | Rule |
|-------|------|
| `studySubjectId` | Pseudonymous, non-derivable from name/email/UID |
| `siteId` | Pseudonym or coded site |
| `machineId` | Pseudonymized machine identifier |
| `operatorCategory` | Category (e.g., tech-A / tech-B), not personal name in analysis store |
| Dates | Minimize precision; prefer `studyDay` / `measuredAtDay` when full timestamps not required |

### 4.4 PHI / production boundary

| Rule | Status |
|------|--------|
| No PHI in git | **HARD** |
| No production consumer data reuse without separate legal basis | **HARD** |
| No real DXA PDFs in repository | **HARD** |
| Wave 1 synthetic artifacts remain synthetic-only | **HARD** |

---

## 5. Source provenance requirements

### 5.1 Every DXA observation (plan to capture)

| Field | Purpose |
|-------|---------|
| vendor | Cross-vendor agreement / bridging |
| model | Machine family effects |
| softwareVersion | Analysis-software drift |
| siteId | Site clustering |
| machineId (pseudonym) | Same- vs cross-machine |
| operatorCategory | Operator variance |
| protocolId / protocolVersion | Positioning & prep protocol |
| positioningQuality | Quality / exclusion |
| scanDateTime or minimized day | Temporal coherence |
| fastingState / acuteStateFlags | Acute-state modeling |
| qualityFlags | Analytic exclusions |

### 5.2 Every Waist observation

| Field | Purpose |
|-------|---------|
| protocolVersion | WHO-midpoint version lock |
| measurerId / measurerCategory | Same vs different measurer |
| repeatNumber | Within-session repeats |
| measurementConditions | Clothing, posture, timing |
| heightProvenance | Shared Height coupling |

### 5.3 Score computation provenance (offline)

Pin for every scored row:

- mathematical freeze SHA
- implementation SHA
- Resolver / Confidence versions consumed
- Tier B protocol freeze SHA (once frozen)
- analysis-code SHA

---

## 6. Cohort design

### 6.1 Target population

Adults eligible under frozen score policy: completed UTC years **≥ 20**, governed reference sex `male` or `female`, with capacity to complete WHO-midpoint Waist and/or DXA per module protocol.

**Do not assume one convenience cohort is adequate** for fairness, access, or external-validity claims.

### 6.2 Planned strata (goals — not yet recruited)

| Axis | Planning goal |
|------|---------------|
| Age | Cover young / mid / older adult bands (exact cutpoints defined at protocol freeze after ER-BC-10) |
| Sex | Adequate male and female samples for sex-transform and fairness analyses |
| Body size / height | Include short / average / tall; avoid only mean-centered samples |
| BMI / body-size range | Broad range including underweight-adjacent through high BMI — without equating BMI to composition |
| Athletic status | Include non-athlete and athlete/resistance-trained labels defined **independently** of FMI/ALMI/FFMI cuts |
| Menopause status | Where relevant and ethically collectable for female older-adult fairness (optional module) |
| DXA vendor / site | Multi-site; at least planning for ≥1 same-vendor multi-machine and cross-vendor pathway |
| Socioeconomic / access | Track access pathway to quantify scorability bias (TB-15) |

### 6.3 Subgroup reporting rule

Report uncertainty intervals. Sparse cells → **insufficient sample** flag, not false precision. Intersectional analyses require explicit cell-count floors under small-cell policy.

---

## 7. Inclusion / exclusion categories

Distinguish four exclusion classes. Do **not** over-exclude merely to make score performance look cleaner.

| Class | Examples (planning categories) | Analytic effect |
|-------|--------------------------------|-----------------|
| **Safety** | Pregnancy (if DXA contraindicated per site rules); implanted devices per site DXA policy; inability to consent | Not enrolled / not scanned |
| **Measurement-validity** | Incomplete DXA ROI; gross motion artifact; non-WHO Waist protocol when WHO required | Observation invalid |
| **Protocol-quality** | Missed fasting instruction when required; wrong positioning; out-of-window repeat | Observation QC-fail |
| **Analytic** | Pre-specified outlier rules; missing required covariates for a confirmatory model | Excluded from that analysis only; reported |

Document all exclusions with counts. Analytic exclusions must be pre-registered before execution.

---

## 8. Sample-size strategy

### 8.1 Hard rule

**Do NOT freeze one universal N.**

Numeric N remains **pending** evidence review + study-specific power / precision analysis at protocol freeze.

### 8.2 Method by study family

| Sample-size basis | Typical TB modules |
|-------------------|--------------------|
| Reliability CI width (ICC / SEM) | TB-01, TB-02, TB-03 |
| Agreement LoA precision | TB-07, TB-08 |
| Correlation / covariance precision | TB-05, TB-10, TB-11 |
| Subgroup comparison / interaction precision | TB-12, TB-13, TB-14 |
| Longitudinal change / variance components | TB-06, TB-16 |
| Proportion / comprehension precision | TB-17 |
| Selection / missingness estimation | TB-15, TB-18 |
| Acute contrast precision | TB-04 |

### 8.3 Intersectional warning

Power for main effects ≠ power for interactions. Pre-declare which interactions are confirmatory vs exploratory.

---

## 9. Study catalog overview

| ID | Title | Execution priority | Primary layer |
|----|-------|--------------------|---------------|
| TB-01 | Waist repeatability | **P0** | V2 |
| TB-02 | Same-machine DXA repeatability | **P0** | V2/V5 |
| TB-03 | Operator / positioning repeatability | **P1** | V5 |
| TB-04 | Short-term acute-state DXA sensitivity | **P1** (phased) | V5/V3 |
| TB-05 | Real covariance estimation (FM/FFM/ALM/Height/Waist) | **P0** | V2 |
| TB-06 | Longitudinal stability | **P1** | V3 |
| TB-07 | Same-vendor cross-machine agreement | **P1** | V5 |
| TB-08 | Cross-vendor agreement | **P2** | V5 |
| TB-09 | Known-groups validity | **P1** | V7 |
| TB-10 | Health external construct association | **P2** | V6/V11 |
| TB-11 | Performance external construct association | **P2** | V6 |
| TB-12 | Age fairness (empirical meaning) | **P1** | V8 |
| TB-13 | Sex fairness (empirical) | **P1** | V8 |
| TB-14 | Intersectional fairness | **P2** | V8 |
| TB-15 | Scorability / access / selection bias | **P1** | §13 / V12 |
| TB-16 | Change detectability / SDC–MDC | **P1** | V2/V10 |
| TB-17 | User comprehension / numeracy | **P1** | V9 |
| TB-18 | Missing-data / temporal-coherence audit | **P0** (protocol) / **P1** (empirical) | V1/V3 |

**Study count:** **18** (TB-01 … TB-18). No additional families added in V1.

**Priority rollup**

| Class | Studies |
|-------|---------|
| P0 | TB-01, TB-02, TB-05, TB-18 (protocol freeze required before any execution) |
| P1 | TB-03, TB-04, TB-06, TB-07, TB-09, TB-12, TB-13, TB-15, TB-16, TB-17, TB-18 empirical |
| P2 | TB-08, TB-10, TB-11, TB-14 |
| P3 | Prospective extensions beyond TB-10/11 (map to private-plan BCV-025/026; not separate TB IDs in V1) |

---

## 10. Study modules (TB-01 … TB-18)

Each module uses the required catalog fields. Acceptance numbers remain **evidence-dependent** unless later frozen by independent review.

---

### TB-01 — Waist repeatability

| Field | Value |
|-------|-------|
| ID | TB-01 |
| Title | WHO-midpoint Waist repeatability |
| Priority | **P0** |
| Question | What is real within-/between-measurer and within-/between-day Waist error under the locked WHO-midpoint protocol? |
| Hypothesis | Protocol error is non-zero and may be heteroscedastic by body size; synthetic σ is not substitutable |
| Cohort | Adults ≥20; both sexes; broad waist/height range |
| Measurements | Repeated WHO-midpoint Waist; Height with shared provenance |
| Repeat structure | Same measurer within-session (≥2); different measurer within-session; same measurer next-day subset |
| Primary outputs | Mean bias; SD of differences; ICC (where appropriate); SEM; SDC/MDC; Bland–Altman; heteroscedasticity checks |
| Secondary outputs | Score Δ on H1 / Health under frozen engine (offline); Height coupling sensitivity |
| Analysis method | Paired differences; BA plots; variance components; pre-specified heteroscedasticity test |
| Subgroup plan | Sex; BMI/waist tertiles; height bands (exploratory unless powered) |
| Sample-size method | Precision for LoA / SEM CI |
| Privacy prerequisites | Full §3 gate; no PHI in analysis store |
| Dependencies | ER-BC-02; Waist protocol version freeze; governance |
| Maps to BCV / ER | BCV-002 (empirical σ); ER-BC-02 |
| Success means | Usable empirical σ_waist (+ uncertainty) for joint error models |
| Failure means | Protocol non-reproducible or error dominates near steep H1 regions without mitigation path |
| Cannot prove | Clinical meaning of WHtR; consumer suitability |

---

### TB-02 — Same-machine DXA repeatability

| Field | Value |
|-------|-------|
| ID | TB-02 |
| Title | Same-machine DXA test–retest |
| Priority | **P0** |
| Question | What is short-interval same-machine precision for FM, FFM, ALM and derived FMI/FFMI/ALMI and dual scores? |
| Hypothesis | Component and score retest Δ concentrate within an empirical SDC envelope under controlled conditions |
| Cohort | Adults with same-machine paired DXA under controlled prep |
| Measurements | DXA FM, FFM, ALM; Height; Waist if Health scored; full provenance |
| Repeat structure | Two scans, same machine, same software, short interval, controlled acute state |
| Primary outputs | Test–retest for FM/FFM/ALM/FMI/FFMI/ALMI; construct scores; Health & Performance aggregates; ICC/SEM/SDC/BA |
| Secondary outputs | Component contribution to score Δ; quality-flag sensitivity |
| Analysis method | Reliability + agreement; joint vs marginal error summaries |
| Subgroup plan | Sex; body-size bands; vendor (if multi-vendor cohort later) |
| Sample-size method | Reliability CI / SEM precision |
| Privacy prerequisites | §3 complete; DXA provenance without identity |
| Dependencies | ER-BC-01; ER-BC-15; TB-04 protocol controls for acute state |
| Maps to BCV / ER | BCV-003; ER-BC-01; ER-BC-06 |
| Success means | Empirical same-machine precision suitable to ground SDC and noise models |
| Failure means | Poor repeatability → automatic NO-GO path for score delta claims |
| Cannot prove | Cross-machine interchangeability; clinical meaningful change |

---

### TB-03 — Operator / positioning repeatability

| Field | Value |
|-------|-------|
| ID | TB-03 |
| Title | Operator and positioning variance components |
| Priority | **P1** |
| Question | How much score-relevant error comes from positioning vs operator vs software/analysis vs machine? |
| Hypothesis | Positioning/operator can rival pure machine precision; collapsing into generic “DXA error” misleads |
| Cohort | Subset of TB-02 sites with factorial repeats |
| Measurements | Controlled repeats crossing operator category × positioning protocol adherence |
| Repeat structure | Factorial or nested: machine / operator / positioning / analysis software where separable |
| Primary outputs | Variance-component estimates for FM/FFM/ALM and score Δ |
| Secondary outputs | Protocol QC checklist efficacy |
| Analysis method | Mixed-effects / variance components; do **not** pool factors a priori |
| Subgroup plan | Site; vendor |
| Sample-size method | Variance-component precision |
| Privacy prerequisites | Operator as category only in analysis store |
| Dependencies | TB-02; ER-BC-01 |
| Maps to BCV / ER | BCV-023; ER-BC-01 |
| Success means | Separated error sources with actionable protocol controls |
| Failure means | Uncontrolled operator/positioning dominates → protocol redesign before pilot |
| Cannot prove | Vendor bridging; biological change |

---

### TB-04 — Short-term acute-state DXA sensitivity

| Field | Value |
|-------|-------|
| ID | TB-04 |
| Title | Acute-state sensitivity (hydration, glycogen, meal, exercise, TOD, cycle, edema) |
| Priority | **P1** (early pilot: literature-prioritized subset); full factorial **P2** |
| Question | Which acute states move lean/fat indices and scores without durable remodeling? |
| Hypothesis | Hydration / glycogen / recent exercise / meal state can raise or lower scores (Wave 1 synthetic false-improvement signal) |
| Cohort | Controlled short-interval volunteers; menstrual-phase subset where relevant |
| Measurements | Paired DXA ± targeted state manipulation; state logs |
| Repeat structure | Baseline controlled state vs prioritized acute conditions (not all at once in early pilot) |
| Primary outputs | Construct and aggregate Δ; false-improvement-style indicators under pre-registered definitions |
| Secondary outputs | State × sex / body-size interactions (exploratory unless powered) |
| Analysis method | Paired contrasts; pre-register primary states after ER-BC-16 |
| Subgroup plan | Sex; menopause where relevant |
| Sample-size method | Paired mean-difference precision for primary states |
| Privacy prerequisites | §3; sensitive cycle data minimization |
| Dependencies | ER-BC-16; TB-02 baseline precision |
| Maps to BCV / ER | BCV-024; BCV-034 empirical; ER-BC-16 |
| Success means | Ranked acute confounders with magnitude bands for protocol controls |
| Failure means | Unexplained acute sensitivity → NO-GO for interpreting short-interval improvements |
| Cannot prove | That any Δscore equals remodeling; clinical risk |

**Early-pilot prioritization (feasibility):** hydration, recent exercise, meal/fasting, time of day. Defer full glycogen / edema / cycle factorial until justified by ER-BC-16 + feasibility.

---

### TB-05 — Real covariance estimation

| Field | Value |
|-------|-------|
| ID | TB-05 |
| Title | Empirical covariance / correlation among FM, FFM, ALM, Height, Waist |
| Priority | **P0** |
| Question | What are real between-person biological covariances and within-person measurement-error covariances? |
| Hypothesis | Wave 1 exploratory ρ is not empirical; FM↔FFM and FFM↔ALM error covariance are material |
| Cohort | Cross-sectional DXA+anthropometry; repeat subset for error covariance |
| Measurements | FM, FFM, ALM, Height, Waist; derived indices |
| Repeat structure | Single-measure covariance + repeat-measure error-covariance from TB-01/02 pairs |
| Primary outputs | Between-person correlation/covariance matrix; within-person error covariance matrix |
| Secondary outputs | Propagated index σ after shared Height (ER-BC-06 link) |
| Analysis method | Clearly separate biological vs error covariance; bootstrap CIs |
| Subgroup plan | Sex (confirmatory if powered); age bands exploratory |
| Sample-size method | Correlation precision / covariance CI |
| Privacy prerequisites | §3 |
| Dependencies | TB-01; TB-02; ER-BC-17; ER-BC-06 |
| Maps to BCV / ER | BCV-029 empirical magnitudes; ER-BC-17 |
| Success means | Empirical σ/ρ candidates replace synthetic_fallback for later noise modeling |
| Failure means | Cannot support joint-error claims; remain on unresolved magnitudes |
| Cannot prove | Causal tissue relationships; clinical validity |

---

### TB-06 — Longitudinal stability

| Field | Value |
|-------|-------|
| ID | TB-06 |
| Title | Longitudinal score stability under signal and noise |
| Priority | **P1** |
| Question | How do scores behave in stable-control, fat-loss, muscle-gain, detraining, aging, and acute-perturbation periods? |
| Hypothesis | Stable biology ≈ empirical noise envelope; directed phases move constructs coherently; lag/overreaction possible |
| Cohort | Repeated-measure adults with documented phase labels **independent** of score |
| Measurements | Serial Waist/DXA per cadence compatible with frozen 180d/90d rules (rules unchanged) |
| Repeat structure | Stable-control periods; intentional fat-loss; muscle-gain; detraining; normal aging observation; acute perturbation links to TB-04 |
| Primary outputs | Within-person signal vs noise; smoothness; lag; over/under-reaction; reversal; component attribution |
| Secondary outputs | Unscorable episode rates under frozen recency/era; retention bias |
| Analysis method | Trajectory / mixed-effects; pre-register phase definitions |
| Subgroup plan | Age; sex; athletic status |
| Sample-size method | Longitudinal variance / detectable change precision |
| Privacy prerequisites | Longitudinal re-id risk heightened — ER-BC-15 mandatory |
| Dependencies | TB-01/02/05; BCV-016 empirical; ER-BC-13 |
| Maps to BCV / ER | BCV-004; BCV-016 emp; ER-BC-13 |
| Success means | Characterized noise envelope and coherent directed responses |
| Failure means | Noise dominates or paradoxical trajectories unexplained → R10 blocker |
| Cannot prove | Clinical meaningful change thresholds; aging-formula correctness |

---

### TB-07 — Same-vendor cross-machine agreement

| Field | Value |
|-------|-------|
| ID | TB-07 |
| Title | Same-vendor cross-machine agreement |
| Priority | **P1** |
| Question | Do same-vendor different machines agree closely enough for one scoring function? |
| Hypothesis | Correlation can be high while bias/LoA remain material for scores |
| Cohort | Paired scans across machines same vendor/software family where possible |
| Measurements | Paired FM/FFM/ALM → indices → scores |
| Repeat structure | Near-concurrent paired scans; order randomized/balanced |
| Primary outputs | Mean bias; LoA; proportional bias; heteroscedasticity; calibration/bridging; ICC where meaningful; score Δ |
| Secondary outputs | Site clustering |
| Analysis method | **Agreement-first** (BA + bias), not correlation-alone |
| Subgroup plan | Sex; body size |
| Sample-size method | LoA precision |
| Privacy prerequisites | §3; machine pseudonyms |
| Dependencies | TB-02; ER-BC-05 |
| Maps to BCV / ER | BCV-005 (same-vendor slice); ER-BC-05 |
| Success means | Quantified machine bias with or without acceptable bridging |
| Failure means | Material unexplained drift → NO-GO for pooled same-vendor scoring claims |
| Cannot prove | Cross-vendor interchangeability |

---

### TB-08 — Cross-vendor agreement

| Field | Value |
|-------|-------|
| ID | TB-08 |
| Title | Cross-vendor DXA agreement |
| Priority | **P2** |
| Question | Can one frozen scoring function be used across vendors without material score distortion? |
| Hypothesis | Vendor bias may induce material score Δ; correlation insufficient |
| Cohort | Bridging sample across major vendors in scope |
| Measurements | Paired/bridging DXA with full vendor provenance |
| Repeat structure | Near-concurrent cross-vendor pairs |
| Primary outputs | Bias/LoA/proportional bias/heteroscedasticity/bridging/ICC; score Δ distributions |
| Secondary outputs | Software-version sensitivity |
| Analysis method | Agreement-first; pre-register primary vendor pairs |
| Subgroup plan | Sex; body size |
| Sample-size method | LoA precision for primary pair |
| Privacy prerequisites | §3 |
| Dependencies | TB-07; ER-BC-05 |
| Maps to BCV / ER | BCV-005; ER-BC-05 |
| Success means | Evidence for interchangeability **or** explicit non-interchangeability with redesign question |
| Failure means | Unexplained cross-vendor drift → automatic NO-GO for multi-vendor pooled claims |
| Cannot prove | Clinical validity on either vendor |

---

### TB-09 — Known-groups validity

| Field | Value |
|-------|-------|
| ID | TB-09 |
| Title | Known-groups validity (non-circular) |
| Priority | **P1** |
| Question | Do independently defined groups separate on dual scores as expected? |
| Hypothesis | Non-circular groups differ in score distributions with quantifiable effect sizes |
| Cohort | Groups defined **without** cutting on WHtR/FMI/ALMI/FFMI used as score inputs |
| Measurements | Dual scores + independent group labels |
| Repeat structure | Cross-sectional; optional repeats for reliability of separation |
| Primary outputs | Effect sizes / AUROC with CIs; overlap |
| Secondary outputs | Construct-level separation |
| Analysis method | Pre-register group definitions; circularity audit mandatory |
| Subgroup plan | Sex; age |
| Sample-size method | Effect-size / AUROC precision |
| Privacy prerequisites | §3 |
| Dependencies | Circularity rules from private validation plan §7–8 |
| Maps to BCV / ER | BCV-008; ER-BC-08 (lean constructs context) |
| Success means | Non-circular separation evidence |
| Failure means | Poor separation or circular design reject |
| Cannot prove | Diagnosis; sarcopenia clinical identification |

**Circularity hard rule:** Do **not** define group membership solely from WHtR / FMI / ALMI / FFMI then claim validity of scores built from those same values.

---

### TB-10 — Health external construct association

| Field | Value |
|-------|-------|
| ID | TB-10 |
| Title | Health Composition ↔ independent health constructs |
| Priority | **P2** |
| Question | Does Health Composition associate with independent cardiometabolic / function constructs? |
| Hypothesis | Moderate associations possible; not clinical proof |
| Cohort | Adults with labs/vitals/function under lawful collection |
| Measurements | Dual scores + candidate externals |
| Candidate variables (not frozen) | **Primary candidates:** blood pressure; HbA1c; fasting glucose; metabolic syndrome status (independent definition). **Secondary:** fasting insulin; lipids; hs-CRP. **Exploratory:** mobility/function batteries |
| Repeat structure | Cross-sectional primary; prospective extension → P3 / BCV-025 |
| Primary outputs | Pre-specified correlations / regressions with CIs; calibration only if later authorized |
| Secondary outputs | Partial associations adjusting for age/sex without injecting age into score |
| Analysis method | Confirmatory vs exploratory split; leakage audit |
| Subgroup plan | Age; sex (fairness link TB-12/13) |
| Sample-size method | Correlation precision |
| Privacy prerequisites | Labs heighten sensitivity — minimization + §3 |
| Dependencies | ER-BC-03; ER-BC-09; ER-BC-14 (no predictive claim) |
| Maps to BCV / ER | BCV-009 Health slice; ER-BC-03/09/14 |
| Success means | Independent association map with honest uncertainty |
| Failure means | Weak/null independent support → stay Level 0 constraints |
| Cannot prove | Causality; predictive product claim; clinical validation |

**Final variable set remains pending evidence review — do not freeze here.**

---

### TB-11 — Performance external construct association

| Field | Value |
|-------|-------|
| ID | TB-11 |
| Title | Performance-Supporting ↔ independent performance constructs |
| Priority | **P2** |
| Question | Does Performance-Supporting associate with independent function/performance measures (not another BC variable)? |
| Hypothesis | Associations with strength/function possible; not sport prediction |
| Cohort | Adults able to complete function tests safely |
| Candidate variables (not frozen) | **Primary candidates:** grip strength; sit-to-stand. **Secondary:** gait; relative strength. **Exploratory:** power; VO₂max; sport-specific only if justified |
| Repeat structure | Cross-sectional; reliability subset for externals |
| Primary outputs | Associations with CIs; sex-stratified |
| Secondary outputs | Ceiling effects in athletes (link TB fairness) |
| Analysis method | Pre-register primary externals after ER-BC-04 |
| Subgroup plan | Sex; athletic status; age |
| Sample-size method | Correlation / group-contrast precision |
| Privacy prerequisites | §3 |
| Dependencies | ER-BC-04; ER-BC-14 |
| Maps to BCV / ER | BCV-009 Perf slice; ER-BC-04 |
| Success means | Independent performance-construct map |
| Failure means | Only BC-to-BC correlations → invalid as external proof |
| Cannot prove | Athlete ranking; VO₂ prediction as product claim |

**Hard rule:** Do not validate only against another body-composition variable.

---

### TB-12 — Age fairness (empirical external meaning)

| Field | Value |
|-------|-------|
| ID | TB-12 |
| Title | Age invariance external-meaning evaluation |
| Priority | **P1** |
| Question | Do Health and Performance-Supporting maintain comparable external meaning across adult ages despite identical composition ⇒ identical score? |
| Hypothesis | Structural age invariance (Wave 1 Δ=0) does **not** guarantee comparable external meaning across age |
| Cohort | Age-stratified adults with external constructs from TB-10/11 |
| Measurements | Scores + age + externals; identical-composition contrasts where available |
| Repeat structure | Cross-sectional primary; longitudinal aging observation via TB-06 |
| Primary outputs | Age × association interactions; residual unfairness metrics with CIs |
| Secondary outputs | Scorability by age; floor/ceiling by age |
| Analysis method | Stratified associations; interaction tests; pre-register primary externals |
| Subgroup plan | Sex × age intersectional (link TB-14) |
| Sample-size method | Interaction / stratified precision |
| Privacy prerequisites | Age minimization strategy vs scientific need documented |
| Dependencies | ER-BC-10; TB-10/11; Wave 1 BCV-006 structural result (context only) |
| Maps to BCV / ER | BCV-006 empirical; ER-BC-10 |
| Success means | Evidence that external meaning is or is not comparable across age |
| Failure means | Material age-meaning bias → FSR redesign question; public NO-GO remains |
| Cannot prove | Authorization to change formula in this plan |

**Central empirical question for Tier B.** Formula stays frozen during planning/execution unless a later scientific redesign is separately authorized.

---

### TB-13 — Sex-transform validity / fairness

| Field | Value |
|-------|-------|
| ID | TB-13 |
| Title | Sex-specific transform empirical fairness |
| Priority | **P1** |
| Question | Do sex-specific knots yield comparable information, reliability, association, and separation — or create unfair compression/expansion? |
| Hypothesis | Sex-specific knots do **not** automatically prove fairness |
| Cohort | Male and female strata powered for primary fairness metrics |
| Measurements | Score distributions; reliability; externals; known-groups |
| Repeat structure | Cross-sectional + reliability subset |
| Primary outputs | Distribution shape; floor/ceiling; information content; reliability; external association; sensitivity; known-group separation — by sex |
| Secondary outputs | Construct-level sex contrasts |
| Analysis method | Pre-register primary fairness metrics; avoid post-hoc knot retuning |
| Subgroup plan | Age × sex (TB-14) |
| Sample-size method | Subgroup comparison precision |
| Privacy prerequisites | §3 |
| Dependencies | ER-BC-11; TB-09/10/11; Wave 1 BCV-007 structural contrasts |
| Maps to BCV / ER | BCV-007 empirical; ER-BC-11 |
| Success means | Documented fairness profile with uncertainty |
| Failure means | Material sex bias → FSR; no silent demographic correction in formula during Tier B |
| Cannot prove | Automatic fairness from knot tables alone |

**Hard rule:** Do not introduce demographic corrections into formulas during planning or Tier B execution.

---

### TB-14 — Intersectional fairness

| Field | Value |
|-------|-------|
| ID | TB-14 |
| Title | Intersectional subgroup fairness |
| Priority | **P2** |
| Question | Do material biases appear at intersections (e.g., age×sex, sex×BMI, vendor×sex) that single-factor analyses miss? |
| Hypothesis | Sparse cells and Simpson-type effects are real risks (Wave 1 structural hidden-path PASS is not empirical proof) |
| Cohort | Multi-factor stratified sample; ethnicity/race only where lawful and scientifically appropriate |
| Measurements | Scores + subgroup factors + externals |
| Repeat structure | Cross-sectional; reliability optional |
| Primary outputs | Pre-registered intersection contrasts with cell counts and CIs |
| Secondary outputs | Vendor×demography; athletic×sex |
| Analysis method | Stratified + interaction; small-cell suppression |
| Subgroup plan | Core: age×sex; sex×body-size; sex×vendor. Ethnicity/race per ER-BC-12 + legal |
| Sample-size method | Interaction precision; declare underpowered cells |
| Privacy prerequisites | Small-cell policy; ER-BC-12 legal/ethics |
| Dependencies | TB-12/13; ER-BC-12; BCV-031 context |
| Maps to BCV / ER | BCV-031 empirical; BCV-021; ER-BC-12 |
| Success means | Honest intersectional map including insufficiency flags |
| Failure means | Material intersectional bias → NO-GO for broad claims |
| Cannot prove | That unused factors are harmless globally |

---

### TB-15 — Scorability / access / selection bias

| Field | Value |
|-------|-------|
| ID | TB-15 |
| Title | Scorability, access, and selection bias |
| Priority | **P1** |
| Question | Who can receive a score, who cannot, and how do access/selection distort validation inference? |
| Hypothesis | DXA access, socioeconomic factors, site selection, health-conscious bias, and retention create material selection |
| Cohort | Screening/log + enrolled + retained longitudinal subsets |
| Measurements | Eligibility; completion; scorability reasons; demographics; site/access pathway |
| Repeat structure | Funnel from approach → consent → measure → score → follow-up |
| Primary outputs | Scorable fractions; reason tallies; differential access; retention |
| Secondary outputs | Comparison of enrolled vs target population proxies |
| Analysis method | Selection models / stratified tables; link to frozen withhold reasons |
| Subgroup plan | Age; sex; site; socioeconomic proxies where lawful |
| Sample-size method | Proportion precision |
| Privacy prerequisites | Contact data stays out of analysis store |
| Dependencies | BCV-015/027 context; private plan §13 |
| Maps to BCV / ER | BCV-027; §13; R12/R20 |
| Success means | Quantified access/selection profile bounding claim scope |
| Failure means | High unscorable / severe selection → NO-GO for broad claims |
| Cannot prove | Population representativeness without designed sampling |

---

### TB-16 — Change detectability / SDC–MDC

| Field | Value |
|-------|-------|
| ID | TB-16 |
| Title | Empirical change detectability (SDC/MDC) |
| Priority | **P1** |
| Question | What score changes are distinguishable from measurement error? |
| Hypothesis | Empirical SDC/MDC may exceed small integer score deltas users might over-interpret |
| Cohort | Retest samples from TB-01/02/06 |
| Measurements | Paired scores under stability assumption for SDC estimation |
| Repeat structure | Stable short-interval pairs; contrast with directed-change arms (TB-06) |
| Primary outputs | SEM_diff; SDC95; MDC95 (alias rules as in Wave 1 methodology) |
| Secondary outputs | Construct-level SDC; heteroscedastic SDC explorations |
| Analysis method | Keep triad separation: **A** SDC/MDC vs **B** clinical meaningful change vs **C** user-perceived |
| Subgroup plan | Sex; body size (exploratory) |
| Sample-size method | SEM/SDC precision |
| Privacy prerequisites | §3 |
| Dependencies | TB-02/05/06; ER-BC-13; BCV-032A methodology; BCV-032B still later |
| Maps to BCV / ER | BCV-020; BCV-032B pathway; ER-BC-07/13 |
| Success means | Empirical SDC/MDC candidates with CIs |
| Failure means | Noise dominates meaningful presentation → R19 blocker |
| Cannot prove | Clinical meaningful change; user-perceived meaningful change (need later evidence) |

---

### TB-17 — User comprehension / numeracy

| Field | Value |
|-------|-------|
| ID | TB-17 |
| Title | Score comprehension and misconception battery |
| Priority | **P1** |
| Question | Do people systematically misread dual scores even with careful non-product materials? |
| Hypothesis | Misconceptions are common without strong explainability controls |
| Cohort | Consenting adults with varied numeracy (not a consumer UI test) |
| Materials | Controlled static explanations / cases — **no consumer UI build** |
| Target misconceptions | 90 = 90% healthy; 70 = 30% disease risk; low score = disease; high aggregate = every component good; Health score = clinically healthy; Performance-support predicts athlete performance; unavailable = bad |
| Primary outputs | Misconception rates; comprehension accuracy; trust calibration |
| Secondary outputs | Adverse-hide explainability (link Wave 1 BCV-018) |
| Analysis method | Pre-registered probe battery after ER-BC-18 |
| Subgroup plan | Numeracy; age exploratory |
| Sample-size method | Proportion precision |
| Privacy prerequisites | Minimal demographics; no scores persisted to product |
| Dependencies | ER-BC-18; BCV-010; BCV-033; BCV-018 |
| Maps to BCV / ER | BCV-033; BCV-010; ER-BC-18 |
| Success means | Known misconception profile and required explanation controls |
| Failure means | Material misunderstanding → NO-GO for any display / consumer path |
| Cannot prove | That final UI copy is sufficient; UI is not built here |

---

### TB-18 — Missing-data / temporal-coherence audit

| Field | Value |
|-------|-------|
| ID | TB-18 |
| Title | Empirical missingness and temporal-coherence audit |
| Priority | **P0** protocol freeze / **P1** empirical execution |
| Question | How do real cadences and missingness interact with frozen 180d / 90d / same-era / Resolver rules? |
| Hypothesis | Sparse real-world cadence produces material unscorable rates and era mismatches |
| Cohort | Observational repeat schedules; no rule changes |
| Measurements | Timestamped Waist/DXA streams; Resolver statuses; withhold reasons |
| Repeat structure | Naturalistic + designed sparse/dense schedules |
| Primary outputs | Unscorable rates; reason tallies; era-mismatch rates; temporal eligibility map |
| Secondary outputs | Link to TB-15 selection |
| Analysis method | Descriptive + pre-specified scenario audits; compare to Wave 1 BCV-015/016 structural results |
| Subgroup plan | Site; access pathway |
| Sample-size method | Proportion precision |
| Privacy prerequisites | §3; timestamp minimization where possible |
| Dependencies | Frozen recency policy (do not change); Resolver freeze |
| Maps to BCV / ER | BCV-015 emp; BCV-016 emp; R11 |
| Success means | Empirical scorability/temporal profile under frozen rules |
| Failure means | Extreme unscorable rates for intended use → claim-scope limit or FSR on windows (not silent rule change) |
| Cannot prove | That changing windows is authorized |

---

## 11. Measurement protocols (planning constraints)

### 11.1 Waist

- Protocol: WHO midpoint (version pinned at protocol freeze)
- Training / certification of measurers before TB-01
- Record clothing, posture, respiratory phase policy
- Never silently convert unknown protocol → WHO

### 11.2 DXA

- Whole-body composition ROIs as required for FM/FFM/ALM
- Same-software analysis for TB-02 pairs
- Positioning checklist mandatory
- Quality flags mandatory
- Acute-state instructions logged

### 11.3 Height

- Shared Height for all index recomputation (joint-Height rule from private validation plan)
- Do not draw independent height errors per index in analysis either

### 11.4 Offline scoring

- Use approved implementation SHA only
- Fail-closed reasons unchanged
- No product persistence of public scores

---

## 12. Analysis plan framework

### 12.1 Method classes required by study type

| Class | Methods |
|-------|---------|
| Descriptive | Distributions, missingness, cell counts |
| Agreement | Bias, LoA, BA, proportional bias, heteroscedasticity |
| Reliability | ICC (model pre-specified), SEM, SDC/MDC |
| Correlation / covariance | Pearson/Spearman as pre-specified; partial correlations; covariance matrices with CIs |
| Calibration / bridging | Only where pre-registered; not to “fix” scores post hoc |
| Subgroup / interaction | Stratified estimates + interactions; small-cell rules |
| Longitudinal | Mixed-effects / trajectory models |
| Missingness | Reason tallies; selection analysis |
| Sensitivity | Protocol QC alternate definitions; acute-state subsets |

### 12.2 Confirmatory vs exploratory

Before execution, each TB module must freeze:

- primary hypotheses
- primary outcomes
- confirmatory subgroup analyses
- exclusion rules
- missing-data strategy
- analysis code plan (repo path or sealed package — **not** product runtime)
- stop/go criteria categories

Exploratory analyses allowed only if labeled and non-blocking unless pre-declared otherwise.

### 12.3 Pre-registration / analysis freeze

**Required before Tier B execution authorization.** Prevents result-driven tuning of knots/weights/thresholds.

---

## 13. Stop / go criteria

### 13.1 Categories (freeze categories now; numbers later)

| Category | Intent |
|----------|--------|
| Reliability | Retest precision adequate for intended claims |
| Agreement | Machine/vendor bias within tolerable envelope **or** explicitly non-pooled |
| Uncertainty | Presentation not claiming false precision |
| Subgroup bias | No material single-factor or intersectional bias for claim scope |
| Acute-state sensitivity | Confounders understood and controlled/presented |
| Missingness / scorability | Unscorable/access profile compatible with claim scope |
| Construct validity | Non-circular known-groups / externals support |
| Comprehension | Misconception rates acceptable for any future display materials |
| Privacy / governance | All §3 items closed |

### 13.2 Numerical thresholds

**Evidence-dependent. NOT FROZEN in this planning document.**  
Do not invent unsupported ICC/LoA/ρ cutoffs here.

### 13.3 Automatic NO-GO conditions (future execution)

Maintain **NO-GO** (public scores and consumer paths) if any of:

1. Material unexplained subgroup or intersectional bias
2. Poor repeatability (noise dominates)
3. Material unexplained cross-vendor drift when pooled scoring claimed
4. Noise dominates changes presented as meaningful (SDC/MDC ignored)
5. Unexplained acute-state sensitivity
6. High unscorable rate for intended population
7. Privacy / governance / re-identification failure
8. Consumer misunderstanding on misconception battery
9. Validation dataset lacks representative coverage for the claimed scope
10. Circular “validity” treated as clinical proof
11. Legal / consent unresolved

These preserve and extend private validation plan §20 hard blockers.

---

## 14. Dataset schema planning (no persistence code)

### 14.1 Tables (logical)

| Table | Contents |
|-------|----------|
| `participant_meta` | studySubjectId; sex; ageBand or minimized age; athleticStatus; menopauseStatus?; siteId; accessPathway; consentVersion |
| `measurement_meta` | measurementId; studySubjectId; modality; protocolVersion; operatorCategory; machineId; vendor; model; softwareVersion; qualityFlags; acuteStateFlags |
| `raw_measurements` | Waist; Height; FM; FFM; ALM; units; repeatNumber |
| `derived_indices` | WHtR; FMI; FFMI; ALMI |
| `score_outputs` | construct + aggregate values/reasons; engine/freeze SHAs; availability |
| `external_outcomes` | TB-10/11 variables with assay/method provenance |
| `protocol_compliance` | checklist pass/fail; deviation codes |
| `quality_flags` | standardized codes |

### 14.2 Explicit non-fields in analysis store

name, email, phone, address, account UID, raw free-text notes with identity, production doc paths.

---

## 15. Data governance register (plan)

Each future dataset entry must record:

| Field | Purpose |
|-------|---------|
| datasetId | Unique |
| purpose | Dual-score Tier B validation only |
| source | Site/vendor/study arm |
| legalBasis | Frozen reference |
| consentVersion | Exact |
| steward | Named role |
| storage | Approved boundary |
| allowedUsers | RBAC list |
| retention | End date / trigger |
| deletionDate | Planned / actual |
| exportPermissions | Allowed analytic exports |
| reidentificationRisk | Review result + date |
| approvedAnalyses | TB IDs / analysis SHAs |

No register rows are created in this planning phase (no data collection).

---

## 16. Evidence-review dependencies

### 16.1 Map TB → ER-BC

| TB | Primary ER-BC | Secondary ER-BC |
|----|---------------|-----------------|
| TB-01 | ER-BC-02 | ER-BC-06 |
| TB-02 | ER-BC-01 | ER-BC-06 |
| TB-03 | ER-BC-01 | — |
| TB-04 | ER-BC-16 | ER-BC-01 |
| TB-05 | ER-BC-17 | ER-BC-06 |
| TB-06 | ER-BC-13 | ER-BC-07 |
| TB-07 | ER-BC-05 | ER-BC-01 |
| TB-08 | ER-BC-05 | — |
| TB-09 | ER-BC-08 | ER-BC-03/04 |
| TB-10 | ER-BC-03, ER-BC-09 | ER-BC-14 |
| TB-11 | ER-BC-04 | ER-BC-14 |
| TB-12 | ER-BC-10 | ER-BC-03/04 |
| TB-13 | ER-BC-11 | — |
| TB-14 | ER-BC-12 | ER-BC-10/11 |
| TB-15 | ER-BC-15 | — |
| TB-16 | ER-BC-13 | ER-BC-07 |
| TB-17 | ER-BC-18 | — |
| TB-18 | — (policy already frozen) | ER-BC-15 for longitudinal re-id |

### 16.2 Missing / incomplete reviews before protocol freeze

All ER-BC-01 … ER-BC-18 remain **literature/methods reviews to complete** before numeric thresholds or final candidate lists are frozen. This plan **does not fabricate literature findings**.

**Critical path before protocol freeze:**

1. **ER-BC-15** (re-id + governance) — hard blocker for execution
2. **ER-BC-01 / 02 / 17** — underpin P0 measurement modules
3. **ER-BC-16** — prioritize TB-04 early-pilot states
4. **ER-BC-10 / 11** — age/sex fairness protocol details
5. **ER-BC-13 / 07** — keep change triad unconflated
6. **ER-BC-18** — comprehension probe freeze
7. **ER-BC-03 / 04 / 09** — before locking TB-10/11 confirmatory externals
8. **ER-BC-05** — before TB-07/08 vendor claims
9. **ER-BC-12** — before ethnicity analyses
10. **ER-BC-14** — before any predictive-language creep

---

## 17. Execution gates (all required)

Tier B execution remains **BLOCKED** until **all** are independently approved:

1. Governance / privacy package
2. Legal / consent package
3. Cohort design freeze
4. Measurement protocols freeze
5. Study catalog freeze (this plan → protocol freeze successor)
6. Sample-size **method** freeze (+ completed power analyses for authorized wave)
7. Analysis plan freeze (confirmatory/exploratory)
8. Stop/go criteria freeze (categories now; numbers when evidence-ready)
9. Storage / access / audit freeze
10. De-identification / re-identification review (ER-BC-15)
11. Independent methodology review **PASS**
12. Tier B protocol truth freeze published
13. Independent protocol re-gate **PASS**
14. Explicit execution authorization document

---

## 18. Required future sequence

```text
Wave 1 COMPLETE / TRUTH-FROZEN (synthetic ACCEPTED)
        ↓
Tier B empirical-validation PLAN (THIS DOCUMENT) — CURRENT
        ↓
independent methodology review
        ↓
evidence reviews (ER-BC-*) + governance closure
        ↓
Tier B protocol truth freeze
        ↓
independent protocol re-gate
        ↓
only then: Tier B execution authorization
        ↓
P0 empirical wave (TB-01, TB-02, TB-05, TB-18…)
        ↓
later P1/P2 modules per gates
```

**Do not skip gates. Do not execute Tier B from this document alone.**

---

## 19. Relationship to private validation plan BCVs

| Private-plan BCV | Tier B module |
|------------------|---------------|
| BCV-002 empirical σ | TB-01 |
| BCV-003 | TB-02 |
| BCV-004 | TB-06 |
| BCV-005 | TB-07 / TB-08 |
| BCV-006 empirical | TB-12 |
| BCV-007 empirical | TB-13 |
| BCV-008 | TB-09 |
| BCV-009 | TB-10 / TB-11 |
| BCV-010 / BCV-033 | TB-17 |
| BCV-016 empirical | TB-18 |
| BCV-021 / BCV-031 emp | TB-14 |
| BCV-023 | TB-03 |
| BCV-024 / BCV-034 emp | TB-04 |
| BCV-027 | TB-15 |
| BCV-029 emp magnitudes | TB-05 |
| BCV-020 / BCV-032B | TB-16 |
| BCV-015 emp | TB-18 |

Wave 1 synthetic BCVs remain authoritative for synthetic evidence only.

---

## 20. Explicit non-authorizations

This plan **does not**:

- authorize Tier B execution
- establish clinical validation
- authorize consumer integration or score UI
- authorize public Health or Performance-Supporting scores
- freeze numeric acceptance thresholds
- freeze final external-variable sets
- freeze numeric sample sizes
- change draft_v1 math, Resolver, or Confidence
- open a PR for consumer release
- permit PHI or production data use

---

## 21. End-state of this planning document

| Item | Status |
|------|--------|
| Tier B master plan | **CREATED / CURRENT** |
| Tier B planning | **CURRENT** |
| Tier B protocol freeze | **NOT COMPLETE** |
| Tier B execution | **NOT AUTHORIZED** |
| Clinical validation | **NOT ESTABLISHED** |
| Consumer integration | **NOT AUTHORIZED** |
| Public Health / Performance-Supporting | **NO-GO** |
| Next action | Open a **new independent Tier B methodology reviewer** |

---

END OF TIER B EMPIRICAL VALIDATION PLAN V1
