import React from "react";
import renderer, { act } from "react-test-renderer";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { WORKOUT_DAY_SUMMARY_EXPECTED } from "@oli/contracts";

const mockGetIdToken = jest.fn().mockResolvedValue("id-token");
const mockGetRawEvents = jest.fn();
const mockGetWorkoutDaySummaries = jest.fn();
const mockPostWorkoutDaySummariesRebuild = jest.fn();

const stableSummaryUser = { uid: "summary-uid" };

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: stableSummaryUser,
    initializing: false,
    getIdToken: mockGetIdToken,
  }),
}));

jest.mock("@/lib/api/usersMe", () => ({
  getRawEvents: (idToken: string, opts: unknown) => mockGetRawEvents(idToken, opts),
  getRawEvent: jest.fn(),
  getWorkoutDaySummaries: (idToken: string, opts: unknown) => mockGetWorkoutDaySummaries(idToken, opts),
  postWorkoutDaySummariesRebuild: (idToken: string, opts: unknown) =>
    mockPostWorkoutDaySummariesRebuild(idToken, opts),
}));

const { useWorkoutsCalendarRange, resetWorkoutsCalendarCachesForTests } =
  require("../useWorkoutsCalendar") as typeof import("../useWorkoutsCalendar");

const SUMMARY_FIRST_RANGE_OPTS = {
  preferWorkoutDaySummaries: true as const,
  rawEventKinds: ["workout"] as const,
};

describe("useWorkoutsCalendarRange summary-first", () => {
  const start = "2026-03-10";
  const end = "2026-03-12";

  beforeEach(() => {
    jest.clearAllMocks();
    resetWorkoutsCalendarCachesForTests();
    mockPostWorkoutDaySummariesRebuild.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: null,
      json: { start, end, daysProcessed: 3 },
    });
  });

  it("uses summary path when API reports complete coverage and skips raw list", async () => {
    const items = [
      {
        schemaVersion: WORKOUT_DAY_SUMMARY_EXPECTED.schemaVersion,
        day: "2026-03-10",
        computedAt: "2026-01-01T00:00:00.000Z",
        reconcileVersion: WORKOUT_DAY_SUMMARY_EXPECTED.reconcileVersion,
        hasStrength: false,
        hasCardio: false,
        rawWorkoutCount: 0,
      },
      {
        schemaVersion: WORKOUT_DAY_SUMMARY_EXPECTED.schemaVersion,
        day: "2026-03-11",
        computedAt: "2026-01-01T00:00:00.000Z",
        reconcileVersion: WORKOUT_DAY_SUMMARY_EXPECTED.reconcileVersion,
        hasStrength: true,
        hasCardio: false,
        rawWorkoutCount: 1,
      },
      {
        schemaVersion: WORKOUT_DAY_SUMMARY_EXPECTED.schemaVersion,
        day: "2026-03-12",
        computedAt: "2026-01-01T00:00:00.000Z",
        reconcileVersion: WORKOUT_DAY_SUMMARY_EXPECTED.reconcileVersion,
        hasStrength: false,
        hasCardio: false,
        rawWorkoutCount: 0,
      },
    ];

    mockGetWorkoutDaySummaries.mockResolvedValue({
      ok: true,
      json: {
        start,
        end,
        expectedDayCount: 3,
        complete: true,
        items,
      },
      requestId: null,
    });

    const ref: { current: ReturnType<typeof useWorkoutsCalendarRange> | null } = { current: null };

    function Probe() {
      ref.current = useWorkoutsCalendarRange(start, end, SUMMARY_FIRST_RANGE_OPTS);
      return null;
    }

    let root!: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<Probe />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockGetWorkoutDaySummaries).toHaveBeenCalled();
    expect(mockPostWorkoutDaySummariesRebuild).not.toHaveBeenCalled();
    expect(mockGetRawEvents).not.toHaveBeenCalled();
    expect(ref.current?.status).toBe("ready");
    if (ref.current?.status === "ready") {
      expect(ref.current.markerFlagsByDay?.["2026-03-11"]).toEqual({
        hasStrength: true,
        hasCardio: false,
      });
      expect(ref.current.days.every((d) => d.workouts.length === 0)).toBe(true);
    }

    act(() => root.unmount());
  });

  it("falls back to raw hydration when summaries are incomplete", async () => {
    mockGetWorkoutDaySummaries.mockResolvedValue({
      ok: true,
      json: {
        start,
        end,
        expectedDayCount: 3,
        complete: false,
        items: [],
      },
      requestId: null,
    });

    mockGetRawEvents.mockResolvedValue({
      ok: true,
      json: { items: [], nextCursor: null },
      requestId: null,
    });

    const ref: { current: ReturnType<typeof useWorkoutsCalendarRange> | null } = { current: null };

    function Probe() {
      ref.current = useWorkoutsCalendarRange(start, end, SUMMARY_FIRST_RANGE_OPTS);
      return null;
    }

    let root!: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<Probe />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockPostWorkoutDaySummariesRebuild).toHaveBeenCalledTimes(1);
    expect(mockGetWorkoutDaySummaries).toHaveBeenCalledTimes(2);
    expect(mockGetRawEvents).toHaveBeenCalled();
    expect(ref.current?.status).toBe("ready");
    if (ref.current?.status === "ready") {
      expect(ref.current.markerFlagsByDay).toBeUndefined();
    }

    act(() => root.unmount());
  });

  it("rebuilds once then uses summary path when the second GET is complete", async () => {
    const items = [
      {
        schemaVersion: WORKOUT_DAY_SUMMARY_EXPECTED.schemaVersion,
        day: "2026-03-10",
        computedAt: "2026-01-01T00:00:00.000Z",
        reconcileVersion: WORKOUT_DAY_SUMMARY_EXPECTED.reconcileVersion,
        hasStrength: false,
        hasCardio: false,
        rawWorkoutCount: 0,
      },
      {
        schemaVersion: WORKOUT_DAY_SUMMARY_EXPECTED.schemaVersion,
        day: "2026-03-11",
        computedAt: "2026-01-01T00:00:00.000Z",
        reconcileVersion: WORKOUT_DAY_SUMMARY_EXPECTED.reconcileVersion,
        hasStrength: true,
        hasCardio: false,
        rawWorkoutCount: 1,
      },
      {
        schemaVersion: WORKOUT_DAY_SUMMARY_EXPECTED.schemaVersion,
        day: "2026-03-12",
        computedAt: "2026-01-01T00:00:00.000Z",
        reconcileVersion: WORKOUT_DAY_SUMMARY_EXPECTED.reconcileVersion,
        hasStrength: false,
        hasCardio: false,
        rawWorkoutCount: 0,
      },
    ];

    mockGetWorkoutDaySummaries
      .mockResolvedValueOnce({
        ok: true,
        json: {
          start,
          end,
          expectedDayCount: 3,
          complete: false,
          items: [],
        },
        requestId: null,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: {
          start,
          end,
          expectedDayCount: 3,
          complete: true,
          items,
        },
        requestId: null,
      });

    const ref: { current: ReturnType<typeof useWorkoutsCalendarRange> | null } = { current: null };

    function Probe() {
      ref.current = useWorkoutsCalendarRange(start, end, SUMMARY_FIRST_RANGE_OPTS);
      return null;
    }

    let root!: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<Probe />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockPostWorkoutDaySummariesRebuild).toHaveBeenCalledTimes(1);
    expect(mockGetWorkoutDaySummaries).toHaveBeenCalledTimes(2);
    expect(mockGetRawEvents).not.toHaveBeenCalled();
    expect(ref.current?.status).toBe("ready");
    if (ref.current?.status === "ready") {
      expect(ref.current.markerFlagsByDay?.["2026-03-11"]).toEqual({
        hasStrength: true,
        hasCardio: false,
      });
    }

    act(() => root.unmount());
  });
});
