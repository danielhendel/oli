import React from "react";
import renderer, { act } from "react-test-renderer";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { allowConsoleForThisTest } from "../../../../scripts/test/consoleGuard";
import type { DayKey } from "@/lib/ui/calendar/types";
import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";

const mockGetIdToken = jest.fn().mockResolvedValue("id-token");
const mockGetRawEvents = jest.fn();

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "day-cache-uid" },
    initializing: false,
    getIdToken: mockGetIdToken,
  }),
}));

jest.mock("@/lib/api/usersMe", () => ({
  getRawEvents: (idToken: string, opts: unknown) => mockGetRawEvents(idToken, opts),
  getRawEvent: jest.fn(),
}));

jest.mock("@/lib/data/useDailyFacts", () => ({
  useDailyFacts: () => ({ status: "partial" as const }),
}));

const {
  useWorkoutDayDetail,
  resetWorkoutsCalendarCachesForTests,
  seedDayWorkoutsCacheForTests,
} = require("../useWorkoutsCalendar") as typeof import("../useWorkoutsCalendar");

describe("useWorkoutDayDetail", () => {
  const day: DayKey = "2026-03-11";

  const emptyRawListOk = {
    ok: true as const,
    status: 200,
    requestId: "rid-empty",
    json: { items: [] as unknown[], nextCursor: null as string | null },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRawEvents.mockReset();
    mockGetRawEvents.mockResolvedValue(emptyRawListOk);
    resetWorkoutsCalendarCachesForTests();
  });

  it("returns ready with cached workouts immediately while range fetch is still pending (dailyFacts partial)", () => {
    allowConsoleForThisTest({ error: [/not wrapped in act/] });
    const w: WorkoutHistoryItem = {
      id: "w1",
      observedAt: `${day}T12:00:00.000Z`,
      sourceId: "manual",
      title: "Run",
      start: `${day}T12:00:00.000Z`,
      end: `${day}T13:00:00.000Z`,
      durationMinutes: 60,
      calories: null,
    };
    seedDayWorkoutsCacheForTests("day-cache-uid", day, [w]);

    mockGetRawEvents.mockImplementation(
      () =>
        new Promise<void>(() => {
          /* range fetch intentionally pending */
        }),
    );

    const detailRef: { current: ReturnType<typeof useWorkoutDayDetail> | null } = { current: null };

    function DayOnly() {
      detailRef.current = useWorkoutDayDetail(day, { rawEventKinds: ["workout"] });
      return null;
    }

    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<DayOnly />);
    });

    expect(detailRef.current?.status).toBe("ready");
    expect(detailRef.current?.workouts).toEqual([w]);
    expect(detailRef.current?.dailyFacts).toBeUndefined();

    act(() => {
      root.unmount();
    });
    mockGetRawEvents.mockReset();
    mockGetRawEvents.mockResolvedValue(emptyRawListOk);
  });

  it("when range is ready, merges per-day cache rows missing from single-day raw fetch", () => {
    allowConsoleForThisTest({ error: [/not wrapped in act/] });
    const w: WorkoutHistoryItem = {
      id: "cached-strength-1",
      observedAt: "2026-04-01T12:00:00.000Z",
      sourceId: "manual",
      title: "Bench",
      start: `${day}T12:00:00.000Z`,
      end: null,
      durationMinutes: 45,
      calories: null,
      rawKind: "strength_workout",
    };
    seedDayWorkoutsCacheForTests("day-cache-uid", day, [w]);

    const detailRef: { current: ReturnType<typeof useWorkoutDayDetail> | null } = { current: null };

    function DayOnly() {
      detailRef.current = useWorkoutDayDetail(day);
      return null;
    }

    act(() => {
      renderer.create(<DayOnly />);
    });

    expect(detailRef.current?.status).toBe("ready");
    expect(detailRef.current?.workouts.some((x) => x.id === "cached-strength-1")).toBe(true);
  });
});
