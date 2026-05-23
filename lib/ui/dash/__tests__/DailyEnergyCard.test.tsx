import React from "react";
import renderer, { act } from "react-test-renderer";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import {
  DAILY_ENERGY_DETAIL_PATHNAME,
  ENERGY_METRIC_EXPLAINER_PATHNAME,
} from "@/lib/data/energy/energyMetricExplainerRoutes";
import { DailyEnergyCard } from "@/lib/ui/dash/DailyEnergyCard";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

describe("DailyEnergyCard", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it("renders empty state when energy is unavailable", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<DailyEnergyCard energy={undefined} loading={false} error={null} />);
    });
    const text = tree.root
      .findAllByType("Text")
      .flatMap((n) => n.children)
      .filter((c) => typeof c === "string")
      .join(" ");
    expect(text).toContain("Not enough data yet to estimate energy.");
  });

  it("renders ready state with only present factor rows", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <DailyEnergyCard
          loading={false}
          error={null}
          energy={{
            modelVersion: "daily_energy_v3",
            computedAt: "2026-05-05T12:00:00.000Z",
            day: "2026-05-05",
            estimatedKcal: { low: 2120, high: 2480, midpoint: 2300 },
            variancePct: 0.081,
            confidence: "moderate",
            factors: {
              baseline: { kcalLow: 1520, kcalHigh: 1710 },
              steps: { kcalLow: 272, kcalHigh: 368 },
              cardio: { kcalLow: 120, kcalHigh: 200 },
              strength: { kcalLow: 90, kcalHigh: 180 },
            },
            missingRequiredInputs: [],
          }}
        />,
      );
    });
    const text = tree.root
      .findAllByType("Text")
      .flatMap((n) => n.children)
      .filter((c) => typeof c === "string")
      .join(" ");
    expect(text).toContain("2,120–2,480 kcal");
    expect(text).toContain("+1,520–1,710 kcal");
    expect(text).toContain("BMR");
    expect(text).toContain("NEAT");
    expect(text).toContain("Cardio");
    expect(text).toContain("Strength");
    expect(text).toContain("+90–180 kcal");
    expect(text).toMatch(/Confidence \w+ · ±/);
    const factorPressables = tree.root
      .findAllByType("Pressable")
      .filter((p) => typeof p.props.testID === "string" && p.props.testID.startsWith("energy-row-"));
    expect(factorPressables).toHaveLength(4);
  });

  it("hides Strength row when strength factor is absent", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <DailyEnergyCard
          loading={false}
          error={null}
          energy={{
            modelVersion: "daily_energy_v3",
            computedAt: "2026-05-05T12:00:00.000Z",
            day: "2026-05-05",
            estimatedKcal: { low: 2000, high: 2200, midpoint: 2100 },
            variancePct: 0.05,
            confidence: "moderate",
            factors: {
              baseline: { kcalLow: 1500, kcalHigh: 1600 },
              steps: { kcalLow: 200, kcalHigh: 300 },
              cardio: { kcalLow: 100, kcalHigh: 150 },
            },
            missingRequiredInputs: [],
          }}
        />,
      );
    });
    const text = tree.root
      .findAllByType("Text")
      .flatMap((n) => n.children)
      .filter((c) => typeof c === "string")
      .join(" ");
    expect(text).not.toContain("Strength");
    const factorPressables = tree.root
      .findAllByType("Pressable")
      .filter((p) => typeof p.props.testID === "string" && p.props.testID.startsWith("energy-row-"));
    expect(factorPressables).toHaveLength(3);
  });

  it("navigates to Daily Energy detail when header is pressed", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <DailyEnergyCard
          loading={false}
          error={null}
          energy={{
            modelVersion: "daily_energy_v3",
            computedAt: "2026-05-05T12:00:00.000Z",
            day: "2026-05-05",
            estimatedKcal: { low: 2120, high: 2480, midpoint: 2300 },
            variancePct: 0.081,
            confidence: "moderate",
            factors: {
              baseline: { kcalLow: 1520, kcalHigh: 1710 },
            },
            missingRequiredInputs: [],
          }}
        />,
      );
    });
    const header = tree.root
      .findAllByType("Pressable")
      .find(
        (p) =>
          typeof p.props.accessibilityLabel === "string" &&
          p.props.accessibilityLabel.startsWith("Daily Energy header"),
      );
    expect(header).toBeDefined();
    act(() => {
      header?.props.onPress?.();
    });
    expect(mockPush).toHaveBeenCalledWith(DAILY_ENERGY_DETAIL_PATHNAME);
  });

  it("header press is disabled while loading", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<DailyEnergyCard energy={undefined} loading error={null} />);
    });
    const header = tree.root
      .findAllByType("Pressable")
      .find(
        (p) =>
          typeof p.props.accessibilityLabel === "string" &&
          p.props.accessibilityLabel.startsWith("Daily Energy header"),
      );
    expect(header?.props.disabled).toBe(true);
  });

  it("opens Daily Energy metric explainer modal when BMR row is pressed", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <DailyEnergyCard
          loading={false}
          error={null}
          energy={{
            modelVersion: "daily_energy_v3",
            computedAt: "2026-05-05T12:00:00.000Z",
            day: "2026-05-05",
            estimatedKcal: { low: 2120, high: 2480, midpoint: 2300 },
            variancePct: 0.081,
            confidence: "moderate",
            factors: {
              baseline: { kcalLow: 1520, kcalHigh: 1710 },
              steps: { kcalLow: 272, kcalHigh: 368 },
            },
            missingRequiredInputs: [],
          }}
        />,
      );
    });
    const bmr = tree.root.findAllByType("Pressable").find((n) => n.props.testID === "energy-row-baseline");
    expect(bmr).toBeDefined();
    act(() => {
      bmr?.props.onPress?.();
    });
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush.mock.calls[0]?.[0]).toEqual({
      pathname: ENERGY_METRIC_EXPLAINER_PATHNAME,
      params: { metric: "baseline", day: "2026-05-05" },
    });
  });

  it("renders cardio factor range when present", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <DailyEnergyCard
          loading={false}
          error={null}
          energy={{
            modelVersion: "daily_energy_v3",
            computedAt: "2026-05-05T12:00:00.000Z",
            day: "2026-05-05",
            estimatedKcal: { low: 2300, high: 2500, midpoint: 2400 },
            variancePct: 0.05,
            confidence: "high",
            factors: {
              baseline: { kcal: 1700 },
              steps: { kcal: 400 },
              cardio: { kcalLow: 120, kcalHigh: 200 },
            },
            missingRequiredInputs: [],
          }}
        />,
      );
    });
    const text = tree.root
      .findAllByType("Text")
      .flatMap((n) => n.children)
      .filter((c) => typeof c === "string")
      .join(" ");
    expect(text).toContain("Cardio");
    expect(text).toContain("+120–200 kcal");
  });

  it("renders strength factor when only strength is present", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <DailyEnergyCard
          loading={false}
          error={null}
          energy={{
            modelVersion: "daily_energy_v3",
            computedAt: "2026-05-05T12:00:00.000Z",
            day: "2026-05-05",
            estimatedKcal: { low: 2200, high: 2600, midpoint: 2400 },
            variancePct: 0.1,
            confidence: "moderate",
            factors: {
              strength: { kcalLow: 90, kcalHigh: 180 },
            },
            missingRequiredInputs: [],
          }}
        />,
      );
    });
    const text = tree.root
      .findAllByType("Text")
      .flatMap((n) => n.children)
      .filter((c) => typeof c === "string")
      .join(" ");
    expect(text).toContain("+90–180 kcal");
    expect(text).toContain("Strength");
    const factorPressables = tree.root
      .findAllByType("Pressable")
      .filter((p) => typeof p.props.testID === "string" && p.props.testID.startsWith("energy-row-"));
    expect(factorPressables).toHaveLength(1);
  });
});
