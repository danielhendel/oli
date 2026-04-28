import type { ActivityDailyDetailsCardModel } from "@/lib/data/activity/activityOverviewCardModel";
import { parseActivityDailyDetailsNumericSteps } from "@/lib/data/activity/activityOverviewCardModel";
import { ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA } from "@/lib/data/activity/activityOverviewSufficiency";
import {
  activityStepsDisplayScaleFill01,
  getStepRatingActivityDescriptorPill,
  getStepRatingTierIndex,
} from "@/lib/utils/activityStepRating";

export type ActivityBaselineDashProgressReady = {
  kind: "ready";
  /** Locale-formatted digits only (no `steps` suffix), for large headline figures. */
  averageStepsDigits: string;
  rating: ReturnType<typeof getStepRatingActivityDescriptorPill>;
  stepsTierIndex: number;
  activityDisplayScaleFill01: number;
};

export type ActivityBaselineDashProgressPresentation =
  | ActivityBaselineDashProgressReady
  | { kind: "insufficient" }
  | { kind: "no_numeric_model" };

/**
 * Maps an Activity Baseline card model to progress-track + pill inputs (Dash + tests).
 */
export function activityBaselineDashProgressFromModel(
  model: ActivityDailyDetailsCardModel | null,
): ActivityBaselineDashProgressPresentation {
  if (model == null) {
    return { kind: "no_numeric_model" };
  }
  if (model.compactStatsSummary === ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA) {
    return { kind: "insufficient" };
  }
  const steps = parseActivityDailyDetailsNumericSteps(model.compactStatsSummary);
  if (steps == null) {
    return { kind: "insufficient" };
  }
  const averageStepsDigits = Math.round(steps).toLocaleString();
  const rating = getStepRatingActivityDescriptorPill(steps);
  const stepsTierIndex = getStepRatingTierIndex(steps);
  const fill01 = activityStepsDisplayScaleFill01(steps);
  return {
    kind: "ready",
    averageStepsDigits,
    rating,
    stepsTierIndex,
    activityDisplayScaleFill01: fill01,
  };
}
