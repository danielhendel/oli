import { SYSTEM_ACCENT, SYSTEM_ACCENT_TILE_WASH } from "@/lib/ui/theme/systemAccent";
import { UI_PROGRESS_TRACK_EMPTY } from "@/lib/ui/theme/uiTokens";

/**
 * Strength progress bars outside the overview (e.g. workout day exercise rows).
 */
export const WORKOUT_STRENGTH_PROGRESS_TRACK_BG = UI_PROGRESS_TRACK_EMPTY;

/** Saturated greens/orange for Today rows + Strength overview bars on dark cards (thresholds unchanged). */
export const WORKOUT_OVERVIEW_PROGRESS_FILL_ACTIVITY = "#38D966";
export const WORKOUT_OVERVIEW_PROGRESS_FILL_STRENGTH = "#4DEB7A";
export const WORKOUT_OVERVIEW_PROGRESS_FILL_CARDIO = "#FFB347";

export const WORKOUT_STRENGTH_PROGRESS_FILL = WORKOUT_OVERVIEW_PROGRESS_FILL_STRENGTH;

/**
 * Overview card progress bars (Today “Workout Min”, weekly Strength cards) — strength green on dark track.
 */
export const WORKOUT_STRENGTH_OVERVIEW_PROGRESS_FILL = WORKOUT_OVERVIEW_PROGRESS_FILL_STRENGTH;

/** Metric tiles under charts — shared light wash for Strength and Cardio (unified accent). */
export const WORKOUT_OVERVIEW_STRENGTH_METRIC_TILE_BG = SYSTEM_ACCENT_TILE_WASH;
export const WORKOUT_OVERVIEW_CARDIO_METRIC_TILE_BG = SYSTEM_ACCENT_TILE_WASH;

const UNIFIED_TAB = {
  barColor: SYSTEM_ACCENT,
  metricTileBg: WORKOUT_OVERVIEW_STRENGTH_METRIC_TILE_BG,
  tabTextActive: SYSTEM_ACCENT,
} as const;

/**
 * Strength vs Cardio tabs share the system accent; domain is kept for API stability.
 */
export function overviewAccentForTab(_tab: "strength" | "cardio"): {
  barColor: string;
  metricTileBg: string;
  tabTextActive: string;
} {
  void _tab;
  return {
    barColor: UNIFIED_TAB.barColor,
    metricTileBg: UNIFIED_TAB.metricTileBg,
    tabTextActive: UNIFIED_TAB.tabTextActive,
  };
}
