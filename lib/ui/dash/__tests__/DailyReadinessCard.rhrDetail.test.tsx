import React, { act } from "react";
import { Text } from "react-native";
import renderer, { type ReactTestInstance } from "react-test-renderer";

import type { SleepNightDocumentDto } from "@oli/contracts";

import { buildDailyReadinessCardModel } from "@/lib/data/dash/buildDailyReadinessCardModel";
import { setRestingHeartRateDetailV1EnabledForTests } from "@/lib/data/readiness/restingHeartRateDetailFlag";
import type { DailyReadinessCardViewModel } from "@/lib/ui/dash/DailyReadinessCard";
import { DailyReadinessCard } from "@/lib/ui/dash/DailyReadinessCard";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/lib/ui/readiness/RestingHeartRateDetailController", () => ({
  RestingHeartRateDetailController: (props: { selectedDay: string }) => {
    const { Text: RNText } = require("react-native");
    return <RNText testID="rhr-detail-controller">{`RHR detail ${props.selectedDay}`}</RNText>;
  },
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

function sleepNight(bpm = 49): SleepNightDocumentDto {
  return {
    anchorDay: "2026-07-10",
    wakeDay: "2026-07-10",
    provider: "oura",
    source: "ouraVendorSleep",
    sourceDocumentId: "ep-1",
    mainSleepMinutes: 450,
    totalSleepMinutes: 450,
    lowestHeartRateBpm: bpm,
    isComplete: true,
  };
}

function readyVm(): DailyReadinessCardViewModel {
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
  return {
    status: "ready",
    day: "2026-07-10",
    model,
    accessibilityLabel: "Oura readiness",
  };
}

describe("DailyReadinessCard resting heart rate detail wiring", () => {
  beforeEach(() => {
    mockPush.mockReset();
    setRestingHeartRateDetailV1EnabledForTests(true);
  });

  afterEach(() => {
    setRestingHeartRateDetailV1EnabledForTests(null);
  });

  it("opens RHR detail sheet when flag on and physiological bpm is available", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <DailyReadinessCard
          vm={readyVm()}
          attributedSleepNight={sleepNight(49)}
          attributedSleepResolution="exact_anchor"
        />,
      );
    });

    const row = root.root.findByProps({ testID: "readiness-metric-row-resting_heart_rate" });
    act(() => {
      row.props.onPress();
    });
    expect(mockPush).not.toHaveBeenCalled();
    expect(root.root.findByProps({ testID: "rhr-detail-controller" })).toBeDefined();
    expect(allVisibleText(root.root)).toContain("RHR detail 2026-07-10");
  });

  it("does not open enriched detail when bpm is unavailable while flag is on", () => {
    const model = buildDailyReadinessCardModel({
      day: "2026-07-10",
      ouraConnected: true,
      exactDayRestingHeartRateBpm: null,
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
      accessibilityLabel: "ready",
    };
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <DailyReadinessCard
          vm={vm}
          attributedSleepNight={null}
          attributedSleepResolution={null}
        />,
      );
    });
    const row = root.root.findByProps({ testID: "readiness-metric-row-resting_heart_rate" });
    expect(row.props.onPress).toBeUndefined();
    expect(mockPush).not.toHaveBeenCalled();
    expect(() => root.root.findByProps({ testID: "rhr-detail-controller" })).toThrow();
  });

  it("keeps other readiness rows on the legacy route", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <DailyReadinessCard
          vm={readyVm()}
          attributedSleepNight={sleepNight(49)}
          attributedSleepResolution="exact_anchor"
        />,
      );
    });
    const hrv = root.root.findByProps({ testID: "readiness-metric-row-hrv_balance" });
    act(() => {
      hrv.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(app)/recovery/readiness",
      params: { contributor: "hrv-balance" },
    });
  });

  it("falls back to legacy RHR contributor route when flag is off", () => {
    setRestingHeartRateDetailV1EnabledForTests(false);
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <DailyReadinessCard
          vm={readyVm()}
          attributedSleepNight={sleepNight(49)}
          attributedSleepResolution="exact_anchor"
        />,
      );
    });
    const row = root.root.findByProps({ testID: "readiness-metric-row-resting_heart_rate" });
    act(() => {
      row.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(app)/recovery/readiness",
      params: { contributor: "resting-heart-rate" },
    });
    expect(() => root.root.findByProps({ testID: "rhr-detail-controller" })).toThrow();
  });
});
