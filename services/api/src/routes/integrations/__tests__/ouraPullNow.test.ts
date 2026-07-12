/**
 * POST /integrations/oura/pull-now — user-authenticated Oura first-sync; fetch sleep + HRV, write raw events.
 */

import express from "express";
import request from "supertest";
import { allowConsoleForThisTest } from "../../../../../../scripts/test/consoleGuard";
import ouraPullNowRouter, { performOuraPostRawPersistence } from "../ouraPullNow";

const requestRecordState: Record<
  string,
  { status: string; statusCode?: number; result?: Record<string, unknown> }
> = {};

const mockUserCollection = jest.fn();
const mockRegistryDelete = jest.fn().mockResolvedValue(undefined);

/** Integration doc ref shared so tests can set get() and assert set() calls. */
let integrationDocRef: { get: jest.Mock; set: jest.Mock };

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
  ouraSleepWakeIsoForLog: jest.fn((d: { wake_time?: string }) =>
    typeof d?.wake_time === "string" ? d.wake_time : null,
  ),
  resolveOuraSleepIngestBase: jest.fn(() => null),
  fetchOuraDailyReadiness: jest.fn(),
  fetchOuraDailySleep: jest.fn().mockResolvedValue([]),
  fetchOuraDailyStress: jest.fn().mockResolvedValue([]),
  fetchOuraPersonalInfo: jest.fn().mockResolvedValue(null),
  fetchOuraDailyActivity: jest.fn().mockResolvedValue([]),
  fetchOuraWorkouts: jest.fn().mockResolvedValue([]),
  fetchOuraSessions: jest.fn().mockResolvedValue([]),
  fetchOuraTags: jest.fn().mockResolvedValue([]),
  fetchOuraSpo2: jest.fn().mockResolvedValue([]),
  fetchOuraHeartrate: jest.fn().mockResolvedValue([]),
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
  mapOuraDailyActivityToStepsItem: jest.fn().mockReturnValue(null),
  mapOuraWorkoutToWorkoutItem: jest.fn().mockReturnValue(null),
  toOuraRawIngestItem: jest.fn((dataset: string, id: string, data: Record<string, unknown>) => ({ idempotencyKey: id, dataset, data })),
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

/**
 * Existing pull-now tests treat the token-refresh helper as a thin pass-through so
 * they don't have to mock the Firestore lease backend. End-to-end single-flight
 * semantics are covered by services/api/src/lib/__tests__/ouraTokenRefreshSingleFlight.test.ts.
 */
jest.mock("../../../lib/ouraTokenRefreshSingleFlight", () => {
  const secrets = jest.requireMock("../../../lib/ouraSecrets") as {
    getRefreshToken: jest.Mock;
    setRefreshToken: jest.Mock;
  };
  const api = jest.requireMock("../../../lib/ouraApi") as {
    refreshOuraAccessToken: jest.Mock;
    OuraApiError: typeof Error;
  };
  return {
    refreshOuraTokenSingleFlight: jest.fn(
      async (args: {
        uid: string;
        requestId: string;
        clientId: string;
        clientSecret: string;
        performReconnectCleanup: (uid: string, requestId: string) => Promise<void>;
      }) => {
        const token = await secrets.getRefreshToken(args.uid);
        if (!token) return { kind: "no_refresh_token" };
        try {
          const tokens = await api.refreshOuraAccessToken(token, args.clientId, args.clientSecret);
          await secrets.setRefreshToken(args.uid, tokens.refresh_token);
          return { kind: "refreshed", tokens, rotated: true };
        } catch (err: unknown) {
          const e = err as { code?: string; status?: number };
          if (e?.code === "OURA_TOKEN_REFRESH_FAILED" || e?.status === 401) {
            await args.performReconnectCleanup(args.uid, args.requestId);
            return { kind: "invalid_grant", cleanedUp: true };
          }
          throw err;
        }
      },
    ),
  };
});

jest.mock("../../../lib/ouraVendorSnapshot", () => ({
  writeOuraVendorSleepSnapshots: jest.fn().mockResolvedValue({
    attempted: 1,
    written: 1,
    skippedMissingDay: 0,
    errors: 0,
  }),
  writeOuraVendorReadinessSnapshots: jest.fn().mockResolvedValue({
    attempted: 1,
    written: 1,
    skippedMissingDay: 0,
    errors: 0,
  }),
  writeOuraVendorStressSnapshots: jest.fn().mockResolvedValue({
    attempted: 0,
    written: 0,
    skippedMissingDay: 0,
    errors: 0,
  }),
}));

jest.mock("../../../lib/writeFailure", () => ({
  writeFailure: jest.fn().mockResolvedValue({ id: "fail_1" }),
}));

jest.mock("../../../lib/ouraPostRawJob", () => ({
  publishOuraPostRawJob: jest.fn().mockResolvedValue("mock-message-id"),
  getOuraPostRawTopic: jest.fn().mockReturnValue(null),
}));

const ouraSecrets = require("../../../lib/ouraSecrets");
const ouraApi = require("../../../lib/ouraApi");
const ouraIngestWrite = require("../../../lib/ouraIngestWrite");
const ouraVendorSnapshot = require("../../../lib/ouraVendorSnapshot");
const ouraPostRawJob = require("../../../lib/ouraPostRawJob");

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
      error: [
        (args: unknown[]) => String(args[0] ?? "").includes("oura_pull_now"),
        (args: unknown[]) => String(args[0] ?? "").includes("oura_pull_failed"),
        (args: unknown[]) => String(args[0] ?? "").includes("oura_post_raw_persist"),
        (args: unknown[]) => String(args[0] ?? "").includes("oura_post_raw_enqueue"),
        (args: unknown[]) => String(args[0] ?? "").includes("oura_post_raw_job"),
        (args: unknown[]) => String(args[0] ?? "").includes("oura_legacy_recovery"),
        (args: unknown[]) => String(args[0] ?? "").includes("oura_reconnect"),
      ],
      warn: [
        (args: unknown[]) => String(args[0] ?? "").includes("oura_token_refresh"),
        (args: unknown[]) => String(args[0] ?? "").includes("oura_provider_fetch"),
        (args: unknown[]) => String(args[0] ?? "").includes("oura_backfill"),
      ],
    });
    jest.clearAllMocks();
    (ouraPostRawJob.getOuraPostRawTopic as jest.Mock).mockReturnValue(null);
    (ouraPostRawJob.publishOuraPostRawJob as jest.Mock).mockResolvedValue("mock-message-id");
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
    (ouraVendorSnapshot.writeOuraVendorSleepSnapshots as jest.Mock).mockResolvedValue({
      attempted: 1,
      written: 1,
      skippedMissingDay: 0,
      errors: 0,
    });
    (ouraVendorSnapshot.writeOuraVendorReadinessSnapshots as jest.Mock).mockResolvedValue({
      attempted: 1,
      written: 1,
      skippedMissingDay: 0,
      errors: 0,
    });

    integrationDocRef = {
      get: jest.fn().mockResolvedValue({ exists: false }),
      set: jest.fn().mockResolvedValue(undefined),
    };
    mockUserCollection.mockImplementation((uid: string, col: string) => {
      if (col === "requestRecords") {
        return { doc: (id: string) => makeRequestRecordRef(id) };
      }
      if (col === "integrations") {
        return { doc: () => integrationDocRef };
      }
      return {
        doc: () => ({
          create: jest.fn().mockResolvedValue(undefined),
          get: jest.fn().mockResolvedValue({ exists: false }),
          set: jest.fn().mockResolvedValue(undefined),
        }),
        where: () => ({ limit: () => ({ get: jest.fn().mockResolvedValue({ docs: [] }) }) }),
      };
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

  it("returns 202 after raw writes without waiting for snapshot completion", async () => {
    const res = await request(app)
      .post("/integrations/oura/pull-now")
      .set("Idempotency-Key", "oura-pull-success");
    expect(res.status).toBe(202);
    expect(res.body.ok).toBe(true);
    expect(res.body.requestId).toBe("req-oura-pull");
    expect(res.body.eventsCreated).toBe(2);
    expect(res.body.eventsAlreadyExists).toBe(0);
    expect(res.body.windowDays).toBe(30);
    expect(ouraSecrets.setRefreshToken).toHaveBeenCalledWith("user_oura_1", "rt_new");
    const sleepCall = (ouraApi.fetchOuraSleep as jest.Mock).mock.calls[0];
    const readinessCall = (ouraApi.fetchOuraDailyReadiness as jest.Mock).mock.calls[0];
    expect(readinessCall[1]).toBe(sleepCall[1]);
    expect(readinessCall[2]).toBe(sleepCall[2]);
    expect(ouraIngestWrite.writeOuraRawEvents).toHaveBeenCalledWith(
      "user_oura_1",
      expect.any(Array),
      expect.any(Array),
      "req-oura-pull",
      expect.objectContaining({
        stepsItems: expect.any(Array),
        workoutItems: expect.any(Array),
        ouraRawItems: expect.any(Array),
      }),
    );
  });

  it("kicks off post-raw persistence in background; snapshot writers run after response", async () => {
    const res = await request(app)
      .post("/integrations/oura/pull-now")
      .set("Idempotency-Key", "oura-pull-with-snapshots");
    expect(res.status).toBe(202);
    expect(res.body.ok).toBe(true);
    expect(ouraIngestWrite.writeOuraRawEvents).toHaveBeenCalled();
    // Allow background post-raw to run (mocks resolve immediately).
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
    expect(ouraVendorSnapshot.writeOuraVendorSleepSnapshots).toHaveBeenCalledWith(
      "user_oura_1",
      expect.any(Array),
      "req-oura-pull",
      expect.any(Array),
      expect.any(Array),
    );
    expect(ouraVendorSnapshot.writeOuraVendorReadinessSnapshots).toHaveBeenCalledWith(
      "user_oura_1",
      expect.any(Array),
      "req-oura-pull",
    );
  });

  it("post-raw writes metadata (lastRefreshAt) even when zero snapshots written", async () => {
    (ouraVendorSnapshot.writeOuraVendorSleepSnapshots as jest.Mock).mockResolvedValue({
      attempted: 0,
      written: 0,
      skippedMissingDay: 0,
      errors: 0,
    });
    (ouraVendorSnapshot.writeOuraVendorReadinessSnapshots as jest.Mock).mockResolvedValue({
      attempted: 0,
      written: 0,
      skippedMissingDay: 0,
      errors: 0,
    });
    const res = await request(app)
      .post("/integrations/oura/pull-now")
      .set("Idempotency-Key", "oura-pull-zero-snapshots");
    expect(res.status).toBe(202);
    expect(res.body.ok).toBe(true);
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
    const setCalls = (integrationDocRef.set as jest.Mock).mock.calls;
    const lastRefreshAtCall = setCalls.find(
      (c: [Record<string, unknown>, { merge?: boolean }]) =>
        c[0] && typeof c[0] === "object" && "lastRefreshAt" in c[0],
    );
    expect(lastRefreshAtCall).toBeDefined();
    expect(lastRefreshAtCall[0]).toMatchObject({ lastRefreshAt: expect.anything() });
  });

  it("post-raw errors are logged and do not affect the 202 response", async () => {
    (ouraVendorSnapshot.writeOuraVendorSleepSnapshots as jest.Mock).mockRejectedValue(
      new Error("snapshot write failed"),
    );
    const logger = require("../../../lib/logger").logger;
    const errorSpy = jest.spyOn(logger, "error").mockImplementation(() => undefined);
    const res = await request(app)
      .post("/integrations/oura/pull-now")
      .set("Idempotency-Key", "oura-pull-post-raw-fails");
    expect(res.status).toBe(202);
    expect(res.body.ok).toBe(true);
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
    const errorCalls = errorSpy.mock.calls.filter(
      (c: unknown[]) =>
        Array.isArray(c) &&
        typeof c[0] === "object" &&
        c[0] != null &&
        (c[0] as { msg?: string }).msg === "oura_post_raw_persist_failed",
    );
    expect(errorCalls.length).toBeGreaterThanOrEqual(1);
    const payload = errorCalls[0]![0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("uid");
    expect(payload).toHaveProperty("safeErrorCode");
    expect(payload).not.toHaveProperty("err");
    errorSpy.mockRestore();
  });

  it("enqueues durable post-raw job when TOPIC_OURA_POST_RAW is set", async () => {
    (ouraPostRawJob.getOuraPostRawTopic as jest.Mock).mockReturnValue("oura.post_raw.v1");
    const res = await request(app)
      .post("/integrations/oura/pull-now")
      .set("Idempotency-Key", "oura-pull-durable-job");
    expect(res.status).toBe(202);
    expect(res.body.ok).toBe(true);
    expect(ouraPostRawJob.publishOuraPostRawJob).toHaveBeenCalledWith(
      "user_oura_1",
      "req-oura-pull",
      expect.any(Array),
      expect.any(Array),
      expect.any(Array),
      expect.any(Array),
    );
    const [, , sleepDocs, readinessDocs, dailySleepDocs, dailyStressDocs] = (
      ouraPostRawJob.publishOuraPostRawJob as jest.Mock
    ).mock.calls[0];
    expect(sleepDocs).toHaveLength(1);
    expect(readinessDocs).toHaveLength(1);
    expect(dailySleepDocs).toEqual([]);
    expect(dailyStressDocs).toEqual([]);
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
    expect(ouraVendorSnapshot.writeOuraVendorSleepSnapshots).toHaveBeenCalled();
    expect(ouraVendorSnapshot.writeOuraVendorReadinessSnapshots).toHaveBeenCalled();
    expect(ouraVendorSnapshot.writeOuraVendorStressSnapshots).toHaveBeenCalled();
  });

  it("falls back to in-process post-raw when enqueue fails", async () => {
    (ouraPostRawJob.getOuraPostRawTopic as jest.Mock).mockReturnValue("oura.post_raw.v1");
    (ouraPostRawJob.publishOuraPostRawJob as jest.Mock).mockRejectedValue(new Error("pubsub unavailable"));
    const res = await request(app)
      .post("/integrations/oura/pull-now")
      .set("Idempotency-Key", "oura-pull-enqueue-fails");
    expect(res.status).toBe(202);
    expect(res.body.ok).toBe(true);
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
    expect(ouraVendorSnapshot.writeOuraVendorSleepSnapshots).toHaveBeenCalled();
    expect(ouraVendorSnapshot.writeOuraVendorReadinessSnapshots).toHaveBeenCalled();
  });

  it("legacy connected user with null backfill triggers recovery metadata path", async () => {
    integrationDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({ connected: true, lastSnapshotAt: null, backfillStatus: null }),
    });
    const res = await request(app)
      .post("/integrations/oura/pull-now")
      .set("Idempotency-Key", "oura-pull-legacy-recovery");
    expect(res.status).toBe(202);
    expect(res.body.ok).toBe(true);
    expect(integrationDocRef.set).toHaveBeenCalledWith(
      expect.objectContaining({ backfillStatus: "running", lastBackfillError: null }),
      { merge: true },
    );
  });

  it("legacy recovery does not write running when backfillStatus is already running", async () => {
    integrationDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({ connected: true, lastSnapshotAt: null, backfillStatus: "running" }),
    });
    const setCallsBefore = (integrationDocRef.set as jest.Mock).mock.calls.length;
    await request(app)
      .post("/integrations/oura/pull-now")
      .set("Idempotency-Key", "oura-pull-skip-duplicate-backfill");
    const setCallsAfter = (integrationDocRef.set as jest.Mock).mock.calls;
    const runningCalls = setCallsAfter.slice(setCallsBefore).filter((c: [Record<string, unknown>]) => c[0]?.backfillStatus === "running");
    expect(runningCalls.length).toBe(0);
  });
});

describe("performOuraPostRawPersistence", () => {
  let integrationSetMock: jest.Mock;

  beforeAll(() => {
    integrationSetMock = jest.fn().mockResolvedValue(undefined);
    mockUserCollection.mockImplementation((_uid: string, col: string) => {
      if (col === "integrations") {
        return { doc: () => ({ set: integrationSetMock, get: jest.fn().mockResolvedValue({ exists: false }) }) };
      }
      return {
        doc: () => ({
          create: jest.fn().mockResolvedValue(undefined),
          get: jest.fn().mockResolvedValue({ exists: false }),
          set: jest.fn().mockResolvedValue(undefined),
        }),
        where: () => ({ limit: () => ({ get: jest.fn().mockResolvedValue({ docs: [] }) }) }),
      };
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (ouraVendorSnapshot.writeOuraVendorSleepSnapshots as jest.Mock).mockResolvedValue({
      attempted: 1,
      written: 1,
      skippedMissingDay: 0,
      errors: 0,
    });
    (ouraVendorSnapshot.writeOuraVendorReadinessSnapshots as jest.Mock).mockResolvedValue({
      attempted: 1,
      written: 1,
      skippedMissingDay: 0,
      errors: 0,
    });
    integrationSetMock.mockResolvedValue(undefined);
  });

  it("writes vendor sleep and readiness snapshots then integration metadata", async () => {
    const sleepDocs = [
      { id: "s1", bed_time: "2025-03-13T22:00:00Z", wake_time: "2025-03-14T06:00:00Z" },
    ];
    const readinessDocs = [{ id: "r1", day: "2025-03-14", timestamp: "2025-03-14T08:00:00Z" }];

    await performOuraPostRawPersistence("uid-post-raw", "req-post-raw", sleepDocs, readinessDocs);

    expect(ouraVendorSnapshot.writeOuraVendorSleepSnapshots).toHaveBeenCalledWith(
      "uid-post-raw",
      sleepDocs,
      "req-post-raw",
      readinessDocs,
      [],
    );
    expect(ouraVendorSnapshot.writeOuraVendorReadinessSnapshots).toHaveBeenCalledWith(
      "uid-post-raw",
      readinessDocs,
      "req-post-raw",
    );
    expect(integrationSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        lastRefreshAt: expect.anything(),
        lastSyncAt: expect.anything(),
        lastSnapshotAt: expect.anything(),
      }),
      { merge: true },
    );
  });

  it("writes only lastRefreshAt when zero snapshots written", async () => {
    (ouraVendorSnapshot.writeOuraVendorSleepSnapshots as jest.Mock).mockResolvedValue({
      attempted: 0,
      written: 0,
      skippedMissingDay: 0,
      errors: 0,
    });
    (ouraVendorSnapshot.writeOuraVendorReadinessSnapshots as jest.Mock).mockResolvedValue({
      attempted: 0,
      written: 0,
      skippedMissingDay: 0,
      errors: 0,
    });

    await performOuraPostRawPersistence("uid-zero", "req-zero", [], []);

    expect(integrationSetMock).toHaveBeenCalledWith(
      expect.objectContaining({ lastRefreshAt: expect.anything() }),
      { merge: true },
    );
    const update = integrationSetMock.mock.calls[0][0];
    expect(update).not.toHaveProperty("lastSyncAt");
    expect(update).not.toHaveProperty("lastSnapshotAt");
  });
});
