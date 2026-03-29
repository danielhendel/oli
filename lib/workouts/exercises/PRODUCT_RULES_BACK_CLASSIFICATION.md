# Product rules: Back classification slice (v1)

Additive registry: `BACK_CLASSIFICATION_BY_EXERCISE_ID` in `classificationsBack.v1.ts`. Not medical advice.

## Inclusion rule

Included **iff** `EXERCISE_LIBRARY_V1` has `primaryBucket: "Back"`. The registry has **102** keys matching that set exactly (validated in tests).

## Explicitly **not** in the Back slice (library uses another primary bucket)

- **`dumbbell_pullover`**, **`dumbbell_pullover_flat`** — `primaryBucket: "Chest"` (chest slice + lat co-stimulus documented there).
- **`deadlift`**, **`romanian_deadlift`**, and other hinge variants with `primaryBucket: "Back"` — all in the Back slice under `hip_hinge_pull` (load modality follows equipment). **`romanian_deadlift`** also has a row in `EXERCISE_MUSCLE_CONTRIBUTIONS_V1`, so `preferExistingMuscleContributionMap` is true for it only among hinge variants.
- Exercises bucketed **Shoulders** or **Legs** only — excluded until those categories are sliced.

## Ambiguity notes

### Face pulls & rear-delt overlap

- **`cable_face_pull`**, **`band_face_pull`**, **`ring_face_pull`**, **`face_pull`** (machine) — library `primaryBucket: "Back"` with posterior delt + mid-trap detailed tags. Classification: `face_pull_external_rotation`. Shoulder-specific analytics may later split “upper back vs rear delt” using detailed tags; v1 keeps one pattern.

### Shrugs

- **Barbell / dumbbell / cable / band / trap bar shrug** — `shrug_vertical`; library detailed `UpperTraps`. Treated as Back-primary per catalog.

### Deadlift / RDL / rack pull / sumo / deficit / stiff-leg / trap bar

- All share **`hip_hinge_pull`** with load modality from equipment. Hamstring vs glute emphasis is **deferred** to existing library `primaryDetailed` / coarse arrays and future analytics—not re-modeled as separate patterns in v1.

### Back extension vs reverse hyper

- **`hip_extension_spinal`**. Library notes glutes/hams on reverse hypers; bucket stays Back for product consistency with catalog.

### Pull-up family

- **Pronated, neutral, wide, ring, commando, typewriter** — `pull_vertical` (ring variants use `loadModality: "bodyweight_rings"` where rings are implied by id).
- **`chin_up`** — same **`pull_vertical`** pattern; higher elbow-flexion demand is a **library** biceps coarse tag, not a separate pattern in v1.
- **`australian_pull_up`** — **`pull_horizontal_row`** (bodyweight, more horizontal vector).

### Band W / Y / T vs dumbbell vs prone Y/T/I

- Shared **`scapular_isolation_raise`**; load modality follows equipment (band / dumbbell / bodyweight).

### Mobility & yoga duplicates

- **`childs_pose`** vs **`yoga_child_pose`**, **`cobra_stretch`** vs **`yoga_cobra`** — distinct `exerciseId`s, same classification pattern where movement intent matches.

### Jefferson curl

- **`mobility_segmental_spine`**; library `trainingType: "mobility"` — intentional flexion emphasis, not maximal hinge strength.

### Rope climb

- **`rope_climb_vertical`**; includes grip/elbow load; still Back-primary per catalog.

## Muscle contribution map

`preferExistingMuscleContributionMap` is **true** only for Back ids that exist in `EXERCISE_MUSCLE_CONTRIBUTIONS_V1` today: **`pull_up`**, **`lat_pulldown`**, **`barbell_row`**, **`seated_cable_row`**, **`romanian_deadlift`**.

## Evidence

All v1 rows use `evidenceLevel: "library_derived"` unless later curated.
