// services/api/src/routes/__tests__/events.ingest.invalid-timezone.test.ts
import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import express from "express";

// Jest hoists jest.mock() calls, and the module factory cannot reference
// out-of-scope variables unless they are prefixed with "mock" (case-insensitive).
const mockUserCollection = jest.fn();

jest.mock("../../db", () => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userCollection: (...args: any[]) => mockUserCollection(...args),
  };
});

describe("POST /ingest - invalid/missing timezone", () => {
  beforeEach(() => {
    mockUserCollection.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("fails closed (400) with stable error code on invalid timezone and does not attempt to write a RawEvent", async () => {
    // Use CommonJS require to avoid Jest ESM/vm-modules requirement.
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
          observedAt: "2025-01-01T00:00:00.000Z",
          timeZone: "Not/AZone",
          payload: {
            start: "2025-01-01T00:00:00.000Z",
            end: "2025-01-01T01:00:00.000Z",
            timezone: "Not/AZone",
            totalMinutes: 60,
            isMainSleep: true,
          },
        }),
      });

      expect(res.status).toBe(400);

      const body = (await res.json()) as unknown;

      expect(body).toEqual(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: "TIMEZONE_INVALID",
          }),
        }),
      );

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
          observedAt: "2025-01-01T00:00:00.000Z",
          payload: {
            start: "2025-01-01T00:00:00.000Z",
            end: "2025-01-01T01:00:00.000Z",
            totalMinutes: 60,
            isMainSleep: true,
          },
        }),
      });

      expect(res.status).toBe(400);

      const body = (await res.json()) as unknown;

      expect(body).toEqual(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: "TIMEZONE_REQUIRED",
          }),
        }),
      );

      // ✅ Proof: no write attempt occurred (db userCollection never called)
      expect(mockUserCollection).not.toHaveBeenCalled();
    } finally {
      server.close();
    }
  });
});