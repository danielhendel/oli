/**
 * Pure Activity card model + presence for Daily Monitor (current-day Steps).
 * Valid measured zero is present; missing activity.steps is absent.
 */

import type { DailyFactsDto } from "@/lib/contracts/dailyFacts";
import type { DailyMonitorPresenceStatus } from "@/lib/data/dash/dailyMonitorPresence";
import type { DayKey } from "@/lib/ui/calendar/types";

export type DailyMonitorActivityMetricRow = {
  key: string;
  label: string;
  valueLabel: string;
  isAvailable: boolean;
};

export type DailyMonitorActivityCardModel = {
  day: DayKey;
  steps: number;
  stepsLabel: string;
  rows: readonly DailyMonitorActivityMetricRow[];
  sourceLabel: string | null;
  accessibilityLabel: string;
};

function formatSteps(steps: number): string {
  return steps.toLocaleString("en-US");
}

function formatOptionalMinutes(value: number | undefined): DailyMonitorActivityMetricRow {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return {
      key: "move_minutes",
      label: "Move minutes",
      valueLabel: `${Math.round(value)} min`,
      isAvailable: true,
    };
  }
  return {
    key: "move_minutes",
    label: "Move minutes",
    valueLabel: "Unavailable",
    isAvailable: false,
  };
}

function formatOptionalDistanceKm(value: number | undefined): DailyMonitorActivityMetricRow {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return {
      key: "distance",
      label: "Distance",
      valueLabel: `${value.toFixed(value >= 10 ? 0 : 1)} km`,
      isAvailable: true,
    };
  }
  return {
    key: "distance",
    label: "Distance",
    valueLabel: "Unavailable",
    isAvailable: false,
  };
}

/**
 * Builds Activity Monitor card when DailyFacts for requestedDay includes a finite steps value
 * (including 0). Returns null when steps evidence is absent.
 */
export function buildDailyMonitorActivityCardModel(input: {
  requestedDay: DayKey;
  facts: DailyFactsDto | null | undefined;
}): DailyMonitorActivityCardModel | null {
  if (input.facts == null) return null;
  if (input.facts.date !== input.requestedDay) return null;
  const steps = input.facts.activity?.steps;
  if (typeof steps !== "number" || !Number.isFinite(steps) || steps < 0) return null;

  const rounded = Math.round(steps);
  const stepsLabel = formatSteps(rounded);
  const rows = [
    formatOptionalMinutes(input.facts.activity?.moveMinutes),
    formatOptionalDistanceKm(input.facts.activity?.distanceKm),
  ];
  const sourceLabel = null;

  return {
    day: input.requestedDay,
    steps: rounded,
    stepsLabel,
    rows,
    sourceLabel,
    accessibilityLabel: `Activity. ${stepsLabel} steps.`,
  };
}

export function resolveActivityMonitorPresence(input: {
  loading: boolean;
  error: string | null;
  model: DailyMonitorActivityCardModel | null;
  factsDay: string | null;
  requestedDay: DayKey;
}): DailyMonitorPresenceStatus {
  if (input.loading && input.model == null) return "loading_presence";
  if (input.error != null && input.model == null) return "screen_level_error";
  if (input.error != null && input.model != null) {
    if (input.factsDay !== input.requestedDay) return "absent_no_day_evidence";
    return "refresh_error_with_cached_day_evidence";
  }
  if (input.model == null) return "absent_no_day_evidence";
  if (input.model.day !== input.requestedDay) return "absent_no_day_evidence";
  const anyUnavailable = input.model.rows.some((r) => !r.isAvailable);
  return anyUnavailable ? "present_partial" : "present_complete";
}
