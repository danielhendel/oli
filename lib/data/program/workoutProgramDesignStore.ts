// lib/data/program/workoutProgramDesignStore.ts
/**
 * In-memory, client-side draft store for Workout Program Design.
 *
 * WHY THIS EXISTS: the Program Design flow spans several sibling stack screens (landing + the
 * category setup pages + the generated-prescription customization pages). They share one draft so
 * selections made on a setup page are reflected on the landing card and regenerate the engine
 * preview. There is no Program persistence boundary in the repo yet (see lib/data/program/types.ts),
 * and the trust boundary forbids Firebase/API writes in screens. So this is a deliberately small,
 * framework-agnostic external store.
 *
 * PERSISTENCE IS INTENTIONALLY DEFERRED: state is process-memory only. It survives navigation within
 * a session but resets on app reload. No IO is performed here.
 *
 * The store holds only the six engine inputs plus sparse manual overrides — the prescription itself
 * is derived purely (see {@link ./buildProgrammingPrescription}). Manual overrides persist across
 * input changes so customizations survive regeneration.
 */
import { useSyncExternalStore } from "react";

import {
  MUSCLE_VOLUME_MAX_SETS,
  MUSCLE_VOLUME_MIN_SETS,
  PROGRAM_DESIGN_AGE_MAX,
  PROGRAM_DESIGN_AGE_MIN,
  TRAINING_DAYS_MAX,
  TRAINING_DAYS_MIN,
} from "@/lib/data/program/workoutProgramDesignOptions";
import {
  EXERCISE_COUNT_MAX,
  EXERCISE_COUNT_MIN,
} from "@/lib/data/program/programExerciseRecommendationTypes";
import {
  clearProgramExerciseSlotDay,
  moveProgramExerciseSlotToDay,
} from "@/lib/data/program/moveProgramExerciseSlotToDay";
import type {
  ProgramDesignMuscleGroup,
  ProgramDesignTrainingLevel,
  ProgramGoal,
  ProgramVolumeSex,
  TrainingType,
  WorkoutProgramDesignDraft,
} from "@/lib/data/program/workoutProgramDesignTypes";

/** The empty draft — every input in its "Not set" state, no overrides. */
export function buildEmptyWorkoutProgramDesignDraft(): WorkoutProgramDesignDraft {
  return {
    sex: null,
    age: null,
    trainingLevel: null,
    trainingDays: null,
    goal: null,
    trainingType: null,
    muscleVolumeOverrides: {},
    splitDayNameOverrides: {},
    frequencyOverrides: {},
    exerciseCountOverrides: {},
    trainingDayOverrides: {},
    exerciseSelectionOverrides: {},
    slotDayOverrides: {},
  };
}

let currentDraft: WorkoutProgramDesignDraft = buildEmptyWorkoutProgramDesignDraft();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function setDraft(next: WorkoutProgramDesignDraft): void {
  currentDraft = next;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): WorkoutProgramDesignDraft {
  return currentDraft;
}

function clampInt(value: number, min: number, max: number): number {
  const rounded = Math.round(value);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
}

/** Imperative mutators. Each produces a new immutable draft and notifies subscribers. */
export const workoutProgramDesignStore = {
  getSnapshot,
  subscribe,
  /** Replace the entire draft (used by tests and reset flows). */
  reset(): void {
    setDraft(buildEmptyWorkoutProgramDesignDraft());
  },
  setSex(sex: ProgramVolumeSex): void {
    setDraft({ ...currentDraft, sex });
  },
  setAge(rawAge: number): void {
    setDraft({ ...currentDraft, age: clampInt(rawAge, PROGRAM_DESIGN_AGE_MIN, PROGRAM_DESIGN_AGE_MAX) });
  },
  setTrainingLevel(trainingLevel: ProgramDesignTrainingLevel): void {
    setDraft({ ...currentDraft, trainingLevel });
  },
  setTrainingDays(rawDays: number): void {
    setDraft({
      ...currentDraft,
      trainingDays: clampInt(rawDays, TRAINING_DAYS_MIN, TRAINING_DAYS_MAX),
    });
  },
  setGoal(goal: ProgramGoal): void {
    setDraft({ ...currentDraft, goal });
  },
  setTrainingType(trainingType: TrainingType): void {
    setDraft({ ...currentDraft, trainingType });
  },
  /**
   * Set a manual per-muscle weekly-set override. The value (including 0) is recorded as an explicit
   * override that wins over the engine value and survives regeneration. Clamped to the stepper bounds.
   */
  setMuscleVolumeOverride(muscle: ProgramDesignMuscleGroup, sets: number): void {
    const next = { ...currentDraft.muscleVolumeOverrides };
    next[muscle] = clampInt(sets, MUSCLE_VOLUME_MIN_SETS, MUSCLE_VOLUME_MAX_SETS);
    setDraft({ ...currentDraft, muscleVolumeOverrides: next });
  },
  /** Remove a manual override so the muscle reverts to the engine-generated value. */
  clearMuscleVolumeOverride(muscle: ProgramDesignMuscleGroup): void {
    if (!(muscle in currentDraft.muscleVolumeOverrides)) return;
    const next = { ...currentDraft.muscleVolumeOverrides };
    delete next[muscle];
    setDraft({ ...currentDraft, muscleVolumeOverrides: next });
  },
  /** Set a manual per-muscle weekly-frequency override (times trained per week). */
  setFrequencyOverride(muscle: ProgramDesignMuscleGroup, frequency: number): void {
    const next = { ...currentDraft.frequencyOverrides };
    next[muscle] = clampInt(frequency, 1, TRAINING_DAYS_MAX);
    setDraft({ ...currentDraft, frequencyOverrides: next });
  },
  /** Remove a manual frequency override so the muscle reverts to the engine value. */
  clearFrequencyOverride(muscle: ProgramDesignMuscleGroup): void {
    if (!(muscle in currentDraft.frequencyOverrides)) return;
    const next = { ...currentDraft.frequencyOverrides };
    delete next[muscle];
    setDraft({ ...currentDraft, frequencyOverrides: next });
  },
  /** Set a manual per-muscle exercise-count override (number of exercise slots). */
  setExerciseCountOverride(muscle: ProgramDesignMuscleGroup, count: number): void {
    const next = { ...currentDraft.exerciseCountOverrides };
    next[muscle] = clampInt(count, EXERCISE_COUNT_MIN, EXERCISE_COUNT_MAX);
    setDraft({ ...currentDraft, exerciseCountOverrides: next });
  },
  /** Remove a manual exercise-count override so the muscle reverts to the engine default. */
  clearExerciseCountOverride(muscle: ProgramDesignMuscleGroup): void {
    if (!(muscle in currentDraft.exerciseCountOverrides)) return;
    const next = { ...currentDraft.exerciseCountOverrides };
    delete next[muscle];
    setDraft({ ...currentDraft, exerciseCountOverrides: next });
  },
  /** Set which training days a muscle group is assigned to (stable day ids). */
  setTrainingDayOverride(muscle: ProgramDesignMuscleGroup, dayIds: string[]): void {
    const next = { ...currentDraft.trainingDayOverrides };
    if (dayIds.length === 0) {
      delete next[muscle];
    } else {
      next[muscle] = dayIds;
    }
    setDraft({ ...currentDraft, trainingDayOverrides: next });
  },
  /** Set the user-entered name for one split day (overrides the engine-generated day name). */
  setSplitDayName(dayId: string, name: string): void {
    setDraft({
      ...currentDraft,
      splitDayNameOverrides: { ...currentDraft.splitDayNameOverrides, [dayId]: name },
    });
  },
  /**
   * Record a manual exercise swap for one slot. The chosen exercise id wins over the engine pick and
   * survives regeneration. Uses stable library ids only — never rewrites historical log ids.
   */
  setExerciseSelection(
    muscle: ProgramDesignMuscleGroup,
    slotId: string,
    exerciseId: string,
  ): void {
    const forMuscle = { ...(currentDraft.exerciseSelectionOverrides[muscle] ?? {}) };
    forMuscle[slotId] = exerciseId;
    setDraft({
      ...currentDraft,
      exerciseSelectionOverrides: {
        ...currentDraft.exerciseSelectionOverrides,
        [muscle]: forMuscle,
      },
    });
  },
  /** Remove a manual exercise swap so the slot reverts to the engine recommendation. */
  clearExerciseSelection(muscle: ProgramDesignMuscleGroup, slotId: string): void {
    const forMuscle = currentDraft.exerciseSelectionOverrides[muscle];
    if (forMuscle == null || !(slotId in forMuscle)) return;
    const nextForMuscle = { ...forMuscle };
    delete nextForMuscle[slotId];
    const nextOverrides = { ...currentDraft.exerciseSelectionOverrides };
    if (Object.keys(nextForMuscle).length === 0) {
      delete nextOverrides[muscle];
    } else {
      nextOverrides[muscle] = nextForMuscle;
    }
    setDraft({ ...currentDraft, exerciseSelectionOverrides: nextOverrides });
  },
  /**
   * Move an exercise slot to another training day. Records a manual override (stable day id) that
   * wins over the engine assignment and survives regeneration. Only the day changes — the slot's
   * stable id and any selected exercise id are preserved (historical logs untouched).
   */
  setSlotDayOverride(muscle: ProgramDesignMuscleGroup, slotId: string, dayId: string): void {
    setDraft({
      ...currentDraft,
      slotDayOverrides: moveProgramExerciseSlotToDay(
        currentDraft.slotDayOverrides,
        muscle,
        slotId,
        dayId,
      ),
    });
  },
  /** Remove a manual slot→day move so the slot reverts to the engine assignment. */
  clearSlotDayOverride(muscle: ProgramDesignMuscleGroup, slotId: string): void {
    setDraft({
      ...currentDraft,
      slotDayOverrides: clearProgramExerciseSlotDay(currentDraft.slotDayOverrides, muscle, slotId),
    });
  },
} as const;

/** Subscribe a component to the live Program Design draft. */
export function useWorkoutProgramDesignDraft(): WorkoutProgramDesignDraft {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
