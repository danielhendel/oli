import React, { act } from "react";
import renderer from "react-test-renderer";
import { describe, expect, it } from "@jest/globals";

import type { WeeklyEnergyChartPoint } from "@/lib/data/dash/buildWeeklyEnergyVm";
import { EnergyWeeklyRangeBars } from "@/lib/ui/energy/EnergyWeeklyRangeBars";
import type { DayKey } from "@/lib/ui/calendar/types";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Animated: {
    View: "Animated.View",
    Value: class {
      constructor(v: number) {
        this._v = v;
      }
      _v: number;
      setValue(v: number) {
        this._v = v;
      }
    },
    timing: () => ({
      start: function animationStubStart() {
        return undefined;
      },
    }),
  },
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
  Easing: {
    out: function easingOutStub(fn: unknown) {
      return fn;
    },
    quad: "quad",
  },
}));

const week: DayKey[] = [
  "2026-05-17",
  "2026-05-18",
  "2026-05-19",
  "2026-05-20",
  "2026-05-21",
  "2026-05-22",
  "2026-05-23",
] as DayKey[];

function makePoints(): WeeklyEnergyChartPoint[] {
  return week.map((dayKey, i) => {
    if (dayKey > "2026-05-20") {
      return {
        dayKey,
        displayLabel: ["S", "M", "T", "W", "T", "F", "S"][i]!,
        low: null,
        high: null,
        isFutureDay: true,
      };
    }
    if (dayKey === "2026-05-19") {
      return {
        dayKey,
        displayLabel: "T",
        low: null,
        high: null,
        isFutureDay: false,
      };
    }
    return {
      dayKey,
      displayLabel: ["S", "M", "T", "W", "T", "F", "S"][i]!,
      low: 2000,
      high: 2500,
      isFutureDay: false,
    };
  });
}

function styleAsObject(node: renderer.ReactTestInstance): Record<string, unknown> {
  const style = node.props.style;
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.filter((s: unknown) => s && typeof s === "object"));
  }
  return style ?? {};
}

describe("EnergyWeeklyRangeBars", () => {
  it("renders seven weekday bar slots", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <EnergyWeeklyRangeBars
          points={makePoints()}
          barTrackHeight={176}
          chartMin={1900}
          chartMax={2600}
          todayDayKey={"2026-05-20" as DayKey}
        />,
      );
    });
    expect(tree.root.findByProps({ testID: "energy-this-week-weekly-chart" })).toBeDefined();
    for (const day of week) {
      expect(tree.root.findByProps({ testID: `energy-week-bar-${day}` })).toBeDefined();
    }
  });

  it("floating column anchors low at bottom with positive span height", () => {
    const points: WeeklyEnergyChartPoint[] = [
      {
        dayKey: "2026-05-20" as DayKey,
        displayLabel: "W",
        low: 2000,
        high: 2500,
        isFutureDay: false,
      },
    ];
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <EnergyWeeklyRangeBars
          points={points}
          barTrackHeight={100}
          chartMin={1900}
          chartMax={2600}
          todayDayKey={"2026-05-20" as DayKey}
        />,
      );
    });
    const bar = tree.root.findByType("Animated.View");
    const style = styleAsObject(bar);
    expect(typeof style.bottom).toBe("number");
    expect(style.bottom as number).toBeGreaterThan(0);
    expect(style.height).toBeDefined();
    expect(style.backgroundColor).toBe("#4F7CFF");
  });

  it("missing day renders no Animated.View bar without crashing", () => {
    const points: WeeklyEnergyChartPoint[] = [
      {
        dayKey: "2026-05-19" as DayKey,
        displayLabel: "T",
        low: null,
        high: null,
        isFutureDay: false,
      },
    ];
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <EnergyWeeklyRangeBars
          points={points}
          barTrackHeight={100}
          chartMin={0}
          chartMax={3000}
          todayDayKey={"2026-05-20" as DayKey}
        />,
      );
    });
    expect(() => tree.root.findByType("Animated.View")).toThrow();
  });

  it("renders high label at top and low label at bottom of each present bar", () => {
    const points: WeeklyEnergyChartPoint[] = [
      {
        dayKey: "2026-05-18" as DayKey,
        displayLabel: "M",
        low: 2000,
        high: 2500,
        isFutureDay: false,
      },
      {
        dayKey: "2026-05-20" as DayKey,
        displayLabel: "W",
        low: 2200,
        high: 2700,
        isFutureDay: false,
      },
    ];
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <EnergyWeeklyRangeBars
          points={points}
          barTrackHeight={176}
          chartMin={1900}
          chartMax={2800}
          todayDayKey={"2026-05-20" as DayKey}
        />,
      );
    });

    const monHigh = tree.root.findByProps({ testID: "energy-week-bar-2026-05-18-high-label" });
    const monLow = tree.root.findByProps({ testID: "energy-week-bar-2026-05-18-low-label" });
    const wedHigh = tree.root.findByProps({ testID: "energy-week-bar-2026-05-20-high-label" });
    const wedLow = tree.root.findByProps({ testID: "energy-week-bar-2026-05-20-low-label" });

    expect(monHigh.props.children).toBe("2,500");
    expect(monLow.props.children).toBe("2,000");
    expect(wedHigh.props.children).toBe("2,700");
    expect(wedLow.props.children).toBe("2,200");

    const monHighBottom = styleAsObject(monHigh).bottom as number;
    const monLowBottom = styleAsObject(monLow).bottom as number;
    expect(monHighBottom).toBeGreaterThan(monLowBottom);
  });

  it("does not render value labels for future days", () => {
    const points: WeeklyEnergyChartPoint[] = [
      {
        dayKey: "2026-05-22" as DayKey,
        displayLabel: "F",
        low: null,
        high: null,
        isFutureDay: true,
      },
    ];
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <EnergyWeeklyRangeBars
          points={points}
          barTrackHeight={176}
          chartMin={1900}
          chartMax={2800}
          todayDayKey={"2026-05-20" as DayKey}
        />,
      );
    });
    expect(() => tree.root.findByProps({ testID: "energy-week-bar-2026-05-22-high-label" })).toThrow();
    expect(() => tree.root.findByProps({ testID: "energy-week-bar-2026-05-22-low-label" })).toThrow();
  });

  it("does not render value labels for missing past days", () => {
    const points: WeeklyEnergyChartPoint[] = [
      {
        dayKey: "2026-05-19" as DayKey,
        displayLabel: "T",
        low: null,
        high: null,
        isFutureDay: false,
      },
    ];
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <EnergyWeeklyRangeBars
          points={points}
          barTrackHeight={176}
          chartMin={1900}
          chartMax={2800}
          todayDayKey={"2026-05-20" as DayKey}
        />,
      );
    });
    expect(() => tree.root.findByProps({ testID: "energy-week-bar-2026-05-19-high-label" })).toThrow();
    expect(() => tree.root.findByProps({ testID: "energy-week-bar-2026-05-19-low-label" })).toThrow();
  });
});
