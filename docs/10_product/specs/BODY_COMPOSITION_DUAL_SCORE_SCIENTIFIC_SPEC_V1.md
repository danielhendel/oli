# Body Composition Dual Score — Scientific Specification V1

**Document type:** Scientific / product specification (draft_v1 math freeze)
**Date:** 2026-10-04
**Corrects independent review FAIL at:** `93f5960b98326b2de4116f08d2eb15564b321dc5`
**Scientific blocker-correction SHA:** `6fa8cb22b5a90982057f27c68a27743c4103df47`
**Companion freeze:** `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_DECISION_FREEZE_V1.md`
**Review response:** `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_SCIENTIFIC_REVIEW_RESPONSE_V1.md`
**Mathematical truth freeze:** `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_MATHEMATICAL_TRUTH_FREEZE_V1.md`
**Model status:** `evidence_informed` — **not** `clinically_validated`
**Scope:** Docs / scientific policy only. **No score engine. No UI. No persistence.**

| Gate | Status |
|------|--------|
| Scientific specification | **PASS** |
| Independent Scientific Re-Gate V2 | **PASS** |
| Final mathematical truth freeze | **CURRENT** / pending independent freeze review |
| Runtime implementation | **BLOCKED** until mathematical freeze re-gate PASS |
| Public Health / Public Performance-Supporting | **NO-GO** |

Version IDs:

- Health: `body_composition_health_score_draft_v1`
- Performance-Supporting: `body_composition_performance_supporting_score_draft_v1`

Every numeric constant below is either **EVIDENCE-DERIVED REFERENCE** (location/class only) or **DRAFT PRODUCT POLICY**. Score-space values are never medical fact.

**Implementation authority:** after mathematical freeze re-gate PASS, implementers must follow `BODY_COMPOSITION_DUAL_SCORE_MATHEMATICAL_TRUTH_FREEZE_V1.md` (if conflict, mathematical freeze wins for draft_v1 runtime math).

---

## 0. Input stack (unchanged)

```text
CANONICAL EVIDENCE → EVIDENCE RESOLVER → ASSESSMENT CONFIDENCE → SCORE ENGINE (future)
```

Score engines must not query Firebase, select evidence, override Resolver, infer methods, repair provenance, convert unknown protocol to known, use parser-confidence, or use excluded evidence.

Score engines must not become a second Resolver.

Domain exclusion: strength, VO2 max, cardiovascular performance, sleep, activity, nutrition, labs, bone density, disease probabilities, attractiveness, sport ranking do **not** enter these indices.

---

## 1. Names and claims

### 1.1 Health Composition

**Means:** How favorable is this person's current body composition for long-term health context, based on evidence Oli can responsibly assess?

**Does not mean:** disease probability; diagnosis; mortality prediction; clinical risk calculator; attractiveness; fitness; medical clearance.

### 1.2 Performance-Supporting Composition

**Means:** An evidence-informed index of how the user's current body composition may support general physical performance.

**Does not mean:** measured athletic performance; strength; endurance; VO2 max; power; sport ranking; bodybuilding or physique score; performance prediction.

Former public name "Performance Composition" is **retired** for overclaim (Defect 6). Internal id: `performance_support`.

### 1.3 Scale

0–100 is a **versioned product index**, not a probability, percentile, or clinical score.

| Bound | Meaning |
|-------|---------|
| 100 | Model saturation bound for this version |
| 0 | Lower modeled bound for this version |

Not zero risk, perfect health, or maximum human performance.

### 1.4 Precision

| Layer | Rule |
|-------|------|
| Internal | IEEE-754 float, then clip to [0, 100] |
| Integer emission (optional internal) | round half up: `floor(x + 0.5)` |
| Public display / bands | **NOT FROZEN** — public numeric blocked |

### 1.5 Transform family (LOCKED)

**Continuous piecewise linear** with shared endpoints at knots.

```text
lerp(x, x0, x1, y0, y1) = y0 + (y1 - y0) * (x - x0) / (x1 - x0)
# requires x0 < x1
```

No splines, logistics, or implementation-time curve choice.

---

## 2. Construct framework

| ID | Name | Role | Numeric draft_v1 |
|----|------|------|------------------|
| H1 | Central Adiposity | CORE | Yes — WHtR |
| H2 | Total Adiposity | CORE | Yes — DXA FMI only |
| H3 | Lean Reserve (adequacy) | CORE | Yes — DXA ALMI or DXA FFMI |
| H4 | Fat Distribution | Explanatory | 0% |
| P1 | Muscularity | CORE | Yes — DXA FFMI only |
| P2 | Regional Lean | Informational | 0% |
| P3 | Performance-supporting adiposity | CORE | Yes — DXA FMI only |
| P4 | Lean Balance | Deferred V1.1 | 0% |

ADR production amendment still requires human acceptance. This freeze does not mutate ADR files.

---

## 3. Shared helpers

```text
clip01(s) = min(100, max(0, s))

function pw_decreasing_or_plateau(x, knots, scores):
  # knots strictly increasing; scores same length
  if x <= knots[0]: return scores[0]
  for i in 0 .. n-2:
    if x <= knots[i+1]:
      return lerp(x, knots[i], knots[i+1], scores[i], scores[i+1])
  return scores[n-1]
```

Invalid / missing numeric input → construct `null` (not 0).

---

## 4. H1 — Central Adiposity

### 4.1 Eligibility

- Standardized WHtR `whtr_v1` from WHO-midpoint Waist + Height.
- Unknown protocol Waist: ineligible.
- VAT mass: **NON-SCORING V1**.
- VAT volume: **NON-SCORING V1**. No mass↔volume conversion. No H1 refinement.

If Resolver lists a resolved WHtR channel, H1 may score from that channel even when VAT is also present. VAT remains explanatory. This consumes channel output; it does **not** invent a Resolver global winner. If WHtR channel is not resolved: H1 ineligible (VAT-only is not enough).

### 4.2 Anchor classes

| WHtR | Honest class |
|------|----------------|
| 0.40–0.49 | NICE NG246 healthy central-adiposity **screening** region |
| 0.50 | NICE / Ashwell **screening boundary** ("waist < half height") |
| 0.60 | NICE **further-increased** central-adiposity screening boundary |

These are **EVIDENCE-DERIVED REFERENCE** locations. They are not score jumps and not continuous clinical coefficients.

### 4.3 Exact transform (continuous)

```text
# DRAFT PRODUCT POLICY score endpoints
# Reference locations 0.40, 0.50, 0.60 = EVIDENCE-DERIVED REFERENCE (NICE NG246)

function H1_whtr(x):
  if x is missing or not finite: return null
  if x <= 0.40: return 100
  if x <= 0.50: return lerp(x, 0.40, 0.50, 100, 80)
  if x <= 0.60: return lerp(x, 0.50, 0.60, 80, 50)
  if x <= 0.80: return lerp(x, 0.60, 0.80, 50, 0)
  return 0
```

| Constant | Value | Class |
|----------|-------|-------|
| LOW_PLATEAU | 0.40 | EVIDENCE-DERIVED REFERENCE (NICE healthy-band lower) used as product plateau start |
| Score at ≤ LOW_PLATEAU | 100 | DRAFT PRODUCT POLICY saturation |
| SCORE_AT_050 | 80 | DRAFT PRODUCT POLICY |
| SCORE_AT_060 | 50 | DRAFT PRODUCT POLICY |
| UPPER_SATURATION_POINT | 0.80 | DRAFT PRODUCT POLICY |
| LOWER_SCORE_BOUND | 0 | DRAFT PRODUCT POLICY |

**Low tail:** no additional reward below 0.40; no low-WHtR penalty.

**Invariants:** continuous at all knots; non-increasing for x ≥ 0.40; output in [0, 100].

**Sex:** WHtR channel sex-independent. **Age:** adult gate only (no age slope). **Ethnicity:** unused.

---

## 5. H2 — Total Adiposity

### 5.1 Eligibility (narrower V1)

**H2 numeric eligibility = DXA FMI ONLY.**

BF% is **not** a draft_v1 scoring channel (removes unfrozen BF% anchors and method mixing).

Fat Mass, BMI: non-scoring. Gallagher bands: education only — forbidden as score math.

Sex required. Missing sex → H2 null → Health aggregate withheld.

### 5.2 Anchor honesty

Kelly et al. 2009 NHANES DXA FMI classes (White young-adult prevalence-matched to BMI) are **descriptive / BMI-equivalent population classes**. They **bound plausible ranges**. They are **not** health-optimal plateaus.

Kyle/Schutz BIA FMI ranges are method-bound descriptive and are **not** used as DXA knots.

Low-adiposity: **OPTION B** — low-side plateau (score 80), not a calibrated RED-S/essential-fat penalty. Extremely low FMI is not rewarded above the plateau; it is also not given a claimed clinical penalty magnitude.

### 5.3 Exact transform

Favorable-product plateau score = 92 (DRAFT PRODUCT POLICY; not 100; not "clinically optimal").

**Male (DRAFT PRODUCT POLICY; Kelly classes bound the x-knots):**

```text
function H2_fmi_male(fmi):
  if fmi missing or not finite: return null
  if fmi <= 2.0:  return 80          # Kelly severe-deficit region — plateau, not penalty slope
  if fmi <= 3.5:  return lerp(fmi, 2.0, 3.5, 80, 92)
  if fmi <= 5.5:  return 92          # product favorable range inside Kelly "normal" 3–6
  if fmi <= 9.0:  return lerp(fmi, 5.5, 9.0, 92, 50)   # toward Kelly excess/obese-I
  if fmi <= 15.0: return lerp(fmi, 9.0, 15.0, 50, 10)  # toward Kelly obese III
  return 10
```

**Female:**

```text
function H2_fmi_female(fmi):
  if fmi missing or not finite: return null
  if fmi <= 3.5:  return 80
  if fmi <= 5.5:  return lerp(fmi, 3.5, 5.5, 80, 92)
  if fmi <= 8.5:  return 92          # product favorable range inside Kelly "normal" 5–9
  if fmi <= 13.0: return lerp(fmi, 8.5, 13.0, 92, 50)
  if fmi <= 21.0: return lerp(fmi, 13.0, 21.0, 50, 10)
  return 10
```

x-knots cite Kelly class boundaries as **EVIDENCE-DERIVED REFERENCE** bounds. All y-values are **DRAFT PRODUCT POLICY**.

Soft-U: high-side decline; low-side plateau (not "lower forever = better" because decline starts after the product favorable range; not a medical low-fat diagnosis).

---

## 6. H3 — Lean Reserve (adequacy)

### 6.1 Semantics

H3 is **lean adequacy / reserve**, not continuous optimization toward young-adult high lean.

- Penalize clearly low lean reserve
- Rise toward adequacy
- Plateau once adequate reserve is established
- Do not reward unlimited lean mass

EWGSOP2 ALMI < 7.0 kg/m² (men) / < 5.5 kg/m² (women) are **low-muscle quantity screening/confirmation floors** in the older-adult sarcopenia pathway. They are **not** optimal plateaus.

### 6.2 Eligibility

Resolver already freezes **ALMI over FFMI**. Score consumes that:

- If H3 primary is resolved ALMI (DXA): use `H3_almi`
- Else if H3 primary is resolved FFMI (DXA): use `H3_ffmi`
- FFM / total Lean: explanatory only
- If H3 is `policy_not_frozen` (e.g. FFM+Lean without index): fail closed

### 6.3 Age policy (LOCKED for internal draft)

**Adult-only product** (`age >= 20` years; aligns with existing adult BMI gating). **No age-adjustment** to the raw H3 transform.

This is **not** Option B age-percentile scoring (forbidden: "good for your age").

It is a conservative internal-draft stand-in for Option C: the low-end knots use EWGSOP2 as an age-independent **adequacy floor** (the older-adult screening threshold, which is also "clearly low" for younger adults). Upper saturation is modest product adequacy **above** that floor, **not** a young-adult athletic target.

**Fairness limitation (explicit):** older adults near the sarcopenia floor will not reach saturation without more lean than the floor. That is intentional adequacy, not age-normalized decline. **Public release remains blocked** pending age-fairness validation.

If a later age-aware floor is justified, it requires a new version — not implementation invention.

### 6.4 Exact ALMI transform

**Male:**

```text
function H3_almi_male(almi):
  if almi missing or not finite: return null
  if almi <= 6.0: return 15
  if almi <= 7.0: return lerp(almi, 6.0, 7.0, 15, 55)   # 7.0 = EWGSOP2 floor (EVIDENCE-DERIVED REFERENCE)
  if almi <= 8.0: return lerp(almi, 7.0, 8.0, 55, 92)   # 8.0 = product adequacy saturation (DRAFT PRODUCT POLICY)
  return 92
```

**Female:**

```text
function H3_almi_female(almi):
  if almi missing or not finite: return null
  if almi <= 4.5: return 15
  if almi <= 5.5: return lerp(almi, 4.5, 5.5, 15, 55)   # 5.5 = EWGSOP2 floor
  if almi <= 6.3: return lerp(almi, 5.5, 6.3, 55, 92)   # 6.3 = product adequacy saturation
  return 92
```

### 6.5 Exact FFMI transform (secondary when Resolver primary is FFMI)

Kyle normal-BMI FFMI (men 16.7–19.8; women 14.6–16.8) = **descriptive BIA/Caucasian reference**, method-bound. Used only to **bound** DXA FFMI product knots, not as optima. DXA vs BIA residual bias remains a limitation; V1 still requires DXA FFMI.

**Male:**

```text
function H3_ffmi_male(ffmi):
  if ffmi missing or not finite: return null
  if ffmi <= 16.0: return 15
  if ffmi <= 16.7: return lerp(ffmi, 16.0, 16.7, 15, 55)  # 16.7 Kyle lower descriptive bound
  if ffmi <= 18.5: return lerp(ffmi, 16.7, 18.5, 55, 92)  # 18.5 product adequacy (not Kyle upper 19.8 "optimal")
  return 92
```

**Female:**

```text
function H3_ffmi_female(ffmi):
  if ffmi missing or not finite: return null
  if ffmi <= 14.0: return 15
  if ffmi <= 14.6: return lerp(ffmi, 14.0, 14.6, 15, 55)
  if ffmi <= 16.0: return lerp(ffmi, 14.6, 16.0, 55, 92)
  return 92
```

No upper Health penalty for high lean. Plateau forbids infinite reward.

---

## 7. H4

0% numeric V1. Display/explanatory only. No ≤10% H1 refinement.

---

## 8. Health aggregation

### 8.1 Weights — DRAFT PRODUCT POLICY — DRAFT V1

```text
w_H1 = 0.45
w_H2 = 0.35
w_H3 = 0.20
```

Not evidence-derived relative importance. Nearby 50/30/20 and 40/40/20 are rank-stable (synthetic Spearman ≈ 0.99; mean |Δ| ≈ 1.6; worst-case |Δ| ≈ 4.5 on a 400-point male grid). Retained for central priority without equal-adiposity collapse.

### 8.2 No dampening (LOCKED V1)

**REMOVE** H1 severity dampening from draft_v1. H1 already contributes 45%. Revisit only after calibration.

```text
function Health_aggregate(H1, H2, H3):
  if any of H1, H2, H3 is null: return null   # no silent renormalization
  return clip01(0.45*H1 + 0.35*H2 + 0.20*H3)
```

### 8.3 Missing data

Full Health Composition 0–100 requires **H1 + H2 + H3**.

| Missing | Aggregate |
|---------|-----------|
| H1 or H2 or H3 | **Withheld** — `incomplete_health_composition` or `insufficient_core_constructs` |
| H4 | Ignored (0% by design) |

Available construct scores may be returned for explanation. They are **not** the Health Composition aggregate.

BMI-only: forbidden. One-construct public/internal aggregate: forbidden.

---

## 9. P1 — Muscularity (Performance-Supporting)

### 9.1 Eligibility — FFMI ONLY

Does **not** add Resolver precedence FFMI > FFM > Lean.

```text
if P1 construct status in {policy_not_frozen, conflict, insufficient, undated_only, unsupported}:
  P1 = null  # fail closed
else if FFMI channel status in {resolved, resolved_with_supporting} and method is DXA:
  P1 = P1_ffmi(FFMI, sex)
else:
  P1 = null
```

FFM and total Lean: explanatory / non-scoring.

### 9.2 Exact transform

Kyle ranges = descriptive reference bounds, not performance optima. Prior ~20–22 / ~17.5 values are **product saturation candidates**, not validated performance-optimal thresholds.

**Male:**

```text
function P1_ffmi_male(ffmi):
  if ffmi missing or not finite: return null
  if ffmi <= 16.0: return 10
  if ffmi <= 16.7: return lerp(ffmi, 16.0, 16.7, 10, 40)
  if ffmi <= 19.0: return lerp(ffmi, 16.7, 19.0, 40, 90)  # through Kyle descriptive band
  if ffmi <= 20.5: return lerp(ffmi, 19.0, 20.5, 90, 95)  # PRODUCT SATURATION approach
  return 95   # saturation 20.5 / 95 = DRAFT PRODUCT POLICY (not Kouri 25; not sport optimum)
```

**Female:**

```text
function P1_ffmi_female(ffmi):
  if ffmi missing or not finite: return null
  if ffmi <= 14.0: return 10
  if ffmi <= 14.6: return lerp(ffmi, 14.0, 14.6, 10, 40)
  if ffmi <= 16.5: return lerp(ffmi, 14.6, 16.5, 40, 90)
  if ffmi <= 17.5: return lerp(ffmi, 16.5, 17.5, 90, 95)
  return 95
```

Increasing → plateau. Sex required. Age: adult-only; no age slope (same fairness limitation as H3).

---

## 10. P2

0% numeric. Informational. Must not score symmetry (P4 deferred). Must not substitute for P1.

---

## 11. P3 — Performance-supporting adiposity

### 11.1 Eligibility

**P3 numeric eligibility = DXA FMI ONLY** (same H2 index, different transform). BF% not scoring.

Sex required.

### 11.2 Exact transform

Soft-U product architecture. Wider favorable plateau than Health H2 (general movement support, not contest leanness). Low side: same OPTION B plateau (80), not bodybuilding or RED-S diagnosis.

**Male:**

```text
function P3_fmi_male(fmi):
  if fmi missing or not finite: return null
  if fmi <= 2.0:  return 80
  if fmi <= 3.0:  return lerp(fmi, 2.0, 3.0, 80, 92)
  if fmi <= 7.0:  return 92     # wider product plateau than H2
  if fmi <= 10.0: return lerp(fmi, 7.0, 10.0, 92, 45)
  if fmi <= 16.0: return lerp(fmi, 10.0, 16.0, 45, 8)
  return 8
```

**Female:**

```text
function P3_fmi_female(fmi):
  if fmi missing or not finite: return null
  if fmi <= 3.5:  return 80
  if fmi <= 5.0:  return lerp(fmi, 3.5, 5.0, 80, 92)
  if fmi <= 10.0: return 92
  if fmi <= 14.0: return lerp(fmi, 10.0, 14.0, 92, 45)
  if fmi <= 22.0: return lerp(fmi, 14.0, 22.0, 45, 8)
  return 8
```

All y-values DRAFT PRODUCT POLICY. x-knots bounded by Kelly descriptive classes.

---

## 12. Performance-Supporting aggregation

### 12.1 Weights — DRAFT PRODUCT POLICY — DRAFT V1

```text
w_P1 = 0.50
w_P3 = 0.50
```

Synthetic rank-stability vs 60/40 and 40/60: Spearman ≈ 0.96–0.98.

### 12.2 No extra P3 dampening (LOCKED V1)

P3 already contributes 50%.

```text
function PerformanceSupporting_aggregate(P1, P3):
  if P1 is null or P3 is null: return null
  return clip01(0.50*P1 + 0.50*P3)
```

No preliminary aggregate. Missing one core → withhold.

---

## 13. Method profile (LOCKED) — Option A DXA-only

| Score | H1 / Waist | Composition indices |
|-------|------------|---------------------|
| Health | Standardized WHO-midpoint WHtR (manual/protocol path) | H2 FMI + H3 ALMI/FFMI from **DXA** |
| Performance-Supporting | n/a | P1 FFMI + P3 FMI from **DXA** |

Unsupported: consumer BIA, unknown method, mixed DXA+BIA in one aggregate, Bod Pod/other as FMI/FFMI drivers.

Same-scan DXA supplying both FMI and ALMI/FFMI is the intended Health composition pair.

H1 remains an independent anthropometry channel (not a DXA VAT substitute).

Device quality coefficients: unused.

---

## 14. Same-era / recency (LOCKED) — DRAFT PRODUCT POLICY

Not a physiologic half-life. Combination eligibility for multi-source aggregates.

Let `T*` be `assessment_as_of` (evaluation timestamp).
Let each scoring input `i` have `measuredAt_i` (required).

```text
DAY = 86_400_000 ms
MAX_AGE_MS = 180 * DAY
MAX_GAP_MS = 90 * DAY

function era_ok(inputs):
  for i in inputs:
    if measuredAt_i missing: return false
    if (T* - measuredAt_i) > MAX_AGE_MS: return false   # inclusive: == 180d OK
  for each pair i < j:
    gap = abs(measuredAt_i - measuredAt_j)
    if same_verified_body_scan(i, j): gap = 0
    if gap > MAX_GAP_MS: return false                  # inclusive: == 90d OK
  return true
```

`same_verified_body_scan`: both indices derive from the same verified Body Scan `sourceEventId`.

Standardized Waist may combine with that scan **only if** Waist `measuredAt` is within 90 days of the scan `measuredAt` **and** both pass the 180-day currentness rule.

| Case | Behavior |
|------|----------|
| All inputs same date | Eligible (if currentness OK) |
| 1-day gap | Eligible |
| Exactly 90 days | Eligible |
| 90 days + 1 ms | `evidence_era_mismatch` — withhold aggregate |
| Input age exactly 180 days | Eligible |
| 180 days + 1 ms | `evidence_too_old` — withhold aggregate |
| Years-old DXA + current Waist | Withhold |
| Undated | Fail closed |

Public numeric remains blocked even when era_ok.

---

## 15. Resolver gating (LOCKED)

| Status | Score |
|--------|-------|
| `resolved` | Eligible if method/construct requirements met |
| `resolved_with_supporting` | Use frozen primary channel only |
| `multiple_valid` | Fail closed **except** H1 WHtR-only numeric when WHtR channel is resolved and VAT is explanatory (frozen combination) |
| `policy_not_frozen` | Fail closed |
| `conflict` | Fail closed |
| `insufficient` | Fail closed |
| `undated_only` | Fail closed |
| `unsupported` | Fail closed |

H2/P3 `multiple_valid` without FMI primary: fail closed (FMI-only eligibility).
P1 `policy_not_frozen`: fail closed.

Same-day DXA/BIA day-boundary ADR remains **OPEN / DEFERRED**. Score does not invent it. Matching DXA+BIA that yields Resolver `policy_not_frozen` fail-closes.

---

## 16. Assessment Confidence

Qualitative labels (Limited / Moderate / Good / Strong) are **not** required for internal calculation. Assignment matrix remains 0 rules. Do not invent labels.

Factual eligibility (Resolver statuses + method + era + cores) is required.

Public scores separately gated.

---

## 17. Demographics

| Factor | Rule |
|--------|------|
| Sex | Required for H2, H3, P1, P3. Missing → aggregate unavailable. H1 WHtR sex-independent. No mixed-sex thresholds. |
| Age | Adult-only (`age >= 20`). No age slope. No age percentile. Fairness limitation documented. Public blocked pending age-fairness validation. |
| Ethnicity | Not used in V1 math. Fairness-validation required. No ancestry-specific WC/WHtR/FMI adjustment. |

---

## 18. Trend / smoothing

Current-state only. No trend input. No score smoothing. Evidence aggregation remains upstream.

---

## 19. Withholding codes

```text
insufficient_core_constructs
incomplete_health_composition
policy_not_frozen
evidence_too_old
evidence_era_mismatch
required_sex_missing
required_height_missing
required_age_missing
unresolved_construct
unsupported_method
multiple_valid_unfrozen
conflict_unresolved
p1_ffmi_not_resolved
public_release_not_authorized
```

`calculation_unavailable` vs `calculated_internal_not_public` remain distinct. Internal draft still must not emit public 0–100.

---

## 20. Regulatory

Wellness composition **product indices**. Forbidden: diagnosis; disease probability; mortality prediction; medical clearance; strength/VO2/fitness measurement; "clinically validated"; "perfect/elite body"; ethnicity-adjusted clinical risk.

---

## 21. Synthetic validation (no personal data)

Run at correction time against the exact formulas above.

| Check | Result |
|-------|--------|
| H1 continuity at 0.40 / 0.50 / 0.60 / 0.80 | PASS (shared endpoints) |
| H1 monotonic non-increase for WHtR ≥ 0.40 | PASS |
| H1 dense sweep cliffs (6001 pts) | max step ≈ 0.03; no 15-pt jump |
| H2 sex sweeps | Continuous; range [10, 92] |
| H3 ALMI sex sweeps | Non-decreasing; plateau |
| P1 sex sweeps | Non-decreasing; plateau |
| P3 sex sweeps | Continuous soft-U |
| NaN / out-of-range | None |
| Health grid n=9282 | [6.5, 95.6] |
| Performance-supporting grid n=578 | [9.0, 93.5] |
| Health 45/35/20 vs 50/30/20 | Spearman 0.990; mean \|Δ\| 1.64; max \|Δ\| 4.50 |
| Health vs 40/40/20 | Spearman 0.990; mean \|Δ\| 1.64; max \|Δ\| 4.50 |
| Perf 50/50 vs 60/40 | Spearman 0.979; mean \|Δ\| 3.66; max \|Δ\| 8.66 |
| Missing H1/H2/H3/P1/P3 | Aggregate withheld (no silent renormalization) |
| Era 90d inclusive / 91d | Eligible / withhold (by frozen inequality) |
| DXA-only vs BIA | BIA → unsupported_method |
| Adversarial severe H1 + high lean | Health ≈ 59.6 (H1 weight, no extra dampening) |
| Favorable WHtR + high FMI | Health ≈ 64.7 (H2 pulls down) |
| Low lean + favorable adiposity | Health ≈ 77.3 (H3 adequacy penalty) |
| High FFMI + high FMI | PS ≈ 57.7 |
| High FFMI + very low FMI | PS ≈ 87.5 (low-side plateau 80, not 100) |
| Low FFMI + favorable FMI | PS ≈ 51.0 |
| Unknown Waist protocol | H1 ineligible → Health withheld |
| Resolver policy_not_frozen / conflict | Fail closed |

---

## 22. GO / NO-GO after this freeze

| Gate | Verdict |
|------|---------|
| Scientific specification | **PASS** |
| Independent Scientific Re-Gate V2 | **PASS** (SHA `6fa8cb22…`) |
| Final mathematical truth freeze | **CREATED** — pending independent mathematical/docs freeze re-gate |
| Health internal draft engine (code) | **STILL BLOCKED** until mathematical freeze re-gate PASS |
| Performance-Supporting internal draft engine (code) | **STILL BLOCKED** until mathematical freeze re-gate PASS |
| Public Health | **NO-GO** |
| Public Performance-Supporting | **NO-GO** |

Engineers may not implement until the mathematical truth freeze receives independent re-gate PASS. This document freezes product-policy science; `BODY_COMPOSITION_DUAL_SCORE_MATHEMATICAL_TRUTH_FREEZE_V1.md` is the implementation-authority math freeze.

---

END OF SCIENTIFIC SPECIFICATION V1 (blocker correction + mathematical freeze pointer)
