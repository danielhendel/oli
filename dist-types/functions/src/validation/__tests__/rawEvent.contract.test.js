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
                bodyFatPercent: 12.3
            }
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
                steps: 1000
            }
        };
        const parsed = rawEventDocSchema.safeParse(raw);
        expect(parsed.success).toBe(false);
    });
});
