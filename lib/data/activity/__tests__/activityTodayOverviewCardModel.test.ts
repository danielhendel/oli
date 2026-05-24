import { describe, it, expect } from "@jest/globals";

import type { ActivityDailyDetailsCardModel } from "@/lib/data/activity/activityOverviewCardModel";
import {
  buildActivityTodayOverviewCardModel,
  type ActivityTodayOverviewStepsAllocation,
} from "@/lib/data/activity/activityTodayOverviewCardModel";

function makeDetailsModel(
  overrides?: Partial<ActivityDailyDetailsCardModel>,
): ActivityDailyDetailsCardModel {
  return {
    title: "Today",
    compactStatsSummary: "10,000 steps",
    markerPosition01: 0.6,
    ...overrides,
  };
}

describe("buildActivityTodayOverviewCardModel — Phase 2B stepsAllocation", () => {
  it("returns null when dailyDetailsModel is null", () => {
    expect(buildActivityTodayOverviewCardModel(null)).toBeNull();
  });

  it("omits stepsAllocation when no allocation is supplied", () => {
    const model = buildActivityTodayOverviewCardModel(makeDetailsModel());
    expect(model).not.toBeNull();
    expect(model!.stepsAllocation).toBeUndefined();
  });

  it("attaches stepsAllocation when buckets exactly partition the headline", () => {
    const allocation: ActivityTodayOverviewStepsAllocation = {
      neatSteps: 6000,
      strengthSteps: 1500,
      cardioSteps: 2500,
    };
    const model = buildActivityTodayOverviewCardModel(makeDetailsModel(), allocation);
    expect(model).not.toBeNull();
    expect(model!.stepsAllocation).toEqual({
      neatSteps: 6000,
      strengthSteps: 1500,
      cardioSteps: 2500,
    });
  });

  it("omits stepsAllocation when buckets do not sum to the headline integer", () => {
    const allocation: ActivityTodayOverviewStepsAllocation = {
      neatSteps: 5000,
      strengthSteps: 1500,
      cardioSteps: 2500,
    };
    const model = buildActivityTodayOverviewCardModel(makeDetailsModel(), allocation);
    expect(model).not.toBeNull();
    expect(model!.stepsAllocation).toBeUndefined();
  });

  it("omits stepsAllocation when any bucket is non-integer", () => {
    const model = buildActivityTodayOverviewCardModel(makeDetailsModel(), {
      neatSteps: 6000.5,
      strengthSteps: 1499.5,
      cardioSteps: 2500,
    } as ActivityTodayOverviewStepsAllocation);
    expect(model).not.toBeNull();
    expect(model!.stepsAllocation).toBeUndefined();
  });

  it("omits stepsAllocation when any bucket is negative", () => {
    const model = buildActivityTodayOverviewCardModel(makeDetailsModel(), {
      neatSteps: -100,
      strengthSteps: 5000,
      cardioSteps: 5100,
    } as ActivityTodayOverviewStepsAllocation);
    expect(model).not.toBeNull();
    expect(model!.stepsAllocation).toBeUndefined();
  });

  it("omits stepsAllocation when the headline cannot be parsed from compactStatsSummary", () => {
    const details = makeDetailsModel({ compactStatsSummary: "no steps yet" });
    const model = buildActivityTodayOverviewCardModel(details, {
      neatSteps: 0,
      strengthSteps: 0,
      cardioSteps: 0,
    });
    expect(model).not.toBeNull();
    expect(model!.stepsAllocation).toBeUndefined();
  });

  it("omits stepsAllocation when headline integer is 0 (UX policy: hide empty partition)", () => {
    const details = makeDetailsModel({ compactStatsSummary: "0 steps" });
    const model = buildActivityTodayOverviewCardModel(details, {
      neatSteps: 0,
      strengthSteps: 0,
      cardioSteps: 0,
    });
    expect(model).not.toBeNull();
    expect(model!.stepsAllocation).toBeUndefined();
  });

  it("attaches stepsAllocation on a NEAT-only day with non-zero headline (NEAT 21 / Strength 0 / Cardio 0 renders)", () => {
    const details = makeDetailsModel({ compactStatsSummary: "21 steps" });
    const model = buildActivityTodayOverviewCardModel(details, {
      neatSteps: 21,
      strengthSteps: 0,
      cardioSteps: 0,
    });
    expect(model).not.toBeNull();
    expect(model!.stepsAllocation).toEqual({
      neatSteps: 21,
      strengthSteps: 0,
      cardioSteps: 0,
    });
  });

  it("attaches stepsAllocation when Strength steps are present (Cardio may be 0)", () => {
    const details = makeDetailsModel({ compactStatsSummary: "1,500 steps" });
    const model = buildActivityTodayOverviewCardModel(details, {
      neatSteps: 1000,
      strengthSteps: 500,
      cardioSteps: 0,
    });
    expect(model).not.toBeNull();
    expect(model!.stepsAllocation).toEqual({
      neatSteps: 1000,
      strengthSteps: 500,
      cardioSteps: 0,
    });
  });

  it("attaches stepsAllocation when Cardio steps are present (Strength may be 0)", () => {
    const details = makeDetailsModel({ compactStatsSummary: "1,500 steps" });
    const model = buildActivityTodayOverviewCardModel(details, {
      neatSteps: 1000,
      strengthSteps: 0,
      cardioSteps: 500,
    });
    expect(model).not.toBeNull();
    expect(model!.stepsAllocation).toEqual({
      neatSteps: 1000,
      strengthSteps: 0,
      cardioSteps: 500,
    });
  });
});
