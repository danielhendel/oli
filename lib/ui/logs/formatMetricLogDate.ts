const MONTH_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Readable log row date, e.g. "June 6, 2026". */
export function formatMetricLogDateFromDayKey(dayKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!m) return dayKey;
  const year = Number(m[1]);
  const monthIndex = Number(m[2]) - 1;
  const day = Number(m[3]);
  const month = MONTH_FULL[monthIndex] ?? m[2];
  return `${month} ${day}, ${year}`;
}

/** Readable log row date from ISO timestamp in local timezone. */
export function formatMetricLogDateFromIso(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  const month = MONTH_FULL[d.getMonth()] ?? "";
  return `${month} ${d.getDate()}, ${d.getFullYear()}`;
}
