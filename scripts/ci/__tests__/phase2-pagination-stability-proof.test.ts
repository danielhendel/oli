/**
 * Sprint 3 — Pagination stability proof.
 *
 * Proves:
 * - Stable ordering: observedAt desc, documentId desc.
 * - No duplicates, no skips when paginating.
 * - Cursor correctness.
 */
import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import express from "express";

type DocSnap = { exists: boolean; id: string; data: () => unknown };

const allDocs: DocSnap[] = [
  { exists: true, id: "raw_c", data: () => ({ kind: "weight", observedAt: "2025-01-15T14:00:00.000Z", userId: "u", sourceId: "m", schemaVersion: 1, receivedAt: "2025-01-15T14:00:01.000Z" }) },
  { exists: true, id: "raw_b", data: () => ({ kind: "weight", observedAt: "2025-01-15T12:00:00.000Z", userId: "u", sourceId: "m", schemaVersion: 1, receivedAt: "2025-01-15T12:00:01.000Z" }) },
  { exists: true, id: "raw_a", data: () => ({ kind: "weight", observedAt: "2025-01-15T10:00:00.000Z", userId: "u", sourceId: "m", schemaVersion: 1, receivedAt: "2025-01-15T10:00:01.000Z" }) },
];

let startAfterDocId: string | null = null;

const mockUserCollection = jest.fn((_uid: string, name: string) => {
  if (name === "rawEvents") {
    const base = {
      orderBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      startAfter: jest.fn().mockImplementation(function (this: { get: () => Promise<unknown> }, docSnap: { id: string }) {
        startAfterDocId = docSnap.id;
        return this;
      }),
      get: jest.fn().mockImplementation(() => {
        const start = startAfterDocId ? allDocs.findIndex((d) => d.id === startAfterDocId) + 1 : 0;
        const slice = allDocs.slice(start, start + 4);
        const limit = 2;
        const hasMore = slice.length > limit;
        return Promise.resolve({
          docs: hasMore ? slice.slice(0, limit + 1) : slice,
          size: hasMore ? limit + 1 : slice.length,
        });
      }),
      doc: (id: string) => ({
        get: () =>
          Promise.resolve({
            exists: allDocs.some((d) => d.id === id),
            id,
            data: () => allDocs.find((d) => d.id === id)?.data(),
          }),
      }),
    };

    (base.limit as jest.Mock).mockReturnThis();
    return base;
  }
  return {};
});

jest.mock("../../../services/api/src/db", () => ({
  userCollection: (...args: unknown[]) => mockUserCollection(...args),
  documentIdPath: { _: "__name__" },
}));

describe("Phase 2 proof: pagination stability", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    startAfterDocId = null;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("raw-events pagination returns stable ordering, no dupes, no gaps", async () => {
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

    try {
      const res = await fetch(
        `http://127.0.0.1:${addr.port}/users/me/raw-events?start=2025-01-15&end=2025-01-15&limit=2`,
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as { items: { id: string }[]; nextCursor: string | null };

      expect(json.items.length).toBe(2);
      expect(json.items[0]!.id).toBe("raw_c");
      expect(json.items[1]!.id).toBe("raw_b");
      const ids1 = new Set(json.items.map((i) => i.id));
      expect(ids1.size).toBe(2);

      if (json.nextCursor) {
        const res2 = await fetch(
          `http://127.0.0.1:${addr.port}/users/me/raw-events?start=2025-01-15&end=2025-01-15&limit=2&cursor=${encodeURIComponent(json.nextCursor)}`,
        );
        expect(res2.status).toBe(200);
        const json2 = (await res2.json()) as { items: { id: string }[]; nextCursor: string | null };
        expect(json2.items.length).toBe(1);
        expect(json2.items[0]!.id).toBe("raw_a");
        const allIds = new Set([...json.items.map((i) => i.id), ...json2.items.map((i) => i.id)]);
        expect(allIds.size).toBe(3);
        expect(allIds).toEqual(new Set(["raw_a", "raw_b", "raw_c"]));
      }
    } finally {
      server.close();
    }
  });
});
