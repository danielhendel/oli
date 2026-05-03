import React from "react";
import renderer, { act } from "react-test-renderer";

import type { CardioHistorySummaryModel } from "@/lib/data/workouts/cardioHistorySummaryModel";
import { CardioHistorySummaryCard } from "@/lib/ui/workouts/CardioHistorySummaryCard";
import { ACTIVITY_STEP_RATING_TIERS } from "@/lib/utils/activityStepRating";

describe("CardioHistorySummaryCard", () => {
  it("uses ACTIVITY_STEP_RATING_TIERS chrome for Low (tier index 1), not legacy blue", async () => {
    const tierChrome = ACTIVITY_STEP_RATING_TIERS[1]!;
    const model: CardioHistorySummaryModel = {
      rows: [
        {
          key: "thisWeek",
          label: "7 Day",
          hasEnoughData: true,
          totalMiles: 1,
          averageMilesPerWeek: 1,
          totalMinutes: 10,
          averageMinutesPerWeek: 10,
          displayValue: "1.0 mi · 10 min/wk",
          tierLabel: "Low",
          tierIndexForBar: 1,
          progressFill01: 0.2,
        },
      ],
    };
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<CardioHistorySummaryCard model={model} />);
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain(tierChrome.color);
    expect(json).toContain(tierChrome.backgroundColor);
    expect(json).not.toContain("#0A84FF");
    expect(json).toContain("Low");
    expect(json).not.toContain("cardio-baseline-frequency-legend");
  });

  it("tier pills are pressable when onPressCardioRangeExplainer is provided", async () => {
    const onExplainer = jest.fn();
    const model: CardioHistorySummaryModel = {
      rows: [
        {
          key: "thisWeek",
          label: "7 Day",
          hasEnoughData: true,
          totalMiles: 10,
          averageMilesPerWeek: 10,
          totalMinutes: 60,
          averageMinutesPerWeek: 60,
          displayValue: "10.6 mi per week",
          tierLabel: "Active",
          tierIndexForBar: 2,
          progressFill01: 0.5,
        },
      ],
    };
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<CardioHistorySummaryCard model={model} onPressCardioRangeExplainer={onExplainer} />);
    });
    const pillHit = tree.root.findByProps({ testID: "cardio-history-tier-pill-thisWeek" });
    expect(pillHit.props.accessibilityRole).toBe("button");
    expect(pillHit.props.accessibilityLabel).toBe("View cardio range explanation");
    await act(async () => {
      pillHit.props.onPress();
    });
    expect(onExplainer).toHaveBeenCalledWith({
      rowKey: "thisWeek",
      rowLabel: "7 Day",
      tierLabel: "Active",
      averageMilesPerWeek: 10,
      tierIndexForBar: 2,
      displayValue: "10.6 mi per week",
    });
  });

  it("tier pills are disabled when explainer handler is omitted", async () => {
    const model: CardioHistorySummaryModel = {
      rows: [
        {
          key: "thisWeek",
          label: "7 Day",
          hasEnoughData: true,
          totalMiles: 1,
          averageMilesPerWeek: 1,
          totalMinutes: 10,
          averageMinutesPerWeek: 10,
          displayValue: "1.0 mi per week",
          tierLabel: "Low",
          tierIndexForBar: 1,
          progressFill01: 0.2,
        },
      ],
    };
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<CardioHistorySummaryCard model={model} />);
    });
    const pillHit = tree.root.findByProps({ testID: "cardio-history-tier-pill-thisWeek" });
    expect(pillHit.props.disabled).toBe(true);
  });
});
