import { classifyWorkoutHistoryItemEvidence } from "@/lib/data/workouts/workoutEligibility";
import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import type { WorkoutMarkerFlags } from "@/lib/data/workouts/workoutMarkerFlags";
import type { DayKey } from "@/lib/ui/calendar/types";

/** Product surface: Strength training vs cardio conditioning (Apple Health + app data). */
export type WorkoutProductDomain = "strength" | "cardio";

export function resolveHistoryItemProductDomain(
  item: WorkoutHistoryItem,
): "strength" | "cardio" | undefined {
  return classifyWorkoutHistoryItemEvidence(item);
}

export function filterWorkoutHistoryItemsForDomain(
  items: WorkoutHistoryItem[],
  domain: WorkoutProductDomain,
): WorkoutHistoryItem[] {
  return items.filter((w) => resolveHistoryItemProductDomain(w) === domain);
}

export type WorkoutCalendarDayLike = {
  day: DayKey;
  workouts: WorkoutHistoryItem[];
};

export function mapWorkoutCalendarDaysForDomain<T extends WorkoutCalendarDayLike>(
  days: readonly T[],
  domain: WorkoutProductDomain,
): T[] {
  return days.map((d) => ({
    ...d,
    workouts: filterWorkoutHistoryItemsForDomain(d.workouts, domain),
  }));
}

/**
 * Calendar / weekly strip: show a day as “active” only if the given domain has sessions.
 * Mixed days appear on both Strength and Cardio calendars with the correct ring color only.
 */
export function narrowWorkoutMarkerFlagsForDomain(
  flags: WorkoutMarkerFlags,
  domain: WorkoutProductDomain,
): WorkoutMarkerFlags | null {
  if (domain === "strength") {
    if (!flags.hasStrength) return null;
    return { hasStrength: true, hasCardio: false };
  }
  if (!flags.hasCardio) return null;
  return { hasStrength: false, hasCardio: true };
}
