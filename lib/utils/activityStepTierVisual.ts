import { ACTIVITY_STEP_TIER_BAR_FILL } from "@/lib/ui/overview/activityStepTierBarFills";
import { getStepRatingTierIndex } from "@/lib/utils/activityStepRating";

/**
 * Display-only tier visuals. Bar fills come from {@link ACTIVITY_STEP_TIER_BAR_FILL} (Body segments for
 * most tiers; distinct Good / Great greens; Elite = Body optimal blue).
 * Thresholds live in {@link getStepRatingTierIndex}.
 */

/** Canonical tier keys (order matches {@link getStepRatingTierIndex} 0–5). */
export const ACTIVITY_STEP_TIER_KEYS = ["low", "belowAvg", "average", "good", "great", "elite"] as const;

export type ActivityStepTierKey = (typeof ACTIVITY_STEP_TIER_KEYS)[number];

/** Single fill per tier — bars + Step Ratings dots ({@link ACTIVITY_STEP_TIER_BAR_FILL}). */
export const STEP_TIER_COLORS = {
  low: ACTIVITY_STEP_TIER_BAR_FILL[0],
  belowAvg: ACTIVITY_STEP_TIER_BAR_FILL[1],
  average: ACTIVITY_STEP_TIER_BAR_FILL[2],
  good: ACTIVITY_STEP_TIER_BAR_FILL[3],
  great: ACTIVITY_STEP_TIER_BAR_FILL[4],
  elite: ACTIVITY_STEP_TIER_BAR_FILL[5],
} as const satisfies Record<ActivityStepTierKey, string>;

/**
 * Fixed bar-fill extent per tier (not raw step count). Display-only; thresholds unchanged in
 * {@link getStepRatingTierIndex}.
 */
export const STEP_TIER_FILL = {
  low: 0.16,
  belowAvg: 0.33,
  average: 0.5,
  good: 0.66,
  great: 0.83,
  elite: 1.0,
} as const satisfies Record<ActivityStepTierKey, number>;

/** Neutral track trough — warm, light; slightly lifted from fill for a lighter bar shell. */
export const STEP_TIER_TRACK_INNER_BACKGROUND = "#F8F6F4";

/** Hairline rim — SegmentedZoneTrack-adjacent neutral. */
export const STEP_TIER_TRACK_RIM_BORDER = "rgba(60, 60, 67, 0.09)";

/**
 * Tier key from steps using existing tier index only (no threshold changes).
 * Alias name requested for call-site clarity.
 */
export function getStepTier(steps: number): ActivityStepTierKey {
  return ACTIVITY_STEP_TIER_KEYS[getStepRatingTierIndex(steps)]!;
}

export function activityStepTierFill01(key: ActivityStepTierKey): number {
  return STEP_TIER_FILL[key];
}

export function activityStepTierColor(key: ActivityStepTierKey): string {
  return STEP_TIER_COLORS[key];
}

/** Bar chrome from numeric tier index; null → no colored fill (insufficient / non-numeric row). */
export function activityStepTierBarVisual(tierIndex: number | null): {
  fill01: number;
  fillColor: string;
} | null {
  if (tierIndex == null || tierIndex < 0 || tierIndex >= ACTIVITY_STEP_TIER_KEYS.length) return null;
  const key = ACTIVITY_STEP_TIER_KEYS[tierIndex]!;
  return { fill01: STEP_TIER_FILL[key], fillColor: STEP_TIER_COLORS[key] };
}
