import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({
    window: "7 Day",
    tierIndex: "2",
    tierLabel: "Active",
    displayValue: "10.6 mi per week",
  }),
}));

import CardioRangeExplainerScreen from "../cardio-range-explainer";

describe("CardioRangeExplainerScreen", () => {
  it("renders intro, full legend, six cardio tiers, markers, and personal context", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<CardioRangeExplainerScreen />);
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("cardio-range-explainer-scroll");
    expect(json).toContain("Cardio ranges compare your average weekly distance");
    expect(json).toContain("cardio-baseline-frequency-legend");
    expect(json).toContain("Very Low");
    expect(json).toContain("Peak");
    expect(json).toContain('"children":["0"]');
    expect(json).toContain('"children":["2.5"]');
    expect(json).toContain('"children":["40+"]');
    expect(json).toContain("0–2.5 mi/week");
    expect(json).toContain("40+ mi/week");
    expect(json).toContain("Your context");
    expect(json).toContain("7 Day");
    expect(json).toContain("10.6 mi per week");
  });
});
