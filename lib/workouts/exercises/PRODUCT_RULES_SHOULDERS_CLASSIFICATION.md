# Product rules: Shoulders classification slice (v1)

Additive registry: `SHOULDERS_CLASSIFICATION_BY_EXERCISE_ID` in `classificationsShoulders.v1.ts`. Not medical advice.

## Inclusion rule

Included **iff** `EXERCISE_LIBRARY_V1` has `primaryBucket: "Shoulders"` (exact string in repo). Registry size: **45** exercises (test-locked).

## Explicitly **not** in the Shoulders slice

- **`cable_face_pull`**, **`band_face_pull`**, **`ring_face_pull`**, **`face_pull`** — library **`primaryBucket: "Back"`**; classified in the **Back** slice (`face_pull_external_rotation`). They are **not** duplicated here.
- **`upright_row`** (and DB/cable/band variants) — **Are** `primaryBucket: "Shoulders"` in the catalog → **included** with pattern `upright_row`. Upper-trap emphasis is in library detailed tags; impingement/education is out of scope for v1 encoding.

## Ambiguity & overlap rules

### Rear delt fly / reverse fly / bent-over lateral raise

- All listed with **Shoulders** primary bucket → **`rear_delt_horizontal_abduction`**.
- Overlap with “upper back” intelligence is **deferred** to library `primaryDetailed` / coarse arrays and future analytics—not a second registry entry.

### Front raise vs “chest” line movements

- **Front raise** family (`raise_front`) is Shoulders-primary per catalog. No chest-bucket front raises appear in the Shoulders list; if the library adds one later, re-run registry parity tests.

### Lateral raise variants

- DB, cable (incl. standing), band, barbell, machine → shared **`raise_lateral`**; differentiation is **`loadModality`** only in v1.

### Arnold press

- **`vertical_press_arnold`** — rotation into overhead press; still shoulder-press family.

### Push press

- **`vertical_press_push_power`** — leg drive; remains shoulder-primary bucket in library.

### Handstand / pike / decline pike push-up

- **`overhead_calisthenics_press`** — vertical pressing line, bodyweight.

### Wall handstand hold

- **`isometric_overhead_hold`** — isometric, `compoundIsolation: mixed`.

### Skill / balance (crow, frog, planche lean, tuck planche, wall walk)

- **`shoulder_skill_balance`** — mixed plane; detailed load is exercise-specific and not split further in v1.

### Scaption (dumbbell / band)

- **`scaption_raise`**, plane **`scapular_plane`**.

### Rotator cuff (band internal / external rotation)

- **`rotator_external_rotation`** / **`rotator_internal_rotation`**, `laterality: unilateral_each_side` (typical single-arm execution).

### Arm circle & kettlebell halo

- **`mobility_shoulder_circle`**, **`mobility_shoulder_rotation_halo`** respectively.

### Landmine press / Cuban press

- **Not present** in the current library as separate `exerciseId`s under Shoulders (repo audit). If added later, assign a pattern (likely `vertical_press_overhead` + `loadModality: "other"` or new modality) via product review.

## Muscle contribution map

`preferExistingMuscleContributionMap` is **true** only for **`overhead_press`** and **`lateral_raise`** (only Shoulder-bucket ids present in `EXERCISE_MUSCLE_CONTRIBUTIONS_V1` today).

## Evidence

Rows use `evidenceLevel: "library_derived"` unless later curated.
