export type ExerciseCatalogItem = {
  exerciseId: string; // canonical slug
  name: string;       // display name
  aliases: string[];  // search aliases (lower/upper ok; search normalizes)
};

/**
 * Exercise Catalog v1 (local, offline-first).
 * Deterministic IDs: snake_case slugs.
 *
 * NOTE: This is intentionally small v1. We can expand to 200–500 lifts later.
 */
export const EXERCISE_CATALOG_V1: ExerciseCatalogItem[] = [
  { exerciseId: "bench_press", name: "Bench Press", aliases: ["barbell bench", "flat bench"] },
  { exerciseId: "incline_bench_press", name: "Incline Bench Press", aliases: ["incline bench", "incline barbell bench"] },
  { exerciseId: "dumbbell_bench_press", name: "Dumbbell Bench Press", aliases: ["db bench", "dumbbell bench"] },
  { exerciseId: "overhead_press", name: "Overhead Press", aliases: ["ohp", "military press", "standing press"] },
  { exerciseId: "dumbbell_shoulder_press", name: "Dumbbell Shoulder Press", aliases: ["db shoulder press"] },
  { exerciseId: "push_up", name: "Push-Up", aliases: ["pushup"] },

  { exerciseId: "squat", name: "Back Squat", aliases: ["back squat", "barbell squat"] },
  { exerciseId: "front_squat", name: "Front Squat", aliases: ["front squat"] },
  { exerciseId: "deadlift", name: "Deadlift", aliases: ["conventional deadlift"] },
  { exerciseId: "romanian_deadlift", name: "Romanian Deadlift", aliases: ["rdl"] },
  { exerciseId: "hip_thrust", name: "Hip Thrust", aliases: ["barbell hip thrust"] },
  { exerciseId: "leg_press", name: "Leg Press", aliases: ["machine leg press"] },
  { exerciseId: "leg_extension", name: "Leg Extension", aliases: ["quad extension"] },
  { exerciseId: "leg_curl", name: "Leg Curl", aliases: ["hamstring curl"] },
  { exerciseId: "calf_raise", name: "Calf Raise", aliases: ["standing calf raise", "seated calf raise"] },

  { exerciseId: "pull_up", name: "Pull-Up", aliases: ["pullup", "chin up", "chin-up"] },
  { exerciseId: "lat_pulldown", name: "Lat Pulldown", aliases: ["pulldown"] },
  { exerciseId: "barbell_row", name: "Barbell Row", aliases: ["bent over row", "bent-over row"] },
  { exerciseId: "dumbbell_row", name: "Dumbbell Row", aliases: ["one arm row", "one-arm row"] },
  { exerciseId: "seated_cable_row", name: "Seated Cable Row", aliases: ["cable row"] },
  { exerciseId: "face_pull", name: "Face Pull", aliases: ["cable face pull"] },

  { exerciseId: "bicep_curl", name: "Bicep Curl", aliases: ["barbell curl", "curl"] },
  { exerciseId: "hammer_curl", name: "Hammer Curl", aliases: ["db hammer curl"] },
  { exerciseId: "tricep_pushdown", name: "Tricep Pushdown", aliases: ["cable pushdown", "triceps pushdown"] },
  { exerciseId: "skull_crusher", name: "Skull Crusher", aliases: ["lying triceps extension"] },
  { exerciseId: "dip", name: "Dip", aliases: ["triceps dip", "parallel bar dip"] },

  { exerciseId: "lateral_raise", name: "Lateral Raise", aliases: ["side raise", "db lateral raise"] },
  { exerciseId: "rear_delt_fly", name: "Rear Delt Fly", aliases: ["reverse fly", "reverse pec deck"] },

  { exerciseId: "plank", name: "Plank", aliases: ["front plank"] },
  { exerciseId: "hanging_leg_raise", name: "Hanging Leg Raise", aliases: ["leg raise"] },
];
