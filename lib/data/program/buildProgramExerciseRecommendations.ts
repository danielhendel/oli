// lib/data/program/buildProgramExerciseRecommendations.ts
/**
 * Orchestrator for the Program Builder exercise STRUCTURE engine (pure, deterministic).
 *
 * Given a generated `ProgrammingPrescription` plus the user's per-muscle overrides, produces the
 * exercise plan for a muscle group: editable settings (weekly set target, frequency, exercise
 * count, training-day assignment) and the resulting exercise SLOTS. Slots are EMPTY by default —
 * the engine guides structure, never a specific exercise. A slot becomes "manual" once the user
 * selects an exercise (a stable library id) on the selection page.
 *
 * Integrity: selected slots reference a stable `exerciseId` from the existing library; names are
 * resolved via the library's display-name layer (archived-safe). The engine math is unchanged.
 * No IO, no React, no Firebase/API. Same inputs ⇒ identical output.
 */
import { spreadTrainingDays } from "@/lib/data/program/assignExerciseSlotsToTrainingDays";
import {
  distributeMuscleGroupSetsToExercises,
  recommendedExerciseCount,
} from "@/lib/data/program/distributeMuscleGroupSetsToExercises";
import type { SlotDayAssignment } from "@/lib/data/program/programDayWorkoutTypes";
import { getLibraryCandidatesForMuscleGroup } from "@/lib/data/program/programMuscleGroupExerciseTaxonomy";
import {
  MIN_DESIRED_SWAP_OPTIONS,
  type ProgramExerciseSelectionMap,
  type ProgramExerciseSlot,
  type ProgramMuscleGroupExercisePlan,
} from "@/lib/data/program/programExerciseRecommendationTypes";
import type { ProgrammingPrescription } from "@/lib/data/program/programmingEngineTypes";
import type { ProgramDesignMuscleGroup } from "@/lib/data/program/workoutProgramDesignTypes";
import type { CustomExerciseRecord } from "@/lib/workouts/exercises/customExerciseStore";
import { getBundledExerciseNameById } from "@/lib/workouts/exercises/taxonomyResolve";

/**
 * Training-day ids a muscle is assigned to, spread across the week (non-consecutive when possible)
 * so frequency is distributed instead of clustered on the first days.
 */
function muscleTrainingDayIds(
  prescription: ProgrammingPrescription,
  frequencyPerWeek: number,
): string[] {
  if (frequencyPerWeek <= 0) return [];
  const dayCount = prescription.weeklySplit.days.length;
  return spreadTrainingDays(dayCount, frequencyPerWeek).map(
    (position) => prescription.weeklySplit.days[position - 1]!.id,
  );
}

function dayNameById(prescription: ProgrammingPrescription, dayId: string | null): string | null {
  if (dayId == null) return null;
  return prescription.weeklySplit.days.find((day) => day.id === dayId)?.name ?? null;
}

function buildCustomNameResolver(
  customExercises: readonly CustomExerciseRecord[],
): (exerciseId: string) => string {
  const byId = new Map<string, string>();
  for (const record of customExercises) byId.set(record.exerciseId, record.name);
  return (exerciseId: string): string => {
    const bundled = getBundledExerciseNameById(exerciseId);
    if (bundled != null) return bundled;
    const custom = byId.get(exerciseId);
    if (custom != null) return custom;
    return exerciseId;
  };
}

export type BuildMuscleGroupExercisePlanArgs = {
  prescription: ProgrammingPrescription;
  muscleGroupId: ProgramDesignMuscleGroup;
  /** Manual per-muscle exercise-count override (number of slots). */
  exerciseCountOverride?: number | undefined;
  /** Manual per-muscle training-day assignment override (stable day ids). */
  trainingDayOverride?: string[] | undefined;
  /** Manual per-slot exercise selections (survive regeneration). */
  selections?: ProgramExerciseSelectionMap | undefined;
  /** Optional injected custom exercises (loaded by the screen from the existing custom store). */
  customExercises?: readonly CustomExerciseRecord[] | undefined;
  /**
   * Optional program-level slot→day assignment (from {@link assignExerciseSlotsToTrainingDays}).
   * When provided, a slot's day comes from this balanced assignment (and may be a manual move);
   * otherwise the slot falls back to the muscle's spread training days.
   */
  dayAssignment?: SlotDayAssignment | undefined;
};

/** Build the exercise plan (settings + empty/selected slots) for a single muscle group. */
export function buildMuscleGroupExercisePlan(
  args: BuildMuscleGroupExercisePlanArgs,
): ProgramMuscleGroupExercisePlan {
  const {
    prescription,
    muscleGroupId,
    exerciseCountOverride,
    trainingDayOverride,
    selections,
    customExercises = [],
    dayAssignment,
  } = args;
  const muscle = prescription.muscles.find((m) => m.muscleGroupId === muscleGroupId);

  const label = muscle?.label ?? muscleGroupId;
  const weeklySetTarget = muscle?.weeklySets ?? 0;
  const frequencyPerWeek = muscle?.frequencyPerWeek ?? 0;
  const repRange = muscle?.repRange ?? "";
  const rirTarget = muscle?.rirTarget ?? "";
  const rpeTarget = muscle?.rpeTarget ?? "";
  const progressionModel = muscle?.progressionModel ?? prescription.progressionModel;

  const defaultCount = recommendedExerciseCount(weeklySetTarget, frequencyPerWeek);
  const exerciseCount =
    weeklySetTarget <= 0
      ? 0
      : typeof exerciseCountOverride === "number"
        ? Math.max(0, Math.round(exerciseCountOverride))
        : defaultCount;

  const setsPerSlot = distributeMuscleGroupSetsToExercises(weeklySetTarget, exerciseCount);
  // Fallback per-muscle day assignment (spread across the week) used when no program-level balanced
  // assignment is supplied. When `dayAssignment` is provided, slot days come from it instead.
  const fallbackTrainingDayIds =
    trainingDayOverride != null && trainingDayOverride.length > 0
      ? trainingDayOverride
      : muscleTrainingDayIds(prescription, frequencyPerWeek);
  const resolveName = buildCustomNameResolver(customExercises);
  const muscleSelections = selections?.[muscleGroupId] ?? {};

  const slots: ProgramExerciseSlot[] = setsPerSlot.map((sets, index) => {
    const position = index + 1;
    const slotId = `${muscleGroupId}-slot-${position}`;
    const assigned = dayAssignment?.[slotId];
    const fallbackDayId =
      fallbackTrainingDayIds.length > 0
        ? fallbackTrainingDayIds[index % fallbackTrainingDayIds.length]!
        : null;
    const dayId = assigned != null ? assigned.dayId : fallbackDayId;
    const dayAssignmentSource = assigned != null ? assigned.source : "engine";
    const selected = muscleSelections[slotId];
    const hasSelection = typeof selected === "string" && selected.length > 0;
    return {
      slotId,
      muscleGroupId,
      position,
      dayId,
      dayName: dayNameById(prescription, dayId),
      sets,
      repRange,
      rirTarget,
      rpeTarget,
      progressionModel,
      selectedExerciseId: hasSelection ? selected : null,
      selectedExerciseName: hasSelection ? resolveName(selected) : null,
      source: hasSelection ? "manual" : "empty",
      dayAssignmentSource,
    };
  });

  const candidateCount = getLibraryCandidatesForMuscleGroup(muscleGroupId).length;

  // Training days the muscle actually trains on, derived from the slots' resolved day ids (in split
  // order). This reflects the real (balanced or manually-moved) assignment, so the muscle page and
  // the day workouts stay consistent.
  const dayOrder = new Map(prescription.weeklySplit.days.map((day, index) => [day.id, index]));
  const trainingDayIds = Array.from(
    new Set(slots.map((slot) => slot.dayId).filter((id): id is string => id != null)),
  ).sort((a, b) => (dayOrder.get(a) ?? 0) - (dayOrder.get(b) ?? 0));

  return {
    muscleGroupId,
    label,
    settings: {
      weeklySetTarget,
      frequencyPerWeek,
      exerciseCount,
      trainingDayIds,
    },
    repRange,
    rirTarget,
    rpeTarget,
    progressionModel,
    slots,
    trainingDayNames: trainingDayIds
      .map((id) => dayNameById(prescription, id))
      .filter((name): name is string => name != null),
    libraryExpansionNeeded: candidateCount < MIN_DESIRED_SWAP_OPTIONS,
  };
}

/** A muscle group's selected exercises, for the Muscle Group Volume card display. */
export type ProgramMuscleSelectedExercise = {
  slotId: string;
  exerciseId: string;
  name: string;
  sets: number;
};

/**
 * Selected exercises for a muscle group, in slot order (only slots the user has filled). Used by
 * the Muscle Group Volume card to list chosen exercises + allocated sets under the muscle row.
 */
export function getSelectedExercisesForMuscleGroup(
  args: BuildMuscleGroupExercisePlanArgs,
): ProgramMuscleSelectedExercise[] {
  const plan = buildMuscleGroupExercisePlan(args);
  return plan.slots
    .filter((slot) => slot.selectedExerciseId != null)
    .map((slot) => ({
      slotId: slot.slotId,
      exerciseId: slot.selectedExerciseId as string,
      name: slot.selectedExerciseName ?? (slot.selectedExerciseId as string),
      sets: slot.sets,
    }));
}
