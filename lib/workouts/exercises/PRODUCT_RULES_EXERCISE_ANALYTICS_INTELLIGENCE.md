# Product rules: exercise analytics intelligence (v1)

Single **classification-first** resolver: `resolveExerciseIntelligenceForAnalytics`. Used by weekly strength muscle volume/sets and intended as the only analytics entry point for standard + custom exercises.

## A. Identity

- **Logged `exerciseId`** from the journal session is the user-facing identity.
- **Resolution id**: same as logged id for catalog exercises; for custom exercises without a library row, if `resolveCatalogExerciseIdByName(custom.name)` matches a catalog exercise, that catalog id is used **only** for library/classification/contributions lookup (alias). The returned object still reports the logged `exerciseId`.

## B. Primary muscle group (analytics)

1. **Classification slices** — If one or more additive classification rows exist for the resolution id, choose a **primary slice**:
   - **Single slice** — use its `primaryMuscleGroup`.
   - **Multiple slices** — disambiguate deterministically:
     1. Prefer the slice whose `primaryMuscleGroup` equals the **lead group** from weighted contributions (same ordering as `getPrimaryMuscleGroupsForExercise`), when contributions exist.
     2. Else if `primaryBucket === "Legs"`, use `assignLegsExerciseToLowerBodySlice` and match the slice whose `categoryKey` / `primaryMuscleGroup` matches that leg slice.
     3. Else use the first slice in fixed order: quads → hamstrings → glutes → calves → chest → back → shoulders → biceps → triceps → forearms → core.
   - **Source** `classificationSource`: `"classification"`.

2. **Contributions only** — If no classification slice exists but a contribution map exists, use the **top aggregated `MuscleGroup`** from contributions. **Source**: `"contribution"`.

3. **Library** — If still null, use `primaryBucket` mapping (Chest→chest, Back→back, …; Legs/Full body omitted here). If still null, use **`primaryCoarse[0]`** mapped to a top-level `MuscleGroup` (e.g. Full body power work with `Back` first → `back`). **Source**: `"library"`.

4. **Custom** — `resolveCustomExercisePrimaryMuscleGroup(customRow)` when a custom record is provided, or `customPrimaryMuscleGroupByExerciseId` for legacy/test overrides. **Source**: `"custom"`.

5. **Unknown** — **Source**: `"unknown"`; `primaryMuscleGroup` null.

## C. Weighted muscle contributions

- **Exposure**: `contributions` and `hasContributionMap` on the resolved view.
- **Weekly volume**: if `hasContributionMap`, allocate exercise training volume across groups by weights; **else** allocate **100%** of that exercise’s volume to `primaryMuscleGroup` (must not drop volume when unmapped).

## D. Movement pattern

- **Classification**: `primaryPattern` of the chosen primary slice when present.
- **Fallback**: library `movement` from `getExerciseMeta` / merged view (`meta.movement`).

## E. Custom exercises

- Catalog alias by **normalized name** reuses catalog intelligence (classification + contributions).
- No alias: custom primary bucket / explicit map only; no silent inventing of patterns beyond existing `resolveCustomExercisePrimaryMuscleGroup` rules.
