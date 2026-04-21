import { ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA } from "@/lib/data/activity/activityOverviewSufficiency";
import type { ActivityDailyDetailsCardModel } from "@/lib/data/activity/activityOverviewCardModel";
import {
  ACTIVITY_BASELINE_INSUFFICIENT_EXPLAINER,
  getActivityBaselineExplanation,
  resolveActivityBaselineFooterCaption,
  type ActivityTier,
} from "@/lib/utils/activityBaselineExplanation";

describe("getActivityBaselineExplanation", () => {
  const expectations: Record<ActivityTier, string> = {
    sedentary: "Your baseline reflects a low level of daily movement",
    lightlyActive: "Your baseline shows a lightly active routine",
    moderatelyActive: "Your baseline reflects a moderate activity level",
    active: "Your baseline shows a strong and consistent level",
    veryActive: "Your baseline reflects a high level of daily movement",
    highlyActive: "Your baseline indicates an exceptionally high level",
  };

  it("returns the correct opening for each activity tier", () => {
    (Object.keys(expectations) as ActivityTier[]).forEach((tier) => {
      expect(getActivityBaselineExplanation(tier)).toContain(expectations[tier]);
    });
  });
});

describe("resolveActivityBaselineFooterCaption", () => {
  it("returns undefined when model is null", () => {
    expect(resolveActivityBaselineFooterCaption(null)).toBeUndefined();
  });

  it("returns the insufficient-data explainer when compactStatsSummary is not enough data", () => {
    const model: ActivityDailyDetailsCardModel = {
      title: "Activity Baseline",
      compactStatsSummary: ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA,
      markerPosition01: 0,
    };
    expect(resolveActivityBaselineFooterCaption(model)).toBe(ACTIVITY_BASELINE_INSUFFICIENT_EXPLAINER);
  });

  it("returns undefined when compactStatsSummary does not parse as steps", () => {
    const model: ActivityDailyDetailsCardModel = {
      title: "Activity Baseline",
      compactStatsSummary: "—",
      markerPosition01: 0,
    };
    expect(resolveActivityBaselineFooterCaption(model)).toBeUndefined();
  });
});
