import { describe, expect, it } from "@jest/globals";
import { rawEventsListQuerySchema } from "@oli/contracts";
import { WORKOUTS_CALENDAR_RAW_EVENTS_PAGE_SIZE } from "../workoutsCalendarApiConstants";
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

  it("accepts includePayload=true for workout calendar hydrate (API query)", () => {
    const ok = rawEventsListQuerySchema.safeParse({
      limit: WORKOUTS_CALENDAR_RAW_EVENTS_PAGE_SIZE,
      includePayload: "true",
    });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.includePayload).toBe(true);
  });
});
