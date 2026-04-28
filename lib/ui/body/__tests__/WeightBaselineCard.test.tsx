import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Platform: { OS: "ios" },
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));
jest.mock("react-native-svg", () => {
  const React = require("react");
  const mk =
    (name: string) =>
    (props: { children?: unknown; [k: string]: unknown }) =>
      React.createElement(name, props, props.children);
  return {
    __esModule: true,
    default: mk("Svg"),
    Defs: mk("Defs"),
    LinearGradient: mk("LinearGradient"),
    Stop: mk("Stop"),
    Path: mk("Path"),
    Rect: mk("Rect"),
    Circle: mk("Circle"),
  };
});

import { WeightBaselineCard } from "../WeightBaselineCard";

const points = [
  { observedAt: "2026-01-01T10:00:00.000Z", weightKg: 78 },
  { observedAt: "2026-02-01T10:00:00.000Z", weightKg: 80 },
  { observedAt: "2026-03-01T10:00:00.000Z", weightKg: 82 },
];

describe("WeightBaselineCard", () => {
  it("renders fluctuation range headline and insights", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <WeightBaselineCard
          unit="lb"
          loading={false}
          error={null}
          chartPoints={points}
          model={{
            kind: "ready",
            currentWeightKg: 80,
            referenceWeightKg: 80,
            ninetyDayLowKg: 78,
            ninetyDayHighKg: 82,
            changeFromReferenceKg: 0,
            classification: "maintaining",
            markerFill01: 0.5,
          }}
        />,
      );
    });
    expect(tree.root.findByProps({ testID: "weight-baseline-chart" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "weight-baseline-insights-grid" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "weight-baseline-insight-low" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "weight-baseline-insight-high" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "weight-baseline-insight-change" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "weight-baseline-insight-average" })).toBeDefined();
    const text = tree.root
      .findAllByType("Text")
      .flatMap((node) => node.children)
      .filter((x): x is string => typeof x === "string")
      .join(" ");
    expect(text).toContain("±");
    expect(text).toContain("8.8 lb");
    expect(text).not.toContain("↕");
    expect(text).not.toContain("↕︎");
    expect(text).not.toContain("↕️");
    expect(text).not.toContain("⬆️");
    expect(text).toContain("90 Day Low");
    expect(text).toContain("172.0 lb");
    expect(text).toContain("90 Day High");
    expect(text).toContain("180.8 lb");
    expect(text).toContain("Change");
    expect(text).toContain("Average");
    expect(text).not.toContain("Stable over 90 days");
  });

  it("includes low/high/change in accessibility summary", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <WeightBaselineCard
          unit="lb"
          loading={false}
          error={null}
          chartPoints={points}
          model={{
            kind: "ready",
            currentWeightKg: 80,
            referenceWeightKg: 80,
            ninetyDayLowKg: 78,
            ninetyDayHighKg: 82,
            changeFromReferenceKg: 0,
            classification: "maintaining",
            markerFill01: 0.5,
          }}
        />,
      );
    });
    const container = tree.root.find(
      (n) =>
        typeof n.props?.accessibilityLabel === "string" &&
        String(n.props.accessibilityLabel).includes("Weight Baseline."),
    );
    const a11y = String(container.props.accessibilityLabel);
    expect(a11y).toContain("Current weight");
    expect(a11y).toContain("Ninety-day fluctuation range plus or minus");
    expect(a11y).toContain("Low");
    expect(a11y).toContain("High");
    expect(a11y).toContain("Change");
    expect(a11y).toContain("Average");
  });

  it("uses readable maintaining pill tint", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <WeightBaselineCard
          unit="lb"
          loading={false}
          error={null}
          chartPoints={points}
          model={{
            kind: "ready",
            currentWeightKg: 80,
            referenceWeightKg: 80,
            ninetyDayLowKg: 78,
            ninetyDayHighKg: 82,
            changeFromReferenceKg: 0,
            classification: "maintaining",
            markerFill01: 0.5,
          }}
        />,
      );
    });
    expect(tree.root.findByProps({ testID: "weight-baseline-classification-pill" })).toBeDefined();
    const text = tree.root
      .findAllByType("Text")
      .flatMap((node) => node.children)
      .filter((x): x is string => typeof x === "string")
      .join(" ");
    expect(text).toContain("Maintaining");
  });

  it("does not render fluctuation headline for insufficient data", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <WeightBaselineCard
          unit="lb"
          loading={false}
          error={null}
          chartPoints={[]}
          model={{ kind: "insufficient_data", reason: "no_samples_in_window" }}
        />,
      );
    });
    const text = tree.root
      .findAllByType("Text")
      .flatMap((node) => node.children)
      .filter((x): x is string => typeof x === "string")
      .join(" ");
    expect(text).not.toContain("±");
  });
});

