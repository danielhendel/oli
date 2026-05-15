import type { DailyFactsDto, SleepViewDto } from "@oli/contracts";

import { dailyFactsHasSleepSignal } from "@/lib/data/sleep/sleepFactsSignal";
import { isOuraViewAlignedToDay } from "@/lib/data/oura/isOuraViewAlignedToDay";

export type DashSleepAnchorReason =
  | "loading"
  | "overnight_probe_previous_day"
  | "calendar_exact_sleep"
  | "previous_exact_sleep"
  | "calendar_empty";

export type ResolveDashSleepAnchorDayInput = {
  calendarToday: string;
  previousDay: string;
  calendarFactsStatus: "partial" | "ready" | "missing" | "error";
  calendarSleep: DailyFactsDto["sleep"] | undefined;
  previousFactsStatus: "partial" | "ready" | "missing" | "error";
  previousSleep: DailyFactsDto["sleep"] | undefined;
  probeLoading: boolean;
  probeView: SleepViewDto | undefined;
};

export type DashSleepAnchorResolution = {
  sleepAnchorDay: string;
  sleepAnchorSettled: boolean;
  calendarDayHasSleep: boolean;
  previousDayHasSleep: boolean;
  selectedReason: DashSleepAnchorReason;
};

function normalizeDayKey(dayKey: string): string {
  return typeof dayKey === "string" ? dayKey.trim() : dayKey;
}

/**
 * Dash Daily Sleep anchor: choose the day key **before** strict Oura alignment so the main
 * `useDashOuraViews` fetch targets the physiological sleep row.
 *
 * Priority:
 * 1) Calendar Oura probe with `requestedDay === calendarToday` and `resolvedDay === previousDay`
 *    (not aligned to calendar) → anchor previous, even when DailyFacts show sleep on the wake day.
 * 2) Aligned non-fallback Oura sleep view on the calendar day.
 * 3) DailyFacts sleep signal on the calendar day (only after the probe settles so overnight can win).
 * 4) DailyFacts sleep signal on the previous calendar day.
 * 5) Calendar day with empty card.
 *
 * Does not relax `isOuraViewAlignedToDay` on the **anchored** vendor fetch — only selects which day to request.
 */
export function resolveDashSleepAnchorDay(input: ResolveDashSleepAnchorDayInput): DashSleepAnchorResolution {
  const { calendarToday, previousDay, probeView, probeLoading } = input;

  const calFactsSettled = input.calendarFactsStatus !== "partial";
  const prevFactsSettled = input.previousFactsStatus !== "partial";
  const probeSettled = !probeLoading;

  const calendarExactFromFacts =
    input.calendarFactsStatus === "ready" && dailyFactsHasSleepSignal(input.calendarSleep);

  const calendarAlignedOura =
    probeView != null &&
    !probeView.isFallback &&
    isOuraViewAlignedToDay(probeView, calendarToday);

  /** Physiological “wake calendar day” sleep lives on previous Oura sleep day (may be marked fallback). */
  const probeOvernightToPrevious =
    probeView != null &&
    normalizeDayKey(probeView.requestedDay) === normalizeDayKey(calendarToday) &&
    normalizeDayKey(probeView.resolvedDay) === normalizeDayKey(previousDay) &&
    !isOuraViewAlignedToDay(probeView, calendarToday);

  const previousExactFromFacts =
    input.previousFactsStatus === "ready" && dailyFactsHasSleepSignal(input.previousSleep);

  const calendarDayHasSleep = calendarExactFromFacts || calendarAlignedOura;
  const previousDayHasSleep = previousExactFromFacts || probeOvernightToPrevious;

  if (probeSettled && probeOvernightToPrevious) {
    return {
      sleepAnchorDay: previousDay,
      sleepAnchorSettled: true,
      calendarDayHasSleep,
      previousDayHasSleep,
      selectedReason: "overnight_probe_previous_day",
    };
  }

  if (probeSettled && calendarAlignedOura) {
    return {
      sleepAnchorDay: calendarToday,
      sleepAnchorSettled: true,
      calendarDayHasSleep,
      previousDayHasSleep,
      selectedReason: "calendar_exact_sleep",
    };
  }

  if (probeSettled && calFactsSettled && calendarExactFromFacts) {
    return {
      sleepAnchorDay: calendarToday,
      sleepAnchorSettled: true,
      calendarDayHasSleep,
      previousDayHasSleep,
      selectedReason: "calendar_exact_sleep",
    };
  }

  if (calFactsSettled && probeSettled && prevFactsSettled && previousExactFromFacts) {
    return {
      sleepAnchorDay: previousDay,
      sleepAnchorSettled: true,
      calendarDayHasSleep,
      previousDayHasSleep,
      selectedReason: "previous_exact_sleep",
    };
  }

  if (calFactsSettled && probeSettled && prevFactsSettled) {
    return {
      sleepAnchorDay: calendarToday,
      sleepAnchorSettled: true,
      calendarDayHasSleep,
      previousDayHasSleep,
      selectedReason: "calendar_empty",
    };
  }

  return {
    sleepAnchorDay: calendarToday,
    sleepAnchorSettled: false,
    calendarDayHasSleep,
    previousDayHasSleep,
    selectedReason: "loading",
  };
}
