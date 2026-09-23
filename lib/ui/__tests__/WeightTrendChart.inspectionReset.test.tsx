/**
 * @jest-environment jsdom
 *
 * Regression: chart inspection must not clear when `points` gets a new array
 * identity with the same observation content (parent re-render while scrubbing).
 */
import React from "react";
import renderer, { act } from "react-test-renderer";

import type { WeightPoint } from "@/lib/data/useWeightSeries";
import { WeightTrendChart } from "@/lib/ui/WeightTrendChart";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  StyleSheet: { create: (s: unknown) => s },
}));

jest.mock("react-native-svg", () => {
  const ReactLocal = require("react");
  const stub = (name: string) => {
    const C = (props: Record<string, unknown>) =>
      ReactLocal.createElement(name, props, props.children as React.ReactNode);
    C.displayName = name;
    return C;
  };
  return {
    __esModule: true,
    default: stub("Svg"),
    Circle: stub("Circle"),
    Defs: stub("Defs"),
    LinearGradient: stub("LinearGradient"),
    Path: stub("Path"),
    Stop: stub("Stop"),
    Text: stub("SvgText"),
  };
});

const POINTS_A: WeightPoint[] = [
  {
    dayKey: "2026-09-01",
    observedAt: "2026-09-01T12:00:00.000Z",
    weightKg: 74,
    sourceId: "apple_health",
  },
  {
    dayKey: "2026-09-12",
    observedAt: "2026-09-12T12:00:00.000Z",
    weightKg: 75.5,
    sourceId: "apple_health",
  },
  {
    dayKey: "2026-09-21",
    observedAt: "2026-09-21T12:00:00.000Z",
    weightKg: 73,
    sourceId: "apple_health",
  },
];

describe("WeightTrendChart — inspection reset identity", () => {
  it("does not emit null when points array identity changes but content is identical", () => {
    const onInspectChange = jest.fn();
    let tree!: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        React.createElement(WeightTrendChart, {
          points: POINTS_A,
          unitLabel: "kg",
          formatValue: (kg: number) => `${kg}`,
          range: "30D" as const,
          onInspectChange,
        }),
      );
    });

    const chart = tree.root.findByProps({ testID: "weight-trend-chart" });
    act(() => {
      chart.props.onLayout({
        nativeEvent: { layout: { width: 360, height: 320, x: 0, y: 0 } },
      });
    });

    act(() => {
      tree.root.findByProps({ testID: "weight-trend-chart" }).props.onResponderGrant({
        nativeEvent: { locationX: 180, locationY: 160 },
      });
    });

    expect(onInspectChange).toHaveBeenCalled();
    const lastActive = [...onInspectChange.mock.calls].reverse().find((c) => c[0] != null);
    expect(lastActive?.[0]).toMatchObject({
      observedAt: expect.any(String),
      weightKg: expect.any(Number),
    });
    onInspectChange.mockClear();

    // Parent re-render pattern that previously cleared hero: new array, same content.
    act(() => {
      tree.update(
        React.createElement(WeightTrendChart, {
          points: [...POINTS_A],
          unitLabel: "kg",
          formatValue: (kg: number) => `${kg}`,
          range: "30D" as const,
          onInspectChange,
        }),
      );
    });

    const cleared = onInspectChange.mock.calls.some((c) => c[0] == null);
    expect(cleared).toBe(false);
  });

  it("emits null when observation content actually changes", () => {
    const onInspectChange = jest.fn();
    let tree!: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        React.createElement(WeightTrendChart, {
          points: POINTS_A,
          unitLabel: "kg",
          formatValue: (kg: number) => `${kg}`,
          range: "30D" as const,
          onInspectChange,
        }),
      );
    });

    const chart = tree.root.findByProps({ testID: "weight-trend-chart" });
    act(() => {
      chart.props.onLayout({
        nativeEvent: { layout: { width: 360, height: 320, x: 0, y: 0 } },
      });
    });
    act(() => {
      tree.root.findByProps({ testID: "weight-trend-chart" }).props.onResponderGrant({
        nativeEvent: { locationX: 180, locationY: 160 },
      });
    });
    onInspectChange.mockClear();

    const refreshed: WeightPoint[] = [
      ...POINTS_A.slice(0, 2),
      {
        dayKey: "2026-09-22",
        observedAt: "2026-09-22T12:00:00.000Z",
        weightKg: 72.5,
        sourceId: "apple_health",
      },
    ];

    act(() => {
      tree.update(
        React.createElement(WeightTrendChart, {
          points: refreshed,
          unitLabel: "kg",
          formatValue: (kg: number) => `${kg}`,
          range: "30D" as const,
          onInspectChange,
        }),
      );
    });

    expect(onInspectChange).toHaveBeenCalledWith(null);
  });
});
