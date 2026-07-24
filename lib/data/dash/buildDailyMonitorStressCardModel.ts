/**
 * Pure Stress Monitor card from current-day Oura stress day DTO.
 * No Oli 0–100 score and no five-level Health State.
 */

import type { OuraDailyStressDayDto } from "@oli/contracts/ouraVendor";
import type { DailyMonitorPresenceStatus } from "@/lib/data/dash/dailyMonitorPresence";
import type { DayKey } from "@/lib/ui/calendar/types";

export type DailyMonitorStressCardModel = {
  day: DayKey;
  daySummaryLabel: string;
  stressedMinutesLabel: string | null;
  restoredMinutesLabel: string | null;
  sourceLabel: "Oura";
  accessibilityLabel: string;
};

function formatMinutesFromSeconds(seconds: number | null | undefined): string | null {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) return null;
  return `${Math.round(seconds / 60)} min`;
}

function daySummaryLabel(summary: OuraDailyStressDayDto["daySummary"]): string {
  switch (summary) {
    case "restored":
      return "Restored";
    case "normal":
      return "Normal";
    case "stressful":
      return "Stressful";
    default:
      return "Unavailable";
  }
}

export function buildDailyMonitorStressCardModel(input: {
  requestedDay: DayKey;
  day: OuraDailyStressDayDto | null | undefined;
}): DailyMonitorStressCardModel | null {
  if (input.day == null) return null;
  if (input.day.day !== input.requestedDay) return null;
  if (input.day.daySummary == null) return null;

  const summary = daySummaryLabel(input.day.daySummary);
  const stressedMinutesLabel = formatMinutesFromSeconds(input.day.stressHighSeconds);
  const restoredMinutesLabel = formatMinutesFromSeconds(input.day.recoveryHighSeconds);

  return {
    day: input.requestedDay,
    daySummaryLabel: summary,
    stressedMinutesLabel,
    restoredMinutesLabel,
    sourceLabel: "Oura",
    accessibilityLabel: `Stress. ${summary}. Source Oura.`,
  };
}

export function resolveStressMonitorPresence(input: {
  loading: boolean;
  error: string | null;
  ouraDisconnected: boolean;
  model: DailyMonitorStressCardModel | null;
}): DailyMonitorPresenceStatus {
  if (input.loading && input.model == null) return "loading_presence";
  if (input.ouraDisconnected && input.model == null) return "unavailable_source";
  if (input.error != null && input.model == null) return "screen_level_error";
  if (input.error != null && input.model != null) return "refresh_error_with_cached_day_evidence";
  if (input.model == null) return "absent_no_day_evidence";
  const partial =
    input.model.stressedMinutesLabel == null || input.model.restoredMinutesLabel == null;
  return partial ? "present_partial" : "present_complete";
}
