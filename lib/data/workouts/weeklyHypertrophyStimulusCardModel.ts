/**
 * Weekly Muscle Stimulus card — journal adapter over hypertrophy week summary.
 * Pure — no React, no Firebase, no I/O.
 */

import type { DayKey } from "@/lib/ui/calendar/types";
import { buildWeeklyHypertrophyStimulusCardModel } from "@/lib/ui/workouts/buildWeeklyHypertrophyStimulusCardModel";
import type { WeeklyHypertrophyStimulusCardModel } from "@/lib/ui/workouts/buildWeeklyHypertrophyStimulusCardModel";
import {
  buildHypertrophyStimulusWeekSummary,
  type HypertrophyStimulusWeekSessionInput,
} from "@/lib/workouts/exercises/intelligence/buildHypertrophyStimulusWeekSummary";
import type { HypertrophyStimulusSessionSetInput } from "@/lib/workouts/exercises/intelligence/buildHypertrophyStimulusSessionSummary";
import type { ManualWorkoutDaySummary } from "@/lib/workouts/journal/manualWorkoutSummary";
import { enumerateDaysInclusive } from "@/lib/ui/calendar/dateUtils";

export type BuildWeeklyHypertrophyStimulusCardModelFromJournalInput = {
  summaries: readonly ManualWorkoutDaySummary[];
  weekStartDay: DayKey;
  weekEndDay: DayKey;
};

function mapManualWorkoutSummaryToWeekSession(
  summary: ManualWorkoutDaySummary,
): HypertrophyStimulusWeekSessionInput {
  const sets: HypertrophyStimulusSessionSetInput[] = [];

  for (const exercise of summary.exercises) {
    const exerciseId = exercise.exerciseId.trim();
    if (exerciseId.length === 0) continue;

    for (const set of exercise.sets) {
      if (set.isWarmup === true) continue;
      if (typeof set.reps !== "number" || !Number.isFinite(set.reps) || set.reps <= 0) continue;
      const row: HypertrophyStimulusSessionSetInput = {
        exerciseId,
        reps: set.reps,
      };
      if (set.weightKg !== undefined) row.loadKg = set.weightKg;
      if (set.intensity !== undefined) row.rpe = set.intensity;
      sets.push(row);
    }
  }

  return {
    sessionId: summary.sessionId,
    completedAt: summary.startedAt ?? summary.day,
    sets,
  };
}

function filterSummariesInWeek(
  summaries: readonly ManualWorkoutDaySummary[],
  weekStartDay: DayKey,
  weekEndDay: DayKey,
): ManualWorkoutDaySummary[] {
  const daysInWeek = new Set(enumerateDaysInclusive(weekStartDay, weekEndDay));
  return summaries.filter((summary) => daysInWeek.has(summary.day as DayKey));
}

/** Map journal summaries in a week window into hypertrophy week session inputs. */
export function mapManualWorkoutSummariesToWeekSessions(
  summaries: readonly ManualWorkoutDaySummary[],
  weekStartDay: DayKey,
  weekEndDay: DayKey,
): HypertrophyStimulusWeekSessionInput[] {
  return filterSummariesInWeek(summaries, weekStartDay, weekEndDay).map(
    mapManualWorkoutSummaryToWeekSession,
  );
}

/**
 * Build the weekly Muscle Stimulus card model from local journal summaries.
 * Returns null when the week has no usable stimulus (card hidden).
 */
export function buildWeeklyHypertrophyStimulusCardModelFromJournal(
  input: BuildWeeklyHypertrophyStimulusCardModelFromJournalInput,
): WeeklyHypertrophyStimulusCardModel | null {
  const weekSessions = mapManualWorkoutSummariesToWeekSessions(
    input.summaries,
    input.weekStartDay,
    input.weekEndDay,
  );

  const weekSummary = buildHypertrophyStimulusWeekSummary({
    weekStart: input.weekStartDay,
    sessions: weekSessions,
  });

  return buildWeeklyHypertrophyStimulusCardModel(weekSummary);
}
