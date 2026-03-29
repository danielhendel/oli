// lib/data/nutrition/buildNutritionRecentLoggingItems.ts
import type { DayKey } from "@/lib/ui/calendar/types";
import type { NutritionLogParsed } from "@/lib/nutrition/nutritionLogForm";
import type { NutritionLogFormFields } from "@/lib/nutrition/nutritionLogForm";

export type NutritionRecentLoggingItem = {
  id: string;
  savedAt: string;
  dayKey: DayKey;
  title: string;
  totalKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
};

export function nutritionParsedToRecentItem(args: {
  id: string;
  savedAt: string;
  dayKey: DayKey;
  values: NutritionLogParsed;
}): NutritionRecentLoggingItem {
  return {
    id: args.id,
    savedAt: args.savedAt,
    dayKey: args.dayKey,
    title: `Day total · ${args.dayKey}`,
    totalKcal: args.values.totalKcal,
    proteinG: args.values.proteinG,
    carbsG: args.values.carbsG,
    fatG: args.values.fatG,
    fiberG: args.values.fiberG,
  };
}

/** Newest first. */
export function sortRecentLoggingItemsNewestFirst(
  items: readonly NutritionRecentLoggingItem[],
): NutritionRecentLoggingItem[] {
  return [...items].sort((a, b) => (a.savedAt < b.savedAt ? 1 : a.savedAt > b.savedAt ? -1 : 0));
}

/** Dedupe by macro signature + day, keep newest. */
export function dedupeRecentLoggingItems(
  items: readonly NutritionRecentLoggingItem[],
): NutritionRecentLoggingItem[] {
  const keyOf = (i: NutritionRecentLoggingItem) =>
    `${i.dayKey}|${i.totalKcal}|${i.proteinG}|${i.carbsG}|${i.fatG}|${i.fiberG ?? ""}`;
  const map = new Map<string, NutritionRecentLoggingItem>();
  for (const i of sortRecentLoggingItemsNewestFirst(items)) {
    const k = keyOf(i);
    if (!map.has(k)) map.set(k, i);
  }
  return sortRecentLoggingItemsNewestFirst([...map.values()]);
}

export function recentItemToDraftFields(item: NutritionRecentLoggingItem): NutritionLogFormFields {
  const fiber =
    item.fiberG != null && Number.isFinite(item.fiberG) && item.fiberG > 0
      ? String(item.fiberG % 1 === 0 ? item.fiberG : Math.round(item.fiberG * 100) / 100)
      : "";
  return {
    totalKcal: String(item.totalKcal),
    proteinG: String(item.proteinG),
    carbsG: String(item.carbsG),
    fatG: String(item.fatG),
    fiberG: fiber,
  };
}
