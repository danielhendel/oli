// lib/logging/selectors.ts
// Pure, UTC-safe date helpers for the weekly calendar.

import { toYMD } from "../util/date";

export type DayItem = {
  /** 0=Sun ... 6=Sat */
  dow: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** "Sun", "Mon", ... */
  label: (typeof DOW_LABELS)[number];
  /** YYYY-MM-DD (UTC) */
  ymd: string;
};

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function parseYMD(ymd: string): [number, number, number] {
  const [y, m, d] = ymd.split("-").map((n) => Number(n)) as [number, number, number];
  return [y, m, d];
}

export function isTodayYMD(ymd: string): boolean {
  return ymd === toYMD(new Date());
}

export function addDaysYMD(ymd: string, delta: number): string {
  const [y, m, d] = parseYMD(ymd);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return toYMD(dt);
}

/** Start of week (Sunday) for a given date (UTC). */
export function startOfWeekSunYMD(input: Date | string | number): string {
  const base = input instanceof Date ? input : new Date(input);
  const ymd = toYMD(base);
  const [y, m, d] = parseYMD(ymd);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sun
  const start = new Date(dt);
  start.setUTCDate(dt.getUTCDate() - dow);
  return toYMD(start);
}

/** Seven DayItems from Sunday..Saturday for the week containing the given date. */
export function getWeekDays(input: Date | string | number): DayItem[] {
  const startYmd = startOfWeekSunYMD(input);
  const [y, m, d] = parseYMD(startYmd);
  const start = new Date(Date.UTC(y, m - 1, d));
  const days: DayItem[] = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(start);
    cur.setUTCDate(start.getUTCDate() + i);
    const ymd = toYMD(cur);
    const dow = cur.getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    days.push({ dow, label: DOW_LABELS[dow], ymd });
  }
  return days;
}
