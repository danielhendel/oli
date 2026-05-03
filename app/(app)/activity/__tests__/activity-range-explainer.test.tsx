import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({
    window: "7 Day",
    tierIndex: "2",
    tierLabel: "Moderately Active",
    displayValue: "8,000 steps/day",
  }),
}));

import ActivityRangeExplainerScreen from "../activity-range-explainer";

describe("ActivityRangeExplainerScreen", () => {
  it("renders scroll, legend, six tier blocks, and personal context", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityRangeExplainerScreen />);
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("activity-range-explainer-scroll");
    expect(json).toContain("Activity ranges compare your average daily steps");
    expect(json).toContain("activity-range-explainer-tier-legend");
    expect(json).toContain("Sedentary");
    expect(json).toContain("Highly Active");
    expect(json).toContain("What each range means");
    expect(json).toContain("Your context");
    expect(json).toContain("7 Day");
    expect(json).toContain("8,000 steps/day");
  });
});
