import type { ActivityDailyDetailsCardModel } from "@/lib/data/activity/activityOverviewCardModel";
import { ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA } from "@/lib/data/activity/activityOverviewSufficiency";
import { activityBaselineDashProgressFromModel } from "@/lib/data/activity/activityBaselineDashPresentation";

describe("activityBaselineDashProgressFromModel", () => {
  it("returns no_numeric_model when model is null", () => {
    expect(activityBaselineDashProgressFromModel(null)).toEqual({ kind: "no_numeric_model" });
  });

  it("returns insufficient for not-enough-data summary", () => {
    const m: ActivityDailyDetailsCardModel = {
      title: "Activity Baseline",
      compactStatsSummary: ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA,
      markerPosition01: 0,
    };
    expect(activityBaselineDashProgressFromModel(m)).toEqual({ kind: "insufficient" });
  });

  it("returns ready presentation with tier metadata for numeric baseline", () => {
    const m: ActivityDailyDetailsCardModel = {
      title: "Activity Baseline",
      compactStatsSummary: "12,130 steps",
      markerPosition01: 0.5,
    };
    const r = activityBaselineDashProgressFromModel(m);
    expect(r.kind).toBe("ready");
    if (r.kind === "ready") {
      expect(r.averageStepsDigits).toBe("12,130");
      expect(r.rating.label).toBe("Active");
      expect(r.stepsTierIndex).toBeGreaterThanOrEqual(0);
      expect(r.activityDisplayScaleFill01).toBeGreaterThan(0);
      expect(r.activityDisplayScaleFill01).toBeLessThanOrEqual(1);
    }
  });
});
