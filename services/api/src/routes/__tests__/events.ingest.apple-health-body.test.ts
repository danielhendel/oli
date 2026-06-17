/**
 * POST /ingest — Apple Health body weight + body_composition shapes (RawEvent contract).
 */
import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import express from "express";

const mockDocRef = {
  id: "idem_ah_body",
  get: jest.fn().mockResolvedValue({ exists: false }),
  create: jest.fn().mockResolvedValue(undefined),
};
const mockColRef = {
  doc: jest.fn(() => mockDocRef),
};

const mockUserCollection = jest.fn((_uid: string, name: string) => {
  if (name === "rawEvents") return mockColRef;
  if (name === "rawEventIngestSuppressions") {
    return {
      doc: () => ({
        get: jest.fn().mockResolvedValue({ exists: false }),
      }),
    };
  }
  return {};
});

jest.mock("../../db", () => ({
  userCollection: (...args: unknown[]) => mockUserCollection(...args),
}));

function createIngestApp(): express.Express {
  const router = require("../events").default as express.Router;
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as unknown as { uid?: string }).uid = "user_ah_body";
    next();
  });
  app.use("/ingest", router);
  return app;
}

describe("POST /ingest — Apple Health body", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDocRef.get.mockResolvedValue({ exists: false });
    mockDocRef.create.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("accepts apple_health weight with payload matching RawEvent contract", async () => {
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
          "Idempotency-Key": "appleHealth:v2:bodyWeight:2026-03-30T12:00:00.000Z_apple_watch",
        },
        body: JSON.stringify({
          provider: "apple_health",
          sourceId: "apple_health",
          kind: "weight",
          observedAt: "2026-03-30T12:00:00.000Z",
          timeZone: "America/Los_Angeles",
          payload: {
            time: "2026-03-30T12:00:00.000Z",
            timezone: "America/Los_Angeles",
            weightKg: 80.4,
            bodyFatPercent: 17.1,
          },
        }),
      });
      expect(res.status).toBe(202);
      expect(mockDocRef.create).toHaveBeenCalledTimes(1);
    } finally {
      server.close();
    }
  });

  it("accepts apple_health body_composition with partial metrics (BMI only)", async () => {
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
          "Idempotency-Key": "appleHealth:v2:bodyComposition:bmi:2026-03-30T12:00:00.000Z_apple_watch",
        },
        body: JSON.stringify({
          provider: "apple_health",
          sourceId: "apple_health",
          kind: "body_composition",
          observedAt: "2026-03-30T12:00:00.000Z",
          timeZone: "America/Los_Angeles",
          payload: {
            time: "2026-03-30T12:00:00.000Z",
            timezone: "America/Los_Angeles",
            bmi: 24.2,
          },
        }),
      });
      expect(res.status).toBe(202);
      expect(mockDocRef.create).toHaveBeenCalledTimes(1);
    } finally {
      server.close();
    }
  });

  it("rejects body_composition payload with no metrics", async () => {
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
          "Idempotency-Key": "idem_empty_body_comp",
        },
        body: JSON.stringify({
          provider: "apple_health",
          sourceId: "apple_health",
          kind: "body_composition",
          observedAt: "2026-03-30T12:00:00.000Z",
          timeZone: "America/Los_Angeles",
          payload: {
            time: "2026-03-30T12:00:00.000Z",
            timezone: "America/Los_Angeles",
          },
        }),
      });
      expect(res.status).toBe(400);
      expect(mockDocRef.create).not.toHaveBeenCalled();
    } finally {
      server.close();
    }
  });
});
