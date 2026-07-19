import React from "react";
import renderer, { act } from "react-test-renderer";
import type { CanonicalEventListItem, RawEventListItem } from "@oli/contracts";

const mockGetIdToken = jest.fn(async () => "tok");
const mockFetchEvents = jest.fn();
const mockFetchRaw = jest.fn();

jest.mock("@react-navigation/native", () => ({ useIsFocused: () => true }));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "user-a" },
    initializing: false,
    getIdToken: mockGetIdToken,
  }),
}));

jest.mock("@/lib/features/timeline/fetchTimelineDayEventsPages", () => ({
  fetchTimelineDayEventsPages: (...args: unknown[]) => mockFetchEvents(...args),
}));

jest.mock("@/lib/features/timeline/fetchTimelineDayRawEventsPages", () => ({
  fetchTimelineDayRawEventsPages: (...args: unknown[]) => mockFetchRaw(...args),
}));

jest.mock("@/lib/hooks/useSleepNight", () => ({
  useSleepNight: () => ({
    view: undefined,
    loading: false,
    settled: true,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock("@/lib/data/useDailyFacts", () => ({
  useDailyFacts: () => ({ status: "missing", refetch: jest.fn() }),
}));

jest.mock("@/lib/data/useInsights", () => ({
  useInsights: () => ({
    status: "ready",
    data: { day: "2026-07-16", count: 0, items: [] },
    refetch: jest.fn(),
  }),
}));

jest.mock("@/lib/data/useReadinessView", () => ({
  useReadinessView: () => ({
    status: "missing",
    refetch: jest.fn(),
  }),
}));

import { useTimelineDay } from "@/lib/features/timeline/useTimelineDay";

const DAY = "2026-07-16";

function canonical(id: string): CanonicalEventListItem {
  return {
    id,
    userId: "u1",
    sourceId: "apple_health",
    kind: "workout",
    start: `${DAY}T10:00:00.000Z`,
    end: `${DAY}T11:00:00.000Z`,
    day: DAY,
    timezone: "UTC",
    createdAt: `${DAY}T10:00:00.000Z`,
    updatedAt: `${DAY}T10:00:00.000Z`,
    schemaVersion: 1,
  };
}

function rawIncomplete(id: string): RawEventListItem {
  return {
    id,
    userId: "u1",
    sourceId: "manual",
    kind: "incomplete",
    observedAt: `${DAY}T11:00:00.000Z`,
    receivedAt: `${DAY}T11:00:00.000Z`,
    schemaVersion: 1,
  };
}

function HookProbe({
  day,
  onResult,
}: {
  day: string;
  onResult: (r: ReturnType<typeof useTimelineDay>) => void;
}) {
  const result = useTimelineDay(day);
  React.useEffect(() => {
    onResult(result);
  }, [result, onResult]);
  return null;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function renderHook(day: string) {
  let latest: ReturnType<typeof useTimelineDay> | null = null;
  await act(async () => {
    renderer.create(
      <HookProbe
        day={day}
        onResult={(r) => {
          latest = r;
        }}
      />,
    );
  });
  await flush();
  return () => {
    if (!latest) throw new Error("hook result missing");
    return latest;
  };
}

describe("useTimelineDay completeness", () => {
  beforeEach(() => {
    mockFetchEvents.mockReset();
    mockFetchRaw.mockReset();
    mockGetIdToken.mockClear();
    mockFetchEvents.mockResolvedValue({
      completeness: "complete",
      items: [],
      pageCount: 1,
      requestCount: 1,
    });
    mockFetchRaw.mockResolvedValue({
      completeness: "complete",
      items: [],
      pageCount: 1,
      requestCount: 1,
    });
  });

  test("settles to ready when both paginated families are complete", async () => {
    mockFetchEvents.mockResolvedValue({
      completeness: "complete",
      items: [canonical("e1")],
      pageCount: 1,
      requestCount: 1,
    });
    const get = await renderHook(DAY);
    const r = get();
    expect(r.status.status).toBe("ready");
    expect(r.completeness).toEqual({ state: "complete" });
    if (r.status.status === "ready") {
      expect(r.status.vm.items.length).toBeGreaterThan(0);
      expect(JSON.stringify(r.status.vm)).not.toMatch(/"payload"/);
    }
  });

  test("partial when canonical continuation fails after useful data", async () => {
    mockFetchEvents.mockResolvedValue({
      completeness: "partial",
      items: [canonical("e1")],
      pageCount: 1,
      requestCount: 2,
      reason: "continuation_error",
    });
    const get = await renderHook(DAY);
    const r = get();
    expect(r.status.status).toBe("partial");
    if (r.status.status === "partial" && r.status.history === "incomplete") {
      expect(r.status.incompletenessReason).toBe("continuation_error");
      expect(r.status.vm.items.length).toBeGreaterThan(0);
    }
    expect(r.completeness.state).toBe("unproven");
  });

  test("partial when raw continuation fails", async () => {
    mockFetchRaw.mockResolvedValue({
      completeness: "partial",
      items: [rawIncomplete("r1")],
      pageCount: 1,
      requestCount: 2,
      reason: "continuation_error",
    });
    const get = await renderHook(DAY);
    const r = get();
    expect(r.status.status).toBe("partial");
    if (r.status.status === "partial" && r.status.history === "incomplete") {
      expect(r.status.incompletenessReason).toBe("continuation_error");
    }
  });

  test("partial on page_cap", async () => {
    mockFetchEvents.mockResolvedValue({
      completeness: "partial",
      items: [],
      pageCount: 10,
      requestCount: 10,
      reason: "page_cap",
    });
    const get = await renderHook(DAY);
    expect(get().completeness).toEqual({ state: "unproven", reason: "page_cap" });
  });

  test("partial on cursor_cycle", async () => {
    mockFetchEvents.mockResolvedValue({
      completeness: "partial",
      items: [],
      pageCount: 2,
      requestCount: 2,
      reason: "cursor_cycle",
    });
    const get = await renderHook(DAY);
    expect(get().completeness).toEqual({ state: "unproven", reason: "cursor_cycle" });
  });

  test("error when canonical initial page fails with no usable history", async () => {
    mockFetchEvents.mockResolvedValue({
      completeness: "error",
      items: [],
      pageCount: 0,
      requestCount: 1,
      reason: "continuation_error",
    });
    const get = await renderHook(DAY);
    expect(get().status.status).toBe("error");
  });

  test("optional context missing does not force error", async () => {
    const get = await renderHook(DAY);
    expect(get().status.status).toBe("ready");
  });

  test("Retry creates one new generation", async () => {
    const get = await renderHook(DAY);
    const callsBefore = mockFetchEvents.mock.calls.length;
    await act(async () => {
      get().refetchAll();
    });
    await flush();
    expect(mockFetchEvents.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  test("loaders receive selected day only (no cross-day widening)", async () => {
    await renderHook(DAY);
    expect(mockFetchEvents).toHaveBeenCalledWith(expect.objectContaining({ day: DAY }));
    expect(mockFetchRaw).toHaveBeenCalledWith(expect.objectContaining({ day: DAY }));
  });

  test("ready invariant: complete families only", async () => {
    mockFetchEvents.mockResolvedValue({
      completeness: "complete",
      items: [],
      pageCount: 1,
      requestCount: 1,
    });
    mockFetchRaw.mockResolvedValue({
      completeness: "partial",
      items: [],
      pageCount: 1,
      requestCount: 1,
      reason: "page_cap",
    });
    const get = await renderHook(DAY);
    expect(get().status.status).not.toBe("ready");
  });
});
