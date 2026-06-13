// lib/data/program/buildProgramDayWorkouts.ts
/**
 * Project the generated program into per-day workouts for the weekly split. Pure — no IO, no React.
 *
 * Pipeline:
 *  1. Balance every exercise slot across the training days ({@link assignExerciseSlotsToTrainingDays}).
 *  2. Build each muscle group's slots with that assignment (so days + manual moves are reflected).
 *  3. Group slots by day, in muscle-group then slot order, with headline totals.
 *
 * Selected slots reference stable library ids; nothing here mutates exercise ids or logs.
 */
import { assignExerciseSlotsToTrainingDays } from "@/lib/data/program/assignExerciseSlotsToTrainingDays";
import { buildMuscleGroupExercisePlan } from "@/lib/data/program/buildProgramExerciseRecommendations";
import type {
  ProgramDayMoveTarget,
  ProgramDaySlot,
  ProgramDayWorkout,
} from "@/lib/data/program/programDayWorkoutTypes";
import type { ProgrammingPrescription } from "@/lib/data/program/programmingEngineTypes";
import { PROGRAM_DESIGN_MUSCLE_GROUP_ORDER } from "@/lib/data/program/workoutProgramDesignOptions";
import type {
  ExerciseSelectionOverrideMap,
  ProgramDesignMuscleGroup,
  SlotDayOverrideMap,
} from "@/lib/data/program/workoutProgramDesignTypes";

export type BuildProgramDayWorkoutsArgs = {
  prescription: ProgrammingPrescription;
  exerciseCountOverrides?: Partial<Record<ProgramDesignMuscleGroup, number>> | undefined;
  trainingDayOverrides?: Partial<Record<ProgramDesignMuscleGroup, string[]>> | undefined;
  exerciseSelectionOverrides?: ExerciseSelectionOverrideMap | undefined;
  slotDayOverrides?: SlotDayOverrideMap | undefined;
};

/** Build one {@link ProgramDayWorkout} per training-split day (empty days included). */
export function buildProgramDayWorkouts(
  args: BuildProgramDayWorkoutsArgs,
): ProgramDayWorkout[] {
  const {
    prescription,
    exerciseCountOverrides,
    trainingDayOverrides,
    exerciseSelectionOverrides,
    slotDayOverrides,
  } = args;

  const assignment = assignExerciseSlotsToTrainingDays({
    prescription,
    exerciseCountOverrides,
    trainingDayOverrides,
    slotDayOverrides,
  });

  const slotsByDay = new Map<string, ProgramDaySlot[]>();
  for (const day of prescription.weeklySplit.days) slotsByDay.set(day.id, []);

  for (const muscleGroupId of PROGRAM_DESIGN_MUSCLE_GROUP_ORDER) {
    const muscle = prescription.muscles.find((m) => m.muscleGroupId === muscleGroupId);
    if (muscle == null || muscle.weeklySets <= 0) continue;

    const plan = buildMuscleGroupExercisePlan({
      prescription,
      muscleGroupId,
      exerciseCountOverride: exerciseCountOverrides?.[muscleGroupId],
      trainingDayOverride: trainingDayOverrides?.[muscleGroupId],
      selections: exerciseSelectionOverrides,
      dayAssignment: assignment,
    });

    for (const slot of plan.slots) {
      if (slot.dayId == null) continue;
      const bucket = slotsByDay.get(slot.dayId);
      if (bucket == null) continue;
      bucket.push({ ...slot, muscleLabel: plan.label });
    }
  }

  return prescription.weeklySplit.days.map((day, index) => {
    const slots = slotsByDay.get(day.id) ?? [];
    const totalSets = slots.reduce((sum, slot) => sum + slot.sets, 0);
    return {
      dayId: day.id,
      dayIndex: index + 1,
      name: day.name,
      totalSets,
      exerciseCount: slots.length,
      slots,
    };
  });
}

/** Find a single day workout by id (or null). Convenience for the day workout route. */
export function findProgramDayWorkout(
  args: BuildProgramDayWorkoutsArgs,
  dayId: string,
): ProgramDayWorkout | null {
  return buildProgramDayWorkouts(args).find((day) => day.dayId === dayId) ?? null;
}

/** Move targets for a slot currently on `currentDayId`, in split order (current flagged). */
export function buildProgramDayMoveTargets(
  prescription: ProgrammingPrescription,
  currentDayId: string | null,
): ProgramDayMoveTarget[] {
  return prescription.weeklySplit.days.map((day, index) => ({
    dayId: day.id,
    dayIndex: index + 1,
    name: day.name,
    isCurrent: day.id === currentDayId,
  }));
}
