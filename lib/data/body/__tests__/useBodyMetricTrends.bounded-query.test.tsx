/**
 * Body trends must query raw-events with start/end + includePayload (no unbounded global scan).
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
  getTodayDayKey: () => "2026-01-15",
  ymdInTimeZoneFromIso: (iso: string) => iso.slice(0, 10),
}));

const mockGetRawEvents = getRawEvents as jest.MockedFunction<typeof getRawEvents>;
const mockGetRawEvent = getRawEvent as jest.MockedFunction<typeof getRawEvent>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

function TrendsHarness(props: { range: "1Y" | "All" }) {
  useBodyMetricTrends(props.range);
  return null;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: { uid: "u1" },
    initializing: false,
    getIdToken: jest.fn().mockResolvedValue("tok"),
  } as unknown as ReturnType<typeof useAuth>);
  mockGetRawEvents.mockResolvedValue({
    ok: true,
    status: 200,
    requestId: "r1",
    json: { items: [], nextCursor: null },
  });
  mockGetRawEvent.mockResolvedValue({ ok: false, status: 500, error: "unused", kind: "unknown" } as never);
});

it("getRawEvents uses start, end, kinds, includePayload for 1Y (bounded before pagination)", async () => {
  await act(async () => {
    renderer.create(<TrendsHarness range="1Y" />);
  });
  await act(async () => {
    await Promise.resolve();
  });

  expect(mockGetRawEvents).toHaveBeenCalled();
  const arg1 = mockGetRawEvents.mock.calls[0]?.[1] as Record<string, unknown>;
  expect(arg1.start).toBeDefined();
  expect(arg1.end).toBe("2026-01-16");
  expect(arg1.kinds).toEqual(["weight", "body_composition"]);
  expect(arg1.includePayload).toBe(true);
  expect(arg1.limit).toBe(100);
});

it("chart All still uses bounded 5Y window (not global scan)", async () => {
  await act(async () => {
    renderer.create(<TrendsHarness range="All" />);
  });
  await act(async () => {
    await Promise.resolve();
  });

  const arg1 = mockGetRawEvents.mock.calls[0]?.[1] as Record<string, unknown>;
  expect(arg1.start).toBeDefined();
  expect(arg1.end).toBe("2026-01-16");
  expect(arg1.includePayload).toBe(true);
});

it("drops non–Apple Health rows before hydration (list still returns mixed sources)", async () => {
  mockGetRawEvents.mockResolvedValue({
    ok: true,
    status: 200,
    requestId: "r-mix",
    json: {
      items: [
        {
          id: "legacy",
          kind: "weight",
          observedAt: "2026-01-10T12:00:00.000Z",
          sourceId: "withings",
          payload: { weightKg: 99, time: "2026-01-10T12:00:00.000Z", timezone: "UTC" },
        },
        {
          id: "ah",
          kind: "weight",
          observedAt: "2026-01-10T13:00:00.000Z",
          sourceId: "apple_health",
          payload: { weightKg: 70, time: "2026-01-10T13:00:00.000Z", timezone: "UTC" },
        },
      ],
      nextCursor: null,
    },
  });

  const weightKgCapture: { current: number[] | null } = { current: null };
  function AppleHealthProbe() {
    const s = useBodyMetricTrends("1Y");
    useEffect(() => {
      if (s.status === "ready") {
        weightKgCapture.current = s.data.byMetric.weight.map((p) => p.weightKg);
      }
    }, [s]);
    return null;
  }

  await act(async () => {
    renderer.create(<AppleHealthProbe />);
  });
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });

  expect(weightKgCapture.current).toEqual([70]);
  expect(mockGetRawEvent).not.toHaveBeenCalled();
});
