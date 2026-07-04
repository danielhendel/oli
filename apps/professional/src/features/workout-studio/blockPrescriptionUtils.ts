import { createId } from "./ids";
import { createDefaultDesignedSets } from "./designedSetUtils";
import {
  resizeDesignedSetsPreservingValues,
  resolveExerciseBuilderPrescription,
  syncExerciseGeneralPrescription,
} from "./exerciseBuilderPrescription";
import type { WorkoutBlock, WorkoutExerciseCard } from "./types";

export const DEFAULT_BLOCK_TARGET_SET_COUNT = 3;
export const DEFAULT_BLOCK_REST_SECONDS = 90;

export function resolveBlockTargetSetCount(block: WorkoutBlock): number {
  if (block.targetSetCount > 0) return block.targetSetCount;
  const firstExercise = block.exercises[0];
  if (firstExercise && firstExercise.designedSets.length > 0) {
    return firstExercise.designedSets.length;
  }
  return DEFAULT_BLOCK_TARGET_SET_COUNT;
}

export function resolveBlockDefaultRest(block: WorkoutBlock): number | null {
  if (block.defaultRestSeconds != null) return block.defaultRestSeconds;
  const firstSet = block.exercises[0]?.designedSets[0];
  return firstSet?.restSeconds ?? DEFAULT_BLOCK_REST_SECONDS;
}

function applySetCountToExercise(
  exercise: WorkoutExerciseCard,
  setCount: number,
  defaultRest: number | null,
): WorkoutExerciseCard {
  const builder = resolveExerciseBuilderPrescription(exercise);
  const resized = resizeDesignedSetsPreservingValues(
    exercise.designedSets.length > 0
      ? exercise.designedSets
      : createDefaultDesignedSets(setCount),
    setCount,
    { restSeconds: defaultRest },
  );

  const withRest =
    defaultRest != null
      ? resized.map((set) => ({ ...set, restSeconds: defaultRest }))
      : resized;

  const nextExercise = { ...exercise, designedSets: withRest };

  if (builder.customizeEachSet) {
    return {
      ...nextExercise,
      prescription: { ...exercise.prescription, sets: withRest.length },
    };
  }

  return syncExerciseGeneralPrescription(nextExercise, builder);
}

export function applyBlockTargetSetCount(block: WorkoutBlock, setCount: number): WorkoutBlock {
  const clamped = Math.max(1, Math.min(20, Math.round(setCount)));
  const defaultRest = resolveBlockDefaultRest(block);

  return {
    ...block,
    targetSetCount: clamped,
    exercises: block.exercises.map((exercise) =>
      applySetCountToExercise(exercise, clamped, defaultRest),
    ),
  };
}

export function applyBlockDefaultRest(block: WorkoutBlock, restSeconds: number | null): WorkoutBlock {
  const clamped =
    restSeconds == null ? null : Math.max(0, Math.min(600, Math.round(restSeconds)));

  return {
    ...block,
    defaultRestSeconds: clamped,
    exercises: block.exercises.map((exercise) => {
      const builder = resolveExerciseBuilderPrescription(exercise);
      const designedSets = exercise.designedSets.map((set) => ({
        ...set,
        restSeconds: clamped,
      }));
      const next = { ...exercise, designedSets };
      if (builder.customizeEachSet) return next;
      return syncExerciseGeneralPrescription(next, builder);
    }),
  };
}

export function applyBlockDefaultsToNewExercise(
  exercise: WorkoutExerciseCard,
  block: WorkoutBlock,
): WorkoutExerciseCard {
  const setCount = resolveBlockTargetSetCount(block);
  const defaultRest = resolveBlockDefaultRest(block);
  return applySetCountToExercise(exercise, setCount, defaultRest);
}

export function normalizeWorkoutBlock(block: WorkoutBlock): WorkoutBlock {
  return {
    ...block,
    targetSetCount: block.targetSetCount ?? DEFAULT_BLOCK_TARGET_SET_COUNT,
    defaultRestSeconds: block.defaultRestSeconds ?? DEFAULT_BLOCK_REST_SECONDS,
    exercises: block.exercises.map((exercise) => ({
      ...exercise,
      builderPrescription:
        exercise.builderPrescription ?? {
          repsMode: "reps",
          sideMode: "total",
          loadMode: "totalWeight",
          loadUnit: "lbs",
          loadValue: "",
          customizeEachSet: true,
          exerciseNotes: "",
          perSetFields: {},
        },
    })),
  };
}

export function createBlockWithDefaults(
  block: Omit<WorkoutBlock, "targetSetCount" | "defaultRestSeconds"> &
    Partial<Pick<WorkoutBlock, "targetSetCount" | "defaultRestSeconds">>,
): WorkoutBlock {
  return normalizeWorkoutBlock({
    ...block,
    targetSetCount: block.targetSetCount ?? DEFAULT_BLOCK_TARGET_SET_COUNT,
    defaultRestSeconds: block.defaultRestSeconds ?? DEFAULT_BLOCK_REST_SECONDS,
  });
}

/** Ensures resized sets get fresh ids when growing from template */
export function resizeDesignedSetsWithIds(
  sets: ReturnType<typeof createDefaultDesignedSets>,
  targetCount: number,
): ReturnType<typeof createDefaultDesignedSets> {
  const resized = resizeDesignedSetsPreservingValues(sets, targetCount);
  return resized.map((set, index) => {
    if (index < sets.length) return set;
    return { ...set, setId: createId("set") };
  });
}
