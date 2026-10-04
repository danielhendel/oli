# Body Composition Dual Score — Internal Draft Engine Implementation Truth Freeze V1

**Document type:** Docs-only implementation-state truth freeze
**Date:** 2026-10-04
**Branch:** `feat/body-composition-stage3e-body-scans-v1`
**Kind:** Documentation only. **Does not** change runtime source, tests, API, Gateway, indexes, rules, Functions, native code, schemas, or product behavior.

| Identity | Value |
|----------|-------|
| Approved implementation SHA | `d940b1616b341e98b19e82f2cd6a6242dfe41691` |
| Mathematical Truth Freeze SHA | `e258267d109d1d05e20270f205e5fdb29ae2aca6` |
| Health engine version | `body_composition_health_score_draft_v1` |
| Performance-Supporting engine version | `body_composition_performance_supporting_score_draft_v1` |
| Independent Exact-Math Implementation Re-Gate V2 | **PASS** |
| Health internal draft engine | **PASS** |
| Performance-Supporting internal draft engine | **PASS** |
| Public Health | **NO-GO** |
| Public Performance-Supporting | **NO-GO** |
| Consumer integration | **NOT AUTHORIZED** |
| PR / production | **NOT OPENED / UNTOUCHED** |

> **Rule:** This freeze records an independently approved pure-domain Dual Score engine implementation. It is **not** a new physically tested runtime. Any later runtime change to score contracts/implementation **invalidates** this freeze for downstream Authorization until a new independent re-gate.

---

## 0. Authority relationship

| Authority | Controls |
|-----------|----------|
| Mathematical Truth Freeze (`BODY_COMPOSITION_DUAL_SCORE_MATHEMATICAL_TRUTH_FREEZE_V1.md` @ `e258267d…`) | Formulas, knots, weights, eligibility, recency, age, reasons, precedence, method restrictions |
| **This Implementation Truth Freeze** | Which runtime implementation was independently proven to match that mathematical freeze |

This document does **not** supersede the Mathematical Truth Freeze for algorithm policy.

Companion implementation map: `docs/10_product/specs/BODY_COMPOSITION_DUAL_SCORE_ENGINE_IMPLEMENTATION_V1.md`

---

## 1. Approved implementation identity

### 1.1 Approved runtime SHA

`d940b1616b341e98b19e82f2cd6a6242dfe41691`

Meaning: this is the Dual Score internal draft engine runtime independently reviewed and approved by Exact-Math Implementation Re-Gate V2 (**PASS**).

### 1.2 Correction lineage

```text
99ccc140a18ec5a6b878c2261359f233f7e49410
  ↓
92e69668 fix(body): enforce score engine precedence and resolver primary
  ↓
d940b161 test(body): cover score engine fail-closed regressions
```

Meaning:

- `99ccc140…` was the initial engine implementation (failed independent re-gate on Defects A/B).
- `92e69668…` closed Defects A/B in runtime.
- `d940b161…` added fail-closed regressions / invariants / bounded docs — **approved implementation SHA**.

### 1.3 Mathematical authority

`e258267d109d1d05e20270f205e5fdb29ae2aca6`

Runtime implementation was independently reviewed against this mathematical freeze. Algorithm policy is unchanged by this docs freeze.

### 1.4 Product names

| Role | Name | Internal id |
|------|------|-------------|
| Health index | **Health Composition** | `health_protection` |
| Second index | **Performance-Supporting Composition** | `performance_support` |

---

## 2. Phase status (frozen)

| Capability | Status |
|------------|--------|
| Evidence foundation | **PASS** |
| Evidence Resolver | **PASS** + truth-frozen |
| Assessment Confidence | **PASS** + truth-frozen |
| Dual Score scientific specification | **PASS** |
| Mathematical truth freeze | **PASS** @ `e258267d…` |
| Health internal engine implementation | **PASS** @ `d940b161…` |
| Performance-Supporting internal engine implementation | **PASS** @ `d940b161…` |
| Independent Exact-Math Implementation Re-Gate V2 | **PASS** |
| Implementation truth freeze | **THIS DOCUMENT** · pending independent docs re-gate |
| Consumer integration | **NOT AUTHORIZED** |
| Public Health score | **NO-GO** |
| Public Performance-Supporting score | **NO-GO** |
| PR / merge / production deploy | **NOT OPENED / UNTOUCHED** |

---

## 3. Architecture (pure domain)

### 3.1 Runtime modules

| Role | Path |
|------|------|
| Contracts | `lib/contracts/bodyCompositionScores.ts` |
| Engine barrel (internal only) | `lib/data/body/evidence/scoring/index.ts` |
| Health entry | `lib/data/body/evidence/scoring/scoreHealthComposition.ts` |
| Performance-Supporting entry | `lib/data/body/evidence/scoring/scorePerformanceSupportingComposition.ts` |
| Construct evaluation (§4.3) | `lib/data/body/evidence/scoring/evaluateConstruct.ts` |
| Channel lookup | `lib/data/body/evidence/scoring/channelLookup.ts` |
| Transforms | `lib/data/body/evidence/scoring/transforms.ts` |
| Piecewise helper | `lib/data/body/evidence/scoring/piecewiseLinear.ts` |
| Age | `lib/data/body/evidence/scoring/age.ts` |
| Recency / era | `lib/data/body/evidence/scoring/recency.ts` |
| Demographics | `lib/data/body/evidence/scoring/demographics.ts` |
| Constants | `lib/data/body/evidence/scoring/constants.ts` |

### 3.2 Pure boundary

Explicitly frozen as **PURE DOMAIN**:

- no Firebase / Firestore / Storage
- no network
- no React / hooks / navigation
- no AsyncStorage
- no `Date.now()`
- no randomness
- no API / Functions
- no persistence
- no consumer UI

Inputs explicit. Outputs deterministic.

---

## 4. Isolation (stronger than a flag)

Independent review proved score engines are **not**:

- imported by consumer screens (`app/`);
- re-exported from the Evidence consumer barrel (`lib/data/body/evidence/index.ts`);
- imported by API;
- imported by Firebase code;
- automatically executed;
- persisted.

Because they are entirely unwired:

- **no feature-flag plumbing was required**;
- isolation is currently **stronger than a runtime flag** — modules have no consumer/runtime integration path.

Do **not** claim a Dual Score feature flag exists.

---

## 5. Result contract

### Available / internal calculated

```text
status = calculated_internal_not_public
score = finite number in [0, 100]
primaryReason = null
```

Still **not public**.

### Unavailable / withheld

```text
status = unavailable
score = null
primaryReason = canonical reason
```

Missing/unavailable is **never** numeric zero. Score `0` is only a valid model output from eligible finite evidence.

Construct shape:

```text
{ value: number | null, primaryReason: ReasonCode | null }
```

---

## 6. Reason vocabulary (exact)

```text
invalid_provenance
future_evidence
evidence_too_old
evidence_era_mismatch
required_age_missing
required_sex_missing
required_height_missing
unsupported_method
conflict_unresolved
policy_not_frozen
multiple_valid_unfrozen
unresolved_construct
p1_ffmi_not_resolved
incomplete_health_composition
insufficient_core_constructs
public_release_not_authorized
```

No synonyms. Construct root causes preserved in `constructReasons`. Aggregate uses §4.2 consequence codes for incomplete cores unless a higher engine gate fires first.

---

## 7. Reason precedence

| Layer | Authority |
|-------|-----------|
| Construct | Mathematical Freeze §4.3 first-match |
| Aggregate | Mathematical Freeze §4.2 first-match |

Independent implementation review specifically proved:

- aggregate measuredAt integrity rank (**§4.2 rank 3**) now fires **before** missing-core rank (**§4.2 rank 7**).

---

## 8. Defect A — CLOSED

### Historical defect (at `99ccc140…`)

Required scoring input with missing/malformed/non-finite `measuredAt` correctly yielded construct `invalid_provenance`, but aggregate incorrectly fell through to:

- Health: `incomplete_health_composition`
- Performance-Supporting: `insufficient_core_constructs`

### Root cause

`collectTs` detected invalid measuredAt but dropped those timestamps from the list returned to the aggregate gate, so engine rank 3 was skipped.

### Corrected behavior (approved SHA `d940b161…`)

Construct evaluation returns explicit:

```text
measuredAtIntegrity: "valid" | "invalid"
```

Aggregate §4.2 rank 3 reads this state mechanically.

Required result:

| Condition | Aggregate primaryReason |
|-----------|-------------------------|
| missing / malformed / non-finite measuredAt | `invalid_provenance` |
| valid but future | `future_evidence` |
| valid but >180d | `evidence_too_old` |

**Defect A: CLOSED.**

---

## 9. Defect B — CLOSED

### Historical defect (at `99ccc140…`)

H3 could scan later `primaryEvidenceRefs` and fall back to ALMI then FFMI when the first Resolver primary was unrelated — score-layer evidence selection.

### Corrected behavior (approved SHA `d940b161…`)

H3 examines **only**:

```text
construct.primaryEvidenceRefs[0]
```

as the Resolver primary representation.

| Primary metric | Behavior |
|----------------|----------|
| ALMI + ALMI channel resolved | ALMI score |
| FFMI + FFMI channel resolved | FFMI score |
| anything else | `unresolved_construct` unless higher frozen failure applies |

No fallback search. No score-layer ALMI>FFMI precedence.

**Defect B: CLOSED.**

---

## 10. Age (frozen match)

Function: `completedUtcYears(dateOfBirth, asOfMs)` — UTC calendar components; no `Date.now()`; no local timezone.

| Case | Result |
|------|--------|
| completed years ≥ 20 | eligible on age dimension |
| day before 20th birthday | `required_age_missing` |
| exact 20th birthday | eligible |
| Feb 29 DOB, non-leap Feb 28 | anniversary not yet |
| Feb 29 DOB, non-leap Mar 1 | anniversary completed |
| missing / malformed / impossible / DOB after asOf | `required_age_missing` |

Never `invalid_provenance` for DOB failures.

---

## 11. Recency (frozen match)

```text
DAY_MS = 86_400_000
MAX_SCORE_INPUT_AGE_MS = 180 * DAY_MS   # inclusive
MAX_SCORE_CONSTRUCT_GAP_MS = 90 * DAY_MS # inclusive
```

Future: `ageMs < 0` → `future_evidence`.

Independent tests covered:

- measuredAt: `asOf+1ms`, `asOf`, `asOf-1ms`, 179d, 180d, 180d+1ms
- gap: 89d, 90d, 90d+1ms

Same verified Body Scan `scanRef` forces era gap contribution 0. Same timestamp alone is insufficient.

---

## 12. H1 implementation

- Metric: standardized WHtR `whtr_v1`
- Method/protocol: WHO midpoint `who_midpoint_v1` version `1` + governed Height
- Knots: `.40→100`, `.50→80`, `.60→50`, `.80→0` (tails saturate)
- VAT mass/volume: **non-scoring**
- H1 `multiple_valid`: may score only when WHtR channel itself is independently resolved (§10.2)

---

## 13. H2 implementation

- Metric: DXA FMI only
- BF% / Fat Mass: **non-scoring**
- Male knots: `2→80`, `3.5→92`, `5.5→92`, `9→50`, `15→10`
- Female knots: `3.5→80`, `5.5→92`, `8.5→92`, `13→50`, `21→10`

---

## 14. H3 implementation

Resolver-primary DXA ALMI:

- Male: `6→15`, `7→55`, `8→92`
- Female: `4.5→15`, `5.5→55`, `6.3→92`

Resolver-primary DXA FFMI:

- Male: `16→15`, `16.7→55`, `18.5→92`
- Female: `14→15`, `14.6→55`, `16→92`

Score layer does **not** select between ALMI and FFMI.

---

## 15. Health aggregate

```text
clip(0.45*H1 + 0.35*H2 + 0.20*H3, 0, 100)
```

- H4 weight: **0%**
- Dampening: **none**
- Renormalization: **none**
- Missing any of H1/H2/H3: no aggregate (`incomplete_health_composition` unless higher §4.2 gate)

---

## 16. P1 implementation

- Metric: DXA FFMI only
- FFM / Lean: **non-scoring** (cannot substitute)
- Male: `16→10`, `16.7→40`, `19→90`, `20.5→95`
- Female: `14→10`, `14.6→40`, `16.5→90`, `17.5→95`
- Special: `policy_not_frozen` before `p1_ffmi_not_resolved`

---

## 17. P3 implementation

- Metric: DXA FMI only
- BF%: **non-scoring**
- Male: `2→80`, `3→92`, `7→92`, `10→45`, `16→8`
- Female: `3.5→80`, `5→92`, `10→92`, `14→45`, `22→8`

---

## 18. Performance-Supporting aggregate

```text
clip(0.50*P1 + 0.50*P3, 0, 100)
```

- P2 weight: **0%**
- Dampening: **none**
- Renormalization: **none**
- Missing P1 or P3: no aggregate (`insufficient_core_constructs` unless higher §4.2 gate)

---

## 19. Method boundary

| Construct | Eligible path |
|-----------|---------------|
| H1 | WHO-midpoint standardized WHtR |
| H2 / H3 / P1 / P3 | DXA |

Unsupported for numeric scoring: consumer BIA; Apple Health unlabeled composition; Withings BIA; unknown Waist protocol.

---

## 20. Resolver authority

Score engine **consumes** approved Resolver output. It does **not**:

- search for a better source;
- select an evidence winner;
- repair conflict;
- repair `policy_not_frozen`.

| Resolver status | Score behavior |
|-----------------|----------------|
| `resolved` | Eligible subject to downstream gates |
| `resolved_with_supporting` | Use Resolver primary only |
| `multiple_valid` | Fail closed except exact frozen H1 WHtR-channel rule |
| `policy_not_frozen` | Fail closed |
| `conflict` | Fail closed |
| `insufficient` | Fail closed |
| `undated_only` | Fail closed → `invalid_provenance` |
| `unsupported` | Fail closed → `unsupported_method` |

---

## 21. Confidence boundary

- Qualitative Assessment Confidence labels: **not required**; not invented
- Factual evidence gating only (Resolver, method, dates, provenance, era, cores)

---

## 22. Numeric handling

- `NaN` / `±Infinity`: fail closed (never coerce to zero)
- Constructs and aggregates: clip `[0, 100]`
- No intermediate rounding
- Canonical internal result: unrounded JS/TS Number

---

## 23. Determinism / immutability

Independent re-gate confirmed:

- shuffled constructs / refs / observations / constructReasons → identical output
- deep-frozen inputs → no mutation
- no hidden clock (`Date.now()` absent)

---

## 24. Privacy

No runtime logging of:

- health values, scores, DOB, timestamps
- source refs, observation IDs, scan IDs, document IDs, UID

Diagnostics: safe operation / version / status / reason / count tokens only.

---

## 25. Synthetic validation (implementation evidence)

| Grid | n | min | max | NaN | Out-of-range |
|------|---|-----|-----|-----|--------------|
| Health | 9282 | ≈6.5 | ≈95.6 | 0 | 0 |
| Performance-Supporting | 578 | ≈9.0 | ≈93.5 | 0 | 0 |

These are **implementation-validation** results — **not** clinical validation.

---

## 26. Test evidence (independent re-gate)

| Suite class | Suites | Tests | Skipped |
|-------------|--------|-------|---------|
| Focused score | 9 | 101 | 0 |
| Score + Resolver + Confidence + Bridge | 19 | 227 | 0 |
| Full Jest | 1178 | 7332 | 0 |

---

## 27. Code-check gates (independent re-gate)

| Gate | Result |
|------|--------|
| npm ci | PASS |
| typecheck | PASS |
| lint | PASS |
| invariants | PASS |
| trust-boundary | PASS |
| check | PASS |
| runtime checksum | PASS |
| canonical checksum | known Darwin/Linux drift retained — **not** a Dual Score defect |
| API build | PASS |
| Functions build | PASS |
| Firestore rules | PASS |
| Storage rules | PASS |
| git diff --check | PASS |
| Expo Doctor | 14/18 with 4 pre-existing advisories |

---

## 28. Physical gate

Physical phone test: **NOT REQUIRED**.

Reason: engines are pure, unwired, non-UI, non-API domain code.

---

## 29. Public / consumer boundary

| Topic | Status |
|-------|--------|
| Public Health | **NO-GO** |
| Public Performance-Supporting | **NO-GO** |
| Consumer integration | **NOT AUTHORIZED** |
| Staging / READY / authorized public claims | **Forbidden** |

Do not call public scores STAGED, READY, or authorized.

---

## 30. Non-persistence

None of:

- Firestore / Storage / AsyncStorage
- API / Functions
- score snapshots / score history
- export / account-deletion additions for scores

Pure runtime derivation only when explicitly invoked in internal tooling/tests.

---

## 31. Next sequence

```text
scientific planning PASS
        ↓
mathematical freeze PASS (e258267d…)
        ↓
implementation PASS (d940b161…)
        ↓
independent Exact-Math Implementation Re-Gate V2 PASS
        ↓
THIS implementation truth freeze (docs)
        ↓
independent implementation-freeze docs re-gate
        ↓
future PRIVATE / internal validation planning (separate)
```

Public / consumer UI integration remains separately blocked.

---

## 32. Zero-engineer-choice declaration (implementation)

For the approved SHA, every branch for measuredAt integrity propagation, H3 Resolver-primary-only selection, construct/aggregate precedence, and fail-closed Resolver statuses is frozen by the Mathematical Truth Freeze plus this implementation record.

**Remaining runtime scientific/product choices for draft_v1 engines:** none.
**Public authorization:** none.
**Consumer wiring:** none.

---

END OF IMPLEMENTATION TRUTH FREEZE V1
