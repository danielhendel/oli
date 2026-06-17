import type { DailyFactsDto } from "@/lib/contracts/dailyFacts";
import {
  nutritionRollupToFactsSlice,
  type NutritionDayRollupTotals,
} from "@/lib/data/nutrition/nutritionRawDayRollup";

const MACRO_KEYS = ["totalKcal", "proteinG", "carbsG", "fatG"] as const;

/** True when persisted DailyFacts macros differ materially from a raw-event projection. */
export function nutritionFactsTotalsDiffer(
  rawSlice: DailyFactsDto["nutrition"] | undefined,
  factsSlice: DailyFactsDto["nutrition"] | undefined,
  epsilon = 0.5,
): boolean {
  if (rawSlice == null && factsSlice == null) return false;
  if (rawSlice == null || factsSlice == null) return true;
  return MACRO_KEYS.some((k) => Math.abs((rawSlice[k] ?? 0) - (factsSlice[k] ?? 0)) > epsilon);
}

export type NutritionDisplayNutrition = {
  /** Nutrition slice for card models (prefers raw projection when loaded). */
  nutrition: DailyFactsDto["nutrition"] | undefined;
  /** DailyFacts slice before display merge (for diagnostics). */
  factsNutrition: DailyFactsDto["nutrition"] | undefined;
  /** True when server DailyFacts still disagrees with the raw-event projection. */
  totalsSyncing: boolean;
};

/**
 * Resolves which nutrition totals to show in day-level UI.
 *
 * When raw events for the day are loaded, the logged-meal list and summary card
 * both derive from the same raw-event rollup so delete/edit updates are immediate.
 * DailyFacts remains persisted truth; `totalsSyncing` signals eventual-consistency lag.
 */
export function resolveNutritionDisplayNutrition(args: {
  factsNutrition: DailyFactsDto["nutrition"] | undefined;
  rawRollup: NutritionDayRollupTotals | null;
  rawEventsReady: boolean;
}): NutritionDisplayNutrition {
  const factsNutrition = args.factsNutrition;
  if (!args.rawEventsReady || args.rawRollup == null) {
    return { nutrition: factsNutrition, factsNutrition, totalsSyncing: false };
  }

  const fromRaw = nutritionRollupToFactsSlice(args.rawRollup);
  const totalsSyncing = nutritionFactsTotalsDiffer(fromRaw, factsNutrition);
  return {
    nutrition: fromRaw,
    factsNutrition,
    totalsSyncing,
  };
}
