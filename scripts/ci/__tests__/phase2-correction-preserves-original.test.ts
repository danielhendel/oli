/**
 * Phase 2 proof test — Correcting an incomplete event does not remove original uncertainty history.
 *
 * Proves:
 * - When user corrects/resolves an incomplete event, the original record remains
 * - Correction creates a NEW raw event with correctionOfRawEventId + provenance "correction"
 * - Original incomplete event is never overwritten or deleted
 */
import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import express from "express";

const createdDocs: Record<string, unknown> = {};

const mockUserCollection = jest.fn((_uid: string, name: string) => {
  if (name === "rawEvents") {
    return {
      doc: (id: string) => ({
        id,
        get: jest.fn().mockResolvedValue({ exists: false }),
        create: jest.fn().mockImplementation((data: unknown) => {
          createdDocs[id] = data;
          return Promise.resolve();
        }),
      }),
    };
  }
  return {};
});

jest.mock("../../../services/api/src/db", () => ({
  userCollection: (...args: unknown[]) => mockUserCollection(...args),
}));

describe("Phase 2 proof: correction preserves original uncertainty history", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(createdDocs).forEach((k) => delete createdDocs[k]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("ingest with correctionOfRawEventId creates new event; original incomplete remains", async () => {
    const eventsRouter = require("../../../services/api/src/routes/events").default;
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as unknown as { uid: string }).uid = "user_proof";
      next();
    });
    app.use("/ingest", eventsRouter);

    const server = app.listen(0);
    const addr = server.address();
    if (!addr || typeof addr === "string") {
      server.close();
      throw new Error("Failed to bind");
    }

    const originalRawId = "raw_incomplete_123";

    try {
      const res = await fetch(`http://127.0.0.1:${addr.port}/ingest`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": "correction_proof_1",
        },
        body: JSON.stringify({
          provider: "manual",
          kind: "weight",
          observedAt: "2025-01-15T12:00:00.000Z",
          timeZone: "America/New_York",
          payload: {
            time: "2025-01-15T12:00:00.000Z",
            timezone: "America/New_York",
            weightKg: 75,
          },
          provenance: "correction",
          correctionOfRawEventId: originalRawId,
        }),
      });

      expect(res.status).toBe(202);

      const written = createdDocs["correction_proof_1"] as Record<string, unknown>;
      expect(written).toBeDefined();
      expect(written.provenance).toBe("correction");
      expect(written.correctionOfRawEventId).toBe(originalRawId);
      expect(written.kind).toBe("weight");

      // Correction creates NEW doc; original is never overwritten (no write to originalRawId)
      expect(createdDocs[originalRawId]).toBeUndefined();
    } finally {
      server.close();
    }
  });
});
