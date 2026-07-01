import { buildTop25ExerciseKeyframeSpecRegistry } from "../buildTop25ExerciseKeyframeSpecRegistry";
import type { ExerciseKeyframeSpec } from "../types";

/** Static Top 25 keyframe spec registry — production blueprints only. */
export const TOP25_EXERCISE_KEYFRAME_SPECS: readonly ExerciseKeyframeSpec[] =
  buildTop25ExerciseKeyframeSpecRegistry();
