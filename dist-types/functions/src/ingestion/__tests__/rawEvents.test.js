// services/functions/src/ingestion/__tests__/rawEvents.test.ts
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { ingestRawEvent } from "../rawEvents";
// We'll store the last RawEvent passed into set() so we can assert on it.
let lastSavedRawEvent = null;
// Mock the Firestore collection helper so we don't touch real Firestore.
jest.mock("../../db/collections", () => {
    return {
        userRawEventsCol: jest.fn(() => {
            return {
                doc: () => ({
                    id: "generated-id",
                    set: async (data) => {
                        lastSavedRawEvent = data;
                    }
                })
            };
        })
    };
});
describe("ingestRawEvent", () => {
    beforeEach(() => {
        lastSavedRawEvent = null;
    });
    it("creates and persists a RawEvent with deterministic receivedAt", async () => {
        const fixedNow = new Date("2025-01-02T03:04:05.000Z");
        const result = await ingestRawEvent({
            userId: "user-123",
            sourceId: "source-abc",
            sourceType: "manual",
            provider: "mobile_app",
            kind: "workout",
            observedAt: "2025-01-01T06:30:00.000Z",
            payload: { durationMinutes: 60 }
        }, {
            now: () => fixedNow
        });
        expect(lastSavedRawEvent).not.toBeNull();
        const saved = lastSavedRawEvent;
        expect(result).toEqual(saved);
        expect(saved.id).toBe("generated-id");
        expect(saved.userId).toBe("user-123");
        expect(saved.sourceId).toBe("source-abc");
        expect(saved.sourceType).toBe("manual");
        expect(saved.provider).toBe("mobile_app");
        expect(saved.kind).toBe("workout");
        expect(saved.observedAt).toBe("2025-01-01T06:30:00.000Z");
        expect(saved.payload).toEqual({ durationMinutes: 60 });
        expect(saved.schemaVersion).toBe(1);
        // Deterministic receivedAt
        expect(saved.receivedAt).toBe(fixedNow.toISOString());
    });
    it("throws on invalid observedAt timestamp", async () => {
        await expect(ingestRawEvent({
            userId: "user-123",
            sourceId: "source-abc",
            sourceType: "manual",
            provider: "mobile_app",
            kind: "sleep",
            observedAt: "not-a-timestamp",
            payload: {}
        })).rejects.toThrow("Invalid observedAt");
    });
});
