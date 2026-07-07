/**
 * Pure view-model for the Body hero Weight graph card.
 *
 * User-selected lookback ranges drive chart points, axis ticks, and delta feedback.
 * Delta compares the latest reading in-range to the earliest available reading in-range
 * (not a synthetic value at the exact window start when no sample exists that day).
 */
import type { BodyWeightSample } from "@/lib/data/body/bodyWeightDailySeries";
import {
  dailyLatestWeightSeries,
  formatSignedWeightDeltaAccessibilityLabel,
  formatSignedWeightDeltaLabel,
  weightInUnit,
} from "@/lib/data/body/bodyWeightDailySeries";
import { formatDayKeyShortMonthDay } from "@/lib/ui/calendar/dayKeyDisplayFormat";
import { addCalendarDaysToDayKey } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

export type WeightHeroRangeKey = "7D" | "30D" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "10Y";

export type WeightHeroRangeOption = {
  key: WeightHeroRangeKey;
  compactLabel: string;
  feedbackLabel: string;
  lookbackDays: number;
};

export const WEIGHT_HERO_RANGE_OPTIONS: readonly WeightHeroRangeOption[] = [
  { key: "7D", compactLabel: "7D", feedbackLabel: "7 days", lookbackDays: 7 },
  { key: "30D", compactLabel: "30D", feedbackLabel: "30 days", lookbackDays: 30 },
  { key: "3M", compactLabel: "3M", feedbackLabel: "3 months", lookbackDays: 90 },
  { key: "6M", compactLabel: "6M", feedbackLabel: "6 months", lookbackDays: 182 },
  { key: "1Y", compactLabel: "1Y", feedbackLabel: "1 year", lookbackDays: 365 },
  { key: "3Y", compactLabel: "3Y", feedbackLabel: "3 years", lookbackDays: 1095 },
  { key: "5Y", compactLabel: "5Y", feedbackLabel: "5 years", lookbackDays: 1825 },
  { key: "10Y", compactLabel: "10Y", feedbackLabel: "10 years", lookbackDays: 3650 },
] as const;

export const WEIGHT_HERO_DEFAULT_RANGE: WeightHeroRangeKey = "30D";

export const WEIGHT_HERO_INSUFFICIENT_TREND_COPY = "Not enough data for trend";

export type WeightHeroChartPoint = {
  dayKey: DayKey;
  weightKg: number;
  isToday: boolean;
};

export type WeightHeroAxisTick = {
  /** 0–1 position along the chart width. */
  position: number;
  label: string;
};

export type WeightHeroTargetBandKg = {
  loKg: number;
  hiKg: number;
};

export type WeightHeroGraphModel = {
  unit: "kg" | "lb";
  selectedRange: WeightHeroRangeKey;
  selectedRangeCompactLabel: string;
  selectedRangeFeedbackLabel: string;
  deltaLabel: string | null;
  deltaKg: number | null;
  insufficientTrend: boolean;
  chartPoints: readonly WeightHeroChartPoint[];
  axisTicks: readonly WeightHeroAxisTick[];
  earliestPointDayKey: DayKey | null;
  latestPointDayKey: DayKey | null;
  targetBandKg: WeightHeroTargetBandKg | null;
  isEmpty: boolean;
  hasLine: boolean;
  accessibilityLabel: string;
};

const WEEKDAY_LETTER = ["S", "M", "T", "W", "T", "F", "S"] as const;

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

export function weightHeroRangeOption(key: WeightHeroRangeKey): WeightHeroRangeOption {
  return WEIGHT_HERO_RANGE_OPTIONS.find((o) => o.key === key) ?? WEIGHT_HERO_RANGE_OPTIONS[0]!;
}

export function windowStartForWeightHeroRange(
  range: WeightHeroRangeKey,
  todayDayKey: DayKey,
): DayKey {
  const { lookbackDays } = weightHeroRangeOption(range);
  return addCalendarDaysToDayKey(todayDayKey, -lookbackDays);
}

function weekdayLetter(dayKey: DayKey): string {
  const d = new Date(`${dayKey}T12:00:00.000Z`);
  return WEEKDAY_LETTER[d.getUTCDay()] ?? "";
}

function monthShort(dayKey: DayKey): string {
  const d = new Date(`${dayKey}T12:00:00.000Z`);
  return MONTH_SHORT[d.getUTCMonth()] ?? "";
}

function monthYearLabel(dayKey: DayKey): string {
  const d = new Date(`${dayKey}T12:00:00.000Z`);
  const month = MONTH_SHORT[d.getUTCMonth()] ?? "";
  const year = d.getUTCFullYear();
  return `${month} '${String(year).slice(-2)}`;
}

function yearLabel(dayKey: DayKey): string {
  const d = new Date(`${dayKey}T12:00:00.000Z`);
  return String(d.getUTCFullYear());
}

function positionForIndex(index: number, count: number): number {
  if (count <= 1) return 0.5;
  return index / (count - 1);
}

function uniqueIndices(indices: number[], count: number): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const raw of indices) {
    const i = Math.max(0, Math.min(count - 1, raw));
    if (!seen.has(i)) {
      seen.add(i);
      out.push(i);
    }
  }
  return out.sort((a, b) => a - b);
}

/** Build readable axis ticks for the selected range without per-point flex columns. */
export function buildWeightHeroAxisTicks(
  points: readonly { dayKey: DayKey }[],
  range: WeightHeroRangeKey,
): WeightHeroAxisTick[] {
  const n = points.length;
  if (n === 0) return [];

  if (range === "7D") {
    if (n <= 8) {
      return points.map((p, i) => ({
        position: positionForIndex(i, n),
        label: weekdayLetter(p.dayKey),
      }));
    }
    const indices = uniqueIndices([0, Math.floor((n - 1) / 2), n - 1], n);
    return indices.map((i) => ({
      position: positionForIndex(i, n),
      label: weekdayLetter(points[i]!.dayKey),
    }));
  }

  if (range === "30D") {
    const indices = uniqueIndices([0, n - 1], n);
    return indices.map((i) => ({
      position: positionForIndex(i, n),
      label: formatDayKeyShortMonthDay(points[i]!.dayKey),
    }));
  }

  if (range === "3M" || range === "6M") {
    const monthChangeIndices: number[] = [0];
    for (let i = 1; i < n; i++) {
      const prev = points[i - 1]!.dayKey.slice(0, 7);
      const cur = points[i]!.dayKey.slice(0, 7);
      if (cur !== prev) monthChangeIndices.push(i);
    }
    if (monthChangeIndices[monthChangeIndices.length - 1] !== n - 1) {
      monthChangeIndices.push(n - 1);
    }
    const maxTicks = range === "3M" ? 4 : 6;
    const indices =
      monthChangeIndices.length <= maxTicks
        ? monthChangeIndices
        : uniqueIndices(
            [0, Math.floor((n - 1) / 3), Math.floor((2 * (n - 1)) / 3), n - 1],
            n,
          );
    return uniqueIndices(indices, n).map((i) => ({
      position: positionForIndex(i, n),
      label: monthShort(points[i]!.dayKey),
    }));
  }

  const yearChangeIndices: number[] = [0];
  for (let i = 1; i < n; i++) {
    const prevYear = points[i - 1]!.dayKey.slice(0, 4);
    const curYear = points[i]!.dayKey.slice(0, 4);
    if (curYear !== prevYear) yearChangeIndices.push(i);
  }
  if (yearChangeIndices[yearChangeIndices.length - 1] !== n - 1) {
    yearChangeIndices.push(n - 1);
  }

  const useYearOnly = range === "3Y" || range === "5Y" || range === "10Y";
  const maxTicks = range === "1Y" ? 5 : 6;
  const indices =
    yearChangeIndices.length <= maxTicks
      ? yearChangeIndices
      : uniqueIndices(
          [0, Math.floor((n - 1) / 3), Math.floor((2 * (n - 1)) / 3), n - 1],
          n,
        );

  return uniqueIndices(indices, n).map((i) => ({
    position: positionForIndex(i, n),
    label: useYearOnly ? yearLabel(points[i]!.dayKey) : monthYearLabel(points[i]!.dayKey),
  }));
}

function formatDeltaLabel(deltaKg: number, unit: "kg" | "lb", feedbackLabel: string): string {
  const signed = formatSignedWeightDeltaLabel(deltaKg, unit);
  if (deltaKg === 0) return `0.0 ${unit} over ${feedbackLabel}`;
  return `${signed} over ${feedbackLabel}`;
}

export function buildWeightHeroGraphModel(input: {
  todayDayKey: DayKey;
  samples: readonly BodyWeightSample[];
  unit: "kg" | "lb";
  selectedRange: WeightHeroRangeKey;
  targetBandKg?: WeightHeroTargetBandKg | null;
}): WeightHeroGraphModel {
  const { todayDayKey, samples, unit, selectedRange } = input;
  const rangeOption = weightHeroRangeOption(selectedRange);
  const series = dailyLatestWeightSeries(samples);
  const windowStart = windowStartForWeightHeroRange(selectedRange, todayDayKey);
  const windowPoints = series.filter((d) => d.dayKey >= windowStart && d.dayKey <= todayDayKey);

  const isEmpty = windowPoints.length === 0;
  const insufficientTrend = !isEmpty && windowPoints.length < 2;
  const hasLine = windowPoints.length >= 2;

  const earliest = windowPoints[0] ?? null;
  const latest = windowPoints[windowPoints.length - 1] ?? null;

  let deltaKg: number | null = null;
  let deltaLabel: string | null = null;
  if (hasLine && earliest != null && latest != null) {
    deltaKg = latest.weightKg - earliest.weightKg;
    deltaLabel = formatDeltaLabel(deltaKg, unit, rangeOption.feedbackLabel);
  }

  const chartPoints: WeightHeroChartPoint[] = windowPoints.map((p) => ({
    dayKey: p.dayKey,
    weightKg: p.weightKg,
    isToday: p.dayKey === todayDayKey,
  }));

  const axisTicks = buildWeightHeroAxisTicks(windowPoints, selectedRange);

  const deltaA11y =
    deltaKg != null
      ? `${formatSignedWeightDeltaAccessibilityLabel(deltaKg, unit)} over ${rangeOption.feedbackLabel}.`
      : insufficientTrend
        ? WEIGHT_HERO_INSUFFICIENT_TREND_COPY
        : "No weight readings in this range.";

  const accessibilityLabel = isEmpty
    ? `Weight trend. No readings in the last ${rangeOption.feedbackLabel}.`
    : `Weight trend, ${rangeOption.feedbackLabel}. ${deltaA11y}`;

  return {
    unit,
    selectedRange,
    selectedRangeCompactLabel: rangeOption.compactLabel,
    selectedRangeFeedbackLabel: rangeOption.feedbackLabel,
    deltaLabel,
    deltaKg,
    insufficientTrend,
    chartPoints,
    axisTicks,
    earliestPointDayKey: earliest?.dayKey ?? null,
    latestPointDayKey: latest?.dayKey ?? null,
    targetBandKg: input.targetBandKg ?? null,
    isEmpty,
    hasLine,
    accessibilityLabel,
  };
}

/** Exposed for tests — converts kg band to display unit bounds. */
export function weightBandInDisplayUnit(
  band: WeightHeroTargetBandKg,
  unit: "kg" | "lb",
): { lo: number; hi: number } {
  return {
    lo: weightInUnit(band.loKg, unit),
    hi: weightInUnit(band.hiKg, unit),
  };
}
