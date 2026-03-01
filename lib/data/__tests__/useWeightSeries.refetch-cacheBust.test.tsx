/**
 * Invariant: useWeightSeries refetch with opts triggers getRawEvents with cacheBust.
 * Ensures weight refresh on focus (e.g. weight screen open) uses cache-busted fetch.
 */
import React, { useEffect, useRef } from "react";
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

type RefetchFn = (opts?: { cacheBust?: string }) => void;
function Harness(props: { onRefetch: (fn: RefetchFn) => void }) {
  const refetch = useWeightSeries("30D").refetch;
  const ref = useRef(refetch);
  ref.current = refetch;
  useEffect(() => {
    const fn: RefetchFn = (opts) => {
      ref.current(opts);
    };
    props.onRefetch(fn);
  }, [props.onRefetch]);
  return null;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: { uid: "test-uid" },
    initializing: false,
    getIdToken: jest.fn().mockResolvedValue("id-token"),
  } as unknown as ReturnType<typeof useAuth>);
  mockGetRawEvents.mockResolvedValue({
    ok: true,
    status: 200,
    requestId: "req-1",
    json: { items: [], nextCursor: null },
  });
  mockGetRawEvent.mockResolvedValue({
    ok: true,
    status: 200,
    requestId: "req-1",
    json: {
      id: "w1",
      kind: "weight",
      observedAt: "2025-01-15T10:00:00.000Z",
      sourceId: "withings",
      payload: { weightKg: 70 },
      schemaVersion: 1,
    },
  } as never);
});

it("refetch with cacheBust calls getRawEvents with cacheBust in options", async () => {
  let refetchFn: RefetchFn | null = null;
  const onRefetch = jest.fn((fn: RefetchFn) => {
    refetchFn = fn;
  });

  act(() => {
    renderer.create(<Harness onRefetch={onRefetch} />);
  });
  await act(async () => {
    await Promise.resolve();
  });

  expect(refetchFn).toBeDefined();
  mockGetRawEvents.mockClear();
  const cacheBust = "auto:focus:999";
  await act(async () => {
    refetchFn!({ cacheBust });
  });

  await act(async () => {
    await Promise.resolve();
  });

  expect(mockGetRawEvents).toHaveBeenCalled();
  const lastCall = mockGetRawEvents.mock.calls[mockGetRawEvents.mock.calls.length - 1];
  expect(lastCall?.[1]?.cacheBust).toBeDefined();
  expect(String(lastCall?.[1]?.cacheBust)).toContain(cacheBust);
});
