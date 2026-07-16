/**
 * Nutrition V1 for Weekly Fitness — logging coverage only (not adherence).
 */
import type { WeeklyFitnessDailyFactsByDay } from "@/lib/data/dash/useWeeklyFitnessDailyFactsRollup";
import type { DayKey } from "@/lib/ui/calendar/types";

export type WeeklyNutritionCoverageResult = {
  loggedDayCount: number;
  elapsedEligibleDayCount: number;
  resolvedDayCount: number;
  /** logged / elapsed; null when no elapsed days or read incomplete/error without trusted zeros. */
  progress01: number | null;
  state: "ready" | "partial" | "missing" | "error";
  displayValue: string;
  accessibilityLabel: string;
};

/**
 * Coverage = loggedDayCount / elapsedEligibleDayCount.
 * - Ready day with nutritionLogged true → logged
 * - Ready day with nutritionLogged false → trusted unlogged (counts toward elapsed, not logged)
 * - Missing day → elapsed eligible but not logged (honest zero contribution to logged count)
 * - Error day without any ready/missing settled → overall error if all errored
 *
 * Future days must be omitted from `elapsedDayKeys` by the caller.
 */
export function computeWeeklyNutritionLoggingCoverage(input: {
  factsByDay: WeeklyFitnessDailyFactsByDay;
  elapsedDayKeys: readonly DayKey[];
  rollupStatus: "partial" | "ready" | "error";
}): WeeklyNutritionCoverageResult {
  const elapsedEligibleDayCount = input.elapsedDayKeys.length;

  if (elapsedEligibleDayCount === 0) {
    return {
      loggedDayCount: 0,
      elapsedEligibleDayCount: 0,
      resolvedDayCount: 0,
      progress01: null,
      state: "missing",
      displayValue: "\u2014",
      accessibilityLabel:
        "Nutrition, not available, logging coverage, button. Opens Nutrition analytics.",
    };
  }

  if (input.rollupStatus === "partial") {
    return {
      loggedDayCount: 0,
      elapsedEligibleDayCount,
      resolvedDayCount: 0,
      progress01: null,
      state: "partial",
      displayValue: "\u2014",
      accessibilityLabel:
        "Nutrition, loading, logging coverage, button. Opens Nutrition analytics.",
    };
  }

  let loggedDayCount = 0;
  let resolvedDayCount = 0;
  let errorCount = 0;
  let missingOrReady = 0;

  for (const day of input.elapsedDayKeys) {
    const cell = input.factsByDay[day];
    if (!cell?.settled) continue;
    if (cell.status === "error") {
      errorCount += 1;
      continue;
    }
    if (cell.status === "ready" || cell.status === "missing") {
      missingOrReady += 1;
      resolvedDayCount += 1;
      if (cell.status === "ready" && cell.nutritionLogged === true) {
        loggedDayCount += 1;
      }
    }
  }

  if (input.rollupStatus === "error" && missingOrReady === 0) {
    return {
      loggedDayCount: 0,
      elapsedEligibleDayCount,
      resolvedDayCount: 0,
      progress01: null,
      state: "error",
      displayValue: "\u2014",
      accessibilityLabel:
        "Nutrition, unavailable, logging coverage, button. Opens Nutrition analytics.",
    };
  }

  const progress01 = loggedDayCount / elapsedEligibleDayCount;
  const displayValue = `${loggedDayCount} of ${elapsedEligibleDayCount} logged`;
  const state =
    resolvedDayCount < elapsedEligibleDayCount || errorCount > 0 ? "partial" : "ready";

  return {
    loggedDayCount,
    elapsedEligibleDayCount,
    resolvedDayCount,
    progress01,
    state,
    displayValue,
    accessibilityLabel: `Nutrition, ${loggedDayCount} of ${elapsedEligibleDayCount} elapsed days logged, logging coverage, button. Opens Nutrition analytics.`,
  };
}
