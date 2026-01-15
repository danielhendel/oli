// services/functions/src/validation/__tests__/rawEvent.contract.test.ts
import { rawEventDocSchema } from "@oli/contracts";

describe("RawEvent contract (lib/contracts/rawEvent.ts)", () => {
  test("accepts a valid manual weight RawEvent doc", () => {
    const raw = {
      schemaVersion: 1 as const,
      id: "idem-key-123",
      userId: "user_123",

      // ✅ New required fields for Phase 1 replay safety
      idempotencyKey: "idem-key-123",
      fingerprintVersion: 1 as const,
      payloadHash: "a".repeat(64), // valid SHA-256 hex shape (test only)

      sourceId: "manual",
      provider: "manual",
      sourceType: "manual",
      kind: "weight" as const,

      receivedAt: "2025-01-01T00:00:00.000Z",
      observedAt: "2025-01-01T00:00:00.000Z",

      payload: {
        time: "2025-01-01T00:00:00.000Z",
        timezone: "UTC",
        weightKg: 80.2,
        bodyFatPercent: 12.3,
      },
    };

    const parsed = rawEventDocSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
  });

  test("rejects malformed payload for kind", () => {
    const raw = {
      schemaVersion: 1 as const,
      id: "idem-key-456",
      userId: "user_123",

      // ✅ New required fields for Phase 1 replay safety
      idempotencyKey: "idem-key-456",
      fingerprintVersion: 1 as const,
      payloadHash: "b".repeat(64),

      sourceId: "manual",
      provider: "manual",
      sourceType: "manual",
      kind: "weight" as const,

      receivedAt: "2025-01-01T00:00:00.000Z",
      observedAt: "2025-01-01T00:00:00.000Z",

      // ❌ weight payload is missing required weightKg
      payload: {
        time: "2025-01-01T00:00:00.000Z",
        timezone: "UTC",
      },
    };

    const parsed = rawEventDocSchema.safeParse(raw);
    expect(parsed.success).toBe(false);
  });
});
