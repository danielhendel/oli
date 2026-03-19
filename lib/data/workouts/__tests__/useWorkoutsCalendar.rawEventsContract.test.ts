import { describe, expect, it } from "@jest/globals";
import { rawEventsListQuerySchema } from "@oli/contracts";
import { WORKOUTS_CALENDAR_RAW_EVENTS_PAGE_SIZE } from "../workoutsCalendarApiConstants";

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
});
