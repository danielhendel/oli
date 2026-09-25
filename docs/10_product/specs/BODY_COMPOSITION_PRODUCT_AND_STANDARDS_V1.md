# Body Composition Product and Standards Specification v1

**Status:** Accepted with guardrails (architecture/standards direction; Stage 3B shell **implemented on branch**)
**Date:** 2026-09-18
**Accepted:** 2026-09-18 — human approval with guardrails
**Stage:** 3A definition complete; Stage 3B value-first shell **MERGED** (PR #220; physical `c962d36…`); Stage 3C standards/graphs **MERGED** (PR #221 at `58350517…`; physical `e4a23a55…`); Stage 3D **NOT BEGUN / DEFERRED**; Stage 3E Body Scans **ACTIVE** (`BODY_SCANS_PRODUCT_AND_DATA_V1.md`)
**Authority level:** T2 product authority (subordinate to Constitution and code/CI; binding via accepted RFC/ADR)
**Companions:**
- Audit: `docs/90_audits/2026-09-18-body-composition-repo-truth-audit.md`
- Evidence: `docs/90_audits/2026-09-18-body-composition-evidence-matrix.md`
- RFC: `docs/80_rfc/RFC-body-composition-category-intelligence-v1.md` (**Accepted** 2026-09-18)
- ADR: `docs/70_adrs/ADR-body-composition-category-intelligence-v1.md` (**Accepted** 2026-09-18)
- Stage 3B completion: `docs/90_audits/2026-09-20-stage3b-body-composition-value-first-shell-completion.md`

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

## 4. Two-dimension model (ACCEPTED 2026-09-18)

1. **Two independent conceptual dimensions:** Health Protection and Performance Support.
2. **Do not average, combine, or convert** them into one universal Body Composition score.
3. **V1 is marker-first.** Evidence-backed markers may be interpreted before any aggregate category position is authorized.
4. **No aggregate Performance Support position** is currently approved.
5. **“Optimized” and “Excellence”** are not approved as personal user classifications. Conceptual product language only until separate approval of definitions, evidence, populations, and minimum-data rules.
6. Stage 3B may show an **educational** reference model without personalized rail markers.

### Educational reference labels (not personal classifications)

| Dimension | Educational bands (conceptual only) |
|-----------|-------------------------------------|
| Health Protection | Higher risk · Elevated risk · Lower risk · (withhold “Optimized” as personal classification) |
| Performance Support | Limited · Capable · Strong · (withhold “Excellence” as personal classification) |

Exact band wording for education remains refineable; personal placement of “Optimized” / “Excellence” remains UNRESOLVED / not approved.

---

## 5. Marker taxonomy

### Screening-level (ACCEPTED)

Height, weight, waist circumference, waist-to-height ratio.

Weight and BMI are **supporting screening context only** — not direct Body Composition; cannot establish excellence.

### Composition-level (ACCEPTED when method-labeled)

Body-fat percentage, fat mass, lean mass, measurement date, measurement provenance.

### Advanced (ACCEPTED only when available and methodologically supported)

DEXA/DXA, visceral adipose tissue, appendicular lean mass, regional composition.

### Performance-support markers

Method-labeled lean / fat context may educate; **no aggregate Performance Support position**. Sport-specific Excellence remains FUTURE / not approved.

### Rejected uses

| Use | Status |
|-----|--------|
| BMI as composition measurement | DO NOT USE |
| Weight as complete composition | DO NOT USE |
| Universal excellent BF% | DO NOT USE |
| Unknown-method AH driving official classification | DO NOT USE |
| Mixed-method silent trends | DO NOT USE |
| AH→BIA inference | DO NOT USE |
| RawEvent-derived consumer classification | DO NOT USE |
| Unvalidated physique-estimation margins | DO NOT USE |

---

## 6. Data tiers (ACCEPTED)

1. **Screening-level** — height, weight, waist, WHtR (+ BMI as screening context only)
2. **Composition-level** — method-labeled BF% / fat mass / lean mass + date + provenance
3. **Advanced** — DEXA (+ VAT/ALM/regional when available and supported)

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

## 17. Leadership decisions — disposition (2026-09-18)

| # | Question | Disposition |
|---|----------|-------------|
| 1 | Two independent dimensions? | **Accepted** |
| 2 | Health aggregate position in v1? | **Unresolved** — not authorized for 3B; later stage only if separately approved |
| 3 | Performance aggregate position in v1? | **Not approved** |
| 4 | “Optimized” as personal classification? | **Not approved** (conceptual language only) |
| 5 | “Excellence” as personal classification? | **Not approved** (conceptual language only) |
| 6 | Marker-first early stages? | **Accepted** |
| 7–9 | Screening markers / WHtR | **Accepted** (height, weight, waist, WHtR) |
| 8 / advanced | Advanced markers | **Accepted** when available and supported |
| 10 | General BF% excellence ranges | **Not approved**; method-labeled composition evidence may display |
| 11 | Performance requires sport/goal for aggregate | Aggregate not approved; remains unresolved for any future aggregate |
| 12 | DEXA for advanced | Advanced only when available and supported |
| 13 | Unknown-method AH drives classification? | **No** — display with provenance only |
| 14 | Like-with-like mandatory? | **Yes** |
| 15 | Personal targets vs standards | Plan owns targets; category analyzes |
| 16 | Standards versioning / registry location | Versioning required; **durable location UNRESOLVED** before persistence |
| 17 | Next gate | **Stage 3B** value-first shell authorized |

### Repository blockers (accepted as recorded)

- Incomplete CanonicalEvent path for Body
- AH and manual lack one complete DailyFacts authority
- Manual Body values can remain outside overview truth
- RMR incomplete (Basal Energy ≠ expected authoritative fact)
- User-facing trends still include RawEvent-derived paths

These **do not block** Stage 3B shell; they **do block** official marker aggregation, personal rail placement, and facts-first trend claims.

---

## 18. Implementation roadmap (aligned to ROADMAP_REALITY)

| Gate | Intent | Status |
|------|--------|--------|
| **3A** | Definition, evidence, audit, RFC/ADR | **Complete (docs)** — RFC/ADR Accepted 2026-09-18 |
| **3B** | Value-first Body shell + educational reference model; no Body Fat/Lean classification | **COMPLETE on branch** (physical `c962d36…`, 2026-09-20); Draft PR pending |
| **3C** | Standards & reference graphs / baseline-building inputs + provenance | NOT STARTED |
| **3D** | Facts-first marker summaries | NOT STARTED — blocked until repository gaps addressed |
| **3E** | Approved health-protection classification (if separately authorized) | NOT STARTED — blocked |
| **3F** | Performance-support aggregate | **Not currently approved** |
| **3G** | Method-specific longitudinal trends | NOT STARTED — blocked until facts authority + like-with-like |
| **3H** | Reusable Category Intelligence framework | NOT STARTED |

Feeds roadmap Stage **3** analytics truth contracts and Stage **4** seven-domain Current State.

---

## 19. Approval record (2026-09-18)

```text
APPROVED WITH GUARDRAILS — accept the Body Composition Category Intelligence
v1 architecture and standards direction for future staged implementation.

Authorize Stage 3B only as a value-first Body Composition shell
(purpose, educational reference model, marker explanations, evidence tiers,
baseline education, honest missing/partial states, source/method education,
links to existing real measurement actions).

Do not authorize a universal Body score, universal body-fat excellence target,
BMI target band, mixed-method trend, Apple Health-as-measurement-method
assumption, Apple Health-to-BIA inference, RawEvent-derived consumer
classification, unvalidated physique-estimation margins, personalized rail
markers, aggregate health/performance classification, “Optimized”/“Excellence”
personal placement, or new schema/persistence/Insights in Stage 3B.

Keep unresolved scientific decisions and release gates in force.

Do not begin Stage 3B runtime implementation in the Stage 3A documentation Agent.
```

---

## 20. Stage 3B local preference amendment (ACCEPTED 2026-09-20)

Product leadership accepts this **narrow Stage 3B local-persistence amendment** only.

### Apple Health metric sync scope

| Field | Value |
|-------|--------|
| Storage key | `appleHealth:metricSyncScopes:{uid}` |
| Classification | Account-keyed; device-local; non-health preference metadata; local persistence only |
| Firestore / backend | **None** — no path, no endpoint, no cross-device promise |

**Purpose:** Lets the current authenticated user choose which Apple Health metrics Oli may sync on this device.

**OFF:** Stops future Oli queries/import/ingest for that metric; does **not** revoke Apple system permission; does **not** delete already imported data.

**ON:** Allows Oli to use the existing governed HealthKit path for that metric; does **not** prove read access was granted; no-data remains distinct from denied access.

**Lifecycle:** Isolated by UID; transient UI state cleared/invalidated on sign-out/account switch; local account lifecycle cleanup must cover the key; deletion lifecycle classification remains honest.

**Not authorized by this amendment:** remote persistence; new Firestore path; new backend endpoint; cross-device sync; native permission inference.

Body Fat and Lean Mass **classification** standards remain **PROPOSED / NOT IMPLEMENTED**.
