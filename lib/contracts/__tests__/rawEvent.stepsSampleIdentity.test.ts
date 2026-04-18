import { describe, it, expect } from "@jest/globals";
import { rawEventDocSchema } from "../rawEvent";

describe("rawEventDocSchema — steps sample identity (additive)", () => {
  it("accepts optional sourceSampleId, sampleId, and sourceUUID on steps payload", () => {
    const doc = {
      schemaVersion: 1,
      id: "test-steps-1",
      userId: "u1",
      sourceId: "apple_health",
      provider: "apple_health",
      sourceType: "mobile_app",
      kind: "steps",
      receivedAt: "2026-04-01T12:00:00.000Z",
      observedAt: "2026-04-01T12:00:00.000Z",
      payload: {
        start: "2026-04-01T04:00:00.000Z",
        end: "2026-04-02T03:59:59.999Z",
        timezone: "America/New_York",
        steps: 5000,
        sampleId: "hk-uuid-42",
        sourceSampleId: "preferred-id",
      },
    };

    const parsed = rawEventDocSchema.safeParse(doc);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const p = parsed.data.payload as { sampleId?: string; sourceSampleId?: string };
    expect(p.sourceSampleId).toBe("preferred-id");
    expect(p.sampleId).toBe("hk-uuid-42");
  });
});
