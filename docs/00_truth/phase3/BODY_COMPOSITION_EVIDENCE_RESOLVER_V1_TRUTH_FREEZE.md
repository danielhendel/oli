# Body Composition Evidence Resolver V1 — Truth Freeze

**Date:** 2026-10-04
**Branch:** `feat/body-composition-stage3e-body-scans-v1`
**Kind:** **docs-only truth freeze** (must not change runtime source, tests, API, Gateway, indexes, rules, Functions, native code, schemas, or product behavior)
**Merge / PR / production:** **NOT** opened or touched by this freeze

> **Rule:** This freeze records an independently approved pure-domain Resolver. It is **not** a new physically tested runtime. Any later runtime change to Resolver contracts/implementation **invalidates** this freeze for downstream Authorization until a new independent scientific re-gate.

---

## 0. Immutable SHA identity

### Approved Resolver runtime SHA

`3ae4737b8212fa5479fa1f621028e32ad7ab5757`

Meaning: this is the source SHA independently reviewed and approved for Body Composition Evidence Resolver V1 (scientific + data-integrity re-gate **PASS**).

### Foundation docs SHA

`ecbad2f0a306045942ed1906ce7f722b7d57f0fe`

Meaning: the truth-frozen Waist / index / Evidence Bridge / Body Scan foundation on which Resolver V1 was implemented.

### Physically approved foundation runtime SHA

`e9397b357642b45eef2a6a40c78217281b375d91`

Meaning: the physically approved Waist / index / Body Scan foundation runtime. Resolver V1 is a pure-domain descendant; it does not reopen that physical gate.

### Docs-only Resolver freeze commit

A subsequent docs-only Resolver truth-freeze commit records this approved runtime and does **not** represent a new runtime build.

### Closed bounded defects (historical → closed at approved SHA)

| ID | Defect | Status |
|----|--------|--------|
| R1 | Unfrozen UTC same-day calendar boundary invented as active policy | **CLOSED** at `3ae4737b…` |
| R2 | Construct rollup collapsed channel `multiple_valid` into `resolved_with_supporting` | **CLOSED** at `3ae4737b…` |
| R3 | Unauthorized secondary-channel precedence chains | **CLOSED** at `3ae4737b…` |
| R4 | Incomplete calculated / index provenance | **CLOSED** at `3ae4737b…` |
| R5 | Resolver-spec trailing whitespace / `git diff --check` failure | **CLOSED** at `3ae4737b…` |

---

## 1. Phase status

| Capability | Status |
|------------|--------|
| Body Composition Evidence Resolver V1 | **IMPLEMENTED** · independent scientific re-gate **PASS** · docs truth freeze **pending independent docs review** |
| Assessment Confidence | **BLOCKED** until this docs freeze passes independent review |
| Health Composition score (0–100) | **STILL BLOCKED** |
| Performance Composition score (0–100) | **STILL BLOCKED** |
| Public numeric scores | **NOT READY** |
| Resolver UI | **NOT IMPLEMENTED** |
| Resolver persistence | **NOT IMPLEMENTED** |
| PR / merge / production deploy | **NOT OPENED / UNTOUCHED** |

Resolver version: `body_composition_resolver_draft_v1`

Not clinically validated · not production calibrated · not score validated.

---

## 2. Architecture (frozen)

```text
SOURCE OBSERVATIONS
       ↓
CANONICAL EVIDENCE BRIDGE
       ↓
EVIDENCE RESOLVER V1  ← this freeze
       ↓
FUTURE Assessment Confidence   (BLOCKED)
       ↓
FUTURE Health / Performance score engines  (BLOCKED)
```

| Property | Rule |
|----------|------|
| Layer | Pure domain (`lib/data/body/evidence/resolver/` + contracts) |
| Inputs | Evidence bundle + explicit `asOf` + resolver version |
| Output | Zod/runtime-validated `BodyCompositionEvidenceResolution` |
| Firebase / Firestore / network | Forbidden |
| React / navigation / AsyncStorage | Forbidden |
| `Date.now()` | Forbidden (explicit `asOf` only) |
| Mutable global truth | Forbidden |
| Persistence / API / consumer UI | Forbidden |
| Source observations | Remain authoritative; Resolver references by ID and does not mutate |

Module authorities:

- Contracts: `lib/contracts/bodyCompositionEvidenceResolver.ts`
- Implementation: `lib/data/body/evidence/resolver/`
- Product spec: `docs/10_product/specs/BODY_COMPOSITION_EVIDENCE_RESOLVER_V1.md`

Presentation selectors (e.g. latest Waist for display) remain **outside** this Resolver.

---

## 3. Output status contract (frozen)

| Status | Meaning |
|--------|---------|
| `resolved` | One governed resolved primary and no additional valid supporting channel |
| `resolved_with_supporting` | Exactly one resolved primary under frozen policy plus explicitly governed supporting/alternate evidence |
| `multiple_valid` | Multiple valid complementary or unresolved channels where one global winner is neither necessary nor authorized |
| `policy_not_frozen` | Evidence exists, but the policy required to choose a representative has not been authorized |
| `conflict` | Reserved for genuinely incompatible evidence/policy states — **not** ordinary multi-method variation |
| `insufficient` | No adequate eligible evidence |
| `undated_only` | Relevant evidence exists but only without a valid measurement date where dated evidence is required |
| `unsupported` | Evidence is outside supported Resolver policy |

### Status rollup lattice (frozen)

```text
conflict
  → policy_not_frozen
  → multiple_valid
  → resolved_with_supporting
  → resolved
  → undated_only / insufficient / unsupported
```

Rules:

- channel `multiple_valid` propagates to construct `multiple_valid`
- channel `policy_not_frozen` propagates
- unresolved multiple primaries never become `resolved_with_supporting`
- `resolved_with_supporting` requires one genuinely resolved frozen primary
- primary / supporting / alternate ref sets remain disjoint
- no unresolved primary is demoted merely to manufacture a resolved status

---

## 4. Completeness (frozen)

- `evidenceBundleCompleteness.mode = caller_supplied_partial`
- Resolver never upgrades to `account_complete`
- A construct may resolve from supplied evidence while the overall bundle remains partial
- Omitted source inputs remain distinct from provided-empty inputs

---

## 5. Eligibility (frozen)

Fail closed on:

- runtime-invalid observation
- unknown metric
- unsupported region
- invalid canonical unit
- non-finite value
- missing / unparseable `measuredAt`
- `measuredAt` later than `asOf`
- source verification where required (Bridge already excludes unverified scans)
- scientific method / protocol / construct-channel eligibility
- exact formula version mismatch
- incomplete calculated input provenance

Invalid evidence is isolated; valid observations remain resolvable.

---

## 6. Same-day DXA policy boundary (frozen correction)

Same-day DXA-over-BIA precedence is:

- **conceptually authorized** by Dual Score freeze
- **INACTIVE** in `body_composition_resolver_draft_v1`

Reason: measurement-day boundary is not frozen.

Resolver V1 must **not** use as a substitute:

- UTC calendar day
- profile-local / source-local / facility-local day
- rolling 24 hours
- fixed-hour proximity

Matching DXA / consumer-or-segmental BIA representatives for the same semantic quantity remain preserved. Where primary resolution depends on the unfrozen boundary:

- status: `policy_not_frozen`
- rationale: `same_day_boundary_not_frozen`, `same_day_precedence_not_applied`

Future activation requires a separate scientific ADR defining timezone, calendar boundary, source timezone metadata, missing-timezone behavior, and DST behavior. The conceptual authorization is **deferred**, not cancelled.

---

## 7. Recency boundary (frozen)

Resolver may emit:

- `ageDays`
- Bridge `recencyClass`
- `recencyPolicyState = threshold_not_frozen`

Resolver must **not** emit until separately frozen:

- freshness percentage
- decay factor
- stale penalty
- hard expiry
- current / aging / historical classification

---

## 8. Comparability (frozen)

Direct comparable sets require compatible:

- canonical metric
- region / laterality
- canonical unit
- scientific method family
- formula version (calculated)
- semantic measurement quantity
- governed protocol where required

Non-equivalences:

- Lean Mass ≠ Fat-Free Mass
- Lean / FFM ≠ Skeletal Muscle Mass
- VAT mass ≠ VAT volume
- BMC ≠ BMD
- Body Fat % ≠ Fat Mass
- total Lean ≠ appendicular Lean
- total-body BMD ≠ site-specific diagnostic BMD
- WHtR ≠ VAT

Complementary construct channels may coexist without numerical comparison.

---

## 9. Construct policies (frozen)

### H1 — Central Adiposity

Channels: standardized WHtR · VAT mass · VAT volume

Policy: **complementary**

- one valid channel → may `resolved`
- multiple valid channels → `multiple_valid`
- no WHtR/VAT numeric comparison, VAT mass↔volume inference, global ordered winner, risk classification, or score

Standardized WHtR requires: `whtr_v1`, governed dated Waist with `who_midpoint_v1` / protocol version 1, governed in-bundle Height, complete input refs.

### H2 — Total Adiposity

Channels: FMI · total Body Fat % · total Fat Mass

Frozen precedence: **FMI over total Body Fat % only**

- Fat Mass is eligible without a frozen tertiary-primary rank
- BF% + Fat Mass without FMI → `policy_not_frozen`
- Fat Mass alone may resolve as sole eligible evidence
- when FMI is primary, Fat Mass may be retained as governed supporting (redundancy), not as a third vote
- no Weight × BF% derivation, BF%→Fat Mass reinterpretation, lower-is-always-better, or score

### H3 — Lean Reserve

Channels: ALMI · FFMI · source-reported FFM · source-reported total Lean (lower-specificity)

Frozen precedence: **ALMI over FFMI only**

- FFM and total Lean remain semantically distinct and unranked against each other when no index primary governs supporting role
- FFM + total Lean without ALMI/FFMI → `policy_not_frozen`
- no total Lean→ALMI, Lean↔FFM substitution, SMM inference, strength/frailty claim, or score

### H4 — Fat Distribution

Channels: source-reported A/G ratio · Android fat % · Gynoid fat %

Policy: **complementary / explanatory**

- no ordered A/G → Android → Gynoid
- multiple valid channels → `multiple_valid`
- no diagnostic claim, independent risk score, or total Body Fat leakage merely through broad tags

### P1 — Muscularity

Eligible channels (approved implementation): FFMI · source-reported FFM · source-reported total Lean

- ALMI is **not** a P1 primary channel (P2 owns appendicular; Dual Score: ALMI is not a second P1 vote)
- no frozen secondary ordered chain (FFMI → FFM → Lean is **not** frozen)
- multiple unranked valid channels → `policy_not_frozen`
- sole eligible channel may `resolved`
- no Lean/FFM→SMM reinterpretation, strength score, more-is-always-better, saturation transform, or performance score

### P2 — Regional Lean

Complementary channels: ALMI · right/left arm Lean · right/left leg Lean

Preserve laterality, measurement date, source identity, method.

No left/right averaging, arm/leg averaging, automatic limb sum, cross-scan/cross-method sum, or SMM reinterpretation.

Multiple valid channels → `multiple_valid`.

### P3 — Performance Adiposity

Channels: FMI · total Body Fat % · total Fat Mass

Frozen precedence: **FMI over total Body Fat % only**

Fat Mass eligible but not a frozen tertiary primary (same openness rules as H2).

No U-shape, favorability transform, athletic category, lower-is-always-better rule, or score.

---

## 10. Calculated formula registry (frozen)

| Metric | Version | Required input roles |
|--------|---------|----------------------|
| BMI | `bmi_v1` | body mass + height |
| WHtR | `whtr_v1` | waist + height |
| FMI | `fmi_v1` | total Fat Mass + height |
| FFMI | `ffmi_v1` | total Fat-Free Mass + height |
| ALMI | `almi_v1` | appendicular limb Lean (≥2 distinct limb regions) + height |

Eligibility requires:

- exact formula version for the metric
- all input refs present in the same bundle
- unique refs where required
- correct metric/region roles
- inputs not future relative to `asOf`
- no self/cyclic provenance
- governed Height explicitly referenced (subjectContext.height alone is insufficient)
- protocol requirements satisfied where applicable

Resolver does **not** search for missing inputs and does **not** calculate missing evidence.

BMI may be validated when present but is **not** an H2/P3 construct channel.

Rejected substitutions: BF%+Weight for Fat Mass; Lean for FFM; total Lean for appendicular Lean; one limb or Resolver-created cross-scan sum for appendicular Lean.

---

## 11. References and rationale (frozen)

- `primaryEvidenceRefs` / `supportingEvidenceRefs` / `alternateEvidenceRefs`
- deterministic, disjoint, duplicate-free, present in the input bundle, not simultaneously excluded
- every relevant candidate is primary, supporting, alternate, or excluded with reason
- no silent candidate disappearance
- rationale / exclusion ordering is deterministic

---

## 12. Determinism / favorability (frozen)

- explicit `asOf`; no `Date.now()`
- stable observation-ID tie-break
- shuffled input yields identical output
- physiological value does not control selection
- never prefers lower BF / Waist / VAT or higher Lean / FFM merely for a future score
- no averaging
- no most-favorable selection

---

## 13. Privacy (frozen)

Resolver logs no evidence values, observation/event/scan/document IDs, timestamps, formula refs, UID, filenames, PDF text, Storage paths, URLs, or full evidence bundles.

Runtime output may reference observations in memory for provenance.

Safe diagnostics/telemetry: operation token · construct token · status token · reason token · count bucket.

---

## 14. Non-persistence (frozen)

No new Firestore collection, Resolver snapshots, AsyncStorage, API, Cloud Function, scheduled job, consumer UI, or deployment from this phase.

Resolver output is recomputed from current evidence. Source correction/deletion naturally changes future output.

---

## 15. Assessment Confidence boundary (frozen)

Assessment Confidence: **NOT IMPLEMENTED** · **BLOCKED** until this docs freeze passes independent review.

Resolver contains no Limited/Moderate/Good/Strong label, confidence number/percentage, quality coefficient, device coefficient, or method-quality result.

Resolver may provide factual selection metadata for a future Confidence phase without computing Confidence.

---

## 16. Scoring boundary (frozen)

Health Composition score: **NOT IMPLEMENTED**
Performance Composition score: **NOT IMPLEMENTED**

Resolver contains no 0–100 result, construct score, weights, transforms, dampening, thresholds, status bands, targets, or consumer score UI.

Public scores remain **NOT READY**.

---

## 17. Open policies (must remain open)

- measurement-day boundary / timezone / DST / missing-timezone behavior
- exact recency half-lives and freshness coefficients
- device-quality / method-quality coefficients
- Assessment Confidence coefficients
- score transforms / weights / dampening caps / cut points
- public status labels
- clinical calibration
- unranked secondary winners beyond frozen pairs (BF% vs Fat Mass; FFM vs Lean; P1 multi-channel)
- H1 global winner when WHtR and VAT both current

Resolver fails closed (`policy_not_frozen` / `multiple_valid` / `threshold_not_frozen`) rather than inventing these.

---

## 18. Independently approved test and gate evidence

Recorded at approved Resolver SHA `3ae4737b8212fa5479fa1f621028e32ad7ab5757`:

| Gate | Result |
|------|--------|
| Focused Resolver suites / tests / skipped | 3 / 54 / 0 |
| Full Jest suites / tests / skipped | 1166 / 7200 / 0 |
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
| Expo Doctor | 4 pre-existing advisories |

---

## 19. Runtime / deployment status

| Surface | Status |
|---------|--------|
| Resolver phase | Pure domain only |
| Consumer UI | Unchanged by Resolver |
| API | Unchanged by Resolver |
| Persistence | Unchanged by Resolver |
| Deployment | NONE |
| Production | UNTOUCHED |
| Physical phone gate | Not required for pure-domain Resolver; not claimed as a new physical runtime |

Foundation physical runtime SHA `e9397b357642b45eef2a6a40c78217281b375d91` remains the physical foundation authority. This Resolver freeze does not alter Waist truth, Body Scan registry, category navigation, pagination, scroll containment, or staging lineage.

---

## 20. Downstream authorization

```text
FOUNDATION PHYSICALLY APPROVED (runtime e9397b35…)
        ↓
FOUNDATION DOCS TRUTH FREEZE (ecbad2f0…)
        ↓
RESOLVER IMPLEMENTATION + SCIENTIFIC RE-GATE PASS (3ae4737b…)
        ↓
RESOLVER DOCS-ONLY TRUTH FREEZE  ← this document (pending independent docs re-gate)
        ↓
ASSESSMENT CONFIDENCE — BLOCKED until docs freeze re-gate PASS
        ↓
DRAFT HEALTH / PERFORMANCE SCORE ENGINES — BLOCKED
```

---

## 21. Companion documents

- Resolver product spec: `docs/10_product/specs/BODY_COMPOSITION_EVIDENCE_RESOLVER_V1.md`
- Evidence Bridge: `docs/10_product/specs/BODY_COMPOSITION_EVIDENCE_BRIDGE_V1.md`
- Foundation freeze: `docs/00_truth/phase3/STAGE_3E_WAIST_INDEX_BODY_SCAN_FOUNDATION_TRUTH_FREEZE.md`
- Progress map: `docs/00_truth/REPO_TRUTH_PROGRESS_MAP.md`
- Roadmap: `docs/10_product/roadmap/ROADMAP_REALITY.md`
