/**
 * Pure Activity card model + presence for Daily Monitor (current-day Steps).
 * Valid measured zero is present; missing activity.steps is absent.
 * Compact rows are applicability-gated (Distance measured; Workout/Cardio from session truth).
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
  /** Applicable secondary rows only (stable order among those present). */
  rows: readonly DailyMonitorActivityMetricRow[];
  accessibilityLabel: string;
};

export type DailyMonitorActivitySessionApplicability = {
  /** True only when a current-day Workout-domain completed session exists. */
  hasCurrentDayWorkout: boolean;
  /** True only when a current-day Cardio-domain completed session exists. */
  hasCurrentDayCardio: boolean;
};

function formatStepsDigits(steps: number): string {
  return steps.toLocaleString("en-US");
}

/**
 * Measured current-day `activity.distanceKm` only — never estimated from steps/stride.
 * Returns null when unmeasured so the compact card can omit the row.
 */
function formatMeasuredDistanceRow(
  value: number | undefined,
  locale: string,
): DailyMonitorActivityMetricRow | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  const { primary } = formatDistanceDualDisplay({ distanceKm: value, locale });
  return {
    key: "distance",
    label: "Distance",
    valueLabel: primary,
    isAvailable: true,
  };
}

function formatStepBucketRow(
  key: Exclude<DailyMonitorActivityMetricRow["key"], "distance">,
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
 * Compact rows (stable order among those present): Distance → NEAT → Workout → Cardio.
 * Distance omitted when unmeasured. Workout/Cardio rows require session applicability —
 * never inferred from allocation alone.
 */
export function buildDailyMonitorActivityCardModel(input: {
  requestedDay: DayKey;
  facts: DailyFactsDto | null | undefined;
  /** Locale for distance primary unit (miles-first for en-US). Defaults to en-US. */
  locale?: string;
  /** Current-day Workout/Cardio session applicability from Monitor session models. */
  sessionApplicability?: DailyMonitorActivitySessionApplicability;
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
  const hasWorkout = input.sessionApplicability?.hasCurrentDayWorkout === true;
  const hasCardio = input.sessionApplicability?.hasCurrentDayCardio === true;

  const rows: DailyMonitorActivityMetricRow[] = [];

  const distanceRow = formatMeasuredDistanceRow(input.facts.activity?.distanceKm, locale);
  if (distanceRow != null) rows.push(distanceRow);

  if (
    allocation != null &&
    typeof allocation.neatSteps === "number" &&
    Number.isFinite(allocation.neatSteps) &&
    allocation.neatSteps >= 0
  ) {
    rows.push(formatStepBucketRow("neat_steps", "NEAT Steps", allocation.neatSteps));
  }

  if (hasWorkout) {
    rows.push(formatStepBucketRow("workout_steps", "Workout Steps", allocation?.strengthSteps));
  }

  if (hasCardio) {
    rows.push(formatStepBucketRow("cardio_steps", "Cardio Steps", allocation?.cardioSteps));
  }

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
