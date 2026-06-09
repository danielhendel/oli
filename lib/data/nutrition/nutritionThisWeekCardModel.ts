import type { CanonicalEventListItem } from "@oli/contracts";
import type { DayKey } from "@/lib/ui/calendar/types";
import {
  aggregateNutritionTotalsForDays,
  countLoggedDaysFromEvents,
} from "@/lib/data/nutrition/nutritionFactsAggregate";
import { daysInRange } from "@/lib/data/nutrition/nutritionOverviewDayKeys";
import type { NutritionDailyFactsByDay } from "@/lib/data/nutrition/useNutritionDailyFactsRollup";

export type NutritionThisWeekDayRow = {
  dayKey: DayKey;
  dayLabel: string;
  kcalLabel: string;
  proteinLabel: string;
  logged: boolean;
};

export type NutritionThisWeekCardModel = {
  weekRangeLabel: string;
  avgKcalLabel: string;
  avgProteinLabel: string;
  daysLogged: number;
  daysInWeek: number;
  rows: readonly NutritionThisWeekDayRow[];
  emptyMessage: string;
  hasData: boolean;
};

function formatKcal(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${Math.round(v).toLocaleString()} kcal`;
}

function formatG(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${Math.round(v).toLocaleString()} g`;
}

function weekRangeLabel(weekStart: DayKey, weekEnd: DayKey): string {
  const s = new Date(`${weekStart}T12:00:00`);
  const e = new Date(`${weekEnd}T12:00:00`);
  const sm = s.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const em = e.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${sm}\u2013${em}`;
}

function dayShortLabel(dayKey: DayKey): string {
  const d = new Date(`${dayKey}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

export function buildNutritionThisWeekCardModel(input: {
  weekStart: DayKey;
  weekEnd: DayKey;
  byDay: NutritionDailyFactsByDay;
  nutritionEvents: readonly CanonicalEventListItem[];
}): NutritionThisWeekCardModel {
  const weekDays = daysInRange(input.weekStart, input.weekEnd);
  const totals = aggregateNutritionTotalsForDays(input.byDay, weekDays);
  const daysLogged = countLoggedDaysFromEvents(input.nutritionEvents, input.weekStart, input.weekEnd);
  const hasData = totals.hasData || daysLogged > 0;

  const rows: NutritionThisWeekDayRow[] = weekDays.map((dayKey) => {
    const cell = input.byDay[dayKey];
    const n = cell?.status === "ready" ? cell.nutrition : undefined;
    const logged =
      (n?.totalKcal != null && n.totalKcal > 0) ||
      input.nutritionEvents.some((e) => e.kind === "nutrition" && e.day === dayKey);
    return {
      dayKey,
      dayLabel: dayShortLabel(dayKey),
      kcalLabel: formatKcal(n?.totalKcal ?? null),
      proteinLabel: formatG(n?.proteinG ?? null),
      logged,
    };
  });

  const avgKcal = totals.hasData && daysLogged > 0 ? totals.totalKcal / daysLogged : null;
  const avgProtein = totals.hasData && daysLogged > 0 ? totals.proteinG / daysLogged : null;

  return {
    weekRangeLabel: weekRangeLabel(input.weekStart, input.weekEnd),
    avgKcalLabel: formatKcal(avgKcal),
    avgProteinLabel: formatG(avgProtein),
    daysLogged,
    daysInWeek: weekDays.length,
    rows,
    emptyMessage: "No nutrition logged this week — tap Log Nutrition to get started.",
    hasData,
  };
}
