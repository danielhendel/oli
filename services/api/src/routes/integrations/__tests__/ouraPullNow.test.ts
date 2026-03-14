/**
 * POST /integrations/oura/pull-now — user-authenticated Oura first-sync; fetch sleep + HRV, write raw events.
 */

import express from "express";
import request from "supertest";
import { allowConsoleForThisTest } from "../../../../../../scripts/test/consoleGuard";
import ouraPullNowRouter from "../ouraPullNow";

const requestRecordState: Record<
  string,
  { status: string; statusCode?: number; result?: Record<string, unknown> }
> = {};

const mockUserCollection = jest.fn();
const mockRegistryDelete = jest.fn().mockResolvedValue(undefined);

function makeRequestRecordRef(id: string) {
  return {
    create: jest.fn().mockImplementation(async (data: Record<string, unknown>) => {
      if (requestRecordState[id]) {
        const err = new Error("ALREADY_EXISTS") as Error & { code?: number };
        err.code = 6;
        throw err;
      }
      requestRecordState[id] = { ...(data as { status: string }), status: "in_progress" };
    }),
    get: jest.fn().mockImplementation(async () => ({
      exists: !!requestRecordState[id],
      data: () => requestRecordState[id],
    })),
    set: jest.fn().mockImplementation(async (data: Record<string, unknown>, opts?: { merge?: boolean }) => {
      const existing = requestRecordState[id] ?? {};
      requestRecordState[id] = (opts?.merge ? { ...existing, ...data } : { ...data }) as typeof requestRecordState[string];
    }),
  };
}

jest.mock("../../../db", () => ({
  userCollection: (...args: unknown[]) => mockUserCollection(...args),
  FieldValue: { serverTimestamp: () => ({ _serverTimestamp: true }) },
  ouraConnectedRegistryDoc: jest.fn(() => ({ delete: mockRegistryDelete })),
}));

jest.mock("../../../lib/ouraSecrets", () => ({
  getRefreshToken: jest.fn(),
  getClientSecret: jest.fn(),
  setRefreshToken: jest.fn().mockResolvedValue(undefined),
  deleteRefreshToken: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../../lib/ouraApi", () => ({
  refreshOuraAccessToken: jest.fn(),
  fetchOuraSleep: jest.fn(),
  fetchOuraDailyReadiness: jest.fn(),
  mapOuraSleepToIngestItem: jest.fn((d: { id?: string; bed_time?: string; wake_time?: string; total_sleep_duration?: number; type?: string }) =>
    d.bed_time && d.wake_time
      ? {
          idempotencyKey: d.id ?? "sleep_1",
          start: d.bed_time,
          end: d.wake_time,
          timezone: "UTC",
          day: d.bed_time.slice(0, 10),
          totalMinutes: Math.round((d.total_sleep_duration ?? 0) / 60),
          isMainSleep: d.type === "long_sleep",
        }
      : null,
  ),
  mapOuraReadinessToHrvItem: jest.fn((d: { id?: string; day?: string; timestamp?: string; rmssd_5min?: number }) =>
    (d.day || d.timestamp)
      ? {
          idempotencyKey: d.id ?? "hrv_1",
          time: d.timestamp ?? `${d.day}T12:00:00.000Z`,
          timezone: "UTC",
          day: d.day ?? (d.timestamp ? d.timestamp.slice(0, 10) : undefined),
          rmssdMs: d.rmssd_5min ?? undefined,
          measurementType: "nightly" as const,
        }
      : null,
  ),
  OuraApiError: class OuraApiError extends Error {
    code: string;
    status?: number;
    constructor(message: string, code: string, status?: number) {
      super(message);
      this.code = code;
      this.status = status;
    }
  },
}));

jest.mock("../../../lib/ouraIngestWrite", () => ({
  writeOuraRawEvents: jest.fn().mockResolvedValue({ eventsCreated: 2, eventsAlreadyExists: 0 }),
}));

jest.mock("../../../lib/writeFailure", () => ({
  writeFailure: jest.fn().mockResolvedValue({ id: "fail_1" }),
}));

const ouraSecrets = require("../../../lib/ouraSecrets");
const ouraApi = require("../../../lib/ouraApi");
const ouraIngestWrite = require("../../../lib/ouraIngestWrite");

describe("POST /integrations/oura/pull-now", () => {
  let app: express.Express;
  let appNoUid: express.Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as unknown as { uid: string; rid: string }).uid = "user_oura_1";
      (req as unknown as { rid: string }).rid = "req-oura-pull";
      next();
    });
    app.use("/integrations/oura/pull-now", ouraPullNowRouter);

    appNoUid = express();
    appNoUid.use(express.json());
    appNoUid.use((req, _res, next) => {
      (req as unknown as { rid: string }).rid = "req-no-uid";
      next();
    });
    appNoUid.use("/integrations/oura/pull-now", ouraPullNowRouter);
  });

  beforeEach(() => {
    allowConsoleForThisTest({
      error: [(args: unknown[]) => String(args[0] ?? "").includes("oura_pull_now")],
    });
    jest.clearAllMocks();
    Object.keys(requestRecordState).forEach((k) => delete requestRecordState[k]);
    (ouraSecrets.getRefreshToken as jest.Mock).mockResolvedValue("rt_xxx");
    (ouraSecrets.getClientSecret as jest.Mock).mockResolvedValue("secret");
    (ouraApi.refreshOuraAccessToken as jest.Mock).mockResolvedValue({
      access_token: "at_yyy",
      refresh_token: "rt_new",
      expires_in: 86400,
    });
    (ouraApi.fetchOuraSleep as jest.Mock).mockResolvedValue([
      { id: "s1", bed_time: "2025-03-13T22:00:00Z", wake_time: "2025-03-14T06:00:00Z", total_sleep_duration: 28800, type: "long_sleep" },
    ]);
    (ouraApi.fetchOuraDailyReadiness as jest.Mock).mockResolvedValue([
      { id: "r1", day: "2025-03-14", timestamp: "2025-03-14T08:00:00Z", rmssd_5min: 42 },
    ]);
    (ouraIngestWrite.writeOuraRawEvents as jest.Mock).mockResolvedValue({ eventsCreated: 2, eventsAlreadyExists: 0 });

    mockUserCollection.mockImplementation((uid: string, col: string) => {
      if (col === "requestRecords") {
        return { doc: (id: string) => makeRequestRecordRef(id) };
      }
      if (col === "integrations") {
        return {
          doc: () => ({
            set: jest.fn().mockResolvedValue(undefined),
          }),
        };
      }
      return { doc: () => ({ create: jest.fn().mockResolvedValue(undefined), get: jest.fn().mockResolvedValue({ exists: false }) }) };
    });
    process.env.OURA_CLIENT_ID = "oura-client-id";
  });

  it("returns 401 when uid is missing", async () => {
    const res = await request(appNoUid)
      .post("/integrations/oura/pull-now")
      .set("Idempotency-Key", "oura-pull-1");
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.error?.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 when Idempotency-Key header is missing", async () => {
    const res = await request(app).post("/integrations/oura/pull-now");
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error?.message).toContain("Idempotency-Key");
  });

  it("returns 502 when no refresh token (Oura not connected)", async () => {
    (ouraSecrets.getRefreshToken as jest.Mock).mockResolvedValue(null);
    const res = await request(app)
      .post("/integrations/oura/pull-now")
      .set("Idempotency-Key", "oura-pull-no-token");
    expect(res.status).toBe(502);
    expect(res.body.ok).toBe(false);
    expect(res.body.error?.code).toBe("OURA_NOT_CONNECTED");
  });

  it("returns 200 with eventsCreated and eventsAlreadyExists on success", async () => {
    const res = await request(app)
      .post("/integrations/oura/pull-now")
      .set("Idempotency-Key", "oura-pull-success");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.requestId).toBe("req-oura-pull");
    expect(res.body.eventsCreated).toBe(2);
    expect(res.body.eventsAlreadyExists).toBe(0);
    expect(res.body.windowDays).toBe(30);
    expect(ouraSecrets.setRefreshToken).toHaveBeenCalledWith("user_oura_1", "rt_new");
    expect(ouraIngestWrite.writeOuraRawEvents).toHaveBeenCalledWith(
      "user_oura_1",
      expect.any(Array),
      expect.any(Array),
      "req-oura-pull",
    );
  });
});
