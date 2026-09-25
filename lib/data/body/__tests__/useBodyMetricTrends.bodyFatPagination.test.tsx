/**
 * Body Fat trend pagination must follow nextCursor across pages (not stop at 100).
 */
import React, { useEffect } from "react";
import { act } from "react";
import renderer from "react-test-renderer";
import { useBodyMetricTrends } from "../useBodyMetricTrends";
import { getRawEvents, getRawEvent } from "@/lib/api/usersMe";
import { useAuth } from "@/lib/auth/AuthProvider";

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

function makeItem(id: string, observedAt: string, kind: "weight" | "body_composition") {
  return {
    id,
    kind,
    observedAt,
    sourceId: "apple_health",
    payload:
      kind === "weight"
        ? {
            weightKg: 70,
            bodyFatPercent: 18,
            time: observedAt,
            timezone: "UTC",
          }
        : {
            bodyFatPercent: 17.5,
            time: observedAt,
            timezone: "UTC",
          },
  };
}

describe("useBodyMetricTrends Body Fat pagination", () => {
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

  it("follows nextCursor across three pages (237 events) for Body Fat All", async () => {
    let page = 0;
    mockGetRawEvents.mockImplementation(async () => {
      page += 1;
      if (page === 1) {
        return {
          ok: true,
          status: 200,
          requestId: "r1",
          json: {
            items: Array.from({ length: 100 }, (_, i) =>
              makeItem(`p1-${i}`, "2026-09-01T12:00:00.000Z", "weight"),
            ),
            nextCursor: "c2",
          },
        };
      }
      if (page === 2) {
        return {
          ok: true,
          status: 200,
          requestId: "r2",
          json: {
            items: Array.from({ length: 100 }, (_, i) =>
              makeItem(`p2-${i}`, "2025-06-01T12:00:00.000Z", "body_composition"),
            ),
            nextCursor: "c3",
          },
        };
      }
      return {
        ok: true,
        status: 200,
        requestId: "r3",
        json: {
          items: Array.from({ length: 37 }, (_, i) =>
            makeItem(
              `p3-${i}`,
              i === 36 ? "2023-05-10T12:00:00.000Z" : "2024-08-01T12:00:00.000Z",
              i % 2 === 0 ? "weight" : "body_composition",
            ),
          ),
          nextCursor: null,
        },
      };
    });

    const capture: { count: number | null; oldest: string | null } = {
      count: null,
      oldest: null,
    };

    function Probe() {
      const s = useBodyMetricTrends("All", "body_fat_percent");
      useEffect(() => {
        if (s.status === "ready") {
          const pts = s.data.byMetric.body_fat_percent;
          capture.count = pts.length;
          capture.oldest = pts[0]?.observedAt ?? null;
        }
      }, [s]);
      return null;
    }

    await act(async () => {
      renderer.create(<Probe />);
    });
    for (let i = 0; i < 8; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    expect(mockGetRawEvents).toHaveBeenCalledTimes(3);
    expect(mockGetRawEvents.mock.calls[1]?.[1]).toMatchObject({ cursor: "c2" });
    expect(mockGetRawEvents.mock.calls[2]?.[1]).toMatchObject({ cursor: "c3" });
    // 237 events → 237 Body Fat points (each item carries BF).
    expect(capture.count).toBe(237);
    expect(capture.oldest).toBe("2023-05-10T12:00:00.000Z");
  });
});
