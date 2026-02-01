// services/api/src/routes/__tests__/usersMe.failures.test.ts
/**
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import express from "express";

type JsonObject = Record<string, unknown>;
function isJsonObject(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null;
}

type FakeDoc = {
  id: string;
  data: () => unknown;
  exists?: boolean;
  ref?: { path: string };
};

type FakeQuerySnapshot = {
  docs: FakeDoc[];
};

type FakeQuery = {
  where: jest.Mock;
  orderBy: jest.Mock;
  limit: jest.Mock;
  startAfter: jest.Mock;
  get: jest.Mock<() => Promise<FakeQuerySnapshot>>;
};

const mockQuery: FakeQuery = {
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  get: jest.fn(),
};

const mockUserCollection = jest.fn();

jest.mock("../../db", () => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userCollection: (...args: unknown[]) => mockUserCollection(...args),
  };
});

describe("GET /users/me/failures (Step 8)", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Make query chainable
    mockQuery.where.mockImplementation(() => mockQuery);
    mockQuery.orderBy.mockImplementation(() => mockQuery);
    mockQuery.limit.mockImplementation(() => mockQuery);
    mockQuery.startAfter.mockImplementation(() => mockQuery);

    // userCollection(uid, "failures") returns the query object
    mockUserCollection.mockImplementation((_uid: unknown, collection: unknown) => {
      if (collection === "failures") return mockQuery;
      throw new Error(`Unexpected collection in test: ${String(collection)}`);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function makeApp(): express.Express {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const router = require("../usersMe").default as express.Router;

    const app = express();
    app.use(express.json());

    // Minimal auth shim: route requires req.uid
    app.use((req, _res, next) => {
      (req as unknown as { uid?: string }).uid = "user_test_123";
      next();
    });

    app.use("/users/me", router);
    return app;
  }

  // Firestore Timestamp-like object used by schema validator:
  // must provide both toMillis() and toDate().
  function makeTimestamp(ms: number): { toMillis: () => number; toDate: () => Date } {
    return {
      toMillis: () => ms,
      toDate: () => new Date(ms),
    };
  }

  it("returns 200 with items + nextCursor and uses deterministic ordering", async () => {
    const app = makeApp();

    mockQuery.get.mockResolvedValueOnce({
      docs: [
        {
          id: "f_1",
          ref: { path: "users/user_test_123/failures/f_1" },
          data: () => ({
            userId: "user_test_123",
            type: "NORMALIZATION_FAILED",
            code: "MALFORMED_PAYLOAD",
            message: "Normalization mapping failed; canonical event not produced.",
            day: "2026-01-01",
            createdAt: makeTimestamp(1704067200000), // 2024-01-01T00:00:00.000Z
          }),
        },
      ],
    });

    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === "string") {
      server.close();
      throw new Error("Failed to bind test server");
    }

    const url = `http://127.0.0.1:${address.port}/users/me/failures?day=2026-01-01&limit=1`;

    try {
      const res = await fetch(url);
      expect(res.status).toBe(200);

      const body: unknown = await res.json();
      expect(isJsonObject(body)).toBe(true);
      if (!isJsonObject(body)) throw new Error("Expected JSON object");

      expect(Array.isArray(body["items"])).toBe(true);
      const items = body["items"] as unknown[];
      expect(items.length).toBe(1);

      const first = items[0];
      expect(isJsonObject(first)).toBe(true);
      if (!isJsonObject(first)) throw new Error("Expected first item object");

      expect(first["id"]).toBe("f_1");
      expect(first["type"]).toBe("NORMALIZATION_FAILED");
      expect(first["code"]).toBe("MALFORMED_PAYLOAD");
      expect(first["day"]).toBe("2026-01-01");

      // ✅ Step 8 read surface: ISO string (not createdAtMs)
      expect(first["createdAt"]).toBe("2024-01-01T00:00:00.000Z");

      // nextCursor should be a base64url string if there is a last doc
      expect(typeof body["nextCursor"]).toBe("string");

      // Ensure query ordering used for stable pagination
      expect(mockQuery.where).toHaveBeenCalledWith("day", "==", "2026-01-01");
      expect(mockQuery.orderBy).toHaveBeenCalledWith("createdAt", "asc");
      expect(mockQuery.orderBy).toHaveBeenCalledWith("__name__", "asc");
      expect(mockQuery.limit).toHaveBeenCalledWith(1);
    } finally {
      server.close();
    }
  });

  it("returns 400 INVALID_CURSOR when cursor is invalid (fail-closed)", async () => {
    const app = makeApp();

    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === "string") {
      server.close();
      throw new Error("Failed to bind test server");
    }

    const url = `http://127.0.0.1:${address.port}/users/me/failures?day=2026-01-01&cursor=not-a-valid-cursor`;

    try {
      const res = await fetch(url);
      expect(res.status).toBe(400);

      const body: unknown = await res.json();
      expect(isJsonObject(body)).toBe(true);
      if (!isJsonObject(body)) throw new Error("Expected JSON object");

      const error = body["error"];
      expect(isJsonObject(error)).toBe(true);
      if (!isJsonObject(error)) throw new Error("Expected error object");

      expect(error["code"]).toBe("INVALID_CURSOR");

      // Proof: if cursor invalid, db query helper should throw before calling get()
      expect(mockQuery.get).not.toHaveBeenCalled();
    } finally {
      server.close();
    }
  });

  it("returns 200 for /failures/range and validates range ordering", async () => {
    const app = makeApp();

    mockQuery.get.mockResolvedValueOnce({
      docs: [
        {
          id: "f_2",
          ref: { path: "users/user_test_123/failures/f_2" },
          data: () => ({
            userId: "user_test_123",
            type: "RAW_EVENT_INVALID",
            code: "RAW_EVENT_CONTRACT_INVALID",
            message: "Invalid RawEvent envelope; normalization dropped the event.",
            day: "2026-01-02",
            createdAt: makeTimestamp(1704153600000), // 2024-01-02T00:00:00.000Z
          }),
        },
      ],
    });

    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === "string") {
      server.close();
      throw new Error("Failed to bind test server");
    }

    const url = `http://127.0.0.1:${address.port}/users/me/failures/range?start=2026-01-01&end=2026-01-31&limit=50`;

    try {
      const res = await fetch(url);
      expect(res.status).toBe(200);

      const body: unknown = await res.json();
      expect(isJsonObject(body)).toBe(true);
      if (!isJsonObject(body)) throw new Error("Expected JSON object");

      expect(Array.isArray(body["items"])).toBe(true);
      const items = body["items"] as unknown[];
      expect(items.length).toBe(1);

      const first = items[0];
      expect(isJsonObject(first)).toBe(true);
      if (!isJsonObject(first)) throw new Error("Expected first item object");

      // ✅ Step 8 read surface: ISO string
      expect(first["createdAt"]).toBe("2024-01-02T00:00:00.000Z");

      // Ensure range filters were applied on day
      expect(mockQuery.where).toHaveBeenCalledWith("day", ">=", "2026-01-01");
      expect(mockQuery.where).toHaveBeenCalledWith("day", "<=", "2026-01-31");
      expect(mockQuery.orderBy).toHaveBeenCalledWith("createdAt", "asc");
      expect(mockQuery.orderBy).toHaveBeenCalledWith("__name__", "asc");
    } finally {
      server.close();
    }
  });
});
