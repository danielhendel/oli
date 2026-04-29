import React from "react";
import renderer, { act } from "react-test-renderer";

import type { StrengthHistorySummaryModel } from "@/lib/data/workouts/strengthHistorySummaryModel";
import { StrengthHistorySummaryCard } from "@/lib/ui/workouts/StrengthHistorySummaryCard";

const model: StrengthHistorySummaryModel = {
  rows: [
    {
      key: "day7",
      label: "7 Day",
      hasEnoughData: true,
      totalSessions: 3,
      averageSessionsPerWeek: 3,
      totalMinutes: 90,
      averageMinutesPerWeek: 90,
      displayValue: "3.0 wo · 90 min/wk",
      tierLabel: "Great",
      tierIndexForBar: 3,
      progressFill01: 0.5,
    },
    {
      key: "month12",
      label: "12 Month",
      hasEnoughData: false,
      totalSessions: null,
      averageSessionsPerWeek: null,
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

describe("StrengthHistorySummaryCard", () => {
  it("renders history rows with value format and insufficient helper", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthHistorySummaryCard model={model} />);
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("strength-history-summary-card");
    expect(json).toContain("7 Day");
    expect(json).toContain("3.0 wo · 90 min/wk");
    expect(json).toContain("12 Month");
    expect(json).toContain("—");
    expect(json).toContain("Data will appear when enough history is available");
  });
});
