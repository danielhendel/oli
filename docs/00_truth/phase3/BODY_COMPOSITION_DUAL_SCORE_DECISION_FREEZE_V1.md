# Body Composition Dual Score — Decision Freeze V1

**Document type:** Decision freeze (draft_v1 scientific policy)
**Date:** 2026-10-04
**Corrects independent review FAIL at:** `93f5960b98326b2de4116f08d2eb15564b321dc5`
**Scientific blocker-correction SHA:** `6fa8cb22b5a90982057f27c68a27743c4103df47`
**Scientific spec:** `docs/10_product/specs/BODY_COMPOSITION_DUAL_SCORE_SCIENTIFIC_SPEC_V1.md`
**Review response:** `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_SCIENTIFIC_REVIEW_RESPONSE_V1.md`
**Mathematical truth freeze:** `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_MATHEMATICAL_TRUTH_FREEZE_V1.md`
**Kind:** Docs-only. **No runtime score engine. No UI. No persistence. No public 0–100.**

> Draft_v1 constants below are frozen so engineers need not invent them.
> They remain **DRAFT PRODUCT POLICY**, not clinical coefficients.
> Independent Scientific Re-Gate V2: **PASS**.
> Implementation is **STILL BLOCKED** until independent mathematical/docs freeze re-gate PASS.

---

## 0. Status

| Gate | Status |
|------|--------|
| Independent scientific review at 93f5960b | **FAIL** (8 blocking defects) — historical |
| Blocker correction at 6fa8cb22 | Defects 1–8 **CLOSED** |
| Independent Scientific Re-Gate V2 | **PASS** |
| Mathematical freeze re-gate at 995e400f | **FAIL** on defects A/B/C only (historical) |
| Edge-case correction (future evidence / age / reason precedence) | **CLOSED** in mathematical freeze |
| Final mathematical truth freeze | **READY FOR INDEPENDENT RE-GATE** |
| Score implementation | **STILL BLOCKED** until mathematical freeze re-gate PASS |
| Public scores | **NO-GO** |
| Next | Independent mathematical/docs freeze re-gate against correction SHA |

---

## 1. Names and scale

| Item | Decision | Status |
|------|----------|--------|
| Health public name | Health Composition | **LOCKED** |
| Second index public name | **Performance-Supporting Composition** (replaces Performance Composition) | **LOCKED** |
| Internal ids | `health_protection` / `performance_support` | **LOCKED** |
| Scale | 0–100 versioned product index; higher = more favorable | **LOCKED** |
| 100 / 0 | Model saturation / lower modeled bound | **LOCKED** |
| Single Body score / averaging | Forbidden | **LOCKED** |
| Public numeric | STAGED / NOT READY | **LOCKED** |
| Public category cut points | Not frozen | **LOCKED** (open for public; not needed for internal draft) |
| Model status | `evidence_informed` | **LOCKED** |

---

## 2. Constructs

| ID | Role | Numeric draft_v1 |
|----|------|------------------|
| H1 Central Adiposity | CORE | WHtR |
| H2 Total Adiposity | CORE | DXA FMI only |
| H3 Lean Reserve (adequacy) | CORE | DXA ALMI or DXA FFMI |
| H4 Fat Distribution | Explanatory | **0%** |
| P1 Muscularity | CORE | DXA FFMI only |
| P2 Regional Lean | Informational | **0%** |
| P3 Performance-supporting adiposity | CORE | DXA FMI only |
| P4 Lean Balance | Deferred V1.1 | 0% |

---

## 3. Transform family

**LOCKED:** continuous piecewise linear + `lerp`. No discontinuities. No implementation-time family choice.

---

## 4. Exact draft_v1 constants

All y-values = **DRAFT PRODUCT POLICY**. x screening/descriptive locations = **EVIDENCE-DERIVED REFERENCE** as labeled in the spec.

### H1 WHtR

| Symbol | Value |
|--------|-------|
| LOW_PLATEAU | 0.40 → 100 |
| SCORE_AT_050 | 80 |
| SCORE_AT_060 | 50 |
| UPPER_SATURATION | 0.80 → 0 |
| VAT | NON-SCORING |

Low-side: plateau; no extra reward below 0.40; no low-WHtR penalty.

### H2 FMI (sex-specific)

Male knots x: 2.0, 3.5, 5.5, 9.0, 15.0 → y: 80, 92, 92, 50, 10 then plateau 10.
Female knots x: 3.5, 5.5, 8.5, 13.0, 21.0 → y: 80, 92, 92, 50, 10 then plateau 10.

BF%: **not eligible**.

### H3 ALMI

Male: 6.0/15, 7.0/55 (EWGSOP2 floor), 8.0/92 then plateau 92.
Female: 4.5/15, 5.5/55 (EWGSOP2 floor), 6.3/92 then plateau 92.

### H3 FFMI (only if Resolver primary)

Male: 16.0/15, 16.7/55, 18.5/92 then plateau.
Female: 14.0/15, 14.6/55, 16.0/92 then plateau.

### P1 FFMI

Male: 16.0/10, 16.7/40, 19.0/90, 20.5/95 then plateau 95.
Female: 14.0/10, 14.6/40, 16.5/90, 17.5/95 then plateau 95.

### P3 FMI

Male: 2.0/80, 3.0/92, 7.0/92, 10.0/45, 16.0/8 then plateau 8.
Female: 3.5/80, 5.0/92, 10.0/92, 14.0/45, 22.0/8 then plateau 8.

Exact piecewise code is in the scientific spec. If spec and this table conflict, **spec formulas win**.

---

## 5. Weights and dampening

| Item | Value | Status |
|------|-------|--------|
| Health weights | 45 / 35 / 20 | **LOCKED** as DRAFT PRODUCT POLICY — DRAFT V1 |
| Health dampening | **Removed** | **LOCKED** V1 |
| Performance-Supporting weights | 50 / 50 | **LOCKED** as DRAFT PRODUCT POLICY — DRAFT V1 |
| P3 extra dampening | **Removed** | **LOCKED** V1 |

---

## 6. Missing data

| Score | Full aggregate requires | If missing a core |
|-------|-------------------------|-------------------|
| Health | H1 + H2 + H3 | Withhold 0–100; `incomplete_health_composition` |
| Performance-Supporting | P1 + P3 | Withhold |

**No silent renormalization** of the same score id.

---

## 7. Method

**Option A DXA-only** for FMI / ALMI / FFMI.

H1: standardized WHO-midpoint WHtR independent channel.

BIA and mixed-method aggregates: `unsupported_method`.

---

## 8. Same-era

| Rule | Value |
|------|-------|
| Max input age | 180 days inclusive |
| Max pairwise gap | 90 days inclusive |
| Same Body Scan `sourceEventId` | H2/H3 gap 0 |
| Waist + scan | Waist within 90 days of scan |
| Undated | Fail closed |

DRAFT PRODUCT POLICY, not physiologic half-life.

---

## 9. Resolver / Confidence / P1

| Topic | Decision |
|-------|----------|
| resolved / resolved_with_supporting | Use primary |
| H1 WHtR + VAT multiple_valid | WHtR numeric; VAT explanatory (frozen) |
| Other multiple_valid | Fail closed |
| policy_not_frozen / conflict / insufficient / undated_only / unsupported | Fail closed |
| P1 numeric | **FFMI only**; no Resolver precedence added |
| FFM / Lean | Explanatory |
| Confidence labels | Not required for internal calc; matrix still 0 rules |
| Same-day ADR | Still deferred; fail closed if Resolver says policy_not_frozen |

---

## 10. Demographics / trend

| Topic | Decision |
|-------|----------|
| Sex | Required H2/H3/P1/P3; H1 sex-independent |
| Age | Adult ≥ 20 completed UTC years from DOB+asOf (math freeze §5.1; leap-day Mar 1); no age slope; fairness limitation; public blocked pending age-fairness |
| Ethnicity | Unused in math; audit required |
| Trend / smoothing | Forbidden in score |

---

## 11. Decision matrix

| Decision | Health | Performance-Supporting | Status |
|----------|--------|------------------------|--------|
| Constructs | H1–H3 core; H4 0% | P1+P3; P2 0%; P4 defer | **LOCKED** |
| Primary metrics | WHtR; DXA FMI; DXA ALMI/FFMI | DXA FFMI; DXA FMI | **LOCKED** |
| Transform family | Continuous piecewise linear | Same | **LOCKED** |
| Exact knots | Spec §4–6 | Spec §9–11 | **LOCKED** draft_v1 |
| Weights | 45/35/20 | 50/50 | **LOCKED** draft_v1 PRODUCT POLICY |
| Dampening | None | None | **LOCKED** V1 |
| Missing data | All three cores | Both cores | **LOCKED** |
| Method | DXA indices + protocol WHtR | DXA only | **LOCKED** |
| Recency | 180d / 90d | 180d / 90d | **LOCKED** draft_v1 PRODUCT POLICY |
| Confidence labels | Not required | Not required | **LOCKED** |
| Ethnicity | Unused | Unused | **LOCKED** |
| Public release | NO-GO | NO-GO | **LOCKED** |
| VAT / H4 refine / P2 numeric / P4 / same-day ADR / ethnicity WC | Deferred | Deferred | **DEFERRED** |
| Age-fairness validation / calibration / public cut points | Needs validation | Needs validation | **NEEDS VALIDATION** |

---

## 12. GO / NO-GO

| Gate | Verdict |
|------|---------|
| Defects 1–8 | **CLOSED** |
| Independent Scientific Re-Gate V2 | **PASS** |
| Mathematical freeze defects A/B/C | **CLOSED** |
| Final mathematical truth freeze | **READY FOR INDEPENDENT RE-GATE** |
| HEALTH SCORE ENGINE IMPLEMENTATION | **STILL BLOCKED** until mathematical freeze re-gate PASS |
| PERFORMANCE-SUPPORTING SCORE ENGINE IMPLEMENTATION | **STILL BLOCKED** until mathematical freeze re-gate PASS |
| Public either | **NO-GO** |

Do not implement until the mathematical truth freeze (`BODY_COMPOSITION_DUAL_SCORE_MATHEMATICAL_TRUTH_FREEZE_V1.md`) receives independent re-gate PASS.

---

END OF DECISION FREEZE V1 (blocker correction + mathematical freeze pointer)
