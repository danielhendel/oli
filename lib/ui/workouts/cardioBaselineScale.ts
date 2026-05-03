/** Peak band interpolates visually from 40 mi/wk → {@link CARDIO_WEEKLY_MILES_DISPLAY_MAX}; values ≥ max clamp fill at 1. */
export const CARDIO_WEEKLY_MILES_DISPLAY_MAX = 45;

export const CARDIO_BASELINE_SCALE_MIN_MILES = 0;

/** Number of cardio mileage tiers (Very Low → Peak) — equal width on the baseline legend and progress mapping. */
export const CARDIO_BASELINE_TIER_SEGMENT_COUNT = 6;

/**
 * Boundary ticks on the baseline ruler (mi/wk). Final tick labels as "40+" (Peak).
 * Visual positions use {@link CARDIO_BASELINE_MARKER_VISUAL_POSITIONS_01} (equal-tier scale, not linear miles).
 */
export const CARDIO_BASELINE_MARKER_VALUES_MILES = [0, 2.5, 7.5, 15, 25, 40] as const;

/** Tier edges for piecewise mapping: six segments [i,i+1) for i=0..4, last segment [40, {@link CARDIO_WEEKLY_MILES_DISPLAY_MAX}]. */
const CARDIO_BASELINE_SEGMENT_LO_MILES: readonly number[] = [0, 2.5, 7.5, 15, 25, 40];
const CARDIO_BASELINE_SEGMENT_HI_MILES: readonly number[] = [2.5, 7.5, 15, 25, 40, CARDIO_WEEKLY_MILES_DISPLAY_MAX];

/**
 * Marker centers on the **equal-width tier scale** (0 → 1): tick i sits at the start of tier i (i / 6).
 * Matches six equal legend segments — not linear in miles.
 */
export const CARDIO_BASELINE_MARKER_VISUAL_POSITIONS_01: readonly number[] =
  CARDIO_BASELINE_MARKER_VALUES_MILES.map((_, i) => i / CARDIO_BASELINE_TIER_SEGMENT_COUNT);

/**
 * Normalized fill 0 → 1 on the **equal-width tier scale**: each mileage tier spans 1/6 of the bar;
 * within a tier, fill advances proportionally to mileage between that tier’s numeric bounds.
 * Values ≥ {@link CARDIO_WEEKLY_MILES_DISPLAY_MAX} clamp at 1.
 */
export function cardioBaselineMilesToVisualScale01(milesPerWeek: number): number {
  if (!Number.isFinite(milesPerWeek)) return 0;
  const v = Math.max(0, milesPerWeek);
  const peakCap = CARDIO_BASELINE_SEGMENT_HI_MILES[CARDIO_BASELINE_SEGMENT_HI_MILES.length - 1]!;
  if (v >= peakCap) return 1;

  const n = CARDIO_BASELINE_TIER_SEGMENT_COUNT;
  for (let i = 0; i < n; i++) {
    const lo = CARDIO_BASELINE_SEGMENT_LO_MILES[i]!;
    const hi = CARDIO_BASELINE_SEGMENT_HI_MILES[i]!;
    if (v <= hi) {
      const span = hi - lo;
      const t = span <= 0 ? 1 : (v - lo) / span;
      const clamped = Math.min(1, Math.max(0, t));
      return (i + clamped) / n;
    }
  }
  return 1;
}

export function cardioBaselineMarkerVisualPosition01(milesMarker: number): number {
  const idx = CARDIO_BASELINE_MARKER_VALUES_MILES.findIndex((v) => v === milesMarker);
  if (idx < 0) return 0;
  return CARDIO_BASELINE_MARKER_VISUAL_POSITIONS_01[idx]!;
}
