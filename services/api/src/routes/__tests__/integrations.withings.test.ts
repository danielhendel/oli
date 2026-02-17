/**
 * Phase 3A — Withings OAuth routes: connect, callback (failureState + metadata write path), revoke.
 */

import express from "express";
import request from "supertest";

import integrationsRoutes, { handleWithingsCallback } from "../../routes/integrations";
import { userCollection } from "../../db";
import * as withingsSecrets from "../../lib/withingsSecrets";
import { validateAndConsumeState } from "../../lib/oauthState";
import { allowConsoleForThisTest } from "../../../../../scripts/test/consoleGuard";

jest.mock("../../db", () => {
  const setFn = jest.fn().mockResolvedValue(undefined);
  const deleteFn = jest.fn().mockResolvedValue(undefined);
  const docMock = { set: setFn, delete: deleteFn };
  return {
    userCollection: jest.fn(),
    FieldValue: { serverTimestamp: () => ({ _serverTimestamp: true }) },
    withingsConnectedRegistryDoc: jest.fn(() => docMock),
    __registryDocMock: docMock,
  };
});

jest.mock("../../lib/withingsSecrets", () => {
  class WithingsConfigError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "WithingsConfigError";
    }
  }
  return {
    WithingsConfigError,
    getClientSecret: jest.fn(),
    setRefreshToken: jest.fn(),
    deleteRefreshToken: jest.fn(),
  };
});

jest.mock("../../lib/oauthState", () => ({
  createStateAsync: jest.fn(),
  validateAndConsumeState: jest.fn(),
}));

const canonicalRedirectUri = "https://api.example.com/integrations/withings/callback";

describe("Withings integrations (Phase 3A)", () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as unknown as { uid: string; rid: string }).uid = "user_123";
      (req as unknown as { rid: string }).rid = "req-1";
      next();
    });
    app.use("/integrations", integrationsRoutes);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.WITHINGS_CLIENT_ID = "test-client";
    process.env.WITHINGS_REDIRECT_URI = "";
    const db = require("../../db") as { withingsConnectedRegistryDoc: jest.Mock; __registryDocMock: { set: jest.Mock; delete: jest.Mock } };
    db.withingsConnectedRegistryDoc.mockImplementation(() => db.__registryDocMock);
  });

  describe("GET /integrations/withings/connect", () => {
    let prevPublicBaseUrl: string | undefined;

    beforeEach(() => {
      prevPublicBaseUrl = process.env.PUBLIC_BASE_URL;
      process.env.PUBLIC_BASE_URL = "https://api.example.com";
    });

    afterEach(() => {
      process.env.PUBLIC_BASE_URL = prevPublicBaseUrl;
    });

    it("returns authorization URL when state is created", async () => {
      (validateAndConsumeState as unknown as jest.Mock).mockResolvedValue({ ok: false });
      const createStateAsync = require("../../lib/oauthState").createStateAsync as jest.Mock;
      createStateAsync.mockResolvedValue({ stateForRedirect: "user_123:abc123" });

      const res = await request(app)
        .get("/integrations/withings/connect")
        .set("Authorization", "Bearer fake")
        .set("Host", "api.example.com")
        .set("x-forwarded-host", "api.example.com")
        .set("x-forwarded-proto", "https");
      expect(res.status).toBe(200);
      const json = res.body as { ok: boolean; url: string };
      expect(json.ok).toBe(true);
      expect(json.url).toContain("account.withings.com");
      expect(json.url).toContain("state=user_123%3Aabc123");
      expect(json.url).toContain("scope=user.metrics");
      expect(json.url).toContain(`redirect_uri=${encodeURIComponent(canonicalRedirectUri)}`);
    });

    it("when WITHINGS_REDIRECT_URI is blank, uses canonical redirect URI from PUBLIC_BASE_URL", async () => {
      process.env.WITHINGS_REDIRECT_URI = "";
      const createStateAsync = require("../../lib/oauthState").createStateAsync as jest.Mock;
      createStateAsync.mockResolvedValue({ stateForRedirect: "user_123:abc123" });

      const res = await request(app)
        .get("/integrations/withings/connect")
        .set("Authorization", "Bearer fake")
        .set("Host", "api.example.com")
        .set("x-forwarded-host", "api.example.com")
        .set("x-forwarded-proto", "https");
      expect(res.status).toBe(200);
      const json = res.body as { ok: boolean; url: string };
      expect(json.ok).toBe(true);
      expect(json.url).toContain(`redirect_uri=${encodeURIComponent(canonicalRedirectUri)}`);
    });

    it("when WITHINGS_REDIRECT_URI is set to mismatched value, returns 500 SERVER_MISCONFIG", async () => {
      process.env.WITHINGS_REDIRECT_URI = "https://wrong.example.com/callback";

      const res = await request(app)
        .get("/integrations/withings/connect")
        .set("Authorization", "Bearer fake")
        .set("Host", "api.example.com")
        .set("x-forwarded-host", "api.example.com")
        .set("x-forwarded-proto", "https");
      expect(res.status).toBe(500);
      const json = res.body as { ok: boolean; error?: { code: string; message: string } };
      expect(json.ok).toBe(false);
      expect(json.error?.code).toBe("SERVER_MISCONFIG");
      expect(json.error?.message).toContain("WITHINGS_REDIRECT_URI mismatch");
      expect(json.error?.message).toContain(canonicalRedirectUri);
    });
  });

  /** Request mock with x-forwarded-host and x-forwarded-proto so getCanonicalRedirectUri returns canonicalRedirectUri when PUBLIC_BASE_URL is unset. */
  function callbackReq(overrides: Partial<{ query: object; get: (n: string) => string | undefined; headers: object }> = {}) {
    return {
      query: { code: "code", state: "user_123:s1" },
      get: (name: string) =>
        name === "host" ? "api.example.com" : name === "x-forwarded-host" ? "api.example.com" : name === "x-request-id" ? "req-1" : undefined,
      getHeader: (name: string) =>
        name === "host" ? "api.example.com" : name === "x-forwarded-host" ? "api.example.com" : name === "x-request-id" ? "req-1" : undefined,
      headers: { "x-forwarded-proto": "https", "x-forwarded-host": "api.example.com" },
      ...overrides,
    } as unknown as express.Request;
  }

  describe("GET /integrations/withings/callback (handleWithingsCallback)", () => {
    let prevPublicBaseUrl: string | undefined;

    beforeEach(() => {
      prevPublicBaseUrl = process.env.PUBLIC_BASE_URL;
      process.env.PUBLIC_BASE_URL = "https://api.example.com";
    });

    afterEach(() => {
      process.env.PUBLIC_BASE_URL = prevPublicBaseUrl;
    });

    it("returns 400 when state is invalid (no Firestore write — untrusted uid)", async () => {
      (validateAndConsumeState as jest.Mock).mockResolvedValue({ ok: false, reason: "state_expired" });
      const setMock = jest.fn(async () => undefined);
      (userCollection as jest.Mock).mockReturnValue({
        doc: () => ({ set: setMock }),
      });

      const req = callbackReq({
        query: { code: "auth_code_here", state: "user_123:badstate" },
      });
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        getHeader: () => "req-1",
      } as unknown as express.Response;

      await handleWithingsCallback(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({ message: expect.stringContaining("state_expired") }),
        }),
      );
      // Do not write failureState when state is invalid (no trusted uid)
      expect(setMock).not.toHaveBeenCalled();
    });

    it("writes failureState when state is valid but OAuth config is missing", async () => {
      allowConsoleForThisTest({ error: [/withings_callback_misconfig/] });
      (validateAndConsumeState as jest.Mock).mockResolvedValue({ ok: true, uid: "user_123", stateId: "s1" });
      (withingsSecrets.getClientSecret as jest.Mock).mockResolvedValue(null);

      const setMock = jest.fn(async () => undefined);
      (userCollection as jest.Mock).mockReturnValue({
        doc: () => ({ set: setMock }),
      });

      const req = callbackReq();
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        getHeader: () => "req-1",
      } as unknown as express.Response;

      await handleWithingsCallback(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(setMock).toHaveBeenCalledTimes(1);
      const written = setMock.mock.calls[0][0];
      expect(written.connected).toBe(false);
      expect(written.failureState).toEqual(
        expect.objectContaining({
          code: "WITHINGS_OAUTH_MISCONFIG",
          message: "Withings OAuth not configured",
        }),
      );
    });

    it("returns 500 and writes failureState when WITHINGS_REDIRECT_URI is set to mismatched value", async () => {
      process.env.WITHINGS_REDIRECT_URI = "https://wrong.example.com/callback";
      (validateAndConsumeState as jest.Mock).mockResolvedValue({ ok: true, uid: "user_123", stateId: "s1" });

      const setMock = jest.fn(async () => undefined);
      (userCollection as jest.Mock).mockReturnValue({
        doc: () => ({ set: setMock }),
      });

      const req = callbackReq();
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        getHeader: () => "req-1",
      } as unknown as express.Response;

      await handleWithingsCallback(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: "SERVER_MISCONFIG",
            message: expect.stringMatching(/WITHINGS_REDIRECT_URI mismatch|Expected/),
            requestId: "req-1",
          }),
        }),
      );
      expect(setMock).toHaveBeenCalledTimes(1);
      const written = setMock.mock.calls[0][0];
      expect(written.connected).toBe(false);
      expect(written.failureState).toEqual(
        expect.objectContaining({
          code: "WITHINGS_OAUTH_MISCONFIG",
          message: "WITHINGS_REDIRECT_URI mismatch or host missing",
        }),
      );
    });

    it("returns 500 and writes failureState when project id / Secret Manager config is missing (no throw)", async () => {
      allowConsoleForThisTest({ error: [/withings_callback_secret_manager_config_missing/] });
      (validateAndConsumeState as jest.Mock).mockResolvedValue({ ok: true, uid: "user_123", stateId: "s1" });
      (withingsSecrets.getClientSecret as jest.Mock).mockRejectedValue(
        new withingsSecrets.WithingsConfigError("Withings secrets: missing project id (env or ADC)"),
      );

      const setMock = jest.fn(async () => undefined);
      (userCollection as jest.Mock).mockReturnValue({
        doc: () => ({ set: setMock }),
      });

      const req = callbackReq();
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        getHeader: () => "req-1",
      } as unknown as express.Response;

      await handleWithingsCallback(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: "WITHINGS_SECRET_MANAGER_CONFIG_MISSING",
            message: "Secret Manager not configured",
            requestId: "req-1",
          }),
        }),
      );
      expect(setMock).toHaveBeenCalledTimes(1);
      const written = setMock.mock.calls[0][0];
      expect(written.connected).toBe(false);
      expect(written.failureState).toEqual(
        expect.objectContaining({
          code: "WITHINGS_SECRET_MANAGER_CONFIG_MISSING",
          message: "Secret Manager not configured",
        }),
      );
    });

    it("writes integration metadata (connected, scopes) on successful token exchange", async () => {
      (validateAndConsumeState as jest.Mock).mockResolvedValue({ ok: true, uid: "user_123", stateId: "s1" });
      (withingsSecrets.getClientSecret as jest.Mock).mockResolvedValue("client_secret");
      (withingsSecrets.setRefreshToken as jest.Mock).mockResolvedValue(undefined);

      const setMock = jest.fn(async () => undefined);
      (userCollection as jest.Mock).mockReturnValue({
        doc: () => ({ set: setMock }),
      });

      const originalFetch = globalThis.fetch;
      let capturedBody: string | undefined;
      globalThis.fetch = jest.fn((_url: unknown, init?: RequestInit) => {
        const b = init?.body;
        capturedBody =
          b instanceof URLSearchParams ? b.toString() : typeof b === "string" ? b : undefined;
        return Promise.resolve({
          status: 200,
          json: async () => ({ status: 0, body: { refresh_token: "rt_xyz", access_token: "at_xyz" } }),
        }) as Promise<Response>;
      }) as unknown as typeof fetch;

      const req = callbackReq({ query: { code: "valid_code", state: "user_123:s1" } });
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        redirect: jest.fn().mockReturnThis(),
        getHeader: () => "req-1",
      } as unknown as express.Response;

      await handleWithingsCallback(req, res);

      globalThis.fetch = originalFetch;

      expect(res.redirect).toHaveBeenCalledWith(
        302,
        "https://api.example.com/integrations/withings/complete",
      );
      const params = new URLSearchParams(capturedBody ?? "");
      expect(params.get("redirect_uri")).toBe(canonicalRedirectUri);
      expect(withingsSecrets.setRefreshToken).toHaveBeenCalledWith("user_123", "rt_xyz");
      const integrationSet = setMock.mock.calls.find((c) => c[0].connected === true);
      expect(integrationSet).toBeDefined();
      expect(integrationSet[0]).toMatchObject({
        connected: true,
        scopes: ["user.metrics"],
        revoked: false,
        failureState: null,
      });
      const db = require("../../db") as { __registryDocMock: { set: jest.Mock } };
      expect(db.__registryDocMock.set).toHaveBeenCalledWith(
        expect.objectContaining({ connected: true }),
        { merge: true },
      );
    });
  });

  describe("POST /integrations/withings/revoke", () => {
    it("deletes registry doc and sets integration revoked", async () => {
      (withingsSecrets.deleteRefreshToken as jest.Mock).mockResolvedValue(undefined);
      const setMock = jest.fn().mockResolvedValue(undefined);
      (userCollection as jest.Mock).mockReturnValue({
        doc: () => ({ set: setMock }),
      });

      const res = await request(app)
        .post("/integrations/withings/revoke")
        .set("Authorization", "Bearer fake");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({ connected: false, revoked: true, failureState: null }),
        { merge: true },
      );
      const db = require("../../db") as { __registryDocMock: { delete: jest.Mock } };
      expect(db.__registryDocMock.delete).toHaveBeenCalled();
    });
  });

  describe("GET /integrations/withings/status", () => {
    it("returns 401 when not authed (no uid)", async () => {
      const appNoAuth = express();
      appNoAuth.use(express.json());
      appNoAuth.use("/integrations", integrationsRoutes);

      const res = await request(appNoAuth).get("/integrations/withings/status");
      expect(res.status).toBe(401);
      expect(res.body?.ok).toBe(false);
      expect(res.body?.error?.code).toBe("UNAUTHORIZED");
    });

    it("returns 200 with connected:false defaults when doc missing", async () => {
      (userCollection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue({ exists: false }),
        }),
      });

      const res = await request(app)
        .get("/integrations/withings/status")
        .set("Authorization", "Bearer fake");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        ok: true,
        connected: false,
        scopes: [],
        connectedAt: null,
        revoked: false,
        failureState: null,
      });
    });

    it("returns 200 with connected:true when doc has connected true", async () => {
      const connectedAt = new Date("2026-02-15T12:00:00.000Z");
      const setMock = jest.fn().mockResolvedValue(undefined);
      const dataWithBackfill = () => ({
        connected: true,
        scopes: ["user.metrics"],
        connectedAt: { toDate: () => connectedAt },
        revoked: false,
        failureState: null,
        backfill: {
          status: "running",
          yearsBack: 10,
          chunkDays: 90,
          maxChunksPerRun: 5,
          cursorStartSec: 1,
          cursorEndSec: 2,
          processedCount: 0,
          lastError: null,
          updatedAt: { toDate: () => new Date() },
        },
      });
      (userCollection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: jest.fn()
            .mockResolvedValueOnce({
              exists: true,
              data: () => ({
                connected: true,
                scopes: ["user.metrics"],
                connectedAt: { toDate: () => connectedAt },
                revoked: false,
                failureState: null,
                backfill: undefined,
              }),
            })
            .mockResolvedValueOnce({
              exists: true,
              data: dataWithBackfill,
            }),
          set: setMock,
        }),
      });

      const res = await request(app)
        .get("/integrations/withings/status")
        .set("Authorization", "Bearer fake");
      expect(res.status).toBe(200);
      expect(res.body?.ok).toBe(true);
      expect(res.body?.connected).toBe(true);
      expect(res.body?.scopes).toEqual(["user.metrics"]);
      expect(res.body?.connectedAt).toBe("2026-02-15T12:00:00.000Z");
      expect(res.body?.revoked).toBe(false);
      expect(res.body?.failureState).toBeNull();
      expect(setMock).toHaveBeenCalledTimes(1);
      expect(res.body?.backfill?.status).toBe("running");
    });
  });
});
