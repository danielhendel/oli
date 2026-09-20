# Stage 3B — Body card display refinement + standards gate

**Date:** 2026-09-19  
**Branch:** `feat/body-composition-stage3b-value-first-shell`  
**Baseline SHA:** `cfe27d14e95bb5a21af7288054a2f3b570f31cb7`

## Runtime (safe presentation only)

- Removed redundant “Add or connect measurements” landing card
- Weight toggle: `lb|BMI` or `kg|BMI` from mass-unit preference (presentation only)
- Body Fat toggle: `%|lb` or `%|kg` (fat mass fail-closed without same-event pairing)
- Lean Tissue renamed to **Lean Mass**; toggle `%|lb` or `%|kg` (percentage fail-closed without pairing)
- Apple Health metric popups / sync scopes unchanged
- No Body Fat or Lean Mass classification / marker / Body score

## Standards (docs only)

Canonical amendment: `docs/80_rfc/RFC-body-composition-classification-standards-amendment-v1.md` §7

| Metric | Status |
|--------|--------|
| Weight | **APPROVED / IMPLEMENTED** |
| Body Fat classification | **PROPOSED / NOT IMPLEMENTED** |
| Lean Mass classification | **PROPOSED / NOT IMPLEMENTED** |

**Current blockers for Body Fat / Lean Mass classification:** no universal BF health table approved; method provenance incomplete; unknown-method Apple Health transport; total Lean Body Mass ≠ ALM/ALMI; no approved total Lean Mass performance standard; standards-registry durable location unresolved.

Companions unchanged in role: Stage 3A evidence matrix; product/standards spec; category-intelligence ADR/RFC.

### Presentation derivations (not classification)

When Weight and composition metrics share an approved Body overview snapshot day (or stronger same-event / same-origin+timestamp evidence), fat mass and Lean Mass % may render as **calculated** presentation values. Classification markers remain blocked.

## Persistence

- No new durable preference for card display views (local React state)
- No new Firestore schema/path
- Metric sync scopes unchanged (`appleHealth:metricSyncScopes:{uid}`)

## Stage 3C

NOT BEGUN
