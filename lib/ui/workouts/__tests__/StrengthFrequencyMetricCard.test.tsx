import React from "react";
import renderer, { act } from "react-test-renderer";

import { StrengthFrequencyMetricCard } from "@/lib/ui/workouts/StrengthFrequencyMetricCard";

const minimalModel = {
  compactValuePrimary: "2 workouts",
  ratingLabel: "Fair",
  activityTierIndexForBar: 2,
  fillWidth01Override: 0.4,
};

describe("StrengthFrequencyMetricCard", () => {
  it("omits the 0–7 marker row when showFrequencyMarkers is false", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <StrengthFrequencyMetricCard
          variant="embedded"
          headingTitle="This Week"
          loading={false}
          model={minimalModel}
          footerCaption="ignored"
          showFrequencyMarkers={false}
          showFooterCaption={false}
          ratingPillTestID="strength-this-week-rating-pill"
          frequencyBarTestID="strength-this-week-frequency-bar"
          instrumentClusterTestID="strength-this-week-instrument-cluster"
        />,
      );
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).not.toContain("strength-baseline-frequency-markers");
    expect(json).toContain("strength-this-week-frequency-bar");
  });

  it("omits the frequency track when showFrequencyTrack is false", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <StrengthFrequencyMetricCard
          variant="embedded"
          headingTitle="This Week"
          loading={false}
          model={minimalModel}
          footerCaption="ignored"
          showFrequencyTrack={false}
          showFrequencyMarkers={false}
          showFooterCaption={false}
          compactTitlePillSpacing
          mutedMicroCaption="2 sessions this week"
          titleRowTrailing={<></>}
          ratingPillTestID="strength-this-week-rating-pill"
          frequencyBarTestID="strength-this-week-frequency-bar"
          instrumentClusterTestID="strength-this-week-instrument-cluster"
        />,
      );
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).not.toContain("strength-this-week-frequency-bar");
    expect(json).not.toContain("strength-this-week-instrument-cluster");
    expect(json).toContain("2 sessions this week");
    expect(json).not.toContain("2 workouts");
  });

  it("omits footer support text when showFooterCaption is false", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <StrengthFrequencyMetricCard
          variant="embedded"
          headingTitle="This Week"
          loading={false}
          model={minimalModel}
          footerCaption="No workout logged today"
          showFrequencyMarkers={false}
          showFooterCaption={false}
          ratingPillTestID="strength-this-week-rating-pill"
          frequencyBarTestID="strength-this-week-frequency-bar"
          instrumentClusterTestID="strength-this-week-instrument-cluster"
        />,
      );
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).not.toContain("No workout logged today");
  });

  it("still renders markers by default for Strength Baseline parity", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <StrengthFrequencyMetricCard
          headingTitle="Strength Baseline"
          loading={false}
          model={minimalModel}
          footerCaption="Definition line."
          ratingPillTestID="strength-baseline-rating-pill"
          frequencyBarTestID="strength-baseline-frequency-bar"
          instrumentClusterTestID="strength-baseline-instrument-cluster"
        />,
      );
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain("strength-baseline-frequency-markers");
    expect(json).toContain("Definition line.");
  });
});
