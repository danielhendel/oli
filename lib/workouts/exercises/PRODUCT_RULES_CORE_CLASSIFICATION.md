# Product rules: Core classification slice (v1)

This document records how the **additive** `CORE_CLASSIFICATION_BY_EXERCISE_ID` registry relates to `EXERCISE_LIBRARY_V1`. It is not medical advice.

## Inclusion rule

An exercise is included in the core classification slice **if and only if** its library row uses `primaryBucket: "Core"`. The registry must contain **exactly** those `exerciseId` values—no extras, no omissions.

Exercises that are **core-adjacent** but cataloged under **Back**, **Legs**, **Shoulders**, etc. are **out of scope** for this slice until a future cross-bucket analytics pass. Examples: `back_extension` / reverse hyper variants bucketed **Back**; compound lifts with incidental bracing remain under their primary bucket only.

## Ambiguous cases (included when bucket is Core; how v1 encodes them)

### Hanging / weighted leg raises

- **Included** when the library says **Core**.
- **Primary pattern:** `hip_flexion_emphasis_core` — acknowledges strong hip-flexor demand while keeping catalog identity as core-primary. Finer hip-flexor vs rectus weighting is **deferred** to muscle contributions or later analytics.

### Planks, side planks, weighted / ring planks

- **Included.** `trunk_stability_hold` or `anti_lateral_flexion` (side plank) as primary pattern. Shoulder/wrist loading is tagged via `jointsPrimary` where relevant; **not** reclassified as shoulders.

### Pallof press, band anti-rotation hold

- **Included** as `anti_rotation`. Resisted rotation is anti-rotation stimulus for v1; line-of-pull nuance can be refined later.

### Woodchops, cable/band rotations, Russian twists, medicine ball throws

- **Included** as `trunk_rotation` or `rotational_power_throw` where the library entry is **Core**. Transverse-plane and mixed-plane work uses `plane: "transverse"` or `multi` as appropriate.

### Suitcase / farmer-style carries (Core bucket)

- **Included** as `loaded_carry_core` with `anti_lateral_flexion` or stability emphasis as noted in row `notes` where useful. True **Legs**-bucket carries are outside this slice.

### Mountain climbers, flutter / scissor kicks

- **Included** as `conditioning_core_mixed` (or hip-flexion–biased pattern where the row targets repeated hip flexion). Conditioning vs pure strength is **not** over-parsed in v1.

### Bird dog, dead bug, segmental control drills

- **Included** as `trunk_stability_hold` or related stability pattern; `mixed` compound/isolation where appropriate.

### Ab wheel / barbell rollout

- **Included** as `anti_extension_rollout`.

### Hollow / L-sit / tuck holds

- **Included** as `hollow_body_hold` or `gymnastics_compression_hold`. Distinction from “skills” taxonomy is **catalog + pattern label only** in v1.

### Mobility / yoga trunk drills (cat-cow, torso twist, triangle, toe touch, etc.)

- **Included** when bucket is **Core** with `primaryPattern: "spinal_mobility_trunk"`. Strength vs mobility is indicated by `compoundIsolation` / `loadModality` / `notes`, not a separate bucket.

## Muscle contribution map

Only **`plank`** and **`hanging_leg_raise`** currently have rows in `EXERCISE_MUSCLE_CONTRIBUTIONS_V1`. Classification sets `preferExistingMuscleContributionMap: true` **only** for those ids so weighted subgroup logic stays aligned with the existing map.

## Versioning

Core rows use `evidenceLevel: "library_derived"` unless later curated (`expert_curated` reserved).
