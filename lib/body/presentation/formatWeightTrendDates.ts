/**
 * Locale-stable Weight trend date presentation helpers.
 * Pure — no UI imports.
 */

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTH_SHORT = [
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

function parseDayKeyParts(dayKey: string): {
  year: number;
  monthIndex: number;
  day: number;
} | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!m) return null;
  const year = Number(m[1]);
  const monthIndex = Number(m[2]) - 1;
  const day = Number(m[3]);
  if (!Number.isFinite(year) || monthIndex < 0 || monthIndex > 11 || day < 1 || day > 31) {
    return null;
  }
  return { year, monthIndex, day };
}

function weekdayFromDayKey(dayKey: string): string {
  const parts = parseDayKeyParts(dayKey);
  if (!parts) return "";
  const d = new Date(Date.UTC(parts.year, parts.monthIndex, parts.day, 12, 0, 0));
  return WEEKDAY_SHORT[d.getUTCDay()] ?? "";
}

/**
 * Current-value date under Weight: `Wed, Sep 16` (EEE, MMM d).
 */
export function formatWeightTrendCurrentDate(dayKey: string): string {
  const parts = parseDayKeyParts(dayKey);
  if (!parts) return dayKey;
  const wd = weekdayFromDayKey(dayKey);
  const month = MONTH_SHORT[parts.monthIndex] ?? "";
  return `${wd}, ${month} ${parts.day}`;
}

export type WeightTrendObservedAxisLabels =
  | {
      readonly kind: "range";
      readonly startLabel: string;
      readonly endLabel: string;
    }
  | {
      readonly kind: "single";
      readonly label: string;
    };

/**
 * Format observed start/end for the chart footer.
 * Cross-year → `MMM d, yyyy`; same year → `MMM d`; same day → single centered date.
 */
export function formatWeightTrendObservedAxisLabels(args: {
  readonly firstDayKey: string;
  readonly lastDayKey: string;
}): WeightTrendObservedAxisLabels | null {
  const start = parseDayKeyParts(args.firstDayKey);
  const end = parseDayKeyParts(args.lastDayKey);
  if (!start || !end) return null;

  const startMonth = MONTH_SHORT[start.monthIndex] ?? "";
  const endMonth = MONTH_SHORT[end.monthIndex] ?? "";

  if (args.firstDayKey === args.lastDayKey) {
    return {
      kind: "single",
      label: `${startMonth} ${start.day}, ${start.year}`,
    };
  }

  if (start.year !== end.year) {
    return {
      kind: "range",
      startLabel: `${startMonth} ${start.day}, ${start.year}`,
      endLabel: `${endMonth} ${end.day}, ${end.year}`,
    };
  }

  return {
    kind: "range",
    startLabel: `${startMonth} ${start.day}`,
    endLabel: `${endMonth} ${end.day}`,
  };
}
