import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
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

import { WeightBaselineChart } from "../WeightBaselineChart";
import { STEP_TIER_COLORS } from "@/lib/utils/activityStepTierVisual";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";

describe("WeightBaselineChart", () => {
  it("renders trend line and area fill (no band/marker)", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <WeightBaselineChart
          points={[
            { observedAt: "2026-01-01T10:00:00.000Z", weightKg: 78 },
            { observedAt: "2026-02-01T10:00:00.000Z", weightKg: 80 },
            { observedAt: "2026-03-01T10:00:00.000Z", weightKg: 82 },
          ]}
          lowKg={78}
          highKg={82}
          currentKg={82}
          yMinKg={155 / 2.2046226218}
          yMaxKg={165 / 2.2046226218}
          unit="lb"
          xAxisLabels={[
            { tMs: Date.parse("2026-01-01T10:00:00.000Z"), label: "Jan 1", anchor: "start" },
            { tMs: Date.parse("2026-03-01T10:00:00.000Z"), label: "Mar 1", anchor: "end" },
          ]}
          classification="maintaining"
        />,
      );
    });
    expect(tree.root.findByProps({ testID: "weight-baseline-chart-line" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "weight-baseline-chart-area" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "weight-baseline-chart-y-axis" })).toBeDefined();
    expect(tree.root.findAllByProps({ testID: "weight-baseline-chart-band" })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: "weight-baseline-chart-current-marker" })).toHaveLength(0);
    const text = tree.root
      .findAllByType("Text")
      .flatMap((node) => node.children)
      .filter((x): x is string => typeof x === "string")
      .join(" ");
    expect(text).toContain("155");
    expect(text).toContain("160");
    expect(text).toContain("165");
  });

  it("maps classification color to line", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <WeightBaselineChart
          points={[{ observedAt: "2026-03-01T10:00:00.000Z", weightKg: 82 }]}
          lowKg={78}
          highKg={82}
          currentKg={82}
          yMinKg={155 / 2.2046226218}
          yMaxKg={165 / 2.2046226218}
          unit="lb"
          xAxisLabels={[
            { tMs: Date.parse("2026-03-01T10:00:00.000Z"), label: "Mar 1", anchor: "end" },
          ]}
          classification="losing"
        />,
      );
    });
    expect(tree.root.findByProps({ testID: "weight-baseline-chart-line" }).props.stroke).toBe(
      STEP_TIER_COLORS.low,
    );
  });

  it("uses system accent blue for maintaining line", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <WeightBaselineChart
          points={[{ observedAt: "2026-03-01T10:00:00.000Z", weightKg: 82 }]}
          lowKg={78}
          highKg={82}
          currentKg={82}
          yMinKg={155 / 2.2046226218}
          yMaxKg={165 / 2.2046226218}
          unit="lb"
          xAxisLabels={[{ tMs: Date.parse("2026-03-01T10:00:00.000Z"), label: "Mar 1", anchor: "end" }]}
          classification="maintaining"
        />,
      );
    });
    expect(tree.root.findByProps({ testID: "weight-baseline-chart-line" }).props.stroke).toBe(SYSTEM_ACCENT);
    expect(tree.root.findByProps({ testID: "weight-baseline-chart-area" })).toBeDefined();
  });

  it("uses smoothed curve path (cubic commands)", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <WeightBaselineChart
          points={[
            { observedAt: "2026-01-01T10:00:00.000Z", weightKg: 79 },
            { observedAt: "2026-02-01T10:00:00.000Z", weightKg: 80 },
            { observedAt: "2026-03-01T10:00:00.000Z", weightKg: 81 },
            { observedAt: "2026-04-01T10:00:00.000Z", weightKg: 80.5 },
          ]}
          lowKg={79}
          highKg={81}
          currentKg={80.5}
          yMinKg={155 / 2.2046226218}
          yMaxKg={165 / 2.2046226218}
          unit="lb"
          xAxisLabels={[
            { tMs: Date.parse("2026-01-01T10:00:00.000Z"), label: "Jan 1", anchor: "start" },
            { tMs: Date.parse("2026-04-01T10:00:00.000Z"), label: "Apr 1", anchor: "end" },
          ]}
          classification="maintaining"
        />,
      );
    });
    const pathD = String(tree.root.findByProps({ testID: "weight-baseline-chart-line" }).props.d);
    expect(pathD).toContain("C");
  });

  it("renders x-axis labels including start and end", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <WeightBaselineChart
          points={[
            { observedAt: "2026-01-01T10:00:00.000Z", weightKg: 70.3 },
            { observedAt: "2026-03-01T10:00:00.000Z", weightKg: 72 },
            { observedAt: "2026-04-01T10:00:00.000Z", weightKg: 74.8 },
          ]}
          lowKg={70.3}
          highKg={74.8}
          currentKg={74.8}
          yMinKg={155 / 2.2046226218}
          yMaxKg={165 / 2.2046226218}
          unit="lb"
          xAxisLabels={[
            { tMs: Date.parse("2026-01-01T10:00:00.000Z"), label: "Jan 1", anchor: "start" },
            { tMs: Date.parse("2026-02-15T10:00:00.000Z"), label: "Feb 15", anchor: "middle" },
            { tMs: Date.parse("2026-04-01T10:00:00.000Z"), label: "Apr 1", anchor: "end" },
          ]}
          classification="maintaining"
        />,
      );
    });
    const text = tree.root
      .findAllByType("Text")
      .flatMap((node) => node.children)
      .filter((x): x is string => typeof x === "string")
      .join(" ");
    expect(text).toContain("Jan 1");
    expect(text).toContain("Apr 1");
    expect(text).toContain("155");
    expect(text).toContain("160");
    expect(text).toContain("165");
    expect(text).not.toContain("172.0 lb");
  });
});

