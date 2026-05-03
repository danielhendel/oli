// Display-only mapping: Body’s 4 interpretation zones → shared 5-segment overview chrome + marker position.
// Does not change {@link buildInterpretationBarModels} output; use only in overview UI.

import type { InterpretationBarModel, InterpretationQualityZone } from "./bodyOverviewInterpretationBar";
import { MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME } from "@/lib/ui/overview/moduleOverviewStrengthTierPillChrome";
import { UI_PROGRESS_TRACK_EMPTY, UI_TEXT_TERTIARY_LABEL } from "@/lib/ui/theme/uiTokens";

/** Must match {@link interpretationZoneFromMarker01} quartile bands on raw marker01. */
export function bodyInterpretationZoneQuartileBand(zone: InterpretationQualityZone): { lo: number; hi: number } {
  switch (zone) {
    case "out_of_range":
      return { lo: 0, hi: 0.25 };
    case "fair":
      return { lo: 0.25, hi: 0.5 };
    case "good":
      return { lo: 0.5, hi: 0.75 };
    case "optimal":
      return { lo: 0.75, hi: 1 };
  }
}

/**
 * Body zone → shared visual segment index (0=red … 4=blue). Segment 2 (orange) is unused so
 * “good” maps to green (Strength “Strong”) and “optimal” to blue (Strength “Optimal”).
 */
export const BODY_ZONE_TO_VISUAL_SEGMENT_INDEX: Record<InterpretationQualityZone, 0 | 1 | 2 | 3 | 4> = {
  out_of_range: 0,
  fair: 1,
  good: 3,
  optimal: 4,
};

const SEGMENT_COUNT = 5;

const NEUTRAL_PILL = { pillBg: UI_PROGRESS_TRACK_EMPTY, pillFg: UI_TEXT_TERTIARY_LABEL } as const;

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0.5;
  return Math.min(1, Math.max(0, x));
}

/**
 * Maps raw interpretation marker01 within the zone’s quartile band onto the mapped segment’s span
 * so the dot stays inside the correct colored stripe.
 */
export function computeBodyOverviewDisplayMarker01(bar: InterpretationBarModel): number {
  if (!bar.hasValue) return 0.5;
  const { lo, hi } = bodyInterpretationZoneQuartileBand(bar.zone);
  const span = hi - lo;
  const idx = BODY_ZONE_TO_VISUAL_SEGMENT_INDEX[bar.zone];
  const segStart = idx / SEGMENT_COUNT;
  const segEnd = (idx + 1) / SEGMENT_COUNT;
  const segWidth = segEnd - segStart;
  const t = span > 0 ? clamp01((bar.marker01 - lo) / span) : 0.5;
  return segStart + t * segWidth;
}

export type BodyOverviewBarDisplay = {
  /** 0–1 along the shared track for {@link SegmentedZoneTrack} only. */
  displayMarker01: number;
  pillBg: string;
  pillFg: string;
  markerDotColor: string;
  /** Shared segment index, or null when there is no measurement. */
  visualSegmentIndex: 0 | 1 | 2 | 3 | 4 | null;
};

export function getBodyOverviewBarDisplay(bar: InterpretationBarModel): BodyOverviewBarDisplay {
  if (!bar.hasValue) {
    return {
      displayMarker01: 0.5,
      pillBg: NEUTRAL_PILL.pillBg,
      pillFg: NEUTRAL_PILL.pillFg,
      markerDotColor: NEUTRAL_PILL.pillFg,
      visualSegmentIndex: null,
    };
  }
  const visualSegmentIndex = BODY_ZONE_TO_VISUAL_SEGMENT_INDEX[bar.zone];
  const chrome = MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME[visualSegmentIndex];
  return {
    displayMarker01: computeBodyOverviewDisplayMarker01(bar),
    pillBg: chrome.pillBg,
    pillFg: chrome.pillFg,
    markerDotColor: chrome.pillFg,
    visualSegmentIndex,
  };
}
