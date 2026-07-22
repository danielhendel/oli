/**
 * Pure Activity card model + presence for Daily Monitor (current-day Steps).
 * Valid measured zero is present; missing activity.steps is absent.
 */

import type { DailyFactsDto } from "@/lib/contracts/dailyFacts";
import type { DailyMonitorPresenceStatus } from "@/lib/data/dash/dailyMonitorPresence";
import type { DailyMonitorRatingTone } from "@/lib/data/dash/dailyMonitorPresentationRatings";
import { buildDailyMonitorActivityRatingLabel } from "@/lib/data/dash/dailyMonitorPresentationRatings";
import { formatDistanceDualDisplay } from "@/lib/modules/commandCenterCardio";
import type { DayKey } from "@/lib/ui/calendar/types";

export type DailyMonitorActivityMetricRow = {
  key: "distance" | "neat_steps" | "workout_steps" | "cardio_steps";
  label: string;
  valueLabel: string;
  isAvailable: boolean;
};

export type DailyMonitorActivityCardModel = {
  day: DayKey;
  steps: number;
  /** Locale-aware digits only (e.g. `2,883`). */
  stepsDigits: string;
  /** Primary display: `{digits} Steps`. */
  primaryLabel: string;
  ratingLabel: string;
  ratingAccessibilityLabel: string;
  /** Supplemental semantic tone for the Activity category badge. */
  ratingTone: DailyMonitorRatingTone;
  rows: readonly DailyMonitorActivityMetricRow[];
  accessibilityLabel: string;
};

function formatStepsDigits(steps: number): string {
  return steps.toLocaleString("en-US");
}

/**
 * Measured current-day `activity.distanceKm` only — never estimated from steps/stride.
 * Formatting reuses {@link formatDistanceDualDisplay} (locale miles/km preference).
 */
function formatOptionalDistanceKm(
  value: number | undefined,
  locale: string,
): DailyMonitorActivityMetricRow {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    const { primary } = formatDistanceDualDisplay({ distanceKm: value, locale });
    return {
      key: "distance",
      label: "Distance",
      valueLabel: primary,
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

function formatOptionalStepBucket(
  key: DailyMonitorActivityMetricRow["key"],
  label: string,
  value: number | undefined | null,
): DailyMonitorActivityMetricRow {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return {
      key,
      label,
      valueLabel: `${Math.round(value).toLocaleString("en-US")} steps`,
      isAvailable: true,
    };
  }
  return {
    key,
    label,
    valueLabel: "Unavailable",
    isAvailable: false,
  };
}

/**
 * Builds Activity Monitor card when DailyFacts for requestedDay includes a finite steps value
 * (including 0). Returns null when steps evidence is absent.
 *
 * Rows (exact order): Distance → NEAT steps → Workout steps → Cardio steps.
 * Allocation uses DailyFacts `activity.stepsAllocation` (strength → Workout steps).
 */
export function buildDailyMonitorActivityCardModel(input: {
  requestedDay: DayKey;
  facts: DailyFactsDto | null | undefined;
  /** Locale for distance primary unit (miles-first for en-US). Defaults to en-US. */
  locale?: string;
}): DailyMonitorActivityCardModel | null {
  if (input.facts == null) return null;
  if (input.facts.date !== input.requestedDay) return null;
  const steps = input.facts.activity?.steps;
  if (typeof steps !== "number" || !Number.isFinite(steps) || steps < 0) return null;

  const rounded = Math.round(steps);
  const stepsDigits = formatStepsDigits(rounded);
  const primaryLabel = `${stepsDigits} Steps`;
  const rating = buildDailyMonitorActivityRatingLabel(rounded);
  const allocation = input.facts.activity?.stepsAllocation;
  const locale = input.locale ?? "en-US";
  const rows: DailyMonitorActivityMetricRow[] = [
    formatOptionalDistanceKm(input.facts.activity?.distanceKm, locale),
    formatOptionalStepBucket("neat_steps", "NEAT Steps", allocation?.neatSteps),
    formatOptionalStepBucket("workout_steps", "Workout Steps", allocation?.strengthSteps),
    formatOptionalStepBucket("cardio_steps", "Cardio Steps", allocation?.cardioSteps),
  ];

  return {
    day: input.requestedDay,
    steps: rounded,
    stepsDigits,
    primaryLabel,
    ratingLabel: rating.label,
    ratingAccessibilityLabel: rating.accessibilityLabel,
    ratingTone: rating.tone,
    rows,
    accessibilityLabel: `Activity. ${primaryLabel}. ${rating.accessibilityLabel} Opens Activity.`,
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
