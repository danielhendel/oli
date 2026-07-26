/**
 * Deep / REM stage percentage of total sleep.
 *
 * Contract:
 * - denominator is totalSleepMinutes only (never mainSleepMinutes / time in bed)
 * - prefer stored percent when finite and consistent with minutes ÷ totalSleepMinutes
 * - otherwise derive when inputs support it
 * - missing / zero / negative / non-finite denominator → omit (not 0%)
 * - missing stage minutes → omit
 * - display as integer; compare with unrounded derived values
 */

import type { SleepNightDocumentDto } from "@oli/contracts";

import {
  stageMinutesFromNight,
  totalSleepMinutesDenominator,
  type SleepStageMetricId,
} from "@/lib/data/sleep/sleepStageMetric";

/** Max absolute gap between stored and unrounded derived % to treat stored as consistent. */
export const SLEEP_STAGE_PERCENT_CONSISTENCY_EPSILON = 0.51 as const;

export type SleepStagePercentResult = {
  /** Unrounded numeric percent for classification/comparison. */
  value: number;
  /** Integer display percent. */
  displayPercent: number;
  source: "stored" | "derived";
};

function storedPercentFromNight(
  night: SleepNightDocumentDto,
  metricId: SleepStageMetricId,
): number | null {
  const raw = metricId === "deep_sleep" ? night.deepPercent : night.remPercent;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  return raw;
}

/**
 * Unrounded stageMinutes / totalSleepMinutes × 100, or null when inputs fail closed.
 */
export function deriveSleepStagePercentUnrounded(input: {
  stageMinutes: number;
  totalSleepMinutes: number;
}): number | null {
  const { stageMinutes, totalSleepMinutes } = input;
  if (!Number.isFinite(stageMinutes) || stageMinutes < 0) return null;
  if (!Number.isFinite(totalSleepMinutes) || totalSleepMinutes <= 0) return null;
  return (stageMinutes / totalSleepMinutes) * 100;
}

export function formatSleepStagePercentOfTotal(displayPercent: number): string {
  return `${Math.round(displayPercent)}% of total sleep`;
}

/**
 * Resolve stage % for one night. Returns null when percentage must be omitted.
 */
export function resolveSleepStagePercent(input: {
  night: SleepNightDocumentDto | null | undefined;
  metricId: SleepStageMetricId;
}): SleepStagePercentResult | null {
  const { night, metricId } = input;
  if (night == null) return null;

  const stageMinutes = stageMinutesFromNight(night, metricId);
  if (stageMinutes == null) return null;

  const totalSleepMinutes = totalSleepMinutesDenominator(night);
  if (totalSleepMinutes == null) return null;

  const derived = deriveSleepStagePercentUnrounded({ stageMinutes, totalSleepMinutes });
  if (derived == null) return null;

  const stored = storedPercentFromNight(night, metricId);
  if (
    stored != null &&
    Math.abs(stored - derived) <= SLEEP_STAGE_PERCENT_CONSISTENCY_EPSILON
  ) {
    return {
      value: stored,
      displayPercent: Math.round(stored),
      source: "stored",
    };
  }

  return {
    value: derived,
    displayPercent: Math.round(derived),
    source: "derived",
  };
}
