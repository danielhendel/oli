export const CARDIO_BASELINE_SCALE_MIN_MILES = 0;
export const CARDIO_BASELINE_SCALE_MAX_MILES = 25;
export const CARDIO_BASELINE_MARKER_VALUES_MILES = [0, 2.5, 7.5, 15, 25] as const;
export const CARDIO_BASELINE_MARKER_VISUAL_POSITIONS_01 = [0, 0.25, 0.5, 0.75, 1] as const;

export function cardioBaselineMilesToVisualScale01(milesPerWeek: number): number {
  if (!Number.isFinite(milesPerWeek)) return 0;
  const v = Math.min(CARDIO_BASELINE_SCALE_MAX_MILES, Math.max(CARDIO_BASELINE_SCALE_MIN_MILES, milesPerWeek));
  if (v <= 2.5) return (v / 2.5) * 0.25;
  if (v <= 7.5) return 0.25 + ((v - 2.5) / (7.5 - 2.5)) * 0.25;
  if (v <= 15) return 0.5 + ((v - 7.5) / (15 - 7.5)) * 0.25;
  return 0.75 + ((v - 15) / (25 - 15)) * 0.25;
}

export function cardioBaselineMarkerVisualPosition01(milesMarker: number): number {
  const idx = CARDIO_BASELINE_MARKER_VALUES_MILES.findIndex((v) => v === milesMarker);
  if (idx < 0) return 0;
  return CARDIO_BASELINE_MARKER_VISUAL_POSITIONS_01[idx]!;
}
