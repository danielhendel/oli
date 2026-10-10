# Body Composition Dual Score — Tier B Integrated Protocol Draft V1

**Document type:** Tier B integrated empirical-validation **protocol draft** (docs only)
**Date:** 2026-10-10
**Branch:** `feat/body-composition-stage3e-body-scans-v1`
**Kind:** Integration draft. **NOT** the final Protocol Truth Freeze. **NOT** execution authorization. **NOT** clinical-study registration. **NOT** a consent form. **NOT** a legal or ethics determination.

| Identity | Value |
|----------|-------|
| Current feature-branch SHA | `374e3bff2cbb6ff9cf2703ef4c978c82db49cd82` |
| Methodology PASS SHA | `d7714df53af661e4492c67074823902197ced0e7` |
| Governance protocol PASS SHA | `302a81ef03fe21638586a497f53fbf5ae92a1361` |
| Scientific evidence PASS / ACCEPTED SHA | `374e3bff2cbb6ff9cf2703ef4c978c82db49cd82` |
| Wave 1 validation truth freeze | `74c6529b2ec0a8a91d1c8f246144e6cda07ee4b6` |
| Approved score implementation | `d940b1616b341e98b19e82f2cd6a6242dfe41691` |
| Mathematical truth freeze | `e258267d109d1d05e20270f205e5fdb29ae2aca6` |
| Methodology | **PASS** |
| Scientific evidence | **ACCEPTED** |
| Governance protocol | **PASS** |
| Governance closure | **NOT COMPLETE** |
| Protocol draft | **THIS DOCUMENT** |
| Protocol truth freeze | **NOT COMPLETE** |
| Tier B execution | **NOT AUTHORIZED** |
| Clinical validation | **NOT ESTABLISHED** |
| Consumer integration | **NOT AUTHORIZED** |
| Public Health | **NO-GO** |
| Public Performance-Supporting | **NO-GO** |
| Claim level | **Level 0** |
| PHI / human data | **NONE** |

> **Authority stack (do not reinterpret):** Mathematical Truth Freeze → Engine Implementation Truth Freeze → Evidence Resolver Truth Freeze → Assessment Confidence Truth Freeze → Private Validation Plan → Wave 1 Validation Truth Freeze → Tier B Empirical Validation Plan (methodology PASS) → Tier B Evidence Review (ACCEPTED) → Tier B Governance Protocol (PASS) → **THIS integrated protocol draft** → future Protocol Truth Freeze → future independent Protocol Re-Gate → only then potential execution authorization.

---

## 0. Mission and hard boundaries

### 0.1 Mission

Produce a complete, internally coherent Tier B protocol draft that states, for each study: what it tests; what evidence supports design; what measurements and analyses are required; what governance controls apply; what remains unresolved; what must be resolved before execution; what findings would affect Health, Performance-Supporting, or constructs; and what cannot be claimed even after Tier B.

### 0.2 Hard boundaries

This docs-only phase does **not**: collect or inspect human-derived data; access production data; recruit; contact DXA centers/clinics/universities/vendors/collaborators; upload DXA reports; create participant databases; implement study storage or consent workflows; change score formulas/knots/weights/recency; alter Resolver or Assessment Confidence; recalibrate from literature; claim governance closure; make legal/ethics determinations; authorize Tier B execution; create consumer UI; expose scores publicly; deploy; open PR; or merge.

### 0.3 Integration status vocabulary (exact)

| Status | Meaning |
|--------|---------|
| **RESOLVED_FOR_PROTOCOL_DRAFT** | Method or constraint supported sufficiently for inclusion in this draft. |
| **EVIDENCE_DEPENDENT** | Requires a pending evidence conclusion or evidence-derived numeric decision. |
| **GOVERNANCE_DETERMINATION_REQUIRED** | Requires counsel, ethics, privacy, or security determination. |
| **EMPIRICAL_ESTIMATE_REQUIRED** | Tier B must prospectively estimate the parameter; no external number silently imported. |
| **SCIENTIFIC_POLICY_REVIEW_REQUIRED** | Requires a governed policy process outside empirical protocol drafting. |
| **PROTOCOL_DETAIL_TO_FREEZE** | Decision path known; final study-specific implementation detail not yet frozen. |
| **BLOCKED** | Cannot proceed to execution. |
| **NOT_APPLICABLE** | Does not apply to the scoped item. |

Unqualified “TBD”, “later”, “decide during study”, “as appropriate”, or “where feasible” are **forbidden** without owner, resolution path, freeze document, and execution gate.

### 0.4 Current authoritative status

| Domain | Status |
|--------|--------|
| Wave 1 | **COMPLETE / TRUTH-FROZEN** |
| Tier B methodology | **PASS** |
| Scientific evidence | **ACCEPTED** |
| Governance protocol | **PASS** |
| Governance closure | **NOT COMPLETE** |
| Protocol draft | **CREATED** (this document) |
| Protocol truth freeze | **NOT COMPLETE** |
| Tier B execution | **NOT AUTHORIZED** |

---

## 1. Claim boundary (frozen for this draft)

Tier B, even if later completed successfully, would **not** automatically establish:

- clinical validity
- predictive validity
- diagnosis
- disease-risk probability
- athletic-performance prediction
- consumer readiness
- public-release readiness

A separate release/claims review remains required. Synthetic Wave 1 ≠ clinical validation. Correlation ≠ clinical validation. Tier B success ≠ consumer authorization.

---

## 2. Governing inputs integrated

| Input | Path / SHA | Role |
|-------|------------|------|
| Tier B methodology plan | `BODY_COMPOSITION_DUAL_SCORE_TIER_B_EMPIRICAL_VALIDATION_PLAN_V1.md` @ `d7714df53af661e4492c67074823902197ced0e7` | Study catalog, analysis framework, stop/go, RTM |
| Methodology decision register | `BODY_COMPOSITION_DUAL_SCORE_TIER_B_DECISION_REGISTER_V1.md` | Gate status |
| Scientific evidence review | `BODY_COMPOSITION_DUAL_SCORE_TIER_B_EVIDENCE_REVIEW_V1.md` @ `374e3bff2cbb6ff9cf2703ef4c978c82db49cd82` | ER-BC-01…18 conclusions |
| Evidence decision register | `BODY_COMPOSITION_DUAL_SCORE_TIER_B_EVIDENCE_DECISION_REGISTER_V1.md` | Evidence ACCEPTED |
| Governance protocol | `BODY_COMPOSITION_TIER_B_GOVERNANCE_PRIVACY_ETHICS_PROTOCOL_V1.md` @ `302a81ef03fe21638586a497f53fbf5ae92a1361` | Consent A–J, LC/EC, security, zones |
| Governance decision register | `BODY_COMPOSITION_TIER_B_GOVERNANCE_DECISION_REGISTER_V1.md` | Closure NOT COMPLETE |
| Wave 1 truth freeze | `BODY_COMPOSITION_DUAL_SCORE_WAVE1_VALIDATION_TRUTH_FREEZE_V1.md` @ `74c6529b2ec0a8a91d1c8f246144e6cda07ee4b6` | Synthetic findings → TB/SP map |
| Mathematical truth freeze | `BODY_COMPOSITION_DUAL_SCORE_MATHEMATICAL_TRUTH_FREEZE_V1.md` @ `e258267d109d1d05e20270f205e5fdb29ae2aca6` | Formulas/knots/weights/recency |
| Engine implementation freeze | `BODY_COMPOSITION_DUAL_SCORE_ENGINE_IMPLEMENTATION_TRUTH_FREEZE_V1.md` | Approved implementation |
| Resolver truth freeze | `BODY_COMPOSITION_EVIDENCE_RESOLVER_V1_TRUTH_FREEZE.md` | Resolver policy; SP-01 boundary |
| Assessment Confidence freeze | `BODY_COMPOSITION_ASSESSMENT_CONFIDENCE_V1_TRUTH_FREEZE.md` | Confidence unchanged |
| Standardized Waist / index spec | `STANDARDIZED_WAIST_AND_DETERMINISTIC_INDEX_LAYER_V1.md` | WHO midpoint / indices |
| Evidence Bridge | `BODY_COMPOSITION_EVIDENCE_BRIDGE_V1.md` | Evidence bridge contract |
| Metric registry | `BODY_SCAN_CANONICAL_METRIC_REGISTRY_V1.md` | Canonical metrics |

Companion integration artifacts:

- Blocker register: `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_TIER_B_PROTOCOL_BLOCKER_REGISTER_V1.md`
- Integration matrix: `docs/10_product/specs/BODY_COMPOSITION_DUAL_SCORE_TIER_B_PROTOCOL_INTEGRATION_MATRIX_V1.md`

---

## 3. Wave 1 findings → protocol destinations

| Wave 1 finding | Destination |
|----------------|-------------|
| H1 steep raw slope (~300 raw; ~195 normalized) | TB-01/TB-02 reliability + **SP-02** presentation policy |
| H3_FFMI highest normalized sensitivity (~600) | TB-02/TB-05 + **SP-02** |
| Adverse-hide explainability | TB-17 |
| Acute false improvement (BCV-034) | TB-04A–F |
| P1 `policy_not_frozen` when FFMI+FFM coexist | **SP-01** (frequency only via TB-15/18) |
| Empirical σ/ρ unresolved | TB-01 / TB-02 / TB-05 |
| Fairness unresolved empirically | TB-12A/B, TB-13A/B, TB-14 |
| 180d / 90d temporal rules | TB-18 evaluates; does not change during execution |

---

## 4. Study catalog overview

| ID | Title | Priority | Freeze readiness | Execution |
|----|-------|----------|------------------|-----------|
| TB-01 | Waist repeatability (WHO midpoint) | **P0** | **DRAFT_READY** | **NOT_AUTHORIZED** |
| TB-02A | Same-session / minimal-repositioning DXA precision | **P0** | **DRAFT_READY** | **NOT_AUTHORIZED** |
| TB-02B | Full-repositioning DXA repeatability | **P0** | **DRAFT_READY** | **NOT_AUTHORIZED** |
| TB-02C | Day-to-day DXA repeat subset | **P1** | **PARTIAL** | **NOT_AUTHORIZED** |
| TB-03 | Operator / positioning / analysis-review variance | **P1** | **PARTIAL** | **NOT_AUTHORIZED** |
| TB-04A | Acute-state: Hydration | **P1** | **PARTIAL** | **NOT_AUTHORIZED** |
| TB-04B | Acute-state: Recent exercise | **P1** | **PARTIAL** | **NOT_AUTHORIZED** |
| TB-04C | Acute-state: Meal / fasting | **P1** | **PARTIAL** | **NOT_AUTHORIZED** |
| TB-04D | Acute-state: Time of day | **P1** | **PARTIAL** | **NOT_AUTHORIZED** |
| TB-04E | Acute-state: Menstrual-phase context | **P2** | **PARTIAL** | **NOT_AUTHORIZED** |
| TB-04F | Acute-state: Illness / edema / inflammation observational context | **P2** | **PARTIAL** | **NOT_AUTHORIZED** |
| TB-05 | Within-person measurement-error covariance (Σ_ε) | **P0** | **PARTIAL** | **NOT_AUTHORIZED** |
| TB-06 | Longitudinal stability and directed change | **P1** | **PARTIAL** | **NOT_AUTHORIZED** |
| TB-07 | Same-vendor cross-machine agreement | **P1** | **DRAFT_READY** | **NOT_AUTHORIZED** |
| TB-08 | Cross-vendor agreement | **P2** | **DRAFT_READY** | **NOT_AUTHORIZED** |
| TB-09 | Independently defined known-groups validity | **P1** | **PARTIAL** | **NOT_AUTHORIZED** |
| TB-10 | Health external-construct association | **P2** | **PARTIAL** | **NOT_AUTHORIZED** |
| TB-11 | Performance-Support external-construct association | **P2** | **PARTIAL** | **NOT_AUTHORIZED** |
| TB-12A | Age distribution / reliability / scorability fairness | **P1** | **DRAFT_READY** | **NOT_AUTHORIZED** |
| TB-12B | Age external-meaning fairness | **P2** | **PARTIAL** | **NOT_AUTHORIZED** |
| TB-13A | Sex distribution / reliability / scorability fairness | **P1** | **DRAFT_READY** | **NOT_AUTHORIZED** |
| TB-13B | Sex external-meaning fairness | **P2** | **PARTIAL** | **NOT_AUTHORIZED** |
| TB-14 | Intersectional fairness | **P2** | **PARTIAL** | **NOT_AUTHORIZED** |
| TB-15 | Scorability / access / selection bias | **P1** | **DRAFT_READY** | **NOT_AUTHORIZED** |
| TB-16 | SDC / MDC and change detectability | **P1** | **DRAFT_READY** | **NOT_AUTHORIZED** |
| TB-17 | Comprehension / numeracy | **P1** | **DRAFT_READY** | **NOT_AUTHORIZED** |
| TB-18 | Missingness / temporal-coherence audit | **P0 protocol / P1 empirical** | **DRAFT_READY** | **NOT_AUTHORIZED** |
| SP-01 | P1 Resolver Policy Review | Policy | **N/A (policy)** | **NOT_AUTHORIZED** (policy track) |
| SP-02 | Sensitivity / Presentation Policy Review | Policy | **N/A (policy)** | **NOT_AUTHORIZED** (policy track) |

**Freeze-readiness counts:** DRAFT_READY=11; PARTIAL=16; BLOCKED=0.

**Rule:** No P1 study may require an unfinished P2 endpoint study (TB-12B/13B depend on TB-10/11).

---

## 5. Standard module template (applied below)

Each TB module records: ID; title; priority; scientific question; why it matters; score/construct affected; study type; target population; inclusion/exclusion categories; sampling strategy; enrollment RTM safeguards; study setting; measurements; repeat structure; timeline; randomization/counterbalance; standardization controls; protocol deviations; safety/ethics requirements; primary/secondary/exploratory endpoint candidates; analysis family; sample-size method; missing-data class; multiplicity family; subgroup/fairness plan; QC/outlier framework; governance requirements; consent classes; privacy fields; evidence sources; unresolved parameters; stop/go consequences; what success/failure means; what the study cannot prove; freeze readiness; execution authorization (**NOT_AUTHORIZED** for every module).

---

## 6. TB modules (integrated drafts)

### TB-01 — Waist repeatability (WHO midpoint)

| Field | Value |
|-------|-------|
| ID | TB-01 |
| Title | Waist repeatability (WHO midpoint) |
| Priority | **P0** |
| Scientific question | What is real within-/between-measurer and within-/between-day Waist error under the locked WHO-midpoint protocol with expert-consultation duplicate QC? |
| Why it matters | H1 (WHtR) drives Health Composition; Wave 1 showed steep H1 raw slope near knots; synthetic σ_waist is not substitutable for Oli protocol error. |
| Score affected | Health Composition |
| Construct affected | H1 |
| Study type | Test–retest reliability / agreement |
| Target population | Adults ≥20; both sexes; broad waist/height range |
| Inclusion categories | Able to stand for measurement; consent classes A/B as required; WHO-midpoint feasible |
| Exclusion categories | Pregnancy if safety/ethics so determine; inability to stand; refusal of measurement consent |
| Sampling strategy | Purposive strata across sex and body-size tertiles; no enrollment solely from extreme Health scores |
| Enrollment RTM safeguards | Enrollment not based solely on extreme baseline dual-score; enrichment only if pre-specified |
| Study setting | Controlled measurement site(s) under approved storage boundary (pending) |
| Measurements | WHO-midpoint Waist; Height with shared provenance; measurer ID/category; clothing/posture/breathing/tape fields |
| Repeat structure | Same measurer within-session (≥2 duplicates per expert-consultation rule); different measurer within-session; same-measurer between-day subset |
| Timeline | Single session + optional next-day subset; max between-day delay frozen at protocol freeze |
| Randomization / counterbalance | Measurer order counterbalanced where dual-measurer design used |
| Standardization controls | Tape specification; training/certification program; posture; end-expiration; clothing; tape tension; rounding/resolution |
| Protocol deviations | Pre-specified deviation codes: landmark uncertainty, clothing noncompliance, breathing noncompliance, tape failure |
| Safety / ethics requirements | Minimal burden anthropometry; EC-03 burden determination required |
| Primary endpoint candidates | Mean bias; SD of differences; SEM; SDC95; ICC (model at analysis freeze); Bland–Altman |
| Secondary endpoint candidates | Offline H1/Health Δ under frozen engine; Height-coupling sensitivity |
| Exploratory endpoints | Body-size heteroscedasticity strata |
| Analysis family | Paired differences; BA; variance components; pre-specified heteroscedasticity test |
| Sample-size method | Precision for LoA / SEM CI |
| Missing-data class | Measurement missingness; protocol violation; dropout |
| Multiplicity family | Confirmatory reliability family; score-propagation labeled secondary/exploratory per freeze |
| Subgroup / fairness plan | Sex; waist/BMI tertiles; height bands |
| QC / outlier framework | Impossible/implausible Waist; landmark failure; disagreement >1 cm after repeat cycle → adjudicate/invalid |
| Governance requirements | LC-01,02,06,07; EC-01,02,03,07; zones A–D; consent A–E,J |
| Consent classes | A,B,C,D,E,J |
| Privacy fields | studySubjectId; operatorCategory; no name/email/phone/UID in Zone D |
| Evidence sources | ER-BC-02 (HIGH / PARTIALLY_SUFFICIENT); ER-BC-06 link |
| Wave 1 inputs | BCV-002 synthetic σ context; H1 steep slope (BCV-001) → SP-02 |
| Stop / go consequences | H1 reliability failure → Health HOLD/NO-GO path; Performance unaffected unless shared Height path implicated |
| What success means | Usable empirical σ_waist (+ uncertainty) for joint-error models |
| What failure means | Protocol non-reproducible or error dominates near steep H1 regions without mitigation path |
| What the study cannot prove | Clinical meaning of WHtR; consumer suitability; disease-risk probability |
| Freeze readiness | **DRAFT_READY** |
| Execution authorization | **NOT_AUTHORIZED** |

**Unresolved parameters (each gated):**

| Item | Status | Owner | Evidence dep | Governance dep | Freeze document | Execution blocking |
|------|--------|-------|--------------|----------------|-----------------|--------------------|
| Landmark + expert-consultation duplicate ≤1 cm framework | `RESOLVED_FOR_PROTOCOL_DRAFT` | Scientific lead | ER-BC-02 | — | Protocol Truth Freeze TB-01 | No — drafting OK |
| Final measurer-certification program | `PROTOCOL_DETAIL_TO_FREEZE` | Ops + scientific lead | ER-BC-02 | EC-03 | TB-01 measurement SOP | Yes |
| Oli-specific σ_waist / SDC | `EMPIRICAL_ESTIMATE_REQUIRED` | Biostatistics | ER-BC-02 | — | TB-01 analysis freeze + empirics | Yes (numeric) |
| Tape model / tension device specification | `PROTOCOL_DETAIL_TO_FREEZE` | Scientific lead | ER-BC-02 | — | TB-01 measurement SOP | Yes |

#### TB-01 Waist protocol draft fields

| Field | Draft requirement | Status |
|-------|-------------------|--------|
| Landmark | WHO midpoint (`who_midpoint_v1`): midpoint last palpable rib ↔ iliac crest | `RESOLVED_FOR_PROTOCOL_DRAFT` |
| Duplicate QC | Expert-consultation rule: measure twice; if ≤1 cm average; if >1 cm repeat both (SRC-WHO-WC-WHR-2011 §2.5 **only**) | `RESOLVED_FOR_PROTOCOL_DRAFT` |
| STEPS field procedure | Documented separately as single-measure (“Measure only once and record”); **not** Oli Tier B QC source | `RESOLVED_FOR_PROTOCOL_DRAFT` (separation) |
| Tape specification | Stretch-resistant / constant-tension class; exact model at SOP freeze | `PROTOCOL_DETAIL_TO_FREEZE` |
| Training / certification | Program required before TB-01; final curriculum at SOP freeze | `PROTOCOL_DETAIL_TO_FREEZE` |
| Participant posture | Standing, relaxed, arms at sides per WHO midpoint procedure | `RESOLVED_FOR_PROTOCOL_DRAFT` |
| Breathing | End of normal expiration | `RESOLVED_FOR_PROTOCOL_DRAFT` |
| Clothing | Minimal/light clothing logged; noncompliance = deviation | `PROTOCOL_DETAIL_TO_FREEZE` (site SOP) |
| Tape tension | Snug without compressing skin | `RESOLVED_FOR_PROTOCOL_DRAFT` |
| Repeat count | Duplicate framework as above; additional same/different measurer repeats per design | `RESOLVED_FOR_PROTOCOL_DRAFT` |
| Disagreement handling | >1 cm → repeat both (expert consultation); persistent failure → invalid/adjudicate | `RESOLVED_FOR_PROTOCOL_DRAFT` |
| Measurer ID/category | Category in Zone D; identity in Zone A only | `RESOLVED_FOR_PROTOCOL_DRAFT` |
| Same vs different measurer | Both required in design | `RESOLVED_FOR_PROTOCOL_DRAFT` |
| Within-session / between-day | Both required (between-day subset) | `RESOLVED_FOR_PROTOCOL_DRAFT` |
| Rounding / resolution | Frozen at SOP (mm vs 0.1 cm policy) | `PROTOCOL_DETAIL_TO_FREEZE` |
| Protocol deviation / invalid reading | Pre-specified codes; confirmatory exclusion rules at analysis freeze | `PROTOCOL_DETAIL_TO_FREEZE` |
| Oli σ_waist / SDC | Prospective estimate only | `EMPIRICAL_ESTIMATE_REQUIRED` |

### TB-02A — Same-session / minimal-repositioning DXA precision

| Field | Value |
|-------|-------|
| ID | TB-02A |
| Title | Same-session / minimal-repositioning DXA precision |
| Priority | **P0** |
| Scientific question | What is instrument-dominant same-session precision for FM/FFM/ALM → indices → scores under minimal repositioning? |
| Why it matters | Separates instrument precision from repositioning and day-to-day biology; prerequisite for SDC and joint-error claims. |
| Score affected | Health + Performance-Supporting |
| Construct affected | H2, H3, P1, P3 |
| Study type | Same-session instrument-dominant precision |
| Target population | Adults able to undergo whole-body DXA under site rules |
| Inclusion categories | Eligible for DXA per site safety; consent A/B; same machine/software available for pair |
| Exclusion categories | Pregnancy; contraindications per site; inability to lie still; acute illness if excluded by ethics |
| Sampling strategy | Strata by sex and body size; share cohort with TB-02B/03 where design allows |
| Enrollment RTM safeguards | No enrollment solely from extreme baseline scores |
| Study setting | DXA site with vendor/model/software provenance; calibration/QC logged |
| Measurements | DXA FM, FFM, ALM; Height; Waist if Health scored; vendor, model, machinePseudonym, softwareVersion, scanMode, operatorCategory, positioning flags, analysis-correction flags, acute-state flags, menstrual context where relevant, illness/edema flags |
| Repeat structure | Same session; minimal repositioning; same machine/software/operator category; frozen scan interval |
| Timeline | Single visit pair |
| Randomization / counterbalance | NOT_APPLICABLE for minimal-repositioning pair order beyond SOP |
| Standardization controls | ISCD-style precision design; positioning checklist; metal/clothing rules; fasting/meal/exercise/hydration/glycogen context logged; bladder instructions only if ultimately ethics/site-supported |
| Protocol deviations | Device QC fail; positioning fail; incomplete ROI; acute-state violation |
| Safety / ethics requirements | EC-04 repeated DXA; site radiation/safety policy |
| Primary endpoint candidates | Instrument-dominant σ/SEM/SDC for FM/FFM/ALM/indices/constructs/aggregates |
| Secondary endpoint candidates | QC flag rates; software-version descriptive sensitivity |
| Exploratory endpoints | Body-size heteroscedasticity |
| Analysis family | Agreement + reliability; do not pool with TB-02B/02C a priori |
| Sample-size method | Precision around ICC / SEM / SDC |
| Missing-data class | Unusable DXA; positioning failure; dropout |
| Multiplicity family | Confirmatory precision family per primary metric set |
| Subgroup / fairness plan | Sex; vendor/site if multi-site |
| QC / outlier framework | Device QC failure → exclude/repeat; influential-valid retain + sensitivity |
| Governance requirements | LC-01..03,06,07; EC-01..04,07; zones A–D; consent A–E,J |
| Consent classes | A,B,C,D,E,J |
| Privacy fields | machinePseudonym; operatorCategory; no identifiable DXA PDF in Zone D |
| Evidence sources | ER-BC-01 HIGH / PARTIALLY_SUFFICIENT; ER-BC-06 link |
| Wave 1 inputs | BCV-003 synthetic precision; BCV-029 joint-error context |
| Stop / go consequences | Poor instrument precision → score-local reliability HOLD/NO-GO |
| What success means | Usable instrument σ/SEM candidates |
| What failure means | Instrument precision inadequate for intended claims |
| What the study cannot prove | Cross-machine interchangeability; CMC |
| Freeze readiness | **DRAFT_READY** |
| Execution authorization | **NOT_AUTHORIZED** |

**Unresolved parameters (each gated):**

| Item | Status | Owner | Evidence dep | Governance dep | Freeze document | Execution blocking |
|------|--------|-------|--------------|----------------|-----------------|--------------------|
| Same-session vs day-to-day separation | `RESOLVED_FOR_PROTOCOL_DRAFT` | Scientific lead | ER-BC-01 | — | Protocol Truth Freeze TB-02 | No — drafting OK |
| Local precision / LSC numerics | `EMPIRICAL_ESTIMATE_REQUIRED` | Biostatistics + site | ER-BC-01 | EC-04 | TB-02A analysis freeze | Yes |
| Bladder instruction policy | `PROTOCOL_DETAIL_TO_FREEZE` | Scientific + ethics | ER-BC-16 | EC-04/EC-09 | TB-02 measurement SOP | Yes |

#### TB-02 family separation (authoritative)

| Source | Captured primarily by |
|--------|----------------------|
| Instrument repeatability | TB-02A |
| Repositioning variability | TB-02B (+ TB-03) |
| Biological day-to-day variability | TB-02C |
| Operator variability | TB-03 |
| Analysis / software variability | TB-03 |

Final numeric local precision/LSC: `EMPIRICAL_ESTIMATE_REQUIRED`.

### TB-02B — Full-repositioning DXA repeatability

| Field | Value |
|-------|-------|
| ID | TB-02B |
| Title | Full-repositioning DXA repeatability |
| Priority | **P0** |
| Scientific question | What precision remains after full off-table repositioning versus TB-02A? |
| Why it matters | Repositioning can dominate instrument noise; must remain distinguishable. |
| Score affected | Health + Performance-Supporting |
| Construct affected | H2, H3, P1, P3 |
| Study type | Repositioning-inclusive reliability |
| Target population | Same as TB-02A shareable cohort |
| Inclusion categories | Same as TB-02A |
| Exclusion categories | Same as TB-02A |
| Sampling strategy | Paired with TB-02A where design allows |
| Enrollment RTM safeguards | No extreme-score-only enrollment |
| Study setting | Same DXA site/machine family as pair |
| Measurements | Same provenance fields as TB-02A + repositioning checklist completion |
| Repeat structure | Same session or short interval with full off-table repositioning; frozen max delay |
| Timeline | Single visit |
| Randomization / counterbalance | Reposition sequence SOP-fixed; operator category recorded |
| Standardization controls | Standardized repositioning protocol; acute-state controls matched to TB-02A |
| Protocol deviations | Incomplete reposition; positioning failure |
| Safety / ethics requirements | EC-04 |
| Primary endpoint candidates | Repositioning-inclusive precision; Δ vs TB-02A |
| Secondary endpoint candidates | Positioning checklist efficacy |
| Exploratory endpoints | Operator-category interaction (TB-03 link) |
| Analysis family | Paired agreement; variance attribution vs TB-02A |
| Sample-size method | Precision around ICC / SEM / SDC |
| Missing-data class | Unusable DXA; positioning failure |
| Multiplicity family | Within TB-02 confirmatory family as pre-specified |
| Subgroup / fairness plan | Sex; body size |
| QC / outlier framework | Positioning failure → exclude/repeat/adjudicate |
| Governance requirements | Same as TB-02A |
| Consent classes | A,B,C,D,E,J |
| Privacy fields | Same as TB-02A |
| Evidence sources | ER-BC-01 |
| Wave 1 inputs | BCV-003 |
| Stop / go consequences | Repositioning dominates → protocol redesign before pilot |
| What success means | Quantified repositioning contribution |
| What failure means | Uncontrolled repositioning error |
| What the study cannot prove | Day-to-day biology; vendor bridging |
| Freeze readiness | **DRAFT_READY** |
| Execution authorization | **NOT_AUTHORIZED** |

**Unresolved parameters (each gated):**

| Item | Status | Owner | Evidence dep | Governance dep | Freeze document | Execution blocking |
|------|--------|-------|--------------|----------------|-----------------|--------------------|
| Repositioning contribution numerics | `EMPIRICAL_ESTIMATE_REQUIRED` | Biostatistics | ER-BC-01 | EC-04 | TB-02B analysis freeze | Yes |
| Exact max scan-to-scan delay | `PROTOCOL_DETAIL_TO_FREEZE` | Scientific lead | ER-BC-01 | — | TB-02 measurement SOP | Yes |

### TB-02C — Day-to-day DXA repeat subset

| Field | Value |
|-------|-------|
| ID | TB-02C |
| Title | Day-to-day DXA repeat subset |
| Priority | **P1** |
| Scientific question | What is day-to-day biological + residual measurement variability under controlled prep? |
| Why it matters | SDC interpretation and false-change risk require a separated day-to-day envelope. |
| Score affected | Health + Performance-Supporting |
| Construct affected | H2, H3, P1, P3 |
| Study type | Between-day reliability under controlled acute state |
| Target population | Subset of TB-02 cohort able to return |
| Inclusion categories | Able to return under matched prep; consent covers repeat visit |
| Exclusion categories | Acute illness intervening; prep noncompliance |
| Sampling strategy | Pre-specified subset; not extreme-score-only |
| Enrollment RTM safeguards | No extreme-score-only enrollment |
| Study setting | Same machine preferred; if not, record and sensitivity-analyze |
| Measurements | Same as TB-02A + between-day acute-state logs |
| Repeat structure | Next-day / short between-day under controlled hydration/meal/exercise/TOD |
| Timeline | Two visits; max delay frozen |
| Randomization / counterbalance | Visit TOD matched or counterbalanced per freeze |
| Standardization controls | Depends on TB-04A–D control freezes |
| Protocol deviations | Acute-state violation; machine change |
| Safety / ethics requirements | EC-04; EC-09 if challenge elements used |
| Primary endpoint candidates | Day-to-day SEM/SDC envelope |
| Secondary endpoint candidates | Acute-state deviation sensitivity |
| Exploratory endpoints | Menstrual-context strata if logged |
| Analysis family | Between-day paired differences under frozen controls |
| Sample-size method | Precision around day-to-day SEM/SDC |
| Missing-data class | Dropout between days; protocol violation |
| Multiplicity family | Confirmatory day-to-day family |
| Subgroup / fairness plan | Sex; TOD matching fidelity |
| QC / outlier framework | Acute-state protocol deviation → exclude from confirmatory / sensitivity retain |
| Governance requirements | TB-02A plus EC-09 if challenge prep used |
| Consent classes | A,B,C,D,E,J |
| Privacy fields | Same as TB-02A |
| Evidence sources | ER-BC-01; ER-BC-16 |
| Wave 1 inputs | BCV-034 acute false-improvement |
| Stop / go consequences | Unexplained day-to-day instability → HOLD on delta claims |
| What success means | Separated day-to-day envelope for SDC interpretation |
| What failure means | Unexplained instability |
| What the study cannot prove | Directed remodeling; CMC |
| Freeze readiness | **PARTIAL** |
| Execution authorization | **NOT_AUTHORIZED** |

**Unresolved parameters (each gated):**

| Item | Status | Owner | Evidence dep | Governance dep | Freeze document | Execution blocking |
|------|--------|-------|--------------|----------------|-----------------|--------------------|
| Acute-state control freeze for day-to-day visits | `GOVERNANCE_DETERMINATION_REQUIRED` | Ethics + scientific | ER-BC-16 | EC-09 | TB-04 control SOP | Yes |
| Day-to-day σ numerics | `EMPIRICAL_ESTIMATE_REQUIRED` | Biostatistics | ER-BC-01 | — | TB-02C analysis freeze | Yes |

### TB-03 — Operator / positioning / analysis-review variance

| Field | Value |
|-------|-------|
| ID | TB-03 |
| Title | Operator / positioning / analysis-review variance |
| Priority | **P1** |
| Scientific question | How much score-relevant error comes from operator vs positioning vs analysis/software review beyond TB-02A/B/C? |
| Why it matters | Must not collapse all DXA error into generic 'DXA error.' |
| Score affected | Health + Performance-Supporting |
| Construct affected | H2, H3, P1, P3 |
| Study type | Crossed/nested variance-component design |
| Target population | May share TB-02 cohort; factorial subset |
| Inclusion categories | Multiple operator categories available or simulated via analysis-review swap |
| Exclusion categories | Same DXA safety exclusions |
| Sampling strategy | Crossed/nested allocation frozen after statistical review |
| Enrollment RTM safeguards | No extreme-score-only enrollment |
| Study setting | DXA site(s) |
| Measurements | Controlled repeats crossing operatorCategory × positioning × analysis-review where separable; instrument/day factors linked to TB-02 |
| Repeat structure | Nested/factorial per frozen allocation |
| Timeline | Per allocation plan |
| Randomization / counterbalance | Operator/analysis-review assignment randomized/counterbalanced when design cells allow; if cells incomplete → declare underpowered (`PROTOCOL_DETAIL_TO_FREEZE`; owner: Biostatistics; freeze: TB-03 analysis freeze; gate: blocks TB-03 execution) |
| Standardization controls | Separate factors: instrument, repositioning, operator, analysis/software review, day-to-day biological state |
| Protocol deviations | Incomplete factorial cells → declare underpowered |
| Safety / ethics requirements | EC-04 scan-count justification |
| Primary endpoint candidates | Variance components for FM/FFM/ALM and score Δ by operator, positioning, analysis-review |
| Secondary endpoint candidates | QC checklist efficacy |
| Exploratory endpoints | Site×operator |
| Analysis family | Mixed-effects / variance components; do not pool with TB-02A instrument term a priori |
| Sample-size method | Variance-component precision |
| Missing-data class | Incomplete cells; unusable DXA |
| Multiplicity family | Confirmatory variance-component family |
| Subgroup / fairness plan | Site; vendor |
| QC / outlier framework | Operator as category only in Zone D |
| Governance requirements | Same DXA governance + EC-04 |
| Consent classes | A,B,C,D,E,J |
| Privacy fields | operatorCategory not personal name in Zone D |
| Evidence sources | ER-BC-01 |
| Wave 1 inputs | BCV-023 pathway |
| Stop / go consequences | Uncontrolled operator/positioning dominates → redesign before pilot |
| What success means | Separated operator/positioning/analysis-review sources |
| What failure means | Collapsed/unusable variance attribution |
| What the study cannot prove | Vendor bridging; biological change |
| Freeze readiness | **PARTIAL** |
| Execution authorization | **NOT_AUTHORIZED** |

**Unresolved parameters (each gated):**

| Item | Status | Owner | Evidence dep | Governance dep | Freeze document | Execution blocking |
|------|--------|-------|--------------|----------------|-----------------|--------------------|
| Exact allocation / statistical model | `PROTOCOL_DETAIL_TO_FREEZE` | Biostatistics | ER-BC-01 | EC-04 | TB-03 analysis freeze | Yes |

### TB-04A — Acute-state: Hydration

| Field | Value |
|-------|-------|
| ID | TB-04A |
| Title | Acute-state: Hydration |
| Priority | **P1** |
| Scientific question | Does hydration move lean/fat indices and scores without durable remodeling? |
| Why it matters | Wave 1 BCV-034 showed acute false-improvement risk. Evidence: Material risk to lean estimates (ER-BC-16). |
| Score affected | Health + Performance-Supporting |
| Construct affected | H2, H3, P1, P3 (lean/fat path) |
| Study type | Acute-state challenge or observational context |
| Target population | Adults eligible for DXA and the specific exposure under ethics/safety determination |
| Inclusion categories | Consent covering challenge/observation; contraindications cleared |
| Exclusion categories | Unsafe induction paths; EC-09 exclusions; pregnancy as determined |
| Sampling strategy | Pre-specified; not extreme-score-only |
| Enrollment RTM safeguards | No arm assignment solely from extreme scores |
| Study setting | DXA site with safety monitoring as required |
| Measurements | DXA FM/FFM/ALM ± Waist/Height; exposure logs; timing; stop-rule triggers |
| Repeat structure | Controlled hydration contrast vs euhydrated comparator; washout; carryover control |
| Timeline | Per subprotocol sequence + washout frozen before execution |
| Randomization / counterbalance | Sequence counterbalance/randomization where design uses crossover |
| Standardization controls | Exposure/condition; control/comparator; washout; carryover; burden; safety; stop rules; timing — each frozen per subprotocol |
| Protocol deviations | Stop-rule trigger; incomplete washout; carryover suspicion → sensitivity |
| Safety / ethics requirements | Controlled challenge ethics/safety (EC-09) |
| Primary endpoint candidates | Construct/aggregate Δ; false-improvement indicators under pre-registered definitions; score-specific mapping |
| Secondary endpoint candidates | Component-level Δ; recovery trajectory |
| Exploratory endpoints | Subgroup modifiers (sex, body size) |
| Analysis family | Paired/crossover models with carryover assessment; confirmatory vs exploratory split |
| Sample-size method | Paired/crossover precision for pre-specified Δ |
| Missing-data class | Dropout; stop-rule truncation; unusable DXA |
| Multiplicity family | Per-subprotocol confirmatory family; cross-subprotocol synthesis exploratory unless pre-registered |
| Subgroup / fairness plan | Sex; body size |
| QC / outlier framework | Safety stop → protocol deviation class; do not invent outcomes after seeing Δ |
| Governance requirements | LC-01,02,06,07,11; EC-01..04,06,07,09; consent A–E,J |
| Consent classes | A,B,C,D,E,J |
| Privacy fields | Minimize sensitive menstrual/illness detail; Zone D minimization |
| Evidence sources | ER-BC-16 MODERATE / PARTIALLY_SUFFICIENT (factor nuance) |
| Wave 1 inputs | BCV-034 acute false improvement |
| Stop / go consequences | Material unexplained acute sensitivity → HOLD presentation / score-local constraints; both scores if systemic |
| What success means | Quantified acute Δ with controls suitable for protocol/presentation policy |
| What failure means | Unsafe/unethical design or uncontrolled confounding |
| What the study cannot prove | That any Δscore equals remodeling; clinical risk claims |
| Freeze readiness | **PARTIAL** |
| Execution authorization | **NOT_AUTHORIZED** |

**Unresolved parameters (each gated):**

| Item | Status | Owner | Evidence dep | Governance dep | Freeze document | Execution blocking |
|------|--------|-------|--------------|----------------|-----------------|--------------------|
| Controlled challenge details for this subprotocol | `GOVERNANCE_DETERMINATION_REQUIRED` | Ethics + scientific + site safety | ER-BC-16 | EC-09 | TB-04A ethics/safety determination + SOP | Yes |
| Oli acute Δ magnitudes | `EMPIRICAL_ESTIMATE_REQUIRED` | Biostatistics | ER-BC-16 | — | TB-04A analysis freeze | Yes |
| Exact sequence/washout/carryover parameters | `PROTOCOL_DETAIL_TO_FREEZE` | Scientific lead | ER-BC-16 | EC-09 | TB-04A protocol SOP | Yes |

### TB-04B — Acute-state: Recent exercise

| Field | Value |
|-------|-------|
| ID | TB-04B |
| Title | Acute-state: Recent exercise |
| Priority | **P1** |
| Scientific question | Does recent exercise move lean/fat indices and scores without durable remodeling? |
| Why it matters | Wave 1 BCV-034 showed acute false-improvement risk. Evidence: Material risk; controlled rest period required. |
| Score affected | Health + Performance-Supporting |
| Construct affected | H2, H3, P1, P3 (lean/fat path) |
| Study type | Acute-state challenge or observational context |
| Target population | Adults eligible for DXA and the specific exposure under ethics/safety determination |
| Inclusion categories | Consent covering challenge/observation; contraindications cleared |
| Exclusion categories | Unsafe induction paths; EC-09 exclusions; pregnancy as determined |
| Sampling strategy | Pre-specified; not extreme-score-only |
| Enrollment RTM safeguards | No arm assignment solely from extreme scores |
| Study setting | DXA site with safety monitoring as required |
| Measurements | DXA FM/FFM/ALM ± Waist/Height; exposure logs; timing; stop-rule triggers |
| Repeat structure | Standardized bout + recovery window vs rested comparator; safety stop criteria |
| Timeline | Per subprotocol sequence + washout frozen before execution |
| Randomization / counterbalance | Sequence counterbalance/randomization where design uses crossover |
| Standardization controls | Exposure/condition; control/comparator; washout; carryover; burden; safety; stop rules; timing — each frozen per subprotocol |
| Protocol deviations | Stop-rule trigger; incomplete washout; carryover suspicion → sensitivity |
| Safety / ethics requirements | EC-09 + exercise safety stops |
| Primary endpoint candidates | Construct/aggregate Δ; false-improvement indicators under pre-registered definitions; score-specific mapping |
| Secondary endpoint candidates | Component-level Δ; recovery trajectory |
| Exploratory endpoints | Subgroup modifiers (sex, body size) |
| Analysis family | Paired/crossover models with carryover assessment; confirmatory vs exploratory split |
| Sample-size method | Paired/crossover precision for pre-specified Δ |
| Missing-data class | Dropout; stop-rule truncation; unusable DXA |
| Multiplicity family | Per-subprotocol confirmatory family; cross-subprotocol synthesis exploratory unless pre-registered |
| Subgroup / fairness plan | Sex; body size |
| QC / outlier framework | Safety stop → protocol deviation class; do not invent outcomes after seeing Δ |
| Governance requirements | LC-01,02,06,07,11; EC-01..04,06,07,09; consent A–E,J |
| Consent classes | A,B,C,D,E,J |
| Privacy fields | Minimize sensitive menstrual/illness detail; Zone D minimization |
| Evidence sources | ER-BC-16 MODERATE / PARTIALLY_SUFFICIENT (factor nuance) |
| Wave 1 inputs | BCV-034 acute false improvement |
| Stop / go consequences | Material unexplained acute sensitivity → HOLD presentation / score-local constraints; both scores if systemic |
| What success means | Quantified acute Δ with controls suitable for protocol/presentation policy |
| What failure means | Unsafe/unethical design or uncontrolled confounding |
| What the study cannot prove | That any Δscore equals remodeling; clinical risk claims |
| Freeze readiness | **PARTIAL** |
| Execution authorization | **NOT_AUTHORIZED** |

**Unresolved parameters (each gated):**

| Item | Status | Owner | Evidence dep | Governance dep | Freeze document | Execution blocking |
|------|--------|-------|--------------|----------------|-----------------|--------------------|
| Controlled challenge details for this subprotocol | `GOVERNANCE_DETERMINATION_REQUIRED` | Ethics + scientific + site safety | ER-BC-16 | EC-09 | TB-04B ethics/safety determination + SOP | Yes |
| Oli acute Δ magnitudes | `EMPIRICAL_ESTIMATE_REQUIRED` | Biostatistics | ER-BC-16 | — | TB-04B analysis freeze | Yes |
| Exact sequence/washout/carryover parameters | `PROTOCOL_DETAIL_TO_FREEZE` | Scientific lead | ER-BC-16 | EC-09 | TB-04B protocol SOP | Yes |

### TB-04C — Acute-state: Meal / fasting

| Field | Value |
|-------|-------|
| ID | TB-04C |
| Title | Acute-state: Meal / fasting |
| Priority | **P1** |
| Scientific question | Does meal / fasting move lean/fat indices and scores without durable remodeling? |
| Why it matters | Wave 1 BCV-034 showed acute false-improvement risk. Evidence: Meaningful protocol consideration; overnight fast candidate. |
| Score affected | Health + Performance-Supporting |
| Construct affected | H2, H3, P1, P3 (lean/fat path) |
| Study type | Acute-state challenge or observational context |
| Target population | Adults eligible for DXA and the specific exposure under ethics/safety determination |
| Inclusion categories | Consent covering challenge/observation; contraindications cleared |
| Exclusion categories | Unsafe induction paths; EC-09 exclusions; pregnancy as determined |
| Sampling strategy | Pre-specified; not extreme-score-only |
| Enrollment RTM safeguards | No arm assignment solely from extreme scores |
| Study setting | DXA site with safety monitoring as required |
| Measurements | DXA FM/FFM/ALM ± Waist/Height; exposure logs; timing; stop-rule triggers |
| Repeat structure | Counterbalanced fed/fasted; overnight-fast candidate comparator |
| Timeline | Per subprotocol sequence + washout frozen before execution |
| Randomization / counterbalance | Sequence counterbalance/randomization where design uses crossover |
| Standardization controls | Exposure/condition; control/comparator; washout; carryover; burden; safety; stop rules; timing — each frozen per subprotocol |
| Protocol deviations | Stop-rule trigger; incomplete washout; carryover suspicion → sensitivity |
| Safety / ethics requirements | EC-09 fasting safety/contraindications |
| Primary endpoint candidates | Construct/aggregate Δ; false-improvement indicators under pre-registered definitions; score-specific mapping |
| Secondary endpoint candidates | Component-level Δ; recovery trajectory |
| Exploratory endpoints | Subgroup modifiers (sex, body size) |
| Analysis family | Paired/crossover models with carryover assessment; confirmatory vs exploratory split |
| Sample-size method | Paired/crossover precision for pre-specified Δ |
| Missing-data class | Dropout; stop-rule truncation; unusable DXA |
| Multiplicity family | Per-subprotocol confirmatory family; cross-subprotocol synthesis exploratory unless pre-registered |
| Subgroup / fairness plan | Sex; body size |
| QC / outlier framework | Safety stop → protocol deviation class; do not invent outcomes after seeing Δ |
| Governance requirements | LC-01,02,06,07,11; EC-01..04,06,07,09; consent A–E,J |
| Consent classes | A,B,C,D,E,J |
| Privacy fields | Minimize sensitive menstrual/illness detail; Zone D minimization |
| Evidence sources | ER-BC-16 MODERATE / PARTIALLY_SUFFICIENT (factor nuance) |
| Wave 1 inputs | BCV-034 acute false improvement |
| Stop / go consequences | Material unexplained acute sensitivity → HOLD presentation / score-local constraints; both scores if systemic |
| What success means | Quantified acute Δ with controls suitable for protocol/presentation policy |
| What failure means | Unsafe/unethical design or uncontrolled confounding |
| What the study cannot prove | That any Δscore equals remodeling; clinical risk claims |
| Freeze readiness | **PARTIAL** |
| Execution authorization | **NOT_AUTHORIZED** |

**Unresolved parameters (each gated):**

| Item | Status | Owner | Evidence dep | Governance dep | Freeze document | Execution blocking |
|------|--------|-------|--------------|----------------|-----------------|--------------------|
| Controlled challenge details for this subprotocol | `GOVERNANCE_DETERMINATION_REQUIRED` | Ethics + scientific + site safety | ER-BC-16 | EC-09 | TB-04C ethics/safety determination + SOP | Yes |
| Oli acute Δ magnitudes | `EMPIRICAL_ESTIMATE_REQUIRED` | Biostatistics | ER-BC-16 | — | TB-04C analysis freeze | Yes |
| Exact sequence/washout/carryover parameters | `PROTOCOL_DETAIL_TO_FREEZE` | Scientific lead | ER-BC-16 | EC-09 | TB-04C protocol SOP | Yes |

### TB-04D — Acute-state: Time of day

| Field | Value |
|-------|-------|
| ID | TB-04D |
| Title | Acute-state: Time of day |
| Priority | **P1** |
| Scientific question | Does time of day move lean/fat indices and scores without durable remodeling? |
| Why it matters | Wave 1 BCV-034 showed acute false-improvement risk. Evidence: Standardize where possible; quantify residual TOD effects. |
| Score affected | Health + Performance-Supporting |
| Construct affected | H2, H3, P1, P3 (lean/fat path) |
| Study type | Acute-state challenge or observational context |
| Target population | Adults eligible for DXA and the specific exposure under ethics/safety determination |
| Inclusion categories | Consent covering challenge/observation; contraindications cleared |
| Exclusion categories | Unsafe induction paths; EC-09 exclusions; pregnancy as determined |
| Sampling strategy | Pre-specified; not extreme-score-only |
| Enrollment RTM safeguards | No arm assignment solely from extreme scores |
| Study setting | DXA site with safety monitoring as required |
| Measurements | DXA FM/FFM/ALM ± Waist/Height; exposure logs; timing; stop-rule triggers |
| Repeat structure | Morning vs evening under matched prep; standardize where possible |
| Timeline | Per subprotocol sequence + washout frozen before execution |
| Randomization / counterbalance | Sequence counterbalance/randomization where design uses crossover |
| Standardization controls | Exposure/condition; control/comparator; washout; carryover; burden; safety; stop rules; timing — each frozen per subprotocol |
| Protocol deviations | Stop-rule trigger; incomplete washout; carryover suspicion → sensitivity |
| Safety / ethics requirements | EC-09 burden for dual visits |
| Primary endpoint candidates | Construct/aggregate Δ; false-improvement indicators under pre-registered definitions; score-specific mapping |
| Secondary endpoint candidates | Component-level Δ; recovery trajectory |
| Exploratory endpoints | Subgroup modifiers (sex, body size) |
| Analysis family | Paired/crossover models with carryover assessment; confirmatory vs exploratory split |
| Sample-size method | Paired/crossover precision for pre-specified Δ |
| Missing-data class | Dropout; stop-rule truncation; unusable DXA |
| Multiplicity family | Per-subprotocol confirmatory family; cross-subprotocol synthesis exploratory unless pre-registered |
| Subgroup / fairness plan | Sex; body size |
| QC / outlier framework | Safety stop → protocol deviation class; do not invent outcomes after seeing Δ |
| Governance requirements | LC-01,02,06,07,11; EC-01..04,06,07,09; consent A–E,J |
| Consent classes | A,B,C,D,E,J |
| Privacy fields | Minimize sensitive menstrual/illness detail; Zone D minimization |
| Evidence sources | ER-BC-16 MODERATE / PARTIALLY_SUFFICIENT (factor nuance) |
| Wave 1 inputs | BCV-034 acute false improvement |
| Stop / go consequences | Material unexplained acute sensitivity → HOLD presentation / score-local constraints; both scores if systemic |
| What success means | Quantified acute Δ with controls suitable for protocol/presentation policy |
| What failure means | Unsafe/unethical design or uncontrolled confounding |
| What the study cannot prove | That any Δscore equals remodeling; clinical risk claims |
| Freeze readiness | **PARTIAL** |
| Execution authorization | **NOT_AUTHORIZED** |

**Unresolved parameters (each gated):**

| Item | Status | Owner | Evidence dep | Governance dep | Freeze document | Execution blocking |
|------|--------|-------|--------------|----------------|-----------------|--------------------|
| Controlled challenge details for this subprotocol | `GOVERNANCE_DETERMINATION_REQUIRED` | Ethics + scientific + site safety | ER-BC-16 | EC-09 | TB-04D ethics/safety determination + SOP | Yes |
| Oli acute Δ magnitudes | `EMPIRICAL_ESTIMATE_REQUIRED` | Biostatistics | ER-BC-16 | — | TB-04D analysis freeze | Yes |
| Exact sequence/washout/carryover parameters | `PROTOCOL_DETAIL_TO_FREEZE` | Scientific lead | ER-BC-16 | EC-09 | TB-04D protocol SOP | Yes |

### TB-04E — Acute-state: Menstrual-phase context

| Field | Value |
|-------|-------|
| ID | TB-04E |
| Title | Acute-state: Menstrual-phase context |
| Priority | **P2** |
| Scientific question | Does menstrual-phase context move lean/fat indices and scores without durable remodeling? |
| Why it matters | Wave 1 BCV-034 showed acute false-improvement risk. Evidence: Evidence confidence LOW for hard exclusion; log/stratify path preferred. |
| Score affected | Health + Performance-Supporting |
| Construct affected | H2, H3, P1, P3 (lean/fat path) |
| Study type | Acute-state challenge or observational context |
| Target population | Adults eligible for DXA and the specific exposure under ethics/safety determination |
| Inclusion categories | Consent covering challenge/observation; contraindications cleared |
| Exclusion categories | Unsafe induction paths; EC-09 exclusions; pregnancy as determined |
| Sampling strategy | Pre-specified; not extreme-score-only |
| Enrollment RTM safeguards | No arm assignment solely from extreme scores |
| Study setting | DXA site with safety monitoring as required |
| Measurements | DXA FM/FFM/ALM ± Waist/Height; exposure logs; timing; stop-rule triggers |
| Repeat structure | Log/stratify under frozen menstrual-context SOP; hard exclusion not evidence-frozen (`PROTOCOL_DETAIL_TO_FREEZE` + `GOVERNANCE_DETERMINATION_REQUIRED` EC-09; owner: Scientific + ethics; freeze: TB-04E SOP; gate: blocks TB-04E execution) |
| Timeline | Per subprotocol sequence + washout frozen before execution |
| Randomization / counterbalance | Sequence counterbalance/randomization where design uses crossover |
| Standardization controls | Exposure/condition; control/comparator; washout; carryover; burden; safety; stop rules; timing — each frozen per subprotocol |
| Protocol deviations | Stop-rule trigger; incomplete washout; carryover suspicion → sensitivity |
| Safety / ethics requirements | EC-09 + sensitive-data minimization |
| Primary endpoint candidates | Construct/aggregate Δ; false-improvement indicators under pre-registered definitions; score-specific mapping |
| Secondary endpoint candidates | Component-level Δ; recovery trajectory |
| Exploratory endpoints | Subgroup modifiers (sex, body size) |
| Analysis family | Paired/crossover models with carryover assessment; confirmatory vs exploratory split |
| Sample-size method | Paired/crossover precision for pre-specified Δ |
| Missing-data class | Dropout; stop-rule truncation; unusable DXA |
| Multiplicity family | Per-subprotocol confirmatory family; cross-subprotocol synthesis exploratory unless pre-registered |
| Subgroup / fairness plan | Sex; body size |
| QC / outlier framework | Safety stop → protocol deviation class; do not invent outcomes after seeing Δ |
| Governance requirements | LC-01,02,06,07,11; EC-01..04,06,07,09; consent A–E,J |
| Consent classes | A,B,C,D,E,J |
| Privacy fields | Minimize sensitive menstrual/illness detail; Zone D minimization |
| Evidence sources | ER-BC-16 MODERATE / PARTIALLY_SUFFICIENT (factor nuance) |
| Wave 1 inputs | BCV-034 acute false improvement |
| Stop / go consequences | Material unexplained acute sensitivity → HOLD presentation / score-local constraints; both scores if systemic |
| What success means | Quantified acute Δ with controls suitable for protocol/presentation policy |
| What failure means | Unsafe/unethical design or uncontrolled confounding |
| What the study cannot prove | That any Δscore equals remodeling; clinical risk claims |
| Freeze readiness | **PARTIAL** |
| Execution authorization | **NOT_AUTHORIZED** |

**Unresolved parameters (each gated):**

| Item | Status | Owner | Evidence dep | Governance dep | Freeze document | Execution blocking |
|------|--------|-------|--------------|----------------|-----------------|--------------------|
| Controlled challenge details for this subprotocol | `GOVERNANCE_DETERMINATION_REQUIRED` | Ethics + scientific + site safety | ER-BC-16 | EC-09 | TB-04E ethics/safety determination + SOP | Yes |
| Oli acute Δ magnitudes | `EMPIRICAL_ESTIMATE_REQUIRED` | Biostatistics | ER-BC-16 | — | TB-04E analysis freeze | Yes |
| Exact sequence/washout/carryover parameters | `PROTOCOL_DETAIL_TO_FREEZE` | Scientific lead | ER-BC-16 | EC-09 | TB-04E protocol SOP | Yes |

### TB-04F — Acute-state: Illness / edema / inflammation observational context

| Field | Value |
|-------|-------|
| ID | TB-04F |
| Title | Acute-state: Illness / edema / inflammation observational context |
| Priority | **P2** |
| Scientific question | Does illness / edema / inflammation observational context move lean/fat indices and scores without durable remodeling? |
| Why it matters | Wave 1 BCV-034 showed acute false-improvement risk. Evidence: Observational-first; controlled induction prohibited absent separate approval. |
| Score affected | Health + Performance-Supporting |
| Construct affected | H2, H3, P1, P3 (lean/fat path) |
| Study type | Acute-state challenge or observational context |
| Target population | Adults eligible for DXA and the specific exposure under ethics/safety determination |
| Inclusion categories | Consent covering challenge/observation; contraindications cleared |
| Exclusion categories | Unsafe induction paths; EC-09 exclusions; pregnancy as determined |
| Sampling strategy | Pre-specified; not extreme-score-only |
| Enrollment RTM safeguards | No arm assignment solely from extreme scores |
| Study setting | DXA site with safety monitoring as required |
| Measurements | DXA FM/FFM/ALM ± Waist/Height; exposure logs; timing; stop-rule triggers |
| Repeat structure | Observational-first; intentional unsafe induction prohibited |
| Timeline | Per subprotocol sequence + washout frozen before execution |
| Randomization / counterbalance | Sequence counterbalance/randomization where design uses crossover |
| Standardization controls | Exposure/condition; control/comparator; washout; carryover; burden; safety; stop rules; timing — each frozen per subprotocol |
| Protocol deviations | Stop-rule trigger; incomplete washout; carryover suspicion → sensitivity |
| Safety / ethics requirements | EC-09 observational vs challenge distinction |
| Primary endpoint candidates | Construct/aggregate Δ; false-improvement indicators under pre-registered definitions; score-specific mapping |
| Secondary endpoint candidates | Component-level Δ; recovery trajectory |
| Exploratory endpoints | Subgroup modifiers (sex, body size) |
| Analysis family | Paired/crossover models with carryover assessment; confirmatory vs exploratory split |
| Sample-size method | Paired/crossover precision for pre-specified Δ |
| Missing-data class | Dropout; stop-rule truncation; unusable DXA |
| Multiplicity family | Per-subprotocol confirmatory family; cross-subprotocol synthesis exploratory unless pre-registered |
| Subgroup / fairness plan | Sex; body size |
| QC / outlier framework | Safety stop → protocol deviation class; do not invent outcomes after seeing Δ |
| Governance requirements | LC-01,02,06,07,11; EC-01..04,06,07,09; consent A–E,J |
| Consent classes | A,B,C,D,E,J |
| Privacy fields | Minimize sensitive menstrual/illness detail; Zone D minimization |
| Evidence sources | ER-BC-16 MODERATE / PARTIALLY_SUFFICIENT (factor nuance) |
| Wave 1 inputs | BCV-034 acute false improvement |
| Stop / go consequences | Material unexplained acute sensitivity → HOLD presentation / score-local constraints; both scores if systemic |
| What success means | Quantified acute Δ with controls suitable for protocol/presentation policy |
| What failure means | Unsafe/unethical design or uncontrolled confounding |
| What the study cannot prove | That any Δscore equals remodeling; clinical risk claims |
| Freeze readiness | **PARTIAL** |
| Execution authorization | **NOT_AUTHORIZED** |

**Unresolved parameters (each gated):**

| Item | Status | Owner | Evidence dep | Governance dep | Freeze document | Execution blocking |
|------|--------|-------|--------------|----------------|-----------------|--------------------|
| Controlled challenge details for this subprotocol | `GOVERNANCE_DETERMINATION_REQUIRED` | Ethics + scientific + site safety | ER-BC-16 | EC-09 | TB-04F ethics/safety determination + SOP | Yes |
| Oli acute Δ magnitudes | `EMPIRICAL_ESTIMATE_REQUIRED` | Biostatistics | ER-BC-16 | — | TB-04F analysis freeze | Yes |
| Exact sequence/washout/carryover parameters | `PROTOCOL_DETAIL_TO_FREEZE` | Scientific lead | ER-BC-16 | EC-09 | TB-04F protocol SOP | Yes |

### TB-05 — Within-person measurement-error covariance (Σ_ε)

| Field | Value |
|-------|-------|
| ID | TB-05 |
| Title | Within-person measurement-error covariance (Σ_ε) |
| Priority | **P0** |
| Scientific question | What is within-person measurement-error covariance Σ_ε among FM, FFM, ALM, Height, Waist, derived indices, construct scores, and aggregate scores? |
| Why it matters | Wave 1 used synthetic/exploratory ρ; biological between-person covariance must not substitute for measurement-error covariance. |
| Score affected | Health + Performance-Supporting |
| Construct affected | All constructs via joint error |
| Study type | Repeated-measure error-covariance estimation |
| Target population | Cross-sectional DXA+anthropometry with repeat subset from TB-01/02 |
| Inclusion categories | Paired repeats available under locked protocols |
| Exclusion categories | Unusable pairs |
| Sampling strategy | Repeat subset sized for covariance CI precision |
| Enrollment RTM safeguards | N/A for covariance estimation enrollment beyond general no-extreme-only rule |
| Study setting | Same sites as TB-01/02 |
| Measurements | Paired FM, FFM, ALM, Height, Waist; derived indices; offline scores |
| Repeat structure | Uses TB-01/02 repeat structure; multilevel separation of biological vs error covariance |
| Timeline | Concurrent with TB-01/02 pairs |
| Randomization / counterbalance | Inherited from source modules |
| Standardization controls | Do not substitute between-person biological covariance for Σ_ε |
| Protocol deviations | Incomplete variable pairs → available-case rules frozen |
| Safety / ethics requirements | Inherited from TB-01/02 |
| Primary endpoint candidates | Within-person error covariance/correlation matrix Σ_ε with uncertainty intervals |
| Secondary endpoint candidates | Propagated index σ after shared Height; construct/aggregate error propagation |
| Exploratory endpoints | Sex-stratified Σ_ε if powered |
| Analysis family | Repeated-measure covariance estimator family; multilevel separation; matrix validity checks (PD); bootstrap/CIs; downstream propagation |
| Sample-size method | Correlation / covariance CI precision |
| Missing-data class | Incomplete pairs; measurement missingness |
| Multiplicity family | Confirmatory Σ_ε elements pre-specified; others exploratory |
| Subgroup / fairness plan | Sex confirmatory if powered; age exploratory |
| QC / outlier framework | Matrix non-PD → regularization sensitivity pre-specified; no silent import of literature ρ |
| Governance requirements | Inherited TB-01/02 gates |
| Consent classes | A,B,C,D,E,J |
| Privacy fields | Same as source modules |
| Evidence sources | ER-BC-17 INSUFFICIENT primary / HIGH component that independent-noise inadequate; ER-BC-06 INSUFFICIENT primary / PARTIALLY_SUFFICIENT readiness for fail-closed prospective estimation |
| Wave 1 inputs | BCV-029 joint correlated error (synthetic magnitudes unresolved) |
| Stop / go consequences | Failure to support joint-error claims → remain on unresolved magnitudes; blocks confidence in joint noise models |
| What success means | Empirical σ/ρ candidates replace synthetic_fallback for later noise modeling |
| What failure means | Cannot estimate usable Σ_ε |
| What the study cannot prove | Causal tissue relationships; clinical validity |
| Freeze readiness | **PARTIAL** |
| Execution authorization | **NOT_AUTHORIZED** |

**Unresolved parameters (each gated):**

| Item | Status | Owner | Evidence dep | Governance dep | Freeze document | Execution blocking |
|------|--------|-------|--------------|----------------|-----------------|--------------------|
| Σ_ε magnitude/structure | `EMPIRICAL_ESTIMATE_REQUIRED` | Biostatistics | ER-BC-17 / ER-BC-06 | — | TB-05 analysis freeze + empirics | Yes |
| Final covariance estimator family | `PROTOCOL_DETAIL_TO_FREEZE` | Biostatistics | ER-BC-17 | — | TB-05 analysis freeze | Yes |

#### TB-05 Σ_ε protocol rules

- Primary evidence confidence for magnitudes: **INSUFFICIENT** (ER-BC-17/06).
- Methodological component confidence that biological covariance ≠ measurement-error covariance: **HIGH**.
- Protocol readiness: **PARTIALLY_SUFFICIENT** (fail-closed prospective estimation).
- **Do not** substitute between-person biological covariance.
- Draft elements: repeated-measure structure; covariance estimator family; multilevel separation; uncertainty intervals; matrix validity checks; downstream propagation.

### TB-06 — Longitudinal stability and directed change

| Field | Value |
|-------|-------|
| ID | TB-06 |
| Title | Longitudinal stability and directed change |
| Priority | **P1** |
| Scientific question | How do scores behave in stable-control, fat-loss, muscle-gain, detraining, and natural aging/follow-up pathways? |
| Why it matters | Must distinguish measurement noise, acute-state artifact, true biological change, intervention effect, and regression to the mean. |
| Score affected | Health + Performance-Supporting |
| Construct affected | H1–H3, P1, P3 |
| Study type | Longitudinal mixed-effects / trajectory |
| Target population | Repeated-measure adults with phase labels independent of score |
| Inclusion categories | Able to complete serial Waist/DXA compatible with frozen 180d/90d rules (rules unchanged) |
| Exclusion categories | Unsafe serial DXA burden as determined; withdrawal |
| Sampling strategy | Pathways pre-specified; extreme-score enrichment only under pre-specified justified design |
| Enrollment RTM safeguards | MANDATORY: no enrollment solely from extreme baseline dual-score; no arm assignment solely from extreme scores; enrichment only pre-specified/justified; repeated baseline required unless impossibility documented at freeze (`PROTOCOL_DETAIL_TO_FREEZE`; owner: Scientific lead; freeze: TB-06 SOP; gate: blocks TB-06 execution); baseline modeling; extreme-strata sensitivity; enrichment accounted in interpretation/generalizability |
| Study setting | Longitudinal site(s); heightened re-id risk (ER-BC-15) |
| Measurements | Serial Waist/DXA; phase labels independent of score; acute-state flags; retention/missingness |
| Repeat structure | Stable-control; fat-loss; muscle-gain; detraining; natural aging/follow-up; acute links to TB-04 |
| Timeline | Cadence compatible with frozen recency windows; windows not changed during execution |
| Randomization / counterbalance | Arm assignment not solely from extreme scores; pathway entry criteria frozen before outcomes |
| Standardization controls | Phase definitions independent of score; RTM controls frozen |
| Protocol deviations | Missed visits; acute confounds; protocol noncompliance |
| Safety / ethics requirements | EC-03/04 longitudinal burden; EC-05 if vulnerable groups |
| Primary endpoint candidates | Within-person signal vs noise; smoothness; lag; over/under-reaction; reversal; component attribution |
| Secondary endpoint candidates | Unscorable episode rates under frozen recency/era; retention bias |
| Exploratory endpoints | Athletic-status modifiers |
| Analysis family | Trajectory / mixed-effects; RTM controls; distinguish noise vs acute artifact vs true change vs intervention vs RTM |
| Sample-size method | Repeated-measures / mixed-model power or precision |
| Missing-data class | Dropout; missed visits; unusable DXA; MNAR sensitivity required |
| Multiplicity family | Confirmatory pathway family pre-specified |
| Subgroup / fairness plan | Age; sex; athletic status |
| QC / outlier framework | Influential-valid trajectories retained + sensitivity |
| Governance requirements | LC-01,02,06,07,08,12; EC-01..07; ER-BC-15 re-id; consent A–G,J + optionalFutureContactPermission if recontact |
| Consent classes | A,B,C,D,E,F,G,J (+ optionalFutureContactPermission if used) |
| Privacy fields | Heightened longitudinal re-id controls; small-cell on pathways |
| Evidence sources | ER-BC-13 methods; ER-BC-07 CMC insufficient |
| Wave 1 inputs | BCV-016 temporal; BCV-004 pathway |
| Stop / go consequences | Noise dominates or paradoxical trajectories unexplained → HOLD/REVISE path; no silent tuning |
| What success means | Characterized noise envelope and coherent directed responses |
| What failure means | Uninterpretable trajectories / RTM contamination |
| What the study cannot prove | CMC thresholds; aging-formula correctness; consumer readiness |
| Freeze readiness | **PARTIAL** |
| Execution authorization | **NOT_AUTHORIZED** |

**Unresolved parameters (each gated):**

| Item | Status | Owner | Evidence dep | Governance dep | Freeze document | Execution blocking |
|------|--------|-------|--------------|----------------|-----------------|--------------------|
| Pathway operational definitions | `PROTOCOL_DETAIL_TO_FREEZE` | Scientific lead | ER-BC-13 | EC-03/04 | TB-06 protocol SOP | Yes |
| CMC anchors | `EVIDENCE_DEPENDENT` | Scientific review | ER-BC-07 | — | Future CMC evidence freeze (not TB-16 detectability) | Yes for CMC claims |
| Numeric longitudinal decision thresholds | `EVIDENCE_DEPENDENT` | Scientific + biostatistics | ER-BC-13/07 | — | TB-06 analysis freeze | Yes |

### TB-07 — Same-vendor cross-machine agreement

| Field | Value |
|-------|-------|
| ID | TB-07 |
| Title | Same-vendor cross-machine agreement |
| Priority | **P1** |
| Scientific question | Do same-vendor different machines agree closely enough for one scoring function? |
| Why it matters | Correlation can be high while bias/LoA remain material for scores. |
| Score affected | Health + Performance-Supporting |
| Construct affected | All DXA-dependent |
| Study type | Agreement (Bland–Altman first) |
| Target population | Paired participants scanned on ≥2 same-vendor machines as primary design; unpaired path only if pre-specified with sensitivity analysis (`PROTOCOL_DETAIL_TO_FREEZE`; owner: Scientific lead; freeze: TB-07 SOP; gate: blocks confirmatory TB-07) |
| Inclusion categories | Able to complete paired scans within frozen max delay |
| Exclusion categories | Unsafe multi-scan burden |
| Sampling strategy | Paired primary; unpaired only under pre-specified sensitivity path (`PROTOCOL_DETAIL_TO_FREEZE`; owner: Scientific lead; freeze: TB-07 SOP; gate: blocks confirmatory claims if unpaired used without freeze) |
| Enrollment RTM safeguards | No extreme-score-only pairing |
| Study setting | Multi-machine same-vendor sites |
| Measurements | Paired FM/FFM/ALM → indices → scores; vendor/model/software/machinePseudonym; order; delay; acute state; repositioning |
| Repeat structure | Near-concurrent paired scans; randomized/counterbalanced order; fixed max delay; standard acute-state; repositioning protocol |
| Timeline | Same-day preferred; if impossible, pre-specified delay + sensitivity |
| Randomization / counterbalance | Machine order randomized/counterbalanced |
| Standardization controls | Agreement-first; correlation alone prohibited as interchangeability evidence |
| Protocol deviations | Delay exceeded; acute-state mismatch |
| Safety / ethics requirements | EC-04 |
| Primary endpoint candidates | Mean bias; LoA; proportional bias; heteroscedasticity; bridging/calibration; score Δ |
| Secondary endpoint candidates | Site clustering; ICC where meaningful |
| Exploratory endpoints | Body-size proportional bias |
| Analysis family | BA + bias primary; bridging pre-registered; sensitivity if same-day impossible |
| Sample-size method | Bias / LoA precision |
| Missing-data class | Incomplete pairs |
| Multiplicity family | Confirmatory primary vendor-machine pairs |
| Subgroup / fairness plan | Sex; body size |
| QC / outlier framework | Device QC fail per machine |
| Governance requirements | DXA governance + partner agreements if multi-site |
| Consent classes | A,B,C,D,E,G,J |
| Privacy fields | machinePseudonym only |
| Evidence sources | ER-BC-05 HIGH / PARTIALLY_SUFFICIENT |
| Wave 1 inputs | BCV-005 same-vendor slice |
| Stop / go consequences | Material unexplained drift → NO-GO for pooled same-vendor scoring claims |
| What success means | Quantified machine bias with or without acceptable bridging |
| What failure means | Unexplained drift |
| What the study cannot prove | Cross-vendor interchangeability |
| Freeze readiness | **DRAFT_READY** |
| Execution authorization | **NOT_AUTHORIZED** |

**Unresolved parameters (each gated):**

| Item | Status | Owner | Evidence dep | Governance dep | Freeze document | Execution blocking |
|------|--------|-------|--------------|----------------|-----------------|--------------------|
| Vendor-specific bridging parameters | `EMPIRICAL_ESTIMATE_REQUIRED` | Biostatistics | ER-BC-05 | — | TB-07 analysis freeze | Yes |
| Max scan-to-scan delay numeric | `PROTOCOL_DETAIL_TO_FREEZE` | Scientific lead | ER-BC-05 | EC-04 | TB-07 SOP | Yes |

### TB-08 — Cross-vendor agreement

| Field | Value |
|-------|-------|
| ID | TB-08 |
| Title | Cross-vendor agreement |
| Priority | **P2** |
| Scientific question | Can one frozen scoring function be used across vendors without material score distortion? |
| Why it matters | Vendor bias may induce material score Δ; correlation alone forbidden as sufficiency proof. |
| Score affected | Health + Performance-Supporting |
| Construct affected | All DXA-dependent |
| Study type | Cross-vendor agreement / bridging |
| Target population | Bridging sample across major vendors in scope |
| Inclusion categories | Paired/bridging DXA with full vendor provenance |
| Exclusion categories | Insufficient provenance → cannot be confirmatory |
| Sampling strategy | Paired participants as primary; same-day preferred; delay+sensitivity if same-day impossible (`PROTOCOL_DETAIL_TO_FREEZE`; owner: Scientific lead; freeze: TB-08 SOP; gate: blocks confirmatory TB-08) |
| Enrollment RTM safeguards | No extreme-score-only |
| Study setting | Multi-vendor sites; partner agreements required when partners used |
| Measurements | Paired/bridging DXA; full vendor/model/software provenance; order; delay; acute state; repositioning |
| Repeat structure | Randomized/counterbalanced vendor order; fixed max delay; standard acute-state; repositioning protocol; sensitivity if same-day impossible |
| Timeline | Same-day preferred |
| Randomization / counterbalance | Vendor order randomized/counterbalanced |
| Standardization controls | Agreement-first; non-pooling default until evidence supports pooling |
| Protocol deviations | Delay/acute mismatch → sensitivity |
| Safety / ethics requirements | EC-04 |
| Primary endpoint candidates | Bias/LoA/proportional bias/heteroscedasticity/bridging; score Δ distributions |
| Secondary endpoint candidates | Software-version sensitivity; order effects |
| Exploratory endpoints | Sex×vendor |
| Analysis family | Agreement-first; pre-register primary vendor pairs |
| Sample-size method | Precision around mean bias / LoA |
| Missing-data class | Incomplete pairs |
| Multiplicity family | Confirmatory primary vendor pairs |
| Subgroup / fairness plan | Sex; body size |
| QC / outlier framework | Provenance incomplete → non-confirmatory |
| Governance requirements | Partner agreements; LC-05/08/09 as applicable |
| Consent classes | A,B,C,D,E,G,H,J |
| Privacy fields | machinePseudonym; no PHI PDFs in Zone D |
| Evidence sources | ER-BC-05 |
| Wave 1 inputs | BCV-005 |
| Stop / go consequences | Unexplained cross-vendor drift → automatic NO-GO for multi-vendor pooled claims |
| What success means | Evidence for interchangeability OR explicit non-interchangeability with redesign question |
| What failure means | Unexplained drift / correlation-only argument |
| What the study cannot prove | Clinical validity on either vendor |
| Freeze readiness | **DRAFT_READY** |
| Execution authorization | **NOT_AUTHORIZED** |

**Unresolved parameters (each gated):**

| Item | Status | Owner | Evidence dep | Governance dep | Freeze document | Execution blocking |
|------|--------|-------|--------------|----------------|-----------------|--------------------|
| Final vendor-specific bridging parameters | `EMPIRICAL_ESTIMATE_REQUIRED` | Biostatistics | ER-BC-05 | Partner agreements | TB-08 analysis freeze | Yes |
| Primary vendor-pair list | `PROTOCOL_DETAIL_TO_FREEZE` | Scientific lead | ER-BC-05 | LC-05/08 | TB-08 protocol freeze | Yes |

### TB-09 — Independently defined known-groups validity

| Field | Value |
|-------|-------|
| ID | TB-09 |
| Title | Independently defined known-groups validity |
| Priority | **P1** |
| Scientific question | Do independently defined groups separate on dual scores as expected? |
| Why it matters | Circular group definitions (from WHtR/FMI/ALMI/FFMI/score) are prohibited. |
| Score affected | Health + Performance-Supporting |
| Construct affected | H1–H3, P1, P3 |
| Study type | Known-groups / discrimination |
| Target population | Groups defined without cutting on score inputs |
| Inclusion categories | Independent group labels available |
| Exclusion categories | Labels derived solely from WHtR/FMI/ALMI/FFMI/score |
| Sampling strategy | Pre-specified group definitions before outcome review |
| Enrollment RTM safeguards | N/A beyond general sampling honesty |
| Study setting | Clinic/research sites with independent labels |
| Measurements | Dual scores + independent group labels |
| Repeat structure | Cross-sectional; optional repeats for reliability of separation |
| Timeline | Single visit primary |
| Randomization / counterbalance | N/A |
| Standardization controls | Circularity audit mandatory |
| Protocol deviations | Label provenance failure → exclude from confirmatory |
| Safety / ethics requirements | EC-03 |
| Primary endpoint candidates | Effect sizes / AUROC with CIs; overlap |
| Secondary endpoint candidates | Construct-level separation |
| Exploratory endpoints | Alternate independent definitions |
| Analysis family | Pre-register group definitions; circularity audit |
| Sample-size method | Effect-size / AUROC precision |
| Missing-data class | Missing group labels |
| Multiplicity family | Confirmatory group contrasts pre-specified |
| Subgroup / fairness plan | Sex; age |
| QC / outlier framework | Circularity screen fail → reject design |
| Governance requirements | Standard human-data gates |
| Consent classes | A,B,C,D,E,J |
| Privacy fields | Group labels minimized; small-cell |
| Evidence sources | ER-BC-08 SUFFICIENT for construct map/no-diagnosis; group list EVIDENCE_DEPENDENT |
| Wave 1 inputs | BCV-008 pathway |
| Stop / go consequences | Poor separation or circular design reject → validity HOLD |
| What success means | Non-circular separation evidence |
| What failure means | Circular design or null separation |
| What the study cannot prove | Diagnosis; sarcopenia clinical identification |
| Freeze readiness | **PARTIAL** |
| Execution authorization | **NOT_AUTHORIZED** |

**Unresolved parameters (each gated):**

| Item | Status | Owner | Evidence dep | Governance dep | Freeze document | Execution blocking |
|------|--------|-------|--------------|----------------|-----------------|--------------------|
| Final independent group definitions | `EVIDENCE_DEPENDENT` | Scientific lead | ER-BC-08 / endpoints | — | TB-09 protocol freeze | Yes |
| Final groups pending cohort/endpoints | `PROTOCOL_DETAIL_TO_FREEZE` | Scientific lead | ER-BC-08 | — | TB-09 protocol freeze | Yes |

### TB-10 — Health external-construct association

| Field | Value |
|-------|-------|
| ID | TB-10 |
| Title | Health external-construct association |
| Priority | **P2** |
| Scientific question | Does Health Composition associate with independent cardiometabolic / function constructs? |
| Why it matters | Association map needed; prediction/diagnosis forbidden as product claim now (ER-BC-14). |
| Score affected | Health Composition |
| Construct affected | H1, H2, H3 |
| Study type | External association (not predictive product claim) |
| Target population | Adults with labs/vitals/function under lawful collection |
| Inclusion categories | Lawful lab/vital collection basis; fasting requirements once frozen |
| Exclusion categories | Per assay safety; consent refusal |
| Sampling strategy | Not extreme-score-only |
| Enrollment RTM safeguards | N/A |
| Study setting | Sites able to collect candidate externals |
| Measurements | Dual scores + candidate externals |
| Repeat structure | Cross-sectional primary; prospective → P3/BCV-025 pathway |
| Timeline | Single visit + optional follow-up under separate gate |
| Randomization / counterbalance | N/A |
| Standardization controls | Primary endpoint family; fasting; medication handling; disease-status handling; covariates; multiplicity — all required before freeze |
| Protocol deviations | Non-fasting when fasting required → exclude confirmatory / sensitivity |
| Safety / ethics requirements | Phlebotomy/ethics as applicable |
| Primary endpoint candidates | CANDIDATE (not frozen): blood pressure; HbA1c |
| Secondary endpoint candidates | CANDIDATE: fasting glucose; insulin; lipids |
| Exploratory endpoints | CANDIDATE: hs-CRP; physical function; independently defined metabolic syndrome variant |
| Analysis family | Confirmatory vs exploratory split; leakage audit; no predictive product claim |
| Sample-size method | Correlation CI-width or prespecified-effect power |
| Missing-data class | Missing external endpoint; medication confounding class |
| Multiplicity family | Confirmatory Health-external family frozen before outcome review |
| Subgroup / fairness plan | Age; sex (links TB-12B/13B) |
| QC / outlier framework | Assay QC fail; leakage of score inputs into external definitions |
| Governance requirements | Labs heighten sensitivity — LC-01..04,06,08,13; EC-01..03,07 |
| Consent classes | A,B,C,D,E,F,G,J |
| Privacy fields | Lab minimization; Zone D prohibition on unnecessary identifiers |
| Evidence sources | ER-BC-03/09 PARTIALLY_SUFFICIENT; ER-BC-14 claim controls SUFFICIENT |
| Wave 1 inputs | No Wave 1 clinical association (synthetic only) |
| Stop / go consequences | Weak/null independent support → stay Level 0; Health HOLD for external-claim path |
| What success means | Independent association map with honest uncertainty |
| What failure means | Only BC-to-BC correlations |
| What the study cannot prove | Causality; predictive product claim; clinical validation |
| Freeze readiness | **PARTIAL** |
| Execution authorization | **NOT_AUTHORIZED** |

**Unresolved parameters (each gated):**

| Item | Status | Owner | Evidence dep | Governance dep | Freeze document | Execution blocking |
|------|--------|-------|--------------|----------------|-----------------|--------------------|
| Primary endpoint family freeze | `EVIDENCE_DEPENDENT` | Scientific lead | ER-BC-03/09 | LC lab basis | TB-10 analysis freeze | Yes |
| Fasting / medication / disease-status handling | `PROTOCOL_DETAIL_TO_FREEZE` | Scientific + clinical ops | ER-BC-03 | EC-03 | TB-10 SOP | Yes |
| Sample-size inputs | `EVIDENCE_DEPENDENT` | Biostatistics | ER-BC-03 | — | TB-10 analysis freeze | Yes |

### TB-11 — Performance-Support external-construct association

| Field | Value |
|-------|-------|
| ID | TB-11 |
| Title | Performance-Support external-construct association |
| Priority | **P2** |
| Scientific question | Does Performance-Supporting associate with independent function/performance measures (not another BC variable)? |
| Why it matters | Need external meaning; sport-performance prediction claim prohibited. |
| Score affected | Performance-Supporting Composition |
| Construct affected | P1, P3 |
| Study type | External association (no sport-performance prediction claim) |
| Target population | Adults able to complete function tests safely |
| Inclusion categories | Safety clearance for function tests |
| Exclusion categories | Unsafe testing; BC-only pseudo-externals |
| Sampling strategy | Training-status diversity targets frozen in sampling plan; underpowered strata declared (`PROTOCOL_DETAIL_TO_FREEZE`; owner: Scientific lead; freeze: TB-11 sampling plan; gate: blocks confirmatory TB-11 subgroup claims) |
| Enrollment RTM safeguards | N/A |
| Study setting | Function-testing capable sites |
| Measurements | Scores + grip / sit-to-stand / SPPB candidates; training status; technique logs |
| Repeat structure | Reliability subset for externals |
| Timeline | Single visit + reliability subset |
| Randomization / counterbalance | Test order standardized/counterbalanced |
| Standardization controls | Test reliability; training status; technique standardization; age/sex confounding; bodyweight normalization; endpoint family; multiplicity; N method |
| Protocol deviations | Technique failure → repeat/exclude per QC |
| Safety / ethics requirements | Function-test safety stops |
| Primary endpoint candidates | CANDIDATE (not frozen): grip strength |
| Secondary endpoint candidates | CANDIDATE: sit-to-stand; SPPB |
| Exploratory endpoints | CANDIDATE: relative strength; gait; power; VO2max |
| Analysis family | Pre-register primary externals after ER-BC-04; sex-stratified; no sport prediction claim |
| Sample-size method | Correlation / group-contrast precision |
| Missing-data class | Missing external; incomplete tests |
| Multiplicity family | Confirmatory Performance-external family |
| Subgroup / fairness plan | Sex; athletic status; age |
| QC / outlier framework | Technique noncompliance |
| Governance requirements | Standard + EC-03 burden for function tests |
| Consent classes | A,B,C,D,E,J |
| Privacy fields | Minimal demographics |
| Evidence sources | ER-BC-04 PARTIALLY_SUFFICIENT; ER-BC-14 |
| Wave 1 inputs | Synthetic only |
| Stop / go consequences | Only BC-to-BC correlations → invalid as external proof; Performance HOLD for external-claim path |
| What success means | Independent performance-construct map |
| What failure means | No independent external support |
| What the study cannot prove | Athlete ranking; VO2/sport prediction as product claim |
| Freeze readiness | **PARTIAL** |
| Execution authorization | **NOT_AUTHORIZED** |

**Unresolved parameters (each gated):**

| Item | Status | Owner | Evidence dep | Governance dep | Freeze document | Execution blocking |
|------|--------|-------|--------------|----------------|-----------------|--------------------|
| Primary endpoint family freeze | `EVIDENCE_DEPENDENT` | Scientific lead | ER-BC-04 | EC-03 | TB-11 analysis freeze | Yes |
| Normalization / covariate policy | `PROTOCOL_DETAIL_TO_FREEZE` | Scientific lead | ER-BC-04 | — | TB-11 analysis freeze | Yes |

### TB-12A — Age distribution / reliability / scorability fairness

| Field | Value |
|-------|-------|
| ID | TB-12A |
| Title | Age distribution / reliability / scorability fairness |
| Priority | **P1** |
| Scientific question | Do score distributions, reliability, floor/ceiling, and scorability differ materially by adult age band without relying on TB-10/11? |
| Why it matters | Wave 1 structural age Δ=0 does not prove empirical fairness of reliability/scorability. |
| Score affected | Health + Performance-Supporting |
| Construct affected | All |
| Study type | Subgroup distribution/reliability/scorability |
| Target population | Adult age bands under frozen definitions |
| Inclusion categories | Age band assignable without exact DOB in Zone D |
| Exclusion categories | Missing ageBand |
| Sampling strategy | Age-band targets; declare underpowered bands |
| Enrollment RTM safeguards | N/A |
| Study setting | Pooled Tier B cohort |
| Measurements | Scores; reliability pairs; scorability reasons |
| Repeat structure | Uses TB-01/02 reliability subsets |
| Timeline | Concurrent with P0/P1 measurement modules |
| Randomization / counterbalance | N/A |
| Standardization controls | No age correction authorized through protocol drafting |
| Protocol deviations | Sparse bands → uncertainty reporting |
| Safety / ethics requirements | Inherited |
| Primary endpoint candidates | Distributional Δ; reliability by age; scorability/unscorable rates; floor/ceiling |
| Secondary endpoint candidates | Information content proxies |
| Exploratory endpoints | Finer age bands |
| Analysis family | Stratified estimates + CIs; small-cell rules |
| Sample-size method | Subgroup precision |
| Missing-data class | Missing ageBand |
| Multiplicity family | Confirmatory age reliability/scorability family |
| Subgroup / fairness plan | Core of this module |
| QC / outlier framework | Small-cell suppression |
| Governance requirements | Small-cell GF-19; LC-13 as applicable |
| Consent classes | A,B,C,D,E,J |
| Privacy fields | Prefer ageBand over DOB in Zone D |
| Evidence sources | ER-BC-10 PARTIALLY_SUFFICIENT |
| Wave 1 inputs | BCV-006 structural age fairness Δ=0 |
| Stop / go consequences | Material age reliability/scorability bias → score-local HOLD/NO-GO path; no silent age correction |
| What success means | Age fairness profile for reliability/scorability |
| What failure means | Material bias without mitigation path |
| What the study cannot prove | External-meaning fairness (TB-12B); authorization to change formula |
| Freeze readiness | **DRAFT_READY** |
| Execution authorization | **NOT_AUTHORIZED** |

**Unresolved parameters (each gated):**

| Item | Status | Owner | Evidence dep | Governance dep | Freeze document | Execution blocking |
|------|--------|-------|--------------|----------------|-----------------|--------------------|
| Age-band cut definitions | `PROTOCOL_DETAIL_TO_FREEZE` | Scientific lead | ER-BC-10 | — | TB-12A protocol freeze | Yes |
| Inequity action thresholds | `EVIDENCE_DEPENDENT` | Scientific policy | ER-BC-10 | — | Stop/go threshold freeze | Yes |

### TB-12B — Age external-meaning fairness

| Field | Value |
|-------|-------|
| ID | TB-12B |
| Title | Age external-meaning fairness |
| Priority | **P2** |
| Scientific question | Do Health and Performance-Supporting maintain comparable external meaning across adult ages? |
| Why it matters | Structural age invariance ≠ comparable external meaning. |
| Score affected | Health + Performance-Supporting |
| Construct affected | All |
| Study type | Subgroup × external association fairness |
| Target population | Requires TB-10/TB-11 externals |
| Inclusion categories | Has external endpoints from TB-10/11 |
| Exclusion categories | Missing externals for confirmatory |
| Sampling strategy | Interaction-powered where claimed |
| Enrollment RTM safeguards | N/A |
| Study setting | TB-10/11 sites |
| Measurements | Scores + externals + ageBand |
| Repeat structure | Cross-sectional |
| Timeline | After TB-10/11 endpoint freeze |
| Randomization / counterbalance | N/A |
| Standardization controls | Depends on TB-10/11; no age correction authorized here |
| Protocol deviations | Sparse cells |
| Safety / ethics requirements | Inherited |
| Primary endpoint candidates | Age × external-association interactions with CIs |
| Secondary endpoint candidates | Stratified associations |
| Exploratory endpoints | Finer bands |
| Analysis family | Interaction / stratified association |
| Sample-size method | Interaction / stratified association precision |
| Missing-data class | Missing externals |
| Multiplicity family | Confirmatory external-meaning family |
| Subgroup / fairness plan | Core |
| QC / outlier framework | Small-cell |
| Governance requirements | Same as TB-10/11 plus small-cell |
| Consent classes | Inherited TB-10/11 |
| Privacy fields | Small-cell |
| Evidence sources | ER-BC-10; depends ER-BC-03/04 |
| Wave 1 inputs | BCV-006 |
| Stop / go consequences | Material age-meaning bias → SCIENTIFIC_REVIEW_REQUIRED; public NO-GO remains |
| What success means | Evidence that external meaning is or is not comparable across age |
| What failure means | Incomparable meaning without review path |
| What the study cannot prove | Authorization to change formula in this draft |
| Freeze readiness | **PARTIAL** |
| Execution authorization | **NOT_AUTHORIZED** |

**Unresolved parameters (each gated):**

| Item | Status | Owner | Evidence dep | Governance dep | Freeze document | Execution blocking |
|------|--------|-------|--------------|----------------|-----------------|--------------------|
| Depends on TB-10/11 endpoint freeze | `EVIDENCE_DEPENDENT` | Scientific lead | ER-BC-03/04/10 | — | TB-12B analysis freeze | Yes |

### TB-13A — Sex distribution / reliability / scorability fairness

| Field | Value |
|-------|-------|
| ID | TB-13A |
| Title | Sex distribution / reliability / scorability fairness |
| Priority | **P1** |
| Scientific question | Do distribution shape, floor/ceiling, information content, reliability, sensitivity, and scorability differ unfairly by sex without requiring TB-10/11? |
| Why it matters | Sex-specific knots do not automatically prove fairness. |
| Score affected | Health + Performance-Supporting |
| Construct affected | All |
| Study type | Sex fairness (distribution/reliability/scorability) |
| Target population | Male/female strata under frozen sex field policy |
| Inclusion categories | Sex available per minimization policy |
| Exclusion categories | Missing sex for confirmatory sex analyses |
| Sampling strategy | Sex-balanced targets where claimed |
| Enrollment RTM safeguards | N/A |
| Study setting | Pooled cohort |
| Measurements | Scores; reliability; scorability |
| Repeat structure | TB-01/02 subsets |
| Timeline | Concurrent P0/P1 |
| Randomization / counterbalance | N/A |
| Standardization controls | No sex recalibration authorized through protocol drafting |
| Protocol deviations | Sparse cells |
| Safety / ethics requirements | Inherited |
| Primary endpoint candidates | Distributional metrics; reliability; scorability; floor/ceiling; sensitivity by sex |
| Secondary endpoint candidates | Information content |
| Exploratory endpoints | Athletic×sex preview (TB-14) |
| Analysis family | Stratified comparisons |
| Sample-size method | Subgroup comparison precision |
| Missing-data class | Missing sex |
| Multiplicity family | Confirmatory sex reliability/scorability family |
| Subgroup / fairness plan | Core |
| QC / outlier framework | Small-cell |
| Governance requirements | Standard |
| Consent classes | A,B,C,D,E,J |
| Privacy fields | Sex necessary for sex-specific scoring; minimize other demographics |
| Evidence sources | ER-BC-11 LOW primary / PARTIALLY_SUFFICIENT readiness |
| Wave 1 inputs | BCV-007 structural sex fairness |
| Stop / go consequences | Material sex bias on these axes → construct/score HOLD + scientific review; no silent fix |
| What success means | Sex fairness profile for reliability/scorability/distribution |
| What failure means | Material bias |
| What the study cannot prove | External-meaning fairness (TB-13B) |
| Freeze readiness | **DRAFT_READY** |
| Execution authorization | **NOT_AUTHORIZED** |

**Unresolved parameters (each gated):**

| Item | Status | Owner | Evidence dep | Governance dep | Freeze document | Execution blocking |
|------|--------|-------|--------------|----------------|-----------------|--------------------|
| Fairness action thresholds | `EVIDENCE_DEPENDENT` | Scientific policy | ER-BC-11 | — | Stop/go threshold freeze | Yes |

### TB-13B — Sex external-meaning fairness

| Field | Value |
|-------|-------|
| ID | TB-13B |
| Title | Sex external-meaning fairness |
| Priority | **P2** |
| Scientific question | Do external associations and known-group separation maintain comparable meaning across sex? |
| Why it matters | Equal knots-within-sex do not imply equal external meaning. |
| Score affected | Health + Performance-Supporting |
| Construct affected | All |
| Study type | Sex × external association fairness |
| Target population | Requires TB-10/11 (+ TB-09 if used) |
| Inclusion categories | Externals present |
| Exclusion categories | Missing externals |
| Sampling strategy | Sex-stratified association precision |
| Enrollment RTM safeguards | N/A |
| Study setting | TB-10/11 |
| Measurements | Scores + externals + sex |
| Repeat structure | Cross-sectional |
| Timeline | After TB-10/11 |
| Randomization / counterbalance | N/A |
| Standardization controls | No sex recalibration here |
| Protocol deviations | Sparse |
| Safety / ethics requirements | Inherited |
| Primary endpoint candidates | Sex-stratified external associations; separation metrics with CIs |
| Secondary endpoint candidates | Known-groups by sex |
| Exploratory endpoints | Athletic×sex external meaning |
| Analysis family | Subgroup / interaction |
| Sample-size method | Subgroup / interaction precision |
| Missing-data class | Missing externals/sex |
| Multiplicity family | Confirmatory |
| Subgroup / fairness plan | Core |
| QC / outlier framework | Small-cell |
| Governance requirements | TB-10/11 |
| Consent classes | Inherited |
| Privacy fields | Small-cell |
| Evidence sources | ER-BC-11; ER-BC-03/04 |
| Wave 1 inputs | BCV-007 |
| Stop / go consequences | Material sex external-meaning bias → SCIENTIFIC_REVIEW_REQUIRED; no silent fix |
| What success means | Documented external-meaning fairness profile |
| What failure means | Incomparable meaning |
| What the study cannot prove | Automatic fairness from knot tables alone |
| Freeze readiness | **PARTIAL** |
| Execution authorization | **NOT_AUTHORIZED** |

**Unresolved parameters (each gated):**

| Item | Status | Owner | Evidence dep | Governance dep | Freeze document | Execution blocking |
|------|--------|-------|--------------|----------------|-----------------|--------------------|
| Depends on TB-10/11 (+TB-09) freezes | `EVIDENCE_DEPENDENT` | Scientific lead | ER-BC-03/04/11 | — | TB-13B analysis freeze | Yes |

### TB-14 — Intersectional fairness

| Field | Value |
|-------|-------|
| ID | TB-14 |
| Title | Intersectional fairness |
| Priority | **P2** |
| Scientific question | Do material biases appear at intersections that single-factor analyses miss? |
| Why it matters | Sparse cells and Simpson-type effects are real risks; Wave 1 structural hidden-path PASS is not empirical proof. |
| Score affected | Health + Performance-Supporting |
| Construct affected | All |
| Study type | Intersectional subgroup fairness |
| Target population | Multi-factor stratified sample |
| Inclusion categories | Core intersections assignable |
| Exclusion categories | Ethnicity/race analyses only after governance/legal determination + scientific justification |
| Sampling strategy | Pre-specify priority intersections; declare underpowered cells |
| Enrollment RTM safeguards | N/A |
| Study setting | Pooled |
| Measurements | Scores + factors + externals as available |
| Repeat structure | Cross-sectional; reliability optional |
| Timeline | After TB-12/13 cores; ethnicity track gated |
| Randomization / counterbalance | N/A |
| Standardization controls | Priority intersections: age×sex; height/body size×sex; athletic status×sex; menopause×age; vendor×site; vendor×site×sex. Ethnicity/race: GOVERNANCE_DETERMINATION_REQUIRED; no automatic correction factor. |
| Protocol deviations | Sparse-cell handling mandatory |
| Safety / ethics requirements | Inherited |
| Primary endpoint candidates | Pre-registered intersection contrasts with cell counts and CIs |
| Secondary endpoint candidates | Vendor×demography; athletic×sex |
| Exploratory endpoints | Additional intersections labeled exploratory |
| Analysis family | Stratified + interaction; small-cell + complementary suppression |
| Sample-size method | Interaction precision; declare underpowered cells |
| Missing-data class | Missing factor fields |
| Multiplicity family | Confirmatory intersection list frozen before outcomes |
| Subgroup / fairness plan | Core |
| QC / outlier framework | Small-cell numeric threshold NOT FROZEN → BLOCKED for reporting until GF-19 |
| Governance requirements | LC-01,04,06,08; EC-01,05; ER-BC-12; GF-19 |
| Consent classes | A,B,C,D,E,G,J |
| Privacy fields | Re-id + small-cell critical |
| Evidence sources | ER-BC-12 LOW / PARTIALLY_SUFFICIENT |
| Wave 1 inputs | BCV-031 structural |
| Stop / go consequences | Material intersectional bias → NO-GO for broad claims |
| What success means | Honest intersectional map including insufficiency flags |
| What failure means | Hidden sparse-cell overclaims |
| What the study cannot prove | That unused factors are harmless globally; automatic ethnicity correction |
| Freeze readiness | **PARTIAL** |
| Execution authorization | **NOT_AUTHORIZED** |

**Unresolved parameters (each gated):**

| Item | Status | Owner | Evidence dep | Governance dep | Freeze document | Execution blocking |
|------|--------|-------|--------------|----------------|-----------------|--------------------|
| Ethnicity/race confirmatory use | `GOVERNANCE_DETERMINATION_REQUIRED` | Counsel + scientific | ER-BC-12 | LC-01/04 + ethics | TB-14 ethnicity determination | Yes if ethnicity used |
| Small-cell numeric threshold | `GOVERNANCE_DETERMINATION_REQUIRED` | Privacy + counsel | ER-BC-15/12 | GF-19 | Small-cell policy freeze | Yes |
| Priority intersection final list | `PROTOCOL_DETAIL_TO_FREEZE` | Scientific lead | ER-BC-12 | — | TB-14 analysis freeze | Yes |

### TB-15 — Scorability / access / selection bias

| Field | Value |
|-------|-------|
| ID | TB-15 |
| Title | Scorability / access / selection bias |
| Priority | **P1** |
| Scientific question | Who can receive a score, who cannot, and how do access/selection distort validation inference? |
| Why it matters | Access bias must stay separate from biological validity. |
| Score affected | Health + Performance-Supporting |
| Construct affected | All (claim-scope) |
| Study type | Access / selection / scorability audit |
| Target population | Screening/log + enrolled + retained subsets |
| Inclusion categories | Approach/screening log lawful basis |
| Exclusion categories | Contact data must not enter Zone D |
| Sampling strategy | Funnel: approach → consent → measure → score → follow-up |
| Enrollment RTM safeguards | N/A |
| Study setting | All Tier B sites |
| Measurements | Eligibility; unavailable reasons; temporal-window failures; DXA access; socioeconomic/access selection proxies where lawful; geography/site; health-conscious bias proxies; dropout; repeated-scan retention |
| Repeat structure | Funnel longitudinal retention |
| Timeline | Entire study lifecycle |
| Randomization / counterbalance | N/A |
| Standardization controls | Keep access bias separate from biological validity |
| Protocol deviations | Incomplete funnel logs → declare limitation |
| Safety / ethics requirements | Minimal; contact data Zone A only |
| Primary endpoint candidates | Scorable fractions; reason tallies; differential access; retention |
| Secondary endpoint candidates | Enrolled vs target population proxies |
| Exploratory endpoints | Socioeconomic gradients where lawful |
| Analysis family | Selection models / stratified tables; link to frozen withhold reasons |
| Sample-size method | Rate/prevalence precision |
| Missing-data class | Missing funnel stages |
| Multiplicity family | Primary scorability rates confirmatory; gradients secondary/exploratory per freeze |
| Subgroup / fairness plan | Age; sex; site; socioeconomic proxies where lawful |
| QC / outlier framework | No contact data in analysis store |
| Governance requirements | LC-01,02,04,06,12,13; EC-01,03,07; ER-BC-15 |
| Consent classes | A,B,C,D,E,J (+ optionalFutureContactPermission if recontact) |
| Privacy fields | Contact data Zone A only; analysis store studySubjectId only |
| Evidence sources | ER-BC-15 PARTIALLY_SUFFICIENT (scientific checklist); legal sign-off pending |
| Wave 1 inputs | BCV-015/027 context; P1 policy_not_frozen frequency may be quantified only |
| Stop / go consequences | High unscorable / severe selection → NO-GO for broad claims |
| What success means | Quantified access/selection profile bounding claim scope |
| What failure means | Unmeasured selection with overclaim risk |
| What the study cannot prove | Population representativeness without designed sampling |
| Freeze readiness | **DRAFT_READY** |
| Execution authorization | **NOT_AUTHORIZED** |

**Unresolved parameters (each gated):**

| Item | Status | Owner | Evidence dep | Governance dep | Freeze document | Execution blocking |
|------|--------|-------|--------------|----------------|-----------------|--------------------|
| Lawful screening-log basis | `GOVERNANCE_DETERMINATION_REQUIRED` | Counsel | — | LC-01/02/04 | Counsel determination | Yes |
| Access-bias magnitude numerics | `EMPIRICAL_ESTIMATE_REQUIRED` | Biostatistics | — | — | TB-15 analysis freeze | Yes |

### TB-16 — SDC / MDC and change detectability

| Field | Value |
|-------|-------|
| ID | TB-16 |
| Title | SDC / MDC and change detectability |
| Priority | **P1** |
| Scientific question | What score changes are distinguishable from measurement error? |
| Why it matters | Preserve triad: A SDC/MDC vs B clinically meaningful change (unresolved) vs C user-perceived meaningful change (unresolved). |
| Score affected | Health + Performance-Supporting |
| Construct affected | All |
| Study type | Change detectability (triad A) |
| Target population | Retest samples from TB-01/02/06 stable pairs |
| Inclusion categories | Stable short-interval pairs |
| Exclusion categories | Directed-change pairs for SDC estimation primary |
| Sampling strategy | Stable pairs; contrast with TB-06 directed arms separately labeled |
| Enrollment RTM safeguards | Stable-pair selection must not cherry-pick extremes post hoc |
| Study setting | Inherited |
| Measurements | Paired scores under stability assumption |
| Repeat structure | Stable short-interval pairs |
| Timeline | After TB-01/02 precision |
| Randomization / counterbalance | N/A |
| Standardization controls | ER-BC-13 method framework freeze; ER-BC-07 CMC insufficient — do not conflate |
| Protocol deviations | Nonstable pairs → exclude from SDC primary |
| Safety / ethics requirements | Inherited |
| Primary endpoint candidates | SEM_diff; SDC95; MDC95 (alias rules as Wave 1 methodology) |
| Secondary endpoint candidates | Construct-level SDC; heteroscedastic SDC explorations |
| Exploratory endpoints | Presentation thresholds candidate inputs to SP-02 (not formula change) |
| Analysis family | Triad separation mandatory |
| Sample-size method | SEM/SDC precision |
| Missing-data class | Incomplete pairs |
| Multiplicity family | Confirmatory detectability family |
| Subgroup / fairness plan | Sex; body size exploratory |
| QC / outlier framework | Influential-valid retain + sensitivity |
| Governance requirements | Inherited |
| Consent classes | Inherited |
| Privacy fields | Inherited |
| Evidence sources | ER-BC-13 HIGH / SUFFICIENT for methods; ER-BC-07 INSUFFICIENT for CMC |
| Wave 1 inputs | BCV-032A methodology; BCV-032B not executed |
| Stop / go consequences | Noise dominates meaningful presentation → HOLD display/delta claims (R19 path) |
| What success means | Empirical SDC/MDC candidates with CIs |
| What failure means | Cannot separate detectability from noise |
| What the study cannot prove | CMC; user-perceived meaningful change |
| Freeze readiness | **DRAFT_READY** |
| Execution authorization | **NOT_AUTHORIZED** |

**Unresolved parameters (each gated):**

| Item | Status | Owner | Evidence dep | Governance dep | Freeze document | Execution blocking |
|------|--------|-------|--------------|----------------|-----------------|--------------------|
| Numeric SDC/MDC | `EMPIRICAL_ESTIMATE_REQUIRED` | Biostatistics | ER-BC-13 | — | TB-16 analysis freeze | Yes |
| Clinically meaningful change | `EVIDENCE_DEPENDENT` | Scientific review | ER-BC-07 | — | Future CMC evidence package | Yes for CMC claims |
| User-perceived meaningful change | `EVIDENCE_DEPENDENT` | Scientific + comprehension | ER-BC-07/18 | EC-08 | Future user-change evidence | Yes for user-change claims |

### TB-17 — Comprehension / numeracy

| Field | Value |
|-------|-------|
| ID | TB-17 |
| Title | Comprehension / numeracy |
| Priority | **P1** |
| Scientific question | Do people systematically misread dual scores even with careful non-product materials? |
| Why it matters | Misconceptions block any future display path; consumer UI not authorized. |
| Score affected | Health + Performance-Supporting (display path) |
| Construct affected | Presentation / claim comprehension |
| Study type | Comprehension / misconception battery |
| Target population | Consenting adults with varied numeracy |
| Inclusion categories | Consent for comprehension study; literacy accommodations as ethics require |
| Exclusion categories | Consumer UI testing (not authorized) |
| Sampling strategy | Numeracy strata targets frozen in sampling plan; underpowered strata declared (`PROTOCOL_DETAIL_TO_FREEZE`; owner: Scientific lead; freeze: TB-17 sampling plan; gate: blocks confirmatory numeracy contrasts) |
| Enrollment RTM safeguards | N/A |
| Study setting | Controlled materials only — neutral written descriptions / controlled mockups |
| Measurements | Misconception probes; comprehension accuracy; trust calibration |
| Repeat structure | Single session battery |
| Timeline | Can proceed with mockups; no consumer UI |
| Randomization / counterbalance | Item order controls |
| Standardization controls | Misconceptions: 90=90% healthy; 70=30% disease risk; low score=disease; high aggregate=all components favorable; Health Composition=clinical health; Performance-Support predicts athletic performance; unavailable=bad score |
| Protocol deviations | Material deviation → exclude/sensitivity |
| Safety / ethics requirements | EC-08 materials risk |
| Primary endpoint candidates | Misconception rates; comprehension accuracy |
| Secondary endpoint candidates | Trust calibration; adverse-hide explainability link |
| Exploratory endpoints | Numeracy interactions |
| Analysis family | Proportion / contrast precision; pre-registered probe battery |
| Sample-size method | Proportion / contrast precision |
| Missing-data class | Incomplete surveys |
| Multiplicity family | Confirmatory misconception family |
| Subgroup / fairness plan | Numeracy; age exploratory |
| QC / outlier framework | No product persistence of scores |
| Governance requirements | LC-06; EC-01,02,08; no consumer UI |
| Consent classes | A,B,C,D,E,J |
| Privacy fields | Minimal demographics |
| Evidence sources | ER-BC-18 PARTIALLY_SUFFICIENT for probe classes |
| Wave 1 inputs | BCV-018 adverse-hide; BCV-010/033 pathway |
| Stop / go consequences | Material misunderstanding → NO-GO for any display / consumer path |
| What success means | Known misconception profile and required explanation controls |
| What failure means | High misconception without mitigation |
| What the study cannot prove | That final UI copy is sufficient; UI is not built/authorized here |
| Freeze readiness | **DRAFT_READY** |
| Execution authorization | **NOT_AUTHORIZED** |

**Unresolved parameters (each gated):**

| Item | Status | Owner | Evidence dep | Governance dep | Freeze document | Execution blocking |
|------|--------|-------|--------------|----------------|-----------------|--------------------|
| Rate acceptability thresholds | `EVIDENCE_DEPENDENT` | Scientific + SP-02 | ER-BC-18 | EC-08 | TB-17 analysis freeze / SP-02 | Yes for display path |
| Final controlled mockup pack | `PROTOCOL_DETAIL_TO_FREEZE` | Scientific communications | ER-BC-18 | EC-08 | TB-17 materials freeze | Yes |

### TB-18 — Missingness / temporal-coherence audit

| Field | Value |
|-------|-------|
| ID | TB-18 |
| Title | Missingness / temporal-coherence audit |
| Priority | **P0 protocol / P1 empirical** |
| Scientific question | How do real cadences and missingness interact with frozen 180-day max age, 90-day max construct gap, same-era, and Resolver rules? |
| Why it matters | Sparse real-world cadence may produce material unscorable rates; windows must not change during execution. |
| Score affected | Health + Performance-Supporting |
| Construct affected | All (eligibility) |
| Study type | Observational temporal/missingness audit |
| Target population | Observational repeat schedules; naturalistic + designed sparse/dense |
| Inclusion categories | Timestamped Waist/DXA streams under consent |
| Exclusion categories | Rule changes during execution (forbidden) |
| Sampling strategy | Naturalistic + designed schedules |
| Enrollment RTM safeguards | N/A |
| Study setting | All sites |
| Measurements | Timestamps; Resolver statuses; withhold reasons; scorability; missingness classes; timing failures; retention; selection effects |
| Repeat structure | Naturalistic + designed sparse/dense schedules |
| Timeline | Study lifecycle |
| Randomization / counterbalance | Schedule arm if designed sparse/dense used — frozen before outcomes |
| Standardization controls | May evaluate frozen windows; must not change them during execution; any revision follows scientific change control |
| Protocol deviations | Clock/timestamp faults |
| Safety / ethics requirements | Inherited |
| Primary endpoint candidates | Unscorable rates; reason tallies; era-mismatch rates; temporal eligibility map |
| Secondary endpoint candidates | Link to TB-15 selection |
| Exploratory endpoints | Site cadence patterns |
| Analysis family | Descriptive + pre-specified scenario audits vs Wave 1 BCV-015/016 structural results |
| Sample-size method | Rate/prevalence precision |
| Missing-data class | This study classifies missingness — methods frozen for each class |
| Multiplicity family | Primary rate family confirmatory |
| Subgroup / fairness plan | Site; access pathway |
| QC / outlier framework | No silent window repair |
| Governance requirements | Standard + ER-BC-15 |
| Consent classes | A,B,C,D,E,J |
| Privacy fields | Timestamp minimization where possible |
| Evidence sources | Recency policy frozen (math/resolver); empirical rates EMPIRICAL_ESTIMATE_REQUIRED |
| Wave 1 inputs | BCV-015 missingness+Resolver; BCV-016 temporal; P1 policy_not_frozen frequency quantification only |
| Stop / go consequences | Extreme unscorable rates for intended use → claim-scope limit or FSR on windows (not silent rule change) |
| What success means | Empirical scorability/temporal profile under frozen rules |
| What failure means | Unusable temporal profile for intended claims |
| What the study cannot prove | That changing windows is authorized by this study alone |
| Freeze readiness | **DRAFT_READY** |
| Execution authorization | **NOT_AUTHORIZED** |

**Unresolved parameters (each gated):**

| Item | Status | Owner | Evidence dep | Governance dep | Freeze document | Execution blocking |
|------|--------|-------|--------------|----------------|-----------------|--------------------|
| Empirical unscorable / era-mismatch rates | `EMPIRICAL_ESTIMATE_REQUIRED` | Biostatistics | — | — | TB-18 analysis freeze | Yes |
| Designed sparse/dense schedule parameters | `PROTOCOL_DETAIL_TO_FREEZE` | Scientific lead | — | — | TB-18 SOP | Yes |

## 7. Policy tracks (not empirical scoring studies)

### SP-01 — P1 Resolver Policy Review

| Field | Value |
|-------|-------|
| Type | **SCIENTIFIC_POLICY_REVIEW_REQUIRED** |
| Wave 1 input | P1 can naturally produce `policy_not_frozen` when FFMI + FFM coexist |
| Tier B may | Quantify frequency of `policy_not_frozen` via TB-15 / TB-18 |
| Tier B may not | Choose FFMI versus FFM precedence; change Resolver |
| Output status | `SCIENTIFIC_POLICY_REVIEW_REQUIRED` |
| Execution authorization | **NOT_AUTHORIZED** |

### SP-02 — Sensitivity / Presentation Policy Review

| Field | Value |
|-------|-------|
| Type | **SCIENTIFIC_POLICY_REVIEW_REQUIRED** |
| Addresses | H1 steep raw slope; H3_FFMI high normalized sensitivity; rounding; uncertainty communication; contribution display; small-change interpretation; possible suppression/warning policy |
| Score math in this draft | **Unchanged** |
| Consumer presentation | **Not authorized** |
| Empirical inputs | TB-01/02/05/16/17 may inform; do not silently retune formulas |
| Execution authorization | **NOT_AUTHORIZED** |

---

## 8. Governance integration

### 8.1 Consent classes A–J + optional future contact

| Class | Name | Draft mapping | Status |
|-------|------|---------------|--------|
| A | MEASUREMENT_AND_DATA_COLLECTION_CONSENT | All measurement modules | `GOVERNANCE_DETERMINATION_REQUIRED` |
| B | VALIDATION_AND_RESEARCH_USE_CONSENT | All human-data modules | `GOVERNANCE_DETERMINATION_REQUIRED` |
| C | PRIVACY_NOTICE_ACKNOWLEDGMENT | All | `GOVERNANCE_DETERMINATION_REQUIRED` |
| D | WITHDRAWAL_FROM_FUTURE_PARTICIPATION | All | `GOVERNANCE_DETERMINATION_REQUIRED` |
| E | CONSENT_REVOCATION | All | `GOVERNANCE_DETERMINATION_REQUIRED` |
| F | SECONDARY_USE_PERMISSION_OR_RESTRICTION | Default forbid pending freeze | `GOVERNANCE_DETERMINATION_REQUIRED` |
| G | PUBLICATION_AND_DATA_SHARING_PERMISSION | Sharing-contemplating modules | `GOVERNANCE_DETERMINATION_REQUIRED` |
| H | EXTERNAL_DATASET_LICENSE_AND_USE_BASIS | External dataset path only | `GOVERNANCE_DETERMINATION_REQUIRED` / may be `NOT_APPLICABLE` |
| I | DATA_CORRECTION_AND_AMENDMENT_REQUEST | Rights process | `GOVERNANCE_DETERMINATION_REQUIRED` |
| J | DELETION_AND_DESTRUCTION_HANDLING | All | `GOVERNANCE_DETERMINATION_REQUIRED` |
| — | `optionalFutureContactPermission` (non-lettered) | TB-06/15 if recontact | `GOVERNANCE_DETERMINATION_REQUIRED` |

### 8.2 Counsel decision packet index (LC-01…LC-13)

| LC | Affected studies | Facts required | Decision needed | Blocking effect | Required artifact |
|----|------------------|----------------|-----------------|-----------------|-------------------|
| LC-01 | All human TB | Protocol synopsis, interaction/intervention, identifiers | HSR / product research / QI / exempt classification | Blocks execution | Written determination |
| LC-02 | All human TB | Purpose list A–J + optionalFutureContactPermission, data types | Lawful basis per purpose | Blocks execution | legalBasis freeze |
| LC-03 | DXA/lab modules if US PHI/CE | Parties, PHI touchpoints, contracts | HIPAA CE/BA/hybrid role | Blocks if US clinical/PHI path | Role memo |
| LC-04 | If US participants/ops | Residences, ops nexus, sharing | State consumer-health applicability | Blocks if US consumer/participants | Jurisdiction matrix |
| LC-05 | Partner/site modules | Services + PHI | BAA necessity | Conditional block | BAA decision |
| LC-06 | All human TB | A–J + optionalFutureContactPermission | Consent separability | Blocks execution | Consent package |
| LC-07 | All human TB | Withdrawal matrix cells | Withdrawal/revocation retention outcomes | Blocks execution | Withdrawal rule version |
| LC-08 | Any sharing/publication | Sharing categories | Sharing limits | Blocks before any share | Sharing restrictions |
| LC-09 | If cross-border | Subprocessors, regions | Transfer constraints | Conditional | Transfer addendum |
| LC-10 | All execution | Incident classes | Incident notification duties | Blocks before execution | IR notification playbook |
| LC-11 | If compensation | Amounts, populations | Compensation legality | Conditional | Compensation memo |
| LC-12 | If production linkage proposed | Proposed linkage | Production data linkage — default forbid | Blocks if proposed | Explicit forbid or controlled basis |
| LC-13 | All human TB | Role, residence, record category | Access/portability/record rights | Blocks execution | Written counsel determination |

**Do not answer the counsel question in this draft.** All LC-01…LC-13 remain **PENDING**.

### 8.3 Ethics decision packet index (EC-01…EC-09)

| EC | Affected studies | Participant burden | Safety question | Determination needed | Blocking effect | Required artifact |
|----|------------------|--------------------|-----------------|----------------------|-----------------|-------------------|
| EC-01 | All human TB | N/A classification | HSR classification | Ethics-side HSR type | Blocks execution | ethicsDeterminationType |
| EC-02 | All human TB | N/A | IRB vs exempt vs no formal IRB | IRB path | Blocks execution | irbRequired / exemption / n/a |
| EC-03 | All human TB | Visit count, time, travel | Burden acceptable? | Burden assessment | Blocks human modules | Burden assessment |
| EC-04 | TB-02/03/04/06/07/08 | Repeated scan count | DXA exposure appropriateness | DXA justification | Blocks DXA modules | DXA exposure justification |
| EC-05 | If vulnerable included | Population-specific | Vulnerable populations | Inclusion ethics | Conditional | Inclusion/exclusion ethics note |
| EC-06 | If compensation | Coercion risk | Compensation ethics | Compensation note | Conditional | Compensation ethics note |
| EC-07 | All human TB | Withdrawal clarity | Withdrawal without penalty | Consent/withdrawal SOP | Blocks execution | Consent + withdrawal SOP |
| EC-08 | TB-17 | Materials risk | Comprehension materials | Materials review | Conditional for TB-17 | Materials review |
| EC-09 | TB-04A–F | Challenge/observation burden | Acute-state ethics/safety per subprotocol | Per-subprotocol determination | Blocks TB-04 modules | Written ethics/safety determination per subprotocol |

**Do not answer the ethics question in this draft.** All EC-01…EC-09 remain **PENDING**.

### 8.4 Security-closure matrix

| Control | Status |
|---------|--------|
| architecture review | **PENDING** |
| threat model | **PENDING** |
| data-zone implementation | **PENDING** |
| encryption | **PENDING** |
| key management | **PENDING** |
| RBAC | **PENDING** |
| dual control | **PENDING** |
| audit logging | **PENDING** |
| export controls | **PENDING** |
| retention | **PENDING** |
| deletion propagation | **PENDING** |
| deletion test | **PENDING** |
| incident-response tabletop | **PENDING** |
| access review | **PENDING** |
| partner security | **PENDING** |
| no-PHI-in-Git verification | **PENDING** |

No security row is marked RESOLVED: the accepted governance register does not record completed security-gate PASS determinations.

### 8.5 Data zones, retention, deletion, re-id, small-cell

| Topic | Draft integration | Status |
|-------|-------------------|--------|
| Zones A–E | Preserved from governance protocol | Structure `RESOLVED_FOR_PROTOCOL_DRAFT`; bindings `GOVERNANCE_DETERMINATION_REQUIRED` |
| Minimum necessary fields | Preserved field categories | Freeze `GOVERNANCE_DETERMINATION_REQUIRED` |
| Retention | Per-zone framework | Durations `GOVERNANCE_DETERMINATION_REQUIRED` |
| Deletion path | Destruction SOP framework | Outcomes `GOVERNANCE_DETERMINATION_REQUIRED` |
| Re-identification | ER-BC-15 scientific checklist | Sign-off `GOVERNANCE_DETERMINATION_REQUIRED` |
| Small-cell | Design + complementary suppression | Threshold N `GOVERNANCE_DETERMINATION_REQUIRED` |
| Partner agreements | Checklist only; no outreach | `GOVERNANCE_DETERMINATION_REQUIRED` / `NOT_APPLICABLE` when none |

**Therefore every human-data module remains execution-blocked.**

---

## 9. Analysis-freeze template (mandatory before any module execution)

No study may begin without the applicable template frozen and independently approved:

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
| multiplicity method | Yes |
| missing-data method | Yes |
| QC/outlier rules | Yes |
| sensitivity analyses | Yes |
| sample-size calculation | Yes |
| stopping rules | Yes |
| decision thresholds | Yes |
| analysis-code SHA/version | Yes |

---

## 10. Sample-size method matrix

| Study family | Required planning method | Final N status |
|--------------|--------------------------|----------------|
| Reliability | ICC / SEM / SDC precision | `EVIDENCE_DEPENDENT` / `PROTOCOL_DETAIL_TO_FREEZE` |
| Agreement | Bias / LoA precision | same |
| Correlation | CI-width or prespecified-effect power | same |
| Longitudinal | Repeated-measures / mixed-model power or precision | same |
| Fairness | Subgroup interaction precision | same |
| Comprehension | Proportion / contrast precision | same |
| Missingness/access | Rate/prevalence precision | same |

**Do not invent final Ns in this draft.**

---

## 11. Multiplicity matrix

| Classification | Role |
|----------------|------|
| Confirmatory | Pre-registered; may inform stop/go |
| Secondary | Pre-registered supportive; multiplicity within family |
| Exploratory | Labeled exploratory; must not drive release decisions |

Candidate methods (select at analysis freeze, **not** after results): hierarchical testing; FWER (Holm/Bonferroni); FDR (BH).

---

## 12. Missing-data matrix

| Class | Examples | Allowed method menu (freeze one per class before outcomes) |
|-------|----------|--------------------------------------------------------------|
| Measurement missingness | Waist/DXA absent | complete-case; available-case; MI; mixed-effects likelihood; IPW; MNAR sensitivity/bounds |
| Participant dropout | Withdraw / LTFU | Method selected from menu at analysis freeze per module (`PROTOCOL_DETAIL_TO_FREEZE`; owner: Biostatistics; freeze: analysis freeze; gate: blocks execution) |
| Protocol violation | Prep/positioning invalidating measure | same |
| Unusable DXA | QC fail / incomplete ROI | same |
| Missing external endpoint | TB-10/11 | same |
| Missing demographic/subgroup | sex/ageBand absent | same |

**Do not choose during execution.**

---

## 13. QC / outlier matrix

| Class | Pre-specified actions (choose at freeze) |
|-------|------------------------------------------|
| Impossible data | exclude / repeat / adjudicate |
| Biologically implausible | adjudicate → exclude / retain+sensitivity / repeat |
| Device QC failure | exclude / repeat |
| Positioning failure | exclude / repeat |
| Protocol deviation | exclude from confirmatory / sensitivity retain |
| Influential-but-valid | **retain** + sensitivity; **must not** auto-exclude |

---

## 14. Score-specific and construct-specific stop/go

### 14.1 Score-specific (independent)

| Score | Future states |
|-------|---------------|
| Health Composition | GO / HOLD / REVISE / NO-GO |
| Performance-Supporting Composition | GO / HOLD / REVISE / NO-GO |

One score may fail independently.

### 14.2 Construct-specific

| Construct | Future states |
|-----------|---------------|
| H1, H2, H3, P1, P3 | RETAIN / RECALIBRATE / WITHHOLD / REMOVE / SCIENTIFIC_REVIEW_REQUIRED |

No current construct decision is being made. Any future recalibration requires full scientific change control. Numeric thresholds remain `EVIDENCE_DEPENDENT`.

---

## 15. Change control (frozen)

```text
empirical finding
  ↓
scientific issue
  ↓
scientific review
  ↓
new score specification
  ↓
new mathematical truth freeze
  ↓
implementation
  ↓
independent implementation re-gate
  ↓
revalidation
```

**Prohibit:** silent tuning; post-hoc threshold changes; cohort-specific hidden calibration; execution-time model repair.

---

## 16. Protocol blocker summary (top-level)

### Scientific evidence dependency

`PB-TB06-CMC`, `PB-TB12B-DEP`, `PB-TB13B-DEP`, `PB-TB16-USER`

### Counsel determination

`PB-LC-01`, `PB-LC-02`, `PB-LC-03`, `PB-LC-04`, `PB-LC-05`, `PB-LC-06`, `PB-LC-07`, `PB-LC-08`, `PB-LC-09`, `PB-LC-10`, `PB-LC-11`, `PB-LC-12`, `PB-LC-13`, `PB-TB14-ETH`, `PB-TB15-LOG`, `PB-CONSENT-AJ`

### Ethics determination

`PB-EC-01`, `PB-EC-02`, `PB-EC-03`, `PB-EC-04`, `PB-EC-05`, `PB-EC-06`, `PB-EC-07`, `PB-EC-08`, `PB-EC-09`, `PB-TB04-EC09`

### Security control

`PB-SEC-01`, `PB-SEC-02`, `PB-SEC-03`, `PB-SEC-04`, `PB-SEC-05`, `PB-SEC-06`, `PB-SEC-07`, `PB-SEC-08`, `PB-SEC-09`, `PB-SEC-10`, `PB-SEC-11`, `PB-SEC-12`, `PB-SEC-13`, `PB-SEC-14`, `PB-SEC-15`, `PB-SEC-16`, `PB-SMALLCELL`

### Study design

`PB-TB01-CERT`, `PB-TB02-BLAD`, `PB-TB03-ALLOC`, `PB-TB06-PATH`, `PB-PROTO-FREEZE`

### Sample size

`PB-N-ALL`

### Endpoint selection

`PB-TB08-PAIRS`, `PB-TB09-GROUPS`, `PB-TB10-END`, `PB-TB11-END`

### Analysis method

`PB-MULT-ALL`, `PB-MISS-ALL`, `PB-QC-ALL`, `PB-AF-ALL`

### Stop/go threshold

`PB-TB17-THR`, `PB-STOPGO-NUM`

### Partner/site agreement

`PB-PARTNER`

### Empirical estimate required

`PB-TB01-SIGMA`, `PB-TB02-LSC`, `PB-TB05-SIGMA`, `PB-TB07-BRIDGE`, `PB-TB08-BRIDGE`, `PB-TB16-SDC`, `PB-TB18-RATE`

### Scientific policy review

`PB-SP01`, `PB-SP02`

Full rows: see Protocol Blocker Register. **No blocker may be silently omitted because its framework is now drafted.**

---

## 17. Protocol-freeze readiness rollup

| Module | Readiness | Rationale |
|--------|-----------|-----------|
| TB-01 | **DRAFT_READY** | Design framework and evidence constraints sufficient for draft inclusion; empirics/governance still block execution. |
| TB-02A | **DRAFT_READY** | Design framework and evidence constraints sufficient for draft inclusion; empirics/governance still block execution. |
| TB-02B | **DRAFT_READY** | Design framework and evidence constraints sufficient for draft inclusion; empirics/governance still block execution. |
| TB-02C | **PARTIAL** | Material endpoint, ethics, allocation, or dependency details remain open. |
| TB-03 | **PARTIAL** | Material endpoint, ethics, allocation, or dependency details remain open. |
| TB-04A | **PARTIAL** | Material endpoint, ethics, allocation, or dependency details remain open. |
| TB-04B | **PARTIAL** | Material endpoint, ethics, allocation, or dependency details remain open. |
| TB-04C | **PARTIAL** | Material endpoint, ethics, allocation, or dependency details remain open. |
| TB-04D | **PARTIAL** | Material endpoint, ethics, allocation, or dependency details remain open. |
| TB-04E | **PARTIAL** | Material endpoint, ethics, allocation, or dependency details remain open. |
| TB-04F | **PARTIAL** | Material endpoint, ethics, allocation, or dependency details remain open. |
| TB-05 | **PARTIAL** | Material endpoint, ethics, allocation, or dependency details remain open. |
| TB-06 | **PARTIAL** | Material endpoint, ethics, allocation, or dependency details remain open. |
| TB-07 | **DRAFT_READY** | Design framework and evidence constraints sufficient for draft inclusion; empirics/governance still block execution. |
| TB-08 | **DRAFT_READY** | Design framework and evidence constraints sufficient for draft inclusion; empirics/governance still block execution. |
| TB-09 | **PARTIAL** | Material endpoint, ethics, allocation, or dependency details remain open. |
| TB-10 | **PARTIAL** | Material endpoint, ethics, allocation, or dependency details remain open. |
| TB-11 | **PARTIAL** | Material endpoint, ethics, allocation, or dependency details remain open. |
| TB-12A | **DRAFT_READY** | Design framework and evidence constraints sufficient for draft inclusion; empirics/governance still block execution. |
| TB-12B | **PARTIAL** | Material endpoint, ethics, allocation, or dependency details remain open. |
| TB-13A | **DRAFT_READY** | Design framework and evidence constraints sufficient for draft inclusion; empirics/governance still block execution. |
| TB-13B | **PARTIAL** | Material endpoint, ethics, allocation, or dependency details remain open. |
| TB-14 | **PARTIAL** | Material endpoint, ethics, allocation, or dependency details remain open. |
| TB-15 | **DRAFT_READY** | Design framework and evidence constraints sufficient for draft inclusion; empirics/governance still block execution. |
| TB-16 | **DRAFT_READY** | Design framework and evidence constraints sufficient for draft inclusion; empirics/governance still block execution. |
| TB-17 | **DRAFT_READY** | Design framework and evidence constraints sufficient for draft inclusion; empirics/governance still block execution. |
| TB-18 | **DRAFT_READY** | Design framework and evidence constraints sufficient for draft inclusion; empirics/governance still block execution. |

Do **not** assign FROZEN or EXECUTION_READY in this phase.

---

## 18. Future sequence

```text
integrated draft (THIS DOCUMENT)
  ↓
actual counsel / ethics / security determinations
  ↓
study-specific protocol details / analysis freezes
  ↓
Tier B Protocol Truth Freeze
  ↓
independent Protocol Re-Gate
  ↓
only then potential execution authorization
```

---

## 19. Explicit non-authorizations

This draft does **not**: freeze the protocol; close governance; authorize Tier B execution; establish clinical validation; authorize consumer integration or public scores; change draft_v1 math, Resolver, or Confidence; answer LC/EC questions; invent numeric N or stop/go cutoffs; or permit PHI/production data use.

---

## 20. End-state

| Item | Status |
|------|--------|
| Methodology | **PASS** |
| Scientific evidence | **ACCEPTED** |
| Governance protocol | **PASS** |
| Governance closure | **NOT COMPLETE** |
| Protocol draft | **CREATED** |
| Protocol truth freeze | **NOT COMPLETE** |
| Tier B execution | **NOT AUTHORIZED** |
| Clinical validation | **NOT ESTABLISHED** |
| Consumer integration | **NOT AUTHORIZED** |
| Public Health / Performance-Supporting | **NO-GO** |

**Next action:** Open a NEW independent integration reviewer against the resulting SHA.

END OF TIER B INTEGRATED PROTOCOL DRAFT V1

