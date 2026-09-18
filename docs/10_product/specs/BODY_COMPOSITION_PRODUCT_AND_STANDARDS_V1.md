# Body Composition Product and Standards Specification v1

**Status:** Proposed — human approval required  
**Date:** 2026-09-18  
**Stage:** 3A (definition only; no runtime implementation)  
**Authority level:** T2 product proposal (subordinate to Constitution, code/CI, and accepted RFCs/ADRs)  
**Companions:**  
- Audit: `docs/90_audits/2026-09-18-body-composition-repo-truth-audit.md`  
- Evidence: `docs/90_audits/2026-09-18-body-composition-evidence-matrix.md`  
- RFC: `docs/80_rfc/RFC-body-composition-category-intelligence-v1.md`  
- ADR: `docs/70_adrs/ADR-body-composition-category-intelligence-v1.md`

---

## 1. Purpose and user promise

**Purpose:** Help the user understand Body Composition as the relative amounts and distribution of fat and lean tissues (and related screening anthropometrics), with honest evidence, methods, and limits.

**User promise (ten-second comprehension):**

> Oli shows what matters, what the reference ranges mean, what information I have, what is missing, how it was measured, and where I currently stand — only when evidence is sufficient.

**Long-term category loop:** Understand → Measure → Locate → Improve → Monitor.

---

## 2. Product doctrine

```text
The category analyzes and explains.
Plan owns individualized actions.
```

```text
Oli measures. Oli analyzes. Oli explains. You decide.
```

Aligned with Analytics-First Vision and Consumer Product Decisions v2.

### Prohibited claims (v1)

- Universal Body score  
- Universal body-fat “Excellence” target  
- BMI as Body Composition target band  
- Mixed-method official trends  
- Apple Health as a measurement method  
- RawEvent-derived official consumer classification  
- Autonomous weight/BF%/calorie/macro/training prescription  
- Physique estimation from incomplete data  
- DEXA-like claims from non-DEXA data  
- Averaging Health Protection with Performance Support  
- Letting strong lean mass hide central-adiposity risk  

---

## 3. Hypothesis evaluation (Stage 3A)

| Hypothesis element | Verdict |
|--------------------|---------|
| Value-first education before permission | **Accept** — current page fails this |
| Simple reference spectrum immediately | **Accept as educational reference** — user marker only when ready |
| Explain markers | **Accept** |
| Explain measurement ways | **Accept** |
| Evidence present/missing/stale/conflict | **Accept** |
| Place user only when sufficient | **Accept** |
| Method-specific progress | **Accept** |
| Cross-category influence | **Accept** (not as measurement methods) |
| Actions route to Plan | **Accept** |

Scientific honesty overrides visual desire for Excellence placement.

---

## 4. Two-rail recommendation

### Recommendation (PROPOSAL — leadership must decide)

1. **Keep two independent conceptual rails** in the educational reference model: Health Protection and Performance Support.  
2. **Do not average them.**  
3. **v1 consumer aggregate:**  
   - Health Protection aggregate band: **optional later (3E)** via conservative bottleneck of validated core risk markers — **not Stage 3B**.  
   - Performance Support aggregate / Excellence: **defer**; show **marker-level** performance context only until sport/goal methodology approved (**3F if ever**).  
4. Prefer **marker-level status** for early runtime stages (3B–3D).  
5. Labels: avoid “Optimized” and “Excellence” until defined; prefer risk-oriented health language and descriptive performance language.

### Proposed interim educational labels (not approved classifications)

| Rail | Educational bands (PROPOSAL) |
|------|------------------------------|
| Health Protection | Higher risk · Elevated risk · Lower risk · (withhold “Optimized”) |
| Performance Support | Limited · Capable · Strong · (withhold “Excellence”) |

Final labels require leadership decision (Section 17).

---

## 5. Marker taxonomy

### Health-protection candidates

| Marker | v1 status |
|--------|-----------|
| Waist circumference | CORE V1 (if capture approved) |
| Waist-to-height ratio | CORE V1 |
| Central adiposity (derived from above) | CORE V1 |
| Visceral adipose tissue | ADVANCED V1 (DEXA/clinical) |
| Total fat mass / BF% | ADVANCED V1 method-labeled |
| Low lean mass / ALM / ALMI | FUTURE / ADVANCED when method-valid |
| Weight / waist / fat / lean trajectories | SUPPORTING / method-specific |

### Performance-support candidates

| Marker | v1 status |
|--------|-----------|
| Total lean mass | ADVANCED V1 method-labeled |
| ALM | FUTURE/ADVANCED |
| Fat mass / BF% context | ADVANCED V1 method-labeled |
| Regional composition | FUTURE |
| Sport-specific composition | FUTURE (required for Excellence) |
| LEA warning context | FUTURE / ADVANCED concern flag |

### Supporting context

Height, age, sex used for interpretation, weight, BMI (screening only), sport/goal (future), method, source, device, date, recency, confidence, completeness.

### Rejected uses

| Use | Status |
|-----|--------|
| BMI as composition measurement | DO NOT USE |
| Weight as complete composition | DO NOT USE |
| Universal excellent BF% | DO NOT USE |
| Unknown-method AH driving rails | DO NOT USE |

---

## 6. Data tiers

See evidence matrix. Adopted structure:

1. **Screening-level** — height, weight, waist → BMI + WHtR context only  
2. **Composition-level** — method-known FM/BF% + lean + date  
3. **Advanced** — DEXA (+ VAT/ALM/regional)

---

## 7. Measurement hierarchy and provenance

```text
transport ≠ originating source ≠ device ≠ measurement method
measured | estimated | inferred | manual
```

When method unavailable: `method = unknown`.

### Ways to measure (tracking)

- Manual weight, waist, BF entry  
- Apple Health body measurements (transport)  
- Supported scale integrations (future; Withings live currently orphaned)  
- DEXA upload / clinical import (future structured)

### What influences Body Composition (not measurements)

Strength, Nutrition, Cardio Fitness, Activity/Movement, Sleep, Recovery.

Oura may influence behavior/interpretation; it is **not** a direct Body Composition measurement source.

---

## 8. Readiness states

| State | Evidence | Allowed UI | Forbidden UI |
|-------|----------|------------|--------------|
| missing | No core Body evidence | Reference spectrum, education, build baseline | User marker, score 0, risk classification |
| partial | Some markers | Marker cards for available; gaps listed | Aggregate rail if minimum unmet |
| ready | Approved set present, current, method-compatible, interpretable, provenance-aware | Marker status; optional approved aggregate | False precision |
| stale | Last-known aged past fresh/caution | Value + age/date; caution copy | Silent “current” |
| conflicting | Material multi-source disagreement | Both values + conflict explainer | Most-favorable pick |
| error | Load/compute failure | Error + retry | “No data” empty |

### Confidence (separate from state)

Inputs: method, provenance, recency, completeness, consistency, compatibility, repeats, known uncertainty.  
Labels **Low / Moderate / High** only with explicit rules in a later standards version — **UNRESOLVED exact scoring**. Completeness = available core / required core.

---

## 9. Like-with-like trend rule

Official trends must preserve metric, method, device/source where relevant, unit, conditions when relevant, date, provenance, confidence, standard version.

Default: compare like with like.  
On method change: separate series, method-change marker, or withhold classification.  
**Mandatory for official Progress** (leadership confirmation required).

---

## 10. Conflict resolution

Do not choose the most favorable result. Surface conflict; withhold aggregate rails; allow marker display with dual provenance.

---

## 11. Plan boundary

Category may explain metrics, references, state, gaps, source, method, confidence, trends, levers.  
Category must **not** prescribe target weight/BF%, calories, macros, fat-loss rate, training plan, deadline, or medical intervention.

---

## 12. Page information architecture (future)

Recommended order after UX review:

1. Header + one-sentence purpose  
2. Reference spectrum (educational; no user marker without evidence) + confidence/completeness  
3. What determines your position (marker cards)  
4. Build your baseline (measure / upload / connect)  
5. Your evidence (inventory, missing, stale, conflicts)  
6. Progress (method-specific; separate from Current State)  
7. What influences Body Composition (cross-category)  
8. Plan (human/professional actions when available)

### Value-first no-data copy (PROPOSAL)

**Title:** Body Composition  
**Purpose:** Understand the fat and lean tissues that make up your body — and the evidence Oli has so far.  
**Spectrum:** Educational reference only.  
**Missing:** “Oli doesn’t have enough measurements yet to place you.”  
**CTA:** Add waist, weight, or a composition measurement — or connect a supported source when you are ready.  
**Do not:** auto-request Apple Health before this explanation.

---

## 13. Text wireframes

### Missing

```text
Body Composition
Understand fat and lean tissues — and the evidence behind them.

[Reference spectrum — no user marker]
Health Protection: Higher risk · Elevated · Lower risk
Performance Support: context only (no Excellence)

What determines your position
• Waist-to-height — Missing
• Body fat % — Missing
• Lean mass — Missing

Build your baseline
[Add waist] [Add weight] [Learn about DEXA] [Connect source]

Your evidence: None yet
```

### Partial

```text
…spectrum without aggregate marker…
Markers: Weight ready · Waist missing · BF% method unknown
Completeness: 1 / 3 core
Confidence: Low
```

### Ready

```text
…spectrum may show approved health band if 3E authorized…
Markers with value, unit, reference, source, method, date, status
Progress: method-specific series
```

### Stale

```text
DEXA body fat 22% — measured 18 months ago (stale)
Recent weight available — does not replace composition
```

### Conflicting

```text
Conflict: DEXA BF% 18% (2026-01-10) vs scale estimate 24% (2026-09-01)
Aggregate position withheld
```

### Error

```text
Couldn’t load Body evidence. [Retry]
(Not “No data yet”)
```

---

## 14. Accessibility

- Spectrum not color-only; every band text-labeled  
- Marker position has accessible description; unknown announced as unknown  
- Marker cards announce metric, value, unit, status, method, source, date  
- Charts have text alternatives  
- Confidence in words  
- Method changes announced  
- ≥44 pt controls; Dynamic Type; Reduce Motion  
- Neutral, non-shaming language; no moral judgment of body size/fat  

### VoiceOver strings (PROPOSAL)

| State | String |
|-------|--------|
| missing | Body Composition. Reference ranges shown for education. Your position is unknown because measurements are missing. |
| partial | Body Composition. Some measurements available. Aggregate position withheld. Completeness partial. |
| ready | Body Composition. Evidence ready. Health protection band {band}. Performance aggregate unavailable. Confidence {level}. |
| stale | Body Composition. Showing last known values. Data is stale as of {date}. Not presented as current. |
| conflicting | Body Composition. Sources disagree. Aggregate position withheld. Review conflicting measurements. |
| error | Body Composition. Error loading evidence. Retry available. |

---

## 15. Acceptance fixtures (non-code)

For each fixture: allowed output, forbidden output, marker availability, rail availability, confidence, copy, source display, user action.

1. No Body data — missing; reference only; no marker  
2. Height + weight only — screening BMI context; no composition Excellence  
3. Height + weight + waist — WHtR health context possible; no Excellence  
4. Manual BF% unknown method — show value; no rail  
5. Consumer BIA series — method-specific trend only  
6. DEXA fat + lean — composition-level / advanced markers  
7. DEXA + VAT — advanced risk context  
8. Low lean + healthy central adiposity — do not hide low lean; no fake healthy aggregate  
9. High central adiposity + strong lean — health bottleneck to higher risk; lean must not erase risk  
10. Very low BF% + LEA concern — withhold Excellence; show concern  
11. Conflicting DEXA vs scale — conflict UI; no favorable pick  
12. Stale DEXA + recent weight — stale composition; weight ≠ composition refresh  
13. Unit conversion — display prefs; store canonical  
14. Sex-specific applicability — withhold sex-specific BF bands if sex missing  
15. Age-specific applicability — apply when standards require  
16. Ethnicity-specific waist cutoffs — follow approved applicability model or withhold  
17. Unsupported population — honest unsupported  
18. Method change in trend — separate series / marker / withhold  
19. Missing provenance — method unknown; no rail  
20. Network error — error state  
21. Source disconnected + history remains — history retained per ownership rules; no new sync  
22. Account switch — no cross-user source state  
23. Deleted source history — missing/partial honestly  
24. Duplicate same-day measurements — deterministic selection rule (facts layer)  
25. Measurement correction — lineage-aware replacement  

---

## 16. Conceptual presentation contract (not implemented)

```text
BodyCompositionState {
  readiness: missing | partial | ready | stale | conflicting | error
  healthProtection: HealthBand | null
  performanceSupport: PerformanceBand | null
  confidence: low | moderate | high | null
  coverage: { availableCoreMarkers, requiredCoreMarkers, availableAdvancedMarkers }
  markers: MarkerSummary[]
  missingEvidence: EvidenceRequirement[]
  conflicts: EvidenceConflict[]
  provenance: SourceSummary[]
  progress: MethodSpecificTrendSummary[] | null   // separate from Current State
  standardVersion: string
  canonicalVersion: string | null
  factsVersion: string | null
  insightVersion: string | null
  computedAt: string | null
}
```

**Placement note (PROPOSAL):** Derived bands belong in Insights / HealthState / IntelligenceContext (server); UI consumes typed presentation DTO. Do not classify in JSX.

---

## 17. Leadership decisions required

1. Approve two independent rails?  
2. Health aggregate position in v1?  
3. Performance aggregate position in v1?  
4. “Optimized” health label?  
5. “Excellence” performance label?  
6. Marker-level only for early stages?  
7. Core v1 markers set?  
8. Advanced markers set?  
9. WHtR in v1?  
10. General BF% ranges in v1?  
11. Performance interpretation requires sport/goal?  
12. DEXA required for advanced placement?  
13. Unknown-method AH may drive classification? (**Recommend no**)  
14. Like-with-like trends mandatory? (**Recommend yes**)  
15. How personal targets separate from evidence standards?  
16. Standards versioning/governance model?  
17. Which implementation gate begins after approval (recommend **3B** value-first shell)?  

---

## 18. Implementation roadmap (aligned to ROADMAP_REALITY)

| Gate | Intent | Status |
|------|--------|--------|
| **3A** | Definition, evidence, audit, RFC/ADR | **In progress (this PR)** |
| **3B** | Value-first Body shell + reference model; no user classification | NOT STARTED |
| **3C** | Baseline-building inputs + provenance | NOT STARTED |
| **3D** | Facts-first marker summaries | NOT STARTED |
| **3E** | Approved health-protection classification (if authorized) | NOT STARTED |
| **3F** | Performance-support classification **only if defensible** | NOT STARTED |
| **3G** | Method-specific longitudinal trends | NOT STARTED |
| **3H** | Reusable Category Intelligence framework | NOT STARTED |

Feeds roadmap Stage **3** analytics truth contracts and Stage **4** seven-domain Current State.

---

## 19. Approval block (proposed for human sign-off)

```text
APPROVED — accept the Body Composition Category Intelligence v1 architecture
and standards direction for future staged implementation.

Authorize a value-first Body Composition experience using versioned,
evidence-based standards, explicit measurement provenance, honest missing /
partial / stale / conflicting states, and facts-first user-facing
classification.

Do not authorize a universal Body score, universal body-fat excellence target,
BMI target band, mixed-method trend, Apple Health-as-measurement-method
assumption, or RawEvent-derived consumer classification.

Keep unresolved scientific decisions and release gates in force.

Do not begin runtime implementation until the approved implementation stage.
```
