import type { StrengthBaselineCardModel } from "@/lib/data/workouts/strengthBaselineCardModel";
import { ACTIVITY_STEP_RATING_TIERS } from "@/lib/utils/activityStepRating";

export type StrengthBaselineDashPresentationReady = {
  kind: "ready";
  /** Dash metric figure only (no `/wk`); subtitle states per-week meaning. */
  valueDigits: string;
  ratingLabel: string;
  pillColor: string;
  pillBackgroundColor: string;
  tierIndexForBar: number;
  fillWidth01: number;
};

export type StrengthBaselineDashPresentation =
  | StrengthBaselineDashPresentationReady
  | { kind: "no_model" };

/**
 * Maps {@link StrengthBaselineCardModel} to Dash Strength baseline pill + frequency bar inputs.
 */
export function strengthBaselineDashPresentationFromModel(
  model: StrengthBaselineCardModel | null,
): StrengthBaselineDashPresentation {
  if (model == null) {
    return { kind: "no_model" };
  }
  const tierIdx = Math.min(model.activityTierIndexForBar, ACTIVITY_STEP_RATING_TIERS.length - 1);
  const tierPill = ACTIVITY_STEP_RATING_TIERS[tierIdx]!;
  return {
    kind: "ready",
    valueDigits: model.avgWorkoutsPerWeek.toFixed(1),
    ratingLabel: model.ratingLabel,
    pillColor: tierPill.color,
    pillBackgroundColor: tierPill.backgroundColor,
    tierIndexForBar: model.activityTierIndexForBar,
    fillWidth01: model.fillWidth01Override,
  };
}
