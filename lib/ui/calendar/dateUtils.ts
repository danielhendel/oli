import type { DayKey } from "./types";

/**
 * Get today's DayKey in local device time.
 */
export function getTodayDayKeyLocal(): DayKey {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const mm = String(m + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

function dateFromDayKey(day: DayKey): Date {
  return new Date(`${day}T12:00:00.000Z`);
}

function toDayKey(d: Date): DayKey {
  return d.toISOString().slice(0, 10) as DayKey;
}

/** Shift a calendar day by delta days (UTC calendar arithmetic). */
export function addCalendarDaysToDayKey(day: DayKey, deltaDays: number): DayKey {
  const d = dateFromDayKey(day);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return toDayKey(d);
}

/**
 * Return the DayKey for the Sunday at or before the given day.
 */
export function getWeekStartSunday(day: DayKey): DayKey {
  const d = dateFromDayKey(day);
  const dayOfWeek = d.getUTCDay(); // 0 = Sunday
  const start = new Date(d);
  start.setUTCDate(d.getUTCDate() - dayOfWeek);
  return toDayKey(start);
}

/**
 * Enumerate all DayKeys in [start, end], inclusive.
 * Assumes start/end are valid DayKeys and start <= end.
 */
export function enumerateDaysInclusive(start: DayKey, end: DayKey): DayKey[] {
  const out: DayKey[] = [];
  let current = start;
  while (current <= end) {
    out.push(current);
    const d = dateFromDayKey(current);
    d.setUTCDate(d.getUTCDate() + 1);
    current = toDayKey(d);
  }
  return out;
}

/**
 * Return the 7 DayKeys for the Sunday–Saturday week containing `anchorDay`.
 */
export function getWeekDaysForAnchor(anchorDay: DayKey): DayKey[] {
  const start = getWeekStartSunday(anchorDay);
  const startDate = dateFromDayKey(start);
  const days: DayKey[] = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(startDate);
    d.setUTCDate(startDate.getUTCDate() + i);
    days.push(toDayKey(d));
  }
  return days;
}

export type MonthYear = {
  year: number;
  month: number; // 1-12
};

export function clampMonthYear(input: MonthYear): MonthYear {
  let { year, month } = input;
  if (month < 1) {
    const delta = Math.ceil((1 - month) / 12);
    year -= delta;
    month += 12 * delta;
  } else if (month > 12) {
    const delta = Math.floor((month - 1) / 12);
    year += delta;
    month -= 12 * delta;
  }
  return { year, month };
}

/**
 * Get the DayKey for the first day of a month (local-neutral, uses UTC noon).
 */
export function getMonthFirstDay({ year, month }: MonthYear): DayKey {
  const { year: y, month: m } = clampMonthYear({ year, month });
  const d = new Date(Date.UTC(y, m - 1, 1, 12, 0, 0, 0));
  return toDayKey(d);
}

export function getMonthLastDay({ year, month }: MonthYear): DayKey {
  const { year: y, month: m } = clampMonthYear({ year, month });
  // day 0 of next month = last day of this month
  const d = new Date(Date.UTC(y, m, 0, 12, 0, 0, 0));
  return toDayKey(d);
}

/**
 * Enumerate all weeks for a given month as DayKey grids.
 *
 * Each inner array is a week (Sun–Sat). Days outside the target month are
 * represented as null to allow simple grid rendering.
 */
export function getMonthGrid({ year, month }: MonthYear): (DayKey | null)[][] {
  const firstDay = getMonthFirstDay({ year, month });
  const lastDay = getMonthLastDay({ year, month });
  const firstDate = dateFromDayKey(firstDay);
  const lastDate = dateFromDayKey(lastDay);

  // Back up to Sunday on/ before first day
  const start = new Date(firstDate);
  const startDow = start.getUTCDay();
  start.setUTCDate(start.getUTCDate() - startDow);

  // Advance to Saturday on/ after last day
  const end = new Date(lastDate);
  const endDow = end.getUTCDay();
  end.setUTCDate(end.getUTCDate() + (6 - endDow));

  const weeks: (DayKey | null)[][] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    const week: (DayKey | null)[] = [];
    for (let i = 0; i < 7; i += 1) {
      const dayKey = toDayKey(cursor);
      const inMonth = cursor.getUTCMonth() === firstDate.getUTCMonth();
      week.push(inMonth ? dayKey : null);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
  }

  return weeks;
}

export function formatMonthYearLabel({ year, month }: MonthYear): string {
  const { year: y, month: m } = clampMonthYear({ year, month });
  const d = new Date(Date.UTC(y, m - 1, 1, 12, 0, 0, 0));
  return d.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

