# Body Composition — Scientific Evidence Matrix (Stage 3A)

**Status:** Proposed evidence register (not an accepted standards registry)
**Date:** 2026-09-18
**Claim discipline:** Every row tags EVIDENCE | PRODUCT DECISION | PROPOSAL | INFERENCE | UNRESOLVED
**Durable standards placement:** UNRESOLVED — no dedicated accepted consumer standards registry exists beyond legacy `lib/classifications/` and `docs/authoritative/Oli Evidence-Based Classification Framework v1.md` (long-term reference; must not override current consumer authority). Placement feeds Stage 3 analytics-truth contracts after RFC/ADR acceptance.

---

## 1. Standard-type vocabulary (must remain distinct)

| Type | Meaning |
|------|---------|
| Disease / health-risk threshold | Cutoff associated with elevated disease risk outcomes |
| Healthy reference range | Population / clinical “healthy central adiposity” style reference |
| Performance-support reference | Sport/goal-conditioned performance context |
| Sport-specific reference | Discipline-specific only |
| Personal target | User- or professional-owned goal — not a population standard |
| Measurement uncertainty | Method error / LOA — not a health band |

---

## 2. Marker evidence rows

### 2.1 Waist circumference (health risk)

| Field | Content |
|-------|---------|
| Metric | Waist circumference |
| Construct | Central / abdominal adiposity surrogate |
| Unit | cm |
| Method | Anthropometric tape; protocol-dependent |
| Population | Adults; ethnicity-specific cutoffs common |
| Sex | Separate male/female cutoffs in major guidance |
| Thresholds (examples) | WHO expert consultation discusses action levels commonly cited as men ≥94 cm / women ≥80 cm (increased) and men ≥102 cm / women ≥88 cm (substantially increased) for Europid-oriented use; ethnicity-specific lower cutoffs (e.g. many Asian populations) are documented; AHA/NHLBI ATP III often uses 102/88 cm |
| Health outcome | Cardiometabolic risk (CVD, diabetes risk context) |
| Performance | Not a performance excellence metric |
| Evidence type | WHO expert consultation; clinical guidelines |
| Sources | WHO publication `9789241501491` — https://www.who.int/publications/i/item/9789241501491 ; Lean et al. BMJ 1995 PMID 7613427 |
| Limitations | Protocol variation; ethnicity disagreement; not body-fat % |
| Claim type | EVIDENCE (thresholds exist); PRODUCT DECISION (which cutoff set Oli adopts) |
| Proposed Oli v1 status | CORE V1 (if waist capture approved) |

**Disagreement:** WHO/IDF Europid vs US ATP III vs Asian-specific cutoffs. Do not silently average. **UNRESOLVED leadership choice** which ethnicity/applicability model v1 uses.

### 2.2 Waist-to-height ratio (health risk)

| Field | Content |
|-------|---------|
| Metric | Waist-to-height ratio (WHtR) |
| Construct | Central adiposity indexed to stature |
| Unit | ratio (unitless) |
| Method | Waist / height (same units) |
| Population | Adults with BMI < 35 kg/m² emphasized for incremental value; NICE states classifications usable across sexes/ethnicities including high muscle mass (with BMI caution elsewhere) |
| Thresholds (NICE NG246) | 0.4–0.49 healthy central adiposity; 0.5–0.59 increased; ≥0.6 further increased; communication: keep waist < half height |
| Health outcome | T2D, hypertension, CVD risk context |
| Performance | Not excellence; useful when BMI misleads high-muscle adults |
| Evidence type | NICE clinical guideline |
| Sources | https://www.nice.org.uk/guidance/ng246 |
| Limitations | Less informative when BMI ≥ 35; measurement protocol still required |
| Claim type | EVIDENCE |
| Proposed Oli v1 status | CORE V1 (recommended) |

### 2.3 BMI (screening only)

| Field | Content |
|-------|---------|
| Metric | Body mass index |
| Construct | Weight relative to height — **not** body composition |
| Unit | kg/m² |
| Method | Calculated from height + weight |
| CDC adult categories | <18.5 underweight; 18.5–<25 healthy weight; 25–<30 overweight; ≥30 obesity (classes) |
| Health outcome | Screening association with chronic disease risk |
| Performance | Can misclassify muscular individuals |
| Evidence type | CDC / WHO screening guidance |
| Sources | https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html ; https://www.cdc.gov/bmi/faq/index.html |
| Limitations | Does not distinguish fat vs lean; does not locate fat |
| Claim type | EVIDENCE |
| Proposed Oli v1 status | SUPPORTING CONTEXT — **DO NOT USE** as composition target band or Excellence |

### 2.4 Body-fat percentage

| Field | Content |
|-------|---------|
| Metric | Body fat % |
| Construct | Fat mass / body mass (method-dependent estimate) |
| Unit | % |
| Method | DEXA, BIA, ADP, skinfold, unknown vendor estimate — **not interchangeable** |
| Population | Sex- and age-specific fitness tables exist in sports-medicine literature; **no universal excellence target approved here** |
| Health applicability | Extreme high or very low values may relate to health risk; disease cutoffs are method- and population-sensitive |
| Performance applicability | Sport-specific; LEA risk at very low values |
| Repo legacy bands | `lib/classifications/bodyComposition.ts` and authoritative framework cite ACSM/NSCA-style bands — **treat as unverified for consumer v1 until standards RFC accepts cited primary tables** |
| Claim type | UNRESOLVED for Oli consumer bands; EVIDENCE that method matters |
| Proposed Oli v1 status | ADVANCED V1 as **method-labeled marker**; **DO NOT USE** universal Excellent BF% |

### 2.5 Lean mass / ALM / ALMI (health vs performance)

| Field | Content |
|-------|---------|
| Metric | Appendicular skeletal muscle mass (ASM) / ASM/height² |
| Construct | Muscle quantity (sarcopenia domain) |
| Method | Prefer DXA; BIA estimates exist with device equations |
| EWGSOP2 cutoffs (corrected) | ASM <20 kg men / <15 kg women; ASM/height² <7.0 kg/m² men / <5.5 kg/m² women |
| Health outcome | Sarcopenia diagnosis framework (with strength/performance) |
| Performance | Low lean mass may limit performance support; high lean mass ≠ Excellence alone |
| Evidence type | European consensus |
| Sources | Cruz-Jentoft et al. Age Ageing 2019 — https://doi.org/10.1093/ageing/afz046 |
| Limitations | Older-adult focus; not a general-consumer Excellence rail |
| Claim type | EVIDENCE (sarcopenia); INFERENCE if used for young athletic performance |
| Proposed Oli v1 status | FUTURE / ADVANCED when DEXA ALM available — not CORE general consumer |

### 2.6 Visceral adipose tissue

| Field | Content |
|-------|---------|
| Construct | Visceral adiposity |
| Method gold standards | CT/MRI; DEXA VAT estimates on some systems |
| Consumer scales | Generally unsupported / unvalidated for VAT |
| Claim type | EVIDENCE (clinical methods); PRODUCT DECISION for Oli advanced tier |
| Proposed Oli v1 status | ADVANCED V1 only with DEXA/clinical import |

### 2.7 Weight and weight trajectory

| Field | Content |
|-------|---------|
| Construct | Total body mass |
| Role | Supporting context + screening inputs; **not complete Body Composition** |
| Claim type | PRODUCT DECISION |
| Proposed Oli v1 status | SUPPORTING CONTEXT |

---

## 3. Measurement methods

| Method | Construct | Uncertainty sources | Trend OK (same method)? | Cross-method compare? | User label | v1 |
|--------|-----------|---------------------|-------------------------|-----------------------|------------|----|
| DEXA/DXA | FM, LM, sometimes VAT/regional | Calibration, protocol, radiation justification | Yes (like-with-like) | No silent mix with BIA | “DEXA scan” | ADVANCED |
| Multi-frequency BIA | Estimated FM/FFM | Hydration, equation, device | Yes if same device/equation | No vs DEXA | “Bioelectrical estimate (multi-frequency)” | FUTURE/ADVANCED |
| Single-frequency / consumer scale | Estimated FM/FFM | Large individual LOA vs DEXA/4C | Same device only | No | “Smart-scale estimate” | FUTURE |
| ADP (BodPod) | Density-based estimate | Protocol | Same method | No silent mix | “Air displacement” | FUTURE |
| Skinfold | Subcutaneous estimate | Technician skill | Same protocol | No | “Skinfold estimate” | FUTURE |
| Circumference | Waist / regional | Landmark error | Same protocol | N/A | “Tape measurement” | CORE (waist) |
| Manual BF entry | Unknown | User/device unknown | Weak | No | “Manual entry — method unknown” | SUPPORTING |
| Manual weight | Mass | Scale quality | Yes | N/A | “Manual weight” | SUPPORTING |
| Unknown estimate (often via AH) | Unknown | Unknown | Withhold official classification | No | “Method unknown” | Display value; **no rail** |
| CT/MRI VAT | Visceral fat | Clinical only | Clinical | N/A | Clinical imaging | FUTURE |

**Evidence (DEXA vs BIA):** Systematic reviews show high correlation but wide limits of agreement; BIA often overestimates FFM vs DXA; methods are not interchangeable at individual level (e.g. PLOS One 2018 https://doi.org/10.1371/journal.pone.0200465 ; Clin J Sport Med meta-analysis https://doi.org/10.1097/jsm.0000000000001136).

**PR #178 margins 4/10/18/20%:** REJECT until independently validated — label REQUIRES EVIDENCE.

---

## 4. Two-rail scientific posture

| Question | Recommendation | Claim type |
|----------|-----------------|------------|
| Keep health vs performance separate? | **Yes** | PRODUCT DECISION grounded in EVIDENCE that risk ≠ performance |
| Independent rails defensible? | Conceptually yes; aggregate band placement is harder | PROPOSAL |
| Aggregate Health Protection via bottleneck (worst validated core risk marker)? | **Conditionally defensible** for screening-oriented health rail if markers are validated, method-aware, and exceptions defined; still overstates if single noisy marker | PROPOSAL / UNRESOLVED for v1 aggregation |
| Aggregate Performance Support / Excellence for general consumers? | **Not defensible** without sport/goal context and adequate method-aware lean+fat evidence | EVIDENCE-informed PRODUCT DECISION: marker-level only in early stages |
| “Optimized” health label | Avoid until defined (optimal for what/whom/method/time) | UNRESOLVED — prefer risk language |
| “Excellence” performance label | Prohibit without approved methodology | PRODUCT DECISION |
| Single combined Body score | **Prohibit** | PRODUCT DECISION |
| Average health + performance | **Prohibit** | PRODUCT DECISION |
| Strong lean mass hiding central adiposity risk | **Prohibit** | EVIDENCE-informed |

---

## 5. Minimum-evidence tiers (validated revision)

| Tier | Inputs | Allowed | Forbidden |
|------|--------|---------|-----------|
| Screening-level | Height, weight, waist (± sex/age context) | Weight context; BMI screening; WHtR health-risk context | Reliable FM/LM; performance Excellence; Body score |
| Composition-level | FM or BF% + lean mass + known method + date | Method-specific composition state; source-specific trend | Cross-method Excellence; unknown-method rails |
| Advanced | DEXA (+ VAT/ALM/regional when present) | Advanced risk / performance-support **context** | Treating one DEXA as permanent Excellence |

**Claim type:** PROPOSAL (architecture); thresholds inside tiers remain evidence-bound.

---

## 6. Recency model (operational + evidence labels)

| Measure | Expected cadence | Fresh | Caution | Stale | Last-known visible? | Drive Current State? | Claim |
|---------|------------------|-------|---------|-------|---------------------|----------------------|-------|
| Daily weight | Daily–weekly | ≤7d | 8–30d | >30d | Yes with age | Screening only if fresh/caution | PRODUCT OPERATIONAL RULE |
| Waist | Monthly–quarterly | ≤90d | 91–180d | >180d | Yes with age | Health rail only if fresh/caution | PRODUCT OPERATIONAL RULE |
| Consumer BIA | Weekly–monthly | ≤30d | 31–90d | >90d | Yes | Composition marker only; no aggregate Excellence | PRODUCT OPERATIONAL RULE |
| DEXA | 6–24 months typical | ≤365d | 366–730d | >730d | Yes | Advanced markers with stale labeling | PRODUCT OPERATIONAL RULE |
| Height | Rarely | years | — | if changed | Yes | Context always | PRODUCT OPERATIONAL RULE |
| Age/sex profile | Continuous | — | — | if missing | — | Required for sex-specific standards | PRODUCT OPERATIONAL RULE |

---

## 7. Low energy availability / very low BF%

Very low body-fat or rapid lean loss may indicate low-energy-availability concern in athletes (Relative Energy Deficiency contexts). **Do not place Excellence** on very low BF%. Flag as **concern context** requiring human/professional interpretation — PROPOSAL; detailed RED-S protocol is FUTURE.

---

## 8. Bibliography (primary)

1. WHO. *Waist Circumference and Waist–Hip Ratio: Report of a WHO Expert Consultation.* https://www.who.int/publications/i/item/9789241501491
2. Lean ME, et al. Waist circumference as a measure for indicating need for weight management. *BMJ.* 1995. PMID: 7613427
3. NICE NG246. Overweight and obesity management — identifying/assessing central adiposity. https://www.nice.org.uk/guidance/ng246
4. CDC. Adult BMI Categories; BMI FAQ (screening; not direct body fat). https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html
5. Cruz-Jentoft AJ, et al. Sarcopenia: revised European consensus (EWGSOP2). *Age Ageing.* 2019. https://doi.org/10.1093/ageing/afz046
6. Achamrah N, et al. DXA vs BIA by BMI. *PLOS One.* 2018. https://doi.org/10.1371/journal.pone.0200465
7. Clin J Sport Med systematic review/meta-analysis: DXA vs BIA in athletes. https://doi.org/10.1097/jsm.0000000000001136

---

## 9. Explicit non-authority for v1

- Fitness blog BF% charts
- Contest bodybuilding ranges as health standards
- Commercial scale marketing ranges as universal standards
- AI-generated unsourced tables
- Legacy Oli “Optimal” BF% bands without re-citation and human approval
- PR #178 uncertainty margins
