import React from "react";
import renderer, { act } from "react-test-renderer";
import { StyleSheet, type ViewStyle } from "react-native";

import type { StrengthHistorySummaryModel } from "@/lib/data/workouts/strengthHistorySummaryModel";
import { ENERGY_BASELINE_FILL_COLOR } from "@/lib/ui/energy/EnergyBaselineProgressTrack";
import {
  strengthWeeklyFrequencyActivityTierIndexForTierBand,
  strengthWeeklyFrequencyRatingLabelFromTierBand,
  strengthWeeklyFrequencyTierBandFromAvg,
} from "@/lib/utils/strengthWeeklyFrequencyRating";
import { StrengthHistorySummaryCard } from "@/lib/ui/workouts/StrengthHistorySummaryCard";

const model: StrengthHistorySummaryModel = {
  rows: [
    {
      key: "thisWeek",
      label: "7 Day",
      hasEnoughData: true,
      averageSessionsPerWeek: 3,
      displayValue: "3.0 per week",
      tierLabel: "High",
      tierIndexForBar: 3,
      progressFill01: 3 / 7,
    },
    {
      key: "day90",
      label: "90 Day",
      hasEnoughData: true,
      averageSessionsPerWeek: 4.5,
      displayValue: "4.5 per week",
      tierLabel: "Very High",
      tierIndexForBar: 4,
      progressFill01: 4.5 / 7,
    },
    {
      key: "month12",
      label: "12 Month",
      hasEnoughData: false,
      averageSessionsPerWeek: null,
      displayValue: "—",
      tierLabel: null,
      tierIndexForBar: null,
      progressFill01: null,
      helperText: "Data will appear when enough history is available.",
    },
  ],
  personalizedExplainer:
    "Your 90-day strength baseline is 4.5/week. Over the past 7 completed days, you're averaging 3.0/week — about 33% below your baseline.",
};

function flattenBackgroundColor(style: unknown): string | undefined {
  const flat = StyleSheet.flatten(style as ViewStyle | ViewStyle[] | null | undefined);
  if (flat && typeof flat === "object" && "backgroundColor" in flat) {
    const bg = (flat as { backgroundColor?: unknown }).backgroundColor;
    return typeof bg === "string" ? bg : undefined;
  }
  return undefined;
}

describe("StrengthHistorySummaryCard", () => {
  it("renders Strength Baseline heading, the personalized explainer, and per-week metric rows", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthHistorySummaryCard model={model} />);
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("strength-history-summary-card");
    expect(json).toContain("Strength Baseline");
    expect(json).toContain("7 Day");
    expect(json).toContain("3.0 per week");
    expect(json).not.toContain("workouts/wk");
    expect(json).not.toContain("min/wk");
    expect(json).toContain("12 Month");
    expect(json).toContain("—");
    expect(json).toContain("Data will appear when enough history is available");
    expect(json).not.toContain("14 Day");
    expect(json).not.toContain("This Month");
    expect(json).toContain(model.personalizedExplainer);
    expect(json).toContain("strength-history-baseline-explainer");
    expect(json).not.toContain(
      "Your strength baseline is the average strength workouts across key time ranges.",
    );
    expect(json).not.toContain("strength-history-summary-view-more");
    expect(json).not.toContain("strength-baseline-frequency-legend");
    expect(json).not.toContain("strength-baseline-frequency-markers");
  });

  it("renders View More when onPressViewMore is provided and wires press", async () => {
    const onPressViewMore = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthHistorySummaryCard model={model} onPressViewMore={onPressViewMore} />);
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("View More →");
    expect(json).toContain("strength-history-summary-view-more");
    const btn = tree.root.findByProps({ testID: "strength-history-summary-view-more" });
    expect(btn.props.accessibilityLabel).toBe("View Strength Analytics");
    await act(async () => {
      btn.props.onPress();
    });
    expect(onPressViewMore).toHaveBeenCalledTimes(1);
  });

  it("does not render per-row tier pills (range-explainer entry removed from Strength overview)", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthHistorySummaryCard model={model} onPressViewMore={jest.fn()} />);
    });
    expect(() => tree.root.findByProps({ testID: "strength-history-tier-pill-thisWeek" })).toThrow();
    expect(() => tree.root.findByProps({ testID: "strength-history-tier-pill-day90" })).toThrow();
    expect(() => tree.root.findByProps({ testID: "strength-history-tier-pill-month12" })).toThrow();
  });

  it("paints every progress bar fill with the shared Oli blue (#4F7CFF)", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthHistorySummaryCard model={model} />);
    });
    expect(ENERGY_BASELINE_FILL_COLOR.toLowerCase()).toBe("#4f7cff");
    for (const key of ["thisWeek", "day90", "month12"]) {
      const track = tree.root.findByProps({ testID: `strength-history-progress-${key}` });
      const fillNodes = track.findAll(
        (node) => flattenBackgroundColor(node.props?.style) === ENERGY_BASELINE_FILL_COLOR,
        { deep: true },
      );
      expect(fillNodes.length).toBeGreaterThan(0);
    }
  });

  it("maps 4.5 workouts/wk to Very High and 5.0 to Peak Frequency via shared tier helper", () => {
    expect(strengthWeeklyFrequencyTierBandFromAvg(4.5)).toBe(4);
    expect(strengthWeeklyFrequencyRatingLabelFromTierBand(4)).toBe("Very High");
    expect(strengthWeeklyFrequencyTierBandFromAvg(5)).toBe(5);
    expect(strengthWeeklyFrequencyRatingLabelFromTierBand(5)).toBe("Peak Frequency");
  });

  it("uses one tier band index for label and Activity bar palette (no duplicate mapping)", () => {
    const band = strengthWeeklyFrequencyTierBandFromAvg(4.5);
    expect(strengthWeeklyFrequencyActivityTierIndexForTierBand(band)).toBe(band);
    expect(strengthWeeklyFrequencyRatingLabelFromTierBand(band)).toBe("Very High");
  });
});
