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
| Methodology re-gate @ `9c5dd88d…` | **FAIL** (18 blockers) |
| This correction | **Methodology Correction Pass V1** |
| Plan status | **CORRECTED / PENDING INDEPENDENT METHODOLOGY RE-GATE** |
| Evidence-review workstream | **BLOCKED** pending methodology re-gate |
| Governance/legal protocol planning | **BLOCKED** pending methodology re-gate |

> **This document is PLANNING AUTHORITY for future Tier B protocol freeze.**
> It is **NOT** Tier B execution authorization.
> It is **NOT** clinical validation.
> It is **NOT** consumer or public-score authorization.
> Evidence-review and governance/legal protocol planning remain **BLOCKED** until independent methodology re-gate **PASS**.

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
| Tier B validation planning | **CURRENT** |
| Tier B plan methodology | **CORRECTED / PENDING INDEPENDENT METHODOLOGY RE-GATE** |
| Evidence-review workstream | **BLOCKED** |
| Governance/legal protocol planning | **BLOCKED** |
| Tier B protocol freeze | **BLOCKED** |
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

1. Independent methodology re-gate **PASS** on this corrected plan
2. Ethics-classification determination (§3.0)
3. Legal basis + consent taxonomy (§3.1 / §3.1A)
4. Data-use purpose limitation
5. Minimum necessary data specification
6. Approved storage boundary
7. Encryption at rest / in transit
8. RBAC
9. Audit logging
10. Access-approval workflow
11. Retention schedule
12. Deletion / destruction / withdrawal-revocation model
13. Export controls
14. Breach-response ownership
15. Re-identification risk review (ER-BC-15)
16. Small-cell policy
17. Dataset destruction policy
18. Study catalog freeze (incl. TB-02A/B/C, TB-04A–F, TB-12A/B, TB-13A/B)
19. Measurement protocols freeze
20. Analysis-plan freeze checklist (§12.4) incl. multiplicity, missingness, QC/outlier
21. Sample-size **method** freeze (numeric N pending power analysis)
22. Score-specific and construct-specific stop/go architecture freeze (§13)
23. Change-control path acknowledgment (§13.5)
24. Storage / access / re-identification package
25. Tier B protocol truth freeze
26. Independent protocol re-gate **PASS**
27. Explicit Tier B execution authorization document

**If any remains unresolved: Tier B execution stays BLOCKED.**

Evidence-review workstream and governance/legal protocol planning remain **BLOCKED** until methodology re-gate **PASS**.

---

## 3. Governance gate

### 3.0 Ethics / IRB decision path (mandatory before any human-derived execution)

Do **NOT** assert that IRB is always required. Before any human-derived Tier B execution, an authorized legal/ethics determination **MUST** classify the activity and document the outcome.

#### 3.0.1 Classification dimensions (distinguish all)

| Class | Meaning (planning labels only) |
|-------|--------------------------------|
| Human-subject research | Interaction/intervention or identifiable private information for research |
| Product research | Product-oriented evaluation that may or may not be HSR depending on determination |
| Quality improvement | Local QI framing — still requires formal classification, not a self-label escape |
| Exempt research | Exemption category if applicable under governing rules |
| Non-exempt research | Requires full/board ethics review path if applicable |
| External dataset analysis | Secondary analysis of licensed/external data — separate lawful-use path |

#### 3.0.2 Required determination outputs

Document whether:

- IRB/ethics review is required;
- exemption applies;
- institutional approval is required;
- no formal IRB review is required.

#### 3.0.3 Required governance-register fields

| Field | Required |
|-------|----------|
| `ethicsDeterminationType` | Yes |
| `ethicsReviewerOrAuthority` | Yes |
| `determinationDate` | Yes |
| `determinationReference` | Yes |
| `irbRequired` | Yes |
| `exemptionCategory` | Yes (or `n/a`) |
| `approvalStatus` | Yes |

**Tier B execution remains blocked until ethics determination is complete and recorded.** Exact legal conclusions: **LEGAL REVIEW REQUIRED** — not invented here.

### 3.1 Legal / consent / purpose (must freeze before execution)

| Item | Planning requirement | Status |
|------|----------------------|--------|
| Legal basis | Document lawful basis for each processing purpose (research / validation / quality) under applicable law | **UNRESOLVED** · **LEGAL REVIEW REQUIRED** |
| Consent taxonomy | Full A–J separation in §3.1A | **UNRESOLVED** · **LEGAL REVIEW REQUIRED** |
| Data-use purpose | Explicit: private dual-score empirical validation only — not marketing, not product training without separate basis | **UNRESOLVED** |
| Secondary use | Forbidden unless separately consented and registered (taxonomy F) | **UNRESOLVED** |
| Clinic / site agreements | DUA / BAAs / research agreements as applicable — planning only; no outreach in this phase | **UNRESOLVED** |

### 3.1A Consent taxonomy (explicit separation)

Do not collapse these. Exact retention/revocation outcomes: **LEGAL REVIEW REQUIRED**.

| ID | Consent / notice class | Planning notes |
|----|------------------------|----------------|
| **A** | Measurement / data-collection consent | Permission to obtain Waist/DXA/labs/function measures |
| **B** | Research / validation-use consent | Permission to use data for dual-score Tier B validation analyses |
| **C** | Privacy notice acknowledgment | Notice of processing / rights — distinct from A/B |
| **D** | Withdrawal from future participation | Stops future contact / future measures |
| **E** | Consent revocation | Revokes processing permissions; recording required |
| **F** | Secondary-use consent / restriction | Any use beyond Tier B validation purpose |
| **G** | Publication / sharing consent | Where applicable for external reporting |
| **H** | External-dataset license / use basis | For Tier C-style datasets (not participant consent) |
| **I** | Correction / amendment requests | How subjects request correction of held data |
| **J** | Destruction / deletion after withdrawal | How deletion interacts with D/E |

#### 3.1A.1 Withdrawal / revocation planning questions (must answer at legal freeze)

Define (without inventing legal conclusions here):

- what withdrawal **stops**;
- what already-analyzed data may or may not be retained;
- how revocation is recorded;
- whether prior aggregate results can remain;
- how the subject is informed.

#### 3.1A.2 Withdrawal / revocation timing matrix

| Timing | What data can be deleted | What must be retained by law/ethics if applicable | What derived results can remain | Who decides |
|--------|--------------------------|---------------------------------------------------|--------------------------------|-------------|
| Before measurement | Contact + pre-measure records per policy | **LEGAL/ETHICS REVIEW REQUIRED** | n/a | Steward + ethics/legal designee |
| After measurement / before analysis | Raw measures if deletion permitted | **LEGAL/ETHICS REVIEW REQUIRED** | None yet | Steward + ethics/legal designee |
| After analysis | Raw/row-level if permitted | Audit/accountability artifacts if required | Derived aggregate outputs only if lawfully retainable | Steward + ethics/legal designee |
| After aggregate publication/reporting | Individual-level if permitted | Publication record / regulatory retainers if any | Published aggregates may remain if lawfully issued | Steward + ethics/legal designee |

All cells marked **LEGAL/ETHICS REVIEW REQUIRED** until formal determination. Do not invent legal outcomes in this plan.

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

### 8.2 Method by study family (required; no final N)

| Family | Required sample-size method | Typical TB modules |
|--------|----------------------------|--------------------|
| Reliability | Precision around ICC / SEM / SDC | TB-01, TB-02A/B/C, TB-03, TB-16 |
| Agreement | Precision around mean bias / LoA | TB-07, TB-08 |
| Correlations / covariance | CI-width or power for prespecified effect | TB-05, TB-10, TB-11 |
| Longitudinal | Repeated-measures / mixed-model power or precision | TB-06 |
| Fairness | Subgroup / interaction precision | TB-12A/B, TB-13A/B, TB-14 |
| Comprehension | Proportion / contrast precision | TB-17 |
| Missingness / access | Prevalence / rate precision | TB-15, TB-18 |
| Acute contrasts | Paired mean-difference precision per subprotocol | TB-04A–F |

**No final N yet.** Numeric N remains pending evidence review + power analysis at protocol freeze.

### 8.3 Intersectional warning

Power for main effects ≠ power for interactions. Pre-declare which interactions are confirmatory vs exploratory. **No P1 study may require an unfinished P2 endpoint study.**

---

## 9. Study catalog overview

| ID | Title | Execution priority | Primary layer |
|----|-------|--------------------|---------------|
| TB-01 | Waist repeatability | **P0** | V2 |
| TB-02 | Same-machine DXA repeatability (parent) | **P0** | V2/V5 |
| TB-02A | Same-session / minimal repositioning precision | **P0** | V2/V5 |
| TB-02B | Full repositioning repeat | **P0** | V2/V5 |
| TB-02C | Day-to-day repeat subset | **P1** | V2/V5 |
| TB-03 | Operator / positioning / analysis-review variance | **P1** | V5 |
| TB-04 | Acute-state sensitivity (parent) | **P1** (phased) | V5/V3 |
| TB-04A | Hydration | **P1** | V5 |
| TB-04B | Recent exercise | **P1** | V5 |
| TB-04C | Meal / fasting | **P1** | V5 |
| TB-04D | Time of day | **P1** | V5 |
| TB-04E | Menstrual-phase context | **P2** | V5 |
| TB-04F | Edema/inflammation/illness observational | **P2** | V5 |
| TB-05 | Real covariance estimation | **P0** | V2 |
| TB-06 | Longitudinal stability | **P1** | V3 |
| TB-07 | Same-vendor cross-machine agreement | **P1** | V5 |
| TB-08 | Cross-vendor agreement | **P2** | V5 |
| TB-09 | Known-groups validity | **P1** | V7 |
| TB-10 | Health external construct association | **P2** | V6/V11 |
| TB-11 | Performance external construct association | **P2** | V6 |
| TB-12 | Age fairness (parent) | — | V8 |
| TB-12A | Age distribution/reliability/scorability | **P1** | V8 |
| TB-12B | Age external-meaning fairness | **P2** (depends TB-10/11) | V8 |
| TB-13 | Sex fairness (parent) | — | V8 |
| TB-13A | Sex distribution/reliability/scorability | **P1** | V8 |
| TB-13B | Sex external-meaning fairness | **P2** (depends TB-10/11) | V8 |
| TB-14 | Intersectional fairness | **P2** | V8 |
| TB-15 | Scorability / access / selection bias | **P1** | §13 / V12 |
| TB-16 | Change detectability / SDC–MDC | **P1** | V2/V10 |
| TB-17 | User comprehension / numeracy | **P1** | V9 |
| TB-18 | Missing-data / temporal-coherence audit | **P0** protocol / **P1** empirical | V1/V3 |
| SP-01 | P1 Resolver Policy Review | Scientific/Resolver (not empirical fix) | Policy |
| SP-02 | Score Sensitivity / Presentation Policy Review | Scientific/presentation (not formula fix) | Policy |

**Parent study families:** **18** (TB-01 … TB-18). Subprotocols and SP tracks are additive planning units, not formula changes.

**Priority rollup**

| Class | Studies / subprotocols |
|-------|------------------------|
| P0 | TB-01, TB-02A, TB-02B, TB-05, TB-18 protocol |
| P1 | TB-02C, TB-03, TB-04A–D, TB-06, TB-07, TB-09, TB-12A, TB-13A, TB-15, TB-16, TB-17, TB-18 empirical |
| P2 | TB-04E–F, TB-08, TB-10, TB-11, TB-12B, TB-13B, TB-14 |
| P3 | Prospective extensions (BCV-025/026 pathway) |
| Policy tracks | SP-01, SP-02 (parallel; not Tier B “fixes”) |

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

### TB-02 — Same-machine DXA repeatability (parent)

| Field | Value |
|-------|-------|
| ID | TB-02 (parent of TB-02A/B/C) |
| Title | Same-machine DXA test–retest with variance-component separation |
| Priority | **P0** (02A/02B); **P1** (02C) |
| Question | What is same-machine precision for FM/FFM/ALM → indices → scores, separated by error source? |
| Hypothesis | Instrument, repositioning, day-to-day, operator, and software variance are distinguishable; collapsing them misleads |
| Cohort | Adults with same-machine paired DXA under controlled prep (may share cohort with TB-03) |
| Measurements | DXA FM, FFM, ALM; Height; Waist if Health scored; full provenance |
| Primary outputs | Separated variance components + reliability/agreement for components, indices, constructs, aggregates |
| Sample-size method | Precision around ICC / SEM / SDC |
| Privacy prerequisites | §3 complete; DXA provenance without identity |
| Dependencies | ER-BC-01; ER-BC-15; acute-state controls |
| Maps to BCV / ER | BCV-003; ER-BC-01; ER-BC-06 |
| Cannot prove | Cross-machine interchangeability; clinical meaningful change |

**Hard separation (outputs must remain distinguishable):**

| Source | Captured primarily by |
|--------|----------------------|
| Instrument repeatability | TB-02A |
| Repositioning variability | TB-02B (+ TB-03) |
| Biological day-to-day variability | TB-02C |
| Operator variability | TB-03 |
| Analysis / software variability | TB-03 |

#### TB-02A — Same-session / minimal repositioning precision

| Field | Value |
|-------|-------|
| Priority | **P0** |
| Repeat structure | Same session; minimal repositioning; same machine/software/operator category |
| Primary outputs | Instrument-dominant precision for FM/FFM/ALM/indices/scores |
| Success means | Usable instrument σ / SEM candidates |
| Failure means | Poor instrument precision → score-local reliability NO-GO path |

#### TB-02B — Full repositioning repeat

| Field | Value |
|-------|-------|
| Priority | **P0** |
| Repeat structure | Same session or short interval with full off-table repositioning |
| Primary outputs | Repositioning-inclusive precision (vs 02A delta) |
| Success means | Quantified repositioning contribution |
| Failure means | Repositioning dominates → protocol redesign before pilot |

#### TB-02C — Day-to-day repeat subset

| Field | Value |
|-------|-------|
| Priority | **P1** |
| Repeat structure | Next-day / short between-day repeat under controlled acute state |
| Primary outputs | Day-to-day biological + residual measurement variability |
| Dependencies | TB-04 controls for acute state on day-to-day visits |
| Success means | Separated day-to-day envelope for SDC interpretation |
| Failure means | Unexplained day-to-day instability → HOLD on delta claims |

---

### TB-03 — Operator / positioning / analysis-review variance

| Field | Value |
|-------|-------|
| ID | TB-03 |
| Title | Operator, positioning, and analysis/software variance decomposition |
| Priority | **P1** |
| Question | How much score-relevant error comes from operator vs positioning vs analysis/software review, beyond TB-02A/B/C? |
| Hypothesis | Positioning/operator/analysis-review can rival pure machine precision; must not collapse into generic “DXA error” |
| Cohort | May share TB-02 cohort; factorial subset |
| Measurements | Controlled repeats crossing operator category × positioning × analysis-review where separable |
| Repeat structure | Nested/factorial: operator / positioning / analysis software-review |
| Primary outputs | Variance components for FM/FFM/ALM and score Δ attributed to operator, positioning, analysis-review |
| Secondary outputs | Protocol QC checklist efficacy |
| Analysis method | Mixed-effects / variance components; do **not** pool with TB-02A instrument term a priori |
| Linkage | TB-02A/B/C provide instrument / repositioning / day-to-day baselines; TB-03 isolates operator + analysis-review |
| Subgroup plan | Site; vendor |
| Sample-size method | Variance-component precision |
| Privacy prerequisites | Operator as category only in analysis store |
| Dependencies | TB-02A/B; ER-BC-01 |
| Maps to BCV / ER | BCV-023; ER-BC-01 |
| Success means | Separated operator/positioning/analysis-review sources |
| Failure means | Uncontrolled operator/positioning dominates → protocol redesign before pilot |
| Cannot prove | Vendor bridging; biological change |

---

### TB-04 — Short-term acute-state DXA sensitivity (parent)

| Field | Value |
|-------|-------|
| ID | TB-04 (parent of TB-04A–F) |
| Title | Acute-state sensitivity with prioritized subprotocols |
| Priority | **P1** for 04A–D; **P2** for 04E–F |
| Question | Which acute states move lean/fat indices and scores without durable remodeling? |
| Hypothesis | Hydration / recent exercise / meal / TOD can move scores (Wave 1 synthetic false-improvement signal) |
| Maps to BCV / ER | BCV-024; BCV-034 empirical; ER-BC-16 |
| Cannot prove | That any Δscore equals remodeling; clinical risk |
| Safety hard rule | Do **not** intentionally induce unsafe illness/inflammation |

Before execution, **each** subprotocol requires frozen: sequence; randomization/counterbalance where relevant; washout; carryover control; participant burden; safety; stop criteria.

| Subprotocol | Focus | Priority | Design notes |
|-------------|-------|----------|--------------|
| **TB-04A** | Hydration | **P1** | Controlled hydration contrast; washout; carryover control |
| **TB-04B** | Recent exercise | **P1** | Standardized bout + recovery window; safety stop criteria |
| **TB-04C** | Meal / fasting | **P1** | Counterbalanced fed/fasted where feasible |
| **TB-04D** | Time of day | **P1** | Morning vs evening under matched prep |
| **TB-04E** | Menstrual-phase context | **P2** | Where relevant; minimization of sensitive data; not required for early pilot |
| **TB-04F** | Edema / inflammation / illness | **P2** | **Observational context only** unless independently deemed safe/ethical for controlled protocol |

Shared primary outputs: construct/aggregate Δ; false-improvement-style indicators under pre-registered definitions; score-specific mapping (Health vs Performance).

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
| Analysis method | Trajectory / mixed-effects; pre-register phase definitions; **regression-to-the-mean controls** below |
| Subgroup plan | Age; sex; athletic status |
| Sample-size method | Repeated-measures / mixed-model power or precision |
| Privacy prerequisites | Longitudinal re-id risk heightened — ER-BC-15 mandatory |
| Dependencies | TB-01/02/05; BCV-016 empirical; ER-BC-13 |
| Maps to BCV / ER | BCV-004; BCV-016 emp; ER-BC-13 |
| Success means | Characterized noise envelope and coherent directed responses |
| Failure means | Noise dominates or paradoxical trajectories unexplained → R10 blocker |
| Cannot prove | Clinical meaningful change thresholds; aging-formula correctness |

**Regression to the mean — required protocol/analysis treatment:**

1. Avoid defining intervention arms solely from extreme baseline score.
2. Use repeated baseline where feasible.
3. Model baseline value appropriately in confirmatory models.
4. Distinguish spontaneous return toward mean from true intervention change.
5. Pre-specify analysis of extreme baseline strata (confirmatory vs exploratory labeled).

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
| Hypothesis | Vendor bias may induce material score Δ; correlation alone is forbidden as sufficiency proof |
| Cohort | Bridging sample across major vendors in scope |
| Measurements | Paired/bridging DXA with full vendor provenance |
| Primary outputs | Bias/LoA/proportional bias/heteroscedasticity/bridging/ICC; score Δ distributions |
| Secondary outputs | Software-version sensitivity; order effects |
| Analysis method | **Agreement-first**; pre-register primary vendor pairs |
| Subgroup plan | Sex; body size |
| Sample-size method | Precision around mean bias / LoA |
| Privacy prerequisites | §3 |
| Dependencies | TB-07; ER-BC-05 |
| Maps to BCV / ER | BCV-005; ER-BC-05 |
| Success means | Evidence for interchangeability **or** explicit non-interchangeability with redesign question |
| Failure means | Unexplained cross-vendor drift → automatic NO-GO for multi-vendor pooled claims |
| Cannot prove | Clinical validity on either vendor |

**Required protocol controls (freeze before execution):**

| Control | Requirement |
|---------|-------------|
| Pairing | Paired participants where feasible |
| Order | Randomized or counterbalanced vendor order |
| Delay | Maximum allowable scan-to-scan delay frozen before execution |
| Acute state | Standardized hydration / meal / exercise state |
| Repositioning | Standardized repositioning protocol |
| Recording | Order recorded; acute-state deviations recorded |
| Same-day impossible | Pre-specify allowable delay **and** sensitivity analysis |

Correlation alone remains **forbidden** as the sole agreement criterion.

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

### TB-12 — Age fairness (parent; split TB-12A / TB-12B)

Parent ID **TB-12** preserved. **No P1 study may require an unfinished P2 endpoint study.**

#### TB-12A — Age distribution / reliability / scorability fairness

| Field | Value |
|-------|-------|
| ID | TB-12A |
| Priority | **P1** |
| Question | Do score distributions, reliability, floor/ceiling, and scorability differ materially by adult age band without relying on TB-10/11 externals? |
| Hypothesis | Age bands may show differential compression, reliability, or scorability even under age-invariant scoring |
| Dependencies | TB-01/02 reliability; TB-15/18 scorability; ER-BC-10; Wave 1 BCV-006 structural context |
| Does **not** depend on | TB-10, TB-11 |
| Primary outputs | Distributional Δ; reliability by age; scorability/unscorable rates by age; floor/ceiling |
| Sample-size method | Subgroup precision |
| Maps to BCV / ER | BCV-006 empirical (distribution/reliability slice); ER-BC-10 |
| Success means | Age fairness profile for reliability/scorability |
| Failure means | Material age reliability/scorability bias → score-local HOLD/NO-GO path |
| Cannot prove | External-meaning fairness (that is TB-12B) |

#### TB-12B — Age external-meaning fairness

| Field | Value |
|-------|-------|
| ID | TB-12B |
| Priority | **P2** |
| Question | Do Health and Performance-Supporting maintain comparable **external meaning** across adult ages? |
| Hypothesis | Structural age invariance (Wave 1 Δ=0) does **not** guarantee comparable external meaning |
| Dependencies | **Requires TB-10/TB-11** external-construct evidence; ER-BC-10 |
| Primary outputs | Age × external-association interactions with CIs |
| Sample-size method | Interaction / stratified association precision |
| Maps to BCV / ER | BCV-006 empirical (external-meaning slice); ER-BC-03/04/10 |
| Success means | Evidence that external meaning is or is not comparable across age |
| Failure means | Material age-meaning bias → SCIENTIFIC_REVIEW_REQUIRED / FSR; public NO-GO remains |
| Cannot prove | Authorization to change formula in this plan |

**Central empirical question remains TB-12B**, but it is correctly sequenced after externals. Formula stays frozen unless later redesign is separately authorized via §13.5.

---

### TB-13 — Sex-transform validity / fairness (parent; split TB-13A / TB-13B)

Parent ID **TB-13** preserved. Sex-specific knots do **not** automatically prove fairness.

**Hard rule:** Do not introduce demographic corrections into formulas during planning or Tier B execution. Recalibration only via §13.5.

#### TB-13A — Sex distribution / reliability / scorability fairness

| Field | Value |
|-------|-------|
| ID | TB-13A |
| Priority | **P1** |
| Question | Do distribution shape, floor/ceiling, information content, reliability, sensitivity, and scorability differ unfairly by sex without requiring TB-10/11? |
| Hypothesis | Sex transforms may compress/expand differently even if structurally intentional |
| Dependencies | TB-01/02; TB-09 (non-circular groups if available); TB-15/18; ER-BC-11; Wave 1 BCV-007 |
| Does **not** depend on | TB-10, TB-11 |
| Primary outputs | Distributional metrics; reliability; scorability; floor/ceiling; sensitivity by sex |
| Sample-size method | Subgroup comparison precision |
| Maps to BCV / ER | BCV-007 empirical (distribution/reliability slice); ER-BC-11 |
| Success means | Sex fairness profile for reliability/scorability/distribution |
| Failure means | Material sex bias on these axes → construct/score HOLD + scientific review |
| Cannot prove | External-meaning fairness (TB-13B) |

#### TB-13B — Sex external-meaning fairness

| Field | Value |
|-------|-------|
| ID | TB-13B |
| Priority | **P2** |
| Question | Do external associations and known-group separation maintain comparable meaning across sex? |
| Hypothesis | Equal knots-within-sex do not imply equal external meaning |
| Dependencies | **Requires TB-10/TB-11**; TB-09; ER-BC-11 |
| Primary outputs | Sex-stratified external associations; separation metrics with CIs |
| Sample-size method | Subgroup / interaction precision |
| Maps to BCV / ER | BCV-007 empirical (external-meaning slice); ER-BC-03/04/11 |
| Success means | Documented external-meaning fairness profile |
| Failure means | Material sex external-meaning bias → SCIENTIFIC_REVIEW_REQUIRED; no silent fix |
| Cannot prove | Automatic fairness from knot tables alone |

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

### SP-01 — P1 Resolver Policy Review (scientific / Resolver policy)

| Field | Value |
|-------|-------|
| ID | SP-01 |
| Title | P1 Resolver Policy Review |
| Type | **SCIENTIFIC / RESOLVER POLICY** (not an empirical “fix”) |
| Wave 1 input | P1 can naturally produce `policy_not_frozen` when FFMI + FFM coexist |
| Priority | Parallel policy track; not gated as TB P0 empirical |

**Questions (policy track):**

1. What exact evidence combination produces `policy_not_frozen`?
2. Should policy ever be frozen?
3. What evidence would justify a future primary-channel rule?
4. Should unresolved cases remain withheld?

| Allowed in Tier B | Forbidden in Tier B |
|-------------------|---------------------|
| Quantify frequency only (via TB-15 / TB-18) | Select Resolver winner policy |
| Document occurrence contexts | Quietly “fix” by picking a channel |
| Escalate to scientific/Resolver review | Change Resolver inside Tier B execution |

Maps: Wave 1 BCV-015 finding; Resolver Truth Freeze. Outcome path uses §13.5 if any future policy freeze is proposed.

### SP-02 — Score Sensitivity / Presentation Policy Review

| Field | Value |
|-------|-------|
| ID | SP-02 |
| Title | Score Sensitivity / Presentation Policy Review |
| Type | **SCIENTIFIC / PRESENTATION POLICY** |
| Wave 1 inputs | H1 steep raw slope; H3_FFMI highest normalized sensitivity |
| Purpose | Evaluate whether future presentation needs explanation, uncertainty, rounding, change suppression, contribution display, and warnings against overinterpreting small changes |

| Clarification | Rule |
|---------------|------|
| Formula defect? | **Not necessarily** |
| Tier B role | Empirical reliability (TB-01/02/05/16) may **inform** SP-02 |
| Presentation/scientific-policy review | **Separate** from formula change |
| Formula change | Only via §13.5 if later warranted |

Maps: Wave 1 BCV-001/012/018/032A context; ER-BC-18; TB-17.


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
| Longitudinal | Mixed-effects / trajectory models; regression-to-the-mean controls (§TB-06) |
| Missingness | Class-specific methods (§12.5); mechanism assessment |
| Sensitivity | Protocol QC alternate definitions; acute-state subsets; influential-valid retain |

### 12.2 Analysis classification (before execution)

Every analysis must be classified as exactly one of:

| Class | Role |
|-------|------|
| **Confirmatory** | Pre-registered; may inform score-/construct-level stop/go |
| **Secondary** | Pre-registered supportive; multiplicity rules apply within family |
| **Exploratory** | May report nominal p-values/effect estimates **only if clearly labeled exploratory**; **must not** drive release decisions |

### 12.3 Multiplicity planning

Before execution, confirmatory families must freeze **one** approved control method **before seeing results**.

Candidate methods (select at analysis-plan freeze, not now):

- hierarchical testing
- Holm / Bonferroni FWER
- Benjamini–Hochberg FDR

depending on question/family.

**Freeze now:** method selection **must** occur during analysis-plan freeze and **cannot** occur after viewing outcomes.

Do **NOT** select a final multiplicity method in this planning document without the final hypothesis family.

Exploratory analyses: nominal statistics allowed only if labeled exploratory and excluded from release decisions.

### 12.4 Analysis-freeze checklist (mandatory before any Tier B execution)

Explicit frozen fields required:

| Field | Required |
|-------|----------|
| primary hypotheses | Yes |
| secondary hypotheses | Yes |
| exploratory questions | Yes |
| primary endpoints | Yes |
| secondary endpoints | Yes |
| subgroup priorities | Yes |
| covariates | Yes |
| model formulas | Yes |
| multiplicity method | Yes (per confirmatory family) |
| missing-data method | Yes (per missingness class) |
| QC / outlier rules | Yes (per QC class) |
| sensitivity analyses | Yes |
| sample-size calculation | Yes (numeric N at protocol freeze) |
| stopping rules | Yes |
| decision thresholds | Yes (or explicitly evidence-deferred with gate) |
| analysis-code SHA / version | Yes |

### 12.5 Missing-data analysis classes

Explicitly separate:

| Class | Examples |
|-------|----------|
| Measurement missingness | Waist/DXA field absent |
| Participant dropout | Withdraws / lost to follow-up |
| Protocol violation | Prep/positioning deviation invalidating measure |
| Unusable DXA | QC fail / incomplete ROI |
| Unavailable lab / external endpoint | TB-10/11 missing external |
| Missing demographic / subgroup data | Sex/ageBand/athleticStatus absent |

For **each** class, analysis-plan freeze must choose from (as scientifically appropriate):

- complete-case
- available-case
- multiple imputation
- mixed-effects likelihood handling
- inverse-probability weighting
- sensitivity bounds / MNAR sensitivity

**No method may be chosen after viewing study results.**

Require missingness mechanism assessment for each primary analysis:

- MCAR / MAR / potentially MNAR

### 12.6 Outlier / QC prespecification

Explicit QC classes:

| Class | Default planning stance |
|-------|-------------------------|
| Impossible data | Exclusion or repeat after adjudication |
| Biologically implausible data | Adjudication → exclude / retain+sensitivity / repeat |
| Device QC failure | Exclusion or repeat |
| Positioning failure | Exclusion or repeat |
| Protocol deviation | Exclusion from confirmatory / sensitivity retain |
| Influential but valid observation | **MUST NOT** be automatically excluded |

Before execution, each class must specify one or more of:

- exclusion
- retain
- repeat measurement
- sensitivity analysis
- adjudication

**Influential but valid observations:** require primary analysis **plus** sensitivity analysis where appropriate. No silent deletion.

### 12.7 Pre-registration / analysis freeze

**Required before Tier B execution authorization.** Prevents result-driven tuning of knots/weights/thresholds.

---

## 13. Stop / go criteria (score- and construct-specific)

### 13.0 Hard rule — no global all-or-nothing score verdict

Do **NOT** collapse Tier B into one global GO/NO-GO for both scores.

Health Composition and Performance-Supporting Composition may receive **independent** outcomes.

### 13.1 Score-level decision states

| Score | Allowed states |
|-------|----------------|
| Health Composition | **GO** / **HOLD** / **REVISE** / **NO-GO** |
| Performance-Supporting Composition | **GO** / **HOLD** / **REVISE** / **NO-GO** |

One score may fail while the other continues under its own evidence.

### 13.2 Construct-level decision states

Constructs: **H1**, **H2**, **H3**, **P1**, **P3**.

Allowed future decision states (architecture only — **do not alter current formula**):

| State | Meaning |
|-------|---------|
| **RETAIN** | Keep construct in draft model pending higher gates |
| **RECALIBRATE** | Requires formal change-control (§13.5) — never silent |
| **WITHHOLD** | Do not use construct for claimed uses until resolved |
| **REMOVE** | Requires formal change-control + new freeze |
| **SCIENTIFIC_REVIEW_REQUIRED** | Escalate to scientific review track |

A construct failure **must** map into score-level consequences without quiet recalibration.

### 13.3 Score-specific decision matrix (structure freeze; outcomes empty)

| Evidence finding (example) | Affected construct | Affected score | Decision state | Escalation | Public impact |
|----------------------------|--------------------|----------------|----------------|------------|---------------|
| H1 repeatability failure | H1 | Health only | TBD at future gate | Reliability / SP-02 | Health public remains NO-GO |
| H2 external-validity failure | H2 | Health only | TBD | TB-10 / scientific review | Health public NO-GO |
| H3 reliability / fairness failure | H3 | Health only | TBD | TB-02/12/13 | Health public NO-GO |
| P1 external-validity failure | P1 | Performance only | TBD | TB-11 / SP-01 if policy | Perf public NO-GO |
| P3 agreement failure | P3 | Performance only | TBD | TB-07/08 | Perf public NO-GO |
| Systemic privacy / governance failure | both (all) | both | **NO-GO** both | §3 / ER-BC-15 | Both public NO-GO |
| Material comprehension failure on shared materials | presentation | both (display path) | **HOLD** / **NO-GO** display | TB-17 / SP-02 | No consumer display |

Do **not** populate final outcomes now — freeze decision structure only.

### 13.4 Evidence categories (freeze categories now; numbers later)

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

### 13.4A Numerical thresholds

**Evidence-dependent. NOT FROZEN in this planning document.**
Do not invent unsupported ICC/LoA/ρ cutoffs here.

### 13.5 Change-control path (frozen)

Any empirical finding that would alter draft_v1 must follow **exactly**:

```text
empirical finding
  ↓
documented scientific issue
  ↓
scientific review
  ↓
new score specification version
  ↓
new mathematical truth freeze
  ↓
implementation
  ↓
independent implementation re-gate
  ↓
revalidation
```

**Explicitly forbid:**

- silent threshold tuning
- silent weight tuning
- ad-hoc cohort calibration
- post-hoc formula correction inside Tier B

### 13.6 Automatic NO-GO conditions (future execution)

Maintain **NO-GO** (public scores and consumer paths) if any of:

1. Material unexplained subgroup or intersectional bias for the claimed score scope
2. Poor repeatability (noise dominates) for constructs required by that score
3. Material unexplained cross-vendor drift when pooled scoring claimed
4. Noise dominates changes presented as meaningful (SDC/MDC ignored)
5. Unexplained acute-state sensitivity
6. High unscorable rate for intended population
7. Privacy / governance / re-identification failure → **both scores**
8. Consumer misunderstanding on misconception battery → display path
9. Validation dataset lacks representative coverage for the claimed scope
10. Circular “validity” treated as clinical proof
11. Legal / consent / ethics determination unresolved → **both scores**
12. Quiet recalibration attempted outside §13.5

These preserve and extend private validation plan §20 hard blockers, with score-specific application where evidence is score-local.

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

Each future dataset entry must record **all** of:

| Field | Purpose |
|-------|---------|
| `datasetId` | Unique dataset identifier |
| `purpose` | Dual-score Tier B validation only |
| `controller` | Named controller |
| `steward` | Named steward |
| `processor` | Named processor(s) |
| `subprocessors` | Named subprocessors or `none` |
| `legalBasis` | Frozen legal-basis reference |
| `consentVersion` | Exact consent artifact version |
| `ethicsDeterminationType` | From §3.0 |
| `ethicsDeterminationReference` | Determination document ID |
| `dataSource` | Site/vendor/study arm / external source |
| `storageLocation` | Approved boundary |
| `encryptionClass` | At-rest / in-transit class |
| `authorizedRoles` | RBAC role set |
| `approvedUsers` | Named approved users (time-bounded) |
| `auditPolicy` | Access/export/deletion audit policy |
| `retentionRule` | Retention clock / trigger |
| `deletionDate` | Planned / actual |
| `destructionCertification` | End-of-life certificate reference |
| `withdrawalRule` | Link to §3.1A matrix version |
| `secondaryUseRule` | Default forbid unless F consent |
| `sharingRestrictions` | Publication/sharing limits |
| `exportRestrictions` | Analytic export controls |
| `reidentificationRiskStatus` | ER-BC-15 review status |
| `smallCellPolicy` | Suppression policy version |
| `lineageVersion` | Dataset lineage version |
| `protocolVersion` | Tier B protocol freeze version |
| `analysisVersion` | Analysis-plan freeze version |
| `approvedAnalyses` | TB IDs / analysis SHAs |
| `status` | active / frozen / destroyed |

No register rows are created in this planning phase (no data collection).

---

## 16. Evidence-review dependencies

Preserve **ER-BC-01 … ER-BC-18**. No new ER invented in this correction unless a distinct question is missing — none added; map existing ERs to new subprotocols/SP tracks.

### 16.1 Map TB / SP → ER-BC

| TB / SP | Primary ER-BC | Secondary ER-BC |
|---------|---------------|-----------------|
| TB-01 | ER-BC-02 | ER-BC-06 |
| TB-02A / TB-02B / TB-02C | ER-BC-01 | ER-BC-06 |
| TB-03 | ER-BC-01 | — |
| TB-04A–D | ER-BC-16 | ER-BC-01 |
| TB-04E–F | ER-BC-16 | ethics/safety |
| TB-05 | ER-BC-17 | ER-BC-06 |
| TB-06 | ER-BC-13 | ER-BC-07 |
| TB-07 | ER-BC-05 | ER-BC-01 |
| TB-08 | ER-BC-05 | — |
| TB-09 | ER-BC-08 | ER-BC-03/04 |
| TB-10 | ER-BC-03, ER-BC-09 | ER-BC-14 |
| TB-11 | ER-BC-04 | ER-BC-14 |
| TB-12A | ER-BC-10 | — |
| TB-12B | ER-BC-10 | ER-BC-03/04 |
| TB-13A | ER-BC-11 | — |
| TB-13B | ER-BC-11 | ER-BC-03/04 |
| TB-14 | ER-BC-12 | ER-BC-10/11 |
| TB-15 | ER-BC-15 | — |
| TB-16 | ER-BC-13 | ER-BC-07 |
| TB-17 | ER-BC-18 | — |
| TB-18 | — (recency policy frozen) | ER-BC-15 |
| SP-01 | Resolver Truth Freeze + scientific policy | (frequency via TB-15/18) |
| SP-02 | ER-BC-18 | ER-BC-13 (change presentation) |

### 16.2 Missing / incomplete reviews before protocol freeze

All ER-BC-01 … ER-BC-18 remain **literature/methods reviews to complete** before numeric thresholds or final candidate lists are frozen. This plan **does not fabricate literature findings**.

**Evidence-review workstream remains BLOCKED** until independent methodology re-gate **PASS**.

**Critical path after methodology PASS (then before protocol freeze):**

1. **ER-BC-15** (re-id + governance) — hard blocker for execution
2. **ER-BC-01 / 02 / 17** — underpin P0 measurement modules
3. **ER-BC-16** — prioritize TB-04A–D
4. **ER-BC-10 / 11** — TB-12A/13A protocol details; TB-12B/13B after externals
5. **ER-BC-13 / 07** — keep change triad unconflated
6. **ER-BC-18** — comprehension + SP-02
7. **ER-BC-03 / 04 / 09** — before locking TB-10/11 confirmatory externals
8. **ER-BC-05** — before TB-07/08 vendor claims
9. **ER-BC-12** — before ethnicity analyses
10. **ER-BC-14** — before any predictive-language creep

---

## 16A. Wave 1 finding → Tier B / SP map

| Wave 1 finding | Empirical / policy destination |
|----------------|--------------------------------|
| H1 steep raw slope | TB-01 / TB-02 empirical repeatability **+** SP-02 presentation-policy review |
| H3_FFMI highest normalized sensitivity | TB-02 / TB-05 reliability/covariance **+** SP-02 |
| Adverse-hide | TB-17 comprehension / explainability |
| Acute false improvement | TB-04A–F |
| P1 `policy_not_frozen` | **SP-01** scientific/Resolver policy review; TB-15/TB-18 may quantify frequency **only** |
| Empirical σ/ρ unresolved | TB-01 / TB-02 / TB-05 |
| Fairness unresolved | TB-12A/B, TB-13A/B, TB-14 |

---

## 16B. External dataset gate (Tier C-style)

If any external dataset is used later, require **all** of:

| Requirement | Rule |
|-------------|------|
| License / terms review | Mandatory |
| Lawful-use basis | Mandatory |
| Permitted research purpose | Must cover dual-score validation |
| Measurement-method compatibility | Mandatory |
| DXA vendor/model/software provenance | Required for confirmatory DXA uses |
| Waist protocol provenance | Required for confirmatory Waist uses |
| Cohort definition | Documented |
| Site / geography | Documented |
| Variable mapping | Documented |
| Missing-variable mapping | Documented |
| Data-quality assessment | Documented |
| Data-sharing / export restrictions | Documented |

**If method provenance is insufficient: dataset may not be used for confirmatory validation.**

---

## 16C. Tier B dataset versioning (conceptual)

Require versioning for:

| Object | Versioned |
|--------|-----------|
| Dataset release | Yes |
| Participant / cohort definition | Yes |
| Measurement protocol | Yes |
| Score engine | Yes (implementation SHA) |
| Resolver policy | Yes |
| Analysis plan | Yes |
| Derived variables | Yes |

An empirical result must be traceable to exact versions of all of the above.

---

## 17. Execution hard gate (all required)

Tier B execution remains **BLOCKED** until independent **PASS** of:

1. Independent methodology re-gate on this corrected plan
2. Governance / legal package
3. Ethics determination (§3.0)
4. Consent taxonomy freeze (§3.1A)
5. Cohort design freeze
6. Measurement protocol freeze
7. Sample-size plans (methods + numeric N for authorized wave)
8. Analysis-plan freeze (§12.4 checklist)
9. Multiplicity method freeze (confirmatory families)
10. Missingness-method freeze (per class)
11. QC / outlier plan freeze
12. Score-specific and construct-specific stop/go architecture
13. Storage / access / audit
14. Re-identification review (ER-BC-15)
15. Tier B protocol truth freeze
16. Independent protocol re-gate
17. Explicit execution authorization document

Until methodology re-gate **PASS**:

- Evidence-review workstream: **BLOCKED**
- Governance/legal protocol planning: **BLOCKED**
- Tier B protocol freeze: **BLOCKED**

---

## 18. Required future sequence

```text
Wave 1 COMPLETE / TRUTH-FROZEN (synthetic ACCEPTED)
        ↓
Tier B empirical-validation PLAN — CORRECTED / PENDING METHODOLOGY RE-GATE
        ↓
independent methodology re-gate PASS
        ↓
evidence reviews (ER-BC-*) + governance/legal/ethics closure
        ↓
Tier B protocol truth freeze
        ↓
independent protocol re-gate
        ↓
only then: Tier B execution authorization
        ↓
P0 empirical wave (TB-01, TB-02A/B, TB-05, TB-18…)
        ↓
later P1/P2 modules per gates (TB-12B/13B only after TB-10/11)
```

**Do not skip gates. Do not execute Tier B from this document alone.**

---

## 19. Relationship to private validation plan BCVs

| Private-plan BCV | Tier B module |
|------------------|---------------|
| BCV-002 empirical σ | TB-01 |
| BCV-003 | TB-02A/B/C |
| BCV-004 | TB-06 |
| BCV-005 | TB-07 / TB-08 |
| BCV-006 empirical | TB-12A / TB-12B |
| BCV-007 empirical | TB-13A / TB-13B |
| BCV-008 | TB-09 |
| BCV-009 | TB-10 / TB-11 |
| BCV-010 / BCV-033 | TB-17 |
| BCV-016 empirical | TB-18 |
| BCV-021 / BCV-031 emp | TB-14 |
| BCV-023 | TB-03 |
| BCV-024 / BCV-034 emp | TB-04A–F |
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
| Tier B master plan | **CORRECTED / PENDING INDEPENDENT METHODOLOGY RE-GATE** |
| Tier B planning | **CURRENT** |
| Evidence-review workstream | **BLOCKED** pending methodology re-gate |
| Governance/legal protocol planning | **BLOCKED** pending methodology re-gate |
| Tier B protocol freeze | **BLOCKED** |
| Tier B execution | **NOT AUTHORIZED** |
| Clinical validation | **NOT ESTABLISHED** |
| Consumer integration | **NOT AUTHORIZED** |
| Public Health / Performance-Supporting | **NO-GO** |
| Next action | Open a **new independent Tier B methodology reviewer** against the new SHA; focus on the 18 previously identified blockers |

---

END OF TIER B EMPIRICAL VALIDATION PLAN V1 (METHODOLOGY CORRECTION PASS V1)
