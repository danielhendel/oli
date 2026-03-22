/**
 * Default calendar range must hydrate both workout (e.g. Apple Health) and strength_workout.
 */
import React, { useEffect } from "react";
import renderer, { act } from "react-test-renderer";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import type { DayKey } from "@/lib/ui/calendar/types";
import type { RawEventDoc } from "@oli/contracts";

const mockGetRawEvents = jest.fn();
const mockGetRawEvent = jest.fn();

jest.mock("@/lib/auth/AuthProvider", () => {
  const stableUser = { uid: "u-kinds" };
  const getIdToken = jest.fn().mockResolvedValue("token");
  return {
    useAuth: () => ({
      user: stableUser,
      initializing: false,
      getIdToken,
    }),
  };
});

jest.mock("@/lib/api/usersMe", () => ({
  getRawEvents: (idToken: string, opts: unknown) => mockGetRawEvents(idToken, opts),
  getRawEvent: (id: string, idToken: string) => mockGetRawEvent(id, idToken),
}));

const {
  useWorkoutsCalendarRange,
  resetWorkoutsCalendarCachesForTests,
} = require("../useWorkoutsCalendar") as typeof import("../useWorkoutsCalendar");

function mkRaw(id: string, kind: RawEventDoc["kind"], day: DayKey): RawEventDoc {
  return {
    schemaVersion: 1,
    id,
    userId: "u",
    sourceId: "test",
    provider: "test",
    sourceType: "test",
    kind,
    receivedAt: `${day}T12:00:00.000Z`,
    observedAt: `${day}T12:00:00.000Z`,
    payload:
      kind === "strength_workout"
        ? { startedAt: `${day}T18:00:00.000Z`, timeZone: "UTC", exercises: [{ name: "Press" }] }
        : {
            day,
            sport: "Run",
            start: `${day}T08:00:00.000Z`,
            end: `${day}T09:00:00.000Z`,
            timezone: "UTC",
            durationMinutes: 30,
          },
  } as unknown as RawEventDoc;
}

describe("useWorkoutsCalendarRange default raw kinds", () => {
  const day: DayKey = "2025-10-11";

  beforeEach(() => {
    jest.clearAllMocks();
    resetWorkoutsCalendarCachesForTests();
  });

  it("lists both workout and strength_workout (no options)", async () => {
    mockGetRawEvents.mockImplementation(async (_t: string, opts: { kind?: string }) => {
      const k = opts.kind;
      if (k === "workout") {
        return {
          ok: true,
          status: 200,
          requestId: "r1",
          json: { items: [{ id: "ah1" }], nextCursor: null },
        };
      }
      if (k === "strength_workout") {
        return {
          ok: true,
          status: 200,
          requestId: "r2",
          json: { items: [{ id: "sw1" }], nextCursor: null },
        };
      }
      return { ok: true, status: 200, requestId: "r0", json: { items: [], nextCursor: null } };
    });

    mockGetRawEvent.mockImplementation(async (id: string) => ({
      ok: true,
      status: 200,
      requestId: "doc",
      json: id === "ah1" ? mkRaw("ah1", "workout", day) : mkRaw("sw1", "strength_workout", day),
    }));

    const resolveReady: { current: null | ((v: unknown) => void) } = { current: null };

    function Comp() {
      const range = useWorkoutsCalendarRange(day, day);
      useEffect(() => {
        if (range.status === "ready") resolveReady.current?.(range);
      }, [range.status]);
      return null;
    }

    const readyPromise = new Promise<unknown>((resolve) => {
      resolveReady.current = resolve;
    });

    await act(async () => {
      renderer.create(<Comp />);
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      await readyPromise;
    });

    const kinds = mockGetRawEvents.mock.calls.map((c) => (c[1] as { kind?: string }).kind);
    expect(kinds).toContain("workout");
    expect(kinds).toContain("strength_workout");
  });

  it("surfaces historical Apple Health kind=workout in range coverage day list", async () => {
    mockGetRawEvents.mockImplementation(async (_t: string, opts: { kind?: string }) => {
      if (opts.kind === "workout") {
        return {
          ok: true,
          status: 200,
          requestId: "rw",
          json: { items: [{ id: "appleHealth:v2:workout:2025-10-11" }], nextCursor: null },
        };
      }
      return { ok: true, status: 200, requestId: "rs", json: { items: [], nextCursor: null } };
    });

    mockGetRawEvent.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: "d",
      json: mkRaw("appleHealth:v2:workout:2025-10-11", "workout", day),
    });

    const resolveReady: { current: null | ((v: unknown) => void) } = { current: null };

    function Comp() {
      const range = useWorkoutsCalendarRange(day, day);
      useEffect(() => {
        if (range.status === "ready") resolveReady.current?.(range);
      }, [range.status]);
      return null;
    }

    const readyPromise = new Promise<unknown>((resolve) => {
      resolveReady.current = resolve;
    });

    await act(async () => {
      renderer.create(<Comp />);
      await Promise.resolve();
      await Promise.resolve();
    });

    const state = await act(async () => {
      return await readyPromise;
    });
    expect((state as { status: string }).status).toBe("ready");
    const days = (state as { days: { day: DayKey; workouts: { id: string }[] }[] }).days;
    const target = days.find((d) => d.day === day);
    expect(target?.workouts.some((w) => w.id.includes("appleHealth"))).toBe(true);
  });
});
