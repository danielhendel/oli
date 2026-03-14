/**
 * POST /integrations/oura/pull: invoker auth, performOuraPullNowCore per uid, FailureEntry on error.
 */

import express from "express";
import request from "supertest";
import { requireInvokerAuth } from "../../middleware/invokerAuth";
import ouraPullRouter from "../ouraPull";

const mockRegistryGet = jest.fn();

jest.mock("../../db", () => ({
  ouraConnectedRegistryCollection: () => ({ get: mockRegistryGet }),
}));

const mockPerformOuraPullNowCore = jest.fn();

jest.mock("../integrations/ouraPullNow", () => ({
  performOuraPullNowCore: (...args: unknown[]) => mockPerformOuraPullNowCore(...args),
}));

jest.mock("../../lib/writeFailure", () => ({
  writeFailure: jest.fn().mockResolvedValue(undefined),
}));

const writeFailure = require("../../lib/writeFailure");

describe("POST /integrations/oura/pull", () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as unknown as { rid: string }).rid = "req-oura-pull";
      next();
    });
    app.use("/integrations/oura/pull", requireInvokerAuth, ouraPullRouter);
  });

  const registryDoc = (id: string) => ({ id, data: () => ({ connected: true }) });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.WITHINGS_PULL_INVOKER_EMAILS = "";
    mockRegistryGet.mockResolvedValue({ docs: [] });
  });

  describe("invoker auth enforced", () => {
    it("returns 403 when X-Goog-Authenticated-User-Email is missing", async () => {
      const res = await request(app).post("/integrations/oura/pull");
      expect(res.status).toBe(403);
      expect(res.body?.error?.code).toBe("INVOKER_AUTH_REQUIRED");
    });

    it("returns 200 when header is present (no allowlist)", async () => {
      mockRegistryGet.mockResolvedValueOnce({ docs: [] });
      const res = await request(app)
        .post("/integrations/oura/pull")
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

  describe("performOuraPullNowCore per uid", () => {
    it("aggregates eventsCreated and eventsAlreadyExists when core returns 200", async () => {
      mockRegistryGet.mockResolvedValueOnce({ docs: [registryDoc("uid1")] });
      mockPerformOuraPullNowCore.mockResolvedValueOnce({
        statusCode: 200,
        body: { ok: true, requestId: "r1", windowDays: 30, eventsCreated: 2, eventsAlreadyExists: 1 },
      });

      const res = await request(app)
        .post("/integrations/oura/pull")
        .set("x-goog-authenticated-user-email", "accounts.google.com:invoker@proj.iam.gserviceaccount.com");
      expect(res.status).toBe(200);
      expect(mockPerformOuraPullNowCore).toHaveBeenCalledWith("uid1", "req-oura-pull");
      expect(res.body.usersProcessed).toBe(1);
      expect(res.body.eventsCreated).toBe(2);
      expect(res.body.eventsAlreadyExists).toBe(1);
      expect(res.body.failuresWritten).toBe(0);
      expect(res.body.failureWriteErrors).toBe(0);
    });

    it("writes FailureEntry and continues when core returns non-200", async () => {
      mockRegistryGet.mockResolvedValueOnce({ docs: [registryDoc("uid1")] });
      mockPerformOuraPullNowCore.mockResolvedValueOnce({
        statusCode: 502,
        body: { ok: false, error: { code: "OURA_NOT_CONNECTED", message: "Not connected" } },
      });

      const res = await request(app)
        .post("/integrations/oura/pull")
        .set("x-goog-authenticated-user-email", "accounts.google.com:invoker@proj.iam.gserviceaccount.com");
      expect(res.status).toBe(200);
      expect(writeFailure.writeFailure).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "uid1",
          source: "ingestion",
          stage: "oura.pull",
          reasonCode: "OURA_PULL_FAILED",
        }),
      );
      expect(res.body.failuresWritten).toBe(1);
      expect(res.body.failureWriteErrors).toBe(0);
    });

    it("writes FailureEntry when performOuraPullNowCore throws", async () => {
      mockRegistryGet.mockResolvedValueOnce({ docs: [registryDoc("uid1")] });
      mockPerformOuraPullNowCore.mockRejectedValueOnce(new Error("Network error"));

      const res = await request(app)
        .post("/integrations/oura/pull")
        .set("x-goog-authenticated-user-email", "accounts.google.com:invoker@proj.iam.gserviceaccount.com");
      expect(res.status).toBe(200);
      expect(writeFailure.writeFailure).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "uid1",
          source: "ingestion",
          stage: "oura.pull",
          reasonCode: "OURA_PULL_ERROR",
        }),
      );
      expect(res.body.failuresWritten).toBe(1);
    });
  });
});
