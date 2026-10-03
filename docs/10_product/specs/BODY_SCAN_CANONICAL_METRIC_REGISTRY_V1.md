# Body Scan Canonical Metric Registry

**Status:** Stage 3E Phase A–E implemented — **truth-frozen** at physical client SHA `e9397b357642b45eef2a6a40c78217281b375d91` (**PASS**); see `docs/00_truth/phase3/STAGE_3E_WAIST_INDEX_BODY_SCAN_FOUNDATION_TRUTH_FREEZE.md`
**Authority:** Subordinate to Constitution / code+CI; companion to `BODY_SCANS_PRODUCT_AND_DATA_V1.md`
**Planning freeze:** `/Users/danielhendel/oli-planning/OLI_BODY_SCAN_CANONICAL_METRIC_REGISTRY_SPEC_V1.md`

## Architecture (locked)

```text
PRODUCT / SCIENCE CONTRACT
        ↓
CANONICAL METRIC REGISTRY   ← what Oli understands
        ↓
METHOD / DEVICE CAPABILITIES
        ↓
SOURCE ADAPTERS             ← map report fields → registry keys
        ↓
CANDIDATE MEASUREMENTS      ← bodyScanDrafts
        ↓
REVIEW / CORRECTION
        ↓
VERIFIED bodyScanFacts      ← excludedFromContinuousTrends=true
```

| Role | Meaning |
|------|---------|
| **PDF / original** | Private **evidence** (Document OS). Not ontology. |
| **Body Scan** | Measurement **event** (`scanId`, method, device, adapter, status). |
| **Registry** | Canonical metric keys, units, groups, capabilities, eligibility metadata. |
| **Adapter** | Source → registry mapper. No UI ownership. No scoring. |
| **Candidate** | Untrusted draft field. |
| **Verified** | User-confirmed fact. |

## Metric model (Option B)

```text
metricId  +  region
lean_mass +  right_arm
```

- Laterality is encoded in region for V1 (`left_arm`, `right_arm`, `left_leg`, `right_leg`).
- **No** combinatorial ontology keys (`right_arm_lean_mass`).
- Aliases for alternate / combinatorial forms live in `bodyScanMetricAliases.ts`.

## Groups

| Registry group | Persisted / UI section id |
|----------------|---------------------------|
| overview | overview |
| fat_distribution | fat_distribution |
| regional_composition | regional_composition |
| regional_lean | regional_lean_balance |
| bone | total_body_bone |
| source | source (metadata only) |

## Units

Canonical: `kg`, `percent`, `cm3`, `g_per_cm2`, `ratio`, `score` (T/Z ontology).  
BMC Stage 3E persisted unit remains **`g`** (unchanged).

## Source-reported-only (parser must not invent)

VAT mass, VAT volume, A/G, BMD, T-score, Z-score, FFM (when labelled), SMM (future BIA).

Never infer VAT mass ↔ volume. Never map DXA lean → skeletal muscle mass.

## Trend isolation

Every registry entry has `continuousTrendEligible: false`.  
Confirmed facts keep `excludedFromContinuousTrends: true`.

## Scoring boundary

Registry may list soft construct eligibility tags (`H1`…`H4`, `P1`…`P3`) only.  
**No** weights, transforms, or score engines in this module.

## T / Z

Ontology **on** (`t_score`, `z_score`). Stage 3E UI **deferred** (`uiEnabled: false`).  
DXA adapter must not emit them yet. No diagnosis.

## Code map

| File | Role |
|------|------|
| `lib/contracts/bodyScans.ts` | Metric/region/unit/group schemas |
| `lib/data/body-scans/bodyScanMetricRegistry.ts` | Definitions (labels, groups, visibility) |
| `lib/data/body-scans/bodyScanCapabilities.ts` | DXA + BIA boundary |
| `lib/data/body-scans/bodyScanMetricAliases.ts` | Compatibility aliases |
| `lib/data/body-scans/validateBodyScanAgainstRegistry.ts` | Adapter emit gate |
| `lib/data/body-scans/bodyScanMetricCatalog.ts` | Thin presentation adapter (region labels, section titles; metric labels from registry) |
| `lib/data/body-scans/buildBodyScanPresentationGroups.ts` | Shared Review/Detail grouping selector |

## Review / Detail presentation (Phase D/E)

Registry is the sole user-facing label source (`Body Fat`, `Total Body BMD`, …).
Shared selector `buildBodyScanPresentationGroups` drives group order, region cards, and UI enablement (`uiEnabled` + productStatus).
T/Z (deferred) and SMM (future) never render. Source section is metadata-only.

Region-aware lean placement (one fact → one group):

| Measurement | Group |
|-------------|-------|
| `lean_mass` @ total | overview |
| `lean_mass` @ arms/legs/trunk/head/android/gynoid | regional_composition |
| `lean_mass` @ left_/right_ arm/leg | regional_lean |
| `fat_percent` / `fat_mass` @ android/gynoid | fat_distribution |

## Storage

**No migration.** `bodyScans` / `bodyScanDrafts` / `bodyScanFacts` already store `metricId` + `region` + `unit` + provenance.
