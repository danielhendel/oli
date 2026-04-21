import { StyleSheet } from "react-native";

import { ACTIVITY_BASELINE_THRESHOLD_MARKER_TRACK_MAX_STEPS } from "@/lib/utils/activityStepRating";

/** Matches {@link ActivityTierProgressTrack} rim (`trackRim` `borderWidth`) so markers align to inner track. */
export const ACTIVITY_BASELINE_PROGRESS_RIM_INSET_PX = StyleSheet.hairlineWidth;

/** Inner drawable width of the bar for a measured outer track width (same box model as progress rim). */
export function activityBaselineProgressInnerWidthPx(outerTrackWidthPx: number): number {
  const rim = ACTIVITY_BASELINE_PROGRESS_RIM_INSET_PX;
  return Math.max(0, outerTrackWidthPx - 2 * rim);
}

/**
 * Horizontal center of a step threshold on the **outer** track coordinate system (0 = left edge of
 * `trackWrap`), linear on the bounded **0 → {@link ACTIVITY_BASELINE_THRESHOLD_MARKER_TRACK_MAX_STEPS}**
 * inner segment — matches Activity bounded bar fill (`activityStepsDisplayScaleFill01` scale).
 */
export function activityBaselineThresholdCenterXInOuterPx(
  outerTrackWidthPx: number,
  thresholdSteps: number,
): number {
  const max = ACTIVITY_BASELINE_THRESHOLD_MARKER_TRACK_MAX_STEPS;
  const rim = ACTIVITY_BASELINE_PROGRESS_RIM_INSET_PX;
  const inner = activityBaselineProgressInnerWidthPx(outerTrackWidthPx);
  const center01 = Math.min(1, Math.max(0, thresholdSteps / max));
  return rim + center01 * inner;
}

/** Left edge for a label centered on `thresholdSteps`, clamped to the outer track. */
export function activityBaselineThresholdLabelLeftPx(
  outerTrackWidthPx: number,
  thresholdSteps: number,
  labelWidthPx: number,
): number {
  const cx = activityBaselineThresholdCenterXInOuterPx(outerTrackWidthPx, thresholdSteps);
  const raw = cx - labelWidthPx / 2;
  const maxLeft = Math.max(0, outerTrackWidthPx - labelWidthPx);
  return Math.max(0, Math.min(maxLeft, raw));
}

/** Left edge for a tick centered on `thresholdSteps`, clamped to the outer track. */
export function activityBaselineThresholdTickLeftPx(
  outerTrackWidthPx: number,
  thresholdSteps: number,
  tickWidthPx: number,
): number {
  const cx = activityBaselineThresholdCenterXInOuterPx(outerTrackWidthPx, thresholdSteps);
  const raw = cx - tickWidthPx / 2;
  const maxLeft = Math.max(0, outerTrackWidthPx - tickWidthPx);
  return Math.max(0, Math.min(maxLeft, raw));
}
