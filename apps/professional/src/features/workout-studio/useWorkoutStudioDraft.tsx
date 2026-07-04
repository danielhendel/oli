"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import {
  addBlock,
  addExercise,
  addExerciseFromLibrary,
  createEmptyWorkoutExperience,
  duplicateBlock,
  duplicateExercise,
  moveBlock,
  moveExercise,
  moveExerciseToBlock,
  removeBlock,
  removeExercise,
  seedSampleWorkout,
  updateBlock,
  updateExercise,
  updateWorkoutMeta,
  upsertWorkout,
  type WorkoutStudioDraftState,
} from "@/features/workout-studio/workoutStudioDraft";
import type { WorkoutLibraryExercise } from "@/features/workout-studio/exerciseLibraryAdapter";
import { createEmptyCustomExercise } from "@/features/workout-studio/createWorkoutStudioExerciseFromLibraryExercise";
import type {
  WorkoutBlock,
  WorkoutBlockType,
  WorkoutExerciseCard,
  WorkoutExperience,
} from "@/features/workout-studio/types";

type WorkoutStudioContextValue = {
  state: WorkoutStudioDraftState;
  activeWorkout: WorkoutExperience | null;
  createWorkout: (clientName?: string) => WorkoutExperience;
  loadWorkout: (workoutId: string) => void;
  saveWorkout: (workout: WorkoutExperience) => void;
  addBlock: (blockType: WorkoutBlockType) => void;
  updateBlock: (
    blockId: string,
    patch: Partial<
      Pick<
        WorkoutBlock,
        "customTitle" | "notes" | "blockType" | "order" | "targetSetCount" | "defaultRestSeconds"
      >
    >,
  ) => void;
  duplicateBlock: (blockId: string) => void;
  removeBlock: (blockId: string) => void;
  moveBlock: (blockId: string, direction: "up" | "down") => void;
  addExercise: (blockId: string) => void;
  addExerciseFromLibrary: (blockId: string, libraryExercise: WorkoutLibraryExercise) => void;
  addCustomExercise: (blockId: string, name?: string) => void;
  updateExercise: (
    blockId: string,
    exerciseId: string,
    patch: Partial<WorkoutExerciseCard>,
  ) => void;
  removeExercise: (blockId: string, exerciseId: string) => void;
  duplicateExercise: (blockId: string, exerciseId: string) => void;
  moveExercise: (blockId: string, exerciseId: string, direction: "up" | "down") => void;
  moveExerciseToBlock: (fromBlockId: string, toBlockId: string, exerciseId: string) => void;
  updateWorkoutMeta: (
    patch: Partial<{
      title: string;
      clientName: string;
      estimatedDurationMinutes: number | null;
      difficulty: WorkoutExperience["difficulty"];
      objective: string;
      desiredAdaptation: string;
      roleInHealthSystem: string;
    }>,
  ) => void;
};

const WorkoutStudioContext = createContext<WorkoutStudioContextValue | null>(null);

const initialState: WorkoutStudioDraftState = {
  workouts: [seedSampleWorkout()],
  activeWorkoutId: null,
};

export function WorkoutStudioProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkoutStudioDraftState>(initialState);

  const activeWorkout = useMemo(() => {
    if (!state.activeWorkoutId) return state.workouts[0] ?? null;
    return state.workouts.find((workout) => workout.id === state.activeWorkoutId) ?? null;
  }, [state]);

  const mutateActive = useCallback(
    (mutator: (workout: WorkoutExperience) => WorkoutExperience) => {
      setState((current) => {
        const workout = current.activeWorkoutId
          ? current.workouts.find((item) => item.id === current.activeWorkoutId)
          : current.workouts[0];
        if (!workout) return current;
        const nextWorkout = mutator(workout);
        return upsertWorkout(current, nextWorkout);
      });
    },
    [],
  );

  const value = useMemo<WorkoutStudioContextValue>(
    () => ({
      state,
      activeWorkout,
      createWorkout: (clientName) => {
        const workout = createEmptyWorkoutExperience(clientName);
        setState((current) => upsertWorkout(current, workout));
        return workout;
      },
      loadWorkout: (workoutId) => {
        setState((current) => ({ ...current, activeWorkoutId: workoutId }));
      },
      saveWorkout: (workout) => {
        setState((current) => upsertWorkout(current, workout));
      },
      addBlock: (blockType) => {
        mutateActive((workout) => addBlock(workout, blockType));
      },
      updateBlock: (blockId, patch) => {
        mutateActive((workout) => updateBlock(workout, blockId, patch));
      },
      duplicateBlock: (blockId) => {
        mutateActive((workout) => duplicateBlock(workout, blockId));
      },
      removeBlock: (blockId) => {
        mutateActive((workout) => removeBlock(workout, blockId));
      },
      moveBlock: (blockId, direction) => {
        mutateActive((workout) => moveBlock(workout, blockId, direction));
      },
      addExercise: (blockId) => {
        mutateActive((workout) => addExercise(workout, blockId));
      },
      addExerciseFromLibrary: (blockId, libraryExercise) => {
        mutateActive((workout) => addExerciseFromLibrary(workout, blockId, libraryExercise));
      },
      addCustomExercise: (blockId, name) => {
        mutateActive((workout) =>
          addExercise(workout, blockId, createEmptyCustomExercise(name)),
        );
      },
      updateExercise: (blockId, exerciseId, patch) => {
        mutateActive((workout) => updateExercise(workout, blockId, exerciseId, patch));
      },
      removeExercise: (blockId, exerciseId) => {
        mutateActive((workout) => removeExercise(workout, blockId, exerciseId));
      },
      duplicateExercise: (blockId, exerciseId) => {
        mutateActive((workout) => duplicateExercise(workout, blockId, exerciseId));
      },
      moveExercise: (blockId, exerciseId, direction) => {
        mutateActive((workout) => moveExercise(workout, blockId, exerciseId, direction));
      },
      moveExerciseToBlock: (fromBlockId, toBlockId, exerciseId) => {
        mutateActive((workout) => moveExerciseToBlock(workout, fromBlockId, toBlockId, exerciseId));
      },
      updateWorkoutMeta: (patch) => {
        mutateActive((workout) => updateWorkoutMeta(workout, patch));
      },
    }),
    [activeWorkout, mutateActive, state],
  );

  return (
    <WorkoutStudioContext.Provider value={value}>{children}</WorkoutStudioContext.Provider>
  );
}

export function useWorkoutStudioDraft(): WorkoutStudioContextValue {
  const context = useContext(WorkoutStudioContext);
  if (!context) {
    throw new Error("useWorkoutStudioDraft must be used within WorkoutStudioProvider");
  }
  return context;
}
