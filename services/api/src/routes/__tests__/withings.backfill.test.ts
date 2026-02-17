/**
 * Phase 3B.1 — POST /integrations/withings/backfill: invoker auth, start/resume/stop,
 * RawEvent doc ID = idempotencyKey, no duplicate on replay, FailureEntry on fetch error.
 */

import express from "express";
import request from "supertest";
import { requireInvokerAuth } from "../../middleware/invokerAuth";
import withingsBackfillRouter from "../withingsBackfill";

const mockIntegrationRef = {
  get: jest.fn(),
  set: jest.fn(),
};
const mockRawEventsDocRef = { get: jest.fn(), create: jest.fn(), id: "withings:weight:u1:123" };
const mockUserCollection = jest.fn();
const mockCollectionGroup = jest.fn();

jest.mock("../../db", () => ({
  db: {
    collectionGroup: (...args: unknown[]) => mockCollectionGroup(...args),
  },
  userCollection: (...args: unknown[]) => mockUserCollection(...args),
  FieldValue: { serverTimestamp: () => ({ _serverTimestamp: true }) },
}));

jest.mock("../../lib/withingsMeasures", () => ({
  fetchWithingsMeasures: jest.fn(),
  WithingsMeasureError: class WithingsMeasureError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
}));

jest.mock("../../lib/writeFailure", () => ({
  writeFailure: jest.fn().mockResolvedValue({ id: "fail_1" }),
}));

const withingsMeasures = require("../../lib/withingsMeasures");
const writeFailure = require("../../lib/writeFailure");

describe("POST /integrations/withings/backfill", () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/integrations/withings/backfill", requireInvokerAuth, withingsBackfillRouter);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.WITHINGS_PULL_INVOKER_EMAILS = "";
    mockIntegrationRef.get.mockResolvedValue({ exists: false });
    mockIntegrationRef.set.mockResolvedValue(undefined);
    mockRawEventsDocRef.get.mockResolvedValue({ exists: false });
    mockRawEventsDocRef.create.mockResolvedValue(undefined);
    mockUserCollection.mockImplementation((uid: string, col: string) => {
      if (col === "integrations") {
        return { doc: () => mockIntegrationRef };
      }
      if (col === "rawEvents") {
        return {
          doc: (id: string) => ({ ...mockRawEventsDocRef, id }),
        };
      }
      return { doc: () => ({ get: jest.fn(), set: jest.fn() }) };
    });
  });

  describe("invoker auth enforced", () => {
    it("returns 403 when X-Goog-Authenticated-User-Email is missing", async () => {
      const res = await request(app).post("/integrations/withings/backfill").send({ mode: "start" });
      expect(res.status).toBe(403);
      expect(res.body?.error?.code).toBe("INVOKER_AUTH_REQUIRED");
    });

    it("returns 400 when body is invalid (missing mode)", async () => {
      mockCollectionGroup.mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ docs: [] }),
        }),
      });
      const res = await request(app)
        .post("/integrations/withings/backfill")
        .set("x-goog-authenticated-user-email", "accounts.google.com:invoker@proj.iam.gserviceaccount.com")
        .send({});
      expect(res.status).toBe(400);
      expect(res.body?.ok).toBe(false);
    });
  });

  describe("start initializes state", () => {
    it("writes backfill state with status running and cursor range", async () => {
      mockCollectionGroup.mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            docs: [{ id: "withings", ref: { parent: { parent: { id: "uid1" } } } }],
          }),
        }),
      });
      const res = await request(app)
        .post("/integrations/withings/backfill")
        .set("x-goog-authenticated-user-email", "accounts.google.com:invoker@proj.iam.gserviceaccount.com")
        .send({ mode: "start", yearsBack: 5, chunkDays: 30, maxChunks: 3 });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.backfillUpdated).toBe(1);
      expect(mockIntegrationRef.set).toHaveBeenCalledWith(
        expect.objectContaining({
          backfill: expect.objectContaining({
            status: "running",
            yearsBack: 5,
            chunkDays: 30,
            maxChunksPerRun: 3,
            processedCount: 0,
            lastError: null,
          }),
        }),
        { merge: true },
      );
    });
  });

  describe("resume processes chunk", () => {
    it("reads cursor, fetches measures, writes RawEvents, updates cursor", async () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const ninetyDays = 90 * 86400;
      const cursorStartSec = nowSec - ninetyDays;
      const cursorEndSec = nowSec - ninetyDays + 86400;
      mockCollectionGroup.mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            docs: [{ id: "withings", ref: { parent: { parent: { id: "uid1" } } } }],
          }),
        }),
      });
      mockIntegrationRef.get
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            backfill: {
              status: "running",
              cursorStartSec,
              cursorEndSec,
              processedCount: 0,
              chunkDays: 90,
              maxChunksPerRun: 5,
            },
          }),
        });
      const idempotencyKey = "withings:weight:uid1:grp42";
      withingsMeasures.fetchWithingsMeasures.mockResolvedValue([
        {
          measuredAtIso: "2024-06-01T10:00:00.000Z",
          weightKg: 72,
          bodyFatPercent: 18,
          idempotencyKey,
        },
      ]);
      mockUserCollection.mockImplementation((uid: string, col: string) => {
        if (col === "integrations") return { doc: () => mockIntegrationRef };
        if (col === "rawEvents") {
          return {
            doc: (id: string) => ({
              get: jest.fn().mockResolvedValue({ exists: false }),
              create: jest.fn().mockResolvedValue(undefined),
              id,
            }),
          };
        }
        return { doc: () => ({}) };
      });

      const res = await request(app)
        .post("/integrations/withings/backfill")
        .set("x-goog-authenticated-user-email", "accounts.google.com:invoker@proj.iam.gserviceaccount.com")
        .send({ mode: "resume", yearsBack: 10, chunkDays: 90, maxChunks: 5 });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.eventsCreated).toBe(1);
      expect(res.body.eventsAlreadyExists).toBe(0);
      expect(res.body.backfillUpdated).toBe(1);
      expect(withingsMeasures.fetchWithingsMeasures).toHaveBeenCalledWith("uid1", expect.any(Number), expect.any(Number));
      expect(mockIntegrationRef.set).toHaveBeenCalledWith(
        expect.objectContaining({
          backfill: expect.objectContaining({
            status: expect.stringMatching(/running|complete/),
            processedCount: 1,
          }),
        }),
        { merge: true },
      );
    });
  });

  describe("RawEvent doc id equals idempotencyKey", () => {
    it("writes RawEvent with doc ID = sample idempotencyKey", async () => {
      const idempotencyKey = "withings:weight:uid1:999";
      const docIds: string[] = [];
      const nowSec = Math.floor(Date.now() / 1000);
      const ninetyDays = 90 * 86400;
      mockCollectionGroup.mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            docs: [{ id: "withings", ref: { parent: { parent: { id: "uid1" } } } }],
          }),
        }),
      });
      mockIntegrationRef.get.mockResolvedValue({
        exists: true,
        data: () => ({
          backfill: {
            status: "running",
            cursorStartSec: nowSec - ninetyDays,
            cursorEndSec: nowSec - ninetyDays + 86400,
            processedCount: 0,
            chunkDays: 90,
            maxChunksPerRun: 5,
          },
        }),
      });
      mockUserCollection.mockImplementation((uid: string, col: string) => {
        if (col === "integrations") return { doc: () => mockIntegrationRef };
        if (col === "rawEvents") {
          return {
            doc: (id: string) => {
              docIds.push(id);
              return {
                get: jest.fn().mockResolvedValue({ exists: false }),
                create: jest.fn().mockResolvedValue(undefined),
                id,
              };
            },
          };
        }
        return { doc: () => ({}) };
      });
      withingsMeasures.fetchWithingsMeasures.mockResolvedValue([
        {
          measuredAtIso: "2024-01-15T12:00:00.000Z",
          weightKg: 75,
          bodyFatPercent: null,
          idempotencyKey,
        },
      ]);

      const res = await request(app)
        .post("/integrations/withings/backfill")
        .set("x-goog-authenticated-user-email", "accounts.google.com:invoker@proj.iam.gserviceaccount.com")
        .send({ mode: "resume" });
      expect(res.status).toBe(200);
      expect(res.body.eventsCreated).toBe(1);
      expect(docIds).toContain(idempotencyKey);
    });
  });

  describe("replay does not duplicate", () => {
    it("when doc already exists, counts as eventsAlreadyExists", async () => {
      const idempotencyKey = "withings:weight:uid1:888";
      const nowSec = Math.floor(Date.now() / 1000);
      const ninetyDays = 90 * 86400;
      mockCollectionGroup.mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            docs: [{ id: "withings", ref: { parent: { parent: { id: "uid1" } } } }],
          }),
        }),
      });
      mockIntegrationRef.get.mockResolvedValue({
        exists: true,
        data: () => ({
          backfill: {
            status: "running",
            cursorStartSec: nowSec - ninetyDays,
            cursorEndSec: nowSec - ninetyDays + 86400,
            processedCount: 0,
            chunkDays: 90,
            maxChunksPerRun: 5,
          },
        }),
      });
      const createMock = jest.fn().mockRejectedValue(new Error("already exists"));
      mockUserCollection.mockImplementation((uid: string, col: string) => {
        if (col === "integrations") return { doc: () => mockIntegrationRef };
        if (col === "rawEvents") {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue({ exists: true }),
              create: createMock,
              id: idempotencyKey,
            }),
          };
        }
        return { doc: () => ({}) };
      });
      withingsMeasures.fetchWithingsMeasures.mockResolvedValue([
        {
          measuredAtIso: "2024-01-15T12:00:00.000Z",
          weightKg: 70,
          bodyFatPercent: 20,
          idempotencyKey,
        },
      ]);

      const res = await request(app)
        .post("/integrations/withings/backfill")
        .set("x-goog-authenticated-user-email", "accounts.google.com:invoker@proj.iam.gserviceaccount.com")
        .send({ mode: "resume" });
      expect(res.status).toBe(200);
      expect(createMock).toHaveBeenCalled();
      expect(writeFailure.writeFailure).not.toHaveBeenCalled();
      expect(res.body.eventsCreated).toBe(0);
      expect(res.body.eventsAlreadyExists).toBe(1);
    });
  });

  describe("FailureEntry written on fetch error", () => {
    it("writes FailureEntry and sets backfill status error when fetchWithingsMeasures throws", async () => {
      mockCollectionGroup.mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            docs: [{ id: "withings", ref: { parent: { parent: { id: "uid1" } } } }],
          }),
        }),
      });
      mockIntegrationRef.get.mockResolvedValue({
        exists: true,
        data: () => ({
          backfill: {
            status: "running",
            cursorStartSec: 0,
            cursorEndSec: Math.floor(Date.now() / 1000),
            processedCount: 0,
            chunkDays: 90,
            maxChunksPerRun: 5,
          },
        }),
      });
      withingsMeasures.fetchWithingsMeasures.mockRejectedValue(
        new withingsMeasures.WithingsMeasureError("Withings API down", "WITHINGS_MEASURE_API_ERROR"),
      );

      const res = await request(app)
        .post("/integrations/withings/backfill")
        .set("x-goog-authenticated-user-email", "accounts.google.com:invoker@proj.iam.gserviceaccount.com")
        .send({ mode: "resume" });
      expect(res.status).toBe(200);
      expect(writeFailure.writeFailure).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "uid1",
          source: "ingestion",
          stage: "withings.backfill",
          reasonCode: "WITHINGS_MEASURE_API_ERROR",
          message: "Withings API down",
        }),
      );
      expect(res.body.failuresWritten).toBe(1);
      expect(mockIntegrationRef.set).toHaveBeenCalledWith(
        expect.objectContaining({
          backfill: expect.objectContaining({
            status: "error",
            lastError: expect.objectContaining({ code: "WITHINGS_MEASURE_API_ERROR", message: "Withings API down" }),
          }),
        }),
        { merge: true },
      );
    });
  });
});
