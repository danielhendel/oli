# Canonical Body Composition Evidence Bridge

**Status:** Stage 3E implemented (derived view)  
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
FUTURE Evidence Resolver
        ↓
FUTURE Assessment Confidence
        ↓
FUTURE Health / Performance Composition scores
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

Profile `bodyInputs.waistCircumferenceCm` is the current governed source.  
No waist-entry UI in this phase. Observation emitted only when an effective timestamp is supplied. Missing continuous waist capture path remains a documented gap for Health Composition minimum input.

## Calculated indices

Pure helpers exist for BMI / WHtR / FMI / FFMI / ALMI (`formulas.ts`).  
The bridge **does not** auto-select cross-source inputs or emit these indices automatically.

## Boundaries (forbidden in this module)

- Evidence Resolver / best-current selector
- Assessment Confidence results
- Health Composition / Performance Composition scores
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
