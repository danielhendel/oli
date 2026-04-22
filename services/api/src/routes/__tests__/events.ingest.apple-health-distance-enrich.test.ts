/**
 * Idempotent replay enriches existing apple_health workout raw docs with distanceMeters
 * when the client re-sends the same Idempotency-Key (historical backfill replay).
 */
import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import express from "express";

const mockUpdate = jest.fn().mockResolvedValue(undefined);
const mockDocRef = {
  id: "appleHealth:v2:workout:idem_run_1",
  get: jest.fn(),
  create: jest.fn(),
  update: mockUpdate,
};
const mockColRef = {
  doc: jest.fn(() => mockDocRef),
};

const mockSuppressDocRef = {
  get: jest.fn().mockResolvedValue({ exists: false }),
  set: jest.fn().mockResolvedValue(undefined),
};
const mockSuppressColRef = {
  doc: jest.fn(() => mockSuppressDocRef),
};

jest.mock("../../db", () => ({
  userCollection: (...args: unknown[]) => {
    if (args[1] === "rawEvents") return mockColRef;
    if (args[1] === "rawEventIngestSuppressions") return mockSuppressColRef;
    return {};
  },
}));

function createIngestApp(): express.Express {
  const router = require("../events").default as express.Router;
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as unknown as { uid?: string }).uid = "user_apple_enrich";
    next();
  });
  app.use("/ingest", router);
  return app;
}

const existingDoc = {
  schemaVersion: 1,
  id: "appleHealth:v2:workout:idem_run_1",
  userId: "user_apple_enrich",
  sourceId: "healthkit",
  sourceType: "manual",
  provider: "apple_health",
  kind: "workout",
  receivedAt: "2025-01-01T00:00:00.000Z",
  observedAt: "2025-01-01T10:00:00.000Z",
  payload: {
    start: "2025-01-01T10:00:00.000Z",
    end: "2025-01-01T11:00:00.000Z",
    timezone: "America/New_York",
    sport: "Running",
    durationMinutes: 60,
  },
};

describe("POST /ingest — apple_health workout distance enrichment on idempotent replay", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDocRef.create.mockRejectedValue(new Error("ALREADY_EXISTS"));
    mockDocRef.get.mockResolvedValue({
      exists: true,
      data: () => existingDoc,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("updates payload.distanceMeters when replay adds distance to legacy doc", async () => {
    const app = createIngestApp();
    const server = app.listen(0);
    const addr = server.address();
    if (!addr || typeof addr === "string") {
      server.close();
      throw new Error("Failed to bind");
    }

    try {
      const res = await fetch(`http://127.0.0.1:${addr.port}/ingest`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": "appleHealth:v2:workout:idem_run_1",
        },
        body: JSON.stringify({
          provider: "apple_health",
          sourceId: "healthkit",
          kind: "workout",
          observedAt: "2025-01-01T10:00:00.000Z",
          timeZone: "America/New_York",
          payload: {
            start: "2025-01-01T10:00:00.000Z",
            end: "2025-01-01T11:00:00.000Z",
            timezone: "America/New_York",
            sport: "Running",
            durationMinutes: 60,
            distanceMeters: 1609.344,
          },
        }),
      });

      expect(res.status).toBe(202);
      const json = (await res.json()) as {
        ok: boolean;
        idempotentReplay?: boolean;
        payloadEnriched?: boolean;
      };
      expect(json.ok).toBe(true);
      expect(json.idempotentReplay).toBe(true);
      expect(json.payloadEnriched).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({
        payload: expect.objectContaining({ distanceMeters: 1609.344 }),
      });
    } finally {
      server.close();
    }
  });

  it("does not call update on replay when distance already present", async () => {
    mockDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        ...existingDoc,
        payload: { ...existingDoc.payload, distanceMeters: 100 },
      }),
    });

    const app = createIngestApp();
    const server = app.listen(0);
    const addr = server.address();
    if (!addr || typeof addr === "string") {
      server.close();
      throw new Error("Failed to bind");
    }

    try {
      const res = await fetch(`http://127.0.0.1:${addr.port}/ingest`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": "appleHealth:v2:workout:idem_run_1",
        },
        body: JSON.stringify({
          provider: "apple_health",
          sourceId: "healthkit",
          kind: "workout",
          observedAt: "2025-01-01T10:00:00.000Z",
          timeZone: "America/New_York",
          payload: {
            start: "2025-01-01T10:00:00.000Z",
            end: "2025-01-01T11:00:00.000Z",
            timezone: "America/New_York",
            sport: "Running",
            durationMinutes: 60,
            distanceMeters: 1609.344,
          },
        }),
      });

      expect(res.status).toBe(202);
      const json = (await res.json()) as { payloadEnriched?: boolean };
      expect(json.payloadEnriched).toBeUndefined();
      expect(mockUpdate).not.toHaveBeenCalled();
    } finally {
      server.close();
    }
  });
});
