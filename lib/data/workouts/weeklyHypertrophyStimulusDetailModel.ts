/**
 * Weekly Muscle Stimulus drill-down — journal adapter.
 * Pure — no React, no Firebase, no I/O.
 */

import type { DayKey } from "@/lib/ui/calendar/types";
import { addCalendarDaysToDayKey } from "@/lib/ui/calendar/dateUtils";
import { mapManualWorkoutSummariesToWeekSessions } from "@/lib/data/workouts/weeklyHypertrophyStimulusCardModel";
import {
  buildHypertrophyStimulusWeekDetail,
  type HypertrophyStimulusWeekDetail,
} from "@/lib/workouts/exercises/intelligence/buildHypertrophyStimulusWeekDetail";
import type { ManualWorkoutDaySummary } from "@/lib/workouts/journal/manualWorkoutSummary";

export type BuildWeeklyHypertrophyStimulusDetailFromJournalInput = {
  summaries: readonly ManualWorkoutDaySummary[];
  weekStartDay: DayKey;
  customExerciseNameById?: ReadonlyMap<string, string>;
};

/**
 * Build weekly Muscle Stimulus drill-down from local journal summaries.
 */
export function buildWeeklyHypertrophyStimulusDetailFromJournal(
  input: BuildWeeklyHypertrophyStimulusDetailFromJournalInput,
): HypertrophyStimulusWeekDetail {
  const weekEndDay = addCalendarDaysToDayKey(input.weekStartDay, 6);
  const sessions = mapManualWorkoutSummariesToWeekSessions(
    input.summaries,
    input.weekStartDay,
    weekEndDay,
  );

  return buildHypertrophyStimulusWeekDetail({
    weekStart: input.weekStartDay,
    sessions,
    ...(input.customExerciseNameById != null
      ? { customExerciseNameById: input.customExerciseNameById }
      : {}),
  });
}
