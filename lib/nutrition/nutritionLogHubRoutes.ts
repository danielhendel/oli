import type { DayKey } from "@/lib/ui/calendar/types";
import type { NutritionLogHubMode } from "@/lib/ui/nutrition/NutritionLogHub";

/** Static destination route for each Log Hub mode. */
export const NUTRITION_LOG_HUB_PATHNAME: Readonly<Record<NutritionLogHubMode, string>> = {
  search: "/(app)/nutrition/search",
  kitchen: "/(app)/nutrition/kitchen",
  meals: "/(app)/nutrition/meals",
  supplements: "/(app)/nutrition/supplements",
  manual: "/(app)/nutrition/log",
  scan: "/(app)/nutrition/scan",
};

export type NutritionLogHubHref = {
  pathname: string;
  params: { day: DayKey };
};

/**
 * Build the navigation target for a Log Hub mode, threading the selected day so
 * downstream screens log to the chosen day instead of falling back to today.
 */
export function nutritionLogHubHref(mode: NutritionLogHubMode, dayKey: DayKey): NutritionLogHubHref {
  return { pathname: NUTRITION_LOG_HUB_PATHNAME[mode], params: { day: dayKey } };
}
