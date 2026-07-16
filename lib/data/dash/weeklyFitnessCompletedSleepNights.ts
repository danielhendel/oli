import type { SleepNightViewDto } from "@oli/contracts";

import { sleepNightIsAttributedToCalendarDay } from "@/lib/data/dash/dailySleepCardViewModel";
import type { DayKey } from "@/lib/ui/calendar/types";

/** Per-calendar-day sleep-night fetch cell (Dash Daily Sleep truth boundary). */
export type WeeklyFitnessSleepNightCell = {
  settled: boolean;
  view?: SleepNightViewDto | undefined;
};

export type CompletedSleepNightForWeek = {
  calendarDay: DayKey;
  wakeDay: DayKey;
  minutes: number;
  resolution: SleepNightViewDto["resolution"];
  sourceDocumentId: string;
};

/** Duration minutes for Weekly Fitness (matches Daily Sleep headline denominator). */
export function sleepNightMinutesForWeeklyFitness(view: SleepNightViewDto): number | null {
  const night = view.sleepNight;
  const m = night.mainSleepMinutes ?? night.totalSleepMinutes;
  if (typeof m === "number" && Number.isFinite(m) && m > 0) return Math.round(m);
  return null;
}

/** Sun→Sat week bounds for wake-day inclusion (last wake day capped at today). */
export function weeklyFitnessWeekWakeWindow(
  weekDayKeys: readonly DayKey[],
  todayDayKey: DayKey,
): { weekStartDay: DayKey; weekEndDay: DayKey; lastCountableWakeDay: DayKey } {
  const weekStartDay = weekDayKeys[0] ?? todayDayKey;
  const weekEndDay = weekDayKeys[weekDayKeys.length - 1] ?? todayDayKey;
  const lastCountableWakeDay = weekEndDay <= todayDayKey ? weekEndDay : todayDayKey;
  return { weekStartDay, weekEndDay, lastCountableWakeDay };
}

/**
 * True when this calendar day contributes one **completed** attributed sleep night to the week average.
 * Mirrors Dash Daily Sleep: settled + attributed + complete episode (not prior-night fallback).
 */
export function isCompletedAttributedSleepNightForWeeklyFitness(
  calendarDay: DayKey,
  cell: WeeklyFitnessSleepNightCell | undefined,
): boolean {
  if (cell == null || !cell.settled || cell.view == null) return false;
  if (!sleepNightIsAttributedToCalendarDay(calendarDay, cell.view)) return false;
  if (cell.view.sleepNight.isComplete !== true) return false;
  return sleepNightMinutesForWeeklyFitness(cell.view) != null;
}

/** Elapsed week days Sun→Sat through today (excludes future calendar days). */
export function weeklyFitnessElapsedWeekDays(
  weekDayKeys: readonly DayKey[],
  todayDayKey: DayKey,
): DayKey[] {
  return weekDayKeys.filter((day) => day <= todayDayKey);
}

export type CollectCompletedSleepNightsResult = {
  completedNights: CompletedSleepNightForWeek[];
  totalMinutes: number;
  /** Dev diagnostics: nights considered then excluded (see logWeeklyFitnessSleepAverageDev). */
  skipped: WeeklyFitnessSleepSkippedNight[];
};

export type WeeklyFitnessSleepSkippedNight = {
  calendarDay: DayKey;
  reason: string;
  wakeDay?: DayKey;
  minutes?: number;
  resolution?: string;
};

/**
 * Completed sleep nights in the current week: sum(minutes) / count(unique episodes).
 * Episodes deduped by sourceDocumentId; wake day must fall in [weekStart, min(weekEnd, today)].
 */
export function collectCompletedSleepNightsForWeek(input: {
  weekDayKeys: readonly DayKey[];
  todayDayKey: DayKey;
  sleepNightByDay: Readonly<Partial<Record<DayKey, WeeklyFitnessSleepNightCell>>>;
}): CollectCompletedSleepNightsResult {
  const { weekStartDay, lastCountableWakeDay } = weeklyFitnessWeekWakeWindow(
    input.weekDayKeys,
    input.todayDayKey,
  );
  const completedNights: CompletedSleepNightForWeek[] = [];
  const skipped: WeeklyFitnessSleepSkippedNight[] = [];
  const seenEpisodeIds = new Set<string>();

  for (const calendarDay of weeklyFitnessElapsedWeekDays(input.weekDayKeys, input.todayDayKey)) {
    const cell = input.sleepNightByDay[calendarDay];
    if (cell == null || !cell.settled) {
      skipped.push({ calendarDay, reason: "unsettled" });
      continue;
    }
    if (cell.view == null) {
      skipped.push({ calendarDay, reason: "missing" });
      continue;
    }
    if (!sleepNightIsAttributedToCalendarDay(calendarDay, cell.view)) {
      skipped.push({
        calendarDay,
        reason: "not_attributed",
        resolution: cell.view.resolution,
        wakeDay: cell.view.sleepNight.wakeDay,
      });
      continue;
    }
    if (cell.view.sleepNight.isComplete !== true) {
      skipped.push({
        calendarDay,
        reason: "incomplete",
        wakeDay: cell.view.sleepNight.wakeDay,
        resolution: cell.view.resolution,
      });
      continue;
    }
    const minutes = sleepNightMinutesForWeeklyFitness(cell.view);
    if (minutes == null) {
      skipped.push({ calendarDay, reason: "no_duration", wakeDay: cell.view.sleepNight.wakeDay });
      continue;
    }
    const wakeDay = cell.view.sleepNight.wakeDay;
    if (wakeDay < weekStartDay || wakeDay > lastCountableWakeDay) {
      skipped.push({
        calendarDay,
        reason: "wake_day_outside_week_window",
        wakeDay,
        minutes,
        resolution: cell.view.resolution,
      });
      continue;
    }
    const episodeId = cell.view.sleepNight.sourceDocumentId;
    if (seenEpisodeIds.has(episodeId)) {
      skipped.push({
        calendarDay,
        reason: "duplicate_episode",
        wakeDay,
        minutes,
        resolution: cell.view.resolution,
      });
      continue;
    }
    seenEpisodeIds.add(episodeId);
    completedNights.push({
      calendarDay,
      wakeDay,
      minutes,
      resolution: cell.view.resolution,
      sourceDocumentId: episodeId,
    });
  }

  const totalMinutes = completedNights.reduce((acc, n) => acc + n.minutes, 0);
  return { completedNights, totalMinutes, skipped };
}

export function averageMinutesFromCompletedSleepNights(
  completedNights: readonly CompletedSleepNightForWeek[],
): number {
  if (completedNights.length === 0) return 0;
  const total = completedNights.reduce((acc, n) => acc + n.minutes, 0);
  return Math.round(total / completedNights.length);
}

/**
 * Dev-only: privacy-safe Weekly Fitness sleep average audit.
 * Never logs minutes, scores, calendar day keys, or per-night health samples.
 */
export function logWeeklyFitnessSleepAverageDev(input: {
  todayDayKey: DayKey;
  weekStartDay: DayKey;
  weekEndDay: DayKey;
  lastCountableWakeDay: DayKey;
  completedNights: readonly CompletedSleepNightForWeek[];
  skipped: readonly WeeklyFitnessSleepSkippedNight[];
  averageMinutes: number;
}): void {
  if (!__DEV__) return;
  // eslint-disable-next-line no-console -- dev-only Weekly Fitness sleep audit
  console.log("[WEEKLY_FITNESS_SLEEP]", {
    operation: "weekly_fitness_sleep_average",
    denominatorNights: input.completedNights.length,
    skippedCount: input.skipped.length,
    hasAverageMinutes: Number.isFinite(input.averageMinutes),
  });
}
