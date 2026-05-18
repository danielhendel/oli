import type { DayKey } from "@/lib/ui/calendar/types";

import {
  isCompletedAttributedSleepNightForWeeklyFitness,
  sleepNightMinutesForWeeklyFitness,
  type CompletedSleepNightForWeek,
  type WeeklyFitnessSleepNightCell,
} from "@/lib/data/dash/weeklyFitnessCompletedSleepNights";

/**
 * Completed, attributed sleep nights for a calendar-day span (no wake-week window).
 * Episodes deduped by `sourceDocumentId`. Future calendar days are skipped.
 */
export function collectCompletedAttributedSleepNights(input: {
  calendarDays: readonly DayKey[];
  todayDayKey: DayKey;
  sleepNightByDay: Readonly<Partial<Record<DayKey, WeeklyFitnessSleepNightCell>>>;
}): CompletedSleepNightForWeek[] {
  const completed: CompletedSleepNightForWeek[] = [];
  const seenEpisodeIds = new Set<string>();

  for (const calendarDay of input.calendarDays) {
    if (calendarDay > input.todayDayKey) continue;
    const cell = input.sleepNightByDay[calendarDay];
    if (!isCompletedAttributedSleepNightForWeeklyFitness(calendarDay, cell)) continue;
    const view = cell!.view!;
    const minutes = sleepNightMinutesForWeeklyFitness(view)!;
    const episodeId = view.sleepNight.sourceDocumentId;
    if (seenEpisodeIds.has(episodeId)) continue;
    seenEpisodeIds.add(episodeId);
    completed.push({
      calendarDay,
      wakeDay: view.sleepNight.wakeDay,
      minutes,
      resolution: view.resolution,
      sourceDocumentId: episodeId,
    });
  }

  return completed;
}

export function averageMinutesFromCompletedNights(
  nights: readonly CompletedSleepNightForWeek[],
): number | null {
  if (nights.length === 0) return null;
  const total = nights.reduce((acc, n) => acc + n.minutes, 0);
  return Math.round(total / nights.length);
}

export function completedSleepMinutesForCalendarDay(
  calendarDay: DayKey,
  cell: WeeklyFitnessSleepNightCell | undefined,
): number | null {
  if (!isCompletedAttributedSleepNightForWeeklyFitness(calendarDay, cell)) return null;
  return sleepNightMinutesForWeeklyFitness(cell!.view!);
}
