import { MODULE_OVERVIEW_SEGMENT_ZONE_FILLS } from "@/lib/ui/overview/moduleOverviewSegmentZoneFills";

const z = MODULE_OVERVIEW_SEGMENT_ZONE_FILLS;

/**
 * Maps Activity tier index 0–5 → Body / Strength **segment fill** index for tiers that still
 * align with Body chrome (Low–Average + Elite). Good and Great use distinct Activity greens below.
 */
export const ACTIVITY_STEP_TIER_BODY_SEGMENT_INDEX = [0, 2, 1, 3, 3, 4] as const;

/** Active tier (Good band) — aligned with calmer Active pill in {@link ACTIVITY_STEP_RATING_TIERS}. */
const ACTIVITY_GOOD_TIER_ZONE_FILL = "rgba(80, 220, 150, 0.75)";

/** Very Active tier (Great band) — solid fill; distinct from Active for quick scan. */
const ACTIVITY_GREAT_TIER_ZONE_FILL = "rgba(64, 220, 115, 0.85)";

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
