# Oli Evidence-Based Classification Framework (v1)

**Document version:** 1.0  
**Framework version:** `1.0`  
**Status:** Authoritative — decoupled from implementation  
**Canonical code registry:** `lib/classifications/`  
**Last updated:** 2026-06-23

---

## Purpose

Create a **versioned, evidence-based classification system** that defines where a user currently stands across major health domains and what constitutes progression toward optimal health.

This framework is used by:

- Baseline Engine
- Target State Engine (Sprint C+)
- Health Plan Engine
- Review Engine
- Attention Engine
- Professional Platform
- Marketplace Systems
- Future Digital Twin

**Targets are not arbitrary goal numbers.** They derive from:

> Baseline → Current Classification Level → Next Better Level → Optimal Range

---

## Non-Diagnostic Disclaimer

Oli **classifies** — it does **not diagnose**.

| Avoid (diagnostic) | Use (classification) |
|--------------------|----------------------|
| You have metabolic disease. | Your body composition classification is below the optimal range. |
| You are hypertensive. | Your blood pressure classification is in the below-average range. |

Classifications are **informational** and support coaching context only. Users should consult qualified clinicians for medical decisions.

---

## Design Principles

### 1. Evidence-Based

Thresholds are informed by publicly recognized guidance and population reference literature, including:

- **ACSM** — American College of Sports Medicine
- **NSCA** — National Strength and Conditioning Association
- **AHA** — American Heart Association
- **ACC** — American College of Cardiology
- **WHO** — World Health Organization
- **CDC** — Centers for Disease Control and Prevention
- **Sleep Foundation**
- **ISSN** — International Society of Sports Nutrition
- Longevity and population reference literature

### 2. Directionally Correct

Classifications describe **where someone stands relative to evidence-informed ranges**, not clinical disease labels.

### 3. Progressive (5-Level Model)

Every metric supports five levels:

| Level | Name | Meaning |
|-------|------|---------|
| **1** | High Risk | Furthest from optimal; priority awareness |
| **2** | Below Average | Below population-informed target |
| **3** | Average | Typical / acceptable range |
| **4** | Above Average | Better than typical |
| **5** | Optimal | Evidence-informed optimal range |

### 4. Versioned & Updateable

- Each metric carries `version: "1.0"`.
- Threshold changes require a **new framework version** (e.g. `1.1`, `2.0`).
- Implementation reads from `lib/classifications/registry.ts` — **not** hardcoded in engines.

### 5. Decoupled from Implementation

- Authoritative thresholds live in **this document** and **`lib/classifications/`**.
- Engines call pure functions (`classifyMetric`, `classifyBodyComposition`, etc.).
- Missing values return **`unavailable`**, not failure.

---

## Versioning Rules

1. **Patch (`1.0` → `1.0.1`)** — Documentation clarifications only; no threshold changes.
2. **Minor (`1.0` → `1.1`)** — Threshold adjustments with professional review record.
3. **Major (`1.0` → `2.0`)** — New domains, level scale changes, or breaking metric ID changes.

All versions must:

- Update this document
- Bump `CLASSIFICATION_FRAMEWORK_VERSION` in code
- Add migration notes for downstream engines

---

## Review & Update Policy

1. **Annual review** — Clinical and performance advisors review thresholds against current guidelines.
2. **Change proposal** — Document rationale, evidence citations, and impacted metrics.
3. **Dual implementation** — New version registry ships alongside old version until engines migrate.
4. **No silent changes** — Threshold edits never occur inside Baseline, Target, or Plan engines.

---

## Domain 1 — Body Composition

### Men — Body Fat %

| Level | Classification | BF % |
|-------|----------------|------|
| 1 | High Risk | >30% |
| 2 | Below Average | 25–30% |
| 3 | Average | 18–24% |
| 4 | Above Average | 12–17% |
| 5 | Optimal | 8–12% |

**Metric ID:** `body-fat-percent-male`

### Women — Body Fat %

| Level | Classification | BF % |
|-------|----------------|------|
| 1 | High Risk | >40% |
| 2 | Below Average | 32–40% |
| 3 | Average | 25–31% |
| 4 | Above Average | 20–24% |
| 5 | Optimal | 14–19% |

**Metric ID:** `body-fat-percent-female`

### BMI (sex-neutral)

| Level | BMI |
|-------|-----|
| 1 | >35 |
| 2 | 30–35 |
| 3 | 25–29.9 |
| 4 | 22–24.9 |
| 5 | 20–22 |

**Metric ID:** `bmi`

### Waist-to-Height Ratio

| Level | Ratio |
|-------|-------|
| 1 | >0.65 |
| 2 | 0.60–0.65 |
| 3 | 0.50–0.59 |
| 4 | 0.45–0.49 |
| 5 | <0.45 |

**Metric ID:** `waist-to-height-ratio`

---

## Domain 2 — Activity

### Daily Steps

| Level | Steps |
|-------|-------|
| 1 | <4,000 |
| 2 | 4,000–7,000 |
| 3 | 7,000–10,000 |
| 4 | 10,000–12,000 |
| 5 | >12,000 |

**Metric ID:** `daily-steps`

### Weekly Activity Minutes

| Level | Minutes |
|-------|---------|
| 1 | <60 |
| 2 | 60–149 |
| 3 | 150–299 |
| 4 | 300–449 |
| 5 | 450+ |

**Metric ID:** `weekly-activity-minutes`  
*Aligned with WHO moderate-intensity aerobic activity guidance.*

---

## Domain 3 — Strength

Relative strength = lift weight ÷ body weight.

### Men — Bench Press

| Level | Bench (× BW) |
|-------|--------------|
| 1 | <0.75× |
| 2 | 0.75–1.0× |
| 3 | 1.0–1.25× |
| 4 | 1.25–1.5× |
| 5 | >1.5× |

**Metric ID:** `bench-press-bw-male`

### Men — Squat

| Level | Squat (× BW) |
|-------|--------------|
| 1 | <1.0× |
| 2 | 1.0–1.5× |
| 3 | 1.5–2.0× |
| 4 | 2.0–2.5× |
| 5 | >2.5× |

**Metric ID:** `squat-bw-male`

### Women — Bench Press / Squat

Women-specific relative-strength bands are defined in `lib/classifications/strength.ts` (v1.0) using NSCA-informed scaling.

**Metric IDs:** `bench-press-bw-female`, `squat-bw-female`

---

## Domain 4 — Cardio

### Resting Heart Rate

| Level | RHR (bpm) |
|-------|-----------|
| 1 | >80 |
| 2 | 70–80 |
| 3 | 60–69 |
| 4 | 50–59 |
| 5 | <50 |

**Metric ID:** `resting-heart-rate`

### VO₂ Max

VO₂ max uses **age/sex percentile tables**, not fixed ml/kg/min thresholds.

| Level | Percentile |
|-------|------------|
| 1 | <20th |
| 2 | 20th–39th |
| 3 | 40th–59th |
| 4 | 60th–79th |
| 5 | ≥80th |

**Metric ID:** `vo2-max-percentile`  
*Input must be pre-computed percentile (0–100).*

---

## Domain 5 — Recovery

### Sleep Duration

| Level | Hours |
|-------|-------|
| 1 | <5 |
| 2 | 5–6 |
| 3 | 6–7 |
| 4 | 7–8 |
| 5 | 8–9 |

**Metric ID:** `sleep-duration-hours`

### Sleep Consistency

Based on **bedtime variance** (standard deviation of bedtimes, minutes).

| Level | Variance |
|-------|----------|
| 1 | >90 min |
| 2 | 60–90 min |
| 3 | 30–60 min |
| 4 | 15–30 min |
| 5 | <15 min |

**Metric ID:** `sleep-bedtime-variance-minutes`

---

## Domain 6 — Nutrition

### Protein Intake (relative to body weight)

| Level | g/kg/day |
|-------|----------|
| 1 | <0.6 |
| 2 | 0.6–1.0 |
| 3 | 1.0–1.4 |
| 4 | 1.4–1.8 |
| 5 | 1.8–2.4 |

**Metric ID:** `protein-g-per-kg`

### Fiber

| Level | g/day |
|-------|-------|
| 1 | <10 |
| 2 | 10–19 |
| 3 | 20–29 |
| 4 | 30–39 |
| 5 | 40+ |

**Metric ID:** `fiber-g-per-day`

---

## Domain 7 — Labs

### HbA1c

| Level | Value (%) |
|-------|-----------|
| 1 | >6.5 |
| 2 | 5.7–6.4 |
| 3 | 5.4–5.6 |
| 4 | 5.0–5.3 |
| 5 | <5.0 |

**Metric ID:** `hba1c-percent`

### Blood Pressure

Combined classification uses the **worse** of systolic and diastolic levels.

| Level | BP (guidance) |
|-------|---------------|
| 1 | ≥140/90 |
| 2 | 130–139 / 80–89 |
| 3 | 120–129 |
| 4 | <120 / <80 |
| 5 | Optimal + consistent |

**Metric IDs:** `systolic-bp`, `diastolic-bp`, `blood-pressure-combined` (derived)

---

## Implementation Contract

```typescript
{
  metricId: "body-fat-percent-male",
  version: "1.0",
  domain: "body-composition",
  levels: [ /* 5 bands */ ]
}
```

**Pure functions (no UI, Firebase, AI, or recommendations):**

- `classifyMetric(definition, value)`
- `classifyBodyComposition(input)`
- `classifyActivity(input)`
- `classifyStrength(input)`
- `classifyCardio(input)`
- `classifyRecovery(input)`
- `classifyNutrition(input)`
- `classifyLabs(input)`

---

## Changelog

### v1.0 (2026-06-23)

- Initial authoritative framework
- Seven domains, 20 registry metrics
- Code registry at `lib/classifications/`
