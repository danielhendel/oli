import { CARDIO_RED, WORKOUT_STRENGTH_COLOR } from "@/lib/ui/calendar/WorkoutDayRing";

/**
 * Strength metric tiles: lighter blue than chart {@link WORKOUT_STRENGTH_COLOR} so
 * tiles read soft while bars stay the primary accent.
 */
export const WORKOUT_OVERVIEW_STRENGTH_METRIC_TILE_BG = "#4F8FF7";

/**
 * Cardio metric tiles: lighter red in the same family as {@link CARDIO_RED} for
 * identity without heavy fill next to chart bars.
 */
export const WORKOUT_OVERVIEW_CARDIO_METRIC_TILE_BG = "#F25A52";

export function overviewAccentForTab(tab: "strength" | "cardio"): {
  barColor: string;
  metricTileBg: string;
  tabTextActive: string;
} {
  if (tab === "strength") {
    return {
      barColor: WORKOUT_STRENGTH_COLOR,
      metricTileBg: WORKOUT_OVERVIEW_STRENGTH_METRIC_TILE_BG,
      tabTextActive: WORKOUT_STRENGTH_COLOR,
    };
  }
  return {
    barColor: CARDIO_RED,
    metricTileBg: WORKOUT_OVERVIEW_CARDIO_METRIC_TILE_BG,
    tabTextActive: CARDIO_RED,
  };
}
