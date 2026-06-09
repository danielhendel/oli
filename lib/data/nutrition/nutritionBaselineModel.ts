import type { CanonicalEventListItem } from "@oli/contracts";
import type { DayKey } from "@/lib/ui/calendar/types";
import {
  avgKcalPerDayInWindow,
  avgLoggedDaysPerWeek,
} from "@/lib/data/nutrition/nutritionFactsAggregate";
import {
  trailing30ThroughToday,
  trailing7ThroughToday,
  trailing90ThroughYesterday,
  trailing365ThroughToday,
  ytdThroughToday,
} from "@/lib/data/nutrition/nutritionOverviewDayKeys";
import type { NutritionDailyFactsByDay } from "@/lib/data/nutrition/useNutritionDailyFactsRollup";

export type NutritionBaselineRangeKey = "thisWeek" | "day30" | "day90" | "ytd" | "month12";

export type NutritionBaselineRowLabel = "7 Day" | "30 Day" | "90 Day" | "YTD" | "12 Month";

export type NutritionBaselineRow = {
  key: NutritionBaselineRangeKey;
  label: NutritionBaselineRowLabel;
  hasEnoughData: boolean;
  avgKcalPerDay: number | null;
  avgDaysLoggedPerWeek: number | null;
  displayValue: string;
  helperText?: string;
};

export type NutritionBaselineModel = {
  rows: readonly NutritionBaselineRow[];
  personalizedExplainer: string;
};

export const NUTRITION_BASELINE_GENERIC_EXPLAINER =
  "Your nutrition baseline shows your typical calories and logging consistency once enough history is available.";

function formatKcalPerDay(avg: number): string {
  return `${Math.round(avg).toLocaleString()} kcal/day`;
}

function formatDaysPerWeek(avg: number): string {
  return `${avg.toFixed(1)} days/week`;
}

function buildRow(args: {
  key: NutritionBaselineRangeKey;
  label: NutritionBaselineRowLabel;
  rangeStart: DayKey;
  rangeEnd: DayKey;
  byDay: NutritionDailyFactsByDay;
  events: readonly CanonicalEventListItem[];
  insufficientHelper?: string;
}): NutritionBaselineRow {
  const avgKcal = avgKcalPerDayInWindow(args.byDay, args.rangeStart, args.rangeEnd);
  const avgDays = avgLoggedDaysPerWeek(args.events, args.rangeStart, args.rangeEnd);
  const hasEnoughData = avgKcal != null || avgDays != null;

  let displayValue = "—";
  if (avgKcal != null) {
    displayValue = formatKcalPerDay(avgKcal);
  } else if (avgDays != null) {
    displayValue = formatDaysPerWeek(avgDays);
  }

  return {
    key: args.key,
    label: args.label,
    hasEnoughData,
    avgKcalPerDay: avgKcal,
    avgDaysLoggedPerWeek: avgDays,
    displayValue,
    ...(args.insufficientHelper && !hasEnoughData ? { helperText: args.insufficientHelper } : {}),
  };
}

export function buildNutritionBaselineExplainerCopy(input: {
  day90Row: NutritionBaselineRow | null;
  day7Row: NutritionBaselineRow | null;
}): string {
  const { day90Row, day7Row } = input;
  if (day90Row == null || !day90Row.hasEnoughData || day90Row.avgKcalPerDay == null) {
    return NUTRITION_BASELINE_GENERIC_EXPLAINER;
  }

  const baselineSentence = `Your 90-day nutrition baseline is ${formatKcalPerDay(day90Row.avgKcalPerDay)}.`;

  if (day7Row == null || !day7Row.hasEnoughData || day7Row.avgKcalPerDay == null) {
    return baselineSentence;
  }

  const pct = Math.round(((day7Row.avgKcalPerDay - day90Row.avgKcalPerDay) / day90Row.avgKcalPerDay) * 100);
  if (!Number.isFinite(pct)) return baselineSentence;
  if (pct === 0) {
    return `${baselineSentence} Over the past 7 days, you're averaging about the same as your baseline.`;
  }
  const direction = pct > 0 ? "above" : "below";
  return `${baselineSentence} Over the past 7 days, you're about ${Math.abs(pct)}% ${direction} your baseline.`;
}

export function buildNutritionBaselineModel(input: {
  todayDayKey: DayKey;
  byDay: NutritionDailyFactsByDay;
  nutritionEvents: readonly CanonicalEventListItem[];
}): NutritionBaselineModel {
  const day7 = trailing7ThroughToday(input.todayDayKey);
  const day30 = trailing30ThroughToday(input.todayDayKey);
  const day90 = trailing90ThroughYesterday(input.todayDayKey);
  const ytd = ytdThroughToday(input.todayDayKey);
  const day365 = trailing365ThroughToday(input.todayDayKey);

  const rows: readonly NutritionBaselineRow[] = [
    buildRow({ key: "thisWeek", label: "7 Day", ...day7, byDay: input.byDay, events: input.nutritionEvents }),
    buildRow({ key: "day30", label: "30 Day", ...day30, byDay: input.byDay, events: input.nutritionEvents }),
    buildRow({ key: "day90", label: "90 Day", ...day90, byDay: input.byDay, events: input.nutritionEvents }),
    buildRow({ key: "ytd", label: "YTD", ...ytd, byDay: input.byDay, events: input.nutritionEvents }),
    buildRow({
      key: "month12",
      label: "12 Month",
      ...day365,
      byDay: input.byDay,
      events: input.nutritionEvents,
      insufficientHelper: "Data will appear when enough history is available",
    }),
  ];

  return {
    rows,
    personalizedExplainer: buildNutritionBaselineExplainerCopy({
      day90Row: rows.find((r) => r.key === "day90") ?? null,
      day7Row: rows.find((r) => r.key === "thisWeek") ?? null,
    }),
  };
}
