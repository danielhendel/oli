/**
 * Overview snapshot merges weight series + peek + daily facts; daily facts errors must not
 * block composition metrics when peek has body_composition for the snapshot day.
 */
import React, { useEffect, useRef } from "react";
import { act } from "react";
import renderer from "react-test-renderer";
import type { WeightPoint } from "@/lib/data/useWeightSeries";
import { useBodyOverviewData } from "../useBodyOverviewData";
import { useWeightSeries } from "@/lib/data/useWeightSeries";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { useBodyOverviewPeek } from "../useBodyOverviewPeek";
import { useAppleHealthBodySync } from "../useAppleHealthBodySync";

jest.mock("@/lib/data/useWeightSeries", () => ({
  useWeightSeries: jest.fn(),
}));
jest.mock("@/lib/data/useDailyFacts", () => ({
  useDailyFacts: jest.fn(),
}));
jest.mock("../useBodyOverviewPeek", () => ({
  useBodyOverviewPeek: jest.fn(),
}));
jest.mock("../useBodyOverviewSnapshotDayPeek", () => ({
  useBodyOverviewSnapshotDayPeek: jest.fn(() => ({
    status: "ready" as const,
    items: [],
    refetch: jest.fn(),
  })),
}));
jest.mock("../useAppleHealthBodySync", () => ({
  useAppleHealthBodySync: jest.fn(),
}));
jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "test-user" } }),
}));
jest.mock("@/lib/data/dailyFactsSessionCache", () => ({
  scheduleDailyFactsInvalidationAfterIngest: jest.fn(),
}));

const mockUseWeightSeries = useWeightSeries as jest.MockedFunction<typeof useWeightSeries>;
const mockUseDailyFacts = useDailyFacts as jest.MockedFunction<typeof useDailyFacts>;
const mockUseBodyOverviewPeek = useBodyOverviewPeek as jest.MockedFunction<typeof useBodyOverviewPeek>;
const mockUseAppleHealthBodySync = useAppleHealthBodySync as jest.MockedFunction<typeof useAppleHealthBodySync>;

function buildSeriesPoint(dayKey: string): WeightPoint {
  return {
    dayKey,
    observedAt: `${dayKey}T10:00:00.000Z`,
    weightKg: 80,
    sourceId: "apple_health",
  };
}

function Harness({ onResult }: { onResult: (v: ReturnType<typeof useBodyOverviewData>) => void }) {
  const v = useBodyOverviewData();
  const ref = useRef(onResult);
  ref.current = onResult;
  useEffect(() => {
    ref.current(v);
  });
  return null;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAppleHealthBodySync.mockReturnValue({
    isBodySyncing: false,
    syncAppleHealthBodyNow: jest.fn(),
    hasSuccessfulBodySync: false,
  });
});

describe("useBodyOverviewData overview resilience", () => {
  it("uses peek body_composition when daily facts is error (snapshot still has BMI)", () => {
    const day = "2026-03-31";
    const pt = buildSeriesPoint(day);
    mockUseWeightSeries.mockReturnValue({
      status: "ready",
      data: {
        points: [pt],
        latest: pt,
        avg7Kg: null,
        weeklyDeltaKg: null,
        rolling7: [],
        insights: {
          change30dKg: null,
          weeklyRateKg: null,
          consistency: "low",
          volatilityKg: null,
          streakDays: 0,
          trendNote: "",
        },
      },
      refetch: jest.fn(),
    } as ReturnType<typeof useWeightSeries>);

    mockUseBodyOverviewPeek.mockReturnValue({
      status: "ready",
      items: [
        {
          id: "c1",
          observedAt: `${day}T12:00:00.000Z`,
          sourceId: "apple_health",
          kind: "body_composition",
          payload: { bmi: 23.5 },
        },
      ],
      refetch: jest.fn(),
    });

    mockUseDailyFacts.mockReturnValue({
      status: "error",
      error: "HTTP 400",
      requestId: "df-req",
      refetch: jest.fn(),
    });

    let last!: ReturnType<typeof useBodyOverviewData>;
    act(() => {
      renderer.create(<Harness onResult={(v) => (last = v)} />);
    });

    expect(last.overview.overviewDay).toBe(day);
    expect(last.overview.weightKg).toBe(80);
    expect(last.overview.bmi).toBe(23.5);
    expect(last.overview.hasAnyMetric).toBe(true);
  });

  it("renders latest snapshot fields when peek and series are ready and daily facts is missing", () => {
    const day = "2026-03-31";
    const pt = buildSeriesPoint(day);
    mockUseWeightSeries.mockReturnValue({
      status: "ready",
      data: {
        points: [pt],
        latest: pt,
        avg7Kg: null,
        weeklyDeltaKg: null,
        rolling7: [],
        insights: {
          change30dKg: null,
          weeklyRateKg: null,
          consistency: "low",
          volatilityKg: null,
          streakDays: 0,
          trendNote: "",
        },
      },
      refetch: jest.fn(),
    } as ReturnType<typeof useWeightSeries>);

    mockUseBodyOverviewPeek.mockReturnValue({
      status: "ready",
      items: [
        {
          id: "c1",
          observedAt: `${day}T12:00:00.000Z`,
          sourceId: "apple_health",
          kind: "body_composition",
          payload: { bmi: 21 },
        },
      ],
      refetch: jest.fn(),
    });

    mockUseDailyFacts.mockReturnValue({
      status: "missing",
      refetch: jest.fn(),
    });

    let last!: ReturnType<typeof useBodyOverviewData>;
    act(() => {
      renderer.create(<Harness onResult={(v) => (last = v)} />);
    });

    expect(last.overview.bmi).toBe(21);
    expect(last.overview.hasAnyMetric).toBe(true);
  });

  it("hydrates overview from peek while the 5Y weight series is still partial", () => {
    const day = "2026-03-31";
    mockUseWeightSeries.mockReturnValue({
      status: "partial",
      refetch: jest.fn(),
    } as ReturnType<typeof useWeightSeries>);

    mockUseBodyOverviewPeek.mockReturnValue({
      status: "ready",
      items: [
        {
          id: "w1",
          observedAt: `${day}T10:00:00.000Z`,
          sourceId: "apple_health",
          kind: "weight",
          payload: { weightKg: 82 },
        },
        {
          id: "c1",
          observedAt: `${day}T12:00:00.000Z`,
          sourceId: "apple_health",
          kind: "body_composition",
          payload: { bmi: 22 },
        },
      ],
      refetch: jest.fn(),
    });

    mockUseDailyFacts.mockReturnValue({
      status: "missing",
      refetch: jest.fn(),
    });

    let last!: ReturnType<typeof useBodyOverviewData>;
    act(() => {
      renderer.create(<Harness onResult={(v) => (last = v)} />);
    });

    expect(last.series.status).toBe("partial");
    expect(last.overview.overviewDay).toBe(day);
    expect(last.overview.weightKg).toBe(82);
    expect(last.overview.bmi).toBe(22);
    expect(last.weightSamples.length).toBeGreaterThan(0);
    expect(last.byDay.size).toBeGreaterThan(0);
  });

  it("keeps refreshOverview callback identity stable across re-renders when upstream data is unchanged", () => {
    const day = "2026-03-31";
    const pt = buildSeriesPoint(day);
    const seriesReturn = {
      status: "ready" as const,
      data: {
        points: [pt],
        latest: pt,
        avg7Kg: null,
        weeklyDeltaKg: null,
        rolling7: [],
        insights: {
          change30dKg: null,
          weeklyRateKg: null,
          consistency: "low" as const,
          volatilityKg: null,
          streakDays: 0,
          trendNote: "",
        },
      },
      refetch: jest.fn(),
    };
    mockUseWeightSeries.mockReturnValue(seriesReturn as ReturnType<typeof useWeightSeries>);

    mockUseBodyOverviewPeek.mockReturnValue({
      status: "ready",
      items: [
        {
          id: "w1",
          observedAt: `${day}T10:00:00.000Z`,
          sourceId: "apple_health",
          kind: "weight",
          payload: { weightKg: 80 },
        },
      ],
      refetch: jest.fn(),
    });

    mockUseDailyFacts.mockReturnValue({
      status: "missing",
      refetch: jest.fn(),
    });

    let last!: ReturnType<typeof useBodyOverviewData>;
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<Harness onResult={(v) => (last = v)} />);
    });
    const firstRefresh = last.refreshOverview;

    act(() => {
      tree.update(<Harness onResult={(v) => (last = v)} />);
    });

    expect(last.refreshOverview).toBe(firstRefresh);
  });
});
