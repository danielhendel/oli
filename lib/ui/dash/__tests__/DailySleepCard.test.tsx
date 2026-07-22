import React, { act } from "react";
import { Image, Modal, Pressable, Text } from "react-native";
import renderer, { type ReactTestInstance } from "react-test-renderer";

import type { SleepNightDocumentDto } from "@oli/contracts";
import { buildDailySleepCardModel, type DailySleepCardModel } from "@/lib/data/dash/buildDailySleepCardModel";
import type { DailySleepCardViewModel } from "@/lib/data/dash/dailySleepCardViewModel";
import { DailySleepCard } from "@/lib/ui/dash/DailySleepCard";
import { allowConsoleForThisTest } from "../../../../scripts/test/consoleGuard";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

const day = "2026-05-01";

function minimalNight(over: Partial<SleepNightDocumentDto> = {}): SleepNightDocumentDto {
  return {
    anchorDay: day,
    wakeDay: day,
    provider: "oura",
    source: "ouraVendorSleep",
    sourceDocumentId: "s1",
    isComplete: true,
    updatedAt: "2026-05-01T12:00:00.000Z",
    totalSleepMinutes: 480,
    ...over,
  };
}

function readyVm(model: DailySleepCardModel, isRefreshing = false): DailySleepCardViewModel {
  return { status: "ready", day: model.day, model, isRefreshing };
}

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

describe("DailySleepCard", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it("renders large Sleep Score hero with rating and Duration as first row", () => {
    const model = buildDailySleepCardModel({
      day,
      sleepNightSettled: true,
      sleepNight: minimalNight({
        mainSleepMinutes: 551,
        efficiency: 0.92,
        remMinutes: 124,
        deepMinutes: 76,
        score: 88,
      }),
    });

    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<DailySleepCard vm={readyVm(model)} title="Sleep" />);
    });

    const flat = allVisibleText(root.root);
    expect(flat).toContain("Sleep Score 88");
    expect(flat).toContain("Optimal");
    expect(flat).toContain("Oura");
    expect(flat).toContain("9h 11m");
    expect(flat).not.toContain("Last night\u2019s sleep");
    expect(flat).not.toContain("Oura Sleep Score");
    expect(flat).not.toContain("Strong overall sleep quality for this day.");
    expect(root.root.findByProps({ testID: "sleep-metric-row-sleep_duration" })).toBeDefined();
    expect(root.root.findAllByType(Image)).toHaveLength(0);

    const badge = root.root.findByProps({ testID: "dash-compact-rating-badge" });
    expect(allVisibleText(badge)).toBe("Optimal");
    expect(allVisibleText(badge)).not.toContain("Oura");
    const chip = root.root.findByProps({ testID: "dash-compact-provider-source" });
    expect(allVisibleText(chip)).toBe("Oura");

    const header = root.root
      .findAllByType(Pressable)
      .find(
        (p) =>
          typeof p.props.accessibilityLabel === "string" &&
          p.props.accessibilityLabel.includes("Sleep Score 88"),
      );
    expect(header?.props.accessibilityLabel).toMatch(/Sleep Score 88/);
    expect(header?.props.accessibilityLabel).toMatch(/Oura\./);
    expect(header?.props.accessibilityLabel).toMatch(/Rating Optimal/);
    expect(header?.props.accessibilityLabel).toMatch(/Opens Sleep details/);
    expect(header?.props.accessibilityLabel.match(/Oura/g)?.length).toBe(1);
    expect(header?.props.accessibilityLabel.match(/Optimal/g)?.length).toBe(1);
    expect(header?.props.accessibilityLabel).not.toMatch(/blue|green|red|amber/i);
  });

  it("applies semantic tones for representative Oura sleep ratings", () => {
    allowConsoleForThisTest({ error: [/not wrapped in act/] });
    const cases: { score: number; label: string }[] = [
      { score: 88, label: "Optimal" },
      { score: 75, label: "Good" },
      { score: 65, label: "Fair" },
      { score: 40, label: "Pay attention" },
    ];
    for (const c of cases) {
      const model = buildDailySleepCardModel({
        day,
        sleepNightSettled: true,
        sleepNight: minimalNight({ score: c.score, totalSleepMinutes: 480 }),
      });
      let root!: renderer.ReactTestRenderer;
      act(() => {
        root = renderer.create(<DailySleepCard vm={readyVm(model)} title="Sleep" />);
      });
      const badge = root.root.findByProps({ testID: "dash-compact-rating-badge" });
      expect(allVisibleText(badge)).toBe(c.label);
      expect(allVisibleText(badge)).not.toContain("Oura");
      expect(allVisibleText(root.root.findByProps({ testID: "dash-compact-provider-source" }))).toBe(
        "Oura",
      );
      act(() => {
        root.unmount();
      });
    }
  });

  it("lists Duration → Deep → REM → Efficiency without LHR/HRV", () => {
    const model = buildDailySleepCardModel({
      day,
      sleepNightSettled: true,
      sleepNight: minimalNight({
        mainSleepMinutes: 551,
        deepMinutes: 76,
        remMinutes: 124,
        efficiency: 0.92,
        score: 88,
        lowestHeartRateBpm: 50,
        averageHrvMs: 21,
      }),
    });

    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<DailySleepCard vm={readyVm(model)} />);
    });

    expect(root.root.findByProps({ testID: "sleep-metric-row-sleep_duration" })).toBeDefined();
    expect(root.root.findByProps({ testID: "sleep-metric-row-deep_sleep" })).toBeDefined();
    expect(root.root.findByProps({ testID: "sleep-metric-row-rem_sleep" })).toBeDefined();
    expect(root.root.findByProps({ testID: "sleep-metric-row-sleep_efficiency" })).toBeDefined();
    expect(() => root.root.findByProps({ testID: "sleep-metric-row-lowest_heart_rate" })).toThrow();
    expect(() => root.root.findByProps({ testID: "sleep-metric-row-average_hrv" })).toThrow();
    const flat = allVisibleText(root.root);
    expect(flat).not.toContain("Lowest heart rate");
    expect(flat).not.toContain("Average HRV");
  });

  it("shows Sleep score unavailable without fabricating zero when score missing", () => {
    const model = buildDailySleepCardModel({
      day,
      sleepNightSettled: true,
      sleepNight: minimalNight({
        mainSleepMinutes: 480,
        deepMinutes: 60,
        remMinutes: 90,
        efficiency: 0.9,
      }),
    });

    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<DailySleepCard vm={readyVm(model)} />);
    });

    const flat = allVisibleText(root.root);
    expect(flat).toContain("Unavailable");
    expect(flat).toContain("8h");
    expect(flat).not.toMatch(/\|0\|/);
    const header = root.root
      .findAllByType(Pressable)
      .find(
        (p) =>
          typeof p.props.accessibilityLabel === "string" &&
          p.props.accessibilityLabel.includes("Daily Sleep"),
      );
    expect(header?.props.accessibilityLabel).toMatch(/unavailable|Unavailable/i);
  });

  it("renders score 0 as a real score with Pay attention", () => {
    const model = buildDailySleepCardModel({
      day,
      sleepNightSettled: true,
      sleepNight: minimalNight({ score: 0, totalSleepMinutes: 300 }),
    });
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<DailySleepCard vm={readyVm(model)} />);
    });
    const flat = allVisibleText(root.root);
    expect(flat).toContain("Sleep Score 0");
    expect(flat).toContain("Pay attention");
    expect(flat).not.toContain("Sleep score unavailable");
  });

  it("renders chevron on metric rows", () => {
    const model = buildDailySleepCardModel({
      day,
      sleepNightSettled: true,
      sleepNight: minimalNight({ score: 80 }),
    });

    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<DailySleepCard vm={readyVm(model)} />);
    });

    const flat = allVisibleText(root.root);
    expect(flat).toContain("\u203A");
  });

  it("opens metric details sheet on deep_sleep row press without navigating", () => {
    const model = buildDailySleepCardModel({
      day,
      sleepNightSettled: true,
      sleepNight: minimalNight({ deepMinutes: 30, score: 80 }),
    });

    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<DailySleepCard vm={readyVm(model)} />);
    });

    const row = root.root.findByProps({ testID: "sleep-metric-row-deep_sleep" });
    act(() => {
      row.props.onPress();
    });

    const modals = root.root.findAllByType(Modal);
    const visibleModal = modals.find((m) => m.props.visible === true);
    expect(visibleModal).toBeDefined();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("navigates to Sleep when header is pressed", () => {
    const model = buildDailySleepCardModel({
      day,
      sleepNightSettled: true,
      sleepNight: minimalNight({ score: 82 }),
    });

    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<DailySleepCard vm={readyVm(model)} />);
    });

    const header = root.root
      .findAllByType(Pressable)
      .find(
        (p) =>
          typeof p.props.accessibilityLabel === "string" &&
          p.props.accessibilityLabel.includes("Daily Sleep"),
      );
    expect(header).toBeDefined();
    act(() => {
      (header as ReactTestInstance).props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/recovery/sleep");
  });

  it("shows a muted refreshing line when isRefreshing without hiding score", () => {
    const model = buildDailySleepCardModel({
      day,
      sleepNightSettled: true,
      sleepNight: minimalNight({ score: 96 }),
    });

    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<DailySleepCard vm={readyVm(model, true)} />);
    });

    const flat = allVisibleText(root.root);
    expect(flat).toContain("96");
    expect(flat).toContain("Refreshing daily sleep");
  });

  it("missing vm shows no-data message without stale metric rows", () => {
    const vm: DailySleepCardViewModel = {
      status: "missing",
      day,
      message: "No sleep data logged for this day.",
    };
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<DailySleepCard vm={vm} />);
    });
    expect(() => root.root.findByProps({ testID: "sleep-metric-row-deep_sleep" })).toThrow();
    const flat = allVisibleText(root.root);
    expect(flat).toContain("No sleep data logged for this day.");
  });

  it("partial vm does not render prior ready headline", () => {
    const vm: DailySleepCardViewModel = { status: "partial", day };
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<DailySleepCard vm={vm} />);
    });
    const flat = allVisibleText(root.root);
    expect(flat).toContain("Loading daily sleep");
    expect(flat).not.toContain("88");
  });
});
