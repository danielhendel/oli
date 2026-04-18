import { MODULE_OVERVIEW_SEGMENT_ZONE_FILLS } from "@/lib/ui/overview/moduleOverviewSegmentZoneFills";

const z = MODULE_OVERVIEW_SEGMENT_ZONE_FILLS;

/**
 * Maps Activity tier index 0–5 → Body / Strength **segment fill** index for tiers that still
 * align with Body chrome (Low–Average + Elite). Good and Great use distinct Activity greens below.
 */
export const ACTIVITY_STEP_TIER_BODY_SEGMENT_INDEX = [0, 2, 1, 3, 3, 4] as const;

/** Good tier — #7FBF9F at ~35% on white (same alpha scale as {@link MODULE_OVERVIEW_SEGMENT_ZONE_FILLS}). */
const ACTIVITY_GOOD_TIER_ZONE_FILL = "rgba(127, 191, 159, 0.35)";

/** Great tier — #4ED26F at ~35% on white (matches Good’s alpha scale). */
const ACTIVITY_GREAT_TIER_ZONE_FILL = "rgba(78, 210, 111, 0.35)";

/**
 * Single-fill color per Activity tier — Body segment tokens where shared; distinct greens for Good vs Great;
 * Elite uses Body optimal (blue) unchanged.
 * Order: Low → Below Avg → Average → Good → Great → Elite.
 */
export const ACTIVITY_STEP_TIER_BAR_FILL = [
  z[ACTIVITY_STEP_TIER_BODY_SEGMENT_INDEX[0]],
  z[ACTIVITY_STEP_TIER_BODY_SEGMENT_INDEX[1]],
  z[ACTIVITY_STEP_TIER_BODY_SEGMENT_INDEX[2]],
  ACTIVITY_GOOD_TIER_ZONE_FILL,
  ACTIVITY_GREAT_TIER_ZONE_FILL,
  z[ACTIVITY_STEP_TIER_BODY_SEGMENT_INDEX[5]],
] as const;
