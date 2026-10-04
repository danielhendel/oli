# Body Composition Assessment Confidence V1

**Status:** Implementation completed on branch · pending independent Confidence re-gate  
**Confidence version:** `body_composition_assessment_confidence_draft_v1`  
**Resolver dependency:** `body_composition_resolver_draft_v1` (approved runtime ancestor `3ae4737b8212fa5479fa1f621028e32ad7ab5757`)  
**Authority:** Dual Score scientific/decision freeze + Stage 3E foundation truth freeze + Resolver V1 truth freeze  
**Not:** clinically validated · production calibrated · score validated  
**Health / Performance Composition scores:** **STILL BLOCKED**  
**Public numeric scores:** **NOT READY**

---

## 1. Definition

Assessment Confidence answers:

> How well-supported is this assessment by the supplied evidence and the currently frozen scientific policies?

It evaluates evidence adequacy, provenance, Resolver state, method/protocol specificity, calculated-input provenance, dated vs undated evidence, completeness scope, and unresolved policy/conflict states.

### Non-definition

Assessment Confidence does **not** answer:

- how healthy this person is
- how low their disease risk is
- how athletic or capable they are
- how favorable their measurements are
- what their Health or Performance Composition score is

**Confidence in assessment ≠ favorable health result.**

A poor future health result may have Strong Assessment Confidence.  
A favorable-looking future result may have Limited or unassessable confidence.

Parser/extraction candidate confidence is **not** Assessment Confidence and must never be reused as scientific confidence.

---

## 2. Architecture

```text
SOURCE OBSERVATIONS
       ↓
CANONICAL EVIDENCE BRIDGE
       ↓
EVIDENCE RESOLVER
       ↓
ASSESSMENT CONFIDENCE  ← this document
       ↓
FUTURE Health / Performance score engines  (STILL BLOCKED)
```

Confidence consumes Resolver output and evidence metadata.

Confidence must not:

- select a different evidence winner
- override / mutate Resolver output
- reinterpret source method
- calculate favorability
- calculate a Health or Performance score

---

## 3. Version

| Field | Value |
|-------|-------|
| Version id | `body_composition_assessment_confidence_draft_v1` |
| Module | `lib/data/body/evidence/confidence/` |
| Contracts | `lib/contracts/bodyCompositionAssessmentConfidence.ts` |
| Persistence | none (runtime-derived) |
| API / UI | none |

Unsupported versions fail closed.

---

## 4. Inputs

| Input | Rule |
|-------|------|
| `bundle` | `BodyCompositionEvidenceBundle` (caller-supplied) |
| `resolution` | Approved `BodyCompositionEvidenceResolution` |
| `asOf` | Explicit ISO datetime — required; never `Date.now()` |
| `confidenceVersion` | Must be `body_composition_assessment_confidence_draft_v1` |
| `resolverVersion` | Must be `body_composition_resolver_draft_v1` |

Validation fail-closed cases include: malformed bundle/resolution, completeness mismatch, unsupported versions, unknown/duplicate constructs, dangling Resolver observation refs, invalid/mismatched `asOf`.

---

## 5. Output contract

`BodyCompositionAssessmentConfidence`:

- `confidenceVersion`
- `resolverVersion`
- `asOf`
- `evidenceBundleCompleteness` (always `caller_supplied_partial`)
- `scope` — `scoped_to_supplied_evidence_only`
- `constructAssessments[]` — exactly H1–H4, P1–P3
- `domainAssessments[]` — health + performance (rollup policy open)
- `diagnostics` — safe counts / reason tokens only

### Per-construct fields

| Field | Notes |
|-------|-------|
| `status` | `assessed` · `insufficient` · `unsupported` · `conflict` · `undated_only` · `policy_not_frozen` |
| `label` | `limited` · `moderate` · `good` · `strong` · **or `null`** |
| `resolverStatus` | Copied from Resolver |
| `confidenceBasis` | Factual dimensions + construct-specific fact tokens |
| `supportingFactors` / `limitingFactors` | Structured codes; no physiological values |
| `rationaleCodes` | Why assessable / why label withheld |
| evidence refs | Copied from Resolver classifications only |

**Forbidden:** numeric confidence, percentage, weighted total, score, favorability, health/performance status bands, UID/identity fields.

---

## 6. Qualitative labels

### Permitted terminology

`limited` · `moderate` · `good` · `strong`

### Forbidden terminology

Very High · Excellent · Elite · Perfect · certainty percentages · numeric confidence scores

### Label nullability (frozen behavior)

`label` is nullable.

When assignment policy is not frozen:

- `status = policy_not_frozen` (for resolvable evidence without a frozen label rule), or the honest Resolver-mapped status for insufficient / unsupported / conflict / undated_only
- `label = null`

**Limited is not a generic fallback** for missing policy.

---

## 7. Label policy matrix (draft_v1)

| Dimension | State |
|-----------|-------|
| Exact Limited / Moderate / Good / Strong rule matrix | **OPEN** — not frozen |
| Frozen label-producing rules in code | **0** |
| Domain Health Assessment Confidence rollup | **OPEN** |
| Domain Performance Assessment Confidence rollup | **OPEN** |
| Recency half-lives / label effects | **OPEN** (`threshold_not_frozen`) |
| Method-quality coefficients | **OPEN** |
| Device-quality registry / Q1–Q5 | **OPEN** |
| Source-independence / corroboration | **OPEN** (`independence_unknown`) |
| Partial-completeness label ceiling | **OPEN** |
| Conflict → Limited automatic mapping | **OPEN** (not applied) |
| Consumer copy | **OPEN** |
| Confidence-to-score display relationship | **OPEN** / scores blocked |

Draft v1 therefore ships a fail-closed Confidence engine that:

1. extracts factual confidence-basis metadata
2. emits supporting / limiting factors
3. withholds all public labels (`label = null`)
4. returns `policy_not_frozen` where assignment would require an unfrozen matrix

---

## 8. Factual dimensions

Confidence may record (non-exhaustive):

- Resolver status
- completeness mode
- primary / supporting / alternate / exclusion counts
- distinct source-system / method-family counts
- verified / measured / estimated / calculated presence
- unknown vs known method
- protocol state (known governed / unknown / missing / unsupported / n/a)
- calculated-provenance state
- dated / undated presence
- `ageDays`, `recencyClass`, `recencyPolicyState`
- conflict / policy-not-frozen flags
- independence state

Counts are factual metadata only. They must not be combined into an undisclosed numeric Confidence model.

---

## 9. Completeness scope

Input and output completeness remain `caller_supplied_partial`.

Confidence must state that assessment is scoped to supplied evidence.  
It must not claim all account evidence / all scans reviewed / account complete.

Partial completeness does **not** automatically map to Limited (rule not frozen).

---

## 10. Resolver-status handling

| Resolver status | Confidence behavior (draft_v1) |
|-----------------|--------------------------------|
| `resolved` / `resolved_with_supporting` / `multiple_valid` | Factual basis extracted; `status=policy_not_frozen`; `label=null` |
| `policy_not_frozen` | `status=policy_not_frozen`; `label=null` |
| `conflict` | `status=conflict`; `label=null` (no automatic Limited) |
| `insufficient` | `status=insufficient`; `label=null` |
| `unsupported` | `status=unsupported`; `label=null` |
| `undated_only` | `status=undated_only`; `label=null` |

Do not assume `resolved_with_supporting` > `resolved`, or that `multiple_valid` is automatically high or low Confidence.

---

## 11. Construct behavior (factual basis only)

| Construct | Example factual basis |
|-----------|-----------------------|
| H1 | standardized WHtR; WHO Waist; VAT mass/volume; complementary channels; unfrozen day-boundary |
| H2 | FMI / BF% / Fat Mass; open BF%/Fat Mass precedence; method known/unknown; FMI provenance |
| H3 | ALMI / FFMI / FFM / Lean; open FFM/Lean precedence; calculated provenance |
| H4 | A/G ratio; android/gynoid fat %; complementary channels |
| P1 | FFMI / FFM / Lean; open unranked channels; calculated provenance |
| P2 | ALMI; limb lean coverage; laterality coverage count |
| P3 | FMI / BF% / Fat Mass; open Fat Mass tertiary; calculated provenance |

No construct uses physiological favorability to assign labels.

---

## 12. Source / method / protocol / calculation

- `sourceSystem ≠ measurementMethod`
- Apple Health unlabeled composition: method=`unknown`, evidenceType=`estimated` — not BIA quality
- Withings may use `consumer_bia` only under governed taxonomy
- Preferred Body Scan category does not establish method
- WHO Waist protocol recorded factually; unknown protocol is never relabelled as WHO
- Calculated evidence: record exact formula version + in-bundle input refs; do not recalculate or repair

---

## 13. Recency

Confidence may expose `ageDays`, `recencyClass`, `recencyPolicyState`.

Exact half-lives and confidence effects remain open. Therefore Confidence must not invent:

- recent = Strong / old = Limited
- freshness percentage
- linear decay / half-life penalty / hard expiry / stale ceiling

---

## 14. Domain confidence

Health-domain and Performance-domain rollups are **not frozen**.

Draft output includes domain assessments with:

- `status = policy_not_frozen`
- `label = null`
- construct ids retained
- no ordinal averaging / majority vote / weighted rollup

---

## 15. Privacy

Do not log evidence values, observation/event/scan/document IDs, timestamps, input refs, UID, filenames, PDF text, paths, URLs, or full Resolver output.

Safe diagnostics tokens only: operation, construct/status/label/reason tokens, count buckets.

Runtime output may retain refs needed for in-memory provenance.

---

## 16. Persistence / UI / scoring boundaries

| Surface | Status |
|---------|--------|
| Firestore / AsyncStorage / snapshots | **none** |
| API routes / Cloud Functions | **none** |
| Consumer Confidence UI | **none** |
| Health Composition score | **STILL BLOCKED** |
| Performance Composition score | **STILL BLOCKED** |
| 0–100 / weights / transforms / cut points | **forbidden** |

---

## 17. Open policies (must remain open)

- exact Limited/Moderate/Good/Strong rule matrix
- overall Health-domain Confidence rollup
- overall Performance-domain Confidence rollup
- recency thresholds
- method-quality policy
- device-quality registry
- source-independence policy
- redundancy/corroboration policy
- partial-completeness label ceiling
- conflict label behavior
- consumer copy
- Confidence-to-score display relationship

Fail closed where open.

---

## 18. Implementation pointers

- Entry: `assessBodyCompositionConfidence`
- Label policy sole producer: `lib/data/body/evidence/confidence/policy.ts`
- Tests: `lib/data/body/evidence/confidence/__tests__/`

---

## 19. Next gate

Independent Confidence re-gate must review:

- policy fidelity
- label assignment / withholding
- Resolver integration
- completeness
- method/protocol/calculation facts
- recency boundary
- value independence
- duplicate/source-count behavior
- no scoring
- privacy / data integrity

Only after independent Confidence PASS and its docs-only truth freeze may Health and Performance Composition score engines be separately planned.
