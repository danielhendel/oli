import React from "react";
import renderer, { act } from "react-test-renderer";

import { ActivityDailyDetailsCard } from "@/lib/ui/activity/ActivityDailyDetailsCard";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

describe("ActivityDailyDetailsCard", () => {
  it("shows numeric row without aggregate rollup warning when error is null", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ActivityDailyDetailsCard
          loading={false}
          error={null}
          model={{
            title: "Today",
            compactStatsSummary: "148 steps",
            markerPosition01: 0.2,
          }}
        />,
      );
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain("148");
    expect(str).toContain("Sedentary");
    expect(str).not.toMatch(/148 steps/);
    expect(str).not.toContain("Couldn’t load steps for");
    expect(str).toContain("activity-daily-details-steps-bar");
    expect(str).not.toContain("activity-baseline-threshold-markers");
  });

  it("shows selected-day inline error when that day failed and model is absent", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ActivityDailyDetailsCard
          loading={false}
          error={{ message: "Today fetch failed", requestId: "r1", onRetry: jest.fn() }}
          model={null}
        />,
      );
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain("Today fetch failed");
    expect(str).not.toContain("148 steps");
  });

  it("renders precomputed delta label below the progress bar when deltaLabel is passed", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ActivityDailyDetailsCard
          loading={false}
          error={null}
          model={{
            title: "Today",
            compactStatsSummary: "5,000 steps",
            markerPosition01: 0.3,
          }}
          deltaLabel="500 steps above your baseline"
        />,
      );
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain("activity-daily-details-delta-label");
    expect(str).toContain("500 steps above your baseline");
  });

  it("does not duplicate overview-style partial failure copy when props omit aggregate error", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ActivityDailyDetailsCard
          loading={false}
          error={null}
          model={{ title: "Today", compactStatsSummary: "1,234 steps", markerPosition01: 0.1 }}
        />,
      );
    });
    expect(JSON.stringify(tree.toJSON())).not.toContain("Other days may still show");
  });

  it("wraps the progress track and baseline threshold markers in a single cluster for the Activity Baseline card", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ActivityDailyDetailsCard
          loading={false}
          error={null}
          model={{
            title: "Baseline",
            compactStatsSummary: "10,000 steps",
            markerPosition01: 0.5,
          }}
          footerCaption="Explainer below."
          showBaselineStepThresholdMarkers
        />,
      );
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain("activity-baseline-instrument-cluster");
    expect(str).toContain("activity-baseline-threshold-markers");
    expect(str).toContain("2.5k");
    expect(str).toContain("5k");
    expect(str).toContain("Explainer below.");
  });

  it("supports custom heading title without changing numeric tier UI", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ActivityDailyDetailsCard
          headingTitle="Yesterday’s Steps"
          loading={false}
          error={null}
          model={{
            title: "Sat",
            compactStatsSummary: "148 steps",
            markerPosition01: 0.2,
          }}
        />,
      );
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain("Yesterday’s Steps");
    expect(str).not.toContain("Today’s Steps");
    expect(str).toContain("148");
    expect(str).toContain("Sedentary");
  });
});
