import { describe, it, expect } from "@jest/globals";
import { canonicalEventsListQuerySchema } from "../retrieval";

describe("canonicalEventsListQuerySchema limit", () => {
  it("accepts limit up to 500", () => {
    const parsed = canonicalEventsListQuerySchema.safeParse({
      kinds: "nutrition",
      limit: "500",
      start: "2026-01-31",
      end: "2026-05-01",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error(parsed.error.message);
    expect(parsed.data.limit).toBe(500);
  });

  it("rejects limit above 500", () => {
    const parsed = canonicalEventsListQuerySchema.safeParse({ limit: "501" });
    expect(parsed.success).toBe(false);
  });
});
