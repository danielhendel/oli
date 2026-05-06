import { buildActivityBaselineCardModel } from "@/lib/data/activity/activityOverviewCardModel";
import type { ActivityDailyDetailsCardModel } from "@/lib/data/activity/activityOverviewCardModel";
import type { ActivityStepsRollupMap } from "@/lib/data/activity/activityOverviewRollupTypes";
import type { DayKey } from "@/lib/ui/calendar/types";

/**
 * Shared Activity Baseline card data: same inputs as {@link useActivityOverviewScreenData} baselineDetails.
 */
export function resolveActivityBaselineCardState(input: {
  user: unknown;
  stepsRollupStatus: "partial" | "ready";
  overviewAnchorEndDay: DayKey;
  rollupDisplayByDay: Readonly<ActivityStepsRollupMap>;
}): {
  loading: boolean;
  model: ActivityDailyDetailsCardModel | null;
} {
  const { user, stepsRollupStatus, overviewAnchorEndDay, rollupDisplayByDay } = input;
  const hasUser = user != null;
  const hasAnyRollupData = Object.keys(rollupDisplayByDay).length > 0;
  const loading = hasUser && stepsRollupStatus === "partial" && !hasAnyRollupData;
  if (!hasUser) {
    return { loading, model: null };
  }
  return {
    loading,
    model: buildActivityBaselineCardModel({
      overviewAnchorEndDay,
      rollupByDay: rollupDisplayByDay,
    }),
  };
}
