import React from "react";
import renderer, { act } from "react-test-renderer";

import type { StrengthHistorySummaryModel } from "@/lib/data/workouts/strengthHistorySummaryModel";
import {
  strengthWeeklyFrequencyActivityTierIndexForTierBand,
  strengthWeeklyFrequencyRatingLabelFromTierBand,
  strengthWeeklyFrequencyTierBandFromAvg,
} from "@/lib/utils/strengthWeeklyFrequencyRating";
import {
  STRENGTH_BASELINE_CARD_EXPLAINER_COPY,
  StrengthHistorySummaryCard,
} from "@/lib/ui/workouts/StrengthHistorySummaryCard";

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
};

describe("StrengthHistorySummaryCard", () => {
  it("renders Strength Baseline heading and per-week metric rows", async () => {
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
    expect(json).toContain(STRENGTH_BASELINE_CARD_EXPLAINER_COPY);
    expect(json).toContain("strength-history-baseline-explainer");
    expect(json).not.toContain("Average weekly strength workouts across key time ranges.");
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

  it("tier pills are pressable when onPressStrengthRangeExplainer is provided", async () => {
    const onExplainer = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <StrengthHistorySummaryCard model={model} onPressViewMore={jest.fn()} onPressStrengthRangeExplainer={onExplainer} />,
      );
    });
    const pillHit = tree.root.findByProps({ testID: "strength-history-tier-pill-thisWeek" });
    expect(pillHit.props.accessibilityRole).toBe("button");
    expect(pillHit.props.accessibilityLabel).toBe("View strength range explanation");
    expect(pillHit.props.disabled).not.toBe(true);
    await act(async () => {
      pillHit.props.onPress();
    });
    expect(onExplainer).toHaveBeenCalledWith({
      rowKey: "thisWeek",
      rowLabel: "7 Day",
      tierLabel: "High",
      averageSessionsPerWeek: 3,
      tierIndexForBar: 3,
    });
  });

  it("tier pills are disabled when explainer handler is omitted", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthHistorySummaryCard model={model} onPressViewMore={jest.fn()} />);
    });
    const pillHit = tree.root.findByProps({ testID: "strength-history-tier-pill-thisWeek" });
    expect(pillHit.props.disabled).toBe(true);
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
