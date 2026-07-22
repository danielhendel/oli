import React, { act } from "react";
import { Pressable, Text } from "react-native";
import renderer, { type ReactTestInstance } from "react-test-renderer";

import type { DailyReadinessCardViewModel } from "@/lib/ui/dash/DailyReadinessCard";
import { DailyReadinessCard } from "@/lib/ui/dash/DailyReadinessCard";
import { buildDailyReadinessCardModel } from "@/lib/data/dash/buildDailyReadinessCardModel";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

function allVisibleText(root: ReactTestInstance): string {
  return root
    .findAllByType(Text)
    .map((t) => {
      const ch = t.props.children;
      if (typeof ch === "string") return ch;
      if (Array.isArray(ch)) return ch.filter((x): x is string => typeof x === "string").join("");
      return "";
    })
    .join("|");
}

describe("DailyReadinessCard", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it("renders score and five contributor rows in order", () => {
    const model = buildDailyReadinessCardModel({
      day: "2026-07-10",
      ouraConnected: true,
      exactDayRestingHeartRateBpm: 49,
      readinessView: {
        requestedDay: "2026-07-10",
        resolvedDay: "2026-07-10",
        isFallback: false,
        day: "2026-07-10",
        sourceId: "oura",
        score: 87,
        contributors: {
          resting_heart_rate: 80,
          hrv_balance: 90,
          body_temperature: 88,
          recovery_index: 60,
          sleep_balance: 75,
          sleep: 99,
        },
      },
    });
    const vm: DailyReadinessCardViewModel = {
      status: "ready",
      day: "2026-07-10",
      model,
      accessibilityLabel: "Oura readiness",
    };

    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<DailyReadinessCard vm={vm} title="Readiness" />);
    });

    const flat = allVisibleText(root.root);
    expect(flat).toContain("Readiness Score 87");
    expect(flat).toContain("Optimal");
    expect(flat).not.toContain("Oura");
    expect(flat).toContain("49 bpm");
    expect(flat).toContain("HRV balance");
    expect(flat).not.toContain("Source: Oura");
    expect(flat).not.toContain("Ready. Recovery signals are strong today.");
    expect(flat).not.toContain("Sleep regularity");
    expect(root.root.findByProps({ testID: "readiness-metric-row-resting_heart_rate" })).toBeDefined();
    expect(root.root.findByProps({ testID: "readiness-metric-row-sleep_balance" })).toBeDefined();
    expect(() => root.root.findByProps({ testID: "dash-compact-provider-source" })).toThrow();

    const badge = root.root.findByProps({ testID: "dash-compact-rating-badge" });
    expect(allVisibleText(badge)).toBe("Optimal");
    expect(allVisibleText(badge)).not.toContain("Oura");

    const header = root.root.findAllByType(Pressable)[0];
    expect(header.props.accessibilityLabel).toMatch(/Readiness Score 87/);
    expect(header.props.accessibilityLabel).toMatch(/Rating Optimal/);
    expect(header.props.accessibilityLabel).toMatch(/Opens Readiness details/);
    expect(header.props.accessibilityLabel).not.toMatch(/Oura/i);
    expect(header.props.accessibilityLabel.match(/Optimal/g)?.length).toBe(1);
    expect(header.props.accessibilityLabel).not.toMatch(/blue|green|red|amber/i);
  });

  it("does not render contributor rows for fallback readiness", () => {
    const model = buildDailyReadinessCardModel({
      day: "2026-07-10",
      ouraConnected: true,
      readinessView: {
        requestedDay: "2026-07-10",
        resolvedDay: "2026-07-09",
        isFallback: true,
        day: "2026-07-09",
        sourceId: "oura",
        score: 83,
        contributors: { hrv_balance: 90 },
      },
    });
    const vm: DailyReadinessCardViewModel = {
      status: "missing",
      day: "2026-07-10",
      message: model.summarySentence,
    };
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<DailyReadinessCard vm={vm} />);
    });
    expect(() => root.root.findByProps({ testID: "readiness-metric-row-hrv_balance" })).toThrow();
    expect(allVisibleText(root.root)).toContain("No current-day readiness");
  });

  it("keeps score when one contributor is unavailable", () => {
    const model = buildDailyReadinessCardModel({
      day: "2026-07-10",
      ouraConnected: true,
      readinessView: {
        requestedDay: "2026-07-10",
        resolvedDay: "2026-07-10",
        isFallback: false,
        day: "2026-07-10",
        sourceId: "oura",
        score: 86,
        contributors: { hrv_balance: 90 },
      },
    });
    const vm: DailyReadinessCardViewModel = {
      status: "ready",
      day: "2026-07-10",
      model,
      accessibilityLabel: "ready",
    };
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<DailyReadinessCard vm={vm} />);
    });
    const flat = allVisibleText(root.root);
    expect(flat).toContain("86");
    expect(flat).toContain("\u2014");
  });

  it("navigates to readiness detail on press", () => {
    const model = buildDailyReadinessCardModel({
      day: "2026-07-10",
      ouraConnected: true,
      readinessView: {
        requestedDay: "2026-07-10",
        resolvedDay: "2026-07-10",
        isFallback: false,
        day: "2026-07-10",
        sourceId: "oura",
        score: 86,
      },
    });
    const vm: DailyReadinessCardViewModel = {
      status: "ready",
      day: "2026-07-10",
      model,
      accessibilityLabel: "Oura readiness",
    };
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<DailyReadinessCard vm={vm} />);
    });
    const header = root.root.findAllByType(Pressable)[0];
    act(() => {
      header.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/recovery/readiness");
  });

  it("renders chevrons and navigates each contributor row with typed id", () => {
    const model = buildDailyReadinessCardModel({
      day: "2026-07-10",
      ouraConnected: true,
      exactDayRestingHeartRateBpm: 49,
      readinessView: {
        requestedDay: "2026-07-10",
        resolvedDay: "2026-07-10",
        isFallback: false,
        day: "2026-07-10",
        sourceId: "oura",
        score: 86,
        contributors: {
          resting_heart_rate: 80,
          hrv_balance: 90,
          body_temperature: 88,
          recovery_index: 60,
          sleep_balance: 75,
        },
      },
    });
    const vm: DailyReadinessCardViewModel = {
      status: "ready",
      day: "2026-07-10",
      model,
      accessibilityLabel: "Oura readiness",
    };
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<DailyReadinessCard vm={vm} />);
    });

    const flat = allVisibleText(root.root);
    expect(flat.split("\u203A").length - 1).toBeGreaterThanOrEqual(5);

    const row = root.root.findByProps({ testID: "readiness-metric-row-hrv_balance" });
    act(() => {
      row.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(app)/recovery/readiness",
      params: { contributor: "hrv-balance" },
    });
  });
});
