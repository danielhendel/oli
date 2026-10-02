import { describe, it, expect } from "@jest/globals";
import { rawEventPayloadByKindSchemas } from "../rawEvent";

const base = {
  time: "2026-09-20T12:00:00.000Z",
  timezone: "America/New_York",
};

describe("rawEvent.payload.body_composition — waist circumference", () => {
  const schema = rawEventPayloadByKindSchemas.body_composition;

  it("accepts waist-only payload with WHO protocol", () => {
    const r = schema.safeParse({
      ...base,
      waistCircumferenceCm: 82.5,
      protocolId: "who_midpoint_v1",
      protocolVersion: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.waistCircumferenceCm).toBe(82.5);
      expect(r.data.protocolId).toBe("who_midpoint_v1");
      expect(r.data.protocolVersion).toBe(1);
    }
  });

  it("accepts waist-only without protocol (optional)", () => {
    const r = schema.safeParse({
      ...base,
      waistCircumferenceCm: 80,
    });
    expect(r.success).toBe(true);
  });

  it("rejects non-positive waistCircumferenceCm", () => {
    expect(schema.safeParse({ ...base, waistCircumferenceCm: 0 }).success).toBe(false);
    expect(schema.safeParse({ ...base, waistCircumferenceCm: -1 }).success).toBe(false);
  });

  it("rejects empty payload (no metrics)", () => {
    expect(schema.safeParse(base).success).toBe(false);
  });

  it("rejects invalid protocolId", () => {
    const r = schema.safeParse({
      ...base,
      waistCircumferenceCm: 80,
      protocolId: "not_a_protocol",
    });
    expect(r.success).toBe(false);
  });
});
