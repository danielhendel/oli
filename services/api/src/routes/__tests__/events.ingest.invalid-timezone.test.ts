// services/api/src/routes/__tests__/events.ingest.invalid-timezone.test.ts
import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import express from "express";

const mockUserCollection = jest.fn();

jest.mock("../../db", () => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userCollection: (...args: unknown[]) => mockUserCollection(...args),
  };
});

type JsonObject = Record<string, unknown>;

function isJsonObject(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null;
}

describe("POST /ingest - invalid/missing timezone", () => {
  beforeEach(() => {
    mockUserCollection.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("fails closed (400) with stable error code on invalid timezone and does not attempt to write a RawEvent", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const router = require("../events").default as express.Router;

    const app = express();
    app.use(express.json());

    // Minimal auth shim: route requires req.uid
    app.use((req, _res, next) => {
      (req as unknown as { uid?: string }).uid = "user_test_123";
      next();
    });

    app.use("/ingest", router);

    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === "string") {
      server.close();
      throw new Error("Failed to bind test server");
    }

    const url = `http://127.0.0.1:${address.port}/ingest`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": "idem_test_invalid_tz",
        },
        body: JSON.stringify({
          provider: "manual",
          kind: "sleep",
          schemaVersion: 1,
          sourceId: "src_manual_api",
          observedAt: "2025-01-01T00:00:00.000Z",
          timeZone: "Not/AZone",
          payload: { any: "opaque" },
        }),
      });

      expect(res.status).toBe(400);

      const body: unknown = await res.json();
      expect(isJsonObject(body)).toBe(true);
      if (!isJsonObject(body)) throw new Error("Expected JSON object");

      const error = body["error"];
      expect(isJsonObject(error)).toBe(true);
      if (!isJsonObject(error)) throw new Error("Expected error object");

      expect(error["code"]).toBe("TIMEZONE_INVALID");

      // ✅ Proof: no write attempt occurred (db userCollection never called)
      expect(mockUserCollection).not.toHaveBeenCalled();
    } finally {
      server.close();
    }
  });

  it("fails closed (400) with stable error code on missing timezone and does not attempt to write a RawEvent", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const router = require("../events").default as express.Router;

    const app = express();
    app.use(express.json());

    app.use((req, _res, next) => {
      (req as unknown as { uid?: string }).uid = "user_test_123";
      next();
    });

    app.use("/ingest", router);

    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === "string") {
      server.close();
      throw new Error("Failed to bind test server");
    }

    const url = `http://127.0.0.1:${address.port}/ingest`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": "idem_test_missing_tz",
        },
        body: JSON.stringify({
          provider: "manual",
          kind: "sleep",
          schemaVersion: 1,
          sourceId: "src_manual_api",
          observedAt: "2025-01-01T00:00:00.000Z",
          payload: { any: "opaque" },
        }),
      });

      expect(res.status).toBe(400);

      const body: unknown = await res.json();
      expect(isJsonObject(body)).toBe(true);
      if (!isJsonObject(body)) throw new Error("Expected JSON object");

      const error = body["error"];
      expect(isJsonObject(error)).toBe(true);
      if (!isJsonObject(error)) throw new Error("Expected error object");

      expect(error["code"]).toBe("TIMEZONE_REQUIRED");

      // ✅ Proof: no write attempt occurred (db userCollection never called)
      expect(mockUserCollection).not.toHaveBeenCalled();
    } finally {
      server.close();
    }
  });
});
