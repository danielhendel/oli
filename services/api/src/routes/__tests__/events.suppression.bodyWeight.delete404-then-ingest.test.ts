/**
 * End-to-end for Apple Health body weight id: DELETE 404 records suppression,
 * then POST /ingest with same Idempotency-Key must not call rawEvents create().
 */
import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import express from "express";

const TARGET_ID = "appleHealth:v2:bodyWeight:2026-06-06T14:30:00.000Z_apple_watch";

const mockRawDocRef = {
  get: jest.fn(),
  create: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
};

const suppressSetMock = jest.fn().mockResolvedValue(undefined);
const suppressGetMock = jest.fn();

const mockUserCollection = jest.fn((_uid: string, name: string) => {
  if (name === "rawEventIngestSuppressions") {
    return {
      doc: () => ({
        set: suppressSetMock,
        get: suppressGetMock,
      }),
    };
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
    (req as unknown as { uid?: string }).uid = "user_body_weight_audit";
    next();
  });
  app.use("/ingest", router);
  return app;
}

describe("Apple Health body weight suppression — DELETE 404 then POST exact id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRawDocRef.get.mockResolvedValue({ exists: false });
    suppressGetMock.mockResolvedValue({ exists: false });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("DELETE 404 writes suppression doc; POST then returns ingestSuppressed without create", async () => {
    const app = createIngestApp();
    const server = app.listen(0);
    const addr = server.address();
    if (!addr || typeof addr === "string") {
      server.close();
      throw new Error("Failed to bind");
    }
    try {
      const delRes = await fetch(
        `http://127.0.0.1:${addr.port}/ingest/${encodeURIComponent(TARGET_ID)}`,
        { method: "DELETE" },
      );
      expect(delRes.status).toBe(404);
      expect(suppressSetMock).toHaveBeenCalledTimes(1);
      const delJson = (await delRes.json()) as { suppressionWritten?: boolean; error?: { code: string } };
      expect(delJson.suppressionWritten).toBe(true);
      expect(delJson.error?.code).toBe("NOT_FOUND");

      suppressGetMock.mockResolvedValue({ exists: true });

      const postRes = await fetch(`http://127.0.0.1:${addr.port}/ingest`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": TARGET_ID,
        },
        body: JSON.stringify({
          provider: "apple_health",
          sourceId: "healthkit",
          kind: "weight",
          observedAt: "2026-06-06T14:30:00.000Z",
          timeZone: "America/New_York",
          payload: {
            time: "2026-06-06T14:30:00.000Z",
            timezone: "America/New_York",
            weightKg: 72.8931,
          },
        }),
      });
      expect(postRes.status).toBe(202);
      const json = (await postRes.json()) as { ingestSuppressed?: boolean; idempotentReplay?: boolean };
      expect(json.ingestSuppressed).toBe(true);
      expect(json.idempotentReplay).toBe(true);
      expect(mockRawDocRef.create).not.toHaveBeenCalled();
    } finally {
      server.close();
    }
  });
});
