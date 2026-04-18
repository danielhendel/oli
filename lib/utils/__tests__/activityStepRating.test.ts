import {
  ACTIVITY_STEP_RATING_TIERS,
  getStepRating,
  getStepRatingTierIndex,
  stepRatingTierMarkerPosition01,
  stepsFromLocaleDigitString,
} from "@/lib/utils/activityStepRating";

describe("getStepRating", () => {
  it.each([
    [0, "Low"],
    [4999, "Low"],
    [5000, "Below Avg"],
    [7499, "Below Avg"],
    [7500, "Average"],
    [9999, "Average"],
    [10000, "Good"],
    [12499, "Good"],
    [12500, "Great"],
    [14999, "Great"],
    [15000, "Elite"],
    [20000, "Elite"],
  ])("steps %i → %s", (steps, label) => {
    expect(getStepRating(steps).label).toBe(label);
  });

  it("floors non-integers and clamps negatives to Low", () => {
    expect(getStepRating(7999.9).label).toBe("Average");
    expect(getStepRating(-100).label).toBe("Low");
  });

  it("returns color and backgroundColor from Body segment pill chrome", () => {
    const r = getStepRating(8000);
    expect(r.color).toMatch(/^#/);
    expect(r.backgroundColor).toMatch(/^#/);
  });

  it("stepsFromLocaleDigitString strips grouping commas", () => {
    expect(stepsFromLocaleDigitString("7,919")).toBe(7919);
    expect(getStepRating(stepsFromLocaleDigitString("7,919")).label).toBe("Average");
  });
});

describe("getStepRatingTierIndex / stepRatingTierMarkerPosition01", () => {
  it("maps steps to tier index 0–5", () => {
    expect(getStepRatingTierIndex(1000)).toBe(0);
    expect(getStepRatingTierIndex(6000)).toBe(1);
    expect(getStepRatingTierIndex(8000)).toBe(2);
    expect(getStepRatingTierIndex(11000)).toBe(3);
    expect(getStepRatingTierIndex(13000)).toBe(4);
    expect(getStepRatingTierIndex(16000)).toBe(5);
  });

  it("places marker at band centers", () => {
    expect(stepRatingTierMarkerPosition01(1000)).toBeCloseTo(0.5 / ACTIVITY_STEP_RATING_TIERS.length, 5);
    expect(stepRatingTierMarkerPosition01(16000)).toBeCloseTo(5.5 / ACTIVITY_STEP_RATING_TIERS.length, 5);
  });
});
