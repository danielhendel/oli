import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock("@/lib/data/activity/appleHealthStepsRepairCoordinator", () => ({
  scheduleAppleHealthStepsRepair: jest.fn(),
}));

jest.mock("@/lib/ui/calendar/dateUtils", () => {
  const actual = jest.requireActual<typeof import("@/lib/ui/calendar/dateUtils")>("@/lib/ui/calendar/dateUtils");
  return {
    ...actual,
    getTodayDayKeyLocal: () => "2026-04-14",
  };
});

const mockUseActivityStepsRollupMap = jest.fn();

jest.mock("@/lib/data/activity/ActivityRollupProvider", () => ({
  useActivityStepsRollupMap: () => mockUseActivityStepsRollupMap(),
}));

const mockUseActivityHealthKitTodayStepsCard = jest.fn(() => ({
  hkToday: { status: "skipped" as const },
  refreshHealthKitToday: jest.fn(),
}));

jest.mock("@/lib/data/activity/useActivityHealthKitTodayStepsCard", () => ({
  useActivityHealthKitTodayStepsCard: () => mockUseActivityHealthKitTodayStepsCard(),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    initializing: false,
    getIdToken: jest.fn(),
  }),
}));

import type { ActivityStepsRollupMap } from "@/lib/data/activity/activityOverviewRollupTypes";
import {
  ACTIVITY_BASELINE_TRAILING_DAY_COUNT,
  ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT,
  activityTrailingNDaysInclusive,
  getActivityOverviewAnchorEndDay,
} from "@/lib/data/activity/activityOverviewRanges";
import { useActivityOverviewScreenData } from "@/lib/data/activity/useActivityOverviewScreenData";

function mockStepsRollup(
  rollupByDay: ActivityStepsRollupMap,
  opts?: { status?: "ready" | "partial"; refetch?: jest.Mock },
) {
  const refetch = opts?.refetch ?? jest.fn();
  return {
    status: opts?.status ?? ("ready" as const),
    rollupByDay,
    rollupDisplayByDay: rollupByDay,
    rollupFallbackBase: {} as ActivityStepsRollupMap,
    isRefreshing: false,
    refetch,
  };
}

function Harness({ probe }: { probe: { current: ReturnType<typeof useActivityOverviewScreenData> | null } }) {
  const v = useActivityOverviewScreenData();
  probe.current = v;
  return null;
}

describe("useActivityOverviewScreenData", () => {
  beforeEach(() => {
    mockUseActivityStepsRollupMap.mockReset();
    mockUseActivityHealthKitTodayStepsCard.mockReturnValue({
      hkToday: { status: "skipped" },
      refreshHealthKitToday: jest.fn(),
    });
  });

  it("keeps aggregate rollup error separate from Today’s Steps when today is numeric", async () => {
    const refetch = jest.fn();
    const rollupByDay: Record<string, { kind: string; steps?: number; message?: string; requestId?: string | null }> = {
      "2026-04-13": { kind: "numeric", steps: 99 },
      "2026-04-14": { kind: "numeric", steps: 148 },
      "2026-04-01": { kind: "error", message: "fail", requestId: "r1" },
      "2026-04-02": { kind: "error", message: "fail", requestId: "r2" },
      "2026-04-03": { kind: "error", message: "fail", requestId: null },
    };
    mockUseActivityStepsRollupMap.mockReturnValue(mockStepsRollup(rollupByDay, { refetch }));

    const probe: { current: ReturnType<typeof useActivityOverviewScreenData> | null } = { current: null };
    await act(async () => {
      renderer.create(<Harness probe={probe} />);
    });

    expect(probe.current?.rollupAggregateError?.message).toMatch(/Couldn’t load steps for 3 days/);
    expect(probe.current?.dailyDetails.error).toBeNull();
    expect(probe.current?.dailyDetails.model?.compactStatsSummary).toBe("148 steps");
    expect(probe.current?.weeklyStripDays.find((d) => d.day === "2026-04-14")?.meta).toEqual(
      expect.objectContaining({ hasSteps: true, ringTierIndex: 0 }),
    );
  });

  it("surfaces selected-day rollup error on daily details only, independent of aggregate warning", async () => {
    const refetch = jest.fn();
    const rollupByDay = {
      "2026-04-14": { kind: "error" as const, message: "Today fetch failed", requestId: "rx" as string | null },
      "2026-04-13": { kind: "numeric" as const, steps: 10 },
    };
    mockUseActivityStepsRollupMap.mockReturnValue(mockStepsRollup(rollupByDay, { refetch }));

    const probe: { current: ReturnType<typeof useActivityOverviewScreenData> | null } = { current: null };
    await act(async () => {
      renderer.create(<Harness probe={probe} />);
    });

    expect(probe.current?.rollupAggregateError?.message).toMatch(/Couldn’t load steps for one day/);
    expect(probe.current?.dailyDetails.error?.message).toBe("Today fetch failed");
    expect(probe.current?.dailyDetails.model).toBeNull();
  });

  it("prefers live HealthKit steps for Today’s Steps when the hook reports ready", async () => {
    mockUseActivityHealthKitTodayStepsCard.mockReturnValue({
      hkToday: { status: "ready", steps: 5313 },
      refreshHealthKitToday: jest.fn(),
    });
    const refetch = jest.fn();
    mockUseActivityStepsRollupMap.mockReturnValue(
      mockStepsRollup(
        {
          "2026-04-13": { kind: "numeric" as const, steps: 4200 },
          "2026-04-14": { kind: "numeric" as const, steps: 148 },
        },
        { refetch },
      ),
    );

    const probe: { current: ReturnType<typeof useActivityOverviewScreenData> | null } = { current: null };
    await act(async () => {
      renderer.create(<Harness probe={probe} />);
    });

    expect(probe.current?.dailyDetails.model?.compactStatsSummary).toBe("5,313 steps");
    expect(probe.current?.dailyDetails.error).toBeNull();
    expect(probe.current?.activityHistorySummaryModel.rows.find((r) => r.key === "day7")?.hasEnoughData).toBe(false);
  });

  it("Today’s Steps stays on live HK when strip selection changes", async () => {
    const refetch = jest.fn();
    const rollupByDay = {
      "2026-04-13": { kind: "numeric" as const, steps: 111 },
      "2026-04-14": { kind: "numeric" as const, steps: 5313 },
      "2026-04-05": { kind: "numeric" as const, steps: 148 },
    };
    mockUseActivityStepsRollupMap.mockReturnValue(mockStepsRollup(rollupByDay, { refetch }));

    const probe: { current: ReturnType<typeof useActivityOverviewScreenData> | null } = { current: null };
    await act(async () => {
      renderer.create(<Harness probe={probe} />);
    });

    expect(probe.current?.dailyDetails.model?.compactStatsSummary).toBe("5,313 steps");

    await act(async () => {
      probe.current?.setSelectedDay("2026-04-05");
    });

    expect(probe.current?.selectedDay).toBe("2026-04-05");
    expect(probe.current?.dailyDetails.model?.compactStatsSummary).toBe("5,313 steps");
    expect(probe.current?.weeklyStripDays.map((d) => d.day)).toContain("2026-04-05");
    expect(probe.current?.activityHistorySummaryModel).not.toBeNull();
  });

  it("Activity Baseline history 7 Day stays anchored to device today when strip day moves to the future", async () => {
    mockUseActivityHealthKitTodayStepsCard.mockReturnValue({
      hkToday: { status: "skipped" },
      refreshHealthKitToday: jest.fn(),
    });
    const refetch = jest.fn();
    const anchor = "2026-04-13";
    const d7 = activityTrailingNDaysInclusive(anchor, ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT);
    const rollupByDay: Record<string, { kind: "numeric"; steps: number }> = {};
    for (const d of d7) {
      rollupByDay[d] = { kind: "numeric", steps: 8000 };
    }
    rollupByDay["2026-04-14"] = { kind: "numeric", steps: 8000 };
    mockUseActivityStepsRollupMap.mockReturnValue(mockStepsRollup(rollupByDay, { refetch }));

    const probe: { current: ReturnType<typeof useActivityOverviewScreenData> | null } = { current: null };
    await act(async () => {
      renderer.create(<Harness probe={probe} />);
    });

    const first = probe.current?.activityHistorySummaryModel.rows.find((r) => r.key === "day7")?.displayValue;
    expect(first).toMatch(/8,000 steps\/day/);

    await act(async () => {
      probe.current?.setSelectedDay("2026-04-20");
    });

    expect(probe.current?.activityHistorySummaryModel.rows.find((r) => r.key === "day7")?.displayValue).toBe(first);
    expect(probe.current?.dailyDetails.model?.compactStatsSummary).toBe("8,000 steps");
  });

  it("uses neutral weekly strip ring tier when numeric rollup is zero steps", async () => {
    const refetch = jest.fn();
    mockUseActivityStepsRollupMap.mockReturnValue(
      mockStepsRollup(
        {
          "2026-04-13": { kind: "numeric" as const, steps: 500 },
          "2026-04-14": { kind: "numeric" as const, steps: 0 },
        },
        { refetch },
      ),
    );

    const probe: { current: ReturnType<typeof useActivityOverviewScreenData> | null } = { current: null };
    await act(async () => {
      renderer.create(<Harness probe={probe} />);
    });

    expect(probe.current?.weeklyStripDays.find((d) => d.day === "2026-04-14")?.meta).toEqual(
      expect.objectContaining({ hasSteps: false, ringTierIndex: null }),
    );
  });

  it("has no rollup aggregate or daily rollup errors when map has no failures", async () => {
    const refetch = jest.fn();
    mockUseActivityStepsRollupMap.mockReturnValue(
      mockStepsRollup(
        {
          "2026-04-13": { kind: "numeric" as const, steps: 150 },
          "2026-04-14": { kind: "numeric" as const, steps: 200 },
        },
        { refetch },
      ),
    );

    const probe: { current: ReturnType<typeof useActivityOverviewScreenData> | null } = { current: null };
    await act(async () => {
      renderer.create(<Harness probe={probe} />);
    });

    expect(probe.current?.rollupAggregateError).toBeNull();
    expect(probe.current?.dailyDetails.error).toBeNull();
    expect(probe.current?.dailyDetails.model?.compactStatsSummary).toBe("200 steps");
  });

  it("rollup error on a day in baseline windows yields insufficient rows without affecting Today’s HK live row", async () => {
    mockUseActivityHealthKitTodayStepsCard.mockReturnValue({
      hkToday: { status: "ready", steps: 9999 },
      refreshHealthKitToday: jest.fn(),
    });
    const refetch = jest.fn();
    mockUseActivityStepsRollupMap.mockReturnValue(
      mockStepsRollup(
        {
          "2026-04-13": { kind: "error" as const, message: "Yesterday fetch failed", requestId: "ry" },
          "2026-04-14": { kind: "numeric" as const, steps: 100 },
        },
        { refetch },
      ),
    );

    const probe: { current: ReturnType<typeof useActivityOverviewScreenData> | null } = { current: null };
    await act(async () => {
      renderer.create(<Harness probe={probe} />);
    });

    expect(probe.current?.dailyDetails.model?.compactStatsSummary).toBe("9,999 steps");
    expect(probe.current?.activityHistorySummaryModel.rows.find((r) => r.key === "day7")?.hasEnoughData).toBe(false);
    expect(probe.current?.activityHistorySummaryModel.rows.find((r) => r.key === "day7")?.displayValue).toBe("—");
  });

  it("exposes Activity Baseline as mean over 90 days ending local yesterday; mocked today is excluded even as outlier", async () => {
    const refetch = jest.fn();
    const mockedToday = "2026-04-14";
    const anchor = getActivityOverviewAnchorEndDay(mockedToday);
    expect(anchor).toBe("2026-04-13");
    const dayKeys = activityTrailingNDaysInclusive(anchor, ACTIVITY_BASELINE_TRAILING_DAY_COUNT);
    expect(dayKeys).toHaveLength(90);
    expect(dayKeys).not.toContain(mockedToday);
    expect(dayKeys).toContain(anchor);

    const rollupByDay: Record<string, { kind: "numeric"; steps: number }> = {};
    for (const d of dayKeys) {
      rollupByDay[d] = { kind: "numeric", steps: 4500 };
    }
    rollupByDay[mockedToday] = { kind: "numeric", steps: 1_000_000 };
    mockUseActivityStepsRollupMap.mockReturnValue(mockStepsRollup(rollupByDay, { refetch }));

    const probe: { current: ReturnType<typeof useActivityOverviewScreenData> | null } = { current: null };
    await act(async () => {
      renderer.create(<Harness probe={probe} />);
    });

    expect(probe.current?.baselineDetails.loading).toBe(false);
    expect(probe.current?.baselineDetails.error).toBeNull();
    expect(probe.current?.baselineDetails.model?.compactStatsSummary).toBe("4,500 steps");
    const wrongIfTodayAveraged = Math.round((ACTIVITY_BASELINE_TRAILING_DAY_COUNT * 4500 + 1_000_000) / 91);
    expect(`${wrongIfTodayAveraged.toLocaleString()} steps`).not.toBe(probe.current?.baselineDetails.model?.compactStatsSummary);
  });

  it("merges Today’s Steps model with delta vs baseline when both parse from existing card summaries", async () => {
    mockUseActivityHealthKitTodayStepsCard.mockReturnValue({
      hkToday: { status: "skipped" },
      refreshHealthKitToday: jest.fn(),
    });
    const refetch = jest.fn();
    const mockedToday = "2026-04-14";
    const anchor = getActivityOverviewAnchorEndDay(mockedToday);
    const dayKeys = activityTrailingNDaysInclusive(anchor, ACTIVITY_BASELINE_TRAILING_DAY_COUNT);
    const rollupByDay: Record<string, { kind: "numeric"; steps: number }> = {};
    for (const d of dayKeys) {
      rollupByDay[d] = { kind: "numeric", steps: 4500 };
    }
    rollupByDay[mockedToday] = { kind: "numeric", steps: 4700 };
    mockUseActivityStepsRollupMap.mockReturnValue(mockStepsRollup(rollupByDay, { refetch }));

    const probe: { current: ReturnType<typeof useActivityOverviewScreenData> | null } = { current: null };
    await act(async () => {
      renderer.create(<Harness probe={probe} />);
    });

    expect(probe.current?.baselineDetails.model?.compactStatsSummary).toBe("4,500 steps");
    expect(probe.current?.dailyDetails.model?.compactStatsSummary).toBe("4,700 steps");
    expect(probe.current?.dailyDetails.model?.deltaFromBaselineSteps).toBe(200);
    expect(probe.current?.dailyDetails.model?.deltaFromBaselineLabel).toBe("You are on track with your baseline");
  });
});
