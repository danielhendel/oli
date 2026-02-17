/**
 * Invoker auth: Bearer ID token path (verifyIdToken + audience + allowlist).
 * Ensures production fail-closed and allowlist/audience requirements.
 */

import express from "express";
import request from "supertest";

const FUNCTIONS_SA_EMAIL = "oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com";
const AUDIENCE_ORIGIN = "https://oli-api-1010034434203.us-central1.run.app";
const AUDIENCE_FULL = `${AUDIENCE_ORIGIN}/integrations/withings/backfill`;

const mockVerifyIdToken = jest.fn();
jest.mock("google-auth-library", () => ({
  OAuth2Client: class MockOAuth2Client {
    verifyIdToken(options: unknown) {
      return mockVerifyIdToken(options);
    }
  },
}));

describe("requireInvokerAuth — Bearer ID token path", () => {
  let app: express.Express;
  let requireInvokerAuth: (req: express.Request, res: express.Response, next: express.NextFunction) => void;
  const FUNCTIONS_SA_SUB = "107517467455664443765";
  let prevNodeEnv: string | undefined;
  let prevAllowlist: string | undefined;
  let prevSubAllowlist: string | undefined;
  let prevAudience: string | undefined;

  beforeAll(() => {
    jest.resetModules();
    requireInvokerAuth = require("../invokerAuth").requireInvokerAuth;
    app = express();
    app.use(express.json());
    app.use("/backfill", requireInvokerAuth, (_req, res) => {
      res.status(200).json({ ok: true });
    });
  });

  beforeEach(() => {
    jest.resetAllMocks();
    prevNodeEnv = process.env.NODE_ENV;
    prevAllowlist = process.env.WITHINGS_PULL_INVOKER_EMAILS;
    prevSubAllowlist = process.env.WITHINGS_PULL_INVOKER_SUBS;
    prevAudience = process.env.INVOKER_TOKEN_AUDIENCE;
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({ email: FUNCTIONS_SA_EMAIL }),
    });
  });

  afterEach(() => {
    process.env.NODE_ENV = prevNodeEnv;
    process.env.WITHINGS_PULL_INVOKER_EMAILS = prevAllowlist;
    process.env.WITHINGS_PULL_INVOKER_SUBS = prevSubAllowlist;
    process.env.INVOKER_TOKEN_AUDIENCE = prevAudience;
  });

  it("accepts Bearer ID token when allowlist and audience set (production)", async () => {
    process.env.NODE_ENV = "production";
    process.env.WITHINGS_PULL_INVOKER_EMAILS = FUNCTIONS_SA_EMAIL;
    process.env.INVOKER_TOKEN_AUDIENCE = AUDIENCE_FULL;

    const res = await request(app)
      .post("/backfill")
      .set("Authorization", "Bearer fake-id-token")
      .set("Host", "oli-api-1010034434203.us-central1.run.app")
      .send({ mode: "resume" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(mockVerifyIdToken).toHaveBeenCalledWith({
      idToken: "fake-id-token",
      audience: AUDIENCE_FULL,
    });
  });

  it("returns 403 INVOKER_ALLOWLIST_REQUIRED when allowlist missing in production (Bearer path)", async () => {
    process.env.NODE_ENV = "production";
    process.env.WITHINGS_PULL_INVOKER_EMAILS = "";
    process.env.WITHINGS_PULL_INVOKER_SUBS = "";
    process.env.INVOKER_TOKEN_AUDIENCE = AUDIENCE_FULL;

    const res = await request(app)
      .post("/backfill")
      .set("Authorization", "Bearer fake-id-token")
      .send({ mode: "resume" });

    expect(res.status).toBe(403);
    expect(res.body?.ok).toBe(false);
    expect(res.body?.error?.code).toBe("INVOKER_ALLOWLIST_REQUIRED");
  });

  it("returns 403 INVOKER_AUDIENCE_REQUIRED when INVOKER_TOKEN_AUDIENCE missing and request has Bearer", async () => {
    process.env.NODE_ENV = "production";
    process.env.WITHINGS_PULL_INVOKER_EMAILS = FUNCTIONS_SA_EMAIL;
    delete process.env.INVOKER_TOKEN_AUDIENCE;

    const res = await request(app)
      .post("/backfill")
      .set("Authorization", "Bearer fake-id-token")
      .send({ mode: "resume" });

    expect(res.status).toBe(403);
    expect(res.body?.ok).toBe(false);
    expect(res.body?.error?.code).toBe("INVOKER_AUDIENCE_REQUIRED");
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it("returns 403 INVOKER_TOKEN_INVALID when verifyIdToken throws", async () => {
    process.env.NODE_ENV = "production";
    process.env.WITHINGS_PULL_INVOKER_EMAILS = FUNCTIONS_SA_EMAIL;
    process.env.INVOKER_TOKEN_AUDIENCE = AUDIENCE_FULL;
    mockVerifyIdToken.mockRejectedValue(new Error("invalid token"));

    const res = await request(app)
      .post("/backfill")
      .set("Authorization", "Bearer bad-token")
      .send({ mode: "resume" });

    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe("INVOKER_TOKEN_INVALID");
  });

  it("returns 403 INVOKER_FORBIDDEN when token email not in allowlist", async () => {
    process.env.NODE_ENV = "production";
    process.env.WITHINGS_PULL_INVOKER_EMAILS = "other@project.iam.gserviceaccount.com";
    process.env.INVOKER_TOKEN_AUDIENCE = AUDIENCE_FULL;
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({ email: FUNCTIONS_SA_EMAIL }),
    });

    const res = await request(app)
      .post("/backfill")
      .set("Authorization", "Bearer fake-id-token")
      .send({ mode: "resume" });

    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe("INVOKER_FORBIDDEN");
  });

  it("accepts Bearer ID token when token has no email but sub in WITHINGS_PULL_INVOKER_SUBS (production)", async () => {
    process.env.NODE_ENV = "production";
    process.env.WITHINGS_PULL_INVOKER_EMAILS = "";
    process.env.WITHINGS_PULL_INVOKER_SUBS = FUNCTIONS_SA_SUB;
    process.env.INVOKER_TOKEN_AUDIENCE = AUDIENCE_FULL;
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({ sub: FUNCTIONS_SA_SUB }),
    });

    const res = await request(app)
      .post("/backfill")
      .set("Authorization", "Bearer fake-id-token")
      .set("Host", "oli-api-1010034434203.us-central1.run.app")
      .send({ mode: "resume" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("returns 403 INVOKER_TOKEN_INVALID when token has no email and sub not in allowlist", async () => {
    process.env.NODE_ENV = "production";
    process.env.WITHINGS_PULL_INVOKER_EMAILS = "";
    process.env.WITHINGS_PULL_INVOKER_SUBS = "other-sub-id";
    process.env.INVOKER_TOKEN_AUDIENCE = AUDIENCE_FULL;
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({ sub: FUNCTIONS_SA_SUB }),
    });

    const res = await request(app)
      .post("/backfill")
      .set("Authorization", "Bearer fake-id-token")
      .send({ mode: "resume" });

    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe("INVOKER_TOKEN_INVALID");
  });
});
