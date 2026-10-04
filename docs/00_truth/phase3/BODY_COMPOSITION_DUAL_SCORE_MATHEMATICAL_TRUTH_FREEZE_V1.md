# Body Composition Dual Score — Mathematical Truth Freeze V1

**Document type:** Final mathematical / implementation-authority freeze (docs only)
**Date:** 2026-10-04
**Branch:** `feat/body-composition-stage3e-body-scans-v1`
**Kind:** Documentation only. **Does not** represent a score-engine runtime build.

| Identity | Value |
|----------|-------|
| Scientific blocker-correction SHA | `6fa8cb22b5a90982057f27c68a27743c4103df47` |
| Independent Scientific Re-Gate V2 | **PASS** |
| Prior scientific-planning SHA | `93f5960b98326b2de4116f08d2eb15564b321dc5` |
| Health engine version | `body_composition_health_score_draft_v1` |
| Performance-Supporting engine version | `body_composition_performance_supporting_score_draft_v1` |
| This freeze commit SHA | recorded in completion report after commit (not self-embedded) |

**Authority for implementation:** this file.
**Companion science:** `docs/10_product/specs/BODY_COMPOSITION_DUAL_SCORE_SCIENTIFIC_SPEC_V1.md`
**Decision freeze:** `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_DECISION_FREEZE_V1.md`
**Review response:** `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_SCIENTIFIC_REVIEW_RESPONSE_V1.md`

If this freeze and any older prose conflict, **this freeze wins** for draft_v1 engine math.
No TBD. No tune-later. No implementation-time scientific choice.

**Runtime implementation:** **BLOCKED** until independent mathematical/docs freeze re-gate PASS.
**Public Health / Public Performance-Supporting:** **NO-GO**.
**Production:** UNTOUCHED.

---

## 0. Input stack (non-negotiable)

```text
CANONICAL EVIDENCE → EVIDENCE RESOLVER → ASSESSMENT CONFIDENCE (factual) → SCORE ENGINE
```

Score engines must **not**:

- query Firebase;
- select evidence;
- override Resolver status;
- invent Resolver precedence;
- infer source methods;
- repair missing provenance;
- convert unknown Waist protocol → WHO midpoint;
- use parser-confidence;
- use excluded evidence;
- invent Assessment Confidence labels;
- become a second Resolver.

Excluded domains (never enter either index): strength, VO₂ max, cardiovascular performance, sleep, activity, nutrition, labs, bone density, disease probabilities, attractiveness, sport ranking.

---

## 1. Product names

| Role | Name | Internal id |
|------|------|-------------|
| Health index | **Health Composition** | `health_protection` |
| Second index | **Performance-Supporting Composition** | `performance_support` |

Former name **Performance Composition** is superseded for these scores (historical mentions may remain when clearly historical).

### 1.1 Health Composition means

An evidence-informed, versioned product index describing how favorable the user's current body composition is within Oli's draft long-term-health composition model.

**Does not mean:** diagnosis; disease probability; mortality prediction; clinical risk; medical clearance; perfect health.

### 1.2 Performance-Supporting Composition means

An evidence-informed, versioned product index describing how the user's current body composition may support general physical performance.

**Does not measure or predict:** strength; VO₂ max; endurance; power; sport performance; athletic ranking.

---

## 2. Score semantics

| Item | Rule |
|------|------|
| Scale | 0–100 inclusive |
| Direction | Higher = more favorable within the draft product model |
| 0 | Lower modeled saturation bound — **not** certain disease / zero capacity |
| 100 | Upper modeled saturation bound — **not** perfect health / zero risk / max performance |
| Kind | **VERSIONED PRODUCT INDEX** — not probability, percentile, or clinical score |
| Model status | `evidence_informed` — not clinically validated |

---

## 3. Shared mathematics

### 3.1 `lerp` (LOCKED)

For `x0 < x1` and `x0 < x < x1`:

```text
lerp(x, x0, x1, y0, y1) =
  y0 + ((x - x0) / (x1 - x0)) * (y1 - y0)
```

At exact knot `x == xi`: return exact knot `yi` (shared endpoints ⇒ continuity).

### 3.2 Clip

```text
clip01(s) = min(100, max(0, s))
```

### 3.3 Non-finite

If any required numeric input is missing, `NaN`, `+Infinity`, or `-Infinity`:

- that construct returns `null` (not 0);
- aggregate is withheld (not 0).

### 3.4 Precision

| Layer | Rule |
|-------|------|
| Construct transforms | IEEE-754 double / JS Number; **no** intermediate rounding |
| Aggregate | computed from unrounded construct floats |
| Final construct / aggregate emission | `clip01` only |
| Optional internal integer projection | `floor(x + 0.5)` half-up **only if** emitting integer debug projection |
| Public display / bands | **NOT AUTHORIZED** / **NOT FROZEN** |

### 3.5 Day constants

```text
DAY_MS = 86_400_000
MAX_AGE_MS = 180 * DAY_MS
MAX_GAP_MS = 90 * DAY_MS
```

Inclusive boundaries: `age_ms <= MAX_AGE_MS` eligible; `gap_ms <= MAX_GAP_MS` eligible.

---

## 4. Canonical withholding vocabulary (LOCKED)

Use **only** these reason codes (from approved scientific spec). Never invent synonyms at runtime.

| Code | When |
|------|------|
| `incomplete_health_composition` | Health aggregate withheld because any of H1/H2/H3 is `null` after eligibility |
| `insufficient_core_constructs` | Performance-Supporting aggregate withheld because P1 or P3 is `null`; also usable as Health synonym only if Health already uses `incomplete_health_composition` as primary |
| `policy_not_frozen` | Required construct/channel Resolver status is `policy_not_frozen` |
| `evidence_too_old` | Any scoring input has `(asOf - measuredAt) > MAX_AGE_MS` |
| `evidence_era_mismatch` | Pairwise gap among scoring inputs `> MAX_GAP_MS` (after same-scan zeroing) |
| `required_sex_missing` | Sex required and missing/invalid for H2/H3/P1/P3 |
| `required_height_missing` | Height required for WHtR / FMI / FFMI / ALMI and missing/invalid |
| `required_age_missing` | Age missing/invalid **or** `age < 20` (adult draft eligibility failed) |
| `unresolved_construct` | Required construct has no eligible numeric channel; or `undated_only`; or `measuredAt` missing on a required scoring input |
| `unsupported_method` | Method outside frozen DXA / WHO-midpoint profile |
| `multiple_valid_unfrozen` | Construct-level `multiple_valid` without a governed resolved numeric channel under §10.2 |
| `conflict_unresolved` | Resolver construct status `conflict` |
| `p1_ffmi_not_resolved` | P1 eligibility failed because DXA FFMI channel is not `resolved` / `resolved_with_supporting` |
| `public_release_not_authorized` | Any attempt to emit public user-facing score |

Aggregate availability flags:

- `calculation_unavailable` — no internal numeric aggregate
- `calculated_internal_not_public` — reserved for future internal debug emission behind flag; **still not public**

**Missing / unsupported / stale / conflict never score 0.** Score `0` is only a valid model output from eligible finite evidence.

---

## 5. Demographics (both engines)

| Factor | Rule |
|--------|------|
| Age | Require finite `ageYears >= 20`. Else withhold: `required_age_missing` |
| Age slope | **None**. Identical adult composition ⇒ identical draft score |
| Sex | Required for H2, H3, P1, P3. Values: governed reference sex `male` or `female` only. Missing/other → `required_sex_missing` |
| H1 sex | Sex-independent |
| Ethnicity | **Not used** in V1 math |
| Height | Required whenever WHtR / FMI / FFMI / ALMI are used; missing → `required_height_missing` |

---

## 6. Recency / same-era (both engines) — DRAFT PRODUCT POLICY

Inputs: `asOf` (required evaluation timestamp) and each scoring input `measuredAt` (required).

```text
function age_ms(measuredAt, asOf) = asOf - measuredAt

function era_ok(scoring_inputs, asOf):
  if asOf missing or not finite: return false
  for each input i in scoring_inputs:
    if measuredAt_i missing or not finite: return false
    if age_ms(measuredAt_i, asOf) > MAX_AGE_MS: return false   # 180d inclusive OK
  for each unordered pair (i, j), i < j:
    gap = abs(measuredAt_i - measuredAt_j)
    if same_verified_body_scan(i, j): gap = 0
    if gap > MAX_GAP_MS: return false                          # 90d inclusive OK
  return true
```

`same_verified_body_scan(i, j)` is true **only** when both derive from the same verified Body Scan `sourceEventId`. Same timestamp alone is **not** sufficient.

| Case | Result |
|------|--------|
| ageDays = 180 | Eligible |
| ageDays > 180 | `evidence_too_old` |
| gap = 90 days | Eligible |
| gap > 90 days | `evidence_era_mismatch` |
| H2+H3 same `sourceEventId` | gap forced 0 |
| Waist + scan | Waist–scan gap must be ≤ 90d **and** both ≤ 180d old |
| Undated scoring input | `unresolved_construct` |

These are **not** physiological half-lives.

---

## 7. Method profile — Option A (LOCKED)

| Construct | Eligible method / metric |
|-----------|--------------------------|
| H1 | Standardized WHtR `whtr_v1` from Waist protocol `who_midpoint_v1` version `1` + governed Height |
| H2 | DXA FMI `fmi_v1` only |
| H3 | DXA ALMI `almi_v1` when Resolver primary; else DXA FFMI `ffmi_v1` only if Resolver primary is FFMI |
| P1 | DXA FFMI `ffmi_v1` only |
| P3 | DXA FMI `fmi_v1` only |

**Unsupported for numeric scoring:** consumer BIA; Withings BIA; Apple Health unlabeled composition; Bod Pod / Other as FMI/FFMI/ALMI drivers; unknown Waist protocol; mixed DXA+BIA composition aggregate.

Method failure → `unsupported_method`.

---

## 8. Resolver status contract (both engines)

| Resolver construct status | Score behavior |
|---------------------------|----------------|
| `resolved` | Eligible if method/metric/demographics/era pass |
| `resolved_with_supporting` | Use frozen **primary channel only** |
| `multiple_valid` | Fail closed **except** H1 rule §10.2 |
| `policy_not_frozen` | Fail closed → `policy_not_frozen` |
| `conflict` | Fail closed → `conflict_unresolved` |
| `insufficient` | Fail closed → construct `null` → aggregate incomplete |
| `undated_only` | Fail closed → `unresolved_construct` |
| `unsupported` | Fail closed → `unsupported_method` |

Same-day DXA/BIA day-boundary ADR remains deferred. If Resolver returns `policy_not_frozen` for that reason: fail closed. Score does not invent day boundary.

---

## 9. Assessment Confidence

| Item | Rule |
|------|------|
| Qualitative label (Limited/Moderate/Good/Strong) | **NOT REQUIRED**; must remain unused; do not invent |
| Factual gate | Required: Resolver resolution, method, dates, completeness, provenance, era, cores |
| Public display | Separately **NO-GO** |

---

## 10. H1 — Central Adiposity

### 10.1 Eligibility

- Metric: standardized WHtR `whtr_v1` only
- Waist: protocol `who_midpoint_v1`, protocol version `1`
- Height: governed, required
- VAT mass: **non-scoring**
- VAT volume: **non-scoring**
- No VAT mass↔volume conversion
- No H4 refinement

### 10.2 H1 / `multiple_valid` boundary (LOCKED — Re-Gate V2)

1. Numeric H1 uses **only** a WHtR channel that is itself `resolved` or `resolved_with_supporting`.
2. VAT channels are always non-scoring / explanatory.
3. Score engine **must not** override construct-level Resolver status or invent a global WHtR winner.
4. If WHtR channel is independently resolved while VAT is complementary (construct may still be `multiple_valid` truthfully): score WHtR value only.
5. If no governed resolved WHtR channel is exposed: H1 = `null`; reason `multiple_valid_unfrozen` or `unresolved_construct` as applicable.

### 10.3 Exact transform

x = WHtR (dimensionless). Sex-independent.

```text
function H1_whtr(x):
  if x missing or not finite: return null
  if x <= 0.40: return 100
  if x <= 0.50: return lerp(x, 0.40, 0.50, 100, 80)
  if x <= 0.60: return lerp(x, 0.50, 0.60, 80, 50)
  if x <= 0.80: return lerp(x, 0.60, 0.80, 50, 0)
  return 0
```

Expanded segments:

```text
x <= 0.40:
  y = 100

0.40 < x <= 0.50:
  y = 100 + ((x - 0.40) / (0.50 - 0.40)) * (80 - 100)
  y = 100 - 200 * (x - 0.40)

0.50 < x <= 0.60:
  y = 80 + ((x - 0.50) / (0.60 - 0.50)) * (50 - 80)
  y = 80 - 300 * (x - 0.50)

0.60 < x <= 0.80:
  y = 50 + ((x - 0.60) / (0.80 - 0.60)) * (0 - 50)
  y = 50 - 250 * (x - 0.60)

x > 0.80:
  y = 0
```

| Knot x | y | Class |
|--------|---|-------|
| 0.40 | 100 | x EVIDENCE-REFERENCE (NICE); y DRAFT PRODUCT POLICY |
| 0.50 | 80 | x EVIDENCE-REFERENCE; y DRAFT PRODUCT POLICY |
| 0.60 | 50 | x EVIDENCE-REFERENCE; y DRAFT PRODUCT POLICY |
| 0.80 | 0 | both DRAFT PRODUCT POLICY (upper saturation) |

No screening cliffs. No low-side penalty below 0.40 (plateau 100).

---

## 11. H2 — Total Adiposity

### 11.1 Eligibility

- Metric: DXA FMI only
- BF%: **non-scoring**
- Fat Mass: explanatory / non-scoring
- Sex: required
- Method: `dxa`

### 11.2 Male

```text
function H2_fmi_male(fmi):
  if fmi missing or not finite: return null
  if fmi <= 2.0:  return 80
  if fmi <= 3.5:  return lerp(fmi, 2.0, 3.5, 80, 92)
  if fmi <= 5.5:  return 92
  if fmi <= 9.0:  return lerp(fmi, 5.5, 9.0, 92, 50)
  if fmi <= 15.0: return lerp(fmi, 9.0, 15.0, 50, 10)
  return 10
```

Expanded:

```text
fmi <= 2.0: y = 80
2.0 < fmi <= 3.5: y = 80 + ((fmi-2.0)/(3.5-2.0))*(92-80) = 80 + 8*(fmi-2.0)
3.5 < fmi <= 5.5: y = 92
5.5 < fmi <= 9.0: y = 92 + ((fmi-5.5)/(9.0-5.5))*(50-92) = 92 - 12*(fmi-5.5)
9.0 < fmi <= 15.0: y = 50 + ((fmi-9.0)/(15.0-9.0))*(10-50) = 50 - (40/6)*(fmi-9.0)
fmi > 15.0: y = 10
```

### 11.3 Female

```text
function H2_fmi_female(fmi):
  if fmi missing or not finite: return null
  if fmi <= 3.5:  return 80
  if fmi <= 5.5:  return lerp(fmi, 3.5, 5.5, 80, 92)
  if fmi <= 8.5:  return 92
  if fmi <= 13.0: return lerp(fmi, 8.5, 13.0, 92, 50)
  if fmi <= 21.0: return lerp(fmi, 13.0, 21.0, 50, 10)
  return 10
```

Expanded:

```text
fmi <= 3.5: y = 80
3.5 < fmi <= 5.5: y = 80 + ((fmi-3.5)/(5.5-3.5))*(92-80) = 80 + 6*(fmi-3.5)
5.5 < fmi <= 8.5: y = 92
8.5 < fmi <= 13.0: y = 92 + ((fmi-8.5)/(13.0-8.5))*(50-92) = 92 - (42/4.5)*(fmi-8.5)
13.0 < fmi <= 21.0: y = 50 + ((fmi-13.0)/(21.0-13.0))*(10-50) = 50 - 5*(fmi-13.0)
fmi > 21.0: y = 10
```

Kelly classes = descriptive BMI-equivalent **EVIDENCE-REFERENCE** bounds for x. All y = **DRAFT PRODUCT POLICY**. Not health optima.

---

## 12. H3 — Lean Reserve / Adequacy

### 12.1 Channel selection (consume Resolver; do not invent)

```text
if H3 construct status in {policy_not_frozen, conflict, insufficient, undated_only, unsupported}:
  H3 = null
else if H3 primary channel is ALMI and status in {resolved, resolved_with_supporting} and method dxa:
  H3 = H3_almi(ALMI, sex)
else if H3 primary channel is FFMI and status in {resolved, resolved_with_supporting} and method dxa:
  H3 = H3_ffmi(FFMI, sex)
else:
  H3 = null
```

FFM / total Lean: explanatory / non-scoring. Do **not** implement ALMI>FFMI in score code (Resolver already owns that).

### 12.2 Male ALMI

```text
function H3_almi_male(almi):
  if almi missing or not finite: return null
  if almi <= 6.0: return 15
  if almi <= 7.0: return lerp(almi, 6.0, 7.0, 15, 55)
  if almi <= 8.0: return lerp(almi, 7.0, 8.0, 55, 92)
  return 92
```

Expanded:

```text
almi <= 6.0: y = 15
6.0 < almi <= 7.0: y = 15 + 40*(almi-6.0)
7.0 < almi <= 8.0: y = 55 + 37*(almi-7.0)
almi > 8.0: y = 92
```

### 12.3 Female ALMI

```text
function H3_almi_female(almi):
  if almi missing or not finite: return null
  if almi <= 4.5: return 15
  if almi <= 5.5: return lerp(almi, 4.5, 5.5, 15, 55)
  if almi <= 6.3: return lerp(almi, 5.5, 6.3, 55, 92)
  return 92
```

Expanded:

```text
almi <= 4.5: y = 15
4.5 < almi <= 5.5: y = 15 + 40*(almi-4.5)
5.5 < almi <= 6.3: y = 55 + (37/0.8)*(almi-5.5)
almi > 6.3: y = 92
```

EWGSOP2 7.0 / 5.5 = low-muscle **EVIDENCE-REFERENCE** floors, not 100-point optima. Plateau y=92 = **DRAFT PRODUCT POLICY**.

### 12.4 Male FFMI (secondary; Resolver primary only)

```text
function H3_ffmi_male(ffmi):
  if ffmi missing or not finite: return null
  if ffmi <= 16.0: return 15
  if ffmi <= 16.7: return lerp(ffmi, 16.0, 16.7, 15, 55)
  if ffmi <= 18.5: return lerp(ffmi, 16.7, 18.5, 55, 92)
  return 92
```

Expanded:

```text
ffmi <= 16.0: y = 15
16.0 < ffmi <= 16.7: y = 15 + (40/0.7)*(ffmi-16.0)
16.7 < ffmi <= 18.5: y = 55 + (37/1.8)*(ffmi-16.7)
ffmi > 18.5: y = 92
```

### 12.5 Female FFMI (secondary; Resolver primary only)

```text
function H3_ffmi_female(ffmi):
  if ffmi missing or not finite: return null
  if ffmi <= 14.0: return 15
  if ffmi <= 14.6: return lerp(ffmi, 14.0, 14.6, 15, 55)
  if ffmi <= 16.0: return lerp(ffmi, 14.6, 16.0, 55, 92)
  return 92
```

Expanded:

```text
ffmi <= 14.0: y = 15
14.0 < ffmi <= 14.6: y = 15 + (40/0.6)*(ffmi-14.0)
14.6 < ffmi <= 16.0: y = 55 + (37/1.4)*(ffmi-14.6)
ffmi > 16.0: y = 92
```

---

## 13. H4

Numeric weight = **0%**. Android/Gynoid / A/G explanatory only. Does not alter draft_v1 Health aggregate.

---

## 14. Health aggregate

### 14.1 Requirements

Full Health Composition requires **H1 and H2 and H3** all non-null after eligibility + era_ok on the set of scoring inputs used for those constructs.

### 14.2 Weights — DRAFT PRODUCT POLICY

```text
w_H1 = 0.45
w_H2 = 0.35
w_H3 = 0.20
```

### 14.3 Formula

```text
function Health_aggregate(H1, H2, H3):
  if H1 is null or H2 is null or H3 is null: return null
  return clip01(0.45 * H1 + 0.35 * H2 + 0.20 * H3)
```

### 14.4 Forbidden

No dampening; no severity cap; no H4 adjustment; no renormalization; no H1-only / H1+H2 aggregate; no missing-construct substitution with 0.

### 14.5 Missing

| Missing | Aggregate | Primary reason |
|---------|-----------|----------------|
| H1 or H2 or H3 | unavailable | `incomplete_health_composition` |
| H4 | ignored | n/a |

Construct results may be returned independently for explanation; they are **not** the Health Composition aggregate.

---

## 15. P1 — Muscularity (Performance-Supporting)

### 15.1 Eligibility — DXA FFMI ONLY

```text
if P1 construct status in {policy_not_frozen, conflict, insufficient, undated_only, unsupported}:
  P1 = null  # policy_not_frozen / conflict_unresolved / unresolved_construct / unsupported_method
else if FFMI channel status in {resolved, resolved_with_supporting} and method is dxa:
  P1 = P1_ffmi(FFMI, sex)
else:
  P1 = null  # reason p1_ffmi_not_resolved
```

FFM / total Lean: explanatory / non-scoring. **No** score-layer `FFMI > FFM > Lean`.

### 15.2 Male

```text
function P1_ffmi_male(ffmi):
  if ffmi missing or not finite: return null
  if ffmi <= 16.0: return 10
  if ffmi <= 16.7: return lerp(ffmi, 16.0, 16.7, 10, 40)
  if ffmi <= 19.0: return lerp(ffmi, 16.7, 19.0, 40, 90)
  if ffmi <= 20.5: return lerp(ffmi, 19.0, 20.5, 90, 95)
  return 95
```

Expanded:

```text
ffmi <= 16.0: y = 10
16.0 < ffmi <= 16.7: y = 10 + (30/0.7)*(ffmi-16.0)
16.7 < ffmi <= 19.0: y = 40 + (50/2.3)*(ffmi-16.7)
19.0 < ffmi <= 20.5: y = 90 + (5/1.5)*(ffmi-19.0)
ffmi > 20.5: y = 95
```

### 15.3 Female

```text
function P1_ffmi_female(ffmi):
  if ffmi missing or not finite: return null
  if ffmi <= 14.0: return 10
  if ffmi <= 14.6: return lerp(ffmi, 14.0, 14.6, 10, 40)
  if ffmi <= 16.5: return lerp(ffmi, 14.6, 16.5, 40, 90)
  if ffmi <= 17.5: return lerp(ffmi, 16.5, 17.5, 90, 95)
  return 95
```

Expanded:

```text
ffmi <= 14.0: y = 10
14.0 < ffmi <= 14.6: y = 10 + (30/0.6)*(ffmi-14.0)
14.6 < ffmi <= 16.5: y = 40 + (50/1.9)*(ffmi-14.6)
16.5 < ffmi <= 17.5: y = 90 + 5*(ffmi-16.5)
ffmi > 17.5: y = 95
```

All y = **DRAFT PRODUCT POLICY**. Not performance-optimal thresholds.

---

## 16. P2

Numeric weight = **0%**. Informational only. No symmetry scoring. No left/right averaging. No score-meaning change from regional DXA presence.

---

## 17. P3 — Performance-Supporting Adiposity

### 17.1 Eligibility

DXA FMI only. BF% non-scoring. Sex required.

### 17.2 Male

```text
function P3_fmi_male(fmi):
  if fmi missing or not finite: return null
  if fmi <= 2.0:  return 80
  if fmi <= 3.0:  return lerp(fmi, 2.0, 3.0, 80, 92)
  if fmi <= 7.0:  return 92
  if fmi <= 10.0: return lerp(fmi, 7.0, 10.0, 92, 45)
  if fmi <= 16.0: return lerp(fmi, 10.0, 16.0, 45, 8)
  return 8
```

Expanded:

```text
fmi <= 2.0: y = 80
2.0 < fmi <= 3.0: y = 80 + 12*(fmi-2.0)
3.0 < fmi <= 7.0: y = 92
7.0 < fmi <= 10.0: y = 92 + ((fmi-7.0)/3.0)*(45-92) = 92 - (47/3)*(fmi-7.0)
10.0 < fmi <= 16.0: y = 45 + ((fmi-10.0)/6.0)*(8-45) = 45 - (37/6)*(fmi-10.0)
fmi > 16.0: y = 8
```

### 17.3 Female

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

Expanded:

```text
fmi <= 3.5: y = 80
3.5 < fmi <= 5.0: y = 80 + (12/1.5)*(fmi-3.5) = 80 + 8*(fmi-3.5)
5.0 < fmi <= 10.0: y = 92
10.0 < fmi <= 14.0: y = 92 + ((fmi-10.0)/4.0)*(45-92) = 92 - (47/4)*(fmi-10.0)
14.0 < fmi <= 22.0: y = 45 + ((fmi-14.0)/8.0)*(8-45) = 45 - (37/8)*(fmi-14.0)
fmi > 22.0: y = 8
```

Not sport-specific optimal fat. y = **DRAFT PRODUCT POLICY**.

---

## 18. Performance-Supporting aggregate

### 18.1 Requirements

Requires **P1 and P3** both non-null after eligibility + `era_ok` on P1/P3 scoring inputs.

### 18.2 Weights — DRAFT PRODUCT POLICY

```text
w_P1 = 0.50
w_P3 = 0.50
```

### 18.3 Formula

```text
function PerformanceSupporting_aggregate(P1, P3):
  if P1 is null or P3 is null: return null
  return clip01(0.50 * P1 + 0.50 * P3)
```

### 18.4 Forbidden

No dampening; no severity cap; no P2 adjustment; no renormalization; no preliminary aggregate.

### 18.5 Missing

| Missing | Aggregate | Reason |
|---------|-----------|--------|
| P1 or P3 | unavailable | `insufficient_core_constructs` (or `p1_ffmi_not_resolved` when that is the sole cause) |

---

## 19. Current-state / non-persistence / non-public

| Topic | Rule |
|-------|------|
| Score content | Current eligible evidence only |
| Trend / prior scores / improvement rate | Not inputs |
| Smoothing / hidden averaging | None |
| Draft persistence | **None** — runtime-derived; no Firestore / AsyncStorage / API / Functions / score history / export / account-delete additions |
| Internal implementation (future) | Behind **non-public development flag** only |
| Consumer Body Composition UI / dashboard / public API | **Forbidden** until public authorization |
| Public Health | **NO-GO** |
| Public Performance-Supporting | **NO-GO** |

---

## 20. Public blockers (not closed by this freeze)

Calibration; fairness analysis; age fairness; broader method/access strategy; UX validation; user comprehension; longitudinal/stability evaluation; release claim review; public score/band display policy; version-migration policy.

Internal scientific/math authorization ≠ public authorization.

---

## 21. Evidence-reference vs DRAFT PRODUCT POLICY

| Item | Class |
|------|-------|
| NICE WHtR 0.40 / 0.50 / 0.60 | EVIDENCE-REFERENCE locations |
| Kelly FMI class x-bounds | EVIDENCE-REFERENCE descriptive / BMI-equivalent |
| EWGSOP2 ALMI 7.0 / 5.5 | EVIDENCE-REFERENCE low-muscle floors |
| Kyle FFMI descriptive bounds | EVIDENCE-REFERENCE context |
| Every score y-value / plateau / saturation | **DRAFT PRODUCT POLICY** |
| Weights 45/35/20 and 50/50 | **DRAFT PRODUCT POLICY** |
| 180-day max age / 90-day gap | **DRAFT PRODUCT POLICY** |
| DXA-only method restriction | **DRAFT PRODUCT POLICY** |
| 0–100 product-index interpretation | **DRAFT PRODUCT POLICY** |

Never call DRAFT PRODUCT POLICY “clinically optimal.”

---

## 22. Independent Scientific Re-Gate V2 validation (attributed)

Attributed to independent re-gate of scientific correction SHA `6fa8cb22…` — **not** clinical validation.

| Check | Result |
|-------|--------|
| H1 continuity max jump | ~3e-10 floating noise |
| Construct outputs | no out-of-range; no NaN |
| Health grid | n = 9282; min/max 6.5 / 95.6 |
| Performance-Supporting grid | n = 578; min/max 9.0 / 93.5 |
| Health weight sensitivity vs nearby | Spearman ≈ 0.991–0.994; mean \|Δ\| ≈ 1.64; max ≈ 4.5–4.6 |
| Performance weight sensitivity | Spearman ≈ 0.96–0.98; mean Δ ≈ 3.7–3.9; max ≈ 8.7 |
| Internal readiness | Health AUTHORIZED; Performance-Supporting AUTHORIZED |
| Public | both NO-GO |

---

## 23. Fairness limitations (explicit)

| Topic | Limitation |
|-------|------------|
| Sex | Sex-specific transforms where required |
| Age | Identical adult composition ⇒ identical score; public age fairness unresolved |
| Height | `/h²` indices reduce but may not eliminate residual bias |
| Method access | DXA requirement limits access; acceptable internal, not public |
| Ethnicity | No adjustment; fairness validation still required |
| Athletic phenotypes | Performance-Supporting is not sport-specific |

---

## 24. Zero-engineer-choice declaration

For draft_v1 Health and Performance-Supporting engines, every branch above specifies metric, method, version, units, dates, age, sex, channel, Resolver state, Confidence non-dependency, recency, knots, interpolation, tails, weights, missing data, status, clipping, rounding, and withholding.

**Remaining runtime scientific/product choices:** none.
**Remaining ambiguous boundaries:** none.
**Implementation remains blocked** only by the independent mathematical/docs freeze re-gate process — not by open math.

---

## 25. Implementation authorization gate

```text
Scientific Re-Gate V2 PASS (6fa8cb22…)
        ↓
THIS MATHEMATICAL TRUTH FREEZE (docs)
        ↓
INDEPENDENT MATHEMATICAL / DOCS FREEZE RE-GATE  ← required next
        ↓
PURE INTERNAL DRAFT IMPLEMENTATION (non-public flag)
        ↓
INDEPENDENT IMPLEMENTATION RE-GATE
        ↓
calibration / public-release work (separate)
```

Do **not** implement score code until the mathematical freeze re-gate PASS.

---

END OF MATHEMATICAL TRUTH FREEZE V1
