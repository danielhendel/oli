# Body Composition Dual Score — Tier B Evidence Review V1

**Document type:** Scientific evidence-review authority for Tier B protocol design (docs only)
**Date:** 2026-10-10
**Branch:** `feat/body-composition-stage3e-body-scans-v1`
**Kind:** Documentation only. **Does not** authorize Tier B execution, recruit subjects, collect data, change score formulas/weights/knots, change Resolver/Confidence, expose public scores, or deploy.

| Identity | Value |
|----------|-------|
| Methodology SHA (PASS) | `d7714df53af661e4492c67074823902197ced0e7` |
| Wave 1 validation truth-freeze SHA | `74c6529b2ec0a8a91d1c8f246144e6cda07ee4b6` |
| Historical evidence-package SHA (prior re-gate FAIL) | `754bfd5de80c21525f6ad1143f0e39eeb8448c24` |
| Authoritative ER catalog | Private Validation Plan §25 (ER-BC-01 … ER-BC-18) |
| Tier B empirical plan | `docs/10_product/specs/BODY_COMPOSITION_DUAL_SCORE_TIER_B_EMPIRICAL_VALIDATION_PLAN_V1.md` |
| Companion decision register | `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_TIER_B_EVIDENCE_DECISION_REGISTER_V1.md` |
| Evidence status | **CORRECTED / PENDING INDEPENDENT SCIENTIFIC RE-GATE V3** |
| Scientific evidence accepted | **NO — pending re-gate** |
| Governance protocol | **PASS** |
| Governance closure | **NOT COMPLETE** |
| Tier B execution | **NOT AUTHORIZED** |

> **This review informs protocol design.**
> It does **not** change draft_v1 scores, quietly recalibrate thresholds, authorize clinical claims, or authorize consumer release.
> Literature benchmarks ≠ candidate Oli thresholds ≠ final frozen Oli thresholds.

---

## 0. Status banner (non-negotiable)

| Gate | Status |
|------|--------|
| Tier B methodology | **PASS** @ `d7714df5…` |
| Prior independent scientific evidence re-gate | **FAIL** @ historical package `754bfd5d…` (4 bounded defects) |
| Independent scientific evidence re-gate V2 | **FAIL** (evidence-confidence taxonomy only; source/WHO/readiness **PASS**) |
| Evidence package | **CORRECTED / PENDING INDEPENDENT SCIENTIFIC RE-GATE V3** |
| Scientific evidence accepted | **NO — pending re-gate** |
| Evidence-review workstream | **CURRENT** (this document) |
| Governance protocol | **PASS** |
| Governance/legal/privacy planning | **CURRENT** (closure **NOT COMPLETE**) |
| Protocol freeze | **NOT COMPLETE / DRAFTING ONLY** |
| Tier B execution | **NOT AUTHORIZED** |
| Clinical validation | **NOT ESTABLISHED** |
| Consumer integration | **NOT AUTHORIZED** |
| Public Health / Performance-Supporting | **NO-GO** |
| Claim level | **Level 0 — internal experimental index** |
| PHI / real-user data in this review | **NONE** |

---

## 1. Authority stack (frozen terminology preserved)

```text
Mathematical Truth Freeze
  → Engine Implementation Truth Freeze
  → Evidence Resolver Truth Freeze
  → Assessment Confidence Truth Freeze
  → Private Validation Plan (Wave 1 + ER-BC catalog)
  → Wave 1 Validation Truth Freeze (synthetic ACCEPTED)
  → Tier B Empirical Validation Plan (methodology PASS)
  → THIS Evidence Review (protocol-input authority)
  → future Tier B Protocol Truth Freeze (not yet)
  → future explicit Tier B Execution Authorization (not yet)
```

Preserved terms (do not reinterpret): Health Composition; Performance-Supporting Composition; H1/H2/H3/P1/P3; WHO midpoint / `who_midpoint_v1`; WHtR / FMI / FFMI / ALMI; Resolver; Assessment Confidence; SDC/MDC triad (measurement detectability ≠ clinical importance ≠ user-perceived change); draft_v1; Level 0.

---

## 2. Evidence quality hierarchy

Prefer, in order:

1. Standards / consensus statements (e.g., ISCD, WHO STEPS, EWGSOP2)
2. Systematic reviews / meta-analyses
3. Strong measurement-methodology studies
4. Large observational cohorts
5. Controlled experiments
6. Manufacturer technical evidence **only when independently corroborated**

Avoid as primary quantitative authority: marketing pages, unsourced SEO summaries, anecdotes.

DOI / PMID / stable IDs recorded where available.

---

## 3. Dual taxonomies (do not conflate)

### 3.1 Evidence confidence (quality of literature conclusion)

**Not** Oli Assessment Confidence.

Every ER-BC item has exactly one **primaryEvidenceConfidence** chosen from **HIGH / MODERATE / LOW / INSUFFICIENT**. That primary field alone drives row reconstruction, summary counts, and decision-register counts. Component-level findings may have different strengths and must be labeled separately — they must not silently replace or double-count the primary label.

| Level | Criteria |
|-------|----------|
| **HIGH** | Standards/consensus + consistent primary quantitative studies; clear protocol implication; residual uncertainty mainly Oli-site specific |
| **MODERATE** | Multiple independent studies or one strong consensus + supportive primary data; magnitudes transferable as planning envelopes only |
| **LOW** | Sparse, heterogeneous, population-mismatched, or methodologically weak quantitative evidence |
| **INSUFFICIENT** | No credible quantitative basis for the scoped Oli empirical parameter; Tier B must generate evidence or defer freeze |

**Evidence confidence** answers: how strong is the evidence supporting the scoped scientific conclusion?
**Protocol readiness** answers: is enough of the question resolved to freeze a protocol method or constraint?
They are not interchangeable.

A **HIGH**-confidence conclusion can show with high certainty that an Oli-specific parameter remains unknown; therefore HIGH confidence does **not** automatically mean sufficient for protocol freeze. An **INSUFFICIENT** primary evidence conclusion may still support a fail-closed protocol decision (PARTIALLY_SUFFICIENT readiness), but not a positive empirical estimate. Confidence counts and readiness counts need not match.

### 3.2 Protocol readiness (canonical — authoritative for freeze drafting)

| Code | Meaning |
|------|---------|
| **SUFFICIENT_FOR_PROTOCOL_FREEZE** | The scoped ER question is sufficiently resolved to freeze the corresponding protocol method, control, or constraint without inventing a material scientific choice. Does **not** imply all empirical numeric values are known. |
| **PARTIALLY_SUFFICIENT** | The review supports part of the scoped protocol, but one or more material decisions still require additional evidence, an Oli empirical estimate, governance determination, or separate scientific-policy review. |
| **INSUFFICIENT** | Published evidence does not adequately resolve the scoped protocol question. |
| **SCIENTIFIC_REVIEW_REQUIRED** | Evidence exposes a model/policy conflict that protocol drafting cannot resolve without a separate governed scientific decision. |

Present-state **Yes / Partial / No** are **not** independent taxonomy values. Display shorthand is permitted only when mapped explicitly to the canonical codes above.

---

## 4. Search strategy (shared)

Databases / sources: PubMed/PMC, ISCD Official Positions, WHO STEPS Manual (field procedure; version pinned in source ledger), WHO *Waist Circumference and Waist–Hip Ratio* expert-consultation report (2011), Age & Ageing (EWGSOP2), peer-reviewed DXA methodology journals (*J Clin Densitom*, *MSSE*), meta-analyses of WHtR/FMI/ALMI associations, COSMIN/psychometric SEM–SDC methods, Bonett (2002) ICC sample-size methods.

Query families (examples): `DXA body composition precision LSC`; `waist circumference WHO midpoint reliability`; `Hologic Lunar DXA body composition Bland-Altman`; `DXA hydration glycogen exercise meal`; `EWGSOP2 ALMI`; `Bonett ICC sample size`; `WHtR cardiometabolic meta-analysis`.

Inclusion: adult human studies; measurement properties; agreement/reliability; external construct associations; standards. Exclusion: marketing; pediatric-only primary claims for adult score; manufacturer-only precision as sole authority.

---

## 5. ER-BC reviews (01–18)

Each ER uses the required fields. Quantitative values below are **literature benchmarks** for protocol planning — **not** frozen Oli stop/go thresholds.

---

### ER-BC-01 — DXA precision / repeatability

| Field | Content |
|-------|---------|
| **ID** | ER-BC-01 |
| **Question** | What are literature-supported precision / repeatability properties for DXA FM, FFM/lean, ALM and derived FMI/FFMI/ALMI under same-machine conditions? |
| **Why it matters** | Sets noise/SDC baselines for TB-02/03/16 and Wave 1 σ replacement |
| **TB studies** | TB-02A/B/C, TB-03, TB-16; secondary TB-04/06/07 |
| **Search strategy** | ISCD body-composition positions; same-day vs consecutive-day precision; ALM LSC studies |
| **Evidence hierarchy** | Consensus (ISCD) > methodology RCTs/precision studies > manufacturer |
| **Strongest sources** | ISCD Official Positions (Adult, Body Composition) — min acceptable precision **3% FM, 2% lean, 2% %fat**; in-vivo precision via 15×3 or 30×2 with repositioning; LSC = 2.77 × RMS-SD; **do not use manufacturer precision alone**. Hind et al. 2018 *J Clin Densitom* (PMID 29754949) athlete DXA best-practice review (separate from the consecutive-day PE study). **Zemski et al. 2019** *J Clin Densitom* (DOI 10.1016/j.jocd.2018.10.005; PMID 30454952; authors Adam J. Zemski, Karen Hind, Shelley E. Keating, Elizabeth M. Broad, Damian J. Marsh, Gary J. Slater): resistance-trained athletes (n=21); same-day vs consecutive-day DXA precision error — consecutive-day PE almost twice as large for FM (**1261 g vs 660 g**) and over three times as large for lean (**2083 g vs 617 g**). **Historical note:** an earlier package draft misattributed these PE values to “Buehring”; that attribution is withdrawn — no Buehring paper is retained for these quantities. **Thamnirat et al. 2021** *J Clin Densitom* (DOI 10.1016/j.jocd.2020.04.001; PMID 32446653; first author Kanungnij Thamnirat et al.): nonobese elderly men (n=36); ALM CV **0.93%**, ALM LSC **501 g**; ALMI CV 0.94%, ALMI LSC **0.19**. **Historical note:** an earlier package draft and a prior re-gate note used the surname “Thaweekul” and wrong DOI 10.1016/j.jocd.2020.01.001 (Li et al. sex-steroids QUS paper — **not** used here); both are corrected. |
| **Population** | Mixed clinic adults; resistance-trained athletes; older men — **not** Oli cohort |
| **Equipment/protocol** | Whole-body DXA; vendor/software-specific; repositioning required for LSC |
| **Quantitative findings** | Instrument CV often <2% lean / <3% FM when ISCD-compliant; day-to-day PE materially larger than same-session; regional VAT CV much worse than ALM |
| **Limitations** | BMD osteoporosis precision standards are **not** automatically transferable to soft-tissue composition without justification (ISCD separates BC precision). Population, BMI, and software alter PE. |
| **Generalizability** | Moderate for planning envelopes; LOW for Oli numeric freeze without TB-02 |
| **Contradictions** | Same-day LSC underestimates longitudinal noise vs consecutive-day designs |
| **Conclusion** | Literature supports **facility-specific** precision assessment and separated same-session / reposition / day-to-day variance. Import ISCD *methods*, not manufacturer σ. |
| **Protocol implication** | Freeze TB-02A/B/C designs to ISCD-style RMS-SD/LSC methods; require consecutive-day subset (TB-02C) before longitudinal SDC claims; soft-tissue LSC ≠ BMD LSC |
| **Unresolved** | Oli-site σ for FM/FFM/ALM/indices/scores; operator share (TB-03) |
| **primaryEvidenceConfidence** | **HIGH** |
| **Component finding** | MODERATE typical magnitude envelopes; Oli σ INSUFFICIENT until TB |
| **Protocol readiness** | **PARTIALLY_SUFFICIENT** (methods freezable; Oli σ pending TB-02/03) |

---

### ER-BC-02 — Waist WHO-midpoint repeatability

| Field | Content |
|-------|---------|
| **ID** | ER-BC-02 |
| **Question** | What is expected repeatability of WHO-midpoint waist under standardized protocol? |
| **Why it matters** | H1 / WHtR noise; TB-01; BCV-002 empirical σ |
| **TB studies** | TB-01; TB-05; Health scoring sensitivity |
| **Search strategy** | WHO expert-consultation WC–WHR report; current WHO STEPS field manual waist section; intra/inter-observer WC reliability; site-comparison studies; measurement-error reviews |
| **Evidence hierarchy** | Named WHO documents (separated) > reliability studies > site-comparison |
| **Strongest sources** | **SRC-WHO-WC-WHR-2011** (expert consultation, Geneva 8–11 Dec 2008; published 2011; ISBN 9789241501491): §2.5 specifies midpoint between lower margin of last palpable rib and top of iliac crest; end of normal expiration; stretch-resistant tape; **each measurement repeated twice**; if within **1 cm**, average; if difference **exceeds 1 cm**, repeat both. **SRC-WHO-STEPS-2017** (WHO STEPS Manual Part 3 §5, waist at pages 3-5-10…; Last Updated 26 January 2017): same **midpoint** landmark; end of normal expiration; **“Measure only once and record”** — does **not** specify the ≤1 cm duplicate/repeat rule. Chen et al. large cohort: WC ICC intra ≈0.987, inter ≈0.988 (narrowest-site variant — protocol differs from WHO midpoint). Wang et al. AJCN four-site comparison: ICC ≥0.996 all sites when expert observer. Verweij et al. systematic review (PMC10271771): absolute intra-observer error reported ~0.7–9.2 cm; inter ~1.4–15 cm across heterogeneous protocols — **training critical**. |
| **Population** | Adults; often clinic or survey; sex/BMI modify landmark difficulty |
| **Equipment/protocol** | Non-stretch / constant-tension tape; standing; respiratory phase; clothing policy |
| **Quantitative findings** | ICC often >0.98 under trained observers; absolute TE still cm-scale and protocol-dependent; **≤1 cm duplicate rule is from the 2011 expert-consultation report, not from the cited 2017 STEPS field procedure** |
| **Limitations** | Many “high ICC” studies use non-WHO landmarks; ICC can be high while absolute error still matters near H1 knots; WHO documents are not interchangeable for duplicate QC |
| **Generalizability** | Landmark standardization HIGH transferable; absolute σ must be Oli-estimated |
| **Contradictions** | NIH iliac crest vs WHO midpoint produce different means; do **not** convert unknown→WHO; expert-consultation duplicate QC ≠ current cited STEPS single-measure procedure |
| **Conclusion** | Governed WHO-midpoint landmark remains the correct standardization target (**SOURCE_PROTOCOL_DERIVED** from both cited WHO documents for landmark). Duplicate ≤1 cm QC is **SOURCE_PROTOCOL_DERIVED** from SRC-WHO-WC-WHR-2011 only. Trained measurers + protocol logging are **OLI_PRODUCT_POLICY_CANDIDATE** quality controls. Not a landmark-protocol switch. |
| **Protocol implication** | Freeze TB-01 landmark to governed WHO midpoint (`who_midpoint_v1`); certify measurers; record clothing/posture/expiration/tape tension; apply expert-consultation duplicate/repeat ≤1 cm QC as the Tier B quality-control candidate; estimate σ_waist empirically. Do **not** attribute the ≤1 cm rule to SRC-WHO-STEPS-2017. |
| **Unresolved** | Oli σ_waist by sex/size; heteroscedasticity near steep H1 regions |
| **primaryEvidenceConfidence** | **HIGH** |
| **Component finding** | MODERATE ICC transferability; LOW–INSUFFICIENT absolute Oli σ |
| **Protocol readiness** | **PARTIALLY_SUFFICIENT** (protocol elements freezable; Oli σ pending TB-01) |

---

### ER-BC-03 — FMI / ALMI health-outcome association

| Field | Content |
|-------|---------|
| **ID** | ER-BC-03 |
| **Question** | Do FMI and ALMI associate with independent health externals (BP, glycemic, lipids, inflammation, MetS, function)? |
| **Why it matters** | Non-circular construct support for Health Composition (H2/H3) before TB-10 freeze |
| **TB studies** | TB-10; TB-12B; TB-13B |
| **Search strategy** | FMI/ALMI vs cardiometabolic outcomes; DXA cohorts; meta-analyses of adiposity indices |
| **Evidence hierarchy** | Meta-analyses / large cohorts > single cross-sections |
| **Strongest sources** | WHtR meta-analyses (Ashwell/Corrêa family; hypertension meta OR≈1.68 for WHtR — PMC6283208) support central adiposity construct adjacent to H1. FMI/FFMI diabetes/prediabetes associations in NHANES-style analyses (e.g., *Lipids Health Dis* 2024, DOI 10.1186/s12944-024-02370-z) — often BIA or mixed methods. Health ABC / function literature: ALMI adjusted for adiposity improves disability prediction (PMC6001879). |
| **Population** | Middle-aged/older adults; Asian and Western cohorts; method heterogeneity |
| **Equipment/protocol** | DXA preferred for ALMI; many FMI studies use BIA — carefully down-weight |
| **Quantitative findings** | Directionally consistent: higher FMI ↔ worse metabolic risk; lower ALMI (esp. fat-adjusted) ↔ worse function/disability. Effect sizes heterogeneous. |
| **Limitations** | Confounding by age, sex, meds, fitness; cross-sectional dominance; circularity if externals include WC-derived MetS with H1 |
| **Generalizability** | Association *existence* MODERATE; Oli-endpoint ranking still open |
| **Contradictions** | Absolute ALMI vs BMI-adjusted lean indices disagree on who is “low lean” |
| **Conclusion** | Enough to justify **candidate** Health externals for TB-10; not enough to freeze primary endpoints or predictive claims. |
| **Protocol implication** | Pre-register independence from score inputs; prefer BP / HbA1c / fasting glucose / lipids / hs-CRP / MetS components **without** using WHtR/WC as the only MetS criterion when validating H1; ALMI↔function may be secondary |
| **Unresolved** | Confirmatory primary external list; longitudinal vs cross-sectional priority |
| **primaryEvidenceConfidence** | **MODERATE** |
| **Component finding** | Component LOW for endpoint freeze |

**Candidate Health externals (not frozen):**

| Construct | Independence | Feasibility | Role |
|-----------|--------------|-------------|------|
| Systolic/diastolic BP | High if not scored | High | **Candidate primary** |
| HbA1c | High | Moderate (lab) | **Candidate primary** |
| Fasting glucose / insulin | High | Moderate | Candidate secondary |
| Lipid panel | High | Moderate | Candidate secondary |
| hs-CRP | High | Moderate | Exploratory (acute confounders) |
| MetS (lab+BP; WC-independent definition) | Medium | Medium | Candidate secondary |
| Physical function (SPPB/gait) | Medium (overlap H3) | Medium | Exploratory for Health |

---

### ER-BC-04 — FFMI / performance association

| Field | Content |
|-------|---------|
| **ID** | ER-BC-04 |
| **Question** | Does FFMI (and lean indices) associate with performance constructs without circular BC↔BC validation? |
| **Why it matters** | TB-11; Performance-Supporting P1 validity |
| **TB studies** | TB-11; TB-13B; known-groups TB-09 context |
| **Search strategy** | FFMI/ALMI vs grip, STS, gait, VO2, relative strength |
| **Evidence hierarchy** | Function cohorts > athletic performance prediction papers |
| **Strongest sources** | Older-adult multimorbidity pools: %ALM associated with grip, walk, SPPB (PMC6177091). ALMI–grip/STS associations often sex-specific and attenuated after fat adjustment. STS more tied to muscle *quality*/fat than mass alone. VO2max associations with FFM exist but training-status confounded. |
| **Population** | Older adults dominant; athletes underrepresented for FFMI–sport prediction |
| **Equipment/protocol** | Grip dynamometry reliability high if standardized; STS/gait technique-dependent |
| **Quantitative findings** | Positive lean↔strength/function associations common but modest; not sport-prediction ready |
| **Limitations** | Age/sex/training; bodyweight normalization choices change rank order |
| **Generalizability** | Supportive for **construct association**, not athlete readiness claims |
| **Contradictions** | Absolute FFMI may mark larger individuals who are not more functional per kg |
| **Conclusion** | Prefer grip + chair-stand / gait as candidate performance externals; avoid circular DXA↔DXA validation; do not claim sport prediction. |
| **Protocol implication** | TB-11 candidate primary: grip strength (sex-stratified); secondary: 5×STS or SPPB; exploratory: relative strength, power, VO2 if logistics allow |
| **Unresolved** | Final primary endpoint; athletic-status strata power |
| **primaryEvidenceConfidence** | **MODERATE** |

---

### ER-BC-05 — DXA vendor comparability

| Field | Content |
|-------|---------|
| **ID** | ER-BC-05 |
| **Question** | What bias / LoA exist across same-vendor machines and GE vs Hologic (and software versions) for FM/FFM/ALM? |
| **Why it matters** | One-function scoring assumes comparable inputs; TB-07/08 |
| **TB studies** | TB-07, TB-08 |
| **Search strategy** | Bland–Altman cross-calibration; ALM bridging equations |
| **Evidence hierarchy** | Large same-day dual-scan cohorts > small bridging studies |
| **Strongest sources** | Park et al. Horizon W vs Lunar Prodigy (PMC8743584): Lunar ALM higher (men 24.8 vs 23.0 kg; women 15.8 vs 14.8 kg); sex-specific conversion equations; BMI/%fat extremes worsen bias. OsteoLaus / Horizon A vs iDXA: systematic FM/LM/ALM biases (ALM Horizon lower ≈750 g in one report). Cross-cal papers: lean mass 4–10% lower on Hologic vs Lunar in some cohorts; r high but CCC/LoA show non-interchangeability. ISCD: hardware change phantom cross-cal; >2% mean FM/%fat/lean → service. |
| **Population** | Often Korean adults or postmenopausal European women |
| **Equipment/protocol** | Same-day dual scans; software version rarely fully harmonized in lit |
| **Quantitative findings** | Correlation insufficient; **systematic bias and proportional bias** common; ALM cut-points not interchangeable across vendors |
| **Limitations** | Bridging equations not universal; software version effects under-reported |
| **Generalizability** | Direction HIGH; numeric bias LOW without Oli machines |
| **Contradictions** | Sign of FM/LM bias can reverse across device pairs/cohorts |
| **Conclusion** | Do **not** assume interchangeability. Protocol must either restrict vendor or treat cross-vendor as separate strata with BA + bridging — never correlation-only. |
| **Protocol implication** | TB-07 same-vendor first; TB-08 cross-vendor with order/delay controls; pre-declare non-pooling default; score provenance must retain vendor/software |
| **Unresolved** | Oli machine LoA; software-version matrix |
| **primaryEvidenceConfidence** | **HIGH** |
| **Component finding** | Component MODERATE for design transfer; magnitudes Oli-specific |

---

### ER-BC-06 — Index precision after height propagation

| Field | Content |
|-------|---------|
| **ID** | ER-BC-06 |
| **Question** | How does shared Height error propagate into FMI/ALMI/FFMI/WHtR joint uncertainty? |
| **Why it matters** | Wave 1 BCV-029/030 synthetic ρ; TB-05 joint model |
| **TB studies** | TB-05; TB-01/02 coupling |
| **Search strategy** | Error propagation; anthropometric index reliability; shared-denominator covariance |
| **Evidence hierarchy** | Methods + ER-01/02 empirics |
| **Strongest sources** | Analytic propagation: for index I = M/H², relative variance ≈ relative M variance + 4× relative H variance (first-order), with covariance terms if M and H errors correlate. WHtR = W/H shares Height with FMI/FFMI/ALMI → **induced positive correlation among index errors** even if raw errors independent. Literature rarely publishes empirical *measurement-error* covariance matrices for FM, FFM, ALM, Waist, Height together. |
| **Population** | N/A (methods) |
| **Equipment/protocol** | Shared Height rule already frozen in Tier B plan |
| **Quantitative findings** | Methods clear; published joint error ρ largely absent |
| **Limitations** | Biological correlations ≠ error correlations |
| **Generalizability** | Methods HIGH |
| **Contradictions** | None material |
| **Conclusion** | Protocol must estimate joint error covariance prospectively (TB-05). Do not treat indices as independent noise. Do not substitute biological between-person covariance for within-person measurement-error covariance Σ_ε. |
| **Protocol implication** | Shared Height in all recomputes; prospectively estimate Σ_ε for (FM, FFM, ALM, Waist, Height); report propagated index σ; forbid unsupported imported covariance magnitudes |
| **Unresolved** | Empirical Σ_ε magnitude/structure (scoped empirical parameter) |
| **primaryEvidenceConfidence** | **INSUFFICIENT** — published evidence does not adequately supply the Oli-relevant within-person measurement-error covariance Σ_ε |
| **Component finding** | **HIGH** confidence in the methodological conclusion that published biological covariance cannot substitute for Oli-specific measurement-error covariance, and that Tier B must estimate Σ_ε prospectively |
| **Protocol readiness** | **PARTIALLY_SUFFICIENT** — fail-closed prospective-estimation method and shared-Height constraint are freezable; numeric Σ_ε remains deferred to TB-05 |

---

### ER-BC-07 — Clinically meaningful body-composition change

| Field | Content |
|-------|---------|
| **ID** | ER-BC-07 |
| **Question** | What anchors exist for clinically meaningful BC change (distinct from SDC)? |
| **Why it matters** | Change triad B; BCV-032B pathway; must not conflate with SDC |
| **TB studies** | TB-16 (detectability only); later clinical pathway |
| **Search strategy** | MCID/CMC for FM/FFM/%fat; weight-loss outcome trials; sarcopenia intervention deltas |
| **Evidence hierarchy** | Anchor-based MCID > distribution-only |
| **Strongest sources** | Sparse true anchor-based CMC for DXA FM/FFM in general adults. Weight-loss trials show kg-scale FM losses over months; resistance training hypertrophy often 0.5–2 kg lean over 8–16 weeks — overlapping day-to-day DXA noise if uncontrolled. Athletic LSC guidance (Hind 2018) emphasizes LSC ≠ worthwhile change. |
| **Population** | Clinical obesity / older adults / athletes — poor single CMC |
| **Equipment/protocol** | Heterogeneous |
| **Quantitative findings** | No consensus CMC transferable to Oli draft_v1 scores |
| **Limitations** | Score-space CMC does not exist in literature |
| **Generalizability** | LOW |
| **Contradictions** | “Clinically meaningful” often redefined as statistical or LSC |
| **Conclusion** | **INSUFFICIENT** to freeze Oli CMC. Keep triad separate; Tier B may estimate SDC only. |
| **Protocol implication** | TB-16 outputs SDC candidates only; CMC deferred; any CMC claim = SCIENTIFIC REVIEW ISSUE |
| **Unresolved** | All Oli CMC anchors |
| **primaryEvidenceConfidence** | **INSUFFICIENT** |

---

### ER-BC-08 — Sarcopenia constructs vs H3

| Field | Content |
|-------|---------|
| **ID** | ER-BC-08 |
| **Question** | How do consensus sarcopenia lean constructs map to H3 (ALMI primary / FFMI fallback)? |
| **Why it matters** | Known-groups and lean-adequacy meaning without diagnosing sarcopenia |
| **TB studies** | TB-09; H3 interpretation |
| **Search strategy** | EWGSOP2; ISCD low lean mass notes |
| **Evidence hierarchy** | Consensus |
| **Strongest sources** | EWGSOP2 (Cruz-Jentoft et al., *Age Ageing* 2019; PMID 30312372; correction PMID 31081853): probable sarcopenia = low strength; confirmed = low muscle quantity/quality; ALM/height² cutoffs men <7.0, women <5.5 kg/m² (corrected). Strength cutoffs grip <27 kg men / <16 kg women. ISCD: clinical utility of ALMI/FMI optional measures “currently uncertain”; low lean mass definitions await confirmation. |
| **Population** | Older European reference framing |
| **Equipment/protocol** | DXA ALM definition vendor-sensitive (ER-BC-05) |
| **Quantitative findings** | Clear construct map; cutoffs **not** Oli diagnostic thresholds |
| **Limitations** | H3 is continuous score construct, not diagnosis |
| **Generalizability** | Mapping HIGH; cutoffs as Oli labels FORBIDDEN without review |
| **Contradictions** | Pre-correction EWGSOP2 women ALMI <6.0 vs corrected <5.5 |
| **Conclusion** | H3 ALMI-primary aligns with sarcopenia *quantity* domain; must not claim diagnosis. FFMI fallback is related but not identical to ALMI. |
| **Protocol implication** | TB-09 groups may use strength+ALMI strata as known-groups — label as construct separation, not diagnosis; vendor-stratify ALMI |
| **Unresolved** | Whether FFMI fallback preserves external meaning vs ALMI (empirical/SP track — **outside** the scoped construct-map freeze) |
| **primaryEvidenceConfidence** | **HIGH** |
| **Component finding** | Cutoffs as product claims INSUFFICIENT/forbidden |
| **Protocol readiness** | **SUFFICIENT_FOR_PROTOCOL_FREEZE** for the scoped construct map and no-diagnosis claim control. Remaining FFMI-fallback external-meaning question does **not** leave the scoped map partial. |

---

### ER-BC-09 — BC ↔ longer-term cardiometabolic outcomes

| Field | Content |
|-------|---------|
| **ID** | ER-BC-09 |
| **Question** | What longer-term outcome associations exist for BC indices relevant to Health score? |
| **Why it matters** | TB-10 secondary; ER-BC-14 claim control |
| **TB studies** | TB-10 |
| **Search strategy** | Prospective WHtR/FMI/ALMI vs incident diabetes/CVD |
| **Evidence hierarchy** | Prospective cohorts / meta-analyses |
| **Strongest sources** | WHtR often ≥ BMI for incident diabetes/MetS/CVD in meta-analyses. Low FFM metrics associated with T2DM/MetS/CVD/NAFLD in recent obesity-reviews synthesis (heterogeneous metrics). FMI prospective diabetes risk reported in mixed-method cohorts. |
| **Population** | Broad adult; ethnicity effects |
| **Equipment/protocol** | Anthropometry stronger evidence base than DXA FMI prospectively |
| **Quantitative findings** | Associations exist; calibration for individual prediction absent for Oli scores |
| **Limitations** | Residual confounding; medication; reverse causation |
| **Generalizability** | Population risk MODERATE; individual prediction LOW |
| **Contradictions** | Some adjusted models prefer BMI/WC over WHtR |
| **Conclusion** | Supports association studies; **forbids** predictive product claims now (ER-BC-14). |
| **Protocol implication** | TB-10 confirmatory = cross-sectional/short-term association; prospective risk = P3 / separate predictive study |
| **Unresolved** | Any future calibration study design |
| **primaryEvidenceConfidence** | **MODERATE** |
| **Component finding** | Component HIGH that prediction ≠ established |

---

### ER-BC-10 — Age-related change vs age-invariant score

| Field | Content |
|-------|---------|
| **ID** | ER-BC-10 |
| **Question** | Do equivalent WHtR/FMI/ALMI/FFMI values have comparable external meaning across adult age? |
| **Why it matters** | Score is age-invariant after adult gate; fairness TB-12 |
| **TB studies** | TB-12A/B |
| **Search strategy** | Age-specific BC distributions; age×adiposity risk; sarcopenia aging |
| **Evidence hierarchy** | Large epidemiologic + aging cohorts |
| **Strongest sources** | ALMI/FFMI decline with age on average; FMI often rises. Cardiometabolic risk of a given WHtR may vary by age. Wave 1 showed structural age invariance (Δ=0 by design) — **not** biological fairness. |
| **Population** | Adults ≥20 per Oli gate |
| **Equipment/protocol** | N/A |
| **Quantitative findings** | Biological age trends exist; no mandate that scoring must age-adjust |
| **Limitations** | Age correction would be a **formula change**, not an evidence-review decision |
| **Generalizability** | Problem statement HIGH clear |
| **Contradictions** | Clinical sarcopenia uses age-relevant norms; Oli uses absolute sex-specific knots |
| **Conclusion** | Document as fairness empirical question. Do **not** add age corrections here. If TB-12B shows material external-meaning inequity → SCIENTIFIC REVIEW ISSUE. |
| **Protocol implication** | TB-12A: distribution/reliability/scorability by age band; TB-12B after externals: test whether equal index → equal external association by age |
| **Unresolved** | Age-band cutpoints for analysis (protocol freeze); whether inequity warrants redesign |
| **primaryEvidenceConfidence** | **MODERATE** |
| **Component finding** | Age-adjust decision not authorized |

---

### ER-BC-11 — Sex-specific reference limitations

| Field | Content |
|-------|---------|
| **ID** | ER-BC-11 |
| **Question** | What are limits of sex-specific composition distributions/associations for fairness claims? |
| **Why it matters** | Sex-specific knots ≠ proven fairness; TB-13 |
| **TB studies** | TB-13A/B |
| **Search strategy** | Sex differences FMI/FFMI/ALMI; sex-stratified risk associations |
| **Evidence hierarchy** | Consensus + large cohorts |
| **Strongest sources** | Large sex differences in FMI/FFMI/ALMI distributions are well established; EWGSOP2 uses sex-specific cutoffs. External associations often sex-heterogeneous (e.g., ALMI–function stronger in men in some clinical cohorts). |
| **Population** | Binary male/female reference sex as frozen |
| **Equipment/protocol** | Vendor ALM sex bias compounds |
| **Quantitative findings** | Sex-specific scoring is scientifically conventional; fairness still empirical |
| **Limitations** | Intersex/trans populations not covered by current governed sex values |
| **Generalizability** | Distribution facts HIGH; fairness proof LOW |
| **Contradictions** | Same absolute ALMI means different function risk by sex |
| **Conclusion** | Sex-specific knots are defensible as distributional policy, **not** as fairness certification. |
| **Protocol implication** | TB-13A reliability/scorability by sex; TB-13B external-meaning equality tests; no silent knot retune |
| **Unresolved** | Material unfairness thresholds |
| **primaryEvidenceConfidence** | **LOW** |
| **Component finding** | Component HIGH that sex distributional differences exist; fairness not established |

---

### ER-BC-12 — Ethnicity omission / intersectional population bias

| Field | Content |
|-------|---------|
| **ID** | ER-BC-12 |
| **Question** | What is scientifically supportable about ethnicity/race and intersectional BC–outcome differences without unsupported universal claims? |
| **Why it matters** | TB-14; legal/ethics coupling |
| **TB studies** | TB-14 (ethnicity slice only if legal allows) |
| **Search strategy** | Ethnicity×adiposity risk; Asian WC cutoffs; DXA reference differences |
| **Evidence hierarchy** | Population epidemiology; avoid essentialist claims |
| **Strongest sources** | Different WC/WHtR risk thresholds proposed for some Asian populations; DXA reference databases often race-specific for BMD and sometimes lean. Evidence for *universal* ethnicity corrections to Oli draft_v1 is inadequate and politically/scientifically fraught. |
| **Population** | Multi-ethnic cohorts heterogeneous |
| **Equipment/protocol** | Access confounded with biology |
| **Quantitative findings** | Hypotheses exist; not frozen corrections |
| **Limitations** | Socioeconomic confounding; measurement access bias |
| **Generalizability** | Caution HIGH |
| **Contradictions** | Cutoff differences across guidelines |
| **Conclusion** | Keep ethnicity analyses optional, legally gated, exploratory unless powered. Separate access bias (TB-15) from biology. |
| **Protocol implication** | Core intersectional: age×sex, sex×body-size, sex×vendor; ethnicity only with ER-BC-12 legal/ethics PASS |
| **Unresolved** | Whether any ethnicity stratum is confirmatory |
| **primaryEvidenceConfidence** | **LOW** |
| **Component finding** | Component MODERATE that omission is a fairness risk to test |

---

### ER-BC-13 — SDC/MDC vs clinical vs user-perceived change

| Field | Content |
|-------|---------|
| **ID** | ER-BC-13 |
| **Question** | What methods correctly estimate SEM/SDC95 and how must the change triad stay separated? |
| **Why it matters** | TB-16; BCV-032A/B; SP-02 presentation |
| **TB studies** | TB-16; TB-02; TB-06 |
| **Search strategy** | COSMIN SDC; ISCD LSC; ICC-SEM vs SD-difference |
| **Evidence hierarchy** | Methods standards |
| **Strongest sources** | SEM = SD√(1−ICC) with **absolute-agreement** ICC; SDC95/MDC95 ≈ 1.96×√2×SEM ≈ 2.77×SEM. Equivalent LSC from RMS-SD × 2.77 (ISCD). Consistency ICC underestimates SEM. Same-day vs consecutive-day designs change SDC. Clinical MCID and user-perceived change are **different constructs** (ER-BC-07; ER-BC-18). |
| **Population** | Methods |
| **Equipment/protocol** | Match design to claim (instrument vs longitudinal) |
| **Quantitative findings** | Methods HIGH consensus |
| **Limitations** | ICC model misspecification common in lit |
| **Generalizability** | Methods transferable |
| **Contradictions** | Papers interchangeably label LSC as “clinically significant” |
| **Conclusion** | Freeze triad separation. Use design-matched SEM/SDC. Never equate SDC with CMC or user meaning. |
| **Protocol implication** | TB-02A → instrument SEM; TB-02C/TB-06 → longitudinal SDC; report method; SP-02 may present SDC language only after freeze |
| **Unresolved** | Numeric Oli SDC per construct/score (empirical TB-16 — **outside** method-selection freeze). Clinically meaningful change remains ER-BC-07 (**not** this ER). |
| **primaryEvidenceConfidence** | **HIGH** |
| **Component finding** | Magnitudes pending TB; CMC ≠ this ER |
| **Protocol readiness** | **SUFFICIENT_FOR_PROTOCOL_FREEZE** for **METHOD SELECTION** and triad separation only. **Not** sufficient for a clinical meaningful-change threshold (ER-BC-07) or for numeric Oli SDC values. |

---

### ER-BC-14 — Prediction / calibration methodology controls

| Field | Content |
|-------|---------|
| **ID** | ER-BC-14 |
| **Question** | What methodological controls prevent predictive-claim creep in external studies? |
| **Why it matters** | TB-10/11 claim boundary |
| **TB studies** | TB-10, TB-11 |
| **Search strategy** | TRIPOD / prognosis research; calibration vs discrimination |
| **Evidence hierarchy** | Methods guidance |
| **Strongest sources** | Prognostic modeling standards require pre-specified outcomes, discrimination **and** calibration, external validation, and explicit claim level. Association ≠ prediction. Current Oli claim level Level 0 forbids predictive consumer language. |
| **Population** | N/A |
| **Equipment/protocol** | N/A |
| **Quantitative findings** | Checklist, not numbers |
| **Limitations** | None for this ER’s purpose |
| **Generalizability** | HIGH |
| **Contradictions** | None |
| **Conclusion** | TB-10/11 must be labeled association/construct validity, not prediction. |
| **Protocol implication** | Analysis / claim-control freeze: forbid AUC-as-product-risk; no individual event prediction endpoints as confirmatory for release; Level 0 claim boundary preserved |
| **Unresolved** | Future dedicated predictive study (out of scope) |
| **primaryEvidenceConfidence** | **HIGH** |
| **Protocol readiness** | **SUFFICIENT_FOR_PROTOCOL_FREEZE** for the named **claim-control / analysis-control** checklist only. Does **not** establish predictive validity, clinical validity, consumer validity, or public release readiness. |

---

### ER-BC-15 — Re-identification + private validation governance

| Field | Content |
|-------|---------|
| **ID** | ER-BC-15 |
| **Question** | What scientific/privacy methods inform re-identification risk review for Tier B private datasets? |
| **Why it matters** | Hard blocker for execution; TB-15/18 |
| **TB studies** | All human-data modules; TB-15 |
| **Search strategy** | Statistical disclosure control; k-anonymity limitations; small-cell; DXA metadata re-id |
| **Evidence hierarchy** | Privacy engineering + governance standards |
| **Strongest sources** | De-identification ≠ anonymity. Quasi-identifiers (age band × sex × site × rare vendor × extreme BC phenotype × dates) enable re-id, especially longitudinal. Small-cell suppression and separation of identity store vs analysis store are required (Tier B plan §3–4). Formal risk review is organizational, not purely bibliographic. |
| **Population** | Any human Tier B cohort |
| **Equipment/protocol** | DXA PDF/images are high re-id risk — **out of analysis store** |
| **Quantitative findings** | No single universal re-id probability; risk is design-dependent |
| **Limitations** | Literature cannot certify Oli’s stack |
| **Generalizability** | Principles HIGH |
| **Contradictions** | “Anonymous DXA research datasets” claims often overstated |
| **Conclusion** | Evidence supports mandatory structured re-id review + small-cell policy before execution. **Governance/legal workstream owns closure**; this ER provides scientific checklist only. |
| **Protocol implication** | Checklist: identity separation; no PHI in analysis; date coarsening; rare-phenotype rules; longitudinal link risk; destruction; access audit. TB-15 measures access/selection separately from biology. |
| **Unresolved** | Oli legal determination; completed risk sign-off |
| **primaryEvidenceConfidence** | **MODERATE** |
| **Component finding** | Oli sign-off INSUFFICIENT until governance completes |

**ER-BC-15 scientific checklist (inputs to governance):**

1. Quasi-identifier inventory for analysis schema
2. Small-cell thresholds by stratum
3. Longitudinal linkage attack scenarios
4. DXA report / image exclusion verification
5. Site/machine fingerprinting risk
6. Residual risk acceptance owner
7. Destruction / withdrawal path test

---

### ER-BC-16 — Acute-state effects on DXA lean / indices

| Field | Content |
|-------|---------|
| **ID** | ER-BC-16 |
| **Question** | How do hydration, exercise, glycogen, meals, TOD, menstrual context, edema affect DXA FM/FFM/ALM? |
| **Why it matters** | TB-04A–F; artifact vs remodeling |
| **TB studies** | TB-04A–F; TB-02C controls |
| **Search strategy** | Controlled DXA acute-state experiments |
| **Evidence hierarchy** | Controlled experiments > observational |
| **Strongest sources** | Hydration/exercise: ≈2.5% BM thermal dehydration → LTM ↓ ≈1.7 kg; glycogen supercompensation → LTM ↑ ≈2.5 kg class effects (Toomey/Nana literature family; PDF study “effect of hydration status…”). Bone et al. MSSE: glycogen ± creatine alter DXA lean % (glycogen loading lean +≈2–3%). Nana et al. MSSE 2012: daily activities / non-standardized prep inflate noise; standardize morning, fasted, rested, bladder voided. Meal: small meal effects often <LSC for ALM in elderly men (Thamnirat et al. 2021, DOI 10.1016/j.jocd.2020.04.001); larger mixed meals can shift lean/trunk. Menstrual follicular DXA variability generally small vs hydration/glycogen when prep controlled — evidence thinner. Edema/illness: plausible large lean artifact; poorly quantified for healthy Tier B. |
| **Population** | Mostly young active males; limited female menstrual data |
| **Equipment/protocol** | Whole-body DXA |
| **Quantitative findings** | Lean highly hydration/glycogen sensitive (kg-scale); FM less so but not immune; standardize time-of-day |
| **Limitations** | Effect sizes population-specific; edema understudied |
| **Generalizability** | Direction HIGH; exact deltas LOW for Oli |
| **Contradictions** | “Small meal allowable” vs athletic strict fasting guidance |
| **Conclusion** | Prioritize TB-04A–D (hydration, exercise, meal, TOD). Menstrual/edema P2. Do not manufacture deltas where weak. |
| **Protocol implication** | Evidence-backed controls: overnight fast water-only; no strenuous exercise ≥24 h; consistent TOD; void bladder; log menstrual phase if collected; log edema/illness as exclusion/observational. Plausible-but-weak: creatine loading, menstrual as hard exclusion. |
| **Unresolved** | Oli-specific acute deltas for scores |
| **primaryEvidenceConfidence** | **MODERATE** |
| **Component finding** | Factor nuance: hydration/exercise/glycogen HIGH; meal/TOD MODERATE; menstrual LOW; edema INSUFFICIENT |

---

### ER-BC-17 — Correlated anthropometric / index measurement error

| Field | Content |
|-------|---------|
| **ID** | ER-BC-17 |
| **Question** | Does literature provide credible *measurement-error* covariance among FM, FFM, ALM, Waist, Height? |
| **Why it matters** | TB-05; BCV-029 empirical |
| **TB studies** | TB-05 |
| **Search strategy** | Multivariate DXA precision; error correlation; anthropometry joint reliability |
| **Evidence hierarchy** | Rare multivariate precision studies |
| **Strongest sources** | Biological correlations among FM/FFM/ALM/waist/height are abundant. **Measurement-error correlations** are rarely published as Σ_ε. DXA three-compartment soft-tissue partitioning implies FM and lean errors can be negatively coupled when total mass constrained. Height error shared across indices (ER-BC-06). |
| **Population** | N/A |
| **Equipment/protocol** | N/A |
| **Quantitative findings** | No transferable published Σ_ε for Oli joint model |
| **Limitations** | Conflating biological ρ with error ρ is a critical failure mode |
| **Generalizability** | N/A |
| **Contradictions** | Independent-noise synthetic Wave 1 was explicit fallback |
| **Conclusion** | **INSUFFICIENT.** Tier B **must** estimate error covariance prospectively (TB-05). |
| **Protocol implication** | Design TB-05 for multivariate repeats; report biological vs error ρ separately |
| **Unresolved** | All empirical error ρ |
| **primaryEvidenceConfidence** | **INSUFFICIENT** |
| **Component finding** | Component HIGH that independent-noise is inadequate as final model |

---

### ER-BC-18 — Score / numeracy misinterpretation

| Field | Content |
|-------|---------|
| **ID** | ER-BC-18 |
| **Question** | What misconceptions arise when presenting BC indices, uncertainty, and small changes? |
| **Why it matters** | TB-17; SP-02 |
| **TB studies** | TB-17; SP-02 support only |
| **Search strategy** | Health numeracy; risk communication; measurement uncertainty display |
| **Evidence hierarchy** | HCI / health literacy reviews |
| **Strongest sources** | Health numeracy literature: users confuse precision with accuracy; treat noise as real change; misread intervals; equate score points with clinical risk. DXA athlete guidance warns against over-interpreting sub-LSC changes (Hind 2018). No Oli-specific UI study exists (and UI not authorized). |
| **Population** | General consumers / patients |
| **Equipment/protocol** | Controlled materials only (no consumer UI build) |
| **Quantitative findings** | Expect non-zero misconception rates; exact rates need TB-17 |
| **Limitations** | Domain transfer from general health numeracy |
| **Generalizability** | Problem framing HIGH |
| **Contradictions** | More decimals feel “more scientific” but worsen false precision |
| **Conclusion** | Probe battery should test: false precision; sub-SDC change as improvement; H vs Perf confusion; contribution bars as causal levers; uncertainty interval misuse. |
| **Protocol implication** | TB-17 pre-register probes; SP-02 may recommend rounding/uncertainty/warning language **policy** only — no UI implementation here |
| **Unresolved** | Acceptable misconception rate thresholds |
| **primaryEvidenceConfidence** | **MODERATE** |
| **Component finding** | Rate thresholds INSUFFICIENT |

---

## 6. Cross-cutting measurement reliability synthesis

### 6.1 Waist

| Component | Literature stance | Confidence |
|-----------|-------------------|------------|
| Intra-observer | Often excellent ICC; absolute TE cm-scale | MODERATE |
| Inter-observer | Can match intra if trained; can be large if not | MODERATE |
| Within-day | Dominated by landmark/tape/breathing | MODERATE |
| Between-day | Adds biologic + clothing/state | LOW–MODERATE |
| Landmark | WHO midpoint (expert consultation §2.5 + STEPS 3-5-10) | HIGH |
| Duplicate ≤1 cm QC | Expert consultation §2.5 only (not cited STEPS 2017) | HIGH |
| STEPS field procedure (cited) | Single measure (“Measure only once and record”) | HIGH |

### 6.2 DXA (FM / FFM / ALM / indices)

| Source | Literature stance | Confidence |
|--------|-------------------|------------|
| Same-session minimal reposition | Best-case instrument PE; often within ISCD minima | HIGH methods |
| Repositioning | Material add to PE | HIGH |
| Operator / analysis | Can rival instrument PE | MODERATE |
| Day-to-day biological | Often ≫ same-day PE (esp. lean) | HIGH |
| FMI/FFMI/ALMI | Propagate mass + height error | Methods clear; published error-ρ INSUFFICIENT (see ER-BC-06 primary) |

---

## 7. Standardization synthesis

### 7.1 Waist (governed WHO midpoint — do not switch)

Oli’s proposed Tier B Waist protocol uses the governed WHO-midpoint landmark and a duplicate-measure quality-control procedure supported by the cited WHO expert-consultation source. The current cited WHO STEPS field procedure is documented separately and is **not** represented as the source of the ≤1 cm duplicate rule.

| Protocol element | Classification | Source |
|------------------|----------------|--------|
| Midpoint landmark (last palpable rib ↔ iliac crest) | **SOURCE_PROTOCOL_DERIVED** | SRC-WHO-WC-WHR-2011 §2.5; also SRC-WHO-STEPS-2017 3-5-10 |
| End-expiration / standing / tape snug | **SOURCE_PROTOCOL_DERIVED** | Both cited WHO documents |
| Duplicate measures; repeat if discrepancy >1 cm; average if ≤1 cm | **SOURCE_PROTOCOL_DERIVED** | SRC-WHO-WC-WHR-2011 §2.5 **only** |
| Single-measure STEPS field procedure | Documented separately | SRC-WHO-STEPS-2017 (“Measure only once and record”) — **not** Oli Tier B QC source |
| Measurer certification; clothing/posture/tape logging | **OLI_PRODUCT_POLICY_CANDIDATE** | Reliability literature + Oli QC policy |

**Not authorized:** silent conversion of iliac-crest/umbilicus → WHO midpoint; changing Oli governed definition because another protocol exists; blending STEPS single-measure wording with expert-consultation duplicate QC.

### 7.2 DXA

| Factor | Evidence-backed control? | Notes |
|--------|--------------------------|-------|
| Hydration | **Yes** | kg-scale lean artifact |
| Recent exercise | **Yes** | ≥24 h rest typical in athletic protocols |
| Glycogen | **Yes** | Loading/depletion moves lean |
| Fasting / meal | **Yes (moderate)** | Prefer overnight fast; small-meal literature mixed |
| Bladder void | **Yes (standard practice)** | Nana-style protocols |
| Time of day | **Yes** | Keep consistent |
| Positioning / clothing / metal | **Yes** | ISCD / Nana |
| Calibration / scan mode / software | **Yes** | Version pin; phantom checks |
| Operator | **Yes** | Precision per technologist |
| Menstrual cycle | **Plausible / weakly quantified** | Log; hard exclusion not mandated by strong evidence |
| Edema / illness | **Plausible / inadequately quantified** | Observational TB-04F |

---

## 8. Agreement synthesis

| Setting | Conclusion | Confidence |
|---------|------------|------------|
| Same machine | High reliability if prep controlled; still need local LSC | HIGH |
| Same vendor / different machine | Residual bias possible; phantom + in-vivo bridging | MODERATE |
| Cross vendor (GE vs Hologic) | Systematic bias; not interchangeable; BA + equations required | HIGH |

Correlation alone is **insufficient** for TB-07/08 success criteria.

---

## 9. Empirical covariance synthesis

| Type | Status |
|------|--------|
| Population biological correlations | Abundant; not usable as error model |
| Measurement-error correlations | **INSUFFICIENT in literature** → TB-05 mandatory |

---

## 10. Longitudinal change synthesis

| Domain | Likely signal | Noise | Interval guidance |
|--------|---------------|-------|-------------------|
| Fat loss (intentional) | Often kg-scale over weeks–months | FM PE hundreds of g to >1 kg day-to-day | Prefer ≥4–12 weeks for intervention signal vs noise, study-specific |
| Lean / RT hypertrophy | Often <1–2 kg over 8–16 weeks | Lean day-to-day PE can exceed signal if uncontrolled | Strict acute-state control; consecutive-day LSC |
| Detraining / weight loss lean | Variable | Same | Separate remodeling from hydration |

**Measurable change ≠ clinically meaningful change.**

---

## 11. SDC / MDC methods (planning)

| Method | When appropriate |
|--------|------------------|
| ISCD RMS-SD → LSC (2.77×) | DXA precision studies TB-02 |
| ICC absolute-agreement → SEM → SDC95 | Multi-rater / multi-occasion reliability |
| SD of differences / √2 → SEM | Paired test–retest |
| Variance-component models | TB-02/03 nested designs |

Do **not** import osteoporosis BMD LSC cutoffs as soft-tissue success criteria without justification.

---

## 12. Sample-size evidence (methods only — **no final N**)

| Family | Accepted approach | Required inputs | Refs |
|--------|-------------------|-----------------|------|
| Reliability ICC precision | Bonett (2002) CI-width for ICC | Planned ρ, k occasions, desired width, α | Stat Med 21:1331–1335 |
| SEM/SDC precision | Plan via expected SD_diff and desired SEM/SDC CI | σ_diff, design | ISCD + SEM theory |
| Bland–Altman LoA precision | n from expected SD_diff and LoA CI half-width | σ_d, target half-width | Bland & Altman 1986; modern LoA CI formulae |
| Correlation CI width | Fisher z precision | ρ, width | Standard |
| Longitudinal mixed models | Simulation or analytic RM power | effect, ICC_time, visits, attrition | Standard RM texts |
| Subgroup interaction | Interaction SE ≫ main-effect SE | stratum sizes, interaction effect | Warn: main ≠ interaction power |
| Comprehension proportions | Wilson/exact CI for proportion or two-proportion | p, width or δ | Standard |

**No final Ns invented in this review.**

---

## 13. Stop/go evidence inputs (benchmarks only)

| Category | Literature can inform | Freeze now? |
|----------|----------------------|-------------|
| Repeatability | ISCD minima as *technologist QA* benchmarks | **No** Oli score thresholds |
| Agreement | Expect non-zero vendor bias | **No** numeric LoA freeze |
| Uncertainty | SDC methods | **No** display thresholds |
| Acute-state | kg-scale lean artifacts | Controls yes; score Δ cutoffs no |
| External association | Directional expectations | Endpoint list candidate only |
| Subgroup | Heterogeneity expected | No fairness pass criteria |
| Missingness | Access literature qualitative | TB-15 empirical |

Distinguish: **literature benchmark** / **candidate Oli threshold** / **final frozen Oli threshold**.

---

## 14. SP-01 support (FFMI vs FFM — evidence only; **no Resolver decision**)

Relevant evidence for future SP-01 scientific review:

- FFMI normalizes for stature; absolute FFM does not — important across height range.
- Sarcopenia consensus prefers ALM/ALMI for *quantity*; whole-body FFMI is related but not identical.
- Performance associations often use ALM or relative lean, not raw FFM alone.
- Vendor bias affects ALM and FFM differently than height-normalized indices.
- P1 currently scores FFMI only (frozen math) with `policy_not_frozen` paths elsewhere — evidence does **not** authorize Resolver winner selection here.

---

## 15. SP-02 support (uncertainty / small-change presentation — no UI)

Evidence-relevant presentation questions:

- Rounding to avoid false precision relative to SEM/SDC
- Uncertainty intervals vs point scores
- Significant-change thresholds tied to SDC **language**, not CMC
- Warning that sub-SDC Δ is noise-compatible
- Contribution display misread as causal levers (Wave 1 attribution context)

Do **not** build consumer UI.

---

## 16. Evidence contradiction register

| Question | Source A | Source B | Likely reason | Applicability | Status | Protocol implication |
|----------|----------|----------|---------------|---------------|--------|----------------------|
| Same-day vs consecutive-day DXA LSC | ISCD same-day precision method | Athletic consecutive-day PE ≫ same-day | Biological variation omitted in same-day | Longitudinal claims | **Unresolved for Oli** | Require TB-02C before longitudinal SDC |
| Small meal vs strict fast | Elderly ALM meal <LSC | Athletic Nana fasted protocol | Population/prep stringency | TB-04C | Open | Prefer fast; meal as sensitivity |
| WC landmark reliability | WHO midpoint (expert consultation + STEPS) | NIH iliac crest / narrowest site high ICC | Different constructs | H1 | Open | Keep WHO midpoint; never convert |
| WC duplicate QC | Expert consultation ≤1 cm duplicate/repeat | Cited STEPS 2017 single measure | Different WHO documents | TB-01 QC | **Resolved in attribution** | Attribute ≤1 cm rule to SRC-WHO-WC-WHR-2011 only |
| GE vs Hologic bias sign | Park Lunar ALM higher | Some OsteoLaus Horizon FM/LM higher patterns | Device pair/software/population | TB-08 | Open | Estimate locally; don’t import equations blindly |
| WHtR vs BMI superior | Multiple metas favor WHtR | Some adjusted models prefer BMI/WC | Confounding/adjustment | H1 external | Open | Association ≠ formula change |
| EWGSOP2 women ALMI cutoff | Early table <6.0 | Correction <5.5 | Erratum | TB-09 labels | Resolved in lit | Use corrected values if referenced; still not Oli diagnosis |
| FFMI↑ metabolic risk vs lean protective | Some FMI/FFMI both ↑ diabetes risk | Low FFM ↑ T2DM in other reviews | Collinearity with body size; metric type | TB-10 | Open | Pre-register covariates; avoid causal language |

---

## 17. Protocol-input / readiness table (canonical)

Canonical protocol-readiness vocabulary and exactly one **primaryEvidenceConfidence** per ER. Component notes are non-counting.

| ER-BC | Evidence conclusion | primaryEvidenceConfidence | TB affected | Scoped protocol decision ready | Still unresolved (outside or deferred) | Protocol readiness |
|-------|---------------------|---------------------------|-------------|--------------------------------|----------------------------------------|--------------------|
| 01 | Use ISCD BC precision methods; separate session/reposition/day | **HIGH** | 02/03/16 | Design + analysis class | Oli σ | **PARTIALLY_SUFFICIENT** |
| 02 | WHO midpoint + expert-consultation duplicate QC; STEPS documented separately | **HIGH** | 01 | Landmark + QC elements | Oli σ_waist | **PARTIALLY_SUFFICIENT** |
| 03 | Candidate Health externals exist; don’t freeze endpoints | **MODERATE** | 10/12B/13B | Candidate families | Primary endpoint | **PARTIALLY_SUFFICIENT** |
| 04 | Grip + function candidates; no sport prediction | **MODERATE** | 11 | Candidate families | Primary endpoint | **PARTIALLY_SUFFICIENT** |
| 05 | Non-interchangeable vendors; BA required | **HIGH** | 07/08 | Non-pooling default + BA design | Local LoA | **PARTIALLY_SUFFICIENT** |
| 06 | Shared Height + prospective Σ_ε; biological ρ ≠ error ρ | **INSUFFICIENT** | 05 | Shared Height + fail-closed estimate rule | Empirical Σ_ε | **PARTIALLY_SUFFICIENT** |
| 07 | No transferable CMC | **INSUFFICIENT** | 16 / later | Triad separation preserved as negative finding | All CMC | **INSUFFICIENT** |
| 08 | ALMI maps to sarcopenia quantity domain; no diagnosis | **HIGH** | 09 | Construct map + no-diagnosis control | FFMI fallback external meaning (empirical/SP) | **SUFFICIENT_FOR_PROTOCOL_FREEZE** |
| 09 | Longer-term associations exist; not prediction | **MODERATE** | 10 | Claim boundary | Calibration | **PARTIALLY_SUFFICIENT** |
| 10 | Age trends exist; no auto age-correct | **MODERATE** | 12A/B | Empirical test plan | Inequity action (may escalate later) | **PARTIALLY_SUFFICIENT** |
| 11 | Sex differences ≠ fairness proof | **LOW** | 13A/B | Empirical test plan | Fairness thresholds | **PARTIALLY_SUFFICIENT** |
| 12 | Ethnicity claims limited; legal gate | **LOW** | 14 | Core intersections | Ethnicity confirmatory? | **PARTIALLY_SUFFICIENT** |
| 13 | SEM/SDC methods clear; ≠ CMC / ≠ user meaning | **HIGH** | 16/02/06 | Method + triad separation freeze | Numeric SDC (TB-16); CMC (ER-BC-07) | **SUFFICIENT_FOR_PROTOCOL_FREEZE** |
| 14 | Association ≠ prediction checklist | **HIGH** | 10/11 | Claim / analysis controls | Future predictive study | **SUFFICIENT_FOR_PROTOCOL_FREEZE** |
| 15 | Re-id principles clear; Oli sign-off pending governance | **MODERATE** | all | Scientific checklist | Legal/governance sign-off | **PARTIALLY_SUFFICIENT** |
| 16 | Lean acute artifacts real; prioritize A–D | **MODERATE** | 04 | Control set A–D | Oli deltas | **PARTIALLY_SUFFICIENT** |
| 17 | Error covariance must be prospective | **INSUFFICIENT** | 05 | Need TB-05 (fail-closed) | All ρ_error | **INSUFFICIENT** |
| 18 | Misconception classes clear; rates unknown | **MODERATE** | 17 / SP-02 | Probe classes | Rate thresholds | **PARTIALLY_SUFFICIENT** |

### 17.1 Readiness counts (must equal 18; unchanged)

| Protocol readiness | N | ER IDs |
|--------------------|--:|--------|
| SUFFICIENT_FOR_PROTOCOL_FREEZE | **3** | 08, 13, 14 |
| PARTIALLY_SUFFICIENT | **13** | 01, 02, 03, 04, 05, 06, 09, 10, 11, 12, 15, 16, 18 |
| INSUFFICIENT | **2** | 07, 17 |
| SCIENTIFIC_REVIEW_REQUIRED | **0** | — (ER-BC-10 may escalate after TB-12B; not a present-state status) |
| **TOTAL** | **18** | ER-BC-01…18 |

### 17.2 Primary evidence-confidence reconstruction (canonical; total 18)

Every ER appears exactly once. Component notes do not count.

| primaryEvidenceConfidence | N | ER IDs |
|---------------------------|--:|--------|
| **HIGH** | **6** | 01, 02, 05, 08, 13, 14 |
| **MODERATE** | **7** | 03, 04, 09, 10, 15, 16, 18 |
| **LOW** | **2** | 11, 12 |
| **INSUFFICIENT** | **3** | 06, 07, 17 |
| **TOTAL** | **18** | ER-BC-01…18 |

**Component notes (non-counting):**
- ER-BC-01: component MODERATE for typical magnitude envelopes; Oli σ still pending TB.
- ER-BC-02: component LOW–INSUFFICIENT for absolute Oli σ_waist.
- ER-BC-06: component **HIGH** methodological conclusion that biological covariance ≠ measurement-error covariance and Σ_ε must be estimated prospectively — **does not** make primary confidence HIGH.
- ER-BC-11: component HIGH that sex distributional differences exist; primary remains LOW for fairness proof.
- ER-BC-13: HIGH primary for SEM/SDC/MDC method framework; numeric SDC and CMC unresolved elsewhere.
- ER-BC-16: factor-level nuance (hydration/exercise HIGH; menstrual LOW; edema INSUFFICIENT) under primary **MODERATE**.

**Taxonomy examples:**
- ER-BC-06 = primary evidence confidence **INSUFFICIENT** for Σ_ε magnitude, while protocol readiness is **PARTIALLY_SUFFICIENT** for a fail-closed prospective-estimation method.
- ER-BC-13 = primary evidence confidence **HIGH** and readiness **SUFFICIENT_FOR_PROTOCOL_FREEZE** for method selection, while numeric SDC and CMC remain unresolved elsewhere.

---

## 18. Critical scientific gaps (Tier B must generate)

1. Oli-site DXA σ / SEM / SDC for FM, FFM, ALM, indices, scores (same-session, reposition, day-to-day, operator)
2. Oli WHO-midpoint σ_waist (intra/inter/day) under certified protocol
3. Empirical measurement-error covariance Σ_ε (FM, FFM, ALM, Waist, Height)
4. Local same-vendor and cross-vendor LoA (not imported equations)
5. Acute-state score deltas under Oli controls
6. Confirmatory external primary endpoints (Health and Performance) after independence review
7. Age and sex external-meaning fairness tests (not distribution alone)
8. Intersectional small-cell feasible strata
9. Access/scorability selection-bias magnitudes
10. Comprehension misconception rates on controlled materials
11. Clinically meaningful change anchors (explicitly deferred)
12. Completed re-identification risk sign-off (governance-owned)

Lack of published evidence is a **valid finding**, not a license to invent parameters.

---

## 19. Scientific review issues (no formula retuning)

If literature conflicts with current score design, record as **SCIENTIFIC REVIEW ISSUE** only:

| Issue | Notes |
|-------|-------|
| Age-invariant scoring vs age-varying external meaning | Test in TB-12B; no age knots added here |
| Sex-specific knots ≠ fairness | Test in TB-13B |
| Vendor non-interchangeability vs one-function scoring | May force provenance constraints / non-pooling |
| FFMI vs ALMI lean meaning (H3 fallback / P1) | SP-01 track |
| Sub-SDC score volatility near steep H1 regions | SP-02 / reliability HOLD paths |

**Do not alter:** weights, knots, transformations, age logic, sex logic, Resolver.

---

## 20. Progress / roadmap snapshot

```text
Tier B methodology:              PASS @ d7714df5…
Prior scientific evidence re-gate: FAIL @ 754bfd5d… (4 bounded defects)
Independent evidence re-gate V2: FAIL (confidence taxonomy only; source/WHO/readiness PASS)
Evidence package:                CORRECTED / PENDING INDEPENDENT SCIENTIFIC RE-GATE V3
Scientific evidence accepted:    NO — pending re-gate
Governance protocol:             PASS
Governance closure:              NOT COMPLETE
Protocol freeze:                 NOT COMPLETE / DRAFTING ONLY
Execution:                       NOT AUTHORIZED
Clinical validation:             NOT ESTABLISHED
Consumer integration:            NOT AUTHORIZED
Public Health / Perf-Support:    NO-GO
```

---

## 21. Source ledger (corrected — unique DOI/paper associations)

| sourceId | fullTitle / issuing identity | authors / issuingBody | publicationYear / version | journalOrAuthority | doiOrStableId | studyDesign / document type | population | equipmentOrProtocol | quantitativeClaimSupported | limitations | erBcUses |
|----------|------------------------------|-----------------------|---------------------------|--------------------|---------------|----------------------------|------------|---------------------|----------------------------|-------------|----------|
| SRC-DXA-ZEMSKI-2019 | Same-Day Vs Consecutive-Day Precision Error of Dual-Energy X-Ray Absorptiometry for Interpreting Body Composition Change in Resistance-Trained Athletes | Adam J. Zemski; Karen Hind; Shelley E. Keating; Elizabeth M. Broad; Damian J. Marsh; Gary J. Slater | 2019 (epub 2018-10-29) | *J Clin Densitom* 22(1):104–114 | DOI 10.1016/j.jocd.2018.10.005; PMID 30454952 | Comparative precision study; same-day vs consecutive-day DXA | Resistance-trained athletes n=21 | Whole-body DXA; ISCD-style PE/LSC | Consecutive-day PE ≫ same-day: FM 1261 g vs 660 g; lean 2083 g vs 617 g | Athletic cohort; not Oli site σ | ER-BC-01 |
| SRC-DXA-THAMNIRAT-2021 | Precision and Effects of a Small Meal on DXA-Derived Visceral Adipose Tissue, Appendicular Lean Mass, and Other Body Composition Estimates In Nonobese Elderly Men | Kanungnij Thamnirat; Pollawat Taweerat; Sompol Permpongkosol; Natechanok Kamolnate; Arpakorn Kositwattanarerk; Chirawat Utamakul; Wichana Chamroonrat; Chanika Sritara | 2021 (epub 2020-05-03) | *J Clin Densitom* 24(2):308–318 | DOI 10.1016/j.jocd.2020.04.001; PMID 32446653 | Precision + small-meal effect; repositioned repeats | Nonobese men ≥60 y, n=36 | Whole-body DXA; overnight fast then standardized meal | ALM CV 0.93%, LSC 501 g; ALMI CV 0.94%, LSC 0.19; small-meal Δ ALM/ALMI < LSC | Elderly male clinic cohort; not Oli σ | ER-BC-01; ER-BC-16 |
| SRC-DXA-HIND-2018 | Interpretation of Dual-Energy X-Ray Absorptiometry-Derived Body Composition Change in Athletes: A Review and Recommendations for Best Practice | Hind et al. | 2018 | *J Clin Densitom* | PMID 29754949 | Best-practice review | Athletes (review) | DXA BC interpretation | LSC ≠ worthwhile/clinical change framing | Review, not Oli σ | ER-BC-01; ER-BC-07; ER-BC-18 |
| SRC-WHO-WC-WHR-2011 | Waist circumference and waist–hip ratio: report of a WHO expert consultation, Geneva, 8–11 December 2008 | World Health Organization | 2011 | WHO | ISBN 9789241501491; https://www.who.int/publications/i/item/9789241501491 | Expert consultation report | Global guidance | §2.5 measurement protocol | Midpoint landmark; duplicate measures; average if ≤1 cm; repeat both if >1 cm | Not a field-survey ops manual; not STEPS single-measure procedure | ER-BC-02 |
| SRC-WHO-STEPS-2017 | WHO STEPwise approach to NCD risk factor surveillance — STEPS Manual, Part 3 Section 5 (Physical Measurements), Measuring Waist Circumference | World Health Organization | Last Updated 26 January 2017 (cited package version) | WHO STEPS Manual | Official STEPS manuals portal / Part 3 §5 pages 3-5-10… | Field procedure manual | STEPS surveys | Midpoint landmark; constant-tension tape; end-expiration | Midpoint procedure; **measure only once and record** | Does **not** state ≤1 cm duplicate/repeat rule in this cited version | ER-BC-02 |
| SRC-NOT-USED-LI-2020 | Associations of Sex Steroids With Changes in Calcaneal Quantitative Ultrasound Measurements: A Longitudinal Study in Chinese Male Adolescents | Li et al. | 2020 | *J Clin Densitom* | DOI 10.1016/j.jocd.2020.01.001 | Longitudinal QUS / sex-steroids | Chinese male adolescents | Calcaneal QUS | **Not used** for ALM/DXA precision claims | Wrong prior DOI attachment to Thamnirat ALM findings — retained only to document exclusion | — (excluded) |

**Ledger integrity rules:** one sourceId ↔ one paper/document; one DOI ↔ one paper identity; Buehring is **not** a retained source for Zemski PE values; DOI 10.1016/j.jocd.2020.01.001 is **not** attached to ALM precision findings.

---

## 22. Explicit non-authorizations

This evidence review does **not**:

- authorize Tier B execution
- use Oli user data or PHI
- recruit / contact sites / collect measurements
- change draft_v1 formulas, knots, weights
- change Resolver or Confidence
- freeze numeric stop/go thresholds or sample sizes
- authorize clinical or consumer claims
- authorize public scores or deployment
- claim that scientific evidence is accepted (re-gate V2 still required)

---

END OF TIER B EVIDENCE REVIEW V1
