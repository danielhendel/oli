import { CARDIO_RED, WORKOUT_STRENGTH_COLOR } from "@/lib/ui/calendar/WorkoutDayRing";

/**
 * Strength progress bars outside the overview (e.g. workout day exercise rows): system strength accent.
 */
export const WORKOUT_STRENGTH_PROGRESS_TRACK_BG = "#E5E5EA";
export const WORKOUT_STRENGTH_PROGRESS_FILL = WORKOUT_STRENGTH_COLOR;

/**
 * Medium-light strength blue for Strength overview progress bars (Today, Weekly Strength, Weekly Muscle Group).
 *
 * - Softer than {@link WORKOUT_STRENGTH_COLOR} (`#007AFF`, monthly/yearly chart bars).
 * - More legible than the calendar inner-disk wash (`STRENGTH_ACCENT_LIGHT` in WorkoutDayRing, ~11% opacity).
 *
 * Value: 50% RGB blend of chart blue `#007AFF` and the wash base `#4A9EF5` (ring stroke family).
 */
export const WORKOUT_STRENGTH_OVERVIEW_PROGRESS_FILL = "#258CFA";

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
