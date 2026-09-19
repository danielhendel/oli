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
| Body Fat | **PROPOSED / HUMAN APPROVAL REQUIRED** |
| Lean Mass | **PROPOSED / HUMAN APPROVAL REQUIRED** |

Companions unchanged in role: Stage 3A evidence matrix; product/standards spec; category-intelligence ADR/RFC.

## Persistence

- No new durable preference for card display views (local React state)
- No new Firestore schema/path
- Metric sync scopes unchanged (`appleHealth:metricSyncScopes:{uid}`)

## Stage 3C

NOT BEGUN
