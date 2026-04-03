/**
 * Oura integration routes: status (integration record), connect (OAuth URL), revoke.
 */
import express from "express";
import request from "supertest";

import integrationsRoutes from "../../integrations";

const mockGet = jest.fn();
const mockSet = jest.fn();

jest.mock("../../../db", () => ({
  userCollection: jest.fn(() => ({
    doc: jest.fn(() => ({ get: mockGet, set: mockSet })),
  })),
  FieldValue: { serverTimestamp: () => ({ _serverTimestamp: true }) },
  ouraConnectedRegistryDoc: jest.fn(() => ({ set: jest.fn(), delete: jest.fn() })),
}));

jest.mock("../../../lib/ouraSecrets", () => ({
  getClientSecret: jest.fn(),
  setRefreshToken: jest.fn(),
  deleteRefreshToken: jest.fn(),
}));

jest.mock("../../../lib/oauthState", () => ({
  createStateAsync: jest.fn(),
  validateAndConsumeState: jest.fn(),
}));

describe("GET /integrations/oura/status", () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use((req, _res, next) => {
      (req as unknown as { uid: string; rid: string }).uid = "user_123";
      (req as unknown as { rid: string }).rid = "req-oura-status";
      next();
    });
    app.use("/integrations", integrationsRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when uid is missing", async () => {
    const appNoUid = express();
    appNoUid.use("/integrations", integrationsRoutes);
    const res = await request(appNoUid).get("/integrations/oura/status");
    expect(res.status).toBe(401);
  });

  it("returns connected false and lastSyncAt null when no integration doc", async () => {
    mockGet.mockResolvedValue({ exists: false });
    const res = await request(app).get("/integrations/oura/status");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      requestId: "req-oura-status",
      connected: false,
      lastSyncAt: null,
    });
  });

  it("returns connected true and lastSyncAt when integration doc exists", async () => {
    const connectedAt = new Date("2025-03-13T10:00:00.000Z");
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        connected: true,
        connectedAt,
        lastSyncAt: "2025-03-13T12:00:00.000Z",
        revoked: false,
        failureState: null,
      }),
    });
    const res = await request(app).get("/integrations/oura/status");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.connected).toBe(true);
    expect(res.body.lastSyncAt).toBe("2025-03-13T12:00:00.000Z");
    expect(res.body).toHaveProperty("backfillStatus");
    expect(res.body).toHaveProperty("backfillStartedAt");
    expect(res.body).toHaveProperty("backfillCompletedAt");
    expect(res.body).toHaveProperty("backfillFailedAt");
    expect(res.body).toHaveProperty("lastBackfillError");
  });

  it("returns backfill fields when integration doc has backfill state", async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        connected: true,
        lastSyncAt: null,
        lastRefreshAt: "2025-03-14T10:00:00.000Z",
        lastSnapshotAt: null,
        revoked: false,
        failureState: null,
        backfillStatus: "completed",
        backfillStartedAt: "2025-03-14T09:00:00.000Z",
        backfillCompletedAt: "2025-03-14T09:05:00.000Z",
        backfillFailedAt: null,
        lastBackfillError: null,
      }),
    });
    const res = await request(app).get("/integrations/oura/status");
    expect(res.status).toBe(200);
    expect(res.body.backfillStatus).toBe("completed");
    expect(res.body.backfillStartedAt).toBe("2025-03-14T09:00:00.000Z");
    expect(res.body.backfillCompletedAt).toBe("2025-03-14T09:05:00.000Z");
    expect(res.body.lastBackfillError).toBe(null);
  });
});

describe("GET /integrations/oura/connect", () => {
  let app: express.Express;
  const createStateAsync = require("../../../lib/oauthState").createStateAsync as jest.Mock;

  beforeAll(() => {
    app = express();
    app.use((req, _res, next) => {
      (req as unknown as { uid: string; rid: string }).uid = "user_123";
      (req as unknown as { rid: string }).rid = "req-oura-connect";
      next();
    });
    app.use("/integrations", integrationsRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OURA_CLIENT_ID = "oura-test-client";
    process.env.PUBLIC_BASE_URL = "https://api.example.com";
    process.env.OURA_REDIRECT_URI = "";
    createStateAsync.mockResolvedValue({ stateForRedirect: "user_123:oura-state-abc" });
  });

  it("returns 401 when uid is missing", async () => {
    const appNoUid = express();
    appNoUid.use("/integrations", integrationsRoutes);
    const res = await request(appNoUid).get("/integrations/oura/connect");
    expect(res.status).toBe(401);
  });

  it("returns OAuth URL when configured", async () => {
    const res = await request(app)
      .get("/integrations/oura/connect")
      .set("Host", "api.example.com")
      .set("x-forwarded-host", "api.example.com")
      .set("x-forwarded-proto", "https");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.url).toContain("cloud.ouraring.com/oauth/authorize");
    expect(res.body.url).toContain("state=user_123%3Aoura-state-abc");
    expect(res.body.url).toContain("response_type=code");
    expect(res.body.url).toContain("client_id=oura-test-client");
  });
});

describe("POST /integrations/oura/revoke", () => {
  let app: express.Express;
  const ouraSecrets = require("../../../lib/ouraSecrets") as {
    deleteRefreshToken: jest.Mock;
  };

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as unknown as { uid: string; rid: string }).uid = "user_123";
      (req as unknown as { rid: string }).rid = "req-oura-revoke";
      next();
    });
    app.use("/integrations", integrationsRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSet.mockResolvedValue(undefined);
    ouraSecrets.deleteRefreshToken.mockResolvedValue(undefined);
  });

  it("returns 401 when uid is missing", async () => {
    const appNoUid = express();
    appNoUid.use(express.json());
    appNoUid.use("/integrations", integrationsRoutes);
    const res = await request(appNoUid).post("/integrations/oura/revoke");
    expect(res.status).toBe(401);
  });

  it("returns 200 and clears integration when revoke succeeds", async () => {
    const res = await request(app).post("/integrations/oura/revoke");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(ouraSecrets.deleteRefreshToken).toHaveBeenCalledWith("user_123");
    expect(mockSet).toHaveBeenCalled();
  });
});
