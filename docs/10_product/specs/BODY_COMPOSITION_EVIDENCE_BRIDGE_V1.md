# Canonical Body Composition Evidence Bridge

**Status:** Stage 3E implemented (derived view) — **truth-frozen** at physically approved runtime SHA `e9397b357642b45eef2a6a40c78217281b375d91` (**PASS**); initial docs freeze `0fabe4721c311a1a6a8f77a72cc600683e659224`; see `docs/00_truth/phase3/STAGE_3E_WAIST_INDEX_BODY_SCAN_FOUNDATION_TRUTH_FREEZE.md`
**Authority:** Subordinate to Constitution / code+CI; companion to Body Scan registry and Dual Score scientific freeze
**Model status:** `evidence_informed` — not clinically validated

## Architecture

```text
SOURCE FACTS (authoritative)
  continuous RawEvents (weight / body_composition incl. dated waist)
  profile anthropometry (height; legacy undated waist retained in store/export only — omitted from active subject context)
  verified Body Scan facts (via detail DTO)
        ↓
SOURCE ADAPTERS (pure)
  — Waist protocol preserved only when explicitly reported; missing ≠ who_midpoint_v1
        ↓
CANONICAL EVIDENCE OBSERVATIONS
  BodyCompositionEvidenceBundle
        ↓
EXPLICIT DETERMINISTIC INDEX HELPERS (BMI / WHtR / FMI / FFMI / ALMI)
  — never auto-emitted by the bridge
  — legacy profile waist is not an automatic WHtR input
        ↓
Evidence Resolver               ← implemented separately (draft v1; scientific re-gate PASS at 3ae4737b…; docs freeze re-gate PASS; not in this bridge module)
       ↓
ASSESSMENT CONFIDENCE           ← implementation PASS · docs truth-freeze re-gate PASS at d2b0b3ab…
       ↓
FUTURE Health / Performance-Supporting Composition scores ← STILL BLOCKED (Scientific Re-Gate V2 PASS; math freeze pending independent review)
```

## Persistence strategy

**Derived runtime view only.** Source facts remain authoritative.

- No new Firestore collection
- No Storage change
- No migration
- No duplicate truth store
- No API endpoint in this phase

Deleting or correcting a source fact changes future bridge output automatically.

## What the bridge answers

> What body-composition evidence does Oli have?

It does **not** answer which evidence is best, and it does **not** produce scores.

## Source system vs method

| Field | Meaning |
|-------|---------|
| `sourceSystem` | Transport / repository (`apple_health`, `manual`, `body_scan`, …) |
| `measurementMethod` | Scientific method (`scale_weight`, `consumer_bia`, `dxa`, `unknown`, …) |

Apple Health is a **source/transport**, not a measurement method.

| Case | Method | Evidence type |
|------|--------|---------------|
| Apple Health composition, no explicit method | `unknown` | `estimated` |
| Apple Health composition, explicit governed method | preserved | per method |
| Withings composition | `consumer_bia` (separate product branch) | `estimated` |
| Verified DXA | `dxa` | `measured` |

Do **not** encode: Apple Health transport = BIA.

## Completeness (caller-supplied partial)

Every successful evidence bundle includes:

```text
completeness: {
  mode: "caller_supplied_partial",
  profile: "available" | "missing",
  continuousEvents: "omitted" | "provided_empty" | "provided_nonempty",
  verifiedScanDetails: "omitted" | "provided_empty" | "provided_nonempty"
}
```

- The bridge operates on **caller-supplied** continuous/scan arrays plus governed profile context.
- It does **not** independently enumerate all account evidence.
- `omitted` ≠ `provided_empty`.
- `ready` means the bridge computed from provided inputs — **not** account-complete coverage.
- There is **no** `account_complete` mode without a governed account-wide proof (not present in V1).
- `useBodyCompositionEvidence` is not an account-wide evidence-fetching hook.

## Evidence types

| Type | Meaning |
|------|---------|
| measured | Directly measured / source-reported under governed contract |
| estimated | Device/model physiology estimate (e.g. consumer BIA) |
| calculated | Deterministic Oli formula with `formulaVersion` + `inputObservationRefs` |

## Semantics

- Lean Mass ≠ Fat-Free Mass
- Lean / FFM ≠ Skeletal Muscle Mass
- VAT mass ≠ VAT volume
- Multiple observations of the same metric are preserved (no average, overwrite, or winner)
- Body Scan observations always have `continuousTrendEligible: false`

## Region model

Reuses Body Scan regions (`total`, `android`, `gynoid`, bilateral limbs, …). Regional lean is never flattened into total lean.

## Subject context

Separate from observations: sex, DOB (governed profile only), height, waist.
Ethnicity is **not** in V1 evidence/scoring.

## Waist

### Dated Waist source of truth

Dated Waist authority is a RawEvent:

| Field | Value |
|-------|-------|
| `kind` | `body_composition` |
| Field | `waistCircumferenceCm` |
| Canonical unit | `cm` |
| `sourceSystem` | `manual` |
| `measurementMethod` | `manual_anthropometry` |
| `evidenceType` | `measured` |

New Oli-created protocol is `who_midpoint_v1` / version `1` **only when explicitly reported** by the source event. Missing protocol stays unknown/`null` and must **never** be inferred merely from manual source, `manual_anthropometry`, or presence of Waist. `measuredAt` is required; future manual dates are rejected.

### Standardized Waist UI

The current product includes Body Measurements → Waist with Add, Edit/correction, Delete, dated history, graph, unit display toggle, and standardized WHO-midpoint guidance.

### Legacy profile Waist

`bodyInputs.waistCircumferenceCm` remains only for backward-compatible profile schema and historical profile export/context according to policy. It is **not** editable as current Waist, dated evidence, Waist history, latest Waist, an automatic WHtR input, or a competing active source of truth.

### Evidence Bridge behavior

Dated Waist RawEvents may enter as observations. Multiple observations remain distinct. No winner/current selection. No automatic WHtR emission. Completeness remains `caller_supplied_partial`.

## Calculated indices

Pure helpers exist for BMI / WHtR / FMI / FFMI / ALMI (`formulas.ts`).
The bridge **does not** auto-select cross-source inputs or emit these indices automatically.

## Boundaries (forbidden in this module)

- Evidence Resolver / best-current selector (**IMPLEMENTED** as a separate pure-domain module at approved SHA `3ae4737b…`; must not be smuggled into this bridge module)
- Assessment Confidence results (separate pure domain; see `BODY_COMPOSITION_ASSESSMENT_CONFIDENCE_V1.md`)
- Health Composition / Performance-Supporting Composition scores (**STILL BLOCKED**; Scientific Re-Gate V2 PASS; mathematical freeze pending independent review)
- Weights, thresholds, status bands
- Writing scan facts into Weight / Body Fat / Lean continuous trends or `dailyFacts`

## Code map

| Path | Role |
|------|------|
| `lib/contracts/bodyCompositionEvidence.ts` | Zod contracts |
| `lib/data/body/evidence/buildBodyCompositionEvidenceBundle.ts` | Pure bundle builder |
| `lib/data/body/evidence/continuousEvidenceAdapter.ts` | Weight / BF / lean continuous |
| `lib/data/body/evidence/bodyScanEvidenceAdapter.ts` | Verified scans only |
| `lib/data/body/evidence/formulas.ts` | Explicit index helpers |
| `lib/data/body/evidence/useBodyCompositionEvidence.ts` | Optional data-layer composition |

## Export

Existing user export of source facts remains the export mechanism. The evidence bundle is not a separate persisted export record.
