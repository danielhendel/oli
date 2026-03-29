import {
  clearedStrengthAnalyticsFocusParams,
  parseStrengthAnalyticsFocusFromParams,
  serializeStrengthAnalyticsFocusParams,
} from "@/lib/workouts/navigation/strengthAnalyticsNavigationIntent";

describe("strengthAnalyticsNavigationIntent", () => {
  it("serializes and parses round-trip", () => {
    const dest = {
      section: "weekly_muscle_group" as const,
      emphasis: "balance" as const,
      muscleGroup: "quads" as const,
    };
    const params = serializeStrengthAnalyticsFocusParams(dest);
    expect(parseStrengthAnalyticsFocusFromParams(params)).toEqual(dest);
  });

  it("parses minimal section-only params", () => {
    expect(
      parseStrengthAnalyticsFocusFromParams({
        focusSection: "weekly_strength",
      }),
    ).toEqual({ section: "weekly_strength" });
  });

  it("rejects invalid section", () => {
    expect(parseStrengthAnalyticsFocusFromParams({ focusSection: "nope" })).toBeNull();
    expect(parseStrengthAnalyticsFocusFromParams({})).toBeNull();
  });

  it("clearedStrengthAnalyticsFocusParams clears known keys", () => {
    expect(clearedStrengthAnalyticsFocusParams()).toEqual({
      focusSection: undefined,
      focusEmphasis: undefined,
      focusMuscle: undefined,
    });
  });
});
