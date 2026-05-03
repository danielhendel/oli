import React from "react";
import renderer, { act } from "react-test-renderer";

import type { CardioBaselineCardModel } from "@/lib/data/workouts/cardioBaselineCardModel";
import { CardioBaselineCard } from "@/lib/ui/workouts/CardioBaselineCard";

const model: CardioBaselineCardModel = {
  kind: "ready",
  averageMilesPerWeek90d: 3,
  totalMiles90d: (3 * 90) / 7,
  sessions90d: 6,
  totalMinutes90d: (44 * 90) / 7,
  averageMinutesPerWeek90d: 44,
  tier: "low",
  formattedAverageMilesPerWeek: "3.0 mi/wk",
  formattedAverageMinutesPerWeek: "44 min/wk",
  headlineLabel: "3.0 mi per week",
  progressMilesPerWeekScaleValue: 3,
};

describe("CardioBaselineCard", () => {
  it("renders headline + upgraded ruler tick labels", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<CardioBaselineCard loading={false} model={model} />);
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("Cardio Baseline");
    expect(json).toContain("3.0 mi per week");
    expect(json).not.toContain("min/wk");
    expect(json).toContain("cardio-baseline-frequency-bar");
    expect(json).toContain("cardio-baseline-frequency-markers");
    expect(json).toContain('"children":["0"]');
    expect(json).toContain('"children":["2.5"]');
    expect(json).toContain('"children":["40+"]');
  });
});
