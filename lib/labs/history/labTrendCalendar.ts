/**
 * Calendar-date → UTC epoch helpers for lab trend charts.
 * Never shift YYYY-MM-DD via device timezone (2020-06-05 must stay June 5).
 */

const CALENDAR_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Extract YYYY-MM-DD from ISO / calendar string without TZ reinterpretation. */
export function labTrendCalendarDateFromCollectedAt(
  collectedAt: string | null | undefined,
  sourceCalendarDate?: string | null,
): string | null {
  if (sourceCalendarDate && CALENDAR_DATE_RE.test(sourceCalendarDate)) {
    return sourceCalendarDate;
  }
  if (!collectedAt) return null;
  const prefix = /^(\d{4}-\d{2}-\d{2})/.exec(collectedAt.trim());
  return prefix?.[1] ?? null;
}

/**
 * Stable timezone-neutral coordinate: UTC midnight of the source calendar date.
 * Display labels must still use the calendar string — not `new Date(local)`.
 */
export function labTrendEpochMsFromCalendarDate(calendarDate: string): number | null {
  const m = CALENDAR_DATE_RE.exec(calendarDate);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return Date.UTC(year, month - 1, day);
}

export function formatLabTrendAxisLabel(calendarDate: string): string {
  const m = CALENDAR_DATE_RE.exec(calendarDate);
  if (!m) return calendarDate;
  const months = [
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
  const month = months[Number(m[2]) - 1];
  if (!month) return calendarDate;
  return `${month} ${m[1]}`;
}

export function formatLabTrendPointDate(calendarDate: string): string {
  const m = CALENDAR_DATE_RE.exec(calendarDate);
  if (!m) return calendarDate;
  const months = [
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
  const month = months[Number(m[2]) - 1];
  if (!month) return calendarDate;
  return `${month} ${Number(m[3])}, ${m[1]}`;
}
