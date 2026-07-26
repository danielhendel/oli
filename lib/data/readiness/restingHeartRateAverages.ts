/**
 * Resting Heart Rate detail averages — 7 / 30 / 90-day windows (Phase 2F-B).
 *
 * Pure helpers. Reuses completed/attributed SleepNight inclusion, then selects
 * overnight lowestHeartRateBpm (30–220). Never uses readiness contributor scores,
 * averageHeartRate, or DailyFacts RHR.
 *
 * Windows are inclusive of the selected day and the prior N−1 local calendar days.
 * Missing / invalid nights are omitted (never zero).
 * Prior-night fallback is excluded by the shared completed/attributed collector.
 *
 * Minimum sufficiency (mirrors Sleep Duration / Efficiency):
 * - 7d: ≥3 valid nights
 * - 30d: ≥10 valid nights
 * - 90d: ≥30 valid nights
 *
 * History fetch is one bounded 90-day SleepNight range shared with Sleep details.
 */

import type { SleepNightDocumentDto } from "@oli/contracts";

import { activityTrailingNDaysInclusive } from "@/lib/data/activity/activityOverviewRanges";
import type { WeeklyFitnessSleepNightCell } from "@/lib/data/dash/weeklyFitnessCompletedSleepNights";
import { isCompletedAttributedSleepNightForWeeklyFitness } from "@/lib/data/dash/weeklyFitnessCompletedSleepNights";
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
  formatRestingHeartRateBpm,
  resolveRestingHeartRateBpm,
} from "@/lib/data/readiness/restingHeartRateValue";
import type { DayKey } from "@/lib/ui/calendar/types";

/** Inclusive day count for the shared sleep metric detail history request. */
export const RESTING_HEART_RATE_DETAIL_HISTORY_DAY_COUNT =
  SLEEP_DURATION_DETAIL_HISTORY_DAY_COUNT;

export const RESTING_HEART_RATE_AVERAGE_7D_EXPECTED = SLEEP_DURATION_AVERAGE_7D_EXPECTED;
export const RESTING_HEART_RATE_AVERAGE_30D_EXPECTED = SLEEP_DURATION_AVERAGE_30D_EXPECTED;
export const RESTING_HEART_RATE_AVERAGE_90D_EXPECTED = SLEEP_DURATION_AVERAGE_90D_EXPECTED;

export const RESTING_HEART_RATE_AVERAGE_7D_MIN_VALID = SLEEP_DURATION_AVERAGE_7D_MIN_VALID;
export const RESTING_HEART_RATE_AVERAGE_30D_MIN_VALID = SLEEP_DURATION_AVERAGE_30D_MIN_VALID;
export const RESTING_HEART_RATE_AVERAGE_90D_MIN_VALID = SLEEP_DURATION_AVERAGE_90D_MIN_VALID;

export type RestingHeartRateAverageWindow = "7d" | "30d" | "90d";

export type RestingHeartRateNightSample = {
  calendarDay: DayKey;
  /** Unrounded validated bpm. */
  bpm: number;
  sourceDocumentId: string;
};

export type RestingHeartRateAverageSummary = {
  window: RestingHeartRateAverageWindow;
  /** Unrounded arithmetic mean when sufficient; otherwise null. */
  averageBpm: number | null;
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

export function restingHeartRateDetailHistoryDayKeys(selectedDay: DayKey): DayKey[] {
  return activityTrailingNDaysInclusive(selectedDay, RESTING_HEART_RATE_DETAIL_HISTORY_DAY_COUNT);
}

export function restingHeartRateAverageWindowDayKeys(
  selectedDay: DayKey,
  window: RestingHeartRateAverageWindow,
): DayKey[] {
  const count =
    window === "7d"
      ? RESTING_HEART_RATE_AVERAGE_7D_EXPECTED
      : window === "30d"
        ? RESTING_HEART_RATE_AVERAGE_30D_EXPECTED
        : RESTING_HEART_RATE_AVERAGE_90D_EXPECTED;
  return activityTrailingNDaysInclusive(selectedDay, count);
}

function minValidForWindow(window: RestingHeartRateAverageWindow): number {
  if (window === "7d") return RESTING_HEART_RATE_AVERAGE_7D_MIN_VALID;
  if (window === "30d") return RESTING_HEART_RATE_AVERAGE_30D_MIN_VALID;
  return RESTING_HEART_RATE_AVERAGE_90D_MIN_VALID;
}

function expectedForWindow(window: RestingHeartRateAverageWindow): 7 | 30 | 90 {
  if (window === "7d") return RESTING_HEART_RATE_AVERAGE_7D_EXPECTED;
  if (window === "30d") return RESTING_HEART_RATE_AVERAGE_30D_EXPECTED;
  return RESTING_HEART_RATE_AVERAGE_90D_EXPECTED;
}

function windowTitle(window: RestingHeartRateAverageWindow): string {
  if (window === "7d") return "7 days";
  if (window === "30d") return "30 days";
  return "90 days";
}

/**
 * Collect completed attributed nights that have a valid overnight lowest HR sample.
 * Episodes deduped by sourceDocumentId. Future days skipped.
 */
export function collectCompletedAttributedRestingHeartRateNights(input: {
  calendarDays: readonly DayKey[];
  todayDayKey: DayKey;
  sleepNightByDay: Readonly<Partial<Record<DayKey, WeeklyFitnessSleepNightCell>>>;
}): RestingHeartRateNightSample[] {
  const samples: RestingHeartRateNightSample[] = [];
  const seenEpisodeIds = new Set<string>();

  for (const calendarDay of input.calendarDays) {
    if (calendarDay > input.todayDayKey) continue;
    const cell = input.sleepNightByDay[calendarDay];
    if (!isCompletedAttributedSleepNightForWeeklyFitness(calendarDay, cell)) continue;
    const view = cell!.view!;
    const night: SleepNightDocumentDto = view.sleepNight;
    const resolved = resolveRestingHeartRateBpm(night.lowestHeartRateBpm);
    if (resolved == null) continue;
    const episodeId = night.sourceDocumentId;
    if (seenEpisodeIds.has(episodeId)) continue;
    seenEpisodeIds.add(episodeId);
    samples.push({
      calendarDay,
      bpm: resolved.bpm,
      sourceDocumentId: episodeId,
    });
  }

  return samples;
}

/**
 * Arithmetic mean of valid nightly bpm values.
 * Invalid / missing values are excluded (not treated as 0).
 */
export function averageBpmFromRestingHeartRateSamples(
  samples: readonly RestingHeartRateNightSample[],
): number | null {
  if (samples.length === 0) return null;
  const total = samples.reduce((acc, s) => acc + s.bpm, 0);
  return total / samples.length;
}

export function buildRestingHeartRateAverageSummary(input: {
  window: RestingHeartRateAverageWindow;
  selectedDay: DayKey;
  todayDayKey: DayKey;
  sleepNightByDay: Readonly<Partial<Record<DayKey, WeeklyFitnessSleepNightCell>>>;
}): RestingHeartRateAverageSummary {
  const { window, selectedDay, todayDayKey, sleepNightByDay } = input;
  const expectedNightCount = expectedForWindow(window);
  const minimumRequiredNightCount = minValidForWindow(window);
  const calendarDays = restingHeartRateAverageWindowDayKeys(selectedDay, window);
  const samples = collectCompletedAttributedRestingHeartRateNights({
    calendarDays,
    todayDayKey,
    sleepNightByDay,
  });
  const validNightCount = samples.length;
  const hasEnoughData = validNightCount >= minimumRequiredNightCount;
  const meanBpm = averageBpmFromRestingHeartRateSamples(samples);
  const averageBpm = hasEnoughData && meanBpm != null ? meanBpm : null;
  const formattedAverage =
    averageBpm != null ? formatRestingHeartRateBpm(Math.round(averageBpm)) : null;

  const coverageLabel = `${validNightCount} of ${expectedNightCount} nights`;
  const displayValue =
    hasEnoughData && formattedAverage != null ? formattedAverage : "Not enough data";

  const accessibilitySummary =
    hasEnoughData && averageBpm != null
      ? `${windowTitle(window)} average ${Math.round(averageBpm)} beats per minute.`
      : `${windowTitle(window)} average not enough data.`;

  return {
    window,
    averageBpm,
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

export function buildRestingHeartRateAverageSummaries(input: {
  selectedDay: DayKey;
  todayDayKey: DayKey;
  sleepNightByDay: Readonly<Partial<Record<DayKey, WeeklyFitnessSleepNightCell>>>;
}): {
  sevenDay: RestingHeartRateAverageSummary;
  thirtyDay: RestingHeartRateAverageSummary;
  ninetyDay: RestingHeartRateAverageSummary;
} {
  return {
    sevenDay: buildRestingHeartRateAverageSummary({ ...input, window: "7d" }),
    thirtyDay: buildRestingHeartRateAverageSummary({ ...input, window: "30d" }),
    ninetyDay: buildRestingHeartRateAverageSummary({ ...input, window: "90d" }),
  };
}

/**
 * Collect 90-day samples for the personal usual-range model (same window as 90d average).
 */
export function collectRestingHeartRatePersonalRangeSamples(input: {
  selectedDay: DayKey;
  todayDayKey: DayKey;
  sleepNightByDay: Readonly<Partial<Record<DayKey, WeeklyFitnessSleepNightCell>>>;
}): RestingHeartRateNightSample[] {
  const calendarDays = restingHeartRateDetailHistoryDayKeys(input.selectedDay);
  return collectCompletedAttributedRestingHeartRateNights({
    calendarDays,
    todayDayKey: input.todayDayKey,
    sleepNightByDay: input.sleepNightByDay,
  });
}
