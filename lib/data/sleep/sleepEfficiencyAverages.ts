/**
 * Sleep Efficiency detail averages — 7 / 30 / 90-day windows.
 *
 * Pure helpers. Reuses completed/attributed night inclusion, then selects
 * vendor-provided efficiency (normalized 0–100). Does not recompute from
 * time asleep ÷ time in bed.
 *
 * Windows are inclusive of the selected day and the prior N−1 local calendar days.
 * Missing nights and invalid efficiency are omitted (never zero).
 * Prior-night fallback is excluded by the shared completed/attributed collector.
 *
 * Minimum sufficiency:
 * - 7d: ≥3 valid nights
 * - 30d: ≥10 valid nights
 * - 90d: ≥30 valid nights
 *
 * History fetch is one bounded 90-day range shared with Duration / Deep / REM.
 */

import type { SleepNightDocumentDto } from "@oli/contracts";

import { activityTrailingNDaysInclusive } from "@/lib/data/activity/activityOverviewRanges";
import type { WeeklyFitnessSleepNightCell } from "@/lib/data/dash/weeklyFitnessCompletedSleepNights";
import {
  isCompletedAttributedSleepNightForWeeklyFitness,
} from "@/lib/data/dash/weeklyFitnessCompletedSleepNights";
import {
  SLEEP_DURATION_AVERAGE_30D_EXPECTED,
  SLEEP_DURATION_AVERAGE_30D_MIN_VALID,
  SLEEP_DURATION_AVERAGE_7D_EXPECTED,
  SLEEP_DURATION_AVERAGE_7D_MIN_VALID,
  SLEEP_DURATION_AVERAGE_90D_EXPECTED,
  SLEEP_DURATION_AVERAGE_90D_MIN_VALID,
  SLEEP_DURATION_DETAIL_HISTORY_DAY_COUNT,
} from "@/lib/data/sleep/sleepDurationAverages";
import { resolveSleepEfficiencyPercent } from "@/lib/data/sleep/sleepEfficiencyValue";
import type { DayKey } from "@/lib/ui/calendar/types";

/** Inclusive day count for the shared sleep metric detail history request. */
export const SLEEP_EFFICIENCY_DETAIL_HISTORY_DAY_COUNT =
  SLEEP_DURATION_DETAIL_HISTORY_DAY_COUNT;

export const SLEEP_EFFICIENCY_AVERAGE_7D_EXPECTED = SLEEP_DURATION_AVERAGE_7D_EXPECTED;
export const SLEEP_EFFICIENCY_AVERAGE_30D_EXPECTED = SLEEP_DURATION_AVERAGE_30D_EXPECTED;
export const SLEEP_EFFICIENCY_AVERAGE_90D_EXPECTED = SLEEP_DURATION_AVERAGE_90D_EXPECTED;

export const SLEEP_EFFICIENCY_AVERAGE_7D_MIN_VALID = SLEEP_DURATION_AVERAGE_7D_MIN_VALID;
export const SLEEP_EFFICIENCY_AVERAGE_30D_MIN_VALID = SLEEP_DURATION_AVERAGE_30D_MIN_VALID;
export const SLEEP_EFFICIENCY_AVERAGE_90D_MIN_VALID = SLEEP_DURATION_AVERAGE_90D_MIN_VALID;

export type SleepEfficiencyAverageWindow = "7d" | "30d" | "90d";

export type SleepEfficiencyNightSample = {
  calendarDay: DayKey;
  /** Unrounded normalized 0–100 percentage. */
  efficiencyPercent: number;
  sourceDocumentId: string;
};

export type SleepEfficiencyAverageSummary = {
  window: SleepEfficiencyAverageWindow;
  /** Unrounded arithmetic mean when sufficient; otherwise null. */
  averagePercent: number | null;
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

export function sleepEfficiencyDetailHistoryDayKeys(selectedDay: DayKey): DayKey[] {
  return activityTrailingNDaysInclusive(selectedDay, SLEEP_EFFICIENCY_DETAIL_HISTORY_DAY_COUNT);
}

export function sleepEfficiencyAverageWindowDayKeys(
  selectedDay: DayKey,
  window: SleepEfficiencyAverageWindow,
): DayKey[] {
  const count =
    window === "7d"
      ? SLEEP_EFFICIENCY_AVERAGE_7D_EXPECTED
      : window === "30d"
        ? SLEEP_EFFICIENCY_AVERAGE_30D_EXPECTED
        : SLEEP_EFFICIENCY_AVERAGE_90D_EXPECTED;
  return activityTrailingNDaysInclusive(selectedDay, count);
}

function minValidForWindow(window: SleepEfficiencyAverageWindow): number {
  if (window === "7d") return SLEEP_EFFICIENCY_AVERAGE_7D_MIN_VALID;
  if (window === "30d") return SLEEP_EFFICIENCY_AVERAGE_30D_MIN_VALID;
  return SLEEP_EFFICIENCY_AVERAGE_90D_MIN_VALID;
}

function expectedForWindow(window: SleepEfficiencyAverageWindow): 7 | 30 | 90 {
  if (window === "7d") return SLEEP_EFFICIENCY_AVERAGE_7D_EXPECTED;
  if (window === "30d") return SLEEP_EFFICIENCY_AVERAGE_30D_EXPECTED;
  return SLEEP_EFFICIENCY_AVERAGE_90D_EXPECTED;
}

function windowTitle(window: SleepEfficiencyAverageWindow): string {
  if (window === "7d") return "7 days";
  if (window === "30d") return "30 days";
  return "90 days";
}

/**
 * Collect completed attributed nights that have a valid vendor efficiency sample.
 * Episodes deduped by sourceDocumentId. Future days skipped.
 */
export function collectCompletedAttributedEfficiencyNights(input: {
  calendarDays: readonly DayKey[];
  todayDayKey: DayKey;
  sleepNightByDay: Readonly<Partial<Record<DayKey, WeeklyFitnessSleepNightCell>>>;
}): SleepEfficiencyNightSample[] {
  const samples: SleepEfficiencyNightSample[] = [];
  const seenEpisodeIds = new Set<string>();

  for (const calendarDay of input.calendarDays) {
    if (calendarDay > input.todayDayKey) continue;
    const cell = input.sleepNightByDay[calendarDay];
    if (!isCompletedAttributedSleepNightForWeeklyFitness(calendarDay, cell)) continue;
    const view = cell!.view!;
    const night: SleepNightDocumentDto = view.sleepNight;
    const resolved = resolveSleepEfficiencyPercent(night.efficiency);
    if (resolved == null) continue;
    const episodeId = night.sourceDocumentId;
    if (seenEpisodeIds.has(episodeId)) continue;
    seenEpisodeIds.add(episodeId);
    samples.push({
      calendarDay,
      efficiencyPercent: resolved.normalizedPercent,
      sourceDocumentId: episodeId,
    });
  }

  return samples;
}

/**
 * Arithmetic mean of valid nightly efficiency percentages.
 * Invalid / missing values are excluded (not treated as 0).
 */
export function averagePercentFromEfficiencySamples(
  samples: readonly SleepEfficiencyNightSample[],
): number | null {
  if (samples.length === 0) return null;
  const total = samples.reduce((acc, s) => acc + s.efficiencyPercent, 0);
  return total / samples.length;
}

export function buildSleepEfficiencyAverageSummary(input: {
  window: SleepEfficiencyAverageWindow;
  selectedDay: DayKey;
  todayDayKey: DayKey;
  sleepNightByDay: Readonly<Partial<Record<DayKey, WeeklyFitnessSleepNightCell>>>;
}): SleepEfficiencyAverageSummary {
  const { window, selectedDay, todayDayKey, sleepNightByDay } = input;
  const expectedNightCount = expectedForWindow(window);
  const minimumRequiredNightCount = minValidForWindow(window);
  const calendarDays = sleepEfficiencyAverageWindowDayKeys(selectedDay, window);
  const samples = collectCompletedAttributedEfficiencyNights({
    calendarDays,
    todayDayKey,
    sleepNightByDay,
  });
  const validNightCount = samples.length;
  const hasEnoughData = validNightCount >= minimumRequiredNightCount;
  const meanPercent = averagePercentFromEfficiencySamples(samples);
  const averagePercent = hasEnoughData && meanPercent != null ? meanPercent : null;
  const formattedAverage =
    averagePercent != null ? `${Math.round(averagePercent)}%` : null;

  const coverageLabel = `${validNightCount} of ${expectedNightCount} nights`;
  const displayValue =
    hasEnoughData && formattedAverage != null ? formattedAverage : "Not enough data";

  const accessibilitySummary =
    hasEnoughData && formattedAverage != null
      ? `${windowTitle(window)} average ${formattedAverage}.`
      : `${windowTitle(window)} average not enough data.`;

  return {
    window,
    averagePercent,
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

export function buildSleepEfficiencyAverageSummaries(input: {
  selectedDay: DayKey;
  todayDayKey: DayKey;
  sleepNightByDay: Readonly<Partial<Record<DayKey, WeeklyFitnessSleepNightCell>>>;
}): {
  sevenDay: SleepEfficiencyAverageSummary;
  thirtyDay: SleepEfficiencyAverageSummary;
  ninetyDay: SleepEfficiencyAverageSummary;
} {
  return {
    sevenDay: buildSleepEfficiencyAverageSummary({ ...input, window: "7d" }),
    thirtyDay: buildSleepEfficiencyAverageSummary({ ...input, window: "30d" }),
    ninetyDay: buildSleepEfficiencyAverageSummary({ ...input, window: "90d" }),
  };
}
