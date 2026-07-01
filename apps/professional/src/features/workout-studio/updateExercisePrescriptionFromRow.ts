import { addDesignedSet, createDefaultDesignedSets } from "./designedSetUtils";
import type { WorkoutDesignedSet, WorkoutExerciseCard } from "./types";

const MIN_SET_COUNT = 1;
const MAX_SET_COUNT = 20;

function renumberSets(sets: readonly WorkoutDesignedSet[]): WorkoutDesignedSet[] {
  return sets.map((set, index) => ({ ...set, setNumber: index + 1 }));
}

function clampSetCount(count: number): number {
  return Math.max(MIN_SET_COUNT, Math.min(MAX_SET_COUNT, Math.round(count)));
}

function ensureDesignedSets(sets: readonly WorkoutDesignedSet[]): WorkoutDesignedSet[] {
  if (sets.length > 0) {
    return sets.map((set) => ({ ...set }));
  }
  return createDefaultDesignedSets(1);
}

export function resizeDesignedSetCount(
  sets: readonly WorkoutDesignedSet[],
  count: number,
): WorkoutDesignedSet[] {
  const target = clampSetCount(count);
  const current = ensureDesignedSets(sets);

  if (current.length === target) {
    return current;
  }

  if (current.length > target) {
    return renumberSets(current.slice(0, target));
  }

  let next = [...current];
  while (next.length < target) {
    next = addDesignedSet(next);
  }
  return next;
}

function applyToAllDesignedSets(
  sets: readonly WorkoutDesignedSet[],
  patch: Partial<
    Pick<WorkoutDesignedSet, "repRange" | "rpeTarget" | "restSeconds" | "tempo">
  >,
): WorkoutDesignedSet[] {
  const base = ensureDesignedSets(sets);
  return base.map((set) => ({ ...set, ...patch }));
}

export function updateExerciseSetCountFromRow(
  exercise: WorkoutExerciseCard,
  count: number,
): WorkoutExerciseCard {
  return {
    ...exercise,
    designedSets: resizeDesignedSetCount(exercise.designedSets, count),
  };
}

export function updateExerciseRepRangeFromRow(
  exercise: WorkoutExerciseCard,
  repRange: string,
): WorkoutExerciseCard {
  return {
    ...exercise,
    designedSets: applyToAllDesignedSets(exercise.designedSets, { repRange }),
  };
}

export function updateExerciseRpeFromRow(
  exercise: WorkoutExerciseCard,
  rpeTarget: number | null,
): WorkoutExerciseCard {
  return {
    ...exercise,
    designedSets: applyToAllDesignedSets(exercise.designedSets, { rpeTarget }),
  };
}

export function updateExerciseRestSecondsFromRow(
  exercise: WorkoutExerciseCard,
  restSeconds: number | null,
): WorkoutExerciseCard {
  return {
    ...exercise,
    designedSets: applyToAllDesignedSets(exercise.designedSets, { restSeconds }),
  };
}

export function updateExerciseTempoFromRow(
  exercise: WorkoutExerciseCard,
  tempo: string,
): WorkoutExerciseCard {
  return {
    ...exercise,
    designedSets: applyToAllDesignedSets(exercise.designedSets, { tempo }),
  };
}

export type ExercisePrescriptionRowPatch =
  | { readonly field: "setCount"; readonly value: number }
  | { readonly field: "repRange"; readonly value: string }
  | { readonly field: "rpeTarget"; readonly value: number | null }
  | { readonly field: "restSeconds"; readonly value: number | null }
  | { readonly field: "tempo"; readonly value: string };

export function updateExercisePrescriptionFromRow(
  exercise: WorkoutExerciseCard,
  patch: ExercisePrescriptionRowPatch,
): WorkoutExerciseCard {
  switch (patch.field) {
    case "setCount":
      return updateExerciseSetCountFromRow(exercise, patch.value);
    case "repRange":
      return updateExerciseRepRangeFromRow(exercise, patch.value);
    case "rpeTarget":
      return updateExerciseRpeFromRow(exercise, patch.value);
    case "restSeconds":
      return updateExerciseRestSecondsFromRow(exercise, patch.value);
    case "tempo":
      return updateExerciseTempoFromRow(exercise, patch.value);
  }
}

export function parseRpeTargetInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(1, Math.min(10, Math.round(parsed)));
}

export function parseRestSecondsInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.round(parsed));
}
