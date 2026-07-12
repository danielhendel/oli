/**
 * Weekly Readiness V1 — mean of exact current-week Oura readiness scores.
 * Fallbacks / mismatched days are excluded by the range API (exact days only).
 */
import type { OuraReadinessRangeDayDto } from "@oli/contracts/ouraVendor";
import type { DayKey } from "@/lib/ui/calendar/types";

export type WeeklyReadinessResult = {
  weeklyAverage: number | null;
  resolvedDayCount: number;
  eligibleElapsedDayCount: number;
  progress01: number | null;
  displayValue: string;
  accessibilityLabel: string;
  state: "ready" | "no_data" | "loading" | "error" | "connect_oura" | "reconnect_oura";
};

export type OuraConnectionDisplayState =
  | "connected"
  | "disconnected"
  | "reconnect_required"
  | "unknown";

/**
 * Average exact-day scores within the elapsed window. Null scores are skipped.
 */
export function computeWeeklyReadinessAverage(input: {
  days: readonly OuraReadinessRangeDayDto[];
  elapsedDayKeys: readonly DayKey[];
  rangeStatus: "partial" | "ready" | "error";
  ouraConnection: OuraConnectionDisplayState;
}): WeeklyReadinessResult {
  const eligibleElapsedDayCount = input.elapsedDayKeys.length;
  const elapsedSet = new Set(input.elapsedDayKeys);

  if (input.ouraConnection === "disconnected") {
    return {
      weeklyAverage: null,
      resolvedDayCount: 0,
      eligibleElapsedDayCount,
      progress01: null,
      displayValue: "Connect Oura",
      accessibilityLabel:
        "Readiness, connect Oura, button. Opens Oura connection settings.",
      state: "connect_oura",
    };
  }

  if (input.ouraConnection === "reconnect_required") {
    return {
      weeklyAverage: null,
      resolvedDayCount: 0,
      eligibleElapsedDayCount,
      progress01: null,
      displayValue: "Reconnect Oura",
      accessibilityLabel:
        "Readiness, reconnect Oura, button. Opens Oura connection settings.",
      state: "reconnect_oura",
    };
  }

  if (input.rangeStatus === "partial") {
    return {
      weeklyAverage: null,
      resolvedDayCount: 0,
      eligibleElapsedDayCount,
      progress01: null,
      displayValue: "\u2014",
      accessibilityLabel: "Readiness, loading, button. Opens Readiness analytics.",
      state: "loading",
    };
  }

  if (input.rangeStatus === "error") {
    return {
      weeklyAverage: null,
      resolvedDayCount: 0,
      eligibleElapsedDayCount,
      progress01: null,
      displayValue: "Unavailable",
      accessibilityLabel: "Readiness, unavailable, button. Opens Readiness analytics.",
      state: "error",
    };
  }

  const scores: number[] = [];
  for (const d of input.days) {
    if (!elapsedSet.has(d.day as DayKey)) continue;
    if (typeof d.score !== "number" || !Number.isFinite(d.score)) continue;
    if (d.score < 0 || d.score > 100) continue;
    scores.push(d.score);
  }

  if (scores.length === 0) {
    return {
      weeklyAverage: null,
      resolvedDayCount: 0,
      eligibleElapsedDayCount,
      progress01: null,
      displayValue: "No data",
      accessibilityLabel: "Readiness, no data for this week from Oura, button. Opens Readiness analytics.",
      state: "no_data",
    };
  }

  const sum = scores.reduce((a, b) => a + b, 0);
  const weeklyAverage = Math.round(sum / scores.length);
  const progress01 = weeklyAverage / 100;

  return {
    weeklyAverage,
    resolvedDayCount: scores.length,
    eligibleElapsedDayCount,
    progress01,
    displayValue: `${weeklyAverage} avg`,
    accessibilityLabel: `Readiness, ${weeklyAverage} average this week, button. Opens Readiness analytics.`,
    state: "ready",
  };
}
