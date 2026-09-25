# Stage 3C — Body Composition Standards and Trend Details Completion

**Date:** 2026-09-25  
**Branch:** `feat/body-composition-stage3c-standards-graphs-v1`  
**Physical runtime SHA:** `e4a23a552910f28241b10b25ae84b46529dab891` (**PASS**)  
**Baseline `main`:** `0124c641f119150c7ed105cef8fd0b8f7d19cd8d` (Stage 3B merge / PR #220)  
**Stage 3B prerequisite physical:** `c962d36ef947e67e03092df9ed8207de17aef9de` (**PASS**; ancestor of `main`)

## Status

Stage 3C **implementation: COMPLETE** on branch.  
Physical PASS recorded by product leadership (2026-09-25).  
**Independent merge gate: PENDING**.  
Do **not** write “Stage 3C merged” until the independent review-and-merge gate completes.  
Stage 3D **NOT BEGUN**. Stage 3E Body Scans **NOT BEGUN**.

## Physical lineage

- Physical runtime SHA: `e4a23a552910f28241b10b25ae84b46529dab891`
- Physical result: **PASS**
- Any commit after this SHA on the finalization head must be **docs-only**.
- Any later runtime (`.ts` / `.tsx` / native / API / Functions / schema) change invalidates physical PASS.

## Delivered

### Landing

- Hierarchy: **TOTAL MASS** → Weight; **COMPONENTS** → Body Fat + Lean Mass
- No Body Scans section
- Weight: mass/BMI toggle; approved CDC/WHO adult BMI screening rail; Add measurement; Apple Health state
- Body Fat: %/mass toggle; Gallagher educational Lower / Mid-range / Higher ranges; value-position marker (not personal classification); Add measurement; Apple Health state
- Lean Mass: %/mass toggle; composition-share presentation; no population numerical bands; no ALMI/FFMI/skeletal-muscle inference; Add measurement; Apple Health state

### Metric detail pages (shared system)

- Weight, Body Fat, Lean Mass: left-aligned header; calendar/history; timeframe selector; display-mode toggle; hero value/date; black plot; bright-blue trend; active guide; solid H / dotted V grids; right Y-axis; observed coverage; Low / High / Change; fixed-hero inspection (no floating tooltip)
- Lean Mass detail education removed (landing + scientific docs preserved)

### Display modes (presentation-only)

| Metric | Modes | Derivation |
|--------|-------|------------|
| Weight | lb\|BMI or kg\|BMI | BMI from Weight × governed profile height; missing height fails closed |
| Body Fat | %\|lb or %\|kg | Fat mass from compatible Weight × Body Fat % only |
| Lean Mass | %\|lb or %\|kg | Lean % = Lean Mass / compatible Weight × 100; never `100 − BF` |

- No new RawEvents; no Firestore writes; no Apple Health writes of derived values
- Toggle layout contained inside page content insets (physical PASS includes both segments visible)

### Body Fat complete Apple Health history

- Metric-specific UID-scoped checkpoint: `appleHealth:bodyFatBackfillState:{uid}`
- **5Y** = five years; **All** = all available governed history (not capped/mapped to 5Y)
- Physically established oldest Apple Health Body Fat: **2017-06-10**
- Idempotent / resumable import; account-transition cleanup; existing ingest front door

## Scientific posture

| Metric | Status |
|--------|--------|
| Weight | Only personally classified Body metric (adult BMI screening) |
| Body Fat | Gallagher educational/general reference; personal classification **BLOCKED** |
| Lean Mass | Total Lean Mass / LBM; composition-share only; numerical population standards **BLOCKED** |
| Body score | **NONE** |
| Muscle Mass / Stage 3E | **NOT BEGUN** |
| Target / Optimal / Excellence | **NONE** |

## Architecture

- Backend unchanged
- Firestore schema/path unchanged
- Existing ingest front door and trend sources preserved
- No Firebase/Firestore in Body screens
- Local keys reused: `appleHealth:metricSyncScopes:{uid}`, `appleHealth:bodyFatBackfillState:{uid}`
- No personal DXA PDF / PHI artifacts

## Deployments

- Staging: **NONE**
- Production: **NONE**

## Open release gates

- RG-LEGAL-01 **OPEN**
- RG-SOURCE-PRIVACY-01 **OPEN** (Issue #218 OPEN)
- Export coverage **OPEN**
- Export scalability **OPEN**
- Infrastructure validation truth gap **OPEN**
- Consent persistence **inactive**
- Legal assent **inactive**

## Next

Independent Stage 3C review-and-merge gate in a **new** Cursor Agent.  
Do **not** mark the Draft PR Ready. Do **not** merge from this finalization agent.  
Do **not** begin Stage 3D or Stage 3E.
