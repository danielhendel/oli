# Body Composition Dual Score — Internal Draft Engine Implementation V1

**Document type:** Implementation map (docs only for consumers; engines are pure domain code)
**Date:** 2026-10-04
**Branch:** `feat/body-composition-stage3e-body-scans-v1`
**Authority for math:** `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_MATHEMATICAL_TRUTH_FREEZE_V1.md` @ `e258267d109d1d05e20270f205e5fdb29ae2aca6`
**Canonical implementation freeze:** `docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_ENGINE_IMPLEMENTATION_TRUTH_FREEZE_V1.md`
**This document does not rewrite the mathematical truth freeze.**

| Identity | Value |
|----------|-------|
| Approved implementation SHA | `d940b1616b341e98b19e82f2cd6a6242dfe41691` |
| Health engine version | `body_composition_health_score_draft_v1` |
| Performance-Supporting engine version | `body_composition_performance_supporting_score_draft_v1` |
| Health internal draft engine | **PASS** |
| Performance-Supporting internal draft engine | **PASS** |
| Independent Exact-Math Implementation Re-Gate V2 | **PASS** |
| Implementation truth freeze | **CREATED / PENDING INDEPENDENT DOCS RE-GATE** |
| Public Health | **NO-GO** |
| Public Performance-Supporting | **NO-GO** |
| Consumer integration | **NOT AUTHORIZED** |
| Persistence | **None** |
| Consumer UI | **None** |
| API / Functions / Firestore / Storage | **None** |

---

## 1. Modules

| Role | Path |
|------|------|
| Contracts | `lib/contracts/bodyCompositionScores.ts` |
| Engine barrel (internal only) | `lib/data/body/evidence/scoring/index.ts` |
| Health entry | `lib/data/body/evidence/scoring/scoreHealthComposition.ts` |
| Performance-Supporting entry | `lib/data/body/evidence/scoring/scorePerformanceSupportingComposition.ts` |
| Construct evaluation (§4.3) | `lib/data/body/evidence/scoring/evaluateConstruct.ts` |
| Channel lookup (Resolver-consuming) | `lib/data/body/evidence/scoring/channelLookup.ts` |
| Transforms | `lib/data/body/evidence/scoring/transforms.ts` |
| Piecewise helper | `lib/data/body/evidence/scoring/piecewiseLinear.ts` |
| Age (UTC completed years) | `lib/data/body/evidence/scoring/age.ts` |
| Recency / era | `lib/data/body/evidence/scoring/recency.ts` |
| Demographics | `lib/data/body/evidence/scoring/demographics.ts` |
| Constants | `lib/data/body/evidence/scoring/constants.ts` |

The evidence barrel (`lib/data/body/evidence/index.ts`) **does not** re-export score engines, so consumer runtime cannot reach them via the standard evidence import path.

---

## 2. Pure boundary

Allowed: pure TypeScript domain under `lib/contracts/` and `lib/data/body/evidence/scoring/`.

Forbidden in this phase:

- Firebase / Firestore / Storage / network / Cloud Functions
- API routes
- React / hooks / navigation
- AsyncStorage
- `Date.now()` / randomness
- Consumer telemetry containing health values
- Consumer UI / dashboard / badges / tooltips
- Score persistence / history / export

Inputs are explicit. Outputs are deterministic. No persistence. No deployment.

---

## 3. Input contracts

Both engines accept:

| Field | Meaning |
|-------|---------|
| `bundle` | Canonical Evidence Bridge bundle (caller-supplied partial) |
| `resolution` | Approved Evidence Resolver output (validated; not mutated) |
| `asOf` | Explicit ISO evaluation instant (never `Date.now()`) |
| optional version pins | Must match frozen draft versions |

Demographics come from `bundle.subjectContext` (`dateOfBirth`, `sexAtBirth` male/female only, height).

Assessment Confidence qualitative labels are **not required** and remain unused. Factual eligibility is enforced by Resolver status + score-layer gates.

---

## 4. Output contracts

### Construct

```text
{ value: number | null, primaryReason: ReasonCode | null }
```

`value` is null when withheld. **Never** use `0` as missing/unavailable.

### Aggregate

```text
{
  version, resolverVersion, asOf,
  status: "unavailable" | "calculated_internal_not_public",
  score: number | null,
  primaryReason: ReasonCode | null,
  constructScores, constructReasons,
  evidenceScope, diagnostics
}
```

Successful internal calculation uses `calculated_internal_not_public` — still **not public**.

---

## 5. Versions

- Health: `body_composition_health_score_draft_v1`
- Performance-Supporting: `body_composition_performance_supporting_score_draft_v1`

---

## 6. Reason model

Exact canonical vocabulary from the Mathematical Truth Freeze (no synonyms).

Construct `primaryReason` preserves root cause. Aggregate `primaryReason` uses engine-level §4.2 precedence, then:

- Health incomplete cores → `incomplete_health_composition`
- Performance-Supporting incomplete cores → `insufficient_core_constructs`

`constructReasons` always retains unavailable construct root causes.

`public_release_not_authorized` applies only to a public-surface gate after an otherwise-valid internal calculation. This phase has no public exposure path.

### 6.1 Aggregate measuredAt integrity (§4.2 rank 3)

Construct evaluation returns explicit `measuredAtIntegrity: "valid" | "invalid"`.

- `"invalid"` when a required scoring observation for that construct has missing / malformed / non-finite `measuredAt`, or Resolver construct status is `undated_only`.
- Aggregate rank 3 uses these flags mechanically — **not** by re-deriving from filtered finite timestamp arrays.
- Rank 3 (`invalid_provenance`) wins before rank 7 missing-core reasons (`incomplete_health_composition` / `insufficient_core_constructs`).
- Future / stale remain distinct (`future_evidence` / `evidence_too_old`) after rank 3 clears.

**Defect A: CLOSED** at approved implementation SHA.

### 6.2 H3 Resolver-primary-only (§12.1)

Canonical primary representation: `construct.primaryEvidenceRefs[0]` on the approved Resolver construct result.

- If that primary observation is ALMI and the ALMI channel is resolved → score ALMI.
- If that primary observation is FFMI and the FFMI channel is resolved → score FFMI.
- Otherwise → no H3 scoring channel (`unresolved_construct` unless a higher-precedence failure applies).

The score layer must **not** search later refs, try ALMI then FFMI, or encode ALMI>FFMI.

**Defect B: CLOSED** at approved implementation SHA.

---

## 7. Isolation mechanism

**Chosen:** no runtime consumer integration and no feature-flag plumbing.

Score engines live only under `lib/data/body/evidence/scoring/` and are intentionally omitted from the evidence barrel export. Nothing in `app/`, API, or Functions imports them.

Isolation is currently **stronger than a runtime flag** because the modules have no consumer/runtime integration path.

---

## 8. Non-public / no persistence / no UI / no public release

| Topic | Status |
|-------|--------|
| Internal draft engines | **PASS** @ `d940b161…` · Independent Exact-Math Implementation Re-Gate V2 **PASS** |
| Implementation truth freeze | **CREATED / PENDING INDEPENDENT DOCS RE-GATE** |
| Public Health score | **NO-GO** |
| Public Performance-Supporting score | **NO-GO** |
| Consumer integration | **NOT AUTHORIZED** |
| Persistence | None |
| UI | None |
| API | None |
| Production | Untouched |

---

## 9. Next gate

Open a **new independent** Cursor Agent for a **docs-only** implementation truth-freeze re-gate against the exact new docs SHA.

That review must prove: docs-only delta; approved implementation SHA exact; Mathematical Freeze SHA exact; Defects A/B closed accurately; architecture pure/unwired/non-persistent; test/gate evidence accurately attributed; no runtime drift; public scores remain NO-GO; consumer integration remains unauthorized.

Only after independent docs PASS: decide the next **PRIVATE/internal** validation phase.

Do **not** begin consumer UI integration.

---

END OF ENGINE IMPLEMENTATION V1
