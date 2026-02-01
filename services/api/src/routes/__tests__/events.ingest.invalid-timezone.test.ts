// services/api/src/routes/__tests__/events.ingest.invalid-timezone.test.ts
import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import express from "express";

const mockUserCollection = jest.fn();

// Step 8: API now writes failure memory using FieldValue.serverTimestamp()
jest.mock("firebase-admin/firestore", () => {
  return {
    FieldValue: {
      serverTimestamp: () => "__server_timestamp__",
    },
  };
});

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

type MockDocRef = {
  create: jest.Mock;
  get?: jest.Mock;
};

function makeMockCollection(): { doc: jest.Mock } & Record<string, unknown> {
  const create = jest.fn().mockResolvedValue(undefined);
  const doc = jest.fn((): MockDocRef => ({ create }));
  return { doc };
}

describe("POST /ingest - invalid/missing timezone", () => {
  beforeEach(() => {
    mockUserCollection.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("fails closed (400) with stable error code on invalid timezone, records failure memory, and does not attempt to write a RawEvent", async () => {
    // Arrange: userCollection("user_test_123","failures") is called.
    const failuresCol = makeMockCollection();

    mockUserCollection.mockImplementation((uid: unknown, colName: unknown) => {
      if (uid === "user_test_123" && colName === "failures") return failuresCol;
      // If rawEvents is mistakenly attempted, return a throwy stub
      if (uid === "user_test_123" && colName === "rawEvents") {
        return {
          doc: () => {
            throw new Error("RawEvents write should not be attempted for invalid timezone");
          },
        };
      }
      return makeMockCollection();
    });

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

      // ✅ Step 8: failure memory write attempted
      expect(mockUserCollection).toHaveBeenCalledWith("user_test_123", "failures");
      expect(failuresCol.doc).toHaveBeenCalledTimes(1);

      const docRef = failuresCol.doc.mock.results[0]?.value as MockDocRef | undefined;
      expect(docRef).toBeDefined();
      expect(docRef?.create).toHaveBeenCalledTimes(1);

      // ✅ Still: RawEvents write NOT attempted
      const calls = mockUserCollection.mock.calls;
      const calledRawEvents = calls.some((c) => c[0] === "user_test_123" && c[1] === "rawEvents");
      expect(calledRawEvents).toBe(false);
    } finally {
      server.close();
    }
  });

  it("fails closed (400) with stable error code on missing timezone, records failure memory, and does not attempt to write a RawEvent", async () => {
    const failuresCol = makeMockCollection();

    mockUserCollection.mockImplementation((uid: unknown, colName: unknown) => {
      if (uid === "user_test_123" && colName === "failures") return failuresCol;
      if (uid === "user_test_123" && colName === "rawEvents") {
        return {
          doc: () => {
            throw new Error("RawEvents write should not be attempted for missing timezone");
          },
        };
      }
      return makeMockCollection();
    });

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

      // ✅ Step 8: failure memory write attempted
      expect(mockUserCollection).toHaveBeenCalledWith("user_test_123", "failures");
      expect(failuresCol.doc).toHaveBeenCalledTimes(1);

      const docRef = failuresCol.doc.mock.results[0]?.value as MockDocRef | undefined;
      expect(docRef).toBeDefined();
      expect(docRef?.create).toHaveBeenCalledTimes(1);

      // ✅ Still: RawEvents write NOT attempted
      const calls = mockUserCollection.mock.calls;
      const calledRawEvents = calls.some((c) => c[0] === "user_test_123" && c[1] === "rawEvents");
      expect(calledRawEvents).toBe(false);
    } finally {
      server.close();
    }
  });
});
