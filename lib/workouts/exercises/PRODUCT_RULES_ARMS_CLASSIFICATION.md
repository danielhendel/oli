# Product rules: Arms classification slices (v1)

Additive registries keyed by `exerciseId` from `EXERCISE_LIBRARY_V1`. Not medical advice.

## Inclusion rules

- **Biceps slice** — one row per library row with `primaryBucket: "Biceps"`.
- **Triceps slice** — one row per library row with `primaryBucket: "Triceps"`.
- **Forearms slice** — one row per library row with `primaryBucket: "Forearms"`.

`PrimaryBucket` in `taxonomy.ts` today does **not** include `Forearms`. Wrist curls, reverse wrist curls, and similar work therefore sit under **Biceps** (or carry `Forearms` in coarse/detailed tags only). The forearms classification registry is **empty** until the catalog gains a `Forearms` bucket.

## Exercises intentionally **not** in an arm slice (same library)

- **`chin_up`**, **`pull_up`**, and other vertical pulls — `primaryBucket: "Back"`. Biceps load is secondary; they belong to the **back** slice, not the biceps slice.
- **`bench_press`**, standard push-ups, etc. — `primaryBucket: "Chest"`. Triceps are contributors but not catalog identity for those ids.
- **`close_grip_bench_press`**, **`dip`**, **`diamond_push_up`**, etc. — `primaryBucket: "Triceps"`; they **are** in the triceps slice.

## Ambiguous / overlap cases (documented choices)

| Case | Arm slice | Rule |
|------|-----------|------|
| Hammer / neutral-grip curls | Biceps | `primaryPattern: "elbow_flexion_neutral"`; brachialis emphasis vs strict supinated curl. |
| Reverse curl, reverse-grip barbell curl | Biceps | `primaryPattern: "elbow_flexion_pronated"`; forearm extensor + brachialis bias; still **Biceps** bucket in catalog. |
| Zottman curl | Biceps | `primaryPattern: "elbow_flexion_mixed_rotation"`. |
| Wrist curl / reverse wrist curl / barbell wrist curl | Biceps | `wrist_flexion_forearm` / `wrist_extension_forearm`; **no** forearms slice until bucket exists. |
| High cable curl | Biceps | `cable_elbow_flexion_high_line`; shoulder line assist; joints include shoulder. |
| Close-grip bench / incline close-grip | Triceps | `compound_press_triceps_bias`; chest remains secondary per library coarse tags. |
| JM press | Triceps | `jm_press_pattern`; hybrid press/extension; kept as triceps-primary per catalog. |
| Dips (parallel, machine, rings) | Triceps | `dip_pattern_triceps`; ring dip uses `loadModality: "bodyweight_rings"`. |
| Diamond / Sphinx push-up | Triceps | `bodyweight_triceps_push_pattern`. |
| Single-arm cable triceps “extension” | Triceps | Classified as pushdown-style `elbow_extension_pushdown` with `unilateral_each_side`. |

## Muscle contribution map

`preferExistingMuscleContributionMap: true` only for **`bicep_curl`**, **`hammer_curl`**, **`tricep_pushdown`**, **`skull_crusher`** — the only arm ids present in `EXERCISE_MUSCLE_CONTRIBUTIONS_V1` today.

## Versioning

Rows use `evidenceLevel: "library_derived"` unless later curated (`expert_curated` reserved).

## Future: Forearms bucket

When `PrimaryBucket` adds `Forearms`, populate `FOREARMS_CLASSIFICATION_BY_EXERCISE_ID`, implement `getLibraryForearmsExerciseIds()` against the library (replacing the empty stub), and optionally migrate wrist-dominant ids from **Biceps** in a separate catalog change (out of scope for this additive layer alone).
