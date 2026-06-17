import type { RawEventListItem } from "@oli/contracts";
import { localCalendarDayKeyFromIsoInTimeZone } from "@oli/contracts";

import {
  hasPositiveNutritionRollupTotals,
  rollupNutritionTotalsFromRawEvents,
} from "@/lib/data/nutrition/nutritionRawDayRollup";
import { formatMetricLogDateFromDayKey } from "@/lib/ui/logs/formatMetricLogDate";

export type NutritionDayLogEntry = {
  dayKey: string;
  totalKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type NutritionDayLogRowVm = {
  entry: NutritionDayLogEntry;
  dateLabel: string;
  primaryMetric: string;
  secondaryMetric: string;
  accessibilityLabel: string;
};

export function buildNutritionDayLogEntries(
  items: readonly RawEventListItem[],
  timeZone: string,
): NutritionDayLogEntry[] {
  const byDay = new Map<string, RawEventListItem[]>();

  for (const item of items) {
    if (item.kind !== "nutrition") continue;
    const dayKey = localCalendarDayKeyFromIsoInTimeZone(item.observedAt, timeZone);
    if (dayKey == null) continue;
    const list = byDay.get(dayKey) ?? [];
    list.push(item);
    byDay.set(dayKey, list);
  }

  const out: NutritionDayLogEntry[] = [];
  for (const [dayKey, dayItems] of byDay) {
    const rollup = rollupNutritionTotalsFromRawEvents(dayItems);
    if (!hasPositiveNutritionRollupTotals(rollup)) continue;
    out.push({
      dayKey,
      totalKcal: rollup.totalKcal,
      proteinG: rollup.proteinG,
      carbsG: rollup.carbsG,
      fatG: rollup.fatG,
    });
  }

  out.sort((a, b) => b.dayKey.localeCompare(a.dayKey));
  return out;
}

export function buildNutritionDayLogRowVm(entry: NutritionDayLogEntry): NutritionDayLogRowVm {
  const dateLabel = formatMetricLogDateFromDayKey(entry.dayKey);
  const primaryMetric = `Calories ${entry.totalKcal.toLocaleString()} kcal`;
  const secondaryMetric = `Protein ${Math.round(entry.proteinG)} g · Carbs ${Math.round(entry.carbsG)} g · Fat ${Math.round(entry.fatG)} g`;
  return {
    entry,
    dateLabel,
    primaryMetric,
    secondaryMetric,
    accessibilityLabel: `${dateLabel}. ${primaryMetric}. ${secondaryMetric}`,
  };
}
