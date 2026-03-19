import React, { useEffect } from "react";
import renderer, { act } from "react-test-renderer";
import { describe, expect, it, jest } from "@jest/globals";
import type { DayKey } from "@/lib/ui/calendar/types";
import type { RawEventDoc } from "@oli/contracts";
import type { WorkoutCalendarRangeState } from "../useWorkoutsCalendar";
import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";

import { WORKOUTS_CALENDAR_RAW_EVENTS_PAGE_SIZE } from "../workoutsCalendarApiConstants";

const mockGetIdToken = jest.fn().mockResolvedValue("id-token");
const mockGetRawEvents = jest.fn();
const mockGetRawEvent = jest.fn();
const mockUser = { uid: "u1" };

type AdapterGetRawEventsOpts = {
  kind?: "workout" | "strength_workout";
  cursor?: string;
  limit?: number;
  start?: string;
  end?: string;
};

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: mockUser,
    initializing: false,
    getIdToken: mockGetIdToken,
  }),
}));

jest.mock("@/lib/api/usersMe", () => ({
  getRawEvents: (idToken: string, opts: unknown) => mockGetRawEvents(idToken, opts),
  getRawEvent: (id: string, idToken: string) => mockGetRawEvent(id, idToken),
}));

const { useWorkoutsCalendarRange } = require("../useWorkoutsCalendar") as typeof import("../useWorkoutsCalendar");

function mkRawEvent(opts: {
  id: string;
  kind: RawEventDoc["kind"];
  observedAt: string;
  sourceId?: string;
  payload: unknown;
}): RawEventDoc {
  // Test-only helper: minimal shape needed by adapter parsing.
  return {
    schemaVersion: 1,
    id: opts.id,
    userId: "u1",
    sourceId: opts.sourceId ?? "manual",
    provider: "manual",
    sourceType: "test",
    kind: opts.kind,
    receivedAt: opts.observedAt,
    observedAt: opts.observedAt,
    payload: opts.payload,
  } as unknown as RawEventDoc;
}

describe("useWorkoutsCalendarRange — kind-only pagination contract", () => {
  const day: DayKey = "2026-03-09";

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetIdToken.mockClear();
  });

  it("does not depend on generic raw-events ordering (unrelated items before workouts)", async () => {
    const resolveReady: { current: null | ((v: unknown) => void) } = { current: null };

    mockGetRawEvents.mockImplementation(async (_idToken: string, opts: AdapterGetRawEventsOpts) => {
      // Regression: if adapter ever calls the generic endpoint (no kind), this returns only unrelated events.
      if (!opts?.kind) {
        return {
          ok: true,
          status: 200,
          requestId: "rid-generic",
          json: {
            items: [{ id: "oura1" }],
            nextCursor: null,
          },
        };
      }

      if (opts.kind === "workout") {
        if (!opts.cursor) {
          return {
            ok: true,
            status: 200,
            requestId: "rid-workout-1",
            json: {
              items: [{ id: "w1" }],
              nextCursor: "c1",
            },
          };
        }
        return {
          ok: true,
          status: 200,
          requestId: "rid-workout-2",
          json: {
            items: [{ id: "w2" }],
            nextCursor: null,
          },
        };
      }

      if (opts.kind === "strength_workout") {
        return {
          ok: true,
          status: 200,
          requestId: "rid-strength",
          json: {
            items: [{ id: "s1" }],
            nextCursor: null,
          },
        };
      }

      return {
        ok: true,
        status: 200,
        requestId: "rid-unknown-kind",
        json: { items: [], nextCursor: null },
      };
    });

    mockGetRawEvent.mockImplementation(async (id: string, _idToken: string) => {
      void _idToken;
      if (id === "w1") {
        return {
          ok: true,
          status: 200,
          requestId: "rid-w1",
          json: mkRawEvent({
            id: "w1",
            kind: "workout",
            observedAt: "2026-03-09T08:00:00.000Z",
            sourceId: "manual",
            payload: {
              day,
              sport: "Run",
              start: "2026-03-09T08:00:00.000Z",
              end: "2026-03-09T09:00:00.000Z",
              timezone: "UTC",
              durationMinutes: 60,
              calories: 500,
            },
          }),
        };
      }
      if (id === "w2") {
        return {
          ok: true,
          status: 200,
          requestId: "rid-w2",
          json: mkRawEvent({
            id: "w2",
            kind: "workout",
            observedAt: "2026-03-09T10:00:00.000Z",
            sourceId: "manual",
            payload: {
              day,
              sport: "Walk",
              start: "2026-03-09T10:00:00.000Z",
              end: "2026-03-09T10:30:00.000Z",
              timezone: "UTC",
              durationMinutes: 30,
              calories: 200,
            },
          }),
        };
      }
      if (id === "s1") {
        // Put the strength workout on a different day so the range output is stable.
        return {
          ok: true,
          status: 200,
          requestId: "rid-s1",
          json: mkRawEvent({
            id: "s1",
            kind: "strength_workout",
            observedAt: "2026-03-10T08:00:00.000Z",
            sourceId: "apple_health",
            payload: {
              day: "2026-03-10",
              startedAt: "2026-03-10T18:00:00.000Z",
              timeZone: "UTC",
              exercises: [{ name: "Squat" }],
            },
          }),
        };
      }
      // Unrelated event returned by generic call.
      return {
        ok: true,
        status: 200,
        requestId: "rid-oura1",
        json: mkRawEvent({
          id: id,
          kind: "oura_raw",
          observedAt: "2026-03-09T01:00:00.000Z",
          sourceId: "oura",
          payload: {},
        }),
      };
    });

    const TestComp = () => {
      const range = useWorkoutsCalendarRange(day, day);
      useEffect(() => {
        if (range.status === "ready") resolveReady.current?.(range);
      }, [range.status]);
      return null;
    };

    const readyPromise = new Promise<unknown>((resolve) => {
      resolveReady.current = resolve;
    });

    await act(async () => {
      renderer.create(<TestComp />);
      // flush effects
      await Promise.resolve();
      await Promise.resolve();
    });

    const rangeState = (await readyPromise) as WorkoutCalendarRangeState;
    if (rangeState.status !== "ready") {
      throw new Error(`expected ready state, got ${rangeState.status}`);
    }
    expect(rangeState.days[0].day).toBe(day);
    expect(rangeState.days[0].workouts).toHaveLength(2);
    const titles = rangeState.days[0].workouts.map((w: WorkoutHistoryItem) => w.title).sort();
    expect(titles).toEqual(["Run", "Walk"]);
  });

  it("uses single-kind requests (no generic limit-only calls) and paginates via cursor", async () => {
    const resolveReady: { current: null | ((v: unknown) => void) } = { current: null };

    mockGetRawEvents.mockImplementation(async (_idToken: string, opts: AdapterGetRawEventsOpts) => {
      if (opts?.kind !== "workout") {
        return {
          ok: true,
          status: 200,
          requestId: "rid-unexpected-kind",
          json: { items: [], nextCursor: null },
        };
      }

      if (!opts.cursor) {
        return {
          ok: true,
          status: 200,
          requestId: "rid-workout-1",
          json: {
            items: [{ id: "w1" }],
            nextCursor: "c1",
          },
        };
      }

      return {
        ok: true,
        status: 200,
        requestId: "rid-workout-2",
        json: {
          items: [{ id: "w2" }],
          nextCursor: null,
        },
      };
    });

    mockGetRawEvent.mockImplementation(async (id: string, _idToken: string) => {
      void _idToken;
      return {
        ok: true,
        status: 200,
        requestId: "rid-any",
        json: mkRawEvent({
          id,
          kind: "workout",
          observedAt: "2026-03-09T09:00:00.000Z",
          payload: {
            day,
            sport: id === "w1" ? "Run" : "Walk",
            start: "2026-03-09T09:00:00.000Z",
            end: "2026-03-09T10:00:00.000Z",
            timezone: "UTC",
            durationMinutes: 60,
          },
        }),
      };
    });

    const TestComp = () => {
      const range = useWorkoutsCalendarRange(day, day, { includeStrengthWorkouts: false });
      useEffect(() => {
        if (range.status !== "partial") resolveReady.current?.(range);
      }, [range.status]);
      return null;
    };

    const readyPromise = new Promise<unknown>((resolve) => {
      resolveReady.current = resolve;
    });

    await act(async () => {
      renderer.create(<TestComp />);
      await Promise.resolve();
      await Promise.resolve();
    });

    const rangeState = (await readyPromise) as WorkoutCalendarRangeState;
    if (rangeState.status !== "ready") throw new Error(`expected ready state, got ${rangeState.status}`);
    expect(rangeState.days[0].workouts).toHaveLength(2);

    const callOpts = mockGetRawEvents.mock.calls.map((c) => c[1] as AdapterGetRawEventsOpts);
    expect(callOpts.length).toBeGreaterThanOrEqual(2);

    // Contract: every call must include a `kind` filter and observedAt window (server-side bound).
    expect(callOpts.every((o) => o.kind === "workout")).toBe(true);
    expect(callOpts.every((o) => typeof o.start === "string" && typeof o.end === "string")).toBe(true);
    expect(callOpts.every((o) => o.limit === WORKOUTS_CALENDAR_RAW_EVENTS_PAGE_SIZE)).toBe(true);
    // Pagination: second call must carry cursor from first response.
    expect(callOpts.some((o) => o.cursor === "c1")).toBe(true);

    // Also ensure strength kind never fetched when opted out.
    expect(callOpts.some((o) => o.kind === "strength_workout")).toBe(false);
  });
});

