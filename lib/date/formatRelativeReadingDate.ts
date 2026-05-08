import type { DayKey } from "@/lib/ui/calendar/types";

export type FormatAsOfReadingLabelOpts = {
  /** Reference instant for “today / yesterday”; defaults to `new Date()`. */
  now?: Date;
  /**
   * IANA TZ used for calendar-day comparisons with Firestore ISO timestamps.
   * Defaults to the runtime default timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`).
   */
  timeZone?: string;
};

function resolvedTimeZone(opts?: FormatAsOfReadingLabelOpts): string {
  if (opts?.timeZone != null && opts.timeZone.length > 0) return opts.timeZone;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === "string" && tz.length > 0 ? tz : "UTC";
  } catch {
    return "UTC";
  }
}

/** Calendar `YYYY-MM-DD` for an instant in `timeZone` (consistent with Body snapshot day keys). */
export function calendarDayKeyFromInstant(iso: string, timeZone: string): DayKey {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "1970-01-01";
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const mo = parts.find((p) => p.type === "month")?.value;
  const da = parts.find((p) => p.type === "day")?.value;
  if (!y || !mo || !da) {
    return "1970-01-01";
  }
  return `${y}-${mo}-${da}`;
}

/** Same calendar mapping as {@link calendarDayKeyFromInstant} but from a `Date` reference. */
export function calendarDayKeyFromDate(ref: Date, timeZone: string): DayKey {
  return calendarDayKeyFromInstant(ref.toISOString(), timeZone);
}

export function ordinalSuffix(dayOfMonth: number): string {
  const v = dayOfMonth % 100;
  if (v >= 11 && v <= 13) return `${dayOfMonth}th`;
  switch (dayOfMonth % 10) {
    case 1:
      return `${dayOfMonth}st`;
    case 2:
      return `${dayOfMonth}nd`;
    case 3:
      return `${dayOfMonth}rd`;
    default:
      return `${dayOfMonth}th`;
  }
}

function shiftCalendarDayKey(dayKey: DayKey, deltaDays: number): DayKey {
  const parts = dayKey.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (y == null || m == null || d == null) return dayKey;
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function formatMonthOrdinalFromInstant(iso: string, timeZone: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const month = new Intl.DateTimeFormat("en-US", { timeZone, month: "long" }).format(d);
  const dayStr = new Intl.DateTimeFormat("en-US", { timeZone, day: "numeric" }).format(d);
  const dayNum = Number.parseInt(dayStr, 10);
  if (!Number.isFinite(dayNum)) return month;
  return `${month} ${ordinalSuffix(dayNum)}`;
}

/**
 * Dash / overview subtitle for when the latest reading was taken.
 * - Same calendar day as “now” in `timeZone`: `As of today`
 * - Previous calendar day: `As of yesterday`
 * - Older: `As of May 4th` (English month + ordinal day)
 */
export function formatAsOfReadingLabel(observedAtIso: string, opts?: FormatAsOfReadingLabelOpts): string {
  const tz = resolvedTimeZone(opts);
  const now = opts?.now ?? new Date();
  const readingDay = calendarDayKeyFromInstant(observedAtIso, tz);
  const todayDay = calendarDayKeyFromDate(now, tz);
  const yesterdayDay = shiftCalendarDayKey(todayDay, -1);

  if (readingDay === todayDay) return "As of today";
  if (readingDay === yesterdayDay) return "As of yesterday";
  const tail = formatMonthOrdinalFromInstant(observedAtIso, tz);
  return tail.length > 0 ? `As of ${tail}` : "As of reading";
}

/**
 * Same phrasing as {@link formatAsOfReadingLabel}, but driven only by a Body snapshot `YYYY-MM-DD`.
 */
export function formatAsOfReadingDayKeyOnly(dayKey: DayKey, opts?: FormatAsOfReadingLabelOpts): string {
  const tz = resolvedTimeZone(opts);
  const now = opts?.now ?? new Date();
  const todayDay = calendarDayKeyFromDate(now, tz);
  const yesterdayDay = shiftCalendarDayKey(todayDay, -1);
  if (dayKey === todayDay) return "As of today";
  if (dayKey === yesterdayDay) return "As of yesterday";
  const seg = dayKey.split("-");
  const moNum = Number(seg[1]);
  const daNum = Number(seg[2]);
  if (!Number.isFinite(moNum) || !Number.isFinite(daNum)) return "As of reading";
  const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date(2000, moNum - 1, 1));
  return `As of ${monthName} ${ordinalSuffix(daNum)}`;
}
