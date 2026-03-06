import type { ExerciseImageSource } from "./types";
import { getBundledExerciseAsset } from "./registry";

export function getExerciseImage(exerciseId: string): ExerciseImageSource {
  return { kind: "bundled", asset: getBundledExerciseAsset(exerciseId) };
}
