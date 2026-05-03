import React from "react";
import renderer, { act } from "react-test-renderer";

import { CardioBaselineFrequencyLegend } from "@/lib/ui/workouts/CardioBaselineFrequencyLegend";

describe("CardioBaselineFrequencyLegend", () => {
  it("renders six tier labels over equal-width segments and marker measure strings 0 … 40+", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<CardioBaselineFrequencyLegend />);
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("cardio-baseline-legend-tier-very_low");
    expect(json).toContain("cardio-baseline-legend-tier-low");
    expect(json).toContain("cardio-baseline-legend-tier-active");
    expect(json).toContain("cardio-baseline-legend-tier-high");
    expect(json).toContain("cardio-baseline-legend-tier-very_high");
    expect(json).toContain("cardio-baseline-legend-tier-peak");
    expect(json).toContain("Very Low");
    expect(json).toContain("Very High");
    expect(json).toContain("Peak");
    expect(json).toContain("cardio-baseline-frequency-markers");
    expect(json).toContain('"children":["0"]');
    expect(json).toContain('"children":["2.5"]');
    expect(json).toContain('"children":["40+"]');
  });
});
