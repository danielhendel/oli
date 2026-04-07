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

jest.mock("../useBodyMetricTrends", () => ({
  useBodyMetricTrends: jest.fn(() => {
    const z = { change: null, avg: null, high: null, low: null };
    return {
      status: "ready" as const,
      data: {
        byMetric: {
          weight: [],
          body_fat_percent: [],
          bmi: [],
          lean_body_mass: [],
          resting_metabolic_rate: [],
        },
        statsByMetric: {
          weight: { ...z },
          body_fat_percent: { ...z },
          bmi: { ...z },
          lean_body_mass: { ...z },
          resting_metabolic_rate: { ...z },
        },
      },
      refetch: jest.fn(),
    };
  }),
}));

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
});
