import {
  formatHealthScoreTier,
  formatHealthScoreStatus,
  formatMissingList,
} from "../healthScore";

describe("formatHealthScoreTier", () => {
  it("formats each tier for display", () => {
    expect(formatHealthScoreTier("excellent")).toBe("Excellent");
    expect(formatHealthScoreTier("good")).toBe("Good");
    expect(formatHealthScoreTier("fair")).toBe("Fair");
    expect(formatHealthScoreTier("poor")).toBe("Poor");
  });
});

describe("formatHealthScoreStatus", () => {
  it("formats each status for display", () => {
    expect(formatHealthScoreStatus("stable")).toBe("Stable");
    expect(formatHealthScoreStatus("attention_required")).toBe("Attention required");
    expect(formatHealthScoreStatus("insufficient_data")).toBe("Insufficient data");
  });
});

describe("formatMissingList", () => {
  it("returns empty string for empty array", () => {
    expect(formatMissingList([])).toBe("");
  });

  it("formats single missing item", () => {
    expect(formatMissingList(["sleep"])).toBe("Missing: sleep");
  });

  it("formats multiple missing items comma-separated", () => {
    expect(formatMissingList(["sleep", "steps"])).toBe("Missing: sleep, steps");
  });
});
