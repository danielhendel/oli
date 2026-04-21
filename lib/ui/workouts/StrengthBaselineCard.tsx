import React from "react";

import type { StrengthBaselineCardModel } from "@/lib/data/workouts/strengthBaselineCardModel";
import { STRENGTH_BASELINE_CARD_DEFINITION_SENTENCE } from "@/lib/ui/workouts/strengthBaselineCopy";
import { StrengthFrequencyMetricCard } from "@/lib/ui/workouts/StrengthFrequencyMetricCard";

type StrengthBaselineCardProps = {
  loading: boolean;
  model: StrengthBaselineCardModel | null;
};

export function StrengthBaselineCard({ loading, model }: StrengthBaselineCardProps) {
  const display =
    model != null
      ? {
          compactValuePrimary: model.compactValuePrimary,
          ratingLabel: model.ratingLabel,
          activityTierIndexForBar: model.activityTierIndexForBar,
          fillWidth01Override: model.fillWidth01Override,
        }
      : null;

  return (
    <StrengthFrequencyMetricCard
      headingTitle="Strength Baseline"
      loading={loading}
      model={display}
      footerCaption={STRENGTH_BASELINE_CARD_DEFINITION_SENTENCE}
      ratingPillTestID="strength-baseline-rating-pill"
      frequencyBarTestID="strength-baseline-frequency-bar"
      instrumentClusterTestID="strength-baseline-instrument-cluster"
    />
  );
}
