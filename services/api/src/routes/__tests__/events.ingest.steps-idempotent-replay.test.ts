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
  userCollection: (_uid: string, name: string) => {
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

const baseBody = {
  provider: "apple_health",
  kind: "steps",
  occurredAt: "2026-04-07T12:00:00.000Z",
  timeZone: "America/New_York",
  payload: {
    start: "2026-04-07T00:00:00.000Z",
    end: "2026-04-07T23:59:59.000Z",
    timezone: "America/New_York",
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

  it("updates receivedAt on idempotent replay so normalization can re-run", async () => {
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
      const patch = mockDocRef.update.mock.calls[0][0] as { receivedAt?: string };
      expect(typeof patch.receivedAt).toBe("string");
      expect(patch.receivedAt!.length).toBeGreaterThan(10);
    } finally {
      server.close();
    }
  });
});
