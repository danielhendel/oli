// lib/contracts/__tests__/rawEvent.workoutSteps.test.ts
import { describe, it, expect } from "@jest/globals";
import { rawEventPayloadByKindSchemas } from "../rawEvent";

const baseWorkoutPayload = {
  start: "2025-01-01T18:00:00.000Z",
  end: "2025-01-01T19:00:00.000Z",
  timezone: "America/New_York",
  sport: "running",
  durationMinutes: 60,
};

describe("rawEvent.payload.workout — Phase 2A optional steps", () => {
  const schema = rawEventPayloadByKindSchemas.workout;

  it("accepts workout payload without steps (back-compat)", () => {
    const r = schema.safeParse(baseWorkoutPayload);
    expect(r.success).toBe(true);
  });

  it("accepts workout payload with optional finite non-negative steps", () => {
    const r = schema.safeParse({ ...baseWorkoutPayload, steps: 4500 });
    expect(r.success).toBe(true);
    if (r.success) {
      expect((r.data as { steps?: number }).steps).toBe(4500);
    }
  });

  it("accepts steps === 0 (zero is a real value, not missing)", () => {
    const r = schema.safeParse({ ...baseWorkoutPayload, steps: 0 });
    expect(r.success).toBe(true);
  });

  it("rejects negative steps", () => {
    const r = schema.safeParse({ ...baseWorkoutPayload, steps: -1 });
    expect(r.success).toBe(false);
  });

  it("rejects non-finite steps (NaN)", () => {
    const r = schema.safeParse({ ...baseWorkoutPayload, steps: Number.NaN });
    expect(r.success).toBe(false);
  });

  it("rejects non-finite steps (Infinity)", () => {
    const r = schema.safeParse({
      ...baseWorkoutPayload,
      steps: Number.POSITIVE_INFINITY,
    });
    expect(r.success).toBe(false);
  });

  it("rejects non-numeric steps (string)", () => {
    const r = schema.safeParse({ ...baseWorkoutPayload, steps: "4500" });
    expect(r.success).toBe(false);
  });
});
