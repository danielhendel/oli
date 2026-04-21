import type { ActivityDailyDetailsCardModel } from "@/lib/data/activity/activityOverviewCardModel";
import { ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA } from "@/lib/data/activity/activityOverviewSufficiency";
import { getStepRatingTierIndex, stepsFromLocaleDigitString } from "@/lib/utils/activityStepRating";

/**
 * Activity baseline interpretation band — mirrors {@link getStepRatingTierIndex} tiers 0–5 (thresholds unchanged).
 */
export type ActivityTier =
  | "sedentary"
  | "lightlyActive"
  | "moderatelyActive"
  | "active"
  | "veryActive"
  | "highlyActive";

export function activityTierFromStepRatingTierIndex(tierIndex: number): ActivityTier {
  const tiers: ActivityTier[] = [
    "sedentary",
    "lightlyActive",
    "moderatelyActive",
    "active",
    "veryActive",
    "highlyActive",
  ];
  return tiers[Math.min(Math.max(Math.floor(tierIndex), 0), 5)]!;
}

/** When the 90-day window lacks full numeric coverage — neutral, non-blaming. */
export const ACTIVITY_BASELINE_INSUFFICIENT_EXPLAINER =
  "Once enough complete daily rollups are available across the baseline window, this summary will reflect your typical activity level and tier.";

/**
 * Personalized copy for the Activity Baseline card (interpretation only; thresholds unchanged).
 * Tone: descriptive and educational, not diagnostic.
 */
export function getActivityBaselineExplanation(tier: ActivityTier): string {
  switch (tier) {
    case "sedentary":
      return (
        "Your baseline reflects a low level of daily movement compared with common population step benchmarks. " +
        "It summarizes your typical steps across the last 90 completed days—not any single calendar day—and will change if your usual activity pattern changes."
      );
    case "lightlyActive":
      return (
        "Your baseline shows a lightly active routine: more movement than sedentary patterns, with room to shift toward higher activity bands if you choose. " +
        "It is an average over completed days in your rolling window, not a judgment about any one day."
      );
    case "moderatelyActive":
      return (
        "Your baseline reflects a moderate activity level aligned with widely used daily-step ranges associated with regular movement for many adults. " +
        "Use it to notice stability or gradual change over time rather than day-to-day fluctuation."
      );
    case "active":
      return (
        "Your baseline shows a strong and consistent level of daily movement relative to common targets. " +
        "Because it averages completed days in your baseline window, it highlights your typical pattern more than occasional high- or low-step days."
      );
    case "veryActive":
      return (
        "Your baseline reflects a high level of daily movement sustained across your recent completed days. " +
        "For many people, sustained high averages relate to cardiovascular and metabolic benefits, but individual context—work, sport, mobility—always matters."
      );
    case "highlyActive":
      return (
        "Your baseline indicates an exceptionally high level of habitual daily movement compared with typical population ranges. " +
        "Such averages often reflect demanding training, physically active work, or other intense routines; trends over completed days matter more than any single week."
      );
  }
}

/** View layer: derive tier-only explainer from the baseline card model (no new data sources). */
export function resolveActivityBaselineFooterCaption(model: ActivityDailyDetailsCardModel | null): string | undefined {
  if (model == null) return undefined;
  const raw = model.compactStatsSummary.trim();
  if (raw === ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA) {
    return ACTIVITY_BASELINE_INSUFFICIENT_EXPLAINER;
  }
  const m = raw.match(/^([\d,]+)\s+steps$/i);
  if (!m) return undefined;
  const steps = Math.round(stepsFromLocaleDigitString(m[1]!));
  const tier = activityTierFromStepRatingTierIndex(getStepRatingTierIndex(steps));
  return getActivityBaselineExplanation(tier);
}
