import type { CanonicalEventListItem } from "@oli/contracts";
import type { CalendarDay, DayKey } from "@/lib/ui/calendar/types";

export type NutritionDayStripMeta = {
  hasNutrition: boolean;
};

/**
 * Week strip markers: days with at least one canonical `nutrition` event.
 */
export function buildNutritionWeeklyStripMeta(
  weekDays: readonly DayKey[],
  nutritionEvents: readonly CanonicalEventListItem[],
): CalendarDay<NutritionDayStripMeta>[] {
  const inWeek = new Set(weekDays);
  const withData = new Set<DayKey>();
  for (const e of nutritionEvents) {
    if (e.kind === "nutrition" && inWeek.has(e.day)) {
      withData.add(e.day);
    }
  }
  return weekDays.map((day) => ({
    day,
    meta: { hasNutrition: withData.has(day) },
  }));
}
