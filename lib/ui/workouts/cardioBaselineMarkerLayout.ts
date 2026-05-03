import { StyleSheet } from "react-native";

import { CARDIO_BASELINE_MARKER_VISUAL_POSITIONS_01 } from "@/lib/ui/workouts/cardioBaselineScale";
import {
  strengthBaselineProgressInnerWidthPx,
  STRENGTH_BASELINE_PROGRESS_RIM_INSET_PX,
} from "@/lib/ui/workouts/strengthBaselineMarkerLayout";

/** Marker centers follow equal-tier positions ({@link CARDIO_BASELINE_MARKER_VISUAL_POSITIONS_01}) on the inner track width. */
export function cardioBaselineMarkerCenterXInOuterPx(outerTrackWidthPx: number, markerIndex: number): number {
  const rim = STRENGTH_BASELINE_PROGRESS_RIM_INSET_PX;
  const inner = strengthBaselineProgressInnerWidthPx(outerTrackWidthPx);
  const pos01 = CARDIO_BASELINE_MARKER_VISUAL_POSITIONS_01[markerIndex] ?? 0;
  return rim + pos01 * inner;
}

export function cardioBaselineMarkerLabelLeftPx(
  outerTrackWidthPx: number,
  markerIndex: number,
  labelWidthPx: number,
): number {
  const cx = cardioBaselineMarkerCenterXInOuterPx(outerTrackWidthPx, markerIndex);
  const raw = cx - labelWidthPx / 2;
  const maxLeft = Math.max(0, outerTrackWidthPx - labelWidthPx);
  return Math.max(0, Math.min(maxLeft, raw));
}

export function cardioBaselineMarkerTickLeftPx(
  outerTrackWidthPx: number,
  markerIndex: number,
  tickWidthPx: number,
): number {
  const cx = cardioBaselineMarkerCenterXInOuterPx(outerTrackWidthPx, markerIndex);
  const raw = cx - tickWidthPx / 2;
  const maxLeft = Math.max(0, outerTrackWidthPx - tickWidthPx);
  return Math.max(0, Math.min(maxLeft, raw));
}

export const CARDIO_BASELINE_MARKER_TICK_WIDTH_PX = Math.max(1, StyleSheet.hairlineWidth * 2);
