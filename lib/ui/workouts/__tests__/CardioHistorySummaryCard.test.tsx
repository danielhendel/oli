import React from "react";
import { StyleSheet } from "react-native";
import renderer, { act } from "react-test-renderer";

import type { CardioHistorySummaryModel } from "@/lib/data/workouts/cardioHistorySummaryModel";
import { UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";
import { CardioHistorySummaryCard } from "@/lib/ui/workouts/CardioHistorySummaryCard";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

const model: CardioHistorySummaryModel = {
  rows: [
    {
      key: "thisWeek",
      label: "7 Day",
      hasEnoughData: true,
      totalMiles: 12,
      averageMilesPerWeek: 6,
      totalMinutes: 120,
      averageMinutesPerWeek: 60,
      displayValue: "6.0 mi/wk",
      tierLabel: "Active",
      tierIndexForBar: 2,
      progressFill01: 0.55,
    },
  ],
};

describe("CardioHistorySummaryCard", () => {
  it("uses textPrimary for Cardio Baseline row period label and weekly value", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<CardioHistorySummaryCard model={model} />);
    });
    const label = tree!.root.findByProps({ children: "7 Day" });
    expect(StyleSheet.flatten(label.props.style).color).toBe(UI_TEXT_PRIMARY);
    const value = tree!.root.findByProps({ children: "6.0 mi/wk" });
    expect(StyleSheet.flatten(value.props.style).color).toBe(UI_TEXT_PRIMARY);
  });
});
