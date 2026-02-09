/**
 * Phase 2 proof test #2 — Backfill log: occurredAt preserved, recordedAt differs, provenance=backfill.
 *
 * Proves:
 * - Ingest accepts backfill (occurredAt in past, recordedAt = now)
 * - Persisted doc has occurredAt, recordedAt, provenance=backfill
 * - Never masquerades as real-time capture
 */
import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import express from "express";

const mockDocRef = {
  id: "idem_proof_backfill",
  get: jest.fn().mockResolvedValue({ exists: false }),
  create: jest.fn().mockResolvedValue(undefined),
};
const mockColRef = {
  doc: jest.fn(() => mockDocRef),
};

const mockUserCollection = jest.fn((_uid: string, name: string) => {
  if (name === "rawEvents") return mockColRef;
  return {};
});

jest.mock("../../../services/api/src/db", () => ({
  userCollection: (...args: unknown[]) => mockUserCollection(...args),
}));

describe("Phase 2 proof: backfill preserves occurredAt, recordedAt, provenance", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDocRef.get.mockResolvedValue({ exists: false });
    mockDocRef.create.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("ingest persists backfill with occurredAt preserved, recordedAt differs, provenance=backfill", async () => {
    const eventsRouter = require("../../../services/api/src/routes/events").default;
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as unknown as { uid: string }).uid = "user_proof";
      next();
    });
    app.use("/ingest", eventsRouter);

    const server = app.listen(0);
    const addr = server.address();
    if (!addr || typeof addr === "string") {
      server.close();
      throw new Error("Failed to bind");
    }

    const occurredAt = "2025-01-01T10:00:00.000Z";
    const recordedAt = "2025-02-09T18:30:00.000Z";

    try {
      const res = await fetch(`http://127.0.0.1:${addr.port}/ingest`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": "idem_proof_backfill_1",
        },
        body: JSON.stringify({
          provider: "manual",
          kind: "incomplete",
          occurredAt,
          recordedAt,
          timeZone: "America/New_York",
          payload: {},
          provenance: "backfill",
        }),
      });

      expect(res.status).toBe(202);

      const written = mockDocRef.create.mock.calls[0][0] as Record<string, unknown>;
      expect(written.observedAt).toBe(occurredAt);
      expect(written.recordedAt).toBe(recordedAt);
      expect(written.receivedAt).toBeDefined();
      expect(written.provenance).toBe("backfill");
      expect(written.occurredAt).toBe(occurredAt);
    } finally {
      server.close();
    }
  });
});
