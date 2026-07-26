import React, { act } from "react";
import renderer from "react-test-renderer";

import type { SleepNightDocumentDto } from "@oli/contracts";
import { buildDailySleepCardModel } from "@/lib/data/dash/buildDailySleepCardModel";
import type { DailySleepCardViewModel } from "@/lib/data/dash/dailySleepCardViewModel";
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
    mainSleepMinutes: 391,
    score: 88,
    ...over,
  };
}

function readyVm(): DailySleepCardViewModel {
  const model = buildDailySleepCardModel({
    day,
    sleepNightSettled: true,
    sleepNight: minimalNight(),
  });
  return { status: "ready", day, model, isRefreshing: false };
}

describe("DailySleepCard Duration detail flag", () => {
  afterEach(() => {
    setSleepDurationDetailV1EnabledForTests(null);
    mockPush.mockReset();
  });

  it("opens Duration detail controller when flag enabled and duration available", () => {
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

    const durationRow = root.root.findByProps({ testID: "sleep-metric-row-sleep_duration" });
    act(() => {
      durationRow.props.onPress();
    });
    expect(root.root.findByProps({ testID: "sleep-duration-detail-controller" })).toBeDefined();
    expect(() => root.root.findByProps({ testID: "metric-details-sheet" }).props.visible).not.toBe(
      true,
    );
  });

  it("opens legacy MetricDetailsSheet when flag disabled", () => {
    setSleepDurationDetailV1EnabledForTests(false);
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

    const durationRow = root.root.findByProps({ testID: "sleep-metric-row-sleep_duration" });
    act(() => {
      durationRow.props.onPress();
    });
    const sheet = root.root.findByProps({ testID: "metric-details-sheet" });
    expect(sheet.props.visible).toBe(true);
    expect(() => root.root.findByProps({ testID: "sleep-duration-detail-controller" })).toThrow();
  });

  it("does not open Duration detail when duration unavailable", () => {
    setSleepDurationDetailV1EnabledForTests(true);
    const model = buildDailySleepCardModel({
      day,
      sleepNightSettled: true,
      sleepNight: minimalNight({ mainSleepMinutes: undefined, totalSleepMinutes: undefined, score: 88 }),
    });
    const durationRowModel = model.metricRows.find((r) => r.id === "sleep_duration");
    expect(durationRowModel?.isAvailable).toBe(false);

    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <DailySleepCard
          vm={{ status: "ready", day, model, isRefreshing: false }}
          attributedSleepNight={minimalNight({ mainSleepMinutes: undefined, totalSleepMinutes: undefined })}
        />,
      );
    });
    const durationRow = root.root.findByProps({ testID: "sleep-metric-row-sleep_duration" });
    expect(durationRow.props.onPress).toBeUndefined();
    expect(() => root.root.findByProps({ testID: "sleep-duration-detail-controller" })).toThrow();
  });

  it("keeps non-duration rows on legacy sheet when flag enabled", () => {
    setSleepDurationDetailV1EnabledForTests(true);
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <DailySleepCard vm={readyVm()} attributedSleepNight={minimalNight()} />,
      );
    });
    const deep = root.root.findByProps({ testID: "sleep-metric-row-deep_sleep" });
    act(() => {
      deep.props.onPress();
    });
    expect(root.root.findByProps({ testID: "metric-details-sheet" }).props.visible).toBe(true);
    expect(() => root.root.findByProps({ testID: "sleep-duration-detail-controller" })).toThrow();
  });
});
