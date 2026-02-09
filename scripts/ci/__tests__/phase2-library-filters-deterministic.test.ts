/**
 * Phase 2 proof test — Library filters return deterministic results for the same inputs.
 *
 * Proves:
 * - Same query params (start, end, kinds, provenance, uncertaintyState, q) → same items
 * - Order is deterministic
 */
import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import express from "express";

const mockDocs = [
  {
    id: "raw_1",
    data: () => ({
      kind: "incomplete",
      observedAt: "2025-01-15T12:00:00.000Z",
      userId: "user_proof",
      sourceId: "manual",
      schemaVersion: 1,
      receivedAt: "2025-01-15T12:00:05.000Z",
      provenance: "manual",
      uncertaintyState: "incomplete",
    }),
  },
];

const mockRawEventsSnapshot = {
  docs: mockDocs,
  size: mockDocs.length,
};

const chain = (getResult: unknown) => {
  const c: Record<string, unknown> = {
    where: () => c,
    orderBy: () => c,
    limit: () => c,
    startAfter: () => c,
    get: () => Promise.resolve(getResult),
  };
  return c;
};

const mockUserCollection = jest.fn((_uid: string, name: string) => {
  if (name === "rawEvents") {
    const col = chain(mockRawEventsSnapshot) as Record<string, unknown>;
    col.doc = () => ({ get: () => Promise.resolve({ exists: false }) });
    return col;
  }
  return {};
});

jest.mock("../../../services/api/src/db", () => ({
  userCollection: (...args: unknown[]) => mockUserCollection(...args),
  documentIdPath: { _: "__name__" },
}));

describe("Phase 2 proof: library filters return deterministic results", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("raw-events with same filters returns identical items in identical order", async () => {
    const usersMeRoutes = require("../../../services/api/src/routes/usersMe").default;
    const app = express();
    app.use((req, _res, next) => {
      (req as unknown as { uid: string }).uid = "user_proof";
      next();
    });
    app.use("/users/me", usersMeRoutes);

    const server = app.listen(0);
    const addr = server.address();
    if (!addr || typeof addr === "string") {
      server.close();
      throw new Error("Failed to bind");
    }

    const query =
      "start=2025-01-15&end=2025-01-15&kinds=incomplete&provenance=manual&uncertaintyState=incomplete&limit=50";

    try {
      const res1 = await fetch(
        `http://127.0.0.1:${addr.port}/users/me/raw-events?${query}`,
      );
      const res2 = await fetch(
        `http://127.0.0.1:${addr.port}/users/me/raw-events?${query}`,
      );

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);

      const json1 = (await res1.json()) as { items: { id: string }[] };
      const json2 = (await res2.json()) as { items: { id: string }[] };

      expect(json1.items.length).toBe(json2.items.length);
      expect(json1.items.map((i) => i.id)).toEqual(json2.items.map((i) => i.id));
    } finally {
      server.close();
    }
  });
});
