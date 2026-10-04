# Standardized Waist Measurement + Deterministic Index Layer

**Status:** Stage 3E implemented (foundation) — **truth-frozen** at physically approved runtime SHA `e9397b357642b45eef2a6a40c78217281b375d91` (**PASS**); initial docs freeze `0fabe4721c311a1a6a8f77a72cc600683e659224`; see `docs/00_truth/phase3/STAGE_3E_WAIST_INDEX_BODY_SCAN_FOUNDATION_TRUTH_FREEZE.md`
**Authority:** Subordinate to Constitution / code+CI
**Model status:** `evidence_informed` — not clinically validated

## Architecture boundary

```text
USER MEASURES WAIST
       ↓
GOVERNED DATED SOURCE OBSERVATION (RawEvent body_composition)
       ↓
CANONICAL BODY COMPOSITION EVIDENCE BRIDGE
       ↓
EXPLICIT DETERMINISTIC CALCULATIONS (BMI / WHtR / FMI / FFMI / ALMI)
       ↓
Evidence Resolver               ← IMPLEMENTED separately (scientific PASS 3ae4737b…; docs freeze re-gate PASS; not in this Waist/index surface)
       ↓
ASSESSMENT CONFIDENCE           ← implementation PASS · docs truth-freeze re-gate PASS at d2b0b3ab…
       ↓
FUTURE Health / Performance scores ← STILL BLOCKED
```

Waist capture + deterministic index helpers are **truth-frozen**. Evidence Resolver is **implemented** as a separate pure-domain phase and must not reopen Waist protocol or index formulas without a new physical gate.

## Waist source of truth

| Concern | Authority |
|---------|-----------|
| Dated Waist history | `users/{uid}/rawEvents` via `POST /ingest` (`kind: body_composition`, metric `waistCircumferenceCm`) |
| Legacy profile Waist | `profile.bodyInputs.waistCircumferenceCm` — **undated context only** |
| Profile as history | **Forbidden** — do not invent `measuredAt` or insert into chart/history |

Latest-profile projection (if added later) must be an explicit **cache derived from event truth**, never an independently editable second truth.

## WHO midpoint protocol

| Field | Value |
|-------|-------|
| `protocolId` | `who_midpoint_v1` |
| `protocolVersion` | `1` |

Consumer instructions:

> Measure midway between the bottom of your ribs and the top of your hip bone. Keep the tape level and snug without compressing your skin. Measure after a normal breath out.

Conditions: standing; abdomen relaxed; midpoint lowest palpable rib → iliac crest; tape horizontal; snug not compressing; end of normal expiration.

- New Oli manual entry **must explicitly write** `who_midpoint_v1` + version `1` on the source payload.
- The Evidence Bridge **preserves only explicitly reported protocol**. Missing protocol stays `null` / unknown.
- `manual_anthropometry` method does **not** prove WHO protocol.
- Future imports without known site/method may use `protocolId: unknown`.

## measuredAt

- Required on every dated Waist observation.
- UI may default to “now” but user must select actual date/time for prior measurements.
- Do **not** use `recordedAt`, upload time, or profile `updatedAt` as `measuredAt`.
- **Manual Waist measuredAt cannot be in the future** (client + server reject; injected clock in tests).

## Legacy profile Waist

- Schema/export may retain `bodyInputs.waistCircumferenceCm` for backward compatibility.
- It is **not** an editable Body Composition measurement (profile edit route fails closed).
- It does **not** feed WHtR interpretation, landing card, history, graph, or dated evidence.
- Active subject context omits legacy undated waist; dated RawEvents are authority.

## Correction / delete

Create durable replacement **before** deleting the prior event:

1. Ingest replacement with stable correction idempotency key (`mbc_waist_corr_{priorId}_{time}_{tz}_{value}`) and `correctionOfRawEventId`.
2. Confirm replacement succeeded (or idempotent replay).
3. Delete prior event.

If delete fails after create: explicit `replacement_saved_cleanup_pending` with **Retry cleanup**. Retries reuse the same replacement identity and converge to one active corrected event.

## Units

| Role | Unit |
|------|------|
| Canonical storage | **cm** |
| Display / entry | inches or centimeters (preference) |

Display preference never alters stored cm truth.

Validation: finite, positive, supported unit. No clinical cutoffs that reject unusual-but-possible values.

## Same-day measurements

Multiple Waist events on the same calendar day are preserved when timestamps/source events differ. Idempotency deduplicates only the same submission key — never by date+value alone.

## Export / account delete

Dated Waist RawEvents are covered by the existing `rawEvents` export and account-deletion paths. No separate Waist collection.

**Calculated indices** are runtime-only in this phase — **do not** dual-export. Source observations remain export authority. Future reproducible calculated-export requires formulaVersion + input refs + effective dates.

## Evidence Bridge mapping

Dated Waist RawEvent → observation:

| Field | Value |
|-------|-------|
| `metricKey` | `waist_circumference` |
| `region` | `null` (whole-body anthropometry) |
| `canonicalUnit` | `cm` |
| `evidenceType` | `measured` (manual anthropometry) |
| `sourceSystem` | `manual` |
| `measurementMethod` | `manual_anthropometry` |
| `measuredAt` | source event `observedAt` / payload time |
| provenance | source event ref + protocol ID/version + correction state |

Multiple Waist observations are preserved. No averaging. No best/current selector in the evidence domain.

Completeness remains `caller_supplied_partial`. Adding Waist does **not** imply account-complete evidence.

UI may select latest dated Waist for the Waist page via a **presentation** helper (`selectLatestWaistForPresentation`). That selector is **not** the Evidence Resolver.

## Deterministic index layer

| Alias | metricKey | Formula version | Formula | Primary measuredAt |
|-------|-----------|-----------------|---------|-------------------|
| BMI | `bmi` | `bmi_v1` | bodyMassKg / heightM² | body-mass date |
| WHtR | `whtr` | `whtr_v1` | waistCm / heightCm | Waist date |
| FMI | `fmi` | `fmi_v1` | fatMassKg / heightM² | fat-mass date |
| FFMI | `ffmi` | `ffmi_v1` | fatFreeMassKg / heightM² | FFM date |
| ALMI | `almi` | `almi_v1` | appendicularLeanMassKg / heightM² | ALM date |

### Explicit inputs only

Every helper requires explicitly supplied numeric inputs + `inputObservationRefs`. Helpers **never** search the evidence bundle for latest/best sources.

### No automatic emission

`buildBodyCompositionEvidenceBundle` must **not** emit BMI / WHtR / FMI / FFMI / ALMI. Callers invoke helpers explicitly.

### Semantic boundaries

- Lean Mass ≠ Fat-Free Mass (FFMI)
- Total Lean ≠ Appendicular Lean (ALMI)
- VAT volume ≠ Waist (WHtR)
- Body Fat % ≠ Fat Mass (FMI)
- No automatic cross-source/date compatibility claim

### Precision

IEEE-754 double arithmetic on canonical inputs. Source observations are not rounded by the formula layer. Display formatting is separate (new indices have no consumer UI yet).

### calculatedAt

Pure helpers do **not** call `Date.now()`. Callers may supply `calculatedAt` at persistence time in a later governed layer. Runtime-only results omit unpredictable timestamps.

## Product UI (this phase)

- Body Composition landing: **BODY MEASUREMENTS → Waist** after Components, before Body Scans
- Waist detail: history graph, Low/High/Change, in/cm toggle, Add/Edit/Delete, How to Measure
- **No** FMI/FFMI/ALMI/WHtR cards
- BMI remains only where Weight UI already shows it
- **No** personal classification, risk bands, scores, or targets on Waist

## Explicitly out of scope (this Waist/index phase)

- Evidence Resolver implementation (separate phase at `3ae4737b…`; not part of this frozen Waist/index surface)
- Assessment Confidence (implementation PASS · docs truth-freeze re-gate PASS at d2b0b3ab…; see `BODY_COMPOSITION_ASSESSMENT_CONFIDENCE_V1_TRUTH_FREEZE.md`)
- Health / Performance-Supporting Composition scores (**STILL BLOCKED**; Scientific Re-Gate V2 PASS; mathematical freeze pending independent review)
- InBody / Evolt device integrations beyond Body Scan store + manual review
- Production deploy / PR from this freeze alone

## Privacy

Do not log Waist values, index values, height, weight, UIDs, event IDs, or free-text medical notes. Safe logs: operation, status, reason, count buckets only.
