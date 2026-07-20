/**
 * Pure domain → Daily Monitor presence resolvers (Phase 2C).
 * Reuses existing attribution / day-match decisions; does not invent scores.
 */

import type { DailyNutritionCardModel } from "@/lib/data/dash/buildDailyNutritionCardModel";
import type { BuiltBodyCompositionDashCard } from "@/lib/data/dash/buildBodyCompositionDashCardModel";
import type { DailyEnergyCardDto } from "@/lib/data/dash/useDailyEnergyCard";
import type { DailySleepCardViewModel } from "@/lib/data/dash/dailySleepCardViewModel";
import type { DailyMonitorPresenceStatus } from "@/lib/data/dash/dailyMonitorPresence";
import type { DailyReadinessCardViewModel } from "@/lib/ui/dash/DailyReadinessCard";
import type { DayKey } from "@/lib/ui/calendar/types";

export function resolveSleepMonitorPresence(
  vm: DailySleepCardViewModel,
): DailyMonitorPresenceStatus {
  if (vm.status === "partial") return "loading_presence";
  if (vm.status === "error") return "screen_level_error";
  if (vm.status === "missing") {
    if (vm.reason === "oura_disconnected") return "unavailable_source";
    return "absent_no_day_evidence";
  }
  // ready
  if (!vm.model.hasAnySignal) return "absent_no_day_evidence";
  const rows = vm.model.metricRows;
  const anyUnavailable = rows.some((r) => !r.isAvailable);
  if (anyUnavailable || vm.model.scoreUnavailable) return "present_partial";
  return "present_complete";
}

export function resolveReadinessMonitorPresence(
  vm: DailyReadinessCardViewModel,
): DailyMonitorPresenceStatus {
  if (vm.status === "partial") return "loading_presence";
  if (vm.status === "error") return "screen_level_error";
  if (vm.status === "missing") {
    if (vm.cta != null) return "unavailable_source";
    return "absent_no_day_evidence";
  }
  if (!vm.model.hasAnySignal) return "absent_no_day_evidence";
  const anyUnavailable = vm.model.metricRows.some((r) => !r.isAvailable);
  return anyUnavailable ? "present_partial" : "present_complete";
}

export function resolveEnergyMonitorPresence(input: {
  energy: DailyEnergyCardDto | undefined;
  loading: boolean;
  error: string | null;
  requestedDay: DayKey;
}): DailyMonitorPresenceStatus {
  if (input.loading && input.energy == null) return "loading_presence";
  if (input.error != null && input.energy == null) return "screen_level_error";
  if (input.error != null && input.energy != null) {
    if (input.energy.day !== input.requestedDay) return "absent_no_day_evidence";
    return "refresh_error_with_cached_day_evidence";
  }
  if (input.energy == null) return "absent_no_day_evidence";
  if (input.energy.day !== input.requestedDay) return "absent_no_day_evidence";
  const missing = input.energy.missingRequiredInputs?.length ?? 0;
  if (missing > 0 || input.energy.confidence === "low") return "present_partial";
  return "present_complete";
}

export function resolveNutritionMonitorPresence(input: {
  model: DailyNutritionCardModel;
  loading: boolean;
  error: string | null;
}): DailyMonitorPresenceStatus {
  if (input.loading) return "loading_presence";
  if (input.error != null) return "screen_level_error";
  if (!input.model.hasAnyNutrition) return "absent_no_day_evidence";
  const anyDash = input.model.rows.some((r) => r.valueLabel === "—");
  if (anyDash || input.model.calorieLabel === "—") return "present_partial";
  return "present_complete";
}

/**
 * Body Composition for Daily Monitor: observation day must equal requested day.
 * Prior-day latest-known values → absent_no_day_evidence.
 */
export function resolveBodyCompositionMonitorPresence(input: {
  requestedDay: DayKey;
  /** Calendar day of the overview snapshot (latest observation day). */
  overviewDay: string | null;
  seriesLoading: boolean;
  seriesError: string | null;
  hasUser: boolean;
  built: BuiltBodyCompositionDashCard | null;
}): DailyMonitorPresenceStatus {
  if (!input.hasUser) return "signed_out";
  if (input.seriesLoading || input.built == null || input.built.tag === "partial") {
    return "loading_presence";
  }
  if (input.seriesError != null || input.built.tag === "error") {
    return "screen_level_error";
  }
  if (input.built.tag === "missing") {
    return "absent_no_day_evidence";
  }
  // ready
  if (input.overviewDay == null || input.overviewDay !== input.requestedDay) {
    return "absent_no_day_evidence";
  }
  const anyUnavailable = input.built.rows.some(
    (r) => r.valueLabel === "—" || !r.bar.hasValue,
  );
  return anyUnavailable ? "present_partial" : "present_complete";
}
