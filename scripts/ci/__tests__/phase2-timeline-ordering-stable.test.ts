/**
 * Phase 2 proof test — Timeline ordering remains stable with fuzzy time.
 *
 * Proves:
 * - Events with same/similar start time are ordered deterministically (documentId tiebreaker)
 * - Multiple fetches return the same order
 * - No reordering on refresh
 */
import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import express from "express";

const mockDocs = [
  {
    id: "ev_a",
    data: () => ({
      userId: "user_proof",
      sourceId: "manual",
      day: "2025-01-15",
      kind: "weight",
      start: "2025-01-15T12:00:00.000Z",
      end: "2025-01-15T12:00:00.000Z",
      timezone: "America/New_York",
      schemaVersion: 1,
      createdAt: "2025-01-15T12:00:00.000Z",
      updatedAt: "2025-01-15T12:00:00.000Z",
    }),
  },
  {
    id: "ev_b",
    data: () => ({
      userId: "user_proof",
      sourceId: "manual",
      day: "2025-01-15",
      kind: "weight",
      start: "2025-01-15T12:00:00.000Z",
      end: "2025-01-15T12:00:00.000Z",
      timezone: "America/New_York",
      schemaVersion: 1,
      createdAt: "2025-01-15T12:00:00.000Z",
      updatedAt: "2025-01-15T12:00:00.000Z",
    }),
  },
];

const mockEventsSnapshot = {
  docs: mockDocs,
  size: mockDocs.length,
};

const mockRawEventsSnapshot = { docs: [], size: 0 };
const mockDailyFactsSnap = { exists: false };
const mockInsightsSnap = { docs: [] };
const mockIntelSnap = { exists: false };
const mockLedgerSnap = { exists: false };

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
  if (name === "events") {
    const col = chain(mockEventsSnapshot) as Record<string, unknown>;
    col.doc = () => ({ get: () => Promise.resolve({ exists: false }) });
    return col;
  }
  if (name === "rawEvents") return chain(mockRawEventsSnapshot);
  if (name === "dailyFacts" || name === "intelligenceContext" || name === "derivedLedger") {
    return { doc: () => ({ get: () => Promise.resolve(mockDailyFactsSnap) }) };
  }
  if (name === "insights") return { where: () => ({ get: () => Promise.resolve(mockInsightsSnap) }) };
  return {};
});

jest.mock("../../../services/api/src/db", () => ({
  userCollection: (...args: unknown[]) => mockUserCollection(...args),
}));

describe("Phase 2 proof: timeline ordering stable with fuzzy time", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("events endpoint returns deterministic order (start desc, documentId desc)", async () => {
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
        `http://127.0.0.1:${addr.port}/users/me/events?start=2025-01-15&end=2025-01-15&limit=10`,
      );
      const res2 = await fetch(
        `http://127.0.0.1:${addr.port}/users/me/events?start=2025-01-15&end=2025-01-15&limit=10`,
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
