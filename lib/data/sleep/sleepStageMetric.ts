/**
 * Sleep stage metric ids and field selectors for Deep / REM detail (Phase 2E-B).
 * Pure domain — no React, I/O, or Firebase.
 */

import type { SleepNightDocumentDto } from "@oli/contracts";

export type SleepStageMetricId = "deep_sleep" | "rem_sleep";

export type SleepStageMinutesField = "deepMinutes" | "remMinutes";
export type SleepStagePercentField = "deepPercent" | "remPercent";

export type SleepStageDefinition = {
  metricId: SleepStageMetricId;
  title: "Deep Sleep" | "REM Sleep";
  minutesField: SleepStageMinutesField;
  percentField: SleepStagePercentField;
};

export const DEEP_SLEEP_STAGE_DEFINITION = {
  metricId: "deep_sleep",
  title: "Deep Sleep",
  minutesField: "deepMinutes",
  percentField: "deepPercent",
} as const satisfies SleepStageDefinition;

export const REM_SLEEP_STAGE_DEFINITION = {
  metricId: "rem_sleep",
  title: "REM Sleep",
  minutesField: "remMinutes",
  percentField: "remPercent",
} as const satisfies SleepStageDefinition;

export function sleepStageDefinitionFor(
  metricId: SleepStageMetricId,
): SleepStageDefinition {
  return metricId === "deep_sleep" ? DEEP_SLEEP_STAGE_DEFINITION : REM_SLEEP_STAGE_DEFINITION;
}

/**
 * Stage minutes from a SleepNight. Missing / non-finite / negative → null.
 * Zero is a valid measured value (not missing).
 */
export function stageMinutesFromNight(
  night: SleepNightDocumentDto | null | undefined,
  metricId: SleepStageMetricId,
): number | null {
  if (night == null) return null;
  const raw =
    metricId === "deep_sleep" ? night.deepMinutes : night.remMinutes;
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) return null;
  return Math.round(raw);
}

/**
 * totalSleepMinutes denominator for stage %. Never uses mainSleepMinutes.
 */
export function totalSleepMinutesDenominator(
  night: SleepNightDocumentDto | null | undefined,
): number | null {
  if (night == null) return null;
  const total = night.totalSleepMinutes;
  if (typeof total !== "number" || !Number.isFinite(total) || total <= 0) return null;
  return total;
}
