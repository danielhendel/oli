# Body Composition Dual Score — Scientific Review Response V1

**Date:** 2026-10-04
**Reviewed SHA:** `93f5960b98326b2de4116f08d2eb15564b321dc5`
**Independent review verdict (V1):** FAIL (Health/Performance internal engines NO-GO; public NO-GO)
**Scientific blocker-correction SHA:** `6fa8cb22b5a90982057f27c68a27743c4103df47`
**Independent Scientific Re-Gate V2:** **PASS**
**This document:** maps Defects 1–8 to corrections; records V2 PASS and non-blocking Defect 9. **No score code.**

Companion:

- `docs/10_product/specs/BODY_COMPOSITION_DUAL_SCORE_SCIENTIFIC_SPEC_V1.md`
- `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_DECISION_FREEZE_V1.md`
- `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_MATHEMATICAL_TRUTH_FREEZE_V1.md`

Defects 1–8: **CLOSED**. Independent Re-Gate V2: **PASS**.
Implementation remains **BLOCKED** until independent mathematical/docs freeze re-gate PASS.

---

## Defect table

| Defect | Current policy at 93f5960b | Review finding | Selected correction | Evidence vs product | Closure |
|--------|----------------------------|----------------|---------------------|---------------------|---------|
| 1 H1 discontinuity | Piecewise H1 with NICE-band steps | 15-pt jump at 0.50; 5-pt at 0.60 | Continuous piecewise-linear H1; NICE 0.50/0.60 are reference locations, not cliffs | 0.40/0.50/0.60 EVIDENCE REFERENCE; score endpoints DRAFT PRODUCT POLICY | **CLOSED** |
| 2 Open constants | Knots/slopes/dampening/BF% left provisional | Engineers would invent runtime constants | Freeze every draft_v1 constant; FMI-only (no BF% channel); dampening removed | All score-space numbers DRAFT PRODUCT POLICY | **CLOSED** |
| 3 Missing H3 | Silent H1/H2 renormalization as same score | Meaning changes (synthetic Δ up to +13) | Full Health requires H1+H2+H3; else `incomplete_health_composition`, no aggregate 0–100 | PRODUCT POLICY | **CLOSED** |
| 4 Recency/same-era | Draft allowed with `recency_policy_not_frozen` | Current Waist + old DXA is not current composition | Max input age 180 d; max pairwise gap 90 d; same-scan exception | DRAFT PRODUCT POLICY (not physiologic half-life) | **CLOSED** |
| 5 Method | Shared transform once index computed | DXA ≠ BIA | Profile DXA-only for H2/H3/P1/P3; H1 independent standardized WHtR | PRODUCT POLICY | **CLOSED** |
| 6 Performance name | Performance Composition | Overclaims measured performance | Rename **Performance-Supporting Composition**; narrow claims | PRODUCT POLICY | **CLOSED** |
| 7 P1 Resolver | Docs said FFMI primary; Resolver leaves FFMI/FFM/Lean unranked | Score must not invent Resolver precedence | P1 numeric eligibility = **FFMI only**; FFM/Lean explanatory; `policy_not_frozen` fail-closed; **no Resolver amendment** | PRODUCT POLICY (eligibility), Resolver unchanged | **CLOSED** |
| 8 Anchor honesty | Kelly/EWGSOP2/Kyle used like optima | Screening/descriptive ≠ optimal plateaus | Relabel: screening floor / descriptive reference / product saturation / favorability transform | Mixed; saturation is PRODUCT POLICY | **CLOSED** |

No blocking defect remains OPEN at the policy layer. Independent **recalculation** of the frozen math is still required before implementation authorization.

---

## Defect 1 — H1 continuity

**Correction:** Replace band-step mapping with continuous piecewise linear H1.

Exact formula: scientific spec §H1.

| Knot (WHtR) | Score | Class |
|-------------|-------|-------|
| ≤ 0.40 | 100 | 0.40 EVIDENCE REFERENCE (NICE healthy-band lower); score 100 DRAFT PRODUCT POLICY saturation |
| 0.50 | 80 | 0.50 EVIDENCE REFERENCE (NICE increased-risk boundary); 80 DRAFT PRODUCT POLICY |
| 0.60 | 50 | 0.60 EVIDENCE REFERENCE (NICE high central adiposity); 50 DRAFT PRODUCT POLICY |
| ≥ 0.80 | 0 | 0.80 / 0 DRAFT PRODUCT POLICY upper saturation |

Low tail: plateau at 100 for WHtR ≤ 0.40. **No** additional reward below 0.40. **No** low-WHtR penalty.

VAT mass/volume: **NON-SCORING V1** (explanatory only).

**Status:** CLOSED

---

## Defect 2 — Runtime constants

Every draft_v1 engine constant is enumerated in the scientific spec with no TBD / tune-later.

Removed from V1 (so they cannot be invented):

- BF% scoring transforms
- Health H1 dampening coefficients
- Performance P3 dampening coefficients
- VAT numeric transform
- Silent weight renormalization

**Status:** CLOSED

---

## Defect 3 — Missing H3

Full Health Composition aggregate **requires H1 + H2 + H3**.

If H3 absent: **no** 0–100 Health Composition. Return `incomplete_health_composition` plus available construct results.

No silent same-ID renormalization.

**Status:** CLOSED

---

## Defect 4 — Recency / same-era

| Rule | Value | Class |
|------|-------|-------|
| Max currentness of each scoring input | 180 days | DRAFT PRODUCT POLICY |
| Max pairwise age gap among scoring inputs | 90 days (inclusive) | DRAFT PRODUCT POLICY |
| H2+H3 from same verified Body Scan `sourceEventId` | gap 0 by construction | DRAFT PRODUCT POLICY |
| Standardized Waist + scan | Waist must be within 90 d of scan `measuredAt` | DRAFT PRODUCT POLICY |
| Undated scoring input | fail closed | fail-closed doctrine |
| Boundary | `delta_ms <= 90 * 86400000`; `age_ms <= 180 * 86400000` | inclusive |

Not a physiologic half-life. Conservative combination-eligibility for internal draft. Public numeric remains separately blocked.

**Status:** CLOSED

---

## Defect 5 — Method

**Option A — DXA-only draft** for composition indices.

| Construct | Eligible method |
|-----------|-----------------|
| H1 | Standardized WHO-midpoint WHtR only (independent of DXA) |
| H2 | DXA-derived FMI only |
| H3 | DXA-derived ALMI, or DXA-derived FFMI if Resolver primary |
| P1 | DXA-derived FFMI only |
| P3 | DXA-derived FMI only |

BIA / unknown-method / mixed-method aggregates: `unsupported_method`. No DXA↔BIA interchangeability.

**Status:** CLOSED

---

## Defect 6 — Naming

| Old | New |
|-----|-----|
| Performance Composition | **Performance-Supporting Composition** |

**Definition:** An evidence-informed index of how the user's current body composition may support general physical performance.

**Not:** strength, endurance, VO2 max, power, sport performance, athletic ranking.

Internal id remains `performance_support`.

**Status:** CLOSED

---

## Defect 7 — P1 eligibility

P1 numeric V1 = **FFMI ONLY**.

- FFM: explanatory / non-scoring
- total Lean: explanatory / non-scoring
- Resolver P1 unranked chain **unchanged**
- If Resolver construct P1 is `policy_not_frozen`: fail closed
- If FFMI channel is `resolved` / `resolved_with_supporting`: P1 eligible
- Score engine does **not** implement FFMI > FFM > Lean

**Status:** CLOSED

---

## Defect 8 — Anchor honesty

| Anchor | Honest class | Not |
|--------|--------------|-----|
| NICE WHtR 0.40 / 0.50 / 0.60 | Screening / educational reference locations | Score cliffs or clinical coefficients |
| Kelly FMI classes | Descriptive BMI-equivalent population classes (NHANES DXA, young White prevalence-matched) | Health-optimal plateaus |
| EWGSOP2 ALMI 7.0 / 5.5 | Low-muscle quantity floors (older-adult sarcopenia confirmation context) | Optimal lean |
| Kyle/Schutz FFMI/FMI | Descriptive BIA/Caucasian normal-BMI ranges | Performance or health optima |
| Oli score endpoints / plateaus | DRAFT PRODUCT POLICY saturation | Medical fact |

H3 reframed as **lean adequacy / reserve**, not young-adult high-lean optimization.

**Status:** CLOSED

---

## Implementation readiness

| Engine | Scientific Re-Gate V2 | Mathematical freeze | Implementation |
|--------|----------------------|---------------------|----------------|
| Health | **PASS** / SCIENTIFICALLY AUTHORIZED | CREATED / pending independent freeze review | **STILL BLOCKED** until freeze re-gate PASS |
| Performance-Supporting | **PASS** / SCIENTIFICALLY AUTHORIZED | CREATED / pending independent freeze review | **STILL BLOCKED** until freeze re-gate PASS |
| Public either | NO-GO | NO-GO | **NO-GO** |

Do **not** authorize score runtime from scientific PASS alone. Mathematical freeze re-gate is required next.

---

## Defect 9 — Sibling naming lag (NON-BLOCKING)

**Finding (Scientific Re-Gate V2):** some sibling current-status docs still said **Performance Composition** where they refer to the current renamed score.

**Correction (mathematical-freeze docs pass):** current authoritative sibling status labels updated to **Performance-Supporting Composition** / **Performance-Supporting score** where they describe current state. Historical mentions of the old name remain when clearly historical (e.g. Defect 6 narrative).

**Status:** **CLOSED** (NON-BLOCKING)
