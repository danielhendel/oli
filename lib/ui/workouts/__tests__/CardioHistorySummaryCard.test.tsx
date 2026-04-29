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
          key: "day7",
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
  });
});
