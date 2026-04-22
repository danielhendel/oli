/**
 * POST /ingest — Apple Health workout idempotency keys suppressed after DELETE /ingest
 * must not recreate rawEvents (HealthKit re-sync resurrection).
 */
import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import express from "express";

const mockRawDocRef = {
  id: "appleHealth:v2:workout:start_end_50_com.example.app",
  get: jest.fn().mockResolvedValue({ exists: false }),
  create: jest.fn().mockResolvedValue(undefined),
};

const mockSuppressDocRef = {
  get: jest.fn().mockResolvedValue({ exists: true }),
};

const mockUserCollection = jest.fn((_uid: string, name: string) => {
  if (name === "rawEventIngestSuppressions") {
    return { doc: () => mockSuppressDocRef };
  }
  if (name === "rawEvents") {
    return { doc: () => mockRawDocRef };
  }
  return { doc: () => mockRawDocRef };
});

jest.mock("../../db", () => ({
  userCollection: (...args: unknown[]) => mockUserCollection(...args),
}));

function createIngestApp(): express.Express {
  const router = require("../events").default as express.Router;
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as unknown as { uid?: string }).uid = "user_suppress_1";
    next();
  });
  app.use("/ingest", router);
  return app;
}

describe("POST /ingest — Apple Health workout ingest suppression", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRawDocRef.get.mockResolvedValue({ exists: false });
    mockSuppressDocRef.get.mockResolvedValue({ exists: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns 202 with ingestSuppressed and does not create rawEvents when suppression exists", async () => {
    const app = createIngestApp();
    const server = app.listen(0);
    const addr = server.address();
    if (!addr || typeof addr === "string") {
      server.close();
      throw new Error("Failed to bind");
    }
    const idem =
      "appleHealth:v2:workout:2026-04-18T08:09:59.736-0400_2026-04-18T08:12:42.433-0400_50_com.myzonemoves.app.MYZONE";
    try {
      const res = await fetch(`http://127.0.0.1:${addr.port}/ingest`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": idem,
        },
        body: JSON.stringify({
          provider: "apple_health",
          sourceId: "healthkit",
          kind: "workout",
          observedAt: "2026-04-18T12:09:59.736Z",
          timeZone: "America/New_York",
          payload: {
            start: "2026-04-18T12:09:59.736Z",
            end: "2026-04-18T12:12:42.433Z",
            timezone: "America/New_York",
            sport: "Other",
            durationMinutes: 3,
            hk: { sourceId: "com.myzonemoves.app.MYZONE", activityId: 50 },
          },
        }),
      });
      expect(res.status).toBe(202);
      const json = (await res.json()) as {
        ok: boolean;
        ingestSuppressed?: boolean;
        idempotentReplay?: boolean;
        rawEventId: string;
      };
      expect(json.ok).toBe(true);
      expect(json.ingestSuppressed).toBe(true);
      expect(json.idempotentReplay).toBe(true);
      expect(json.rawEventId).toBe(idem);
      expect(mockRawDocRef.create).not.toHaveBeenCalled();
    } finally {
      server.close();
    }
  });
});
