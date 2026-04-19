import type { DailyFactsDto } from "@oli/contracts";

function isPositiveMinutes(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0;
}

/**
 * True when DailyFacts.sleep exists and at least one duration field is positive.
 *
 * Must NOT use `totalMinutes ?? mainSleepMinutes`: a stored `totalMinutes: 0` is a valid number
 * and would block picking a positive `mainSleepMinutes` (wrong Oura fallback).
 */
export function dailyFactsHasSleepSignal(sleep: DailyFactsDto["sleep"]): boolean {
  if (!sleep) return false;
  return isPositiveMinutes(sleep.mainSleepMinutes) || isPositiveMinutes(sleep.totalMinutes);
}
