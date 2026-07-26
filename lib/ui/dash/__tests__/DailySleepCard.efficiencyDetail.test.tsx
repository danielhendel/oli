import React, { act } from "react";
import renderer from "react-test-renderer";

import type { SleepNightDocumentDto } from "@oli/contracts";
import { buildDailySleepCardModel } from "@/lib/data/dash/buildDailySleepCardModel";
import type { DailySleepCardViewModel } from "@/lib/data/dash/dailySleepCardViewModel";
import {
  setDeepSleepDetailV1EnabledForTests,
} from "@/lib/data/sleep/deepSleepDetailFlag";
import {
  setRemSleepDetailV1EnabledForTests,
} from "@/lib/data/sleep/remSleepDetailFlag";
import {
  setSleepDurationDetailV1EnabledForTests,
} from "@/lib/data/sleep/sleepDurationDetailFlag";
import {
  setSleepEfficiencyDetailV1EnabledForTests,
} from "@/lib/data/sleep/sleepEfficiencyDetailFlag";
import { DailySleepCard } from "@/lib/ui/dash/DailySleepCard";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

jest.mock("@/lib/ui/sleep/SleepDurationDetailController", () => ({
  SleepDurationDetailController: (props: { selectedDay: string }) => {
    const React = require("react");
    const { Text: T } = require("react-native");
    return React.createElement(T, { testID: "sleep-duration-detail-controller" }, props.selectedDay);
  },
}));

jest.mock("@/lib/ui/sleep/SleepStageDetailController", () => ({
  SleepStageDetailController: (props: { metricId: string; selectedDay: string }) => {
    const React = require("react");
    const { Text: T } = require("react-native");
    return React.createElement(
      T,
      { testID: `sleep-stage-detail-controller-${props.metricId}` },
      props.selectedDay,
    );
  },
}));

jest.mock("@/lib/ui/sleep/SleepEfficiencyDetailController", () => ({
  SleepEfficiencyDetailController: (props: { selectedDay: string }) => {
    const React = require("react");
    const { Text: T } = require("react-native");
    return React.createElement(
      T,
      { testID: "sleep-efficiency-detail-controller" },
      props.selectedDay,
    );
  },
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
    mainSleepMinutes: 450,
    totalSleepMinutes: 450,
    deepMinutes: 50,
    remMinutes: 132,
    deepPercent: 11,
    remPercent: 29,
    efficiency: 0.93,
    score: 88,
    ...over,
  };
}

function readyVm(night: SleepNightDocumentDto = minimalNight()): DailySleepCardViewModel {
  const model = buildDailySleepCardModel({
    day,
    sleepNightSettled: true,
    sleepNight: night,
  });
  return { status: "ready", day, model, isRefreshing: false };
}

describe("DailySleepCard Sleep Efficiency detail flag", () => {
  afterEach(() => {
    setSleepDurationDetailV1EnabledForTests(null);
    setDeepSleepDetailV1EnabledForTests(null);
    setRemSleepDetailV1EnabledForTests(null);
    setSleepEfficiencyDetailV1EnabledForTests(null);
    mockPush.mockReset();
  });

  it("opens Efficiency detail controller when flag enabled and efficiency available", () => {
    setSleepEfficiencyDetailV1EnabledForTests(true);
    setDeepSleepDetailV1EnabledForTests(true);
    setRemSleepDetailV1EnabledForTests(true);
    setSleepDurationDetailV1EnabledForTests(true);
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <DailySleepCard
          vm={readyVm()}
          attributedSleepNight={minimalNight()}
          attributedSleepResolution="exact_anchor"
        />,
      );
    });
    const row = root.root.findByProps({ testID: "sleep-metric-row-sleep_efficiency" });
    act(() => {
      row.props.onPress();
    });
    expect(root.root.findByProps({ testID: "sleep-efficiency-detail-controller" })).toBeDefined();
    expect(root.root.findByProps({ testID: "metric-details-sheet" }).props.visible).not.toBe(true);
  });

  it("opens legacy sheet when Efficiency flag disabled", () => {
    setSleepEfficiencyDetailV1EnabledForTests(false);
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <DailySleepCard vm={readyVm()} attributedSleepNight={minimalNight()} />,
      );
    });
    const row = root.root.findByProps({ testID: "sleep-metric-row-sleep_efficiency" });
    act(() => {
      row.props.onPress();
    });
    expect(root.root.findByProps({ testID: "metric-details-sheet" }).props.visible).toBe(true);
    expect(() =>
      root.root.findByProps({ testID: "sleep-efficiency-detail-controller" }),
    ).toThrow();
  });

  it("does not open Efficiency detail when unavailable", () => {
    setSleepEfficiencyDetailV1EnabledForTests(true);
    const night = minimalNight({ efficiency: undefined });
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <DailySleepCard vm={readyVm(night)} attributedSleepNight={night} />,
      );
    });
    const row = root.root.findByProps({ testID: "sleep-metric-row-sleep_efficiency" });
    expect(row.props.onPress).toBeUndefined();
    expect(() =>
      root.root.findByProps({ testID: "sleep-efficiency-detail-controller" }),
    ).toThrow();
  });

  it("leaves Duration, Deep, and REM routing unchanged when Efficiency opens", () => {
    setSleepEfficiencyDetailV1EnabledForTests(true);
    setDeepSleepDetailV1EnabledForTests(true);
    setRemSleepDetailV1EnabledForTests(true);
    setSleepDurationDetailV1EnabledForTests(true);
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <DailySleepCard
          vm={readyVm()}
          attributedSleepNight={minimalNight()}
          attributedSleepResolution="exact_anchor"
        />,
      );
    });
    act(() => {
      root.root.findByProps({ testID: "sleep-metric-row-deep_sleep" }).props.onPress();
    });
    expect(root.root.findByProps({ testID: "sleep-stage-detail-controller-deep_sleep" })).toBeDefined();
    expect(() =>
      root.root.findByProps({ testID: "sleep-efficiency-detail-controller" }),
    ).toThrow();

    act(() => {
      root.root.findByProps({ testID: "sleep-metric-row-sleep_duration" }).props.onPress();
    });
    expect(root.root.findByProps({ testID: "sleep-duration-detail-controller" })).toBeDefined();
  });
});
