// services/api/src/routes/__tests__/events.idempotency.test.ts
import crypto from "crypto";
import express from "express";
import request from "supertest";

import eventsRoutes from "../events";

// ---- Mock Firestore adapter ----
const mockCreate = jest.fn();
const mockGet = jest.fn();

jest.mock("../../db", () => ({
  userCollection: jest.fn(() => ({
    doc: jest.fn(() => ({
      id: "idem-key-123",
      create: mockCreate,
      get: mockGet,
    })),
  })),
}));

// ---- Mock auth middleware: deterministic uid (lint-safe: no `any`) ----
jest.mock("../../middleware/auth", () => ({
  authMiddleware: (req: unknown, _res: unknown, next: unknown) => {
    // Minimal, typed-safe mutation of the request for tests
    const r = req as { uid?: string };
    r.uid = "user_123";

    if (typeof next === "function") {
      (next as () => void)();
    } else {
      throw new Error("next() is not a function");
    }
  },
}));

const makeTestApp = () => {
  const app = express();
  app.use(express.json());
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { authMiddleware } = require("../../middleware/auth");
  app.use("/ingest", authMiddleware, eventsRoutes);
  return app;
};

// Must match the router’s stableStringify + sha256Hex logic
const stableStringify = (value: unknown): string => {
  const seen = new WeakSet<object>();

  const sorter = (v: unknown): unknown => {
    if (v === null) return null;
    if (typeof v !== "object") return v;
    if (v instanceof Date) return v.toISOString();
    if (Array.isArray(v)) return v.map(sorter);

    const obj = v as Record<string, unknown>;
    if (seen.has(obj)) throw new Error("Cannot stableStringify circular structure");
    seen.add(obj);

    return Object.keys(obj)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sorter(obj[k]);
        return acc;
      }, {});
  };

  return JSON.stringify(sorter(value));
};

const sha256Hex = (input: string): string =>
  crypto.createHash("sha256").update(input, "utf8").digest("hex");

const validPayload = {
  provider: "manual",
  kind: "weight",
  observedAt: "2025-01-01T00:00:00.000Z",
  payload: {
    time: "2025-01-01T00:00:00.000Z",
    timezone: "UTC",
    weightKg: 80.2,
  },
};

const computePayloadHashForRoute = (args: {
  rawEventId: string;
  uid: string;
  idempotencyKey: string;
  observedAt: string;
  provider: string;
  kind: string;
  payload: unknown;
  sourceId?: string;
}) => {
  // MUST mirror the router’s fingerprintInput exactly
  const fingerprintInput = {
    id: args.rawEventId,
    userId: args.uid,

    idempotencyKey: args.idempotencyKey,
    fingerprintVersion: 1 as const,

    sourceId: args.sourceId ?? "manual",
    sourceType: "manual" as const,

    provider: args.provider,
    kind: args.kind,

    observedAt: args.observedAt,

    payload: args.payload,

    schemaVersion: 1 as const,
  } as const;

  return sha256Hex(stableStringify(fingerprintInput));
};

describe("POST /ingest — idempotency guarantees", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("first ingest succeeds (202)", async () => {
    mockCreate.mockResolvedValueOnce(undefined);

    const res = await request(makeTestApp())
      .post("/ingest")
      .set("Idempotency-Key", "idem-key-123")
      .send(validPayload);

    expect(res.status).toBe(202);
    expect(res.body.ok).toBe(true);
    expect(res.body.idempotentReplay).toBeUndefined();
  });

  test("replay with identical payload returns 202 + idempotentReplay", async () => {
    mockCreate.mockRejectedValueOnce(new Error("already exists"));

    const expectedHash = computePayloadHashForRoute({
      rawEventId: "idem-key-123",
      uid: "user_123",
      idempotencyKey: "idem-key-123",
      observedAt: validPayload.observedAt,
      provider: validPayload.provider,
      kind: validPayload.kind,
      payload: validPayload.payload,
      sourceId: "manual",
    });

    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        schemaVersion: 1,
        id: "idem-key-123",
        userId: "user_123",

        idempotencyKey: "idem-key-123",
        fingerprintVersion: 1,
        payloadHash: expectedHash, // ✅ must match router

        sourceId: "manual",
        provider: "manual",
        sourceType: "manual",
        kind: "weight",

        // receivedAt can be anything; router excludes it from hash
        receivedAt: "2025-01-02T00:00:00.000Z",
        observedAt: validPayload.observedAt,

        payload: validPayload.payload,
      }),
    });

    const res = await request(makeTestApp())
      .post("/ingest")
      .set("Idempotency-Key", "idem-key-123")
      .send(validPayload);

    expect(res.status).toBe(202);
    expect(res.body.idempotentReplay).toBe(true);
  });

  test("replay with different payload returns 409 conflict", async () => {
    mockCreate.mockRejectedValueOnce(new Error("already exists"));

    const oldHash = computePayloadHashForRoute({
      rawEventId: "idem-key-123",
      uid: "user_123",
      idempotencyKey: "idem-key-123",
      observedAt: validPayload.observedAt,
      provider: validPayload.provider,
      kind: validPayload.kind,
      payload: validPayload.payload,
    });

    // Existing doc hash is for the OLD payload, but request will send a NEW payload
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        schemaVersion: 1,
        id: "idem-key-123",
        userId: "user_123",

        idempotencyKey: "idem-key-123",
        fingerprintVersion: 1,
        payloadHash: oldHash,

        sourceId: "manual",
        provider: "manual",
        sourceType: "manual",
        kind: "weight",

        receivedAt: "2025-01-02T00:00:00.000Z",
        observedAt: validPayload.observedAt,

        payload: validPayload.payload,
      }),
    });

    const res = await request(makeTestApp())
      .post("/ingest")
      .set("Idempotency-Key", "idem-key-123")
      .send({
        ...validPayload,
        payload: { ...validPayload.payload, weightKg: 81.0 }, // changed => should conflict
      });

    expect(res.status).toBe(409);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("IDEMPOTENCY_KEY_REUSE_CONFLICT");
  });

  test("missing idempotency key returns 400", async () => {
    const res = await request(makeTestApp()).post("/ingest").send(validPayload);
    expect(res.status).toBe(400);
  });
});
