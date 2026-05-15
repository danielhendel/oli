import type { SleepViewDto } from "@oli/contracts";

import { addCalendarDaysToDayKey } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

function normalizeDayKey(dayKey: string): string {
  return typeof dayKey === "string" ? dayKey.trim() : dayKey;
}

/**
 * When `GET /users/me/oura-sleep-view?day=D` returns `requestedDay === D` but `resolvedDay === R` with
 * `R !== D`, the vendor row is physiologically keyed on `R`. Dash must anchor vendor reads + alignment
 * on `R` without relaxing {@link isOuraViewAlignedToDay}.
 *
 * Rejects unrelated older `resolvedDay` rows (e.g. stale April fallback) using a tight window vs
 * the Dash calendar wake day.
 */
export function pickPhysiologicalSleepAnchorFromVendorSleepView(args: {
  calendarToday: DayKey;
  requestedSleepAnchorDay: string;
  sleepView: SleepViewDto | undefined;
}): string | null {
  const { calendarToday, requestedSleepAnchorDay, sleepView } = args;
  if (!sleepView || sleepView.isFallback) return null;

  const req = normalizeDayKey(sleepView.requestedDay);
  const res = normalizeDayKey(sleepView.resolvedDay);
  const anchor = normalizeDayKey(requestedSleepAnchorDay);

  if (req !== anchor) return null;
  if (res === anchor) return null;

  const minTrust = addCalendarDaysToDayKey(calendarToday, -2);
  if (res < minTrust || res > normalizeDayKey(calendarToday)) return null;

  return res;
}
