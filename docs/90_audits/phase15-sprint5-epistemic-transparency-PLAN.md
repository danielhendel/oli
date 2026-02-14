# Phase 1.5 — Sprint 5: Epistemic Transparency — PLAN

## Goal

Every important number must answer: What was used? When was it computed? What version? What is missing?

Implement reusable **ProvenanceDrawer** and wire it into HealthScore + Signals surfaces. Read-only epistemic surfacing only; no changes to computation, thresholds, derived ledger, or ingestion.

---

## File Paths & Steps

### A) New component: ProvenanceDrawer

| Step | Action | Path |
|------|--------|------|
| A1 | Create pure presentational drawer | `lib/ui/ProvenanceDrawer.tsx` |
| A2 | Use Modal + overlay + drawer pattern (same as BaselineDrawer) | — |
| A3 | Accept `ProvenanceViewModel` + `visible` + `onClose`; no fetch/hooks/API/Firebase | — |
| A4 | Display: title, modelVersion, computedAt, pipelineVersion?, missingInputs[], thresholds? (signals only), derivedFromLabel (static) | — |
| A5 | Never display: raw JSON, event payloads, Firestore paths, stack traces | — |
| A6 | Format dates only (e.g. ISO → local); no other computation | — |

### B) Provenance contract

| Step | Action | Path |
|------|--------|------|
| B1 | Add UI-only view model type | `lib/contracts/provenance.ts` |
| B2 | Type: title, modelVersion, computedAt, pipelineVersion?, missingInputs[], thresholds?, derivedFromLabel | — |
| B3 | Export from contracts | `lib/contracts/index.ts` (add `export * from "./provenance"`) |
| B4 | Do not change HealthScoreDoc or HealthSignalDoc schemas | — |

### C) Wire into Dash

| Step | Action | Path |
|------|--------|------|
| C1 | HealthScore section: add "Details" or "Provenance" press target → open ProvenanceDrawer | `app/(app)/(tabs)/dash.tsx` |
| C2 | Provenance payload: modelVersion, computedAt, pipelineVersion, aggregate missing from domainScores[*].missing, derivedFromLabel = "Derived from DailyFacts" | — |
| C3 | Signals section: add "Analyze" press target → open ProvenanceDrawer | — |
| C4 | Signals payload: modelVersion, computedAt, missingInputs, inputs.thresholds, derivedFromLabel = "Derived from HealthScore + Baseline window" | — |
| C5 | Keep loading/partial/missing/error/ready states; no new interpretation text | — |

### D) Domain detail screen

| Step | Action | Path |
|------|--------|------|
| D1 | If `app/(app)/(healthScore)/[domain].tsx` exists: add ProvenanceDrawer there | — |
| D2 | Search result: file does not exist → do not create; note in AUDIT as UNPROVEN / deferred to Sprint 2 | — |

### E) Tests

| Step | Action | Path |
|------|--------|------|
| E1 | ProvenanceDrawer rendering: Model Version, Computed At, Missing Inputs, Thresholds when provided; no "{"/"}" JSON blocks, no "users/" "firestore" "projects/" | `lib/ui/__tests__/ProvenanceDrawer.test.tsx` |
| E2 | Dash integration: when signals ready, "Analyze" exists and opens drawer; when health score ready, "Details"/"Provenance" exists and opens drawer | `app/(app)/(tabs)/__tests__/dash-provenance.test.tsx` |
| E3 | Boundary: ProvenanceDrawer source has no imports of firebase, firestore, lib/api, useHealth | `lib/ui/__tests__/ProvenanceDrawer.boundary.test.ts` |

### F) CI & audit

| Step | Action | Path |
|------|--------|------|
| F1 | Run typecheck, lint, test | — |
| F2 | Write audit record mapping roadmap → code + tests | `docs/90_audits/phase15-sprint5-epistemic-transparency-AUDIT.md` |

---

## Run These Checks

```bash
npm run typecheck
npm run lint
npm test
```

Branch: `phase15/sprint5-epistemic-transparency`  
PR: into `main`.

---

## Out of scope (Sprint 5 must NOT)

- Change HealthScore computation logic
- Change healthSignals computation logic
- Change thresholds/constants
- Change derived ledger writes/snapshots
- Change historical docs or ingestion
- New endpoints, new derived writes
- Domain detail screen creation (only wire if it already exists)
