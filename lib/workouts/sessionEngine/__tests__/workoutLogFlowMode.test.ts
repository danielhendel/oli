import { workoutLogFlowModeFromEnrichDayParam } from "../workoutLogFlowMode";

describe("workoutLogFlowModeFromEnrichDayParam", () => {
  it("returns backfill for valid YYYY-MM-DD enrichDay", () => {
    expect(workoutLogFlowModeFromEnrichDayParam("2026-03-18")).toBe("backfill");
  });

  it("returns live when enrichDay missing or invalid", () => {
    expect(workoutLogFlowModeFromEnrichDayParam(undefined)).toBe("live");
    expect(workoutLogFlowModeFromEnrichDayParam("")).toBe("live");
    expect(workoutLogFlowModeFromEnrichDayParam("not-a-day")).toBe("live");
  });
});
