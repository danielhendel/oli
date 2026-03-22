import { CARDIO_RED, WORKOUT_STRENGTH_COLOR } from "@/lib/ui/calendar/WorkoutDayRing";

/**
 * Strength metric tiles: same hue, slightly deeper than {@link WORKOUT_STRENGTH_COLOR}
 * so white captions stay readable at small sizes.
 */
export const WORKOUT_OVERVIEW_STRENGTH_METRIC_TILE_BG = "#0051D5";

/**
 * Cardio metric tiles: deeper red in the same family as calendar {@link CARDIO_RED}
 * for small-label contrast with white text.
 */
export const WORKOUT_OVERVIEW_CARDIO_METRIC_TILE_BG = "#D63027";

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
