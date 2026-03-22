import {
  shouldRequestHistoricalBootstrapRange,
  WORKOUT_RANGE_BOOTSTRAP_BUILD_ID,
} from "@/lib/integrations/appleHealth/workoutBootstrapPolicy";

describe("workoutBootstrapPolicy", () => {
  it("requests bootstrap on iOS when deep backfill is needed regardless of stored build", () => {
    expect(
      shouldRequestHistoricalBootstrapRange({
        platformOs: "ios",
        needsDeepBackfill: true,
        storedRangeBootstrapBuildId: WORKOUT_RANGE_BOOTSTRAP_BUILD_ID,
      }),
    ).toBe(true);
  });

  it("requests bootstrap on iOS when stored build id does not match current", () => {
    expect(
      shouldRequestHistoricalBootstrapRange({
        platformOs: "ios",
        needsDeepBackfill: false,
        storedRangeBootstrapBuildId: "old",
      }),
    ).toBe(true);
  });

  it("skips bootstrap on iOS when deep backfill satisfied and build id matches", () => {
    expect(
      shouldRequestHistoricalBootstrapRange({
        platformOs: "ios",
        needsDeepBackfill: false,
        storedRangeBootstrapBuildId: WORKOUT_RANGE_BOOTSTRAP_BUILD_ID,
      }),
    ).toBe(false);
  });

  it("never requests bootstrap on non-iOS", () => {
    expect(
      shouldRequestHistoricalBootstrapRange({
        platformOs: "android",
        needsDeepBackfill: true,
        storedRangeBootstrapBuildId: null,
      }),
    ).toBe(false);
  });
});
