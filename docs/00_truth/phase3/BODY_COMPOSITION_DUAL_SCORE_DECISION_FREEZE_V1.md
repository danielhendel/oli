# Body Composition Dual Score — Decision Freeze V1

**Document type:** Decision freeze (planning / truth layer)
**Date:** 2026-10-04
**Branch:** `feat/body-composition-stage3e-body-scans-v1`
**Preflight SHA:** `d2b0b3abba958c9ac80ec5401f90ad5227a1a0a8`
**Scientific spec:** `docs/10_product/specs/BODY_COMPOSITION_DUAL_SCORE_SCIENTIFIC_SPEC_V1.md`
**Kind:** Docs-only planning freeze. **No runtime score engine. No UI. No persistence. No public 0–100.**

> This freeze locks architecture, eligibility, claim boundaries, and channel policy.
> It does **not** freeze exact production transform coefficients, dampening constants, or status bands.
> Those remain **PROVISIONAL / NEEDS VALIDATION**.

---

## 0. Preflight

| Check | Result |
|-------|--------|
| Path | `/Users/danielhendel/oli-stage3e-body-scans` |
| Branch | `feat/body-composition-stage3e-body-scans-v1` |
| HEAD | `d2b0b3abba958c9ac80ec5401f90ad5227a1a0a8` |
| origin | same SHA |
| left-right | `0 0` |
| tree at start | clean |

Upstream gates (user-authorized context for this planning pass):

| Gate | Status |
|------|--------|
| Assessment Confidence implementation | PASS |
| Assessment Confidence independent re-gate | PASS |
| Assessment Confidence docs truth-freeze re-gate | PASS |
| Evidence Resolver | PASS + truth-frozen |
| Canonical Evidence Bridge | PASS + truth-frozen |
| Waist / deterministic indices | PASS + truth-frozen |
| Body Scan canonical registry/navigation | PASS + truth-frozen |
| Score planning | **AUTHORIZED** (this document) |
| Score implementation | **STILL BLOCKED** until independent planning/spec PASS |
| Public scores | **NOT READY** |

---

## 1. Executive decisions

| Item | Decision | Status |
|------|----------|--------|
| Health Composition aggregate | Authorize as constrained wellness composition assessment | **LOCKED** (design) |
| Performance Composition aggregate | Authorize General-only composition assessment | **LOCKED** (design) |
| Public names | Health Composition · Performance Composition | **LOCKED** (design; ADR amendment still required for production) |
| Scale | 0–100; higher = more favorable | **LOCKED** |
| 100 / 0 meaning | Model saturation / lower modeled bound — not zero risk / certain disease | **LOCKED** |
| Single Body score | Forbidden | **LOCKED** |
| Average Health + Performance | Forbidden | **LOCKED** |
| Public numeric V1 | STAGED / NOT READY | **LOCKED** |
| Model status | `evidence_informed` | **LOCKED** |
| Exact transforms | Draft in scientific spec only | **PROVISIONAL / NEEDS VALIDATION** |
| Category cut points | Not ready; numeric-only when eventually shown | **LOCKED** |

---

## 2. Construct framework (do not silently replace)

| ID | Construct | Role | Numeric V1 |
|----|-----------|------|------------|
| H1 | Central Adiposity | CORE | Yes |
| H2 | Total Adiposity | CORE | Yes |
| H3 | Lean Reserve | CORE | Yes |
| H4 | Fat Distribution | Explanatory | **0%** (display-only) |
| P1 | Muscularity | CORE | Yes |
| P2 | Regional Lean | Optional informational | **0%** (OPTION C amendment) |
| P3 | Performance Adiposity | CORE | Yes |
| P4 | Lean Balance | Deferred V1.1 | 0% |

### ADR amendment (proposed; not accepted in this pass)

Human acceptance still required before unflagged production aggregates. Proposed content remains as in 2026-09-28 Dual Score Decision Freeze §2 (rename; authorize composition aggregates; General-only Performance; Health severity dampening; no Body average).

---

## 3. Metric channels (LOCKED precedence)

| Construct | Primary | Secondary | Non-scoring / explanatory |
|-----------|---------|-----------|---------------------------|
| H1 | Standardized WHtR | — | VAT mass/volume (staged); BIA visceral |
| H2 / P3 | FMI | BF% | Fat Mass; BMI forbidden as driver |
| H3 | ALMI | FFMI | FFM / total Lean |
| P1 | FFMI | — | FFM / total Lean insufficient alone |
| P2 | — | — | ALMI / limb lean informational only V1 |
| H4 | — | — | A/G, android%, gynoid% display-only |

**Forbidden conversions:** VAT mass ↔ volume; unknown Waist protocol → WHO midpoint; Gallagher → score coefficients; skeletal muscle inferred from total Lean.

---

## 4. Transform shapes (LOCKED) vs coefficients (OPEN)

| Construct | Shape LOCKED | Exact transform |
|-----------|--------------|-----------------|
| H1 | Monotonic ↓ with low-side plateau; 0.5 = boundary not “zero risk” | PROVISIONAL draft in scientific spec |
| H2 | Soft U; forbid lower-always-better | PROVISIONAL |
| H3 | Increasing → plateau; no upper Health penalty | PROVISIONAL |
| H4 | N/A numeric V1 | Deferred |
| P1 | Increasing → saturation; no infinite reward | PROVISIONAL |
| P2 | N/A numeric V1 | Deferred |
| P3 | Soft U; not bodybuilding leanness | PROVISIONAL |

Normalization: reference-distance / piecewise against anchors — **not** raw percentiles as the score.

---

## 5. Weights

### Health (PROVISIONAL product policy — reviewed, retained)

| H1 | H2 | H3 | H4 |
|----|----|----|----|
| 45% | 35% | 20% | 0% |

Compared 50/30/20 and 40/40/20; retained 45/35/20 for central priority without over-dominating total adiposity.

### Performance (LOCKED V1 amendment)

| P1 | P3 | P2 |
|----|----|----|
| 50% | 50% | **0% numeric** |

**OPTION C frozen:** optional P2 must not change score meaning by appearing/disappearing. Prior provisional 40/40/20 **superseded** for V1 numeric engines.

Missing ≠ 0. Renormalize among available **required** cores only under eligibility rules.

---

## 6. Bottleneck / dampening

| Score | Architecture | Numeric constants |
|-------|--------------|-------------------|
| Health | Hybrid weighted mean + continuous severity dampening on severe H1 (H2 reserved) | PROVISIONAL |
| Performance | Weighted mean + soft dampening on extreme P3 | PROVISIONAL |

Invariant: excellent lean/muscularity must not fully mask severe central / extreme performance adiposity.

---

## 7. Confidence interaction — LOCKED architecture

**OPTION C + public gate A**

1. Score **calculation eligibility** uses score-specific evidence minima — independent of qualitative Confidence labels.
2. Null Confidence labels do **not** block draft calculation.
3. Factual Resolver/Confidence states (`conflict`, `insufficient`, `policy_not_frozen`, etc.) fail closed for affected constructs.
4. Qualitative labels remain unfrozen (0 assignment rules) — **do not manufacture** labels for scores.
5. **Public** scores withheld until Confidence display policy and other public gates pass.

**Reject OPTION B** as a hard block on draft engine work after independent planning/spec PASS.

---

## 8. Recency — LOCKED architecture

**OPTION C (public) + B (draft)**

- Draft/harness may calculate from latest resolved evidence with `recency_policy_not_frozen` marking.
- Public scores blocked until recency thresholds are governed.
- Years-old DXA ≠ current Waist for public “current” claims.
- Exact half-lives remain OPEN.

---

## 9. Missing data / eligibility — LOCKED

### Health

| Mode | Rule |
|------|------|
| Minimum demographics | Adult age, sex, height |
| H1 required for any Health aggregate path | Standardized WHtR channel preferred |
| Non-preliminary calculation | **H1 + H2** (H3 preferred; renormalize if absent) |
| H1-only | Preliminary internal only — **not public** |
| BMI-only | Forbidden |
| One-construct public aggregate | Forbidden |

### Performance

| Mode | Rule |
|------|------|
| Required | Sex, height, weight, method-labeled BF or lean/FFM sufficient for **P1 and P3** |
| Both P1 and P3 | Required |
| P2 substitutes for P1 | Forbidden |
| BMI-only | Forbidden |
| Preliminary single-construct | Forbidden |

---

## 10. Resolver statuses — LOCKED score behavior

| Status | Behavior |
|--------|----------|
| `resolved` / `resolved_with_supporting` | Use primary channel |
| `multiple_valid` | No new winner; public fail-closed if combination unfrozen |
| `policy_not_frozen` | Fail closed for public; draft only frozen-policy constructs |
| `conflict` | Withhold affected construct / aggregate |
| `insufficient` / `undated_only` / `unsupported` | Construct unavailable |

**Same-day DXA/BIA:** requires separate measurement-day ADR before score reliance. Inactive until then.

---

## 11. Demographics — LOCKED

| Factor | Rule |
|--------|------|
| Sex | Required for H2/H3/P1/P3; withhold if missing; no mixed-sex thresholds |
| Age | Absolute favorability; adult gate; low-lean floor context only; no age-percentile score |
| Ethnicity | Not used in V1 scoring; document limitations; fairness audit still required |

---

## 12. Method / trend / smoothing — LOCKED

- Consume Resolver output only.
- No device quality coefficients until Device Model Registry frozen.
- Score = current state only; trends separate.
- No hidden smoothing/averaging.

---

## 13. Precision / categories / versioning — LOCKED

| Topic | Decision |
|-------|----------|
| Display precision | Integer 0–100 |
| Internal | Float |
| Categories | None for V1 public; cut points NOT READY |
| Draft version IDs | `body_composition_health_score_draft_v1` · `body_composition_performance_score_draft_v1` |
| Production IDs | Reserved until math freeze |
| Persistence | Prefer versioned snapshots if user-visible later; none now |

---

## 14. Regulatory — LOCKED forbidden claims

Not a diagnosis · not disease probability · not mortality predictor · not strength/VO₂/fitness test · not sport ranking · not “perfect/elite body” · not clinically validated without separate pathway.

---

## 15. Final decision matrix

| DECISION | HEALTH | PERFORMANCE | EVIDENCE | PRODUCT POLICY | STATUS |
|----------|--------|-------------|----------|----------------|--------|
| Constructs | H1–H3 core; H4 display | P1+P3 core; P2 info; P4 defer | A/B/C mix | Dual-score doctrine | **LOCKED** |
| Primary metrics | WHtR; FMI; ALMI | FFMI; FMI | Guidelines + refs | Channel precedence | **LOCKED** |
| Transform shape | ↓ / U / ↑plateau | ↑plateau / U | Conceptual | — | **LOCKED** |
| Exact anchors→slopes | Draft WHtR/FMI/ALMI | Draft FFMI/FMI | Partial | Mapping | **NEEDS VALIDATION** |
| Weights | 45/35/20 | 50/50 | Weak for exact % | Yes | **PROVISIONAL** (H) / **LOCKED** (P split) |
| Bottleneck | Continuous H1 dampen | Soft P3 dampen | Doctrine | Caps numeric | **LOCKED** arch / **PROVISIONAL** nums |
| Missing data | H1+H2 standard | P1+P3 | — | Yes | **LOCKED** |
| Confidence labels | Not required for draft calc | Same | — | C+A | **LOCKED** |
| Recency | Public blocked | Public blocked | — | C+B | **LOCKED** arch |
| Sex | Required sex-specific | Required | Strong | — | **LOCKED** |
| Age | Absolute | Absolute | — | Yes | **LOCKED** |
| Ethnicity | Unused | Unused | WC disagreement | Yes | **LOCKED** |
| Method coeffs | None | None | — | Yes | **LOCKED** |
| Rounding | Integer display | Integer display | — | Yes | **LOCKED** |
| Categories | None | None | — | Yes | **LOCKED** |
| Public release | STAGED | STAGED | Validation pending | Yes | **LOCKED** |
| VAT scoring | Staged/explanatory | N/A | Device-bound | Yes | **DEFERRED** |
| P2 numeric | N/A | Deferred | Weak | OPTION C | **DEFERRED** |
| H4 refine | Deferred | N/A | Weak | Simplicity | **DEFERRED** |

---

## 16. GO / NO-GO

| Gate | Verdict |
|------|---------|
| HEALTH SCORE ENGINE IMPLEMENTATION | **CONDITIONAL GO** |
| PERFORMANCE SCORE ENGINE IMPLEMENTATION | **CONDITIONAL GO** |
| PUBLIC HEALTH SCORE | **NO-GO / STAGED** |
| PUBLIC PERFORMANCE SCORE | **NO-GO / STAGED** |

### Implementation authorization

| Domain | Authorization |
|--------|---------------|
| Health | **NOT YET** — requires independent planning/spec PASS, then draft behind non-public flag only |
| Performance | **NOT YET** — same |

**NEXT ACTION:** Open a **new independent scientific review agent** of this scientific spec + decision freeze before any score code is written. Only after that PASS may a separate implementation agent build `draft_v1` engines behind a non-public development flag.

---

## 17. Scope of this freeze commit (when committed)

Allowed: `docs/` planning/truth documentation only.
Forbidden: `app/` · `lib/` · services · APIs · Firebase · tests · native · production config · score UI · persistence.

---

END OF DECISION FREEZE V1
