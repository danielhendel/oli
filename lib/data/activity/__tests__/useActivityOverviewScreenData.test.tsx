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

const mockUseActivityTodayStepsAllocation = jest.fn(() => ({ status: "missing" as const }));

jest.mock("@/lib/data/activity/useActivityTodayStepsAllocation", () => ({
  useActivityTodayStepsAllocation: () => mockUseActivityTodayStepsAllocation(),
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
    mockUseActivityTodayStepsAllocation.mockReturnValue({ status: "missing" as const });
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

  it("Activity Baseline 7 Day window anchors at local yesterday (excludes today) and is independent of strip selection", async () => {
    mockUseActivityHealthKitTodayStepsCard.mockReturnValue({
      hkToday: { status: "skipped" },
      refreshHealthKitToday: jest.fn(),
    });
    const refetch = jest.fn();
    /**
     * `getTodayDayKeyLocal` is fixed to "2026-04-14" via the date-utils mock at the top of this
     * file → `anchor` = local yesterday = "2026-04-13". Seed only the seven completed days
     * 2026-04-07..2026-04-13 with 8,000 steps each so that any inclusion of "today" would either
     * pull in an undefined day (fail full-coverage) or change the mean if today were assigned.
     */
    const anchor = "2026-04-13";
    const d7 = activityTrailingNDaysInclusive(anchor, ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT);
    expect(d7).not.toContain("2026-04-14");
    const rollupByDay: Record<string, { kind: "numeric"; steps: number }> = {};
    for (const d of d7) {
      rollupByDay[d] = { kind: "numeric", steps: 8000 };
    }
    rollupByDay["2026-04-14"] = { kind: "numeric", steps: 99 };
    mockUseActivityStepsRollupMap.mockReturnValue(mockStepsRollup(rollupByDay, { refetch }));

    const probe: { current: ReturnType<typeof useActivityOverviewScreenData> | null } = { current: null };
    await act(async () => {
      renderer.create(<Harness probe={probe} />);
    });

    const day7Row = probe.current?.activityHistorySummaryModel.rows.find((r) => r.key === "day7");
    expect(day7Row?.hasEnoughData).toBe(true);
    expect(day7Row?.averageStepsPerDay).toBe(8000);
    expect(day7Row?.displayValue).toMatch(/8,000 steps\/day/);

    await act(async () => {
      probe.current?.setSelectedDay("2026-04-20");
    });

    expect(probe.current?.activityHistorySummaryModel.rows.find((r) => r.key === "day7")?.averageStepsPerDay).toBe(8000);
    expect(probe.current?.dailyDetails.model?.compactStatsSummary).toBe("99 steps");
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

  describe("Daily Energy-parity This Week navigation", () => {
    it("defaults the selected week to the current week (Sunday-anchored) with Next disabled and Previous enabled", async () => {
      mockUseActivityStepsRollupMap.mockReturnValue(
        mockStepsRollup(
          {
            "2026-04-12": { kind: "numeric" as const, steps: 1000 },
            "2026-04-13": { kind: "numeric" as const, steps: 1500 },
            "2026-04-14": { kind: "numeric" as const, steps: 2000 },
          },
          { refetch: jest.fn() },
        ),
      );

      const probe: { current: ReturnType<typeof useActivityOverviewScreenData> | null } = { current: null };
      await act(async () => {
        renderer.create(<Harness probe={probe} />);
      });

      expect(probe.current?.todayDayKey).toBe("2026-04-14");
      // 2026-04-14 is a Tuesday; the prior Sunday is 2026-04-12.
      expect(probe.current?.selectedWeekAnchorDay).toBe("2026-04-12");
      expect(probe.current?.activityThisWeekRangeLabel).toBe("Apr 12\u201318");
      expect(probe.current?.activityThisWeekCanGoPrevious).toBe(true);
      expect(probe.current?.activityThisWeekCanGoNext).toBe(false);
      // This Week's chart should reflect the current week's elapsed numeric rollups (1000 + 1500 + 2000) / 3 = 1500.
      expect(probe.current?.activityThisWeekCardModel.weeklyAverageMetricValue).toBe("1,500");
    });

    it("moves the selected week back one calendar week when previous-week handler fires; chart reflects historical data", async () => {
      const rollupByDay: Record<string, { kind: "numeric"; steps: number }> = {
        // current week
        "2026-04-12": { kind: "numeric", steps: 1000 },
        "2026-04-13": { kind: "numeric", steps: 1500 },
        "2026-04-14": { kind: "numeric", steps: 2000 },
        // previous week (2026-04-05 → 04-11)
        "2026-04-05": { kind: "numeric", steps: 9000 },
        "2026-04-06": { kind: "numeric", steps: 9000 },
        "2026-04-07": { kind: "numeric", steps: 9000 },
        "2026-04-08": { kind: "numeric", steps: 9000 },
        "2026-04-09": { kind: "numeric", steps: 9000 },
        "2026-04-10": { kind: "numeric", steps: 9000 },
        "2026-04-11": { kind: "numeric", steps: 9000 },
      };
      mockUseActivityStepsRollupMap.mockReturnValue(
        mockStepsRollup(rollupByDay, { refetch: jest.fn() }),
      );

      const probe: { current: ReturnType<typeof useActivityOverviewScreenData> | null } = { current: null };
      await act(async () => {
        renderer.create(<Harness probe={probe} />);
      });

      await act(async () => {
        probe.current?.onPressActivityPreviousWeek();
      });

      expect(probe.current?.selectedWeekAnchorDay).toBe("2026-04-05");
      expect(probe.current?.activityThisWeekRangeLabel).toBe("Apr 5\u201311");
      expect(probe.current?.activityThisWeekCanGoNext).toBe(true);
      expect(probe.current?.activityThisWeekCardModel.weeklyAverageMetricValue).toBe("9,000");
      expect(probe.current?.activityThisWeekCardModel.chartPoints).toHaveLength(7);
    });

    it("moves the selected week forward when next-week handler fires and stops at the current week", async () => {
      const rollupByDay: Record<string, { kind: "numeric"; steps: number }> = {
        "2026-04-12": { kind: "numeric", steps: 1000 },
        "2026-04-13": { kind: "numeric", steps: 1500 },
        "2026-04-14": { kind: "numeric", steps: 2000 },
        "2026-04-05": { kind: "numeric", steps: 9000 },
        "2026-04-06": { kind: "numeric", steps: 9000 },
        "2026-04-07": { kind: "numeric", steps: 9000 },
        "2026-04-08": { kind: "numeric", steps: 9000 },
        "2026-04-09": { kind: "numeric", steps: 9000 },
        "2026-04-10": { kind: "numeric", steps: 9000 },
        "2026-04-11": { kind: "numeric", steps: 9000 },
      };
      mockUseActivityStepsRollupMap.mockReturnValue(
        mockStepsRollup(rollupByDay, { refetch: jest.fn() }),
      );

      const probe: { current: ReturnType<typeof useActivityOverviewScreenData> | null } = { current: null };
      await act(async () => {
        renderer.create(<Harness probe={probe} />);
      });

      await act(async () => {
        probe.current?.onPressActivityPreviousWeek();
      });
      expect(probe.current?.activityThisWeekCanGoNext).toBe(true);

      await act(async () => {
        probe.current?.onPressActivityNextWeek();
      });
      expect(probe.current?.selectedWeekAnchorDay).toBe("2026-04-12");
      expect(probe.current?.activityThisWeekCanGoNext).toBe(false);
      // Pressing Next again while on the current week is a no-op (matches Daily Energy contract).
      await act(async () => {
        probe.current?.onPressActivityNextWeek();
      });
      expect(probe.current?.selectedWeekAnchorDay).toBe("2026-04-12");
    });
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

  describe("Phase 2B — stepsAllocation authority", () => {
    it("uses DailyFacts rollup, not HK live, for Today headline when allocation is present", async () => {
      mockUseActivityHealthKitTodayStepsCard.mockReturnValue({
        hkToday: { status: "ready", steps: 9999 },
        refreshHealthKitToday: jest.fn(),
      });
      mockUseActivityTodayStepsAllocation.mockReturnValue({
        status: "ready",
        allocation: { neatSteps: 6000, strengthSteps: 1500, cardioSteps: 2500 },
        allocationTotalSteps: 10000,
      });
      mockUseActivityStepsRollupMap.mockReturnValue(
        mockStepsRollup({
          "2026-04-13": { kind: "numeric" as const, steps: 4200 },
          "2026-04-14": { kind: "numeric" as const, steps: 10000 },
        }),
      );

      const probe: { current: ReturnType<typeof useActivityOverviewScreenData> | null } = {
        current: null,
      };
      await act(async () => {
        renderer.create(<Harness probe={probe} />);
      });

      expect(probe.current?.dailyDetails.model?.compactStatsSummary).toBe("10,000 steps");
      expect(probe.current?.activityTodayCardModel?.stepsAllocation).toEqual({
        neatSteps: 6000,
        strengthSteps: 1500,
        cardioSteps: 2500,
      });
    });

    it("preserves HK live override when allocation is missing", async () => {
      mockUseActivityHealthKitTodayStepsCard.mockReturnValue({
        hkToday: { status: "ready", steps: 9999 },
        refreshHealthKitToday: jest.fn(),
      });
      mockUseActivityTodayStepsAllocation.mockReturnValue({ status: "missing" as const });
      mockUseActivityStepsRollupMap.mockReturnValue(
        mockStepsRollup({
          "2026-04-13": { kind: "numeric" as const, steps: 4200 },
          "2026-04-14": { kind: "numeric" as const, steps: 10000 },
        }),
      );

      const probe: { current: ReturnType<typeof useActivityOverviewScreenData> | null } = {
        current: null,
      };
      await act(async () => {
        renderer.create(<Harness probe={probe} />);
      });

      expect(probe.current?.dailyDetails.model?.compactStatsSummary).toBe("9,999 steps");
      expect(probe.current?.activityTodayCardModel?.stepsAllocation).toBeUndefined();
    });

    it("suppresses HK live error surface for Today headline when allocation is present", async () => {
      mockUseActivityHealthKitTodayStepsCard.mockReturnValue({
        hkToday: { status: "failed", error: "HK denied", requestId: "rid" as string | null },
        refreshHealthKitToday: jest.fn(),
      });
      mockUseActivityTodayStepsAllocation.mockReturnValue({
        status: "ready",
        allocation: { neatSteps: 100, strengthSteps: 0, cardioSteps: 0 },
        allocationTotalSteps: 100,
      });
      mockUseActivityStepsRollupMap.mockReturnValue(
        mockStepsRollup({
          "2026-04-13": { kind: "numeric" as const, steps: 4200 },
          "2026-04-14": { kind: "numeric" as const, steps: 100 },
        }),
      );

      const probe: { current: ReturnType<typeof useActivityOverviewScreenData> | null } = {
        current: null,
      };
      await act(async () => {
        renderer.create(<Harness probe={probe} />);
      });

      expect(probe.current?.dailyDetails.error).toBeNull();
      expect(probe.current?.dailyDetails.model?.compactStatsSummary).toBe("100 steps");
    });

    it("omits stepsAllocation on the card model when rollup headline disagrees with allocation total", async () => {
      mockUseActivityHealthKitTodayStepsCard.mockReturnValue({
        hkToday: { status: "skipped" },
        refreshHealthKitToday: jest.fn(),
      });
      mockUseActivityTodayStepsAllocation.mockReturnValue({
        status: "ready",
        allocation: { neatSteps: 6000, strengthSteps: 1500, cardioSteps: 2500 },
        allocationTotalSteps: 10000,
      });
      mockUseActivityStepsRollupMap.mockReturnValue(
        mockStepsRollup({
          "2026-04-13": { kind: "numeric" as const, steps: 4200 },
          "2026-04-14": { kind: "numeric" as const, steps: 9000 },
        }),
      );

      const probe: { current: ReturnType<typeof useActivityOverviewScreenData> | null } = {
        current: null,
      };
      await act(async () => {
        renderer.create(<Harness probe={probe} />);
      });

      expect(probe.current?.dailyDetails.model?.compactStatsSummary).toBe("9,000 steps");
      expect(probe.current?.activityTodayCardModel?.stepsAllocation).toBeUndefined();
    });

    it("does not change existing error surface when allocation is missing and HK fails", async () => {
      mockUseActivityHealthKitTodayStepsCard.mockReturnValue({
        hkToday: { status: "failed", error: "HK denied", requestId: "rid" as string | null },
        refreshHealthKitToday: jest.fn(),
      });
      mockUseActivityTodayStepsAllocation.mockReturnValue({ status: "missing" as const });
      mockUseActivityStepsRollupMap.mockReturnValue(
        mockStepsRollup({
          "2026-04-13": { kind: "numeric" as const, steps: 4200 },
          "2026-04-14": { kind: "numeric" as const, steps: 100 },
        }),
      );

      const probe: { current: ReturnType<typeof useActivityOverviewScreenData> | null } = {
        current: null,
      };
      await act(async () => {
        renderer.create(<Harness probe={probe} />);
      });

      expect(probe.current?.dailyDetails.model?.compactStatsSummary).toBe("100 steps");
    });
  });

  describe("Yearly Activity card state", () => {
    it("defaults selectedYear to the current year and disables Next-year at mount", async () => {
      mockUseActivityStepsRollupMap.mockReturnValue(
        mockStepsRollup(
          {
            "2026-04-13": { kind: "numeric" as const, steps: 4000 },
            "2026-04-14": { kind: "numeric" as const, steps: 5000 },
          },
          { refetch: jest.fn() },
        ),
      );

      const probe: { current: ReturnType<typeof useActivityOverviewScreenData> | null } = { current: null };
      await act(async () => {
        renderer.create(<Harness probe={probe} />);
      });

      expect(probe.current?.selectedYear).toBe(2026);
      expect(probe.current?.activityYearRangeLabel).toBe("2026");
      expect(probe.current?.activityYearCanGoNext).toBe(false);
      expect(probe.current?.activityYearCanGoPrevious).toBe(true);
      expect(probe.current?.activityYearlyCardModel.title).toBe("2026 Activity");
      expect(probe.current?.activityYearlyCardModel.isCurrentYear).toBe(true);
    });

    it("Yearly current-year hero excludes today and uses numeric-day denominator", async () => {
      const refetch = jest.fn();
      const rollupByDay: Record<string, { kind: "numeric"; steps: number }> = {
        "2026-04-12": { kind: "numeric", steps: 5000 },
        "2026-04-13": { kind: "numeric", steps: 7000 },
        // Today — must be excluded from the year hero average.
        "2026-04-14": { kind: "numeric", steps: 1_000_000 },
      };
      mockUseActivityStepsRollupMap.mockReturnValue(mockStepsRollup(rollupByDay, { refetch }));

      const probe: { current: ReturnType<typeof useActivityOverviewScreenData> | null } = { current: null };
      await act(async () => {
        renderer.create(<Harness probe={probe} />);
      });

      expect(probe.current?.activityYearlyCardModel.year).toBe(2026);
      expect(probe.current?.activityYearlyCardModel.averageStepsPerDay).toBe(6000);
      expect(probe.current?.activityYearlyCardVisible).toBe(true);
    });

    it("hides the Yearly card when the current year has no completed numeric data yet", async () => {
      mockUseActivityStepsRollupMap.mockReturnValue(
        mockStepsRollup({}, { refetch: jest.fn() }),
      );

      const probe: { current: ReturnType<typeof useActivityOverviewScreenData> | null } = { current: null };
      await act(async () => {
        renderer.create(<Harness probe={probe} />);
      });

      expect(probe.current?.activityYearlyCardVisible).toBe(false);
    });

    it("previous-year handler decrements selectedYear and enables Next-year", async () => {
      mockUseActivityStepsRollupMap.mockReturnValue(
        mockStepsRollup(
          {
            "2026-04-13": { kind: "numeric" as const, steps: 4000 },
            "2026-04-14": { kind: "numeric" as const, steps: 5000 },
          },
          { refetch: jest.fn() },
        ),
      );

      const probe: { current: ReturnType<typeof useActivityOverviewScreenData> | null } = { current: null };
      await act(async () => {
        renderer.create(<Harness probe={probe} />);
      });

      await act(async () => {
        probe.current?.onPressActivityPreviousYear();
      });

      expect(probe.current?.selectedYear).toBe(2025);
      expect(probe.current?.activityYearRangeLabel).toBe("2025");
      expect(probe.current?.activityYearCanGoNext).toBe(true);
      expect(probe.current?.activityYearlyCardModel.title).toBe("2025 Activity");
      expect(probe.current?.activityYearlyCardModel.isCurrentYear).toBe(false);
    });

    it("next-year handler is a no-op when already on the current year", async () => {
      mockUseActivityStepsRollupMap.mockReturnValue(
        mockStepsRollup(
          {
            "2026-04-13": { kind: "numeric" as const, steps: 4000 },
            "2026-04-14": { kind: "numeric" as const, steps: 5000 },
          },
          { refetch: jest.fn() },
        ),
      );

      const probe: { current: ReturnType<typeof useActivityOverviewScreenData> | null } = { current: null };
      await act(async () => {
        renderer.create(<Harness probe={probe} />);
      });

      await act(async () => {
        probe.current?.onPressActivityNextYear();
      });

      expect(probe.current?.selectedYear).toBe(2026);
      expect(probe.current?.activityYearCanGoNext).toBe(false);
    });
  });
});
