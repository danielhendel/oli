/**
 * Bounded weight range must pass start/end + includePayload and paginate with cursor.
 */
import React from "react";
import { act } from "react";
import renderer from "react-test-renderer";
import { useWeightSeries } from "../useWeightSeries";
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

function makeItem(i: number) {
  return {
    id: `w${i}`,
    kind: "weight" as const,
    observedAt: "2026-01-10T12:00:00.000Z",
    sourceId: "apple_health",
    payload: { weightKg: 70 },
  };
}

function SeriesHarness(props: { range: "1Y" }) {
  useWeightSeries(props.range);
  return null;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: { uid: "u1" },
    initializing: false,
    getIdToken: jest.fn().mockResolvedValue("tok"),
  } as unknown as ReturnType<typeof useAuth>);
  let page = 0;
  mockGetRawEvents.mockImplementation(async () => {
    page += 1;
    if (page === 1) {
      return {
        ok: true,
        status: 200,
        requestId: "r1",
        json: {
          items: Array.from({ length: 100 }, (_, i) => makeItem(i)),
          nextCursor: "c2",
        },
      };
    }
    return {
      ok: true,
      status: 200,
      requestId: "r2",
      json: { items: [], nextCursor: null },
    };
  });
  mockGetRawEvent.mockResolvedValue({ ok: false, status: 500, error: "unused", kind: "unknown" } as never);
});

it("getRawEvents uses start, end, kinds, includePayload and follows nextCursor", async () => {
  await act(async () => {
    renderer.create(<SeriesHarness range="1Y" />);
  });
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });

  expect(mockGetRawEvents.mock.calls.length).toBeGreaterThanOrEqual(2);
  const first = mockGetRawEvents.mock.calls[0]![1] as Record<string, unknown>;
  expect(first.start).toBeDefined();
  expect(first.end).toBe("2026-01-16");
  expect(first.kinds).toEqual(["weight"]);
  expect(first.includePayload).toBe(true);
  expect(first.limit).toBe(100);
  expect(first.cursor).toBeUndefined();

  const second = mockGetRawEvents.mock.calls[1]![1] as Record<string, unknown>;
  expect(second.start).toBe(first.start);
  expect(second.end).toBe(first.end);
  expect(second.cursor).toBe("c2");
  expect(mockGetRawEvent).not.toHaveBeenCalled();
});
