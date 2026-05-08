/**
 * Shared zone-segments derived from Body Composition's existing interpretation primitives.
 * No new thresholds, no new ranges — only assembling things the body page already exports.
 *
 * Sources of truth (do not change here):
 * - {@link bodyInterpretationZoneQuartileBand} owns the `[lo, hi]` quartile span for each zone.
 *   That's the interpretation-range source-of-truth used by `interpretationZoneFromMarker01` and
 *   the body overview pill marker.
 * - {@link interpretationZoneDisplayLabel} owns the human label for each zone ("Out of range",
 *   "Fair", "Good", "Optimal").
 * - {@link MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME} + {@link BODY_ZONE_TO_VISUAL_SEGMENT_INDEX}
 *   own the per-zone foreground color the body overview already uses for its pill.
 *
 * Why this helper exists: the body overview page renders zones via the shared 5-segment
 * `SegmentedZoneTrack` (Strength's palette, with one unused orange middle). Surfaces that
 * want to draw the **active 4 lean-mass zones** (Dash body hero arc) need the per-zone
 * `[start01, end01]` band + zone color packaged together. Building it locally here keeps
 * the math at the body source-of-truth (no Dash-side range logic).
 */
import {
  type InterpretationQualityZone,
  interpretationZoneDisplayLabel,
} from "./bodyOverviewInterpretationBar";
import {
  BODY_ZONE_TO_VISUAL_SEGMENT_INDEX,
  bodyInterpretationZoneQuartileBand,
} from "./bodyOverviewBarDisplay";
import { MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME } from "@/lib/ui/overview/moduleOverviewStrengthTierPillChrome";

export type BodyInterpretationZoneSegment = {
  /** Stable, unique key per zone (matches {@link InterpretationQualityZone}). */
  key: InterpretationQualityZone;
  /** 0..1 start of this zone along the same scale `bar.marker01` uses. */
  start01: number;
  /** 0..1 end of this zone along the same scale `bar.marker01` uses. */
  end01: number;
  /** Zone foreground color. Sourced from the body overview's pill chrome (no new colors). */
  color: string;
  /** Human label for the zone, identical to the body page's `bar.displayLabel`. */
  label: string;
};

const ZONE_ORDER: readonly InterpretationQualityZone[] = ["out_of_range", "fair", "good", "optimal"];

/**
 * Active lean-mass zones in `marker01` order.
 *
 * Bands come from {@link bodyInterpretationZoneQuartileBand}; colors come from the body
 * overview's existing pill chrome via {@link BODY_ZONE_TO_VISUAL_SEGMENT_INDEX}. The 4
 * segments collectively span [0, 1] with no gaps and no overlap (same partitioning the body
 * interpretation bar already uses to classify a marker into a zone).
 */
export const BODY_INTERPRETATION_ZONE_SEGMENTS: readonly BodyInterpretationZoneSegment[] =
  ZONE_ORDER.map((zone) => {
    const { lo, hi } = bodyInterpretationZoneQuartileBand(zone);
    const segIdx = BODY_ZONE_TO_VISUAL_SEGMENT_INDEX[zone];
    const chrome = MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME[segIdx]!;
    return {
      key: zone,
      start01: lo,
      end01: hi,
      color: chrome.pillFg,
      label: interpretationZoneDisplayLabel(zone),
    };
  });
