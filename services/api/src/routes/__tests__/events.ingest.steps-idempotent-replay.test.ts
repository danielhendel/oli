/**
 * Steps idempotent replay must touch the raw doc so Firestore `onDocumentUpdated`
 * can re-run normalization after mapper fixes (create trigger does not re-fire).
 */
import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import express from "express";

const mockDocRef = {
  id: "idem_steps_replay",
  get: jest.fn(),
  create: jest.fn(),
  update: jest.fn().mockResolvedValue(undefined),
};
const mockColRef = {
  doc: jest.fn(() => mockDocRef),
};

jest.mock("../../db", () => ({
  userCollection: (_uid, name) => {
    if (name === "rawEvents") return mockColRef;
    return {};
  },
}));

function createIngestApp(): express.Express {
  const router = require("../events").default as express.Router;
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as unknown as { uid?: string }).uid = "user_steps_replay";
    next();
  });
  app.use("/ingest", router);
  return app;
}

const stepStartIso = "2026-04-07T00:00:00.000Z";

const baseBody = {
  provider: "apple_health",
  kind: "steps",
  /** Envelope instant; Apple steps `day` in the response follows payload.start + payload.timezone only. */
  occurredAt: stepStartIso,
  timeZone: "Etc/UTC",
  payload: {
    start: stepStartIso,
    end: "2026-04-07T23:59:59.999Z",
    timezone: "Etc/UTC",
    day: "2026-04-07",
    steps: 5000,
  },
};

describe("POST /ingest — steps idempotent replay", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDocRef.create.mockRejectedValue(new Error("ALREADY_EXISTS"));
    mockDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({ ...baseBody, id: mockDocRef.id, userId: "user_steps_replay" }),
    });
    mockDocRef.update.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("updates payload, observedAt, and receivedAt on steps idempotent replay (cumulative day total)", async () => {
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
          "Idempotency-Key": "idem_steps_replay",
        },
        body: JSON.stringify(baseBody),
      });

      expect(res.status).toBe(202);
      const json = (await res.json()) as { idempotentReplay?: boolean };
      expect(json.idempotentReplay).toBe(true);

      expect(mockDocRef.update).toHaveBeenCalledTimes(1);
      const patch = mockDocRef.update.mock.calls[0][0] as {
        receivedAt?: string;
        observedAt?: string;
        payload?: { steps?: number };
      };
      expect(typeof patch.receivedAt).toBe("string");
      expect(patch.receivedAt!.length).toBeGreaterThan(10);
      expect(patch.observedAt).toBe(baseBody.occurredAt);
      expect(patch.payload?.steps).toBe(5000);
    } finally {
      server.close();
    }
  });

  it("overwrites stale stored steps on replay when incoming cumulative total is higher", async () => {
    mockDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        ...baseBody,
        id: mockDocRef.id,
        userId: "user_steps_replay",
        payload: { ...baseBody.payload, steps: 37 },
      }),
    });

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
          "Idempotency-Key": "idem_steps_replay",
        },
        body: JSON.stringify(baseBody),
      });

      expect(res.status).toBe(202);
      const patch = mockDocRef.update.mock.calls[0][0] as { payload?: { steps?: number } };
      expect(patch.payload?.steps).toBe(5000);
    } finally {
      server.close();
    }
  });
});

describe("POST /ingest — apple_health steps envelope/payload parity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDocRef.create.mockResolvedValue(undefined);
    mockDocRef.get.mockResolvedValue({ exists: false });
  });

  it("returns 202 and response day from payload.start+timezone when observedAt differs (no envelope drift)", async () => {
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
          "Idempotency-Key": "idem_steps_payload_day_authority",
        },
        body: JSON.stringify({
          provider: "apple_health",
          kind: "steps",
          sourceId: "apple_health",
          timeZone: "Etc/UTC",
          observedAt: "2026-04-07T12:00:00.000Z",
          payload: {
            ...baseBody.payload,
            start: "2026-04-07T00:00:00.000Z",
          },
        }),
      });
      expect(res.status).toBe(202);
      const json = (await res.json()) as { day?: string };
      expect(json.day).toBe("2026-04-07");
      expect(mockDocRef.create).toHaveBeenCalled();
    } finally {
      server.close();
    }
  });

  it("prefers observedAt over occurredAt for envelope when both are strings (stored observedAt)", async () => {
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
          "Idempotency-Key": "idem_steps_observed_wins",
        },
        body: JSON.stringify({
          provider: "apple_health",
          kind: "steps",
          sourceId: "apple_health",
          timeZone: "Etc/UTC",
          observedAt: "2026-04-07T15:00:00.000Z",
          occurredAt: "2026-04-07T03:00:00.000Z",
          payload: {
            ...baseBody.payload,
            start: "2026-04-07T00:00:00.000Z",
          },
        }),
      });
      expect(res.status).toBe(202);
      const createArg = mockDocRef.create.mock.calls[0][0] as { observedAt?: string };
      expect(createArg.observedAt).toBe("2026-04-07T15:00:00.000Z");
    } finally {
      server.close();
    }
  });

  it("returns 400 when payload.timezone does not match top-level timeZone", async () => {
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
          "Idempotency-Key": "idem_steps_mismatch_tz",
        },
        body: JSON.stringify({
          ...baseBody,
          timeZone: "Etc/UTC",
          payload: {
            ...baseBody.payload,
            timezone: "America/New_York",
          },
        }),
      });
      expect(res.status).toBe(400);
      const json = (await res.json()) as { error?: { code?: string } };
      expect(json.error?.code).toBe("STEPS_PAYLOAD_TIMEZONE_MISMATCH");
      expect(mockDocRef.create).not.toHaveBeenCalled();
    } finally {
      server.close();
    }
  });
});
