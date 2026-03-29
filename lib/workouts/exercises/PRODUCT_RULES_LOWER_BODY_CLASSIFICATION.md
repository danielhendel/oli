# Product rules: Lower-body classification slices (v1)

Additive registries (`QUADS_*`, `HAMSTRINGS_*`, `GLUTES_*`, `CALVES_*`) keyed by `exerciseId`. Not medical advice.

## Why this is not a simple `primaryBucket` match

`PrimaryBucket` only includes **`Legs`** for almost all lower-body catalog rows. There are no separate `Quads` / `Hamstrings` / `Glutes` / `Calves` buckets. Each **`primaryBucket: "Legs"`** exercise is assigned to **exactly one** muscle slice using `assignLegsExerciseToLowerBodySlice` in `lowerBodySliceRules.ts`.

## Legs-bucket partition (deterministic)

Applied in order:

1. **`primaryCoarse[0] === "Calves"`** → **calves** slice.
2. **`primaryCoarse[0] === "Hamstrings"`** → **hamstrings** slice (leg curls, nordic, GHR, etc.).
3. **`primaryCoarse[0] === "Glutes"`** → **glutes** slice.
4. **`movement` is `squat` or `lunge` and `primaryCoarse` includes `Quads`** → **quads** slice (covers `Hips` + `Quads` combos such as **cossack squat** and **walking lunge stretch**).
5. **`primaryCoarse[0] === "Hips"`** → **glutes** slice (hip circle, adduction, pigeon, etc. — “hip / glute accessory” home).
6. **`primaryCoarse[0] === "Legs"`** → **quads** slice (e.g. yoga warrior, skater jump).
7. **Else** → **quads** slice (e.g. `Quads` listed first with `Glutes` second).

## Documented exception: Back-bucket hamstring hinges

Exercises with **`primaryBucket: "Back"`** and **`primaryCoarse[0] === "Hamstrings"`** (RDL / stiff-leg variants) are listed in `BACK_BUCKET_HAMSTRINGS_SLICE_EXERCISE_IDS` and appear in the **hamstrings** slice. **Conventional deadlift** and similar **Back-first** hinges stay out of this slice (owned by the **back** classification slice for catalog identity).

## Ambiguity handling (what we encode vs defer)

| Topic | Rule in v1 | Deferred |
|-------|----------------|----------|
| Squat vs leg press quad bias | Same `squat_pattern` vs `leg_press_pattern`; library coarse tags carry nuance | Foot placement / torso angle on press |
| Lunge / split squat / BSS | `lunge_pattern` for standard quad-primary lunges | Step length, torso |
| Curtsy / barbell curtsy | **Glutes** slice (`lunge_glute_bias`) because `Glutes` is first in `primaryCoarse` | — |
| RDL vs deadlift | RDL family in **hamstrings** slice; conventional deadlift not in lower-body registries | Mixed-chain analytics |
| Hip abduction / adduction | **Glutes** slice (`hip_abduction` / `hip_adduction`) | Adductor as separate analytics group |
| Tibialis raise | **Calves** slice (`dorsiflexion_tibialis`) | — |
| Cardio (bike, stairs) | **Quads** slice with `cardio_cycling_quads` / `lunge_pattern` | HR zones, resistance |

## Muscle contribution map

`preferExistingMuscleContributionMap: true` only for ids that exist in `EXERCISE_MUSCLE_CONTRIBUTIONS_V1`: **`squat`**, **`leg_press`**, **`leg_extension`**, **`romanian_deadlift`**, **`leg_curl`**, **`hip_thrust`**, **`calf_raise`**.

## Versioning

Rows use `evidenceLevel: "library_derived"` unless later curated.
