import {
  mergeActivityWeekStepsMaps,
  partitionActivityWeekStepsDayKeys,
} from "@/lib/data/activity/activityWeekStepsPresencePartition";

describe("partitionActivityWeekStepsDayKeys", () => {
  it("splits future vs past relative to today key", () => {
    const keys = ["2026-04-05", "2026-04-06", "2026-04-07"] as const;
    const { skipFutureDays, daysToFetch } = partitionActivityWeekStepsDayKeys(keys, "2026-04-06");
    expect(daysToFetch).toEqual(["2026-04-05", "2026-04-06"]);
    expect(skipFutureDays).toEqual({ "2026-04-07": true });
  });
});

describe("mergeActivityWeekStepsMaps", () => {
  it("marks future days false and merges fetch results", () => {
    const out = mergeActivityWeekStepsMaps(
      { "2026-04-11": true },
      [
        ["2026-04-09", true],
        ["2026-04-10", false],
      ] as const,
    );
    expect(out["2026-04-11"]).toBe(false);
    expect(out["2026-04-09"]).toBe(true);
    expect(out["2026-04-10"]).toBe(false);
  });
});
