import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

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

/**
 * Locale-aware full weekday name for a calendar day key (`YYYY-MM-DD`), using the same UTC-noon
 * anchor as {@link formatDayKeyWeekdayShortMonthDay}. Month/day omitted — for This Week row labels.
 */
export function formatWeekdayFullFromDayKey(dayKey: string): string {
  const d = new Date(`${dayKey}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat(undefined, { weekday: "long", timeZone: "UTC" }).format(d);
  } catch {
    return "";
  }
}

/** Uppercase weekday label for Strength overview This Week rows (e.g. `MONDAY`). */
export function formatWeekdayUpperFromDayKey(dayKey: string): string {
  const full = formatWeekdayFullFromDayKey(dayKey);
  return full.length > 0 ? full.toUpperCase() : "";
}

/** Weekday short + M/D for a calendar day key (UTC noon anchor), e.g. `Tue 3/31`. */
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

const MONTH_SHORT_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/**
 * Compact week-range label for chart headers, using a UTC-noon anchor like the other formatters.
 *
 * Same calendar month: "May 17\u201323".
 * Crossing a month boundary: "May 31\u2013Jun 6" (year is intentionally omitted).
 * If either DayKey is malformed, returns `"{start}\u2013{end}"` as a defensive fallback.
 */
export function formatWeekDayKeyRange(start: DayKey, end: DayKey): string {
  const s = new Date(`${start}T12:00:00.000Z`);
  const e = new Date(`${end}T12:00:00.000Z`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
    return `${start}\u2013${end}`;
  }
  const sMonth = MONTH_SHORT_LABELS[s.getUTCMonth()] ?? "";
  const eMonth = MONTH_SHORT_LABELS[e.getUTCMonth()] ?? "";
  const sDay = s.getUTCDate();
  const eDay = e.getUTCDate();
  const sameMonth = sMonth === eMonth && s.getUTCFullYear() === e.getUTCFullYear();
  if (sameMonth) {
    return `${sMonth} ${sDay}\u2013${eDay}`;
  }
  return `${sMonth} ${sDay}\u2013${eMonth} ${eDay}`;
}
