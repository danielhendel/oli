// lib/data/program/moveProgramExerciseSlotToDay.ts
/**
 * Pure reducer for manual slot→day moves. No IO, no React, no Firebase/API.
 *
 * Moving an exercise slot to another training day records a manual override (muscle → slot id →
 * stable day id) that wins over the engine's balanced assignment and survives regeneration. Only the
 * day assignment changes — the slot keeps its stable `slotId` and any selected stable exercise id, so
 * historical logging data is never touched.
 */
import type {
  ProgramDesignMuscleGroup,
  SlotDayOverrideMap,
} from "@/lib/data/program/workoutProgramDesignTypes";

/** Return a new override map with `slotId` (under `muscle`) moved to `dayId`. Immutable. */
export function moveProgramExerciseSlotToDay(
  overrides: SlotDayOverrideMap,
  muscle: ProgramDesignMuscleGroup,
  slotId: string,
  dayId: string,
): SlotDayOverrideMap {
  const forMuscle = { ...(overrides[muscle] ?? {}) };
  forMuscle[slotId] = dayId;
  return { ...overrides, [muscle]: forMuscle };
}

/** Return a new override map with the manual move for `slotId` removed (revert to engine). Immutable. */
export function clearProgramExerciseSlotDay(
  overrides: SlotDayOverrideMap,
  muscle: ProgramDesignMuscleGroup,
  slotId: string,
): SlotDayOverrideMap {
  const forMuscle = overrides[muscle];
  if (forMuscle == null || !(slotId in forMuscle)) return overrides;
  const nextForMuscle = { ...forMuscle };
  delete nextForMuscle[slotId];
  const next = { ...overrides };
  if (Object.keys(nextForMuscle).length === 0) {
    delete next[muscle];
  } else {
    next[muscle] = nextForMuscle;
  }
  return next;
}
