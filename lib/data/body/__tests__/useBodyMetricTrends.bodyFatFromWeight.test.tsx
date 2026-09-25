/**
 * Body Fat on weight RawEvents must appear in the Body Fat trend series.
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
  getTodayDayKey: () => "2026-09-16",
  ymdInTimeZoneFromIso: (iso: string) => iso.slice(0, 10),
}));

const mockGetRawEvents = getRawEvents as jest.MockedFunction<typeof getRawEvents>;
const mockGetRawEvent = getRawEvent as jest.MockedFunction<typeof getRawEvent>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

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

it("extracts Body Fat from weight payloads and body_composition kinds", async () => {
  mockGetRawEvents.mockResolvedValue({
    ok: true,
    status: 200,
    requestId: "r-bf",
    json: {
      items: [
        {
          id: "w1",
          kind: "weight",
          observedAt: "2022-03-01T12:00:00.000Z",
          sourceId: "apple_health",
          payload: {
            weightKg: 80,
            bodyFatPercent: 19.1,
            time: "2022-03-01T12:00:00.000Z",
            timezone: "UTC",
          },
        },
        {
          id: "c1",
          kind: "body_composition",
          observedAt: "2026-09-16T12:00:00.000Z",
          sourceId: "apple_health",
          payload: {
            bodyFatPercent: 18.2,
            time: "2026-09-16T12:00:00.000Z",
            timezone: "UTC",
          },
        },
      ],
      nextCursor: null,
    },
  });

  const capture: { values: number[] | null; kindsArg: unknown } = {
    values: null,
    kindsArg: null,
  };

  function Probe() {
    const s = useBodyMetricTrends("All", "body_fat_percent");
    useEffect(() => {
      if (s.status === "ready") {
        capture.values = s.data.byMetric.body_fat_percent.map((p) => p.weightKg);
      }
    }, [s]);
    return null;
  }

  await act(async () => {
    renderer.create(<Probe />);
  });
  await act(async () => {
    await Promise.resolve();
  });

  capture.kindsArg = mockGetRawEvents.mock.calls[0]?.[1]?.kinds;
  expect(capture.kindsArg).toEqual(["weight", "body_composition"]);
  expect(capture.values).toEqual([19.1, 18.2]);
});
