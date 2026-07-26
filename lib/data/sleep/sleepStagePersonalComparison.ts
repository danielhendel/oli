/**
 * Personal numerical comparison for Deep / REM detail (Phase 2E-B).
 *
 * Exact minute difference only — no Near/Below/Above category thresholds.
 * Pure domain — no React.
 */

import { formatSleepDurationMinutes } from "@/lib/format/ouraScore";

export type SleepStagePersonalComparison = {
  heading: "Personal context";
  currentFormatted: string;
  baselineFormatted: string;
  baselineLabel: "90-day average";
  /** Signed: current − baseline. Negative means below recent average. */
  differenceMinutes: number;
  differenceSentence: string;
  accessibilitySummary: string;
};

/**
 * Build a soft personal comparison when both current and 90-day average exist.
 * Returns null when either value is missing (no invented zeros).
 */
export function buildSleepStagePersonalComparison(input: {
  currentMinutes: number;
  ninetyDayAverageMinutes: number;
}): SleepStagePersonalComparison {
  const currentFormatted = formatSleepDurationMinutes(input.currentMinutes);
  const baselineFormatted = formatSleepDurationMinutes(input.ninetyDayAverageMinutes);
  const differenceMinutes = Math.round(input.currentMinutes - input.ninetyDayAverageMinutes);
  const absDiff = Math.abs(differenceMinutes);
  const absFormatted = formatSleepDurationMinutes(absDiff);

  let differenceSentence: string;
  if (differenceMinutes === 0) {
    differenceSentence = "Same as your recent average";
  } else if (differenceMinutes < 0) {
    differenceSentence = `${absFormatted} below your recent average`;
  } else {
    differenceSentence = `${absFormatted} above your recent average`;
  }

  return {
    heading: "Personal context",
    currentFormatted,
    baselineFormatted,
    baselineLabel: "90-day average",
    differenceMinutes,
    differenceSentence,
    accessibilitySummary: `Current ${currentFormatted}. Your 90-day average is ${baselineFormatted}. This result is ${differenceSentence.toLowerCase()}.`,
  };
}
