/**
 * Sleep stage detail averages — 7 / 30 / 90-day windows for Deep / REM minutes.
 *
 * Pure helpers. Reuses completed/attributed night inclusion, then selects stage minutes.
 *
 * Windows are inclusive of the selected day and the prior N−1 local calendar days.
 * Missing nights and missing stage values are omitted (never zero).
 * Prior-night fallback is excluded by the shared completed/attributed collector.
 *
 * Percent averages use the arithmetic mean of valid per-night stage percentages
 * (totalSleepMinutes denominator). Nights without a valid denominator are excluded
 * from the percent average; the percent average is published only when the filtered
 * set still meets the window's minimum night count.
 *
 * Minimum sufficiency (authoritative mean):
 * - 7d: ≥3 valid nights
 * - 30d: ≥10 valid nights
 * - 90d: ≥30 valid nights
 *
 * History fetch is one bounded 90-day range shared with Duration detail.
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
import {
  stageMinutesFromNight,
  type SleepStageMetricId,
} from "@/lib/data/sleep/sleepStageMetric";
import { resolveSleepStagePercent } from "@/lib/data/sleep/sleepStagePercent";
import { formatSleepDurationMinutes } from "@/lib/format/ouraScore";
import type { DayKey } from "@/lib/ui/calendar/types";

/** Inclusive day count for the shared sleep metric detail history request. */
export const SLEEP_STAGE_DETAIL_HISTORY_DAY_COUNT = SLEEP_DURATION_DETAIL_HISTORY_DAY_COUNT;

export const SLEEP_STAGE_AVERAGE_7D_EXPECTED = SLEEP_DURATION_AVERAGE_7D_EXPECTED;
export const SLEEP_STAGE_AVERAGE_30D_EXPECTED = SLEEP_DURATION_AVERAGE_30D_EXPECTED;
export const SLEEP_STAGE_AVERAGE_90D_EXPECTED = SLEEP_DURATION_AVERAGE_90D_EXPECTED;

export const SLEEP_STAGE_AVERAGE_7D_MIN_VALID = SLEEP_DURATION_AVERAGE_7D_MIN_VALID;
export const SLEEP_STAGE_AVERAGE_30D_MIN_VALID = SLEEP_DURATION_AVERAGE_30D_MIN_VALID;
export const SLEEP_STAGE_AVERAGE_90D_MIN_VALID = SLEEP_DURATION_AVERAGE_90D_MIN_VALID;

export type SleepStageAverageWindow = "7d" | "30d" | "90d";

export type SleepStageNightSample = {
  calendarDay: DayKey;
  stageMinutes: number;
  /** Unrounded percent when denominator valid; otherwise null. */
  stagePercent: number | null;
  sourceDocumentId: string;
};

export type SleepStageAverageSummary = {
  window: SleepStageAverageWindow;
  averageMinutes: number | null;
  formattedAverage: string | null;
  /** Arithmetic mean of valid per-night percentages; null when insufficient. */
  averagePercent: number | null;
  /** Integer display percent when averagePercent is published. */
  formattedAveragePercent: string | null;
  validNightCount: number;
  validPercentNightCount: number;
  expectedNightCount: 7 | 30 | 90;
  minimumRequiredNightCount: number;
  hasEnoughData: boolean;
  hasEnoughPercentData: boolean;
  /** Internal coverage string — not shown in consumer Pattern UI. */
  coverageLabel: string;
  displayValue: string;
  displayPercentValue: string | null;
  accessibilitySummary: string;
};

export function sleepStageDetailHistoryDayKeys(selectedDay: DayKey): DayKey[] {
  return activityTrailingNDaysInclusive(selectedDay, SLEEP_STAGE_DETAIL_HISTORY_DAY_COUNT);
}

export function sleepStageAverageWindowDayKeys(
  selectedDay: DayKey,
  window: SleepStageAverageWindow,
): DayKey[] {
  const count =
    window === "7d"
      ? SLEEP_STAGE_AVERAGE_7D_EXPECTED
      : window === "30d"
        ? SLEEP_STAGE_AVERAGE_30D_EXPECTED
        : SLEEP_STAGE_AVERAGE_90D_EXPECTED;
  return activityTrailingNDaysInclusive(selectedDay, count);
}

function minValidForWindow(window: SleepStageAverageWindow): number {
  if (window === "7d") return SLEEP_STAGE_AVERAGE_7D_MIN_VALID;
  if (window === "30d") return SLEEP_STAGE_AVERAGE_30D_MIN_VALID;
  return SLEEP_STAGE_AVERAGE_90D_MIN_VALID;
}

function expectedForWindow(window: SleepStageAverageWindow): 7 | 30 | 90 {
  if (window === "7d") return SLEEP_STAGE_AVERAGE_7D_EXPECTED;
  if (window === "30d") return SLEEP_STAGE_AVERAGE_30D_EXPECTED;
  return SLEEP_STAGE_AVERAGE_90D_EXPECTED;
}

function windowTitle(window: SleepStageAverageWindow): string {
  if (window === "7d") return "7 days";
  if (window === "30d") return "30 days";
  return "90 days";
}

/**
 * Collect completed attributed nights that have a valid stage-minutes sample.
 * Episodes deduped by sourceDocumentId. Future days skipped.
 */
export function collectCompletedAttributedStageNights(input: {
  calendarDays: readonly DayKey[];
  todayDayKey: DayKey;
  sleepNightByDay: Readonly<Partial<Record<DayKey, WeeklyFitnessSleepNightCell>>>;
  metricId: SleepStageMetricId;
}): SleepStageNightSample[] {
  const samples: SleepStageNightSample[] = [];
  const seenEpisodeIds = new Set<string>();

  for (const calendarDay of input.calendarDays) {
    if (calendarDay > input.todayDayKey) continue;
    const cell = input.sleepNightByDay[calendarDay];
    if (!isCompletedAttributedSleepNightForWeeklyFitness(calendarDay, cell)) continue;
    const view = cell!.view!;
    const night: SleepNightDocumentDto = view.sleepNight;
    const stageMinutes = stageMinutesFromNight(night, input.metricId);
    if (stageMinutes == null) continue;
    const episodeId = night.sourceDocumentId;
    if (seenEpisodeIds.has(episodeId)) continue;
    seenEpisodeIds.add(episodeId);
    const percent = resolveSleepStagePercent({ night, metricId: input.metricId });
    samples.push({
      calendarDay,
      stageMinutes,
      stagePercent: percent?.value ?? null,
      sourceDocumentId: episodeId,
    });
  }

  return samples;
}

/**
 * Arithmetic mean of valid per-night stage percentages.
 * Invalid / missing percents are excluded (not treated as 0).
 */
export function averagePercentFromStageSamples(
  samples: readonly SleepStageNightSample[],
): number | null {
  const values = samples
    .map((s) => s.stagePercent)
    .filter((p): p is number => typeof p === "number" && Number.isFinite(p));
  if (values.length === 0) return null;
  return values.reduce((acc, p) => acc + p, 0) / values.length;
}

export function averageMinutesFromStageSamples(
  samples: readonly SleepStageNightSample[],
): number | null {
  if (samples.length === 0) return null;
  const total = samples.reduce((acc, s) => acc + s.stageMinutes, 0);
  return Math.round(total / samples.length);
}

export function buildSleepStageAverageSummary(input: {
  window: SleepStageAverageWindow;
  selectedDay: DayKey;
  todayDayKey: DayKey;
  sleepNightByDay: Readonly<Partial<Record<DayKey, WeeklyFitnessSleepNightCell>>>;
  metricId: SleepStageMetricId;
}): SleepStageAverageSummary {
  const { window, selectedDay, todayDayKey, sleepNightByDay, metricId } = input;
  const expectedNightCount = expectedForWindow(window);
  const minimumRequiredNightCount = minValidForWindow(window);
  const calendarDays = sleepStageAverageWindowDayKeys(selectedDay, window);
  const samples = collectCompletedAttributedStageNights({
    calendarDays,
    todayDayKey,
    sleepNightByDay,
    metricId,
  });
  const validNightCount = samples.length;
  const hasEnoughData = validNightCount >= minimumRequiredNightCount;
  const meanMinutes = averageMinutesFromStageSamples(samples);
  const averageMinutes = hasEnoughData && meanMinutes != null ? meanMinutes : null;
  const formattedAverage =
    averageMinutes != null ? formatSleepDurationMinutes(averageMinutes) : null;

  const percentSamples = samples.filter(
    (s) => typeof s.stagePercent === "number" && Number.isFinite(s.stagePercent),
  );
  const validPercentNightCount = percentSamples.length;
  const hasEnoughPercentData = validPercentNightCount >= minimumRequiredNightCount;
  const meanPercent = averagePercentFromStageSamples(percentSamples);
  const averagePercent =
    hasEnoughPercentData && meanPercent != null ? meanPercent : null;
  const formattedAveragePercent =
    averagePercent != null ? `${Math.round(averagePercent)}% of total sleep` : null;

  const coverageLabel = `${validNightCount} of ${expectedNightCount} nights`;
  const displayValue =
    hasEnoughData && formattedAverage != null ? formattedAverage : "Not enough data";
  const displayPercentValue =
    hasEnoughPercentData && formattedAveragePercent != null ? formattedAveragePercent : null;

  const accessibilitySummary =
    hasEnoughData && formattedAverage != null
      ? displayPercentValue != null
        ? `${windowTitle(window)} average ${formattedAverage}. ${displayPercentValue}.`
        : `${windowTitle(window)} average ${formattedAverage}.`
      : `${windowTitle(window)} average not enough data.`;

  return {
    window,
    averageMinutes,
    formattedAverage,
    averagePercent,
    formattedAveragePercent,
    validNightCount,
    validPercentNightCount,
    expectedNightCount,
    minimumRequiredNightCount,
    hasEnoughData,
    hasEnoughPercentData,
    coverageLabel,
    displayValue,
    displayPercentValue,
    accessibilitySummary,
  };
}

export function buildSleepStageAverageSummaries(input: {
  selectedDay: DayKey;
  todayDayKey: DayKey;
  sleepNightByDay: Readonly<Partial<Record<DayKey, WeeklyFitnessSleepNightCell>>>;
  metricId: SleepStageMetricId;
}): {
  sevenDay: SleepStageAverageSummary;
  thirtyDay: SleepStageAverageSummary;
  ninetyDay: SleepStageAverageSummary;
} {
  return {
    sevenDay: buildSleepStageAverageSummary({ ...input, window: "7d" }),
    thirtyDay: buildSleepStageAverageSummary({ ...input, window: "30d" }),
    ninetyDay: buildSleepStageAverageSummary({ ...input, window: "90d" }),
  };
}
