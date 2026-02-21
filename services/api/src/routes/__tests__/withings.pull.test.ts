/**
 * Phase 3B — POST /integrations/withings/pull: invoker auth, FailureEntry on error, RawEvent doc ID = idempotencyKey.
 */

import express from "express";
import request from "supertest";
import { requireInvokerAuth } from "../../middleware/invokerAuth";
import withingsPullRouter from "../withingsPull";


const mockDocRef = { get: jest.fn(), id: "withings:weight:u1:123" };
const mockUserCollection = jest.fn();
const mockRegistryGet = jest.fn();

jest.mock("../../db", () => ({
  userCollection: (...args: unknown[]) => mockUserCollection(...args),
  FieldValue: { serverTimestamp: () => ({ _serverTimestamp: true }) },
  withingsConnectedRegistryCollection: () => ({ get: mockRegistryGet }),
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

const nativeFetch = globalThis.fetch;

describe("POST /integrations/withings/pull", () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/integrations/withings/pull", requireInvokerAuth, withingsPullRouter);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.WITHINGS_PULL_INVOKER_EMAILS = "";
    mockRegistryGet.mockResolvedValue({ docs: [] });
    mockUserCollection.mockReturnValue({
      doc: jest.fn(() => mockDocRef),
    });
    mockDocRef.get.mockResolvedValue({ exists: false });
    globalThis.fetch = jest.fn((url: string | URL | Request) => {
      const u = typeof url === "string" ? new URL(url) : url instanceof Request ? new URL(url.url) : url;
      const pathname = u.pathname;
      if (pathname === "/v2/oauth2" || pathname.endsWith("/v2/oauth2")) {
        return Promise.resolve({
          status: 200,
          json: async () => ({ status: 0, body: { access_token: "at", expires_in: 3600 } }),
        } as Response);
      }
      if (pathname === "/measure" || pathname.endsWith("/measure")) {
        return Promise.resolve({
          status: 200,
          json: async () => ({ status: 0, body: { measuregrps: [] } }),
        } as Response);
      }
      throw new Error(`Unexpected fetch URL: ${u.toString()}`);
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = nativeFetch;
  });

  const registryDoc = (id: string) => ({ id, data: () => ({ connected: true }) });

  describe("invoker auth enforced", () => {
    it("returns 403 when X-Goog-Authenticated-User-Email is missing", async () => {
      const res = await request(app).post("/integrations/withings/pull");
      expect(res.status).toBe(403);
      expect(res.body?.error?.code).toBe("INVOKER_AUTH_REQUIRED");
    });

    it("returns 200 when header is present (no allowlist)", async () => {
      mockRegistryGet.mockResolvedValueOnce({ docs: [] });
      const res = await request(app)
        .post("/integrations/withings/pull")
        .set("x-goog-authenticated-user-email", "accounts.google.com:scheduler@project.iam.gserviceaccount.com");
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        ok: true,
        usersProcessed: 0,
        eventsCreated: 0,
        eventsAlreadyExists: 0,
        failuresWritten: 0,
        failureWriteErrors: 0,
      });
    });
  });

  describe("FailureEntry on Withings API error", () => {
    it("writes FailureEntry and continues when fetchWithingsMeasures throws", async () => {
      mockRegistryGet.mockResolvedValueOnce({ docs: [registryDoc("uid1")] });
      withingsMeasures.fetchWithingsMeasures.mockRejectedValue(
        new withingsMeasures.WithingsMeasureError("API error", "WITHINGS_MEASURE_API_ERROR"),
      );

      const res = await request(app)
        .post("/integrations/withings/pull")
        .set("x-goog-authenticated-user-email", "accounts.google.com:invoker@proj.iam.gserviceaccount.com");
      expect(res.status).toBe(200);
      expect(writeFailure.writeFailure).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "uid1",
          source: "ingestion",
          stage: "withings.pull",
          reasonCode: "WITHINGS_MEASURE_API_ERROR",
          message: "API error",
        }),
      );
      expect(res.body.failuresWritten).toBe(1);
      expect(res.body.failureWriteErrors).toBe(0);
    });
  });

  describe("RawEvent doc ID equals idempotencyKey", () => {
    it("writes RawEvent with doc ID = sample idempotencyKey", async () => {
      const idempotencyKey = "withings:weight:uid1:999";
      const docIds: string[] = [];
      mockRegistryGet.mockResolvedValueOnce({ docs: [registryDoc("uid1")] });
      mockUserCollection.mockReturnValue({
        doc: (id: string) => {
          docIds.push(id);
          return {
            get: jest.fn().mockResolvedValue({ exists: false }),
            create: jest.fn().mockResolvedValue(undefined),
            id,
          };
        },
      });
      withingsMeasures.fetchWithingsMeasures.mockResolvedValue([
        {
          measuredAtIso: "2025-01-15T12:00:00.000Z",
          weightKg: 75,
          bodyFatPercent: null,
          idempotencyKey,
        },
      ]);

      const res = await request(app)
        .post("/integrations/withings/pull")
        .set("x-goog-authenticated-user-email", "accounts.google.com:invoker@proj.iam.gserviceaccount.com");
      expect(res.status).toBe(200);
      expect(res.body.eventsCreated).toBe(1);
      expect(res.body.eventsAlreadyExists).toBe(0);
      expect(res.body.failureWriteErrors).toBe(0);
      expect(mockUserCollection).toHaveBeenCalledWith("uid1", "rawEvents");
      expect(docIds).toContain(idempotencyKey);
    });
  });

  describe("no duplicate writes on replay", () => {
    it("when doc already exists, counts as idempotent replay and does not write FailureEntry", async () => {
      const idempotencyKey = "withings:weight:uid1:888";
      mockRegistryGet.mockResolvedValueOnce({ docs: [registryDoc("uid1")] });
      const createMock = jest.fn().mockRejectedValue(new Error("already exists"));
      mockUserCollection.mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue({ exists: true }),
          create: createMock,
          id: idempotencyKey,
        }),
      });
      withingsMeasures.fetchWithingsMeasures.mockResolvedValue([
        {
          measuredAtIso: "2025-01-15T12:00:00.000Z",
          weightKg: 70,
          bodyFatPercent: 20,
          idempotencyKey,
        },
      ]);

      const res = await request(app)
        .post("/integrations/withings/pull")
        .set("x-goog-authenticated-user-email", "accounts.google.com:invoker@proj.iam.gserviceaccount.com");
      expect(res.status).toBe(200);
      expect(createMock).toHaveBeenCalled();
      expect(writeFailure.writeFailure).not.toHaveBeenCalled();
      expect(res.body.eventsCreated).toBe(0);
      expect(res.body.eventsAlreadyExists).toBe(1);
      expect(res.body.failureWriteErrors).toBe(0);
    });
  });
});
