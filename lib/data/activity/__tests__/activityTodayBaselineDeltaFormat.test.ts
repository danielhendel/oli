import { formatSignedBaselineDelta } from "@/lib/data/activity/activityTodayBaselineDelta";

describe("formatSignedBaselineDelta", () => {
  it("returns null when baseline is null", () => {
    expect(formatSignedBaselineDelta(100, null)).toBeNull();
  });

  it("formats signed deltas with thousands separators", () => {
    expect(formatSignedBaselineDelta(100, 1000)).toBe("-900");
    expect(formatSignedBaselineDelta(2000, 1000)).toBe("+1,000");
  });

  it("returns 0 for exact match", () => {
    expect(formatSignedBaselineDelta(500, 500)).toBe("0");
  });
});
