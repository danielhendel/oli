// services/functions/src/validation/__tests__/rawEvent.contract.test.ts
import { rawEventDocSchema } from "@oli/contracts";

describe("RawEvent contract (lib/contracts/rawEvent.ts)", () => {
  test("accepts a valid manual weight RawEvent doc", () => {
    const raw = {
      schemaVersion: 1,
      id: "abc123",
      userId: "user_1",
      sourceId: "manual",
      provider: "manual",
      sourceType: "manual",
      kind: "weight",
      receivedAt: "2025-01-02T00:00:00.000Z",
      observedAt: "2025-01-02T00:00:00.000Z",
      payload: {
        time: "2025-01-02T00:00:00.000Z",
        timezone: "America/New_York",
        weightKg: 80.5,
        bodyFatPercent: 12.3,
      },
    };

    const parsed = rawEventDocSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
  });

  test('accepts a valid file RawEvent doc (no parsing)', () => {
    const raw = {
      schemaVersion: 1,
      id: "file_evt_1",
      userId: "user_1",
      sourceId: "upload",
      provider: "manual",
      sourceType: "manual",
      kind: "file",
      receivedAt: "2025-01-02T00:00:00.000Z",
      observedAt: "2025-01-02T00:00:00.000Z",
      payload: {
        storageBucket: "oli-staging-uploads",
        storagePath: "uploads/user_1/abcdef1234567890/test.pdf",
        sha256: "abcdef1234567890",
        sizeBytes: 12345,
        mimeType: "application/pdf",
        originalFilename: "test.pdf",
      },
    };

    const parsed = rawEventDocSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
  });

  test("accepts a valid Phase 2 incomplete RawEvent doc", () => {
    const raw = {
      schemaVersion: 1,
      id: "incomplete_1",
      userId: "user_1",
      sourceId: "manual",
      provider: "manual",
      sourceType: "manual",
      kind: "incomplete",
      receivedAt: "2025-02-09T18:00:00.000Z",
      observedAt: "2025-01-15T12:00:00.000Z",
      payload: {},
      uncertaintyState: "incomplete",
    };

    const parsed = rawEventDocSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
  });

  test("rejects malformed payload for kind", () => {
    const raw = {
      schemaVersion: 1,
      id: "abc123",
      userId: "user_1",
      sourceId: "manual",
      provider: "manual",
      sourceType: "manual",
      kind: "weight",
      receivedAt: "2025-01-02T00:00:00.000Z",
      observedAt: "2025-01-02T00:00:00.000Z",
      payload: {
        start: "2025-01-02T00:00:00.000Z",
        end: "2025-01-02T01:00:00.000Z",
        timezone: "America/New_York",
        steps: 1000,
      },
    };

    const parsed = rawEventDocSchema.safeParse(raw);
    expect(parsed.success).toBe(false);
  });
});
