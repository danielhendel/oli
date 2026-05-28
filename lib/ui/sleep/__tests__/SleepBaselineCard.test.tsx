import React from "react";
import renderer, { act } from "react-test-renderer";
import { describe, expect, it } from "@jest/globals";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import type { SleepBaselineVm } from "@/lib/data/sleep/buildSleepBaselineVm";
import { ENERGY_BASELINE_FILL_COLOR } from "@/lib/ui/energy/EnergyBaselineProgressTrack";
import {
  SLEEP_BASELINE_CALCULATING_COPY,
  SleepBaselineCard,
} from "@/lib/ui/sleep/SleepBaselineCard";

function flattenBackgroundColor(style: StyleProp<ViewStyle> | undefined): string | undefined {
  const flat = StyleSheet.flatten(style ?? undefined) as ViewStyle | undefined;
  return flat?.backgroundColor as string | undefined;
}

function rowsForAllTiers(): SleepBaselineVm["rows"] {
  return [
    {
      key: "day7",
      label: "7 Day",
      hasEnoughData: true,
      averageMinutes: 540,
      displayValue: "9h/night",
      statusLabel: "Optimal",
      statusColor: "#3D62CC",
      statusBackgroundColor: "#EBF1FF",
      progressFill01: 0.95,
    },
    {
      key: "day30",
      label: "30 Day",
      hasEnoughData: true,
      averageMinutes: 420,
      displayValue: "7h/night",
      statusLabel: "Good",
      statusColor: "#248A3D",
      statusBackgroundColor: "#F0F8F4",
      progressFill01: 0.875,
    },
    {
      key: "day90",
      label: "90 Day",
      hasEnoughData: true,
      averageMinutes: 390,
      displayValue: "6h 30m/night",
      statusLabel: "Fair",
      statusColor: "#C77700",
      statusBackgroundColor: "#FFF5E1",
      progressFill01: 0.81,
    },
    {
      key: "ytd",
      label: "YTD",
      hasEnoughData: true,
      averageMinutes: 300,
      displayValue: "5h/night",
      statusLabel: "Low",
      statusColor: "#B3261E",
      statusBackgroundColor: "#FCE9E7",
      progressFill01: 0.62,
    },
    {
      key: "month12",
      label: "12 Month",
      hasEnoughData: false,
      averageMinutes: null,
      displayValue: "—",
      statusLabel: null,
      statusColor: null,
      statusBackgroundColor: null,
      progressFill01: null,
    },
  ];
}

function makeVm(): SleepBaselineVm {
  return {
    rows: rowsForAllTiers(),
    personalizedExplainer: "stub explainer",
  };
}

describe("SleepBaselineCard", () => {
  it("uses constant Oli blue for every progress bar fill regardless of tier", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<SleepBaselineCard model={makeVm()} />);
    });

    for (const key of ["day7", "day30", "day90", "ytd", "month12"] as const) {
      const track = tree.root.findByProps({ testID: `sleep-baseline-progress-${key}` });
      const fillNodes = track.findAll(
        (n) =>
          flattenBackgroundColor(n.props?.style as StyleProp<ViewStyle>) ===
          ENERGY_BASELINE_FILL_COLOR,
      );
      expect(fillNodes.length).toBeGreaterThan(0);
    }
  });

  it("renders the personalized explainer when not loading", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<SleepBaselineCard model={makeVm()} loading={false} />);
    });
    expect(
      tree.root.findByProps({ testID: "sleep-baseline-explainer" }).props.children,
    ).toBe("stub explainer");
    expect(
      tree.root.findAllByProps({ testID: "sleep-baseline-loading-subtitle" }),
    ).toHaveLength(0);
  });

  it("renders the calculating subtitle when loading is true and suppresses the explainer", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<SleepBaselineCard model={makeVm()} loading={true} />);
    });
    expect(
      tree.root.findByProps({ testID: "sleep-baseline-loading-subtitle" }).props.children,
    ).toBe(SLEEP_BASELINE_CALCULATING_COPY);
    expect(
      tree.root.findAllByProps({ testID: "sleep-baseline-explainer" }),
    ).toHaveLength(0);
  });

  it("still renders all five baseline rows while loading (so layout doesn't pop in)", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<SleepBaselineCard model={makeVm()} loading={true} />);
    });
    for (const key of ["day7", "day30", "day90", "ytd", "month12"] as const) {
      expect(tree.root.findByProps({ testID: `sleep-baseline-progress-${key}` })).toBeTruthy();
    }
  });
});
