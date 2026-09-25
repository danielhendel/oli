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

function formatDayKeyMmmDYyyy(dayKey: string): string | null {
  const parts = parseDayKeyParts(dayKey);
  if (!parts) return null;
  const month = MONTH_SHORT[parts.monthIndex] ?? "";
  return `${month} ${parts.day}, ${parts.year}`;
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
 * Format observed start/end as separate labels (legacy split axis).
 * Prefer {@link formatWeightTrendObservedCoverageLabel} for the chart footer.
 */
export function formatWeightTrendObservedAxisLabels(args: {
  readonly firstDayKey: string;
  readonly lastDayKey: string;
}): WeightTrendObservedAxisLabels | null {
  const coverage = formatWeightTrendObservedCoverageLabel(args);
  if (coverage == null) return null;
  if (args.firstDayKey === args.lastDayKey) {
    return { kind: "single", label: coverage };
  }
  const sep = " – ";
  const idx = coverage.indexOf(sep);
  if (idx < 0) return { kind: "single", label: coverage };
  return {
    kind: "range",
    startLabel: coverage.slice(0, idx),
    endLabel: coverage.slice(idx + sep.length),
  };
}

/**
 * One centered chart-footer string from actual plotted first/last dayKeys.
 * Always includes year on both endpoints: `MMM d, yyyy – MMM d, yyyy`.
 * Single day → `MMM d, yyyy`.
 */
export function formatWeightTrendObservedCoverageLabel(args: {
  readonly firstDayKey: string;
  readonly lastDayKey: string;
}): string | null {
  const startLabel = formatDayKeyMmmDYyyy(args.firstDayKey);
  const endLabel = formatDayKeyMmmDYyyy(args.lastDayKey);
  if (!startLabel || !endLabel) return null;

  if (args.firstDayKey === args.lastDayKey) {
    return startLabel;
  }

  return `${startLabel} – ${endLabel}`;
}

/** Chart-footer copy when the selected period has no valid plotted points. */
export const WEIGHT_TREND_NO_DATA_AVAILABLE = "No data available";
