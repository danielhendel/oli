import React from "react";
import { StyleSheet } from "react-native";
import renderer, { act } from "react-test-renderer";

import type { ActivityHistorySummaryModel } from "@/lib/data/activity/activityHistorySummaryModel";
import { UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";
import { ActivityHistorySummaryCard } from "@/lib/ui/activity/ActivityHistorySummaryCard";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

const model: ActivityHistorySummaryModel = {
  rows: [
    {
      key: "day7",
      label: "7 Day",
      hasEnoughData: true,
      averageStepsPerDay: 8000,
      displayValue: "8,000 steps/day",
      tierLabel: "Solid",
      tierIndexForBar: 2,
      progressFill01: 0.5,
    },
  ],
};

describe("ActivityHistorySummaryCard", () => {
  it("uses textPrimary for Activity Baseline row period label and value", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityHistorySummaryCard model={model} />);
    });
    const label = tree!.root.findByProps({ children: "7 Day" });
    expect(StyleSheet.flatten(label.props.style).color).toBe(UI_TEXT_PRIMARY);
    const value = tree!.root.findByProps({ children: "8,000 steps/day" });
    expect(StyleSheet.flatten(value.props.style).color).toBe(UI_TEXT_PRIMARY);
  });
});
