/**
 * GET /integrations/oura/callback — OAuth callback; redirects to complete and kicks off auto-sync.
 */
import express from "express";
import request from "supertest";

const mockPerformOuraPullNowCore = jest.fn().mockResolvedValue({ statusCode: 200, body: { ok: true } });

jest.mock("../ouraPullNow", () => ({
  ...jest.requireActual("../ouraPullNow"),
  performOuraPullNowCore: (...args: unknown[]) => mockPerformOuraPullNowCore(...args),
}));

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockDoc = jest.fn();

jest.mock("../../../db", () => ({
  userCollection: jest.fn(() => ({
    doc: (...args: unknown[]) => mockDoc(...args),
  })),
  FieldValue: { serverTimestamp: () => ({ _serverTimestamp: true }) },
  withingsConnectedRegistryDoc: jest.fn(() => ({ set: jest.fn(), delete: jest.fn() })),
  ouraConnectedRegistryDoc: jest.fn(() => ({ set: jest.fn().mockResolvedValue(undefined), delete: jest.fn() })),
}));

jest.mock("../../../lib/ouraSecrets", () => ({
  getClientSecret: jest.fn().mockResolvedValue("client-secret"),
  setRefreshToken: jest.fn().mockResolvedValue(undefined),
  deleteRefreshToken: jest.fn(),
  OuraConfigError: class OuraConfigError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "OuraConfigError";
    }
  },
}));

jest.mock("../../../lib/oauthState", () => ({
  createStateAsync: jest.fn(),
  validateAndConsumeState: jest.fn(),
}));

import { handleOuraCallback } from "../../integrations";

describe("GET /integrations/oura/callback", () => {
  let app: express.Express;
  const validateAndConsumeState = require("../../../lib/oauthState").validateAndConsumeState as jest.Mock;

  beforeAll(() => {
    app = express();
    app.get("/integrations/oura/callback", (req, res) => {
      void handleOuraCallback(req, res);
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockDoc.mockReturnValue({ get: mockGet, set: mockSet });
    mockGet.mockResolvedValue({ exists: false });
    mockSet.mockResolvedValue(undefined);
    process.env.OURA_CLIENT_ID = "oura-client";
    process.env.PUBLIC_BASE_URL = "https://api.example.com";
    process.env.OURA_REDIRECT_URI = "https://api.example.com/integrations/oura/callback";
    validateAndConsumeState.mockResolvedValue({
      ok: true,
      uid: "user_oura_cb",
    });
    (global as unknown as { fetch: unknown }).fetch = jest.fn().mockResolvedValue({
      status: 200,
      json: () =>
        Promise.resolve({
          access_token: "at",
          refresh_token: "rt",
          expires_in: 3600,
        }),
    });
  });

  it("redirects to completion URL and invokes performOuraPullNowCore after success", async () => {
    const res = await request(app)
      .get("/integrations/oura/callback")
      .query({ code: "auth_code", state: "valid_state" })
      .set("Host", "api.example.com")
      .set("x-forwarded-host", "api.example.com")
      .set("x-forwarded-proto", "https");

    expect(res.status).toBe(302);
    expect(res.header.location).toBe("https://api.example.com/integrations/oura/complete");

    await new Promise((r) => setImmediate(r));
    expect(mockPerformOuraPullNowCore).toHaveBeenCalledWith("user_oura_cb", expect.any(String));
  });

  it("returns 400 when code or state is missing", async () => {
    validateAndConsumeState.mockResolvedValue({ ok: true, uid: "u1" });
    const res = await request(app).get("/integrations/oura/callback").query({ state: "s" });
    expect(res.status).toBe(400);
    expect(mockPerformOuraPullNowCore).not.toHaveBeenCalled();
  });
});
