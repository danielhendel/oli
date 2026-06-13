// lib/data/program/assignExerciseSlotsToTrainingDays.ts
/**
 * Deterministic assignment of exercise slots to weekly-split training days. Pure — no IO, no React.
 *
 * The exercise engine guides STRUCTURE (how many slots a muscle group gets and how its weekly sets
 * are split). This module decides WHICH day each slot lands on, balancing the week:
 *  - respects the program's training-day count and each muscle group's frequency,
 *  - spreads a muscle group's exposures across the week (penalizes back-to-back days),
 *  - puts each of a muscle group's slots on a distinct day when possible (no volume dumping),
 *  - keeps day totals balanced (greedy lowest-load-first day selection), and
 *  - lets manual moves win and persist (source "manual"); regeneration keeps them.
 *
 * Same inputs ⇒ identical output (stable tiebreaks by day order + slot order).
 */
import {
  distributeMuscleGroupSetsToExercises,
  recommendedExerciseCount,
} from "@/lib/data/program/distributeMuscleGroupSetsToExercises";
import type {
  SlotDayAssignment,
  SlotDayAssignmentEntry,
} from "@/lib/data/program/programDayWorkoutTypes";
import type { ProgrammingPrescription } from "@/lib/data/program/programmingEngineTypes";
import type {
  ProgramDesignMuscleGroup,
  SlotDayOverrideMap,
} from "@/lib/data/program/workoutProgramDesignTypes";

/** Load penalty applied when a candidate day is adjacent to a day this muscle already uses. */
const ADJACENCY_PENALTY = 4;

/**
 * Evenly-spaced 1-based day positions for a muscle trained `frequency` times across `dayCount` days.
 * Spreads exposures across the week to avoid back-to-back training, e.g. (4 days, 2×) → [1, 3];
 * (6 days, 3×) → [1, 3, 5]. Clamped so positions stay within the split and never duplicate.
 */
export function spreadTrainingDays(dayCount: number, frequency: number): number[] {
  if (dayCount <= 0 || frequency <= 0) return [];
  const count = Math.min(frequency, dayCount);
  const positions: number[] = [];
  const seen = new Set<number>();
  for (let i = 0; i < count; i += 1) {
    let position = 1 + Math.floor((i * dayCount) / count);
    while (seen.has(position) && position < dayCount) position += 1;
    while (seen.has(position) && position > 1) position -= 1;
    seen.add(position);
    positions.push(position);
  }
  return positions.sort((a, b) => a - b);
}

export type AssignExerciseSlotsArgs = {
  prescription: ProgrammingPrescription;
  /** Per-muscle exercise-count overrides (number of slots). */
  exerciseCountOverrides?: Partial<Record<ProgramDesignMuscleGroup, number>> | undefined;
  /** Per-muscle training-day assignment overrides (stable day ids). */
  trainingDayOverrides?: Partial<Record<ProgramDesignMuscleGroup, string[]>> | undefined;
  /** Manual per-slot day moves (muscle → slot id → stable day id). Win over the engine assignment. */
  slotDayOverrides?: SlotDayOverrideMap | undefined;
};

/** 1-based index of a day id in the split (or -1). */
function dayIndex(dayIds: string[], dayId: string): number {
  return dayIds.indexOf(dayId);
}

/**
 * Choose `count` training days for one muscle group, balancing program load (least-loaded first)
 * while penalizing days adjacent to ones already chosen (spread / avoid back-to-back). Deterministic:
 * ties break by split-day order. Returns chosen day ids in split order.
 */
function pickBalancedSpreadDays(
  dayIds: string[],
  dayLoad: Map<string, number>,
  count: number,
): string[] {
  const chosen: string[] = [];
  const target = Math.min(count, dayIds.length);
  for (let picked = 0; picked < target; picked += 1) {
    let best: string | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const dayId of dayIds) {
      if (chosen.includes(dayId)) continue;
      const index = dayIndex(dayIds, dayId);
      const adjacent = chosen.some((c) => Math.abs(dayIndex(dayIds, c) - index) === 1);
      const score = (dayLoad.get(dayId) ?? 0) + (adjacent ? ADJACENCY_PENALTY : 0);
      if (score < bestScore) {
        best = dayId;
        bestScore = score;
      }
    }
    if (best == null) break;
    chosen.push(best);
  }
  return chosen.sort((a, b) => dayIndex(dayIds, a) - dayIndex(dayIds, b));
}

/**
 * Assign every exercise slot across all trained muscle groups to a training day. Returns a map of
 * slot id → { dayId, source }. Manual moves win; the rest are balanced + spread.
 */
export function assignExerciseSlotsToTrainingDays(
  args: AssignExerciseSlotsArgs,
): SlotDayAssignment {
  const { prescription, exerciseCountOverrides, trainingDayOverrides, slotDayOverrides } = args;
  const dayIds = prescription.weeklySplit.days.map((d) => d.id);
  const validDayIds = new Set(dayIds);

  const assignment: SlotDayAssignment = {};
  // Running total of working sets per day, for load balancing across the whole program.
  const dayLoad = new Map<string, number>();
  for (const dayId of dayIds) dayLoad.set(dayId, 0);
  const addLoad = (dayId: string, sets: number): void => {
    dayLoad.set(dayId, (dayLoad.get(dayId) ?? 0) + sets);
  };

  for (const muscle of prescription.muscles) {
    if (muscle.weeklySets <= 0) continue;
    const muscleId = muscle.muscleGroupId;

    const countOverride = exerciseCountOverrides?.[muscleId];
    const exerciseCount =
      typeof countOverride === "number"
        ? Math.max(0, Math.round(countOverride))
        : recommendedExerciseCount(muscle.weeklySets, muscle.frequencyPerWeek);
    if (exerciseCount <= 0) continue;

    const setsPerSlot = distributeMuscleGroupSetsToExercises(muscle.weeklySets, exerciseCount);

    // Days this muscle may train on: a manual per-muscle override, else a balanced+spread choice of
    // `frequency` days (capped at the slot count — no point reserving more days than slots).
    const override = trainingDayOverrides?.[muscleId];
    const overrideDays = override?.filter((id) => validDayIds.has(id)) ?? [];
    const daysToUse = Math.min(
      Math.max(muscle.frequencyPerWeek, 1),
      exerciseCount,
      dayIds.length,
    );
    const candidateDays =
      overrideDays.length > 0
        ? overrideDays
        : pickBalancedSpreadDays(dayIds, dayLoad, daysToUse);

    const muscleMoves = slotDayOverrides?.[muscleId] ?? {};

    setsPerSlot.forEach((sets, index) => {
      const slotId = `${muscleId}-slot-${index + 1}`;

      const manualDayId = muscleMoves[slotId];
      if (typeof manualDayId === "string" && validDayIds.has(manualDayId)) {
        const entry: SlotDayAssignmentEntry = { dayId: manualDayId, source: "manual" };
        assignment[slotId] = entry;
        addLoad(manualDayId, sets);
        return;
      }

      if (candidateDays.length === 0) return;

      // Place the slot on the least-loaded of the muscle's chosen days (ties by day order). This
      // spreads a muscle's slots across distinct days and keeps day totals balanced.
      let chosen = candidateDays[0]!;
      let chosenLoad = dayLoad.get(chosen) ?? 0;
      for (const dayId of candidateDays) {
        const load = dayLoad.get(dayId) ?? 0;
        if (load < chosenLoad) {
          chosen = dayId;
          chosenLoad = load;
        }
      }

      assignment[slotId] = { dayId: chosen, source: "engine" };
      addLoad(chosen, sets);
    });
  }

  return assignment;
}
