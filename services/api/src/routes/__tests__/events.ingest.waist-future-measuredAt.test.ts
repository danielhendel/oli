// services/api/src/routes/__tests__/events.ingest.waist-future-measuredAt.test.ts
import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import express from "express";

const mockUserCollection = jest.fn();

jest.mock("../../db", () => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userCollection: (...args: any[]) => mockUserCollection(...args),
  };
});

jest.mock("../../lib/writeFailure", () => ({
  writeFailure: jest.fn().mockResolvedValue({ id: "mock-failure-id" }),
}));

describe("POST /ingest — manual waist future measuredAt", () => {
  beforeEach(() => {
    mockUserCollection.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("rejects future observedAt with WAIST_MEASURED_AT_IN_FUTURE and does not persist", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const router = require("../events").default as express.Router;

    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as unknown as { uid?: string }).uid = "user_test_waist";
      next();
    });
    app.use("/ingest", router);

    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === "string") {
      server.close();
      throw new Error("Failed to bind test server");
    }

    const futureIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    try {
      const res = await fetch(`http://127.0.0.1:${address.port}/ingest`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": "idem_waist_future_measuredAt",
        },
        body: JSON.stringify({
          provider: "manual",
          kind: "body_composition",
          observedAt: futureIso,
          timeZone: "UTC",
          payload: {
            time: futureIso,
            timezone: "UTC",
            waistCircumferenceCm: 80,
            protocolId: "who_midpoint_v1",
            protocolVersion: 1,
          },
        }),
      });

      expect(res.status).toBe(400);
      const body = (await res.json()) as {
        ok: boolean;
        error: { code: string; message: string };
      };
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe("WAIST_MEASURED_AT_IN_FUTURE");
      // Safe error: no waist value echoed
      expect(JSON.stringify(body)).not.toMatch(/80/);
      expect(mockUserCollection).not.toHaveBeenCalled();
    } finally {
      server.close();
    }
  });
});
