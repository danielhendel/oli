import { createId, nowIso } from "./ids";
import { getBlockDisplayTitle } from "./blockUtils";
import type {
  WorkoutBlock,
  WorkoutBlockType,
  WorkoutDifficulty,
  WorkoutExerciseCard,
  WorkoutExperience,
} from "./types";
import { WORKOUT_BLOCK_TYPE_LABELS } from "./types";
import {
  createEmptyCustomExercise,
  createWorkoutStudioExerciseFromLibraryExercise,
} from "./createWorkoutStudioExerciseFromLibraryExercise";
import type { WorkoutLibraryExercise } from "./exerciseLibraryAdapter";
import { cloneExerciseCard, cloneWorkoutBlock } from "./exerciseCloneUtils";

export function createEmptyExercise(): WorkoutExerciseCard {
  return createEmptyCustomExercise();
}

export function createBlock(blockType: WorkoutBlockType, order: number): WorkoutBlock {
  return {
    id: createId("blk"),
    blockType,
    customTitle: "",
    notes: "",
    order,
    exercises: [],
  };
}

export function createEmptyWorkoutExperience(clientName = "Daniel Hendel"): WorkoutExperience {
  const timestamp = nowIso();
  return {
    id: createId("wx"),
    title: "Untitled Workout Experience",
    clientName,
    overview: {
      objective: "",
      desiredAdaptation: "",
      roleInHealthSystem: "",
    },
    estimatedDurationMinutes: 60,
    difficulty: "intermediate",
    blocks: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export type WorkoutStudioDraftState = {
  workouts: WorkoutExperience[];
  activeWorkoutId: string | null;
};

export function addBlock(
  workout: WorkoutExperience,
  blockType: WorkoutBlockType,
): WorkoutExperience {
  const order = workout.blocks.length;
  return {
    ...workout,
    blocks: [...workout.blocks, createBlock(blockType, order)],
    updatedAt: nowIso(),
  };
}

/** @deprecated — use addBlock */
export const addSection = addBlock;

export function updateBlock(
  workout: WorkoutExperience,
  blockId: string,
  patch: Partial<Pick<WorkoutBlock, "customTitle" | "notes" | "blockType" | "order">>,
): WorkoutExperience {
  return {
    ...workout,
    blocks: workout.blocks.map((block) =>
      block.id === blockId ? { ...block, ...patch } : block,
    ),
    updatedAt: nowIso(),
  };
}

/** @deprecated — use updateBlock */
export const updateSection = updateBlock;

export function removeBlock(workout: WorkoutExperience, blockId: string): WorkoutExperience {
  const blocks = workout.blocks
    .filter((block) => block.id !== blockId)
    .map((block, index) => ({ ...block, order: index }));
  return {
    ...workout,
    blocks,
    updatedAt: nowIso(),
  };
}

export function duplicateBlock(workout: WorkoutExperience, blockId: string): WorkoutExperience {
  const source = workout.blocks.find((block) => block.id === blockId);
  if (!source) return workout;
  const copy = cloneWorkoutBlock(source, workout.blocks.length);
  return {
    ...workout,
    blocks: [...workout.blocks, copy].map((block, index) => ({ ...block, order: index })),
    updatedAt: nowIso(),
  };
}

export function moveBlock(
  workout: WorkoutExperience,
  blockId: string,
  direction: "up" | "down",
): WorkoutExperience {
  const index = workout.blocks.findIndex((block) => block.id === blockId);
  if (index < 0) return workout;
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= workout.blocks.length) return workout;

  const next = [...workout.blocks];
  const current = next[index];
  const swap = next[targetIndex];
  if (!current || !swap) return workout;
  next[index] = swap;
  next[targetIndex] = current;

  return {
    ...workout,
    blocks: next.map((block, order) => ({ ...block, order })),
    updatedAt: nowIso(),
  };
}

/** @deprecated — use removeBlock */
export const removeSection = removeBlock;

export function addExercise(
  workout: WorkoutExperience,
  blockId: string,
  exercise?: WorkoutExerciseCard,
): WorkoutExperience {
  const nextExercise = exercise ?? createEmptyExercise();
  return {
    ...workout,
    blocks: workout.blocks.map((block) =>
      block.id === blockId
        ? { ...block, exercises: [...block.exercises, nextExercise] }
        : block,
    ),
    updatedAt: nowIso(),
  };
}

export function addExerciseFromLibrary(
  workout: WorkoutExperience,
  blockId: string,
  libraryExercise: WorkoutLibraryExercise,
): WorkoutExperience {
  const card = createWorkoutStudioExerciseFromLibraryExercise(libraryExercise);
  return addExercise(workout, blockId, card);
}

export function updateExercise(
  workout: WorkoutExperience,
  blockId: string,
  exerciseId: string,
  patch: Partial<WorkoutExerciseCard>,
): WorkoutExperience {
  return {
    ...workout,
    blocks: workout.blocks.map((block) => {
      if (block.id !== blockId) return block;
      return {
        ...block,
        exercises: block.exercises.map((exercise) =>
          exercise.id === exerciseId ? { ...exercise, ...patch } : exercise,
        ),
      };
    }),
    updatedAt: nowIso(),
  };
}

export function removeExercise(
  workout: WorkoutExperience,
  blockId: string,
  exerciseId: string,
): WorkoutExperience {
  return {
    ...workout,
    blocks: workout.blocks.map((block) => {
      if (block.id !== blockId) return block;
      return {
        ...block,
        exercises: block.exercises.filter((exercise) => exercise.id !== exerciseId),
      };
    }),
    updatedAt: nowIso(),
  };
}

export function moveExercise(
  workout: WorkoutExperience,
  blockId: string,
  exerciseId: string,
  direction: "up" | "down",
): WorkoutExperience {
  return {
    ...workout,
    blocks: workout.blocks.map((block) => {
      if (block.id !== blockId) return block;
      const index = block.exercises.findIndex((exercise) => exercise.id === exerciseId);
      if (index < 0) return block;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= block.exercises.length) return block;
      const next = [...block.exercises];
      const current = next[index];
      const swap = next[targetIndex];
      if (!current || !swap) return block;
      next[index] = swap;
      next[targetIndex] = current;
      return { ...block, exercises: next };
    }),
    updatedAt: nowIso(),
  };
}

export function duplicateExercise(
  workout: WorkoutExperience,
  blockId: string,
  exerciseId: string,
): WorkoutExperience {
  return {
    ...workout,
    blocks: workout.blocks.map((block) => {
      if (block.id !== blockId) return block;
      const index = block.exercises.findIndex((exercise) => exercise.id === exerciseId);
      if (index < 0) return block;
      const source = block.exercises[index];
      if (!source) return block;
      const copy = cloneExerciseCard(source);
      const next = [...block.exercises];
      next.splice(index + 1, 0, copy);
      return { ...block, exercises: next };
    }),
    updatedAt: nowIso(),
  };
}

export function moveExerciseToBlock(
  workout: WorkoutExperience,
  fromBlockId: string,
  toBlockId: string,
  exerciseId: string,
): WorkoutExperience {
  if (fromBlockId === toBlockId) return workout;

  const fromBlock = workout.blocks.find((block) => block.id === fromBlockId);
  const exercise = fromBlock?.exercises.find((item) => item.id === exerciseId);
  if (!exercise) return workout;

  const without = removeExercise(workout, fromBlockId, exerciseId);
  return addExercise(without, toBlockId, exercise);
}

export function updateWorkoutMeta(
  workout: WorkoutExperience,
  patch: Partial<
    Pick<
      WorkoutExperience,
      "title" | "clientName" | "estimatedDurationMinutes" | "difficulty"
    >
  > & {
    objective?: string;
    desiredAdaptation?: string;
    roleInHealthSystem?: string;
  },
): WorkoutExperience {
  const { objective, desiredAdaptation, roleInHealthSystem, ...rest } = patch;
  return {
    ...workout,
    ...rest,
    overview: {
      ...workout.overview,
      ...(objective !== undefined ? { objective } : {}),
      ...(desiredAdaptation !== undefined ? { desiredAdaptation } : {}),
      ...(roleInHealthSystem !== undefined ? { roleInHealthSystem } : {}),
    },
    updatedAt: nowIso(),
  };
}

export function upsertWorkout(
  state: WorkoutStudioDraftState,
  workout: WorkoutExperience,
): WorkoutStudioDraftState {
  const exists = state.workouts.some((item) => item.id === workout.id);
  return {
    ...state,
    workouts: exists
      ? state.workouts.map((item) => (item.id === workout.id ? workout : item))
      : [...state.workouts, workout],
    activeWorkoutId: workout.id,
  };
}

export function seedSampleWorkout(clientName = "Daniel Hendel"): WorkoutExperience {
  const base = createEmptyWorkoutExperience(clientName);
  const withMeta = updateWorkoutMeta(base, {
    title: "Upper Body Strength — Session 1",
    objective: "Build upper-body strength with intentional movement quality.",
    desiredAdaptation: "Neuromuscular efficiency and hypertrophy stimulus.",
    roleInHealthSystem: "Primary strength session within the Muscle Gain System.",
    estimatedDurationMinutes: 55,
    difficulty: "advanced" as WorkoutDifficulty,
  });
  const withBlock = addBlock(withMeta, "primaryLift");
  const blockId = withBlock.blocks[0]?.id;
  if (!blockId) return withBlock;

  const libraryItem: WorkoutLibraryExercise = {
    exerciseId: "bench_press",
    name: "Bench Press",
    aliases: ["barbell bench", "flat bench"],
    primaryMuscles: ["Chest"],
    secondaryMuscles: ["Shoulders", "Triceps"],
    equipment: "Barbell",
    movementPattern: "push",
    primaryBucket: "Chest",
    trainingType: "strength",
    description:
      "A foundational horizontal press that develops chest, shoulders, and triceps coordination under load.",
    cues: [
      "Pull the bar apart to engage the upper back.",
      "Drive through the floor with your legs.",
    ],
  };

  const exercise: WorkoutExerciseCard = {
    ...createWorkoutStudioExerciseFromLibraryExercise(libraryItem),
    design: {
      ...createWorkoutStudioExerciseFromLibraryExercise(libraryItem).design,
      whyToday: "You are fresh today and bench press supports your chest volume target this week.",
      setupInstructions:
        "Set eyes under the bar, feet planted, shoulder blades retracted, natural arch.",
      executionInstructions:
        "Lower with control to mid-chest, pause briefly, press up while keeping wrists stacked.",
      coachingCues: [
        { id: createId("cue"), text: "Pull the bar apart to engage the upper back." },
        { id: createId("cue"), text: "Drive through the floor with your legs." },
      ],
      commonMistakes: [
        { id: createId("mistake"), text: "Flaring elbows excessively." },
        { id: createId("mistake"), text: "Bouncing the bar off the chest." },
      ],
      shouldFeel: [
        { id: createId("feel"), text: "Chest and triceps working evenly through the rep." },
      ],
      shouldNotFeel: [
        { id: createId("nofeel"), text: "Sharp shoulder pain or numbness in the arm." },
      ],
      educationNotes:
        "The bench press teaches you to produce force while stabilizing the shoulder girdle — a skill that transfers to pushing in daily life.",
    },
    progressionRules: [
      {
        id: createId("prog"),
        text: "Add 2.5 kg when all sets hit target reps at RPE 7–8 for two sessions.",
      },
    ],
    regressionOptions: ["Dumbbell bench press", "Floor press"],
    substitutionOptions: ["Machine chest press"],
    prescription: {
      sets: 4,
      reps: null,
      repRange: "6-8",
      loadGuidance: "RPE 7-8",
      tempo: "3-1-1",
      restSeconds: 120,
      rirTarget: 2,
      rpeTarget: 7.5,
      failurePolicy: "Leave 1-2 reps in reserve on working sets.",
    },
  };

  const result = addExercise(withBlock, blockId, exercise);
  const block = result.blocks[0];
  if (block) {
    return updateBlock(result, blockId, {
      notes: `Focus: ${getBlockDisplayTitle(block)} quality — ${WORKOUT_BLOCK_TYPE_LABELS.primaryLift} work with full recovery between sets.`,
    });
  }
  return result;
}
