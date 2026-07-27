import React, { act } from "react";
import { Text } from "react-native";
import renderer, { type ReactTestInstance } from "react-test-renderer";

import { buildDailyReadinessCardModel } from "@/lib/data/dash/buildDailyReadinessCardModel";
import { setBodyTemperatureDetailV1EnabledForTests } from "@/lib/data/readiness/bodyTemperatureDetailFlag";
import { setHrvBalanceDetailV1EnabledForTests } from "@/lib/data/readiness/hrvBalanceDetailFlag";
import { setRecoveryIndexDetailV1EnabledForTests } from "@/lib/data/readiness/recoveryIndexDetailFlag";
import { setRestingHeartRateDetailV1EnabledForTests } from "@/lib/data/readiness/restingHeartRateDetailFlag";
import { setSleepBalanceDetailV1EnabledForTests } from "@/lib/data/readiness/sleepBalanceDetailFlag";
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

jest.mock("@/lib/ui/readiness/ReadinessContributorDetailController", () => ({
  ReadinessContributorDetailController: (props: {
    metric: string;
    selectedDay: string;
    currentScore: number;
  }) => {
    const { Text: RNText } = require("react-native");
    return (
      <RNText testID={`contributor-detail-controller-${props.metric}`}>
        {`detail ${props.metric} ${props.selectedDay} ${props.currentScore}`}
      </RNText>
    );
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

function readyVm(over: {
  contributors?: Record<string, unknown>;
} = {}): DailyReadinessCardViewModel {
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
        ...(over.contributors ?? {}),
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

describe("DailyReadinessCard contributor detail wiring", () => {
  beforeEach(() => {
    mockPush.mockReset();
    setHrvBalanceDetailV1EnabledForTests(true);
    setBodyTemperatureDetailV1EnabledForTests(true);
    setRecoveryIndexDetailV1EnabledForTests(true);
    setSleepBalanceDetailV1EnabledForTests(true);
    setRestingHeartRateDetailV1EnabledForTests(true);
  });

  afterEach(() => {
    setHrvBalanceDetailV1EnabledForTests(null);
    setBodyTemperatureDetailV1EnabledForTests(null);
    setRecoveryIndexDetailV1EnabledForTests(null);
    setSleepBalanceDetailV1EnabledForTests(null);
    setRestingHeartRateDetailV1EnabledForTests(null);
  });

  it.each([
    ["hrv_balance", 90],
    ["body_temperature", 88],
    ["recovery_index", 60],
    ["sleep_balance", 75],
  ] as const)("opens %s detail when flag on and score available", (metric, score) => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<DailyReadinessCard vm={readyVm()} />);
    });
    const row = root.root.findByProps({ testID: `readiness-metric-row-${metric}` });
    act(() => {
      row.props.onPress();
    });
    expect(mockPush).not.toHaveBeenCalled();
    expect(
      root.root.findByProps({ testID: `contributor-detail-controller-${metric}` }),
    ).toBeDefined();
    expect(allVisibleText(root.root)).toContain(`detail ${metric} 2026-07-10 ${score}`);
  });

  it("flag off routes to legacy readiness contributor path", () => {
    setHrvBalanceDetailV1EnabledForTests(false);
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<DailyReadinessCard vm={readyVm()} />);
    });
    const row = root.root.findByProps({ testID: "readiness-metric-row-hrv_balance" });
    act(() => {
      row.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(app)/recovery/readiness",
      params: { contributor: "hrv-balance" },
    });
    expect(() =>
      root.root.findByProps({ testID: "contributor-detail-controller-hrv_balance" }),
    ).toThrow();
  });

  it("unavailable contributor score does not open enriched sheet", () => {
    const vm = readyVm({
      contributors: {
        hrv_balance: null,
        body_temperature: 88,
        recovery_index: 60,
        sleep_balance: 75,
      },
    });
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<DailyReadinessCard vm={vm} />);
    });
    const row = root.root.findByProps({ testID: "readiness-metric-row-hrv_balance" });
    expect(row.props.onPress).toBeUndefined();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("one flag off does not disable another metric detail", () => {
    setHrvBalanceDetailV1EnabledForTests(false);
    setBodyTemperatureDetailV1EnabledForTests(true);
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<DailyReadinessCard vm={readyVm()} />);
    });
    act(() => {
      root.root.findByProps({ testID: "readiness-metric-row-body_temperature" }).props.onPress();
    });
    expect(mockPush).not.toHaveBeenCalled();
    expect(
      root.root.findByProps({ testID: "contributor-detail-controller-body_temperature" }),
    ).toBeDefined();
  });

  it("does not alter Readiness header navigation", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<DailyReadinessCard vm={readyVm()} />);
    });
    const header = root.root.findAll(
      (n) => n.props.accessibilityHint === "Opens Readiness details",
    )[0];
    act(() => {
      header.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/recovery/readiness");
  });
});
