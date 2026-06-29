import {
  formatMuscleGroupLabel,
  resolvePrimaryMuscleGroupForStudioExercise,
} from "./muscleGroupAdapter";
import type { WorkoutExerciseCard } from "./types";

export type ExerciseCanvasSummary = {
  setCount: number;
  repRangeSummary: string;
  rpeSummary: string;
  rirSummary: string;
  primaryMuscleLabel: string | null;
  volumeSetContribution: number;
};

function uniqueNonEmpty(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function summarizeNumericTargets(values: (number | null)[]): string {
  const present = values.filter((value): value is number => value != null);
  if (present.length === 0) return "—";
  const min = Math.min(...present);
  const max = Math.max(...present);
  if (min === max) return String(min);
  return `${min}–${max}`;
}

/** Compact summary for collapsed exercise cards on the canvas. */
export function summarizeExerciseForCanvas(exercise: WorkoutExerciseCard): ExerciseCanvasSummary {
  const setCount = exercise.designedSets.length;
  const repRanges = uniqueNonEmpty(exercise.designedSets.map((set) => set.repRange));
  const primary = resolvePrimaryMuscleGroupForStudioExercise(exercise);

  return {
    setCount,
    repRangeSummary: repRanges.length === 0 ? "—" : repRanges.join(", "),
    rpeSummary: summarizeNumericTargets(exercise.designedSets.map((set) => set.rpeTarget)),
    rirSummary: summarizeNumericTargets(exercise.designedSets.map((set) => set.rirTarget)),
    primaryMuscleLabel: primary ? formatMuscleGroupLabel(primary) : null,
    volumeSetContribution: setCount,
  };
}
