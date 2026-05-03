import type { StrengthWeeklyFrequencyTierBand } from "@/lib/utils/strengthWeeklyFrequencyRating";

/** Short explainer (presentation-only) for Strength weekly-frequency tiers on the range sheet. */
export const STRENGTH_RANGE_TIER_EXPLANATIONS: Record<StrengthWeeklyFrequencyTierBand, string> = {
  0: "Few or no dedicated strength sessions in this window — often recovery or a lighter phase.",
  1: "Getting started or maintaining lightly — enough signal to build consistency over time.",
  2: "Regular strength work — a sustainable rhythm for most training goals.",
  3: "Strong consistency — you’re prioritizing strength frequently across the range.",
  4: "Very dedicated frequency — high adherence relative to typical schedules.",
  5: "Peak weekly frequency — sustained strength emphasis at the top of the scale (display runs through 7 workouts/week).",
};
