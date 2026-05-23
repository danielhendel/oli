import React, { act } from "react";
import renderer from "react-test-renderer";
import { describe, expect, it } from "@jest/globals";

import {
  buildEnergyBaselineVm,
  ENERGY_BASELINE_EXPLAINER_COPY,
  ENERGY_BASELINE_UNAVAILABLE_DISPLAY,
} from "@/lib/data/energy/buildEnergyBaselineVm";
import type { WeeklyDailyEnergyCell } from "@/lib/data/dash/useWeeklyDailyEnergyMap";
import { EnergyBaselineCard } from "@/lib/ui/energy/EnergyBaselineCard";
import {
  addCalendarDaysToDayKey,
  enumerateDaysInclusive,
} from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

jest.mock("@/lib/ui/ScreenStates", () => ({
  LoadingState: ({ message }: { message: string }) => {
    const React = require("react");
    return React.createElement("Text", null, message);
  },
}));

function energyCell(day: DayKey, low: number, high: number): WeeklyDailyEnergyCell {
  return {
    settled: true,
    energy: {
      modelVersion: "daily_energy_v3",
      computedAt: "2026-05-20T12:00:00.000Z",
      day,
      estimatedKcal: { low, high, midpoint: (low + high) / 2 },
      variancePct: 0.08,
      confidence: "moderate",
      factors: {},
      missingRequiredInputs: [],
    },
  };
}

function allText(root: renderer.ReactTestInstance): string {
  return root
    .findAllByType("Text")
    .flatMap((n) => n.children)
    .filter((c): c is string => typeof c === "string")
    .join(" ");
}

describe("EnergyBaselineCard", () => {
  const today = "2026-05-20" as DayKey;
  // All Energy Baseline windows end at the prior completed day.
  const baselineEndDay = addCalendarDaysToDayKey(today, -1);

  function trailingDays(count: number): DayKey[] {
    const start = addCalendarDaysToDayKey(baselineEndDay, -(count - 1));
    return enumerateDaysInclusive(start, baselineEndDay);
  }

  function fillComplete(
    days: readonly DayKey[],
    low: number,
    high: number,
  ): Partial<Record<DayKey, WeeklyDailyEnergyCell>> {
    const out: Partial<Record<DayKey, WeeklyDailyEnergyCell>> = {};
    for (const d of days) {
      out[d] = energyCell(d, low, high);
    }
    return out;
  }

  it("renders title, description copy, and all five baseline rows", () => {
    const model = buildEnergyBaselineVm({
      todayDayKey: today,
      energyByDay: fillComplete(trailingDays(7), 2230, 2714),
    });

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<EnergyBaselineCard loading={false} model={model} />);
    });

    const flat = allText(tree.root);
    expect(flat).toContain("Energy Baseline");
    expect(flat).toContain(ENERGY_BASELINE_EXPLAINER_COPY);
    expect(flat).toContain("7 Day");
    expect(flat).toContain("30 Day");
    expect(flat).toContain("90 Day");
    expect(flat).toContain("YTD");
    expect(flat).toContain("12 Month");
  });

  it("renders formatted average kcal/day range for a fully covered row", () => {
    const model = buildEnergyBaselineVm({
      todayDayKey: today,
      energyByDay: fillComplete(trailingDays(7), 2230, 2714),
    });

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<EnergyBaselineCard loading={false} model={model} />);
    });

    const flat = allText(tree.root);
    expect(flat).toContain("2,230\u20132,714 kcal/day");
  });

  it("renders the unavailable glyph for rows with no data", () => {
    const model = buildEnergyBaselineVm({ todayDayKey: today, energyByDay: {} });

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<EnergyBaselineCard loading={false} model={model} />);
    });

    const flat = allText(tree.root);
    const occurrences = flat.split(ENERGY_BASELINE_UNAVAILABLE_DISPLAY).length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(5);
  });

  it("renders a progress track for every row, including unavailable rows", () => {
    const model = buildEnergyBaselineVm({
      todayDayKey: today,
      energyByDay: fillComplete(trailingDays(7), 2230, 2714),
    });

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<EnergyBaselineCard loading={false} model={model} />);
    });

    for (const key of ["day7", "day30", "day90", "ytd", "month12"] as const) {
      expect(
        tree.root.findByProps({ testID: `energy-baseline-row-${key}` }),
      ).toBeDefined();
      expect(
        tree.root.findByProps({ testID: `energy-baseline-progress-${key}` }),
      ).toBeDefined();
    }
  });

  it("shows the loading state and hides rows when loading", () => {
    const model = buildEnergyBaselineVm({ todayDayKey: today, energyByDay: {} });

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<EnergyBaselineCard loading model={model} />);
    });

    const flat = allText(tree.root);
    expect(flat).toContain("Loading energy baseline");
    expect(tree.root.findAllByProps({ testID: "energy-baseline-metric-groups" })).toHaveLength(0);
  });
});
