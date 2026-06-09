import type { DailyFactsDto } from "@/lib/contracts";
import type { CanonicalEventListItem } from "@oli/contracts";
import type { DayKey } from "@/lib/ui/calendar/types";
import { daysInRange } from "@/lib/data/nutrition/nutritionOverviewDayKeys";
import type { NutritionDailyFactsByDay } from "@/lib/data/nutrition/useNutritionDailyFactsRollup";

export type NutritionDayMacroTotals = {
  totalKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  hasData: boolean;
};

export function nutritionFromFactsCell(
  byDay: NutritionDailyFactsByDay,
  day: DayKey,
): DailyFactsDto["nutrition"] | undefined {
  const cell = byDay[day];
  if (cell?.status !== "ready") return undefined;
  return cell.nutrition;
}

export function aggregateNutritionTotalsForDays(
  byDay: NutritionDailyFactsByDay,
  days: readonly DayKey[],
): NutritionDayMacroTotals {
  let totalKcal = 0;
  let proteinG = 0;
  let carbsG = 0;
  let fatG = 0;
  let hasData = false;

  for (const day of days) {
    const n = nutritionFromFactsCell(byDay, day);
    if (n?.totalKcal != null && Number.isFinite(n.totalKcal) && n.totalKcal > 0) {
      totalKcal += n.totalKcal;
      hasData = true;
    }
    if (n?.proteinG != null && Number.isFinite(n.proteinG)) proteinG += n.proteinG;
    if (n?.carbsG != null && Number.isFinite(n.carbsG)) carbsG += n.carbsG;
    if (n?.fatG != null && Number.isFinite(n.fatG)) fatG += n.fatG;
  }

  return { totalKcal, proteinG, carbsG, fatG, hasData };
}

export function countLoggedDaysFromEvents(
  events: readonly CanonicalEventListItem[],
  rangeStart: DayKey,
  rangeEnd: DayKey,
): number {
  const allowed = new Set(daysInRange(rangeStart, rangeEnd));
  const logged = new Set<DayKey>();
  for (const e of events) {
    if (e.kind !== "nutrition") continue;
    if (allowed.has(e.day)) logged.add(e.day);
  }
  return logged.size;
}

export function avgKcalPerDayInWindow(
  byDay: NutritionDailyFactsByDay,
  rangeStart: DayKey,
  rangeEnd: DayKey,
): number | null {
  const days = daysInRange(rangeStart, rangeEnd);
  let sum = 0;
  let count = 0;
  for (const day of days) {
    const n = nutritionFromFactsCell(byDay, day);
    if (n?.totalKcal != null && Number.isFinite(n.totalKcal) && n.totalKcal > 0) {
      sum += n.totalKcal;
      count += 1;
    }
  }
  if (count === 0) return null;
  return sum / count;
}

export function avgLoggedDaysPerWeek(
  events: readonly CanonicalEventListItem[],
  rangeStart: DayKey,
  rangeEnd: DayKey,
): number | null {
  const logged = countLoggedDaysFromEvents(events, rangeStart, rangeEnd);
  const dayCount = daysInRange(rangeStart, rangeEnd).length;
  if (dayCount <= 0 || logged === 0) return null;
  return (logged * 7) / dayCount;
}
