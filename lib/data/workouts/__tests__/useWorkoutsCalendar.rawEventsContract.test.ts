import { describe, expect, it } from "@jest/globals";
import { rawEventsListQuerySchema } from "@oli/contracts";
import { WORKOUTS_CALENDAR_RAW_EVENTS_PAGE_SIZE } from "../workoutsCalendarApiConstants";
import { observedAtPadDaysForWorkoutCalendarRange } from "../workoutsCalendarObservedAtPad";
import {
  DEFAULT_WORKOUT_CALENDAR_RAW_EVENT_KINDS,
  resolveWorkoutCalendarRawEventKinds,
} from "../workoutsCalendarRawEventKinds";

describe("useWorkoutsCalendarRange → GET /users/me/raw-events", () => {
  it("uses a list limit accepted by rawEventsListQuerySchema (max 100)", () => {
    const ok = rawEventsListQuerySchema.safeParse({
      limit: WORKOUTS_CALENDAR_RAW_EVENTS_PAGE_SIZE,
    });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.limit).toBe(100);
  });

  it("rejects limit above schema max (regression: was 200 → HTTP 400 INVALID_QUERY)", () => {
    expect(rawEventsListQuerySchema.safeParse({ limit: 200 }).success).toBe(false);
  });

  it("calendar default kind set is workout + strength_workout", () => {
    expect(DEFAULT_WORKOUT_CALENDAR_RAW_EVENT_KINDS).toEqual(["workout", "strength_workout"]);
    expect(resolveWorkoutCalendarRawEventKinds(undefined)).toEqual(["workout", "strength_workout"]);
    expect(resolveWorkoutCalendarRawEventKinds({ rawEventKinds: ["workout"] })).toEqual(["workout"]);
  });

  it("accepts workout_title_override as raw-events kind filter", () => {
    const ok = rawEventsListQuerySchema.safeParse({
      kind: "workout_title_override",
      limit: 50,
    });
    expect(ok.success).toBe(true);
  });

  it("accepts includePayload=true for workout calendar hydrate (API query)", () => {
    const ok = rawEventsListQuerySchema.safeParse({
      limit: WORKOUTS_CALENDAR_RAW_EVENTS_PAGE_SIZE,
      includePayload: "true",
    });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.includePayload).toBe(true);
  });

  it("uses a wider observedAt pad for single-day hydrate than multi-day ranges", () => {
    expect(observedAtPadDaysForWorkoutCalendarRange("2026-01-15", "2026-01-15")).toBe(150);
    expect(observedAtPadDaysForWorkoutCalendarRange("2026-01-15", "2026-01-16")).toBe(21);
  });
});
