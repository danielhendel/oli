# Phase 1.5 — Sprint 5: Epistemic Transparency — AUDIT

## Constitutional Certification Record

---

## 1. Sprint Identity

- **Sprint:** Phase 1.5 — Sprint 5
- **Scope:** Epistemic transparency — reusable ProvenanceDrawer + wiring into Health Score and Signals surfaces (read-only)
- **Branch:** phase15/sprint5-epistemic-transparency
- **Base:** main

---

## 2. Roadmap → Code Mapping

### “Every important number must answer: What was used? When was it computed? What version? What is missing?”

| Requirement | Implementation |
|-------------|----------------|
| **What was used?** | ProvenanceDrawer shows **Model Version**, **Pipeline Version** (when available), **Thresholds used** (signals only), and **Source** (derivedFromLabel). |
| **When was it computed?** | **Computed At** displayed with local formatting (date only, no raw ISO in drawer). |
| **What version?** | **Model Version** and optional **Pipeline Version** in drawer. |
| **What is missing?** | **Missing Inputs** list shown explicitly when present; not hidden. |

### A) New reusable component: ProvenanceDrawer

| Spec | Location | Status |
|------|----------|--------|
| Create lib/ui/ProvenanceDrawer.tsx | `lib/ui/ProvenanceDrawer.tsx` | Done |
| Pure presentational: no fetching, no hooks, no API, no Firebase | Component only receives `visible`, `onClose`, `model: ProvenanceViewModel`; no use* or API/Firebase imports | Done |
| No raw canonical JSON, event payloads, Firestore paths, stack traces | Drawer only renders fields from ProvenanceViewModel; no JSON.stringify, no path strings | Done |
| Display: Model Version, Computed At, Pipeline Version?, Missing Inputs[], Thresholds? (signals), Derived from DailyFacts / HealthScore + Baseline | All fields rendered; thresholds block only when `model.thresholds` provided; derivedFromLabel static | Done |
| Explicit user action to open (press/tap) | Opened from “Details” (Health Score) and “Analyze” (Signals) only; no auto-open | Done |

### B) Provenance types + contract discipline

| Spec | Location | Status |
|------|----------|--------|
| Minimal stable ProvenanceViewModel (UI-only) | `lib/contracts/provenance.ts`: `ProvenanceViewModel`, `ProvenanceThresholds` | Done |
| Export from lib/contracts | `lib/contracts/index.ts`: `export * from "./provenance"` | Done |
| No change to HealthScoreDoc or HealthSignalDoc | No edits to healthScore.ts or healthSignals.ts | Done |

### C) Wire into Dash (read-only)

| Spec | Location | Status |
|------|----------|--------|
| HealthScore: modelVersion, computedAt visible; add “Details”/“Provenance” → open ProvenanceDrawer | `app/(app)/(tabs)/dash.tsx`: metadata already shows model · computed; added “Details” press → ProvenanceDrawer with healthScoreToProvenanceViewModel(d) | Done |
| Provenance: modelVersion, computedAt, aggregate missing from domainScores[*].missing, derivedFromLabel = “Derived from DailyFacts” | `healthScoreToProvenanceViewModel()` aggregates and dedupes missing from all four domains | Done |
| Signals: add “Analyze” → open ProvenanceDrawer | `dash.tsx`: “Analyze” press → ProvenanceDrawer with healthSignalToProvenanceViewModel(d) | Done |
| Signals payload: modelVersion, computedAt, missingInputs, inputs.thresholds, derivedFromLabel = “Derived from HealthScore + Baseline window” | `healthSignalToProvenanceViewModel()` maps doc to ProvenanceViewModel including thresholds | Done |
| Keep loading/partial/missing/error/ready; no new interpretation text | No new states; labels remain “Stable”, “Attention Required”, “Missing data”, “Offline”, “Details”, “Analyze” | Done |

### D) Domain detail screen

| Spec | Location | Status |
|------|----------|--------|
| If app/(app)/(healthScore)/[domain].tsx exists, add ProvenanceDrawer there | Searched repo: **no** `[domain].tsx` under healthScore or equivalent | **UNPROVEN / deferred** (per PLAN: do not create in Sprint 5) |

### E) Tests

| Spec | Location | Status |
|------|----------|--------|
| ProvenanceDrawer: renders Model Version, Computed At, Missing Inputs, Thresholds when provided; no “{”/“}” JSON blocks; no users/ firestore projects/ in content | `lib/ui/__tests__/ProvenanceDrawer.test.tsx` | Done |
| Dash: when signals ready “Analyze” exists and opens drawer; when health score ready “Details” exists and opens drawer | `app/(app)/(tabs)/__tests__/dash-provenance.test.tsx` | Done |
| Boundary: ProvenanceDrawer imports no firebase, firestore, lib/api, useHealth | `lib/ui/__tests__/ProvenanceDrawer.boundary.test.ts` (checks import/require lines only) | Done |

### F) CI

| Check | Result |
|-------|--------|
| npm run typecheck | Pass |
| npm run lint | Pass |
| npm test | Pass (full suite with Firestore emulator) |

---

## 3. Files Touched

### Added

- `lib/ui/ProvenanceDrawer.tsx`
- `lib/contracts/provenance.ts`
- `lib/ui/__tests__/ProvenanceDrawer.test.tsx`
- `lib/ui/__tests__/ProvenanceDrawer.boundary.test.ts`
- `app/(app)/(tabs)/__tests__/dash-provenance.test.tsx`
- `docs/90_audits/phase15-sprint5-epistemic-transparency-PLAN.md`
- `docs/90_audits/phase15-sprint5-epistemic-transparency-AUDIT.md` (this file)

### Modified

- `lib/contracts/index.ts` — export provenance
- `app/(app)/(tabs)/dash.tsx` — import ProvenanceDrawer + provenance types; HealthScore “Details” + ProvenanceDrawer; Signals “Analyze” + ProvenanceDrawer; view-model builders

---

## 4. Constitutional Compliance

- **No new ingestion paths:** None added.
- **No client-side derived computation:** Only formatting (e.g. date) and mapping doc → view model for display.
- **No rewrite of historical truth / no bypass of derived ledger / no hiding missing data:** Read-only display; missing inputs shown explicitly.
- **No persuasive logic / no “You should”:** Labels are neutral (“Stable”, “Attention Required”, “Details”, “Analyze”, “Derived from …”).
- **No Firebase in screens:** Data from hooks only; ProvenanceDrawer is pure presentational (boundary test enforces no firebase/lib/api in imports).
- **No raw event payload leaks / no Firestore paths exposed:** Drawer shows only ProvenanceViewModel fields; no JSON dumps or path strings.

---

## 5. Acceptance Criteria (Binary)

| Criterion | Result |
|-----------|--------|
| ProvenanceDrawer exists and is pure presentational (no fetch, no firebase, no api) | Pass |
| HealthScore surface exposes provenance via explicit user action (“Details”) | Pass |
| Signals surface exposes provenance via explicit user action (“Analyze”) | Pass |
| Missing inputs shown explicitly (not hidden) | Pass |
| No raw JSON or Firestore paths displayed | Pass |
| No persuasive language introduced | Pass |
| typecheck / lint / test all green | Pass |
| Audit doc + plan doc under docs/90_audits | Pass |

---

## 6. Run These Checks (for PR)

```bash
npm run typecheck
npm run lint
npm test
```

Branch: `phase15/sprint5-epistemic-transparency`  
PR: into `main`.
