# Body Composition Assessment Confidence V1 — Truth Freeze

**Date:** 2026-10-04
**Branch:** `feat/body-composition-stage3e-body-scans-v1`
**Kind:** **docs-only truth freeze** (must not change runtime source, tests, API, Gateway, indexes, rules, Functions, native code, schemas, or product behavior)
**Merge / PR / production:** **NOT** opened or touched by this freeze

> **Rule:** This freeze records an independently approved pure-domain Assessment Confidence implementation. It is **not** a new physically tested runtime. Any later runtime change to Confidence contracts/implementation **invalidates** this freeze for downstream Authorization until a new independent re-gate.

---

## 0. Immutable SHA identity

### Approved Assessment Confidence implementation SHA

`dc506bbe6881637f8025af842974df41afdef3ab`

Meaning: this is the runtime/domain source independently reviewed and approved for Body Composition Assessment Confidence V1 (policy / data-integrity / value-independence re-gate **PASS**).

### Docs-consistency correction SHA

`caa9cb4336aebac0df3812705ecdf3d36a11fef0`

Meaning: this commit corrected phase-status documentation and trailing whitespace only. It did **not** change Confidence runtime code (`lib/contracts/bodyCompositionAssessmentConfidence.ts` and `lib/data/body/evidence/confidence/` are byte-for-byte identical to the approved implementation SHA).

### Approved Resolver docs truth-freeze SHA

`49751716b450e6d05d607938e52624d29d680a1c`

### Approved Resolver runtime SHA

`3ae4737b8212fa5479fa1f621028e32ad7ab5757`

### Physically approved foundation runtime SHA

`e9397b357642b45eef2a6a40c78217281b375d91`

Meaning: the physically approved Waist / index / Body Scan foundation runtime. Assessment Confidence is a pure-domain descendant; it does not reopen that physical gate.

### Docs-only Confidence freeze commit

A subsequent docs-only Confidence truth-freeze commit records this approved implementation and does **not** represent a new runtime build.

---

## 1. Phase status

| Capability | Status |
|------------|--------|
| Foundation (physical + docs) | **PASS** |
| Body Composition Evidence Resolver V1 | **IMPLEMENTED** · scientific re-gate **PASS** · docs truth-freeze re-gate **PASS** |
| Assessment Confidence implementation | **PASS** at `dc506bbe6881637f8025af842974df41afdef3ab` |
| Assessment Confidence independent policy/data/value re-gate | **PASS** |
| Assessment Confidence docs-only truth freeze | **THIS DOCUMENT** · pending independent docs review |
| Health Composition score (0–100) | **STILL BLOCKED** |
| Performance Composition score (0–100) | **STILL BLOCKED** |
| Public numeric scores | **NOT READY** |
| Confidence UI | **NOT IMPLEMENTED** |
| Confidence persistence | **NOT IMPLEMENTED** |
| PR / merge / production deploy | **NOT OPENED / UNTOUCHED** |

Confidence version: `body_composition_assessment_confidence_draft_v1`

Not clinically validated · not production calibrated · not score validated.

Constant: `BODY_COMPOSITION_CONFIDENCE_FROZEN_LABEL_RULE_COUNT = 0`

---

## 2. Definition (frozen)

Assessment Confidence answers:

> How well-supported is this assessment by the supplied evidence and the currently frozen scientific policies?

Assessment Confidence does **not** mean:

- health favorability
- low or high disease risk
- body-composition quality
- athletic ability
- strength
- physiological performance
- Health Composition score
- Performance Composition score

**Confidence in assessment ≠ favorable health result.**

Strong future Assessment Confidence may coexist with an unfavorable physiological result.
Limited future Assessment Confidence may coexist with a favorable-looking physiological result.

Confidence describes evidence support only.

---

## 3. Architecture (frozen)

```text
SOURCE OBSERVATIONS
       ↓
CANONICAL EVIDENCE BRIDGE
       ↓
EVIDENCE RESOLVER
       ↓
ASSESSMENT CONFIDENCE V1  ← this freeze
       ↓
FUTURE Health / Performance score engines  (STILL BLOCKED)
```

| Property | Rule |
|----------|------|
| Version | `body_composition_assessment_confidence_draft_v1` |
| Layer | Pure domain (`lib/data/body/evidence/confidence/` + contracts) |
| Inputs | Evidence bundle + approved Resolver output + explicit `asOf` + versions |
| Output | Zod/runtime-validated `BodyCompositionAssessmentConfidence` |
| Firebase / Firestore / Storage / network | Forbidden |
| React / navigation / AsyncStorage | Forbidden |
| `Date.now()` / randomness | Forbidden |
| Persistence / API / Functions / consumer UI | Forbidden |
| Source observations | Remain authoritative; Confidence does not mutate them |
| Resolver output | Consumed; never re-selected, mutated, or repaired |

Module authorities:

- Contracts: `lib/contracts/bodyCompositionAssessmentConfidence.ts`
- Implementation: `lib/data/body/evidence/confidence/`
- Product spec: `docs/10_product/specs/BODY_COMPOSITION_ASSESSMENT_CONFIDENCE_V1.md`

Confidence must not:

- select a different evidence winner
- alter Resolver status
- move / reclassify Resolver refs
- repair `policy_not_frozen`
- repair invalid provenance
- reintroduce excluded evidence
- mutate source evidence
- calculate favorability or scores

---

## 4. Label terminology (frozen)

### Permitted public terminology

Limited · Moderate · Good · Strong

(`limited` · `moderate` · `good` · `strong` in runtime enums)

### Forbidden

Very High · Excellent · Elite · Perfect · Certain · Guaranteed · percentage labels · numeric Confidence

These four permitted words are **terminology only** in draft V1. They do not define the rules needed to assign them.

---

## 5. Zero label rules (frozen)

`BODY_COMPOSITION_CONFIDENCE_FROZEN_LABEL_RULE_COUNT = 0`

Exact Limited / Moderate / Good / Strong assignment matrix: **OPEN / NOT FROZEN**.

Therefore:

| Surface | Label |
|---------|-------|
| Every construct (H1–H4, P1–P3) | `null` |
| Health-domain assessment | `null` |
| Performance-domain assessment | `null` |

No label is inferred, approximated, or selected by common sense.

---

## 6. Label nullability (frozen)

`label` is nullable.

`null` is the correct governed output when no frozen assignment policy exists.

The system must **not** use Limited as a default, error, or fallback label.

---

## 7. `assessed` status (frozen)

`assessed` means: a qualitative Confidence label was successfully assigned using a frozen policy.

Because draft V1 has zero frozen label rules: **`assessed` is unreachable**.

Forbidden:

- `assessed` + `label null`
- `assessed` merely because factual metadata exists

---

## 8. Output statuses (frozen)

Approved Confidence statuses:

| Status | Meaning |
|--------|---------|
| `assessed` | Frozen qualitative rule successfully applied (currently unreachable) |
| `insufficient` | Required evidence absent |
| `unsupported` | Evidence outside supported Confidence/Resolver policy |
| `conflict` | Resolver reports a genuine conflict |
| `undated_only` | Relevant evidence exists only without required dates |
| `policy_not_frozen` | Evidence may be resolved or factual basis available, but qualitative assignment policy remains open |

---

## 9. Resolver status mapping (frozen)

| Resolver status | Confidence status | Label |
|-----------------|-------------------|-------|
| `resolved` | `policy_not_frozen` | `null` |
| `resolved_with_supporting` | `policy_not_frozen` | `null` |
| `multiple_valid` | `policy_not_frozen` | `null` |
| `policy_not_frozen` | `policy_not_frozen` | `null` |
| `conflict` | `conflict` | `null` |
| `insufficient` | `insufficient` | `null` |
| `undated_only` | `undated_only` | `null` |
| `unsupported` | `unsupported` | `null` |

Distinct Resolver states are preserved. No generic low-confidence fallback.

---

## 10. Domain assessments (frozen)

| Domain | Status | Label |
|--------|--------|-------|
| Health | `policy_not_frozen` | `null` |
| Performance | `policy_not_frozen` | `null` |

Domain rollup policy is **OPEN**.

Forbidden: averaging · majority vote · weakest-link · strongest-link · ordinal conversion · weights · point total.

---

## 11. Completeness (frozen)

| Field | Value |
|-------|-------|
| Input completeness | `caller_supplied_partial` |
| Output completeness | `caller_supplied_partial` |
| Scope | `scoped_to_supplied_evidence_only` |

Never claim: account complete · all scans reviewed · all evidence reviewed.

Partial scope is a factual limiting factor. Partial does **not** automatically map to Limited.

---

## 12. Parser-confidence separation (frozen)

Body Scan parser/extraction candidate confidence is **not** consumed by Assessment Confidence.

Parser confidence is not:

- scientific evidence quality
- measurement reliability
- Assessment Confidence
- a label input
- a score input

Other domains' confidence engines are not reused.

Implementation rationale includes: `parser_confidence_not_consumed`.

---

## 13. Value independence (frozen)

Assessment Confidence does not inspect physiological magnitude to determine status, label, factors, rationale, or domain output.

It never rewards: lower Body Fat · lower Waist · lower VAT · lower A/G · higher Lean · higher FFM · higher BMD.

Value-reversal tests with identical evidence provenance produce identical Confidence output.

---

## 14. Factual dimensions (frozen)

Confidence may expose factual metadata such as:

- Resolver status
- primary / supporting / alternate / exclusion counts
- distinct source-system / method-family counts
- verified-source / estimated-evidence / unknown-method presence
- protocol state
- calculated-provenance state
- dated/undated state
- `ageDays` · `recencyClass` · `recencyPolicyState`
- conflict / policy flags
- independence state

These are metadata only — not points, weights, scores, or labels.

---

## 15. Counts / duplicates (frozen)

- More evidence does not automatically increase Confidence
- More source systems do not automatically increase Confidence
- Duplicate observation IDs do not increase counts or Confidence
- Duplicate Resolver refs do not increase Confidence
- Multiple facts from one scan are not independent corroboration
- Distinct observations with identical values may remain distinct but do not automatically improve Confidence

---

## 16. Independence (frozen)

When source independence cannot be proven: `independence_unknown`.

Do not infer independence merely from different source-system labels, different metrics from the same scan, Apple Health and a vendor app, repeated imports, or duplicate storage paths.

No corroboration label policy is frozen.

---

## 17. Source vs method (frozen)

`sourceSystem` ≠ `measurementMethod`.

Apple Health unlabeled composition:

- source: `apple_health`
- method: `unknown`
- evidence type: `estimated`

Apple Health does not receive BIA quality treatment.
Withings may factually report `consumer_bia` under its governed taxonomy.
Body Scan category does not establish scientific method.
Confidence consumes the canonical method only.

---

## 18. Protocol facts (frozen)

Protocol states may include: `known_governed` · `unknown` · `missing` · `unsupported` · `not_applicable`.

Standardized Waist protocol: `who_midpoint_v1` / protocol version `1`.

Unknown/missing protocol is never relabelled WHO.
Protocol state remains factual and does not assign a qualitative label.

---

## 19. Calculated-provenance facts (frozen)

Confidence may factually record:

- exact governed formula version
- complete in-bundle input references
- governed Height
- governed WHO Waist where required
- provenance complete / unavailable

Confidence does not: recalculate · repair dangling references · search for missing inputs · override Resolver exclusions · assign a qualitative label from provenance.

---

## 20. Recency boundary (frozen)

Confidence may expose: `ageDays` · `recencyClass` · `recencyPolicyState`.

Exact thresholds remain **OPEN**.

No: freshness percentage · decay factor · half-life penalty · hard expiry · stale ceiling · label effect.

`recencyPolicyState`: `threshold_not_frozen`.

---

## 21. Method / device quality boundary (frozen)

No frozen: method coefficients · device coefficients · method ranking · device ranking · Q1–Q5 mapping · reliability weighting.

No: DXA = Strong · BIA = Moderate · manual = Limited · Apple Health = Limited.

Method/device fields remain factual only.

---

## 22. Supporting factors (frozen)

Approved supporting-factor examples include:

- `resolver_primary_resolved`
- `resolver_supporting_present`
- `verified_source_present`
- `measured_evidence_present`
- `governed_protocol_present`
- `calculated_provenance_complete`
- `dated_evidence_present`
- `complementary_channel_present`
- `known_method_present`

Factors are factual, deterministic, value-free, identity-free. They do not assign a label.

---

## 23. Limiting factors (frozen)

Approved limiting-factor examples include:

- `caller_supplied_partial`
- `label_assignment_policy_not_frozen`
- `method_unknown`
- `protocol_unknown`
- `protocol_missing`
- `undated_only`
- `conflict_present`
- `multiple_valid_unranked`
- `calculated_provenance_unavailable`
- `recency_threshold_not_frozen`
- `device_quality_policy_not_frozen`
- `method_quality_policy_not_frozen`
- `independence_unknown`
- `estimated_evidence_present`
- `domain_rollup_policy_not_frozen`
- `insufficient_required_inputs`
- `unsupported_evidence`

Limiting factors are factual; they are not health judgments; they do not automatically assign Limited.

---

## 24. Rationale completeness (frozen)

Every construct assessment explains:

- Confidence status
- why label is null
- supporting facts
- limiting facts
- which policy remains open

No silent label assignment. No silent label withholding.

---

## 25. Construct basis (frozen)

| Construct | Factual basis may include | Forbidden |
|-----------|---------------------------|-----------|
| H1 | standardized WHtR; VAT mass/volume; WHO Waist; Height provenance; complementary channels; open day-boundary | magnitude comparison; risk; favorability; label |
| H2 | FMI; BF%; Fat Mass; method/provenance; open BF%/Fat Mass precedence | Fat Mass derivation; lower-fat reward; label; score |
| H3 | ALMI; FFMI; FFM; total Lean; provenance; open FFM/Lean precedence | SMM/strength inference; higher-Lean reward; label; score |
| H4 | A/G Ratio; Android/Gynoid fat %; complementary channels | channel ranking; risk; favorability; label |
| P1 | FFMI; FFM; total Lean; open/unranked channels | SMM/strength inference; larger-value reward; label; score |
| P2 | ALMI; limb Lean; laterality coverage; source/method/date facts | averaging; cross-scan sum; symmetry reward; completeness→Strong; label |
| P3 | FMI; BF%; Fat Mass; provenance; open tertiary precedence | U-curve; athletic class; lower-fat reward; label; score |

---

## 26. Domain rollup boundary (frozen)

Health-domain and Performance-domain qualitative rollup policies remain **OPEN**.

No: average · majority vote · weakest-link · strongest-link · ordinal mapping · weights · point total.

Domain status remains `policy_not_frozen` with `label null`.

---

## 27. No numeric / ordinal model (frozen)

No: numeric Confidence · percentage · points · weights · normalized quality · coefficient · multiplier · ordinal label mapping.

Labels are names, not numbers. Factual counts remain metadata only.

---

## 28. Privacy (frozen)

Confidence logs no: health values · observation/event/scan/document IDs · timestamps · formula refs · UID · filenames · PDF text · paths · URLs · full Resolver result · full evidence bundle.

Runtime output may retain required in-memory refs.

Safe diagnostics: operation token · construct token · status token · reason token · count bucket.

---

## 29. Non-persistence (frozen)

No: Firestore collection · Confidence snapshot · AsyncStorage · API route · Cloud Function · scheduled job · export duplicate · account-delete lifecycle · consumer UI.

Confidence is runtime-derived.

---

## 30. Scoring boundary (frozen)

| Capability | Status |
|------------|--------|
| Health Composition score | **NOT IMPLEMENTED** · **STILL BLOCKED** |
| Performance Composition score | **NOT IMPLEMENTED** · **STILL BLOCKED** |
| Public numeric scores | **NOT READY** |

No: construct score · score weights · transforms · dampening · thresholds · cut points · 0–100 · public score UI · disease-risk probability · performance classification.

Score-engine planning remains **blocked until this Confidence docs truth-freeze re-gate PASS**.

---

## 31. Open policies (must remain open)

- Limited / Moderate / Good / Strong assignment matrix
- Health-domain Confidence rollup
- Performance-domain Confidence rollup
- recency thresholds
- method-quality policy
- device-quality registry
- source-independence policy
- redundancy / corroboration policy
- partial-completeness label ceiling
- conflict label behavior
- consumer wording
- Confidence-to-score display relationship

Confidence fails closed rather than inventing these.

---

## 32. Independently approved test and gate evidence

Attributed to the independently reviewed implementation SHA `dc506bbe6881637f8025af842974df41afdef3ab` (and its docs-consistency descendant `caa9cb43…`, which did not change Confidence runtime).

This docs-only freeze does **not** claim to have re-run the full runtime suite.

| Evidence | Result |
|----------|--------|
| Confidence focused suites / tests / skipped | 3 / 31 / 0 |
| Resolver/Bridge regression suites / tests | 7 / 95 |
| Full Jest suites / tests / skipped | 1169 / 7231 / 0 |
| npm ci | PASS |
| typecheck | PASS |
| lint | PASS |
| invariants | PASS |
| client trust boundary | PASS |
| npm run check | PASS |
| runtime workout-summary checksum | PASS |
| canonical workout-summary checksum | known Darwin/Linux drift; not refreshed on Darwin |
| API build | PASS |
| Functions build | PASS |
| Firestore rules tests | PASS |
| Storage rules tests | PASS |
| git diff --check | PASS |
| Phase 3 specs | `ASSERT_PHASE3_SPECS_OK` |
| Expo Doctor | 4 pre-existing advisories |

---

## 33. Runtime / deployment status

| Surface | Status |
|---------|--------|
| Consumer runtime | Unchanged by Confidence |
| API | Unchanged |
| Persistence | None |
| Deployment | NONE |
| Production | UNTOUCHED |
| Physical phone gate | Not required for pure-domain Confidence or docs-only freeze |

This docs-only freeze commit is **not** a new runtime build.

---

## 34. Downstream authorization

```text
FOUNDATION PHYSICALLY APPROVED (runtime e9397b35…)
        ↓
FOUNDATION DOCS TRUTH FREEZE
        ↓
RESOLVER IMPLEMENTATION + SCIENTIFIC RE-GATE PASS (3ae4737b…)
        ↓
RESOLVER DOCS-ONLY TRUTH FREEZE RE-GATE PASS (49751716…)
        ↓
ASSESSMENT CONFIDENCE IMPLEMENTATION PASS (dc506bbe…)
        ↓
ASSESSMENT CONFIDENCE INDEPENDENT RE-GATE PASS
        ↓
ASSESSMENT CONFIDENCE DOCS-ONLY TRUTH FREEZE  ← this document (pending independent docs re-gate)
        ↓
SCORE-ENGINE PLANNING — BLOCKED until Confidence docs re-gate PASS
        ↓
HEALTH / PERFORMANCE COMPOSITION SCORE IMPLEMENTATION — STILL BLOCKED
```

---

## 35. Companion documents

- Spec: `docs/10_product/specs/BODY_COMPOSITION_ASSESSMENT_CONFIDENCE_V1.md`
- Resolver freeze: `docs/00_truth/phase3/BODY_COMPOSITION_EVIDENCE_RESOLVER_V1_TRUTH_FREEZE.md`
- Foundation freeze: `docs/00_truth/phase3/STAGE_3E_WAIST_INDEX_BODY_SCAN_FOUNDATION_TRUTH_FREEZE.md`
- Progress map: `docs/00_truth/REPO_TRUTH_PROGRESS_MAP.md`
- Roadmap: `docs/10_product/roadmap/ROADMAP_REALITY.md`
