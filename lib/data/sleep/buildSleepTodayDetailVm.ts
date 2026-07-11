/**
 * Sleep page Today card view model.
 *
 * Wraps `buildDailySleepCardModel` (already used by Dash Daily Sleep) and enforces the same
 * attribution rule (`sleepNightIsAttributedToCalendarDay`) so the Sleep page never renders
 * stale `latest_completed_prior_night` data on today's row.
 *
 * Output is a typed readiness union — screens map to header / hero / metric rows without
 * any business logic. No Firebase / no API calls.
 */

import {
  buildDailySleepCardModel,
  type DailySleepCardModel,
} from "@/lib/data/dash/buildDailySleepCardModel";
import {
  sleepNightIsAttributedToCalendarDay,
  type DailySleepCardCta,
  type DailySleepCardMissingReason,
} from "@/lib/data/dash/dailySleepCardViewModel";
import type { WeeklyFitnessSleepNightCell } from "@/lib/data/dash/weeklyFitnessCompletedSleepNights";
import type { DayKey } from "@/lib/ui/calendar/types";

export type SleepTodayDetailVm =
  | { status: "partial"; day: DayKey }
  | {
      status: "missing";
      day: DayKey;
      message: string;
      reason?: DailySleepCardMissingReason;
      cta?: DailySleepCardCta;
    }
  | { status: "ready"; day: DayKey; model: DailySleepCardModel; headlineWithUnit: string };

const MISSING_MESSAGE = "No completed sleep found for this day.";
const OURA_DISCONNECTED_MESSAGE = "Reconnect Oura to sync your sleep.";
const OURA_RECONNECT_CTA: DailySleepCardCta = {
  label: "Reconnect Oura \u2192",
  href: "/(app)/settings/devices/oura",
};

export type BuildSleepTodayDetailVmInput = {
  day: DayKey;
  loading: boolean;
  cell: WeeklyFitnessSleepNightCell | undefined;
  /**
   * Optional. When `true`, settled-and-missing renders the Oura reconnect copy + CTA.
   * Hook layer must only flip `true` when `useOuraPresence` is `ready && !connected`.
   */
  ouraDisconnected?: boolean;
};

function buildMissing(
  day: DayKey,
  ouraDisconnected: boolean,
): Extract<SleepTodayDetailVm, { status: "missing" }> {
  if (ouraDisconnected) {
    return {
      status: "missing",
      day,
      message: OURA_DISCONNECTED_MESSAGE,
      reason: "oura_disconnected",
      cta: OURA_RECONNECT_CTA,
    };
  }
  return { status: "missing", day, message: MISSING_MESSAGE, reason: "no_data" };
}

/** Combine duration with the trailing word so the screen never re-formats the headline itself. */
export function formatSleepTodayHeadlineWithUnit(durationText: string): string {
  return `${durationText} Sleep`;
}

export function buildSleepTodayDetailVm(input: BuildSleepTodayDetailVmInput): SleepTodayDetailVm {
  const { day, loading, cell } = input;
  const ouraDisconnected = input.ouraDisconnected === true;

  if (loading || cell == null || !cell.settled) {
    return { status: "partial", day };
  }

  const view = cell.view;
  if (view == null || !sleepNightIsAttributedToCalendarDay(day, view)) {
    return buildMissing(day, ouraDisconnected);
  }

  const model = buildDailySleepCardModel({
    day,
    resolution: view.resolution,
    sleepNight: view.sleepNight,
    sleepNightSettled: true,
    presentation: "detail",
  });

  if (model.day !== day || model.durationValueText == null) {
    return buildMissing(day, ouraDisconnected);
  }

  return {
    status: "ready",
    day,
    model,
    headlineWithUnit: formatSleepTodayHeadlineWithUnit(model.durationValueText),
  };
}
