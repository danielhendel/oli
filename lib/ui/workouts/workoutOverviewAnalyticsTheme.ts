import { SYSTEM_ACCENT, SYSTEM_ACCENT_TILE_WASH } from "@/lib/ui/theme/systemAccent";

/**
 * Strength progress bars outside the overview (e.g. workout day exercise rows).
 */
export const WORKOUT_STRENGTH_PROGRESS_TRACK_BG = "#E5E5EA";
export const WORKOUT_STRENGTH_PROGRESS_FILL = SYSTEM_ACCENT;

/**
 * Overview card progress bars (Today, weekly cards) — same accent family, full-opacity stroke on track.
 */
export const WORKOUT_STRENGTH_OVERVIEW_PROGRESS_FILL = SYSTEM_ACCENT;

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
