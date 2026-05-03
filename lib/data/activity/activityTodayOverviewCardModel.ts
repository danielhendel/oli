import type { ActivityDailyDetailsCardModel } from "@/lib/data/activity/activityOverviewCardModel";
import { parseActivityDailyDetailsNumericSteps } from "@/lib/data/activity/activityOverviewCardModel";
import {
  activityStepsDisplayScaleFill01,
  getStepRatingActivityDescriptorPill,
  getStepRatingTierIndex,
} from "@/lib/utils/activityStepRating";

export type ActivityTodayOverviewCardModel = {
  stepsDigits: string | null;
  tierPill: ReturnType<typeof getStepRatingActivityDescriptorPill>;
  subtitle: string | null;
  compactStatsSummaryForA11y: string;
  /** Tier-colored progress bar (today’s step volume). */
  activityTierIndexForBar: number;
  fillWidth01Override: number;
};

/**
 * Presentation model for Activity Today card — derives tier pill + subtitle from merged Today rollup/baseline delta.
 */
export function buildActivityTodayOverviewCardModel(
  dailyDetailsModel: ActivityDailyDetailsCardModel | null,
): ActivityTodayOverviewCardModel | null {
  if (dailyDetailsModel == null) return null;

  const steps = parseActivityDailyDetailsNumericSteps(dailyDetailsModel.compactStatsSummary);
  const stepsForBar = steps ?? 0;
  const tierPill = getStepRatingActivityDescriptorPill(stepsForBar);
  const tierIdx = getStepRatingTierIndex(Math.round(stepsForBar));
  const fill01 = activityStepsDisplayScaleFill01(stepsForBar);
  const digits =
    steps != null
      ? Math.round(steps).toLocaleString()
      : (dailyDetailsModel.compactStatsSummary.match(/^([\d,]+)/)?.[1] ?? null);

  const subtitle =
    dailyDetailsModel.deltaFromBaselineLabel != null && dailyDetailsModel.deltaFromBaselineLabel.length > 0
      ? dailyDetailsModel.deltaFromBaselineLabel
      : steps != null
        ? "Steps recorded today"
        : null;

  return {
    stepsDigits: digits,
    tierPill,
    subtitle,
    compactStatsSummaryForA11y: dailyDetailsModel.compactStatsSummary,
    activityTierIndexForBar: tierIdx,
    fillWidth01Override: fill01,
  };
}
