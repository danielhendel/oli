import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/**
 * Weekday short + M/D for a calendar day key (UTC noon anchor), e.g. `Tue 3/31`.
 * Matches historical overview / recent-row copy ({@link formatBodyDayLabel}).
 */
/**
 * Stack header title for a calendar day — matches workout day detail (`formatHeaderDate` style):
 * e.g. `Tue Apr 14, 2026` (locale weekday + short month + day + year).
 */
export function formatDayKeyStackNavTitle(dayKey: DayKey): string {
  const d = new Date(`${dayKey}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return dayKey;
  const weekday = d.toLocaleDateString(undefined, { weekday: "short" }).replace(",", "");
  const rest = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return `${weekday} ${rest}`;
}

export function formatDayKeyWeekdayShortMonthDay(dayKey: DayKey): string {
  const d = new Date(`${dayKey}T12:00:00.000Z`);
  const wd = WEEKDAY_SHORT[d.getUTCDay()] ?? "";
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `${wd} ${month}/${day}`;
}

/**
 * Overview header line: "As of Today" when `dayKey` is the device-local today, else "As of Tue 4/6".
 */
export function formatOverviewAsOfLabel(dayKey: string): string {
  if (dayKey === getTodayDayKeyLocal()) {
    return "As of Today";
  }
  return `As of ${formatDayKeyWeekdayShortMonthDay(dayKey)}`;
}
