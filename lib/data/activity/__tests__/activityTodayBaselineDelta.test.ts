import {
  computeActivityTodayDeltaFromBaseline,
  mergeTodayDetailsWithBaselineDelta,
} from "@/lib/data/activity/activityTodayBaselineDelta";
import type { ActivityDailyDetailsCardModel } from "@/lib/data/activity/activityOverviewCardModel";
import { ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA } from "@/lib/data/activity/activityOverviewSufficiency";

describe("computeActivityTodayDeltaFromBaseline", () => {
  it("returns on-track copy when abs(delta) < 250", () => {
    const r = computeActivityTodayDeltaFromBaseline(4700, 4500);
    expect(r.deltaFromBaselineSteps).toBe(200);
    expect(r.deltaFromBaselineLabel).toBe("You are on track with your baseline");
  });

  it("treats delta 250 as above baseline (not on track)", () => {
    const r = computeActivityTodayDeltaFromBaseline(4750, 4500);
    expect(r.deltaFromBaselineSteps).toBe(250);
    expect(r.deltaFromBaselineLabel).toBe("250 steps above your baseline");
  });

  it("returns below-baseline copy when delta is negative beyond band", () => {
    const r = computeActivityTodayDeltaFromBaseline(1000, 5000);
    expect(r.deltaFromBaselineSteps).toBe(-4000);
    expect(r.deltaFromBaselineLabel).toBe("4,000 steps below your baseline");
  });

  it("returns above-baseline copy when delta is positive beyond band", () => {
    const r = computeActivityTodayDeltaFromBaseline(8000, 5000);
    expect(r.deltaFromBaselineSteps).toBe(3000);
    expect(r.deltaFromBaselineLabel).toBe("3,000 steps above your baseline");
  });
});

describe("mergeTodayDetailsWithBaselineDelta", () => {
  const todayBase: ActivityDailyDetailsCardModel = {
    title: "Today",
    compactStatsSummary: "4,700 steps",
    markerPosition01: 0.2,
  };

  it("returns unchanged today model when baseline summary is insufficient", () => {
    const baseline: ActivityDailyDetailsCardModel = {
      title: "Activity Baseline",
      compactStatsSummary: ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA,
      markerPosition01: 0,
    };
    const out = mergeTodayDetailsWithBaselineDelta(todayBase, baseline);
    expect(out).toEqual(todayBase);
  });

  it("returns unchanged today model when baseline model is null", () => {
    const out = mergeTodayDetailsWithBaselineDelta(todayBase, null);
    expect(out).toEqual(todayBase);
  });

  it("returns unchanged today model when today summary is not numeric steps", () => {
    const badToday: ActivityDailyDetailsCardModel = {
      ...todayBase,
      compactStatsSummary: "No daily rollup for this day",
    };
    const baseline: ActivityDailyDetailsCardModel = {
      title: "Activity Baseline",
      compactStatsSummary: "5,000 steps",
      markerPosition01: 0.3,
    };
    expect(mergeTodayDetailsWithBaselineDelta(badToday, baseline)).toEqual(badToday);
  });

  it("merges delta fields when both step totals parse", () => {
    const baseline: ActivityDailyDetailsCardModel = {
      title: "Activity Baseline",
      compactStatsSummary: "4,500 steps",
      markerPosition01: 0.3,
    };
    const out = mergeTodayDetailsWithBaselineDelta(todayBase, baseline);
    expect(out?.deltaFromBaselineSteps).toBe(200);
    expect(out?.deltaFromBaselineLabel).toBe("You are on track with your baseline");
  });
});
