import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({
    avg: "5",
    window: "7 Day",
    tierBand: "5",
    tierLabel: "Peak Frequency",
  }),
}));

import StrengthRangeExplainerScreen from "../strength-range-explainer";

describe("StrengthRangeExplainerScreen", () => {
  it("renders full legend, six tier explanations, and personal context from params", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthRangeExplainerScreen />);
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("strength-range-explainer-scroll");
    expect(json).toContain("strength-baseline-frequency-legend");
    expect(json).toContain("Very Low");
    expect(json).toContain("Peak Frequency");
    expect(json).toContain("0–1");
    expect(json).toContain("5–7");
    expect(json).toContain("Your context");
    expect(json).toContain("7 Day");
    expect(json).toContain("5.0 strength workouts per week");
  });
});
