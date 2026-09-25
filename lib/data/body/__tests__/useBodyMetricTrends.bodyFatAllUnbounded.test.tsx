/**
 * Body Fat All must not silently map to 5Y at the query layer.
 */
import React, { useEffect } from "react";
import { act } from "react";
import renderer from "react-test-renderer";
import { useBodyMetricTrends } from "../useBodyMetricTrends";
import { getRawEvents, getRawEvent } from "@/lib/api/usersMe";
import { useAuth } from "@/lib/auth/AuthProvider";
import { selectWeightSeriesForRange } from "@/lib/body/presentation/selectWeightSeriesForRange";
import type { WeightPoint } from "@/lib/data/useWeightSeries";

jest.mock("@/lib/api/usersMe", () => ({
  getRawEvents: jest.fn(),
  getRawEvent: jest.fn(),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/lib/time/dayKey", () => ({
  getTodayDayKey: () => "2026-09-21",
  ymdInTimeZoneFromIso: (iso: string) => iso.slice(0, 10),
}));

const mockGetRawEvents = getRawEvents as jest.MockedFunction<typeof getRawEvents>;
const mockGetRawEvent = getRawEvent as jest.MockedFunction<typeof getRawEvent>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

function pt(dayKey: string, value: number): WeightPoint {
  return {
    observedAt: `${dayKey}T12:00:00.000Z`,
    dayKey,
    weightKg: value,
    sourceId: "apple_health",
  };
}

describe("Body Fat All is not 5Y", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { uid: "u1" },
      initializing: false,
      getIdToken: jest.fn().mockResolvedValue("tok"),
    } as unknown as ReturnType<typeof useAuth>);
    mockGetRawEvent.mockResolvedValue({
      ok: false,
      status: 500,
      error: "unused",
      kind: "unknown",
    } as never);
  });

  it("omits start/end when querying Body Fat All (unbounded stored history)", async () => {
    mockGetRawEvents.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: "r1",
      json: {
        items: [
          {
            id: "old",
            kind: "body_composition",
            observedAt: "2017-06-10T12:00:00.000Z",
            sourceId: "apple_health",
            payload: {
              bodyFatPercent: 18.8,
              time: "2017-06-10T12:00:00.000Z",
              timezone: "UTC",
            },
          },
          {
            id: "new",
            kind: "weight",
            observedAt: "2026-09-21T12:00:00.000Z",
            sourceId: "apple_health",
            payload: {
              weightKg: 70,
              bodyFatPercent: 17.2,
              time: "2026-09-21T12:00:00.000Z",
              timezone: "UTC",
            },
          },
        ],
        nextCursor: null,
      },
    });

    const capture: { oldest: string | null } = { oldest: null };
    function Probe() {
      const s = useBodyMetricTrends("All", "body_fat_percent");
      useEffect(() => {
        if (s.status === "ready") {
          capture.oldest = s.data.byMetric.body_fat_percent[0]?.observedAt ?? null;
        }
      }, [s]);
      return null;
    }

    await act(async () => {
      renderer.create(<Probe />);
    });
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    const arg = mockGetRawEvents.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(arg.start).toBeUndefined();
    expect(arg.end).toBeUndefined();
    expect(arg.kinds).toEqual(["weight", "body_composition"]);
    expect(capture.oldest).toBe("2017-06-10T12:00:00.000Z");
  });

  it("client 5Y excludes 2017 while All includes 2017", () => {
    const stored = [
      pt("2017-06-10", 18.8),
      pt("2024-10-17", 21.0),
      pt("2025-04-08", 20.5),
      pt("2026-09-21", 17.2),
    ];
    const fiveY = selectWeightSeriesForRange(stored, "5Y", {
      anchorDayKey: "2026-09-21",
    });
    const all = selectWeightSeriesForRange(stored, "All", {
      anchorDayKey: "2026-09-21",
    });
    expect(fiveY.plottedPoints.some((p) => p.dayKey === "2017-06-10")).toBe(false);
    expect(all.plottedPoints.some((p) => p.dayKey === "2017-06-10")).toBe(true);
    expect(fiveY.plottedPoints.some((p) => p.dayKey.startsWith("2024"))).toBe(true);
  });
});
