import { StyleSheet } from "react-native";

import { STRENGTH_BASELINE_WEEKLY_FREQUENCY_DISPLAY_MAX } from "@/lib/utils/strengthWeeklyFrequencyRating";

/** Matches {@link ActivityTierProgressTrack} rim (`trackRim` `borderWidth`) — same inset as Activity Baseline markers. */
export const STRENGTH_BASELINE_PROGRESS_RIM_INSET_PX = StyleSheet.hairlineWidth;

export function strengthBaselineProgressInnerWidthPx(outerTrackWidthPx: number): number {
  const rim = STRENGTH_BASELINE_PROGRESS_RIM_INSET_PX;
  return Math.max(0, outerTrackWidthPx - 2 * rim);
}

/** Linear 0 → {@link STRENGTH_BASELINE_WEEKLY_FREQUENCY_DISPLAY_MAX}; matches bounded bar fill scale. */
export function strengthBaselineFrequencyThresholdCenterXInOuterPx(
  outerTrackWidthPx: number,
  frequency: number,
): number {
  const max = STRENGTH_BASELINE_WEEKLY_FREQUENCY_DISPLAY_MAX;
  const rim = STRENGTH_BASELINE_PROGRESS_RIM_INSET_PX;
  const inner = strengthBaselineProgressInnerWidthPx(outerTrackWidthPx);
  const center01 = Math.min(1, Math.max(0, frequency / max));
  return rim + center01 * inner;
}

export function strengthBaselineFrequencyThresholdLabelLeftPx(
  outerTrackWidthPx: number,
  frequency: number,
  labelWidthPx: number,
): number {
  const cx = strengthBaselineFrequencyThresholdCenterXInOuterPx(outerTrackWidthPx, frequency);
  const raw = cx - labelWidthPx / 2;
  const maxLeft = Math.max(0, outerTrackWidthPx - labelWidthPx);
  return Math.max(0, Math.min(maxLeft, raw));
}

export function strengthBaselineFrequencyThresholdTickLeftPx(
  outerTrackWidthPx: number,
  frequency: number,
  tickWidthPx: number,
): number {
  const cx = strengthBaselineFrequencyThresholdCenterXInOuterPx(outerTrackWidthPx, frequency);
  const raw = cx - tickWidthPx / 2;
  const maxLeft = Math.max(0, outerTrackWidthPx - tickWidthPx);
  return Math.max(0, Math.min(maxLeft, raw));
}
