# Oli Top 50 Exercise Media Expansion Plan v1

**Status:** Authoritative expansion roadmap  
**Version:** top50-exercise-priority-plan-v1

---

## Purpose

Prioritize the first 50 canonical exercises for Exercise Academy enrichment, keyframe spec expansion, candidate production, and approved image pack rollout.

---

## Selection criteria

1. All exerciseIds must exist in `EXERCISE_LIBRARY_V1`
2. Include all 20 Exercise Academy Intelligence exercises
3. Balance movement patterns: press, pull, squat, hinge, lunge, isolation, core, carry, conditioning, mobility
4. Prioritize high programming frequency and media production value
5. No invented exerciseIds

---

## Top 25 enrichment scope (Sprint M12)

Ranks 1–25 from the priority plan receive full `ExerciseLibraryEnrichmentV1` metadata:
- Movement, programming, coaching, safety, substitution profiles
- Media/keyframe requirement profiles
- Review status: `ready-for-expert-review`

---

## Movement-pattern coverage goals

| Pattern | Target exercises in Top 50 |
|---------|---------------------------|
| Horizontal press | bench_press, incline, dumbbell bench, push_up, close_grip |
| Vertical press | overhead_press, dumbbell_shoulder_press, push_press |
| Horizontal pull | barbell_row, seated_cable_row, dumbbell_row, pendlay_row |
| Vertical pull | pull_up, lat_pulldown |
| Squat | squat, front_squat, hack_squat, leg_press |
| Hinge | deadlift, romanian_deadlift, hip_thrust, sumo_deadlift, good_morning |
| Lunge / split | split_squat_dumbbell, bulgarian_split_squat_dumbbell, barbell_lunge, reverse_lunge_barbell, dumbbell_step_up |
| Isolation | leg_curl, leg_extension, calf_raise, curls, raises, triceps |
| Core | plank, pallof_press, dead_bug, band_anti_rotation_hold |
| Carry / conditioning | dumbbell_farmer_carry, burpee, rower |
| Mobility | band_monster_walk |

---

## Media complexity tiers

| Tier | Examples | Keyframe complexity |
|------|----------|---------------------|
| High | bench_press, squat, deadlift, push_press, burpee | 4+ poses, equipment continuity critical |
| Medium | rows, presses, lunges, carries | 4 poses, moderate equipment |
| Low | machine isolation, raises, curls | 3–4 poses, simpler ROM |

---

## Character usage guidance

- Default: `oli_motion_male_m1` for strength demonstrations
- `oli_motion_female_f1` for alternate character coverage in future packs
- Consistent character identity across all keyframes in a pack

---

## Rollout path

| Sprint | Deliverable |
|--------|-------------|
| **M12** | Top 50 priority plan + Top 25 enrichment dataset |
| **M13** | Keyframe spec expansion for Top 25 |
| **M14** | Candidate image generation and review workflow |
| **M15** | Approved master image packs |
| **M16** | Future video from approved keyframes |

---

## Do not build yet

- No backend persistence (Firestore, Storage)
- No CDN or upload flows
- No AI API integration (Google Flow remains external)
- No fake expert approval
- No fake media / image pack / candidate approval

---

## Implementation reference

- Priority plan: `lib/workouts/exercises/enrichment/top50ExercisePriorityPlan.v1.ts`
- Enrichment dataset: `lib/workouts/exercises/enrichment/libraryEnrichment.v1.ts`
- Validation: `lib/workouts/exercises/enrichment/validateExerciseLibraryEnrichment.ts`
- Readiness: `lib/workouts/exercises/enrichment/buildExerciseLibraryEnrichmentReadiness.ts`
