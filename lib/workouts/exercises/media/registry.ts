/* eslint-disable @typescript-eslint/no-require-imports -- Metro uses require() for static asset resolution */
import type { ExerciseMedia } from "./types";

const placeholder = require("../../../../assets/exercises/placeholder.png");

const REGISTRY: Record<string, number> = {
  squat: require("../../../../assets/exercises/squat.png"),
  bench_press: require("../../../../assets/exercises/bench_press/thumb.png"),
  deadlift: require("../../../../assets/exercises/deadlift.png"),
  overhead_press: require("../../../../assets/exercises/overhead_press.png"),
  barbell_row: require("../../../../assets/exercises/barbell_row.png"),
  bicep_curl: require("../../../../assets/exercises/bicep_curl.png"),
};

/** Optional loop video assets by exerciseId. Only exercises with bundled loop video are listed. */
const LOOP_VIDEO_REGISTRY: Record<string, number> = {
  bench_press: require("../../../../assets/exercises/bench_press/loop.mp4"),
};

export function getBundledExerciseAsset(exerciseId: string): number {
  return REGISTRY[exerciseId] ?? placeholder;
}

export function hasBundledExerciseAsset(exerciseId: string): boolean {
  return exerciseId in REGISTRY;
}

export function getExerciseMedia(exerciseId: string): ExerciseMedia {
  const thumbnail = getBundledExerciseAsset(exerciseId);
  const loopVideo = LOOP_VIDEO_REGISTRY[exerciseId];
  return loopVideo != null ? { thumbnail, loopVideo } : { thumbnail };
}

export function hasLoopVideo(exerciseId: string): boolean {
  return exerciseId in LOOP_VIDEO_REGISTRY;
}
