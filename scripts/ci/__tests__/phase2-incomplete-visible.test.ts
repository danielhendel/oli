/**
 * Phase 2 proof test #1 — Incomplete event log → visible as incomplete in timeline/day retrieval.
 * UI state is fail-closed.
 *
 * Proves:
 * - Incomplete events persist and are returned in timeline with hasIncompleteEvents, incompleteCount
 * - Day view data includes incomplete events
 */
import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import express from "express";

const mockDocRef = {
  id: "idem_proof_incomplete",
  get: jest.fn().mockResolvedValue({ exists: false }),
  create: jest.fn().mockResolvedValue(undefined),
};
const mockColRef = {
  doc: jest.fn(() => mockDocRef),
};

const mockRawEventsSnapshot = {
  docs: [
    {
      id: "raw_1",
      data: () => ({
        kind: "incomplete",
        observedAt: "2025-01-15T12:00:00.000Z",
        userId: "user_proof",
        sourceId: "manual",
        schemaVersion: 1,
        receivedAt: "2025-01-15T12:00:05.000Z",
        uncertaintyState: "incomplete",
      }),
    },
  ],
  size: 1,
};

const mockEventsSnapshot = { docs: [], size: 0 };
const mockDailyFactsSnap = { exists: false };
const mockInsightsSnap = { docs: [] };
const mockIntelSnap = { exists: false };
const mockLedgerSnap = { exists: false };

const rawEventsQueryChain = {
  where: jest.fn().mockReturnThis(),
  get: jest.fn().mockResolvedValue(mockRawEventsSnapshot),
};

const mockUserCollection = jest.fn((_uid: string, name: string) => {
  if (name === "rawEvents") {
    return {
      doc: () => mockDocRef,
      ...rawEventsQueryChain,
    };
  }
  if (name === "events") {
    return { where: () => ({ get: () => Promise.resolve(mockEventsSnapshot) }) };
  }
  if (name === "dailyFacts" || name === "intelligenceContext" || name === "derivedLedger") {
    return { doc: () => ({ get: () => Promise.resolve(mockDailyFactsSnap) }) };
  }
  if (name === "insights") {
    return { where: () => ({ get: () => Promise.resolve(mockInsightsSnap) }) };
  }
  return {};
});

jest.mock("../../../services/api/src/db", () => ({
  userCollection: (...args: unknown[]) => mockUserCollection(...args),
  documentIdPath: { _: "documentId" },
}));

describe("Phase 2 proof: incomplete event visible in timeline", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDocRef.get.mockResolvedValue({ exists: false });
    mockDocRef.create.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("timeline day includes hasIncompleteEvents and incompleteCount when raw incomplete events exist", async () => {
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
        `http://127.0.0.1:${addr.port}/users/me/timeline?start=2025-01-15&end=2025-01-15`,
      );
      expect(res.status).toBe(200);

      const json = (await res.json()) as { days: { day: string; hasIncompleteEvents?: boolean; incompleteCount?: number }[] };
      expect(json.days).toHaveLength(1);
      expect(json.days[0].day).toBe("2025-01-15");
      expect(json.days[0].hasIncompleteEvents).toBe(true);
      expect(json.days[0].incompleteCount).toBe(1);
      expect(json.days[0].dayCompletenessState).toBe("incomplete");
    } finally {
      server.close();
    }
  });
});
