/**
 * Sleep Duration detail averages — 7 / 30 / 90-day windows with coverage.
 *
 * Pure helpers. Reuses {@link collectCompletedAttributedSleepNights} and
 * {@link averageMinutesFromCompletedNights}; does not invent a second inclusion stack.
 *
 * Windows are inclusive of the selected day and the prior N−1 local calendar days.
 * Missing nights are omitted (never zero). Prior-night fallback is excluded by the
 * shared completed/attributed collector.
 *
 * Minimum sufficiency (authoritative mean):
 * - 7d: ≥3 valid nights
 * - 30d: ≥10 valid nights
 * - 90d: ≥30 valid nights
 *
 * History fetch is one bounded 90-day range; averages slice that map.
 * YTD is intentionally not implemented in Phase 2D pilot.
 */

import { activityTrailingNDaysInclusive } from "@/lib/data/activity/activityOverviewRanges";
import {
  averageMinutesFromCompletedNights,
  collectCompletedAttributedSleepNights,
} from "@/lib/data/sleep/sleepCompletedNights";
import type { WeeklyFitnessSleepNightCell } from "@/lib/data/dash/weeklyFitnessCompletedSleepNights";
import { formatSleepDurationMinutes } from "@/lib/format/ouraScore";
import type { DayKey } from "@/lib/ui/calendar/types";

/** Inclusive day count for the single Duration detail history request. */
export const SLEEP_DURATION_DETAIL_HISTORY_DAY_COUNT = 90 as const;

export const SLEEP_DURATION_AVERAGE_7D_EXPECTED = 7 as const;
export const SLEEP_DURATION_AVERAGE_30D_EXPECTED = 30 as const;
export const SLEEP_DURATION_AVERAGE_90D_EXPECTED = 90 as const;

export const SLEEP_DURATION_AVERAGE_7D_MIN_VALID = 3 as const;
export const SLEEP_DURATION_AVERAGE_30D_MIN_VALID = 10 as const;
export const SLEEP_DURATION_AVERAGE_90D_MIN_VALID = 30 as const;

export type SleepDurationAverageWindow = "7d" | "30d" | "90d";

export type SleepDurationAverageSummary = {
  window: SleepDurationAverageWindow;
  averageMinutes: number | null;
  formattedAverage: string | null;
  validNightCount: number;
  expectedNightCount: 7 | 30 | 90;
  minimumRequiredNightCount: number;
  hasEnoughData: boolean;
  /** Internal coverage string — not shown in consumer Pattern UI. */
  coverageLabel: string;
  displayValue: string;
  accessibilitySummary: string;
};

export function sleepDurationDetailHistoryDayKeys(selectedDay: DayKey): DayKey[] {
  return activityTrailingNDaysInclusive(selectedDay, SLEEP_DURATION_DETAIL_HISTORY_DAY_COUNT);
}

export function sleepDurationAverageWindowDayKeys(
  selectedDay: DayKey,
  window: SleepDurationAverageWindow,
): DayKey[] {
  const count =
    window === "7d"
      ? SLEEP_DURATION_AVERAGE_7D_EXPECTED
      : window === "30d"
        ? SLEEP_DURATION_AVERAGE_30D_EXPECTED
        : SLEEP_DURATION_AVERAGE_90D_EXPECTED;
  return activityTrailingNDaysInclusive(selectedDay, count);
}

function minValidForWindow(window: SleepDurationAverageWindow): number {
  if (window === "7d") return SLEEP_DURATION_AVERAGE_7D_MIN_VALID;
  if (window === "30d") return SLEEP_DURATION_AVERAGE_30D_MIN_VALID;
  return SLEEP_DURATION_AVERAGE_90D_MIN_VALID;
}

function expectedForWindow(window: SleepDurationAverageWindow): 7 | 30 | 90 {
  if (window === "7d") return SLEEP_DURATION_AVERAGE_7D_EXPECTED;
  if (window === "30d") return SLEEP_DURATION_AVERAGE_30D_EXPECTED;
  return SLEEP_DURATION_AVERAGE_90D_EXPECTED;
}

function windowTitle(window: SleepDurationAverageWindow): string {
  if (window === "7d") return "7 days";
  if (window === "30d") return "30 days";
  return "90 days";
}

/**
 * Build one average summary for the Duration detail pilot.
 *
 * @param todayDayKey Device “today” for future-day exclusion inside the collector.
 */
export function buildSleepDurationAverageSummary(input: {
  window: SleepDurationAverageWindow;
  selectedDay: DayKey;
  todayDayKey: DayKey;
  sleepNightByDay: Readonly<Partial<Record<DayKey, WeeklyFitnessSleepNightCell>>>;
}): SleepDurationAverageSummary {
  const { window, selectedDay, todayDayKey, sleepNightByDay } = input;
  const expectedNightCount = expectedForWindow(window);
  const minimumRequiredNightCount = minValidForWindow(window);
  const calendarDays = sleepDurationAverageWindowDayKeys(selectedDay, window);
  const nights = collectCompletedAttributedSleepNights({
    calendarDays,
    todayDayKey,
    sleepNightByDay,
  });
  const validNightCount = nights.length;
  const hasEnoughData = validNightCount >= minimumRequiredNightCount;
  const mean = averageMinutesFromCompletedNights(nights);
  const averageMinutes = hasEnoughData && mean != null ? mean : null;
  const formattedAverage =
    averageMinutes != null ? formatSleepDurationMinutes(averageMinutes) : null;
  const coverageLabel = `${validNightCount} of ${expectedNightCount} nights`;
  const displayValue = hasEnoughData && formattedAverage != null ? formattedAverage : "Not enough data";
  // Concise a11y without coverage ratios (coverage remains on the typed model).
  const accessibilitySummary =
    hasEnoughData && formattedAverage != null
      ? `${windowTitle(window)} average ${formattedAverage}.`
      : `${windowTitle(window)} average not enough data.`;

  return {
    window,
    averageMinutes,
    formattedAverage,
    validNightCount,
    expectedNightCount,
    minimumRequiredNightCount,
    hasEnoughData,
    coverageLabel,
    displayValue,
    accessibilitySummary,
  };
}

export function buildSleepDurationAverageSummaries(input: {
  selectedDay: DayKey;
  todayDayKey: DayKey;
  sleepNightByDay: Readonly<Partial<Record<DayKey, WeeklyFitnessSleepNightCell>>>;
}): {
  sevenDay: SleepDurationAverageSummary;
  thirtyDay: SleepDurationAverageSummary;
  ninetyDay: SleepDurationAverageSummary;
} {
  return {
    sevenDay: buildSleepDurationAverageSummary({ ...input, window: "7d" }),
    thirtyDay: buildSleepDurationAverageSummary({ ...input, window: "30d" }),
    ninetyDay: buildSleepDurationAverageSummary({ ...input, window: "90d" }),
  };
}
