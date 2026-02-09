/**
 * Phase 2 — Ingest route tests for truthful capture primitives.
 * - Incomplete event log
 * - Fuzzy time (occurredAt range)
 * - Unknown content
 * - Backfill (occurredAt preserved, recordedAt differs, provenance=backfill)
 */
import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import express from "express";

const mockDocRef = {
  id: "idem_phase2_incomplete",
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

jest.mock("../../db", () => ({
  userCollection: (...args: unknown[]) => mockUserCollection(...args),
}));

function createIngestApp(): express.Express {
  const router = require("../events").default as express.Router;
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as unknown as { uid?: string }).uid = "user_phase2";
    next();
  });
  app.use("/ingest", router);
  return app;
}

describe("POST /ingest — Phase 2 primitives", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDocRef.get.mockResolvedValue({ exists: false });
    mockDocRef.create.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("accepts incomplete event (kind=incomplete, something happened)", async () => {
    const app = createIngestApp();
    const server = app.listen(0);
    const addr = server.address();
    if (!addr || typeof addr === "string") {
      server.close();
      throw new Error("Failed to bind");
    }

    try {
      const res = await fetch(`http://127.0.0.1:${addr.port}/ingest`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": "idem_incomplete_1",
        },
        body: JSON.stringify({
          provider: "manual",
          kind: "incomplete",
          occurredAt: "2025-01-15T12:00:00.000Z",
          timeZone: "America/New_York",
          payload: {},
          uncertaintyState: "incomplete",
        }),
      });

      expect(res.status).toBe(202);
      const json = (await res.json()) as { ok: boolean; rawEventId: string; day: string };
      expect(json.ok).toBe(true);
      expect(json.rawEventId).toBeDefined();
      expect(json.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      expect(mockDocRef.create).toHaveBeenCalledTimes(1);
      const written = mockDocRef.create.mock.calls[0][0] as Record<string, unknown>;
      expect(written.kind).toBe("incomplete");
      expect(written.observedAt).toBe("2025-01-15T12:00:00.000Z");
      expect(written.uncertaintyState).toBe("incomplete");
    } finally {
      server.close();
    }
  });

  it("accepts occurredAt as range (fuzzy time)", async () => {
    const app = createIngestApp();
    const server = app.listen(0);
    const addr = server.address();
    if (!addr || typeof addr === "string") {
      server.close();
      throw new Error("Failed to bind");
    }

    try {
      const res = await fetch(`http://127.0.0.1:${addr.port}/ingest`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": "idem_fuzzy_1",
        },
        body: JSON.stringify({
          provider: "manual",
          kind: "incomplete",
          occurredAt: { start: "2025-01-15T08:00:00.000Z", end: "2025-01-15T12:00:00.000Z" },
          timeZone: "America/New_York",
          payload: {},
        }),
      });

      expect(res.status).toBe(202);
      const json = (await res.json()) as { ok: boolean; rawEventId: string; day: string };
      expect(json.ok).toBe(true);

      const written = mockDocRef.create.mock.calls[0][0] as Record<string, unknown>;
      expect(written.observedAt).toBe("2025-01-15T08:00:00.000Z");
      expect(written.occurredAt).toEqual({ start: "2025-01-15T08:00:00.000Z", end: "2025-01-15T12:00:00.000Z" });
    } finally {
      server.close();
    }
  });

  it("accepts contentUnknown and persists it", async () => {
    const app = createIngestApp();
    const server = app.listen(0);
    const addr = server.address();
    if (!addr || typeof addr === "string") {
      server.close();
      throw new Error("Failed to bind");
    }

    try {
      const res = await fetch(`http://127.0.0.1:${addr.port}/ingest`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": "idem_content_unknown_1",
        },
        body: JSON.stringify({
          provider: "manual",
          kind: "incomplete",
          occurredAt: "2025-01-15T14:00:00.000Z",
          timeZone: "America/New_York",
          payload: {},
          contentUnknown: true,
        }),
      });

      expect(res.status).toBe(202);
      const written = mockDocRef.create.mock.calls[0][0] as Record<string, unknown>;
      expect(written.contentUnknown).toBe(true);
    } finally {
      server.close();
    }
  });

  it("accepts backfill log — occurredAt preserved, recordedAt differs, provenance=backfill", async () => {
    const app = createIngestApp();
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
          "Idempotency-Key": "idem_backfill_1",
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
      const json = (await res.json()) as { ok: boolean; rawEventId: string; day: string };
      expect(json.ok).toBe(true);
      expect(json.day).toBe("2025-01-01");

      const written = mockDocRef.create.mock.calls[0][0] as Record<string, unknown>;
      expect(written.observedAt).toBe(occurredAt);
      expect(written.recordedAt).toBe(recordedAt);
      expect(written.receivedAt).toBeDefined();
      expect(written.provenance).toBe("backfill");
    } finally {
      server.close();
    }
  });
});
