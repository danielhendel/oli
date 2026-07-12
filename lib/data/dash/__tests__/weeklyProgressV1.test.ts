import {
  computeWeeklyProgressV1,
  WEEKLY_PROGRESS_MIN_ELIGIBLE_CONTRIBUTORS,
  WEEKLY_PROGRESS_TOTAL_CONTRIBUTOR_COUNT,
} from "../weeklyProgressV1";

describe("computeWeeklyProgressV1", () => {
  it("averages four equal contributors", () => {
    const r = computeWeeklyProgressV1([
      { key: "activity", progress01: 1 },
      { key: "strength", progress01: 0.5 },
      { key: "cardio", progress01: 0.5 },
      { key: "sleep", progress01: 1 },
    ]);
    expect(r.score0to100).toBe(75);
    expect(r.eligibleContributorCount).toBe(4);
    expect(r.totalContributorCount).toBe(WEEKLY_PROGRESS_TOTAL_CONTRIBUTOR_COUNT);
  });

  it("requires at least two eligible contributors", () => {
    const one = computeWeeklyProgressV1([{ key: "activity", progress01: 1 }]);
    expect(one.score0to100).toBeNull();
    expect(one.eligibleContributorCount).toBe(1);

    const two = computeWeeklyProgressV1([
      { key: "activity", progress01: 1 },
      { key: "sleep", progress01: 0 },
    ]);
    expect(two.score0to100).toBe(50);
    expect(two.eligibleContributorCount).toBe(WEEKLY_PROGRESS_MIN_ELIGIBLE_CONTRIBUTORS);
  });

  it("includes trusted zero", () => {
    const r = computeWeeklyProgressV1([
      { key: "strength", progress01: 0 },
      { key: "cardio", progress01: 0 },
    ]);
    expect(r.score0to100).toBe(0);
  });

  it("rejects malformed progress", () => {
    const r = computeWeeklyProgressV1([
      { key: "activity", progress01: Number.NaN },
      { key: "sleep", progress01: 1 },
      { key: "strength", progress01: 1 },
    ]);
    // NaN contribution dropped → 2 eligible remain
    expect(r.eligibleContributorCount).toBe(2);
    expect(r.score0to100).toBe(100);
  });

  it("clamps visual mean to 0–100", () => {
    const r = computeWeeklyProgressV1([
      { key: "activity", progress01: 2 },
      { key: "sleep", progress01: 2 },
    ]);
    expect(r.score0to100).toBe(100);
  });

  it("dedupes contributor keys", () => {
    const r = computeWeeklyProgressV1([
      { key: "activity", progress01: 1 },
      { key: "activity", progress01: 0 },
      { key: "sleep", progress01: 1 },
    ]);
    expect(r.eligibleContributorCount).toBe(2);
    expect(r.score0to100).toBe(100);
  });
});
