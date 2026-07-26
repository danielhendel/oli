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

describe("DailySleepCard Deep and REM detail flags", () => {
  afterEach(() => {
    setSleepDurationDetailV1EnabledForTests(null);
    setDeepSleepDetailV1EnabledForTests(null);
    setRemSleepDetailV1EnabledForTests(null);
    mockPush.mockReset();
  });

  it("opens Deep detail controller when Deep flag enabled and deep available", () => {
    setDeepSleepDetailV1EnabledForTests(true);
    setRemSleepDetailV1EnabledForTests(false);
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
    const deepRow = root.root.findByProps({ testID: "sleep-metric-row-deep_sleep" });
    act(() => {
      deepRow.props.onPress();
    });
    expect(root.root.findByProps({ testID: "sleep-stage-detail-controller-deep_sleep" })).toBeDefined();
    expect(root.root.findByProps({ testID: "metric-details-sheet" }).props.visible).not.toBe(true);
  });

  it("opens REM detail controller when REM flag enabled and rem available", () => {
    setDeepSleepDetailV1EnabledForTests(false);
    setRemSleepDetailV1EnabledForTests(true);
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
    const remRow = root.root.findByProps({ testID: "sleep-metric-row-rem_sleep" });
    act(() => {
      remRow.props.onPress();
    });
    expect(root.root.findByProps({ testID: "sleep-stage-detail-controller-rem_sleep" })).toBeDefined();
    expect(root.root.findByProps({ testID: "metric-details-sheet" }).props.visible).not.toBe(true);
  });

  it("opens legacy sheet when Deep flag disabled", () => {
    setDeepSleepDetailV1EnabledForTests(false);
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <DailySleepCard vm={readyVm()} attributedSleepNight={minimalNight()} />,
      );
    });
    const deepRow = root.root.findByProps({ testID: "sleep-metric-row-deep_sleep" });
    act(() => {
      deepRow.props.onPress();
    });
    expect(root.root.findByProps({ testID: "metric-details-sheet" }).props.visible).toBe(true);
    expect(() =>
      root.root.findByProps({ testID: "sleep-stage-detail-controller-deep_sleep" }),
    ).toThrow();
  });

  it("opens legacy sheet when REM flag disabled", () => {
    setRemSleepDetailV1EnabledForTests(false);
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <DailySleepCard vm={readyVm()} attributedSleepNight={minimalNight()} />,
      );
    });
    const remRow = root.root.findByProps({ testID: "sleep-metric-row-rem_sleep" });
    act(() => {
      remRow.props.onPress();
    });
    expect(root.root.findByProps({ testID: "metric-details-sheet" }).props.visible).toBe(true);
    expect(() =>
      root.root.findByProps({ testID: "sleep-stage-detail-controller-rem_sleep" }),
    ).toThrow();
  });

  it("does not open Deep detail when deep unavailable", () => {
    setDeepSleepDetailV1EnabledForTests(true);
    const night = minimalNight({ deepMinutes: undefined, deepPercent: undefined });
    const model = buildDailySleepCardModel({
      day,
      sleepNightSettled: true,
      sleepNight: night,
    });
    const deepRowModel = model.metricRows.find((r) => r.id === "deep_sleep");
    expect(deepRowModel?.isAvailable).toBe(false);

    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <DailySleepCard
          vm={{ status: "ready", day, model, isRefreshing: false }}
          attributedSleepNight={night}
        />,
      );
    });
    const deepRow = root.root.findByProps({ testID: "sleep-metric-row-deep_sleep" });
    expect(deepRow.props.onPress).toBeUndefined();
    expect(() =>
      root.root.findByProps({ testID: "sleep-stage-detail-controller-deep_sleep" }),
    ).toThrow();
  });

  it("keeps Duration on new sheet and Efficiency on legacy when stage flags enabled", () => {
    setSleepDurationDetailV1EnabledForTests(true);
    setDeepSleepDetailV1EnabledForTests(true);
    setRemSleepDetailV1EnabledForTests(true);
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <DailySleepCard vm={readyVm()} attributedSleepNight={minimalNight()} />,
      );
    });

    const durationRow = root.root.findByProps({ testID: "sleep-metric-row-sleep_duration" });
    act(() => {
      durationRow.props.onPress();
    });
    expect(root.root.findByProps({ testID: "sleep-duration-detail-controller" })).toBeDefined();

    act(() => {
      root.update(<DailySleepCard vm={readyVm()} attributedSleepNight={minimalNight()} />);
    });
    const efficiency = root.root.findByProps({ testID: "sleep-metric-row-sleep_efficiency" });
    act(() => {
      efficiency.props.onPress();
    });
    expect(root.root.findByProps({ testID: "metric-details-sheet" }).props.visible).toBe(true);
  });
});
