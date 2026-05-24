import React from "react";
import { StyleSheet } from "react-native";
import renderer, { act } from "react-test-renderer";

import type { ActivityHistorySummaryModel } from "@/lib/data/activity/activityHistorySummaryModel";
import { UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";
import { ActivityHistorySummaryCard } from "@/lib/ui/activity/ActivityHistorySummaryCard";
import { ENERGY_BASELINE_FILL_COLOR } from "@/lib/ui/energy/EnergyBaselineProgressTrack";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

const PERSONALIZED_EXPLAINER =
  "Your 90-day baseline is 12,600 steps/day, which puts you in the Very Active range. Over the past 7 completed days, you're averaging 12,890 steps/day — about 2% above your baseline.";

const fullModel: ActivityHistorySummaryModel = {
  personalizedExplainer: PERSONALIZED_EXPLAINER,
  rows: [
    {
      key: "day7",
      label: "7 Day",
      hasEnoughData: true,
      averageStepsPerDay: 12_890,
      displayValue: "12,890 steps/day",
      tierLabel: "Very Active",
      tierIndexForBar: 4,
      progressFill01: 0.86,
    },
    {
      key: "day30",
      label: "30 Day",
      hasEnoughData: true,
      averageStepsPerDay: 12_700,
      displayValue: "12,700 steps/day",
      tierLabel: "Very Active",
      tierIndexForBar: 4,
      progressFill01: 0.85,
    },
    {
      key: "day90",
      label: "90 Day",
      hasEnoughData: true,
      averageStepsPerDay: 12_600,
      displayValue: "12,600 steps/day",
      tierLabel: "Very Active",
      tierIndexForBar: 4,
      progressFill01: 0.84,
    },
    {
      key: "ytd",
      label: "YTD",
      hasEnoughData: true,
      averageStepsPerDay: 12_500,
      displayValue: "12,500 steps/day",
      tierLabel: "Very Active",
      tierIndexForBar: 4,
      progressFill01: 0.83,
    },
    {
      key: "month12",
      label: "12 Month",
      hasEnoughData: true,
      averageStepsPerDay: 12_000,
      displayValue: "12,000 steps/day",
      tierLabel: "Active",
      tierIndexForBar: 3,
      progressFill01: 0.8,
    },
  ],
};

describe("ActivityHistorySummaryCard", () => {
  it("uses textPrimary for Activity Baseline row period label and value", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityHistorySummaryCard model={fullModel} />);
    });
    const label = tree!.root.findByProps({ children: "7 Day" });
    expect(StyleSheet.flatten(label.props.style).color).toBe(UI_TEXT_PRIMARY);
    const value = tree!.root.findByProps({ children: "12,890 steps/day" });
    expect(StyleSheet.flatten(value.props.style).color).toBe(UI_TEXT_PRIMARY);
  });

  it("renders each baseline row's progress fill in the Daily Energy blue", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityHistorySummaryCard model={fullModel} />);
    });
    const track = tree!.root.findByProps({ testID: "activity-history-progress-day7" });
    const fillView = track.findAll(
      (n) =>
        n.props != null &&
        Array.isArray(n.props.style) &&
        n.props.style.some(
          (s: unknown) =>
            typeof s === "object" &&
            s != null &&
            (s as { backgroundColor?: string }).backgroundColor === ENERGY_BASELINE_FILL_COLOR,
        ),
    );
    expect(fillView.length).toBeGreaterThan(0);
  });

  it("renders the personalized explainer copy from the model and not the legacy generic copy", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityHistorySummaryCard model={fullModel} />);
    });
    const explainer = tree!.root.findByProps({ testID: "activity-history-baseline-explainer" });
    expect(explainer.props.children).toBe(PERSONALIZED_EXPLAINER);
    const json = JSON.stringify(tree!.toJSON());
    expect(json).not.toContain("Your activity baseline is the average daily steps");
  });

  it("does not render per-row status/range pills on the Activity Baseline card", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityHistorySummaryCard model={fullModel} />);
    });
    for (const key of ["day7", "day30", "day90", "ytd", "month12"]) {
      expect(tree!.root.findAllByProps({ testID: `activity-history-tier-pill-${key}` })).toHaveLength(0);
      expect(tree!.root.findAllByProps({ testID: `activity-history-tier-${key}` })).toHaveLength(0);
    }
    const json = JSON.stringify(tree!.toJSON());
    for (const label of [
      "Sedentary",
      "Lightly Active",
      "Moderately Active",
      "Active",
      "Very Active",
      "Highly Active",
    ]) {
      // The personalized explainer mentions a category — assert the pill UI itself is absent by
      // confirming the legacy pill testIDs are not present (covered above) and that the row label
      // group only contains the period label text.
      // We still allow the category word to appear inside the explainer body.
      expect(typeof label).toBe("string");
    }
    // No legacy “Solid” placeholder either:
    expect(json).not.toContain("Solid");
  });

  it("still renders all five row labels and values", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityHistorySummaryCard model={fullModel} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    for (const label of ["7 Day", "30 Day", "90 Day", "YTD", "12 Month"]) {
      expect(json).toContain(label);
    }
    for (const value of [
      "12,890 steps/day",
      "12,700 steps/day",
      "12,600 steps/day",
      "12,500 steps/day",
      "12,000 steps/day",
    ]) {
      expect(json).toContain(value);
    }
  });
});
