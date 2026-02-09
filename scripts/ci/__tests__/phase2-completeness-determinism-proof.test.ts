/**
 * Sprint 3 — Completeness determinism proof.
 *
 * Proves:
 * - Same timeline inputs produce same missingReasons[] order/content.
 * - missingReasons is deterministic (server-computed, stable).
 */
import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import express from "express";

const mockRawDocs = [
  {
    id: "raw_incomplete_1",
    data: () => ({
      kind: "incomplete",
      observedAt: "2025-01-15T12:00:00.000Z",
      userId: "user_proof",
      sourceId: "manual",
      schemaVersion: 1,
      receivedAt: "2025-01-15T12:00:05.000Z",
    }),
  },
];

const mockEventsSnapshot = { docs: [], size: 0 };
const mockDailyFactsSnap = { exists: false };
const mockInsightsSnap = { docs: [] };
const mockIntelSnap = { exists: false };
const mockLedgerSnap = { exists: false };

const chain = (getResult: unknown) => {
  const c: Record<string, unknown> = {
    where: () => c,
    orderBy: () => c,
    limit: () => c,
    get: () => Promise.resolve(getResult),
  };
  return c;
};

const mockUserCollection = jest.fn((_uid: string, name: string) => {
  if (name === "events") return chain(mockEventsSnapshot);
  if (name === "rawEvents") return chain({ docs: mockRawDocs, size: mockRawDocs.length });
  if (name === "dailyFacts" || name === "intelligenceContext" || name === "derivedLedger") {
    return { doc: () => ({ get: () => Promise.resolve(mockDailyFactsSnap) }) };
  }
  if (name === "insights") return { where: () => ({ get: () => Promise.resolve(mockInsightsSnap) }) };
  return {};
});

jest.mock("../../../services/api/src/db", () => ({
  userCollection: (...args: unknown[]) => mockUserCollection(...args),
  documentIdPath: { _: "__name__" },
}));

describe("Phase 2 proof: completeness missingReasons determinism", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("same timeline query returns identical missingReasons order and content", async () => {
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
      const res1 = await fetch(
        `http://127.0.0.1:${addr.port}/users/me/timeline?start=2025-01-15&end=2025-01-15`,
      );
      const res2 = await fetch(
        `http://127.0.0.1:${addr.port}/users/me/timeline?start=2025-01-15&end=2025-01-15`,
      );

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);

      const json1 = (await res1.json()) as { days: { day: string; missingReasons?: string[] }[] };
      const json2 = (await res2.json()) as { days: { day: string; missingReasons?: string[] }[] };

      expect(json1.days.length).toBe(json2.days.length);
      for (let i = 0; i < json1.days.length; i++) {
        const d1 = json1.days[i]!;
        const d2 = json2.days[i]!;
        expect(d1.day).toBe(d2.day);
        expect(d1.missingReasons ?? []).toEqual(d2.missingReasons ?? []);
      }
    } finally {
      server.close();
    }
  });
});
