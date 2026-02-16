import { eventSchema } from "../src/types/events";

describe("events.ingest validation", () => {
  it("event schema validates minimal payload", () => {
    const ok = eventSchema.safeParse({
      type: "workout.setCompleted",
      source: "mobile.v1",
      timestamp: new Date().toISOString(),
      data: { reps: 8, weight: 135 },
    });
    expect(ok.success).toBe(true);
  });

  it("event schema rejects missing fields", () => {
    const bad = eventSchema.safeParse({ type: "", source: "", timestamp: "nope" });
    expect(bad.success).toBe(false);
  });
});
