import React from "react";
import renderer, { act } from "react-test-renderer";

import type { CardioHistorySummaryModel } from "@/lib/data/workouts/cardioHistorySummaryModel";
import { ENERGY_BASELINE_FILL_COLOR } from "@/lib/ui/energy/EnergyBaselineProgressTrack";

import { CardioHistorySummaryCard } from "../CardioHistorySummaryCard";

const sampleModel: CardioHistorySummaryModel = {
  personalizedExplainer:
    "Your 90-day cardio baseline is 4.0 mi/week. Over the past 7 completed days, you're averaging 5.0 mi/week — about 25% above your baseline.",
  rows: [
    {
      key: "thisWeek",
      label: "7 Day",
      hasEnoughData: true,
      totalMiles: 5,
      averageMilesPerWeek: 5,
      totalMinutes: 60,
      averageMinutesPerWeek: 60,
      displayValue: "5.0 mi per week",
      tierLabel: "Low",
      tierIndexForBar: 1,
      progressFill01: 0.4,
    },
    {
      key: "day90",
      label: "90 Day",
      hasEnoughData: true,
      totalMiles: 50,
      averageMilesPerWeek: 4,
      totalMinutes: 600,
      averageMinutesPerWeek: 60,
      displayValue: "4.0 mi per week",
      tierLabel: "Low",
      tierIndexForBar: 1,
      progressFill01: 0.32,
    },
    {
      key: "month12",
      label: "12 Month",
      hasEnoughData: false,
      totalMiles: null,
      averageMilesPerWeek: null,
      totalMinutes: null,
      averageMinutesPerWeek: null,
      displayValue: "—",
      tierLabel: null,
      tierIndexForBar: null,
      progressFill01: null,
      helperText: "Data will appear when enough history is available",
    },
  ],
};

describe("CardioHistorySummaryCard", () => {
  it("renders personalized explainer and rows with blue progress bars (no tier pills)", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <CardioHistorySummaryCard model={sampleModel} onPressViewMore={() => undefined} />,
      );
    });
    const explainer = tree!.root.findByProps({
      testID: "cardio-history-baseline-explainer",
    });
    expect(explainer.props.children).toBe(sampleModel.personalizedExplainer);

    // No tier pill on overview baseline card any more.
    expect(tree!.root.findAllByProps({ testID: "cardio-history-tier-pill-thisWeek" })).toHaveLength(
      0,
    );

    const progressBar = tree!.root.findByProps({ testID: "cardio-history-progress-thisWeek" });
    expect(progressBar.props.accessibilityRole).toBe("progressbar");
    // ENERGY_BASELINE_FILL_COLOR is applied to the fill view.
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain(ENERGY_BASELINE_FILL_COLOR);
  });

  it("does not render the deprecated explainer literal", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <CardioHistorySummaryCard model={sampleModel} onPressViewMore={() => undefined} />,
      );
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).not.toContain(
      "Your cardio baseline is the average cardio distance across key time ranges.",
    );
  });

  it("View More header action is hidden when callback is omitted", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<CardioHistorySummaryCard model={sampleModel} />);
    });
    expect(tree!.root.findAllByProps({ testID: "cardio-history-summary-view-more" })).toHaveLength(0);
  });
});
