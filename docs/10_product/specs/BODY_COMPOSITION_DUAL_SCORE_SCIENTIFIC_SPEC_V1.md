# Body Composition Dual Score — Scientific Specification V1

**Document type:** Scientific / product specification (planning only)
**Date:** 2026-10-04
**Branch:** `feat/body-composition-stage3e-body-scans-v1`
**Planning SHA (preflight):** `d2b0b3abba958c9ac80ec5401f90ad5227a1a0a8`
**Companion freeze:** `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_DECISION_FREEZE_V1.md`
**Prior external planning authority:** `/Users/danielhendel/oli-planning/OLI_BODY_COMPOSITION_DUAL_SCORE_DECISION_EVIDENCE_FREEZE_V1.md` (2026-09-28)
**Model status:** `evidence_informed` — **not** `clinically_validated`
**Scope:** Research + decision specification only. **No score engine. No score UI. No persistence. No public 0–100.**

---

## 0. Authority and non-claims

### Input stack (mandatory)

```text
CANONICAL EVIDENCE
      ↓
EVIDENCE RESOLVER
      ↓
ASSESSMENT CONFIDENCE
      ↓
SCORE ENGINE (future; blocked until independent planning/spec PASS)
```

Score engines must **not**:

- query Firebase directly;
- select evidence themselves;
- override Resolver output;
- infer source methods;
- repair missing provenance;
- convert unknown protocol into known protocol;
- use parser-confidence values;
- use excluded evidence.

### Product principle — body composition only

These scores evaluate **body composition constructs only**.

**Must not enter** either score merely because they relate to health or performance:

strength · VO₂ max · cardiovascular performance · sleep · activity · nutrition · labs · bone density · disease probabilities · attractiveness · sport ranking.

---

## 1. Score definitions

### 1.1 Health Composition

**Means:** How favorable is this person’s current body composition for long-term health context, based on evidence Oli can responsibly assess?

**Does not mean:** disease probability; diagnosis; mortality prediction; clinical risk calculator; attractiveness; fitness score; medical clearance; “perfect body.”

### 1.2 Performance Composition

**Means:** How favorable is this person’s current body composition for general physical-performance support?

**Does not mean:** measured athletic performance; strength score; VO₂ max; sport-specific ranking; bodybuilding score; physique/aesthetic score; performance prediction.

### 1.3 Scale semantics (LOCKED)

| Bound | Meaning | Does **not** mean |
|-------|---------|-------------------|
| **100** | Model saturation bound for this version | Zero risk; perfect health; max human performance |
| **0** | Lower modeled bound for this version | Certain disease; zero physical capacity |
| Higher | More favorable under this model | Clinical certainty |

### 1.4 Precision (LOCKED product policy)

| Layer | Precision |
|-------|-----------|
| Internal calculation | Floating-point |
| Stored (if ever persisted) | Governed rounded integer 0–100 + version + reason codes |
| Public display | Integer 0–100 only |

Fake precision such as `82.37` is forbidden for users.

### 1.5 Category labels

**V1:** numeric only when eventually public; **no** status-band cut points.
Do **not** reuse Body dashboard language (Deficient / Healthy / Strong / Optimal / Elite) as score bands without separate validation.
Category cut points remain **NOT READY**.

---

## 2. Construct framework (frozen; do not silently replace)

| ID | Name | Role | V1 numeric weight policy |
|----|------|------|--------------------------|
| **H1** | Central Adiposity | CORE | See §11 |
| **H2** | Total Adiposity | CORE | See §11 |
| **H3** | Lean Reserve | CORE | See §11 |
| **H4** | Fat Distribution | Explanatory | **0%** V1 (display-only) |
| **P1** | Muscularity | CORE | See §17 |
| **P2** | Regional Lean | Optional / informational | **0% numeric V1** (ADR amendment; §16) |
| **P3** | Performance Adiposity | CORE | See §17 |
| **P4** | Lean Balance | Deferred V1.1 | 0% |

### ADR amendment note (required before unflagged production)

Prior ADR language used “Health Protection” / “Performance Support” and left aggregates unresolved/forbidden. Dual Score requires explicit human acceptance of the amendment proposed in the 2026-09-28 Decision Freeze (aggregates as composition assessments; General-only Performance; severity dampening; no single Body score). This planning pass does **not** mutate ADR files.

---

## 3. Existing decision inventory

| DECISION | CURRENT STATUS | SOURCE | STATE |
|----------|----------------|--------|-------|
| Two independent scores; no average; no universal Body score | Accepted doctrine | ADR / Product & Standards | **FROZEN** |
| Names Health / Performance Composition | Authorized design | Dual Score freeze | **PROVISIONAL** until ADR accepted |
| Scale 0–100 higher-better | Locked | Dual Score freeze | **LOCKED** |
| Model `evidence_informed` | Locked | Stage 3E freezes | **LOCKED** |
| Public numeric | NOT READY / STAGED | Stage 3E + Dual Score | **FORBIDDEN** public |
| Score engines | STILL BLOCKED pending planning/spec PASS | Stage 3E truth | **FORBIDDEN** runtime |
| WHtR primary non-imaging H1 | Locked | Resolver + Dual Score | **LOCKED** |
| FMI over BF% (H2/P3) | Locked precedence | Resolver freeze | **LOCKED** |
| ALMI over FFMI (H3) | Locked precedence | Resolver freeze | **LOCKED** |
| Gallagher as score math | Rejected | Stage 3C / Dual Score | **FORBIDDEN** |
| Ethnicity in V1 scoring | Not used | Dual Score / Bridge | **LOCKED** |
| Absolute (not age-percentile) scoring | Locked | Dual Score | **LOCKED** |
| Confidence qualitative labels | Terminology frozen; assignment rules = 0 | Confidence freeze | Labels OPEN |
| Recency thresholds | Metadata only; half-lives open | Resolver / Confidence | **OPEN** |
| Same-day DXA>BIA | Conceptually authorized; inactive | Resolver | **INACTIVE** |
| Exact transforms / caps / bands | Not frozen | This spec | **PROVISIONAL / NEEDS VALIDATION** |

---

## 4. Research base (hierarchy)

### 4.1 Preferred evidence classes used

1. Clinical guidelines (NICE NG246; WHO waist consultation; EWGSOP2)
2. Systematic reviews / meta-analyses (Ashwell WHtR; body-fat mortality dose-response)
3. Population DXA/BIA reference studies (NHANES FMI/FFMI; Kelly 2009; Kyle/Schutz)
4. DXA VAT validation / reference (Kaul/Rothney; Swainson; Mellis-style cutoffs)
5. Consensus / position literature on low energy availability / REDs (no universal low-BF diagnostic cutoff)

### 4.2 Explicitly de-prioritized

Blogs · fitness websites · vendor marketing · bodybuilding conventions · social-media norms · Gallagher educational bands as score mathematics.

### 4.3 Major limitations

- Continuous 0–100 slopes are **not** published clinical coefficients; screening cutoffs ≠ score slopes.
- Method non-interchangeability (DXA ≠ BIA ≠ anthropometry).
- Ethnicity-specific WC cutoffs disagree; V1 avoids them.
- VAT cutoffs are device/population-specific.
- Performance Composition has weaker outcome linkage (LEVEL C) than Health H1 (LEVEL A/B).
- Oli scores are wellness composition assessments, not clinical validators.

---

## 5. H1 — Central Adiposity

### 5.1 Question

How favorable is current **central** adiposity burden?

### 5.2 Metric channels

| Channel | Role V1 | Notes |
|---------|---------|-------|
| Standardized WHtR (`whtr_v1`, WHO midpoint Waist + Height) | **Primary scoring channel** | Consumer-accessible; NICE/Ashwell support |
| DXA VAT mass | Explanatory / staged scoring | Device-specific refs exist; not unified with WHtR raw scale |
| DXA VAT volume | Explanatory / staged | No silent mass↔volume conversion |
| BIA “visceral” estimates | Supporting / non-scoring | ≠ DXA VAT |
| Android/Gynoid (H4) | Display-only V1 | Soft refinement deferred |

### 5.3 Is WHtR the correct primary consumer marker?

**Yes — LOCKED.**

**Evidence:** Ashwell systematic reviews/meta-analyses support WHtR ≥ WC/BMI for cardiometabolic discrimination; NICE NG246 classifies central adiposity by WHtR for adults with BMI <35 across sexes/ethnicities; public message “waist < half height.”

**Evidence type:** Guideline + meta-analysis.
**Population:** Adults (NICE also specifies CYP ≥5 for classification; Oli adult V1 gates separately).
**Limitation:** Screening tool, not continuous risk model; protocol-sensitive.

### 5.4 Role of 0.5

**Boundary / educational action anchor — not transform center implying zero risk below.**

NICE bands:

| WHtR | NICE class |
|------|------------|
| 0.40–0.49 | Healthy central adiposity (no increased health risks) |
| 0.50–0.59 | Increased central adiposity |
| ≥0.60 | High central adiposity |

**Classification:** EVIDENCE-DERIVED (NICE NG246).
**Score use:** piecewise anchors — PRODUCT POLICY mapping from anchors to 0–100.

### 5.5 Behavior below 0.5 / very low WHtR

- Lower is **generally more favorable** above the healthy band floor.
- Within ~0.40–0.49: high plateau (near saturation), **not** automatic 100.
- Below ~0.40: **no further reward**; mild PRODUCT POLICY soft floor may reduce score for extreme low values (illness/malnutrition/measurement error risk).
- There is **no strong evidence** that WHtR → 0 is healthier.
- **100 ≠ no health risk.**

### 5.6 Sex / age / ethnicity for H1

| Factor | Rule | Status |
|--------|------|--------|
| Sex | WHtR primary path sex-agnostic (NICE) | LOCKED |
| Age | Adult eligibility gate only; not age-percentile | LOCKED |
| Ethnicity | Not used in V1 H1 math | LOCKED |

### 5.7 Unified H1 across WHtR and VAT?

**No shared raw scale.** Use **channel-specific transforms** then governed combination.

V1 scoring policy:

1. If standardized WHtR resolved → compute `H1_whtr`.
2. If VAT mass/volume resolved → treat as **explanatory** unless/until a method-specific VAT transform is separately validated and frozen.
3. If Resolver returns `multiple_valid` (WHtR + VAT): **do not invent a global winner**; score may use WHtR channel for numeric H1 and surface VAT as limiting/supporting evidence; or withhold public H1 aggregation until combination policy freezes.
4. Prefer fail-closed for public release when combination policy is unfrozen.

### 5.8 Draft H1 WHtR transform (PROVISIONAL — NEEDS VALIDATION)

Shape: **piecewise linear monotonic decreasing** with low-side plateau (conceptually approved).

```text
# PRODUCT POLICY draft coefficients — not production-frozen
# Anchors informed by NICE NG246 + Ashwell 0.5 / 0.6

function H1_whtr(x):  # x = WHtR
  if x is missing or invalid: return null
  # clamp modeled domain
  x = clip(x, 0.30, 0.80)

  # low-side soft floor (PRODUCT POLICY; not clinical)
  if x <= 0.35: return 70
  if x <  0.40: return lerp(x, 0.35, 0.40, 70, 95)

  # healthy band plateau
  if x <= 0.49: return lerp(x, 0.40, 0.49, 95, 90)   # mild non-claim: not 100

  # increased band
  if x <  0.50: return 90
  if x <= 0.59: return lerp(x, 0.50, 0.59, 75, 45)

  # high band → saturation
  if x <= 0.70: return lerp(x, 0.60, 0.70, 40, 10)
  return lerp(x, 0.70, 0.80, 10, 0)
```

| Parameter | Class |
|-----------|-------|
| Anchors 0.40 / 0.50 / 0.60 | EVIDENCE-DERIVED (NICE) |
| Piecewise slopes / plateaus / 0.35 soft floor | PRODUCT POLICY |
| Exact 0–100 mapping | STILL OPEN / NEEDS VALIDATION |

**Invariant:** higher WHtR must not improve `H1_whtr` for x ≥ 0.40.

### 5.9 VAT transforms

**Decision:** **Stage VAT numeric scoring** until method-specific (GE Lunar CoreScan / Hologic) reference tables and Oli provenance fields are frozen.

| Option | Verdict |
|--------|---------|
| Invent universal 0–100 VAT score now | **Rejected** |
| Leave VAT explanatory | **V1 default** |
| Method-specific percentile mapping | Future candidate only if device + population validated |

No conversion VAT volume ↔ VAT mass unless scientifically validated **and** explicitly approved.

Published anchors (context only, not Oli score math):

- Swainson et al.: age/sex GE iDXA VAT mass reference intervals (UK).
- Mellis-style cardiometabolic cutoffs (GE Prodigy): e.g. ~700–1200 g by sex/age — **device-bound**, not portable.
- Kaul/Rothney: DXA–CT validation, not population cutoffs.

---

## 6. H2 — Total Adiposity

### 6.1 Channel precedence (LOCKED)

```text
FMI (fmi_v1)  >  Body Fat %  >  Fat Mass (explanatory; not direct score)
```

- FMI preferred when fat mass + height available.
- BF% secondary when FMI unavailable.
- Fat Mass alone does **not** directly score (height-unnormalized).
- Gallagher bands = education only — **FORBIDDEN** as silent score math.
- BMI is **not** an H2 channel.

### 6.2 Shape

Soft U / inverted-U: mid favorable; high unfavorable; extremely low less favorable.
**Forbid:** lower fat = always better.

### 6.3 Sex-specific FMI reference anchors (EVIDENCE-DERIVED context)

Kelly et al. NHANES DXA FMI classification (White young-adult prevalence-matched to BMI; sex-specific):

| Class | Men (kg/m²) | Women (kg/m²) |
|-------|-------------|---------------|
| Severe fat deficit | <2 | <3.5 |
| Moderate deficit | 2–<2.3 | 3.5–<4 |
| Mild deficit | 2.3–<3 | 4–<5 |
| Normal | 3–6 | 5–9 |
| Excess fat | >6–9 | >9–13 |
| Obese I | >9–12 | >13–17 |
| Obese II | >12–15 | >17–21 |
| Obese III | >15 | >21 |

Kyle/Schutz BIA FMI “normal BMI” bands differ (narrower) — method-bound; do not mix silently.

### 6.4 Draft H2 FMI transform (PROVISIONAL)

```text
# Sex-specific soft-U; PRODUCT POLICY mapping of Kelly bands
function H2_fmi(fmi, sex):
  if missing(fmi) or missing(sex): return null
  if sex == male:
    # plateau 3.5–5.5; decline outside
    return soft_u(fmi,
      low_floor=2.0, low_enter=3.0, plateau_lo=3.5, plateau_hi=5.5,
      high_exit=9.0, high_sat=15.0,
      plateau_score=92, low_sat=35, high_sat_score=5)
  if sex == female:
    return soft_u(fmi,
      low_floor=3.5, low_enter=5.0, plateau_lo=5.5, plateau_hi=8.5,
      high_exit=13.0, high_sat=21.0,
      plateau_score=92, low_sat=35, high_sat_score=5)
```

| Element | Class |
|---------|-------|
| Sex-specific normal/excess band locations | EVIDENCE-DERIVED (Kelly NHANES) |
| Plateau width inside normal; exact scores | PRODUCT POLICY |
| Low-adiposity penalty magnitude | PRODUCT POLICY informed by essential-fat / REDs caution |
| Age-normalized FMI percentile as score | **FORBIDDEN** (absolute favorability) |

### 6.5 BF% secondary channel

Use only when FMI unavailable. Sex-specific soft-U with **method-labeled** BF%. Do not claim interchangeability across DXA/BIA/manual. Exact BF% anchors remain **NEEDS VALIDATION**; do not import Gallagher educational bands as coefficients.

Essential-fat educational floors (context, Harvard Nutrition Source–style; not Oli diagnosis): ~5% men / ~10% women — inform low-side concern, not “optimal = essential.”

### 6.6 Age for H2

Adult eligibility only. Absolute favorability. No “good for age” BMI/FMI percentile score.

---

## 7. H3 — Lean Reserve

### 7.1 Channel precedence (LOCKED)

```text
ALMI (almi_v1)  >  FFMI (ffmi_v1)  >  FFM / total Lean (explanatory only)
```

Do **not** infer skeletal muscle from total Lean.
Do **not** let total Lean directly score when ALMI/FFMI unavailable → construct insufficient / explanatory.

### 7.2 Shape

Increasing → plateau. Extremely high muscularity **does not reduce** Health score in V1 (no upper Health penalty). Infinite reward forbidden.

### 7.3 ALMI anchors

| Anchor | Men | Women | Class |
|--------|-----|-------|-------|
| EWGSOP2 low muscle quantity (DXA ASMI) | <7.0 kg/m² | <5.5 kg/m² | EVIDENCE-DERIVED clinical floor context — **not diagnosis** |
| Young-adult mean-like plateau region (population DXA refs) | ~8.0–9.5 | ~5.8–7.0 | EVIDENCE-INFORMED / PRODUCT POLICY plateau |

### 7.4 Draft H3 ALMI transform (PROVISIONAL)

```text
function H3_almi(almi, sex):
  if missing(almi) or missing(sex): return null
  if sex == male:
    # floor context 7.0; plateau from ~8.5
    return increasing_plateau(almi, low_sat=5.5, floor=7.0, plateau_start=8.5, plateau_score=95, low_score=15)
  if sex == female:
    return increasing_plateau(almi, low_sat=4.0, floor=5.5, plateau_start=6.5, plateau_score=95, low_score=15)
```

### 7.5 FFMI secondary

Kyle normal-BMI FFMI: men ~16.7–19.8; women ~14.6–16.8 kg/m² (BIA, Caucasian). Use as secondary H3 when ALMI absent. Method-bound.

### 7.6 Age policy for H3 (LOCKED)

- Score = **absolute favorability**, not age percentile.
- EWGSOP2 floors may inform **low-lean safety context**, not “good for 80” inflation.
- Age gates adult eligibility; does not raise the target for older adults.
- Do not reward age-related decline.

---

## 8. H4 — Fat Distribution

**V1 role:** display-only / explanatory.
**Weight:** 0% core.
**Soft refinement ≤10% of H1:** **deferred** — prefer simplicity over weak evidence (high redundancy with H1/VAT).
Android/Gynoid ratio may appear in explanations when resolved; never a third adiposity vote.

---

## 9. Health aggregation

### 9.1 Weights — reviewed alternatives

| Scheme | H1 | H2 | H3 | Notes |
|--------|----|----|-----|-------|
| Provisional | 45 | 35 | 20 | Prior freeze |
| Alt A | 50 | 30 | 20 | Stronger central priority |
| Alt B | 40 | 40 | 20 | Equal adiposity; more H1/H2 redundancy |

**Recommendation (PRODUCT POLICY, still provisional):** keep **45 / 35 / 20**.

**Rationale:**

- Central adiposity has strongest composition-adjacent health signal (LEVEL A screening).
- Total adiposity remains necessary (distinct from central; FMI ≠ WHtR).
- Lean reserve matters for adequacy but must not dominate or mask H1.
- 50/30/20 over-weights H1 relative to total fat burden.
- 40/40/20 increases double-count risk between correlated adiposity markers.

**Not optimized to any individual subject.**

### 9.2 Redundancy

| Pair | Risk | Mitigation |
|------|------|------------|
| H1 vs H2 | Moderate correlation | Different constructs (central vs total); weights favor H1; bottleneck on severe H1 |
| H1 vs H4 | High | H4 weight 0% V1 |
| H1 WHtR vs VAT | Complementary channels | No double vote; VAT non-scoring V1 |
| H2 FMI vs BF% | Same construct chain | Single chain precedence |
| H3 ALMI vs FFMI | Same construct chain | Single chain precedence |

### 9.3 Bottleneck / dampening (architecture LOCKED; numbers PROVISIONAL)

```text
base = weighted_mean(available of {H1,H2,H3} with weights renormalized among available cores)
# severity dampening — continuous soft cap (PRODUCT POLICY draft)
if H1 is available and H1 < 35:
  cap = 35 + 0.55 * H1     # e.g. H1=20 → cap=46; H1=10 → cap=40.5
  health = min(base, cap)
else:
  health = base
# reserved: similar soft cap when H2 < 25 (optional V1.1 enable)
health = clip(health, 0, 100)
display = round_half_up(health)  # integer when displayed
```

| Element | Class |
|---------|-------|
| Requirement for dampening | PRODUCT POLICY + product doctrine |
| Threshold 35 / coefficient 0.55 | PRODUCT POLICY — NEEDS VALIDATION |
| Continuous vs hard cliff | Continuous preferred — LOCKED architecture |

**Invariant:** very favorable H3 must not fully hide severe H1.

### 9.4 Missing-data / eligibility (Health)

| Mode | Requirements | Public eligibility |
|------|--------------|--------------------|
| Calculation unavailable | Missing adult age/sex/height; or no H1 channel | `insufficient_core_constructs` / demographic reasons |
| Preliminary (internal only V1) | H1 only | **Withheld from public**; draft/harness only |
| Standard calculation | H1 + H2 | Internal draft allowed |
| Preferred | H1 + H2 + H3 | Same; higher coverage |
| BMI-only | Forbidden | Never |

Rules:

- Missing ≠ 0.
- One construct alone never produces a **public** aggregate.
- H3 absent → renormalize H1/H2; mark coverage incomplete.
- DXA-only without Waist: H1 may be `multiple_valid`/insufficient for WHtR path; fail closed for public if no standardized H1 channel.

---

## 10. P1 — Muscularity

### 10.1 Primary metric V1

**FFMI primary** for Performance muscularity (general composition support).
ALMI is **not** a second P1 vote (ALMI dual-use: H3 Health / P2 informational).

When FFMI unavailable: FFM or total Lean alone → **insufficient for P1 scoring** (explanatory only) unless a frozen secondary policy is added later.

### 10.2 Shape

Increasing → saturation. No infinite reward. No upper Health-style penalty for high muscularity in Performance V1 (plateau only).

### 10.3 Draft P1 FFMI transform (PROVISIONAL)

```text
function P1_ffmi(ffmi, sex):
  if missing(ffmi) or missing(sex): return null
  if sex == male:
    # Kyle normal ~16.7–19.8; plateau ~20–22 (general, not bodybuilding)
    return increasing_plateau(ffmi, low_sat=14.0, transition=16.7, plateau_start=20.0, plateau_score=95, low_score=10)
  if sex == female:
    return increasing_plateau(ffmi, low_sat=12.0, transition=14.6, plateau_start=17.5, plateau_score=95, low_score=10)
```

Kouri ~25 FFMI natural-athlete ceiling is **not** a Performance target (bodybuilding-adjacent). Collegiate/elite FFMI tails must not redefine general-population saturation.

Age: adult gate only; absolute favorability.

---

## 11. P3 — Performance Adiposity

### 11.1 Channel

Same chain as H2: FMI > BF%; Fat Mass not direct. Soft U.
**Not** bodybuilding leanness. Sport-specific ranges excluded from general score.

### 11.2 Draft (PROVISIONAL)

Slightly wider favorable plateau than Health H2 (composition support tolerates modest adiposity), still penalizes extremes.

```text
function P3_fmi(fmi, sex):
  # PRODUCT POLICY: wider plateau than H2; still soft-U
  if sex == male:
    return soft_u(fmi, low_floor=2.0, low_enter=3.0, plateau_lo=3.0, plateau_hi=7.0,
                  high_exit=10.0, high_sat=16.0, plateau_score=92, low_sat=40, high_sat_score=8)
  if sex == female:
    return soft_u(fmi, low_floor=3.5, low_enter=5.0, plateau_lo=5.0, plateau_hi=10.0,
                  high_exit=14.0, high_sat=22.0, plateau_score=92, low_sat=40, high_sat_score=8)
```

Low/high penalties: PRODUCT POLICY informed by essential-fat caution + high-adiposity movement burden — **not** clinical REDs diagnosis.

---

## 12. P2 — Regional Lean

### Recommendation: **OPTION C — no numeric P2 in V1**

| Option | Meaning | Verdict |
|--------|---------|---------|
| A | Renormalize cores when P2 present | Rejected — changes score meaning by coverage |
| B | Hold P1/P3 constant; P2 soft refine | Deferred |
| **C** | Do not include P2 numerically in V1 | **FROZEN for V1** |

P2 may improve Assessment Confidence factual coverage and appear informationally.
Do **not** score left/right symmetry through P2 (that is P4, deferred).

**ADR amendment vs prior provisional 40/40/20:** prior weights superseded for V1 numeric engine.

---

## 13. Performance aggregation

### 13.1 Weights (V1)

```text
P1 = 50%
P3 = 50%
P2 = 0% numeric
```

### 13.2 Dampening (architecture LOCKED; numbers PROVISIONAL)

```text
base = 0.5*P1 + 0.5*P3
if P3 < 30:
  cap = 30 + 0.60 * P3   # PRODUCT POLICY draft
  perf = min(base, cap)
else:
  perf = base
perf = clip(perf, 0, 100)
```

High muscularity must not fully offset extreme adiposity for general movement support.

### 13.3 Missing-data / eligibility (Performance)

| Rule | Status |
|------|--------|
| Require sex, height, weight, method-labeled BF or lean/FFM sufficient for **both** P1 and P3 | LOCKED |
| Both P1 and P3 required for any aggregate | LOCKED |
| P2 cannot substitute for P1 | LOCKED |
| BMI-only forbidden | LOCKED |
| Preliminary single-construct aggregate | **Forbidden** |
| Public withholding until staging gates | LOCKED |

---

## 14. Assessment Confidence interaction

### Frozen architecture: **OPTION C + public gate A**

| Layer | Rule |
|-------|------|
| **Calculation eligibility** | Score-specific minimum evidence rules (§9.4, §13.3) — **independent** of qualitative Confidence labels |
| **Null Confidence label** | Does **not** block internal draft calculation |
| **Factual Confidence state** | May gate: `conflict`, `insufficient`, `undated_only`, `unsupported`, `policy_not_frozen` on required constructs → fail closed |
| **Qualitative labels** (Limited/Moderate/Good/Strong) | Assignment matrix remains **unfrozen** (0 rules); **must not** be manufactured for scoring |
| **Public display** | Withheld until (1) score math validation, (2) Confidence label policy frozen **or** explicit product decision that public scores may ship with factual Confidence only, (3) recency gate (§15) |

**Reject OPTION B** as a hard block on draft engine implementation once planning/spec PASS — labels are display-layer policy, not construct math.

---

## 15. Recency

### Decision: **OPTION C (public) + B (draft internal)**

| Phase | Policy |
|-------|--------|
| Draft internal / harness | May calculate from latest Resolver-selected evidence; mark `recency_policy_not_frozen`; do not claim “current” equivalence across years-old DXA vs current Waist |
| Public | **Blocked** until recency thresholds/half-lives are governed |

Indicative operational bands remain **PRODUCT OPERATIONAL / OPEN** (not score coefficients): weight ≤7d; waist ≤90d; consumer BIA ≤30d; DXA ≤365d.

Years-old DXA must not silently equal current Waist for public “current” scores.

---

## 16. Resolver interaction

| Resolver status | Score behavior |
|-----------------|----------------|
| `resolved` / `resolved_with_supporting` | May use primary channel for construct transform |
| `multiple_valid` | No new source winner; channel-specific only; public fail-closed if combination unfrozen |
| `policy_not_frozen` | **Fail closed** — no public score; draft may compute only constructs with frozen policy |
| `conflict` | Withhold affected construct; may withhold aggregate |
| `insufficient` / `undated_only` / `unsupported` | Construct unavailable |

### Same-day DXA/BIA

Score implementation **requires a separate measurement-day ADR** before relying on same-day precedence. Do not invent day boundary inside score math. Until then, matching DXA+BIA remains Resolver `policy_not_frozen`.

---

## 17. Demographics

| Factor | Rule | Status |
|--------|------|--------|
| Sex | Required for H2/H3/P1/P3; withhold sex-dependent scores if missing; no mixed-sex thresholds | LOCKED |
| Age | Adult eligibility; absolute favorability; optional low-lean floor context; no age-percentile score | LOCKED |
| Ethnicity | Not collected/used for scoring V1; document population limitations; future validation need | LOCKED |

---

## 18. Method / device

- Consume Resolver-selected evidence only.
- Prefer **method-aware channel choice** over device quality coefficients.
- Same construct transform may apply to FMI/FFMI/ALMI **indices** once computed, but method provenance must remain labeled; do not pretend DXA BF% ≡ BIA BF% without caveats.
- Device quality coefficients: **not used** until scientifically frozen Device Model Registry.
- Unknown-protocol Waist: cannot drive standardized WHtR H1.

---

## 19. Trend / volatility / smoothing

| Topic | Decision |
|-------|----------|
| Score content | **Current-state only** from current resolved evidence |
| Prior measurements / trend | Display separately; **not** inside score |
| Hidden averaging / smoothing | **Forbidden** |
| Volatility control | Resolver/source precedence + method quality; not score EMA |

---

## 20. Mathematical forms (summary)

### 20.1 Health

```text
H1 = H1_whtr(WHtR)                    # VAT non-scoring V1
H2 = H2_fmi(FMI, sex) or H2_bf(BF%, sex)
H3 = H3_almi(ALMI, sex) or H3_ffmi(FFMI, sex)

weights = {H1:0.45, H2:0.35, H3:0.20}  # renormalize among available
base = Σ w_i * S_i / Σ w_i
health = severity_dampen(base, H1, H2)
health = clip(health, 0, 100)
```

### 20.2 Performance

```text
P1 = P1_ffmi(FFMI, sex)
P3 = P3_fmi(FMI, sex) or P3_bf(BF%, sex)
base = 0.5*P1 + 0.5*P3
perf = adiposity_dampen(base, P3)
perf = clip(perf, 0, 100)
```

### 20.3 Monotonicity / shape tests (required before any unflag)

1. H1: ∂score/∂WHtR ≤ 0 for WHtR ≥ 0.40 (except explicit low-side floor region documented).
2. H2/P3: moving toward plateau improves; moving away lowers.
3. H3/P1: non-decreasing until plateau; flat thereafter.
4. Continuity at all piecewise knots (tolerance ≤ 1 score point).
5. Dampening never raises score.
6. Missing construct ≠ 0 contribution.

---

## 21. Withholding reason codes (machine-readable)

```text
insufficient_core_constructs
policy_not_frozen
confidence_policy_not_frozen   # public gate only
evidence_too_old               # when recency thresholds frozen
required_sex_missing
required_height_missing
required_age_missing
unresolved_construct
unsupported_method
multiple_valid_unfrozen
conflict_unresolved
preliminary_only
public_release_not_authorized
```

Separate:

- `calculation_unavailable`
- `calculated_internal_not_public`

---

## 22. Private / public staging

| Phase | Meaning | Requirements |
|-------|---------|--------------|
| DRAFT INTERNAL | Tests/harness only | Spec + unit invariants |
| DEVELOPMENT | Debug output behind flag | Independent planning/spec PASS |
| PROVISIONAL USER | User-visible with provisional framing | Calibration + fairness smoke + legal copy |
| PUBLIC V1 | Validated release | Full validation pack + Confidence/recency gates + ADR acceptance |

Calibration / independent scientific review / distribution testing / fairness / longitudinal validation: required before PUBLIC V1; partial before PROVISIONAL USER.

---

## 23. Calibration dataset requirements

Must cover (synthetic + consented research datasets; **not** one user):

- Sex (male/female; reference-sex policy)
- Adult age range (e.g. 20–80+)
- Height/body-size range
- Adiposity range (deficit → class III FMI)
- Lean range (sarcopenic → highly muscular)
- Race/ethnicity representation for **bias audit** even though ethnicity unused in score
- Methods: protocol Waist, DXA, BIA, manual BF

Forbidden: calibrate transforms to make one subject score well.

---

## 24. Validation dimensions

| Dimension | Health | Performance |
|-----------|--------|-------------|
| Construct validity | Maps to central/total/lean composition — not disease | Maps to muscularity + adiposity support — not VO₂/strength |
| Face validity | Expert + adversarial case review | Same |
| Discriminant | Separates high central vs high lean phenotypes | Separates high muscle/high fat vs high muscle/normal fat |
| Convergent | Correlates with WHtR/FMI/ALMI in expected directions | Correlates with FFMI/FMI |
| Sensitivity | Responds to meaningful Waist/FM/lean changes | Same |
| Stability | Resistant to method noise without hidden smoothing | Same |
| Longitudinal | Tracks composition change directionally | Same |

**Must not claim** disease prediction or athletic performance prediction without separate clinical/performance outcome studies.

---

## 25. Fairness / bias risks

| Population | Risk | Mitigation |
|------------|------|------------|
| Sex | Wrong thresholds if mixed | Sex required; sex-specific anchors |
| Age | Rewarding decline if percentile used | Absolute scoring |
| Tall/short | BF% bias; FMI/FFMI/ALMI preferred | Index preference |
| Ancestry | WC ethnicity models unused; residual bias possible | Document; audit distributions |
| Athletes / very muscular | High FFMI plateau; high FMI+FFMI phenotypes | Plateau + dampening |
| Very lean | Low-adiposity penalty; avoid shame copy | Soft-U + careful UX |
| Obesity | H1/H2 dominance appropriate | Bottleneck |
| Older adults | Sarcopenia floors ≠ diagnosis | Floor context + disclaimers |

---

## 26. Sensitivity / adversarial (synthetic only)

Synthetic grids should sweep:

- WHtR 0.35–0.80
- FMI sex-specific 1–22
- ALMI/FFMI sex-specific low→high
- Missing H3; BIA-only; DXA-only; old DXA + current Waist; `multiple_valid`; `policy_not_frozen`; unknown-protocol Waist

Expected behaviors:

| Case | Expected |
|------|----------|
| High muscle + high adiposity | Performance capped by P3 dampening; Health limited by H1/H2 |
| Low muscle + low adiposity | Both scores reduced (H3/P1 + low-fat penalties) |
| Favorable WHtR + high FMI | Health pulled down by H2; not rescued by H1 alone |
| High VAT + favorable other | Explanatory VAT; public fail-closed if H1 combination unfrozen |
| Missing H3 | Health recalculated on H1+H2; coverage note |
| Conflicting sources | Withhold / fail closed |
| Unknown protocol Waist | No standardized H1 |

No personal fixtures committed.

---

## 27. Explanation / UX (plan only — no UI)

Card fields (future):

- Score (integer) + version
- Short plain-language meaning
- Contributing constructs + values used
- Evidence withheld / why
- Limiting factors
- Assessment Confidence factual state (labels when frozen)
- One next Improve Accuracy action

Avoid: shame, “perfect body,” aesthetics, medical certainty.

Improve Accuracy priority (conceptual LOCKED):

1. Standardized Waist
2. Body composition (FM/BF)
3. Lean assessment / full composition
4. Current scan if stale high-quality evidence needed

---

## 28. Versioning

| ID | Status |
|----|--------|
| `body_composition_health_score_draft_v1` | Active internal draft ID |
| `body_composition_performance_score_draft_v1` | Active internal draft ID |
| `body_composition_health_v1` | RESERVED — not production-frozen |
| `body_composition_performance_general_v1` | RESERVED — not production-frozen |

Any algorithm change → version bump + rationale + tests + scientific re-gate. Historical scores interpretable under their version.

---

## 29. Persistence plan (planning only)

**Recommendation:** versioned snapshots when user-visible; runtime-derived acceptable for draft/harness.

| Concern | Snapshot | Derived-only |
|---------|----------|--------------|
| Longitudinal history | Strong | Weak |
| Auditability | Strong | Depends on source retention |
| Source deletion | Keep score + source refs/tombstones | Score disappears |
| Algorithm revisions | Preserve old version rows | Recompute changes history |

Export/delete: if persisted, include algorithm version + source refs; account deletion removes scores. If derived, source export remains authority.

**No persistence implementation in this phase.**

---

## 30. Regulatory / claim boundary

**Allowed framing:** wellness body-composition assessment; evidence-informed; not a diagnosis.

**Forbidden claims:**

- Diagnoses disease / obesity class as medical determination via score
- Predicts mortality, diabetes, CVD events as probability
- Measures strength, VO₂, fitness, sport readiness
- “Clinically validated” / “medical device” without regulatory pathway
- “Perfect / Elite / Optimized body”
- Ethnicity-adjusted clinical risk from unvalidated WC models

---

## 31. Research traceability (key numerics)

| Numeric | Source | Evidence type | Population | Class |
|---------|--------|---------------|------------|-------|
| WHtR 0.5 boundary | Ashwell reviews; NICE NG246 | SR/MA + guideline | Multi-ethnic adults | EVIDENCE-DERIVED anchor |
| WHtR 0.40–0.49 / 0.50–0.59 / ≥0.60 | NICE NG246 | Guideline | Adults BMI<35; all sexes/ethnicities (NICE) | EVIDENCE-DERIVED bands |
| FMI class tables | Kelly et al. 2009 NHANES DXA | Population reference | US adults; sex-specific | EVIDENCE-DERIVED anchors |
| FFMI normal-BMI ranges | Kyle 2003; Schutz FFMI percentiles | BIA population | Swiss Caucasian | EVIDENCE-DERIVED / method-bound |
| ALMI 7.0 / 5.5 | EWGSOP2 | Consensus | Older adults primarily | EVIDENCE-DERIVED floor context |
| Essential fat ~5%/10% | Educational physiology sources | Educational | General | CONTEXT ONLY |
| Health weights 45/35/20 | Oli product review | Product | N/A | PRODUCT POLICY |
| Dampening caps | Oli product doctrine | Product | N/A | PRODUCT POLICY |
| VAT g cutoffs ~700–1200 | Device-specific papers | Observational | GE DXA cohorts | CONTEXT; not V1 score math |
| P2 = 0% V1 | Oli product amendment | Product | N/A | PRODUCT POLICY |

---

## 32. GO / NO-GO (this planning pass)

| Gate | Verdict |
|------|---------|
| Health score engine implementation | **CONDITIONAL GO** — draft behind flag after independent planning/spec PASS; coeffs provisional |
| Performance score engine implementation | **CONDITIONAL GO** — same; weaker outcome evidence |
| Public Health score | **NO-GO / STAGED** |
| Public Performance score | **NO-GO / STAGED** |

Engine GO ≠ public numeric GO.

**Still blocking full math freeze:** exact transform coefficients; dampening numbers; VAT combination; Confidence label assignment; recency half-lives; same-day ADR; ADR amendment acceptance; calibration.

---

END OF SCIENTIFIC SPECIFICATION V1
