# Product rules: Chest classification slice (v1)

This document records how the **additive** `CHEST_CLASSIFICATION_BY_EXERCISE_ID` registry relates to `EXERCISE_LIBRARY_V1`. It is not medical advice.

## Inclusion rule

An exercise is included in the chest classification slice **if and only if** its library row uses `primaryBucket: "Chest"`. The registry must contain **exactly** those `exerciseId` values—no extras, no omissions.

## Exercises intentionally **not** in the chest slice (same library)

- **`close_grip_bench_press`** — `primaryBucket: "Triceps"` in the library. Chest is secondary there; it is **excluded** from the chest slice to avoid contradicting catalog identity.
- Any dip or fly variant bucketed under **Shoulders** or **Triceps** in the library — **excluded** until those categories get their own slices.

## Ambiguous / dual-emphasis cases (included with notes)

- **`dumbbell_pullover`**, **`dumbbell_pullover_flat`** — Library lists both **Pecs** and **Lats** (`movement: "pull"`). They remain in the chest slice because `primaryBucket` is **Chest**; `primaryPattern: "pullover"` flags the hybrid stimulus. Downstream analytics should not treat these as pure chest isolation without that context.
- **`barbell_bench_press_narrow`** — Library keeps **Chest** as primary bucket with extra triceps coarse tags; classification notes higher triceps demand vs standard bench.
- **`pseudo_planche_push_up`** — Library includes substantial **anterior delt** detailed work; `compoundIsolation: "mixed"` and `plane: "multi"` reflect shoulder + chest stress.
- **`archer_push_up`** — Logged as one exercise; `laterality: "unilateral_each_side"` reflects alternating emphasis per side.
- **`dumbbell_fly_incline` vs `dumbbell_incline_fly`** — Both exist in the catalog with the same bucket; each has an identical classification pattern; duplicate names are a catalog quirk, not double identity.

## Mobility

- **`pec_stretch`** — `primaryPattern: "mobility_stretch"`, `plane: "na"`, scapulothoracic joint tag added for stretch context.

## Muscle contribution map

Only **`bench_press`**, **`incline_bench_press`**, and **`push_up`** currently have rows in `EXERCISE_MUSCLE_CONTRIBUTIONS_V1`. Classification sets `preferExistingMuscleContributionMap: true` **only** for those ids so weighted subgroup logic stays consistent with the existing map.

## Versioning

Chest rows use `evidenceLevel: "library_derived"` unless later curated by a clinician/trainer workflow (`expert_curated` reserved for future use).
