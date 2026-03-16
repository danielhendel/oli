/**
 * W4A — POST /integrations/withings/pull-now: user auth, 72h pull, idempotent RawEvent writes.
 * Requires Idempotency-Key; uses requestRecords for replay-safe behavior.
 */

import express from "express";
import request from "supertest";
import { allowConsoleForThisTest } from "../../../../../scripts/test/consoleGuard";
import withingsPullNowRouter from "../integrations/withingsPullNow";

const mockUserCollection = jest.fn();
const mockDocRefs: Record<
  string,
  { get: jest.Mock; create: jest.Mock; id: string }
> = {};
const mockRegistryDelete = jest.fn().mockResolvedValue(undefined);

/** In-memory state for requestRecords/{idempotencyKey} to simulate create/get/set. */
const requestRecordState: Record<
  string,
  { status: string; statusCode?: number; result?: Record<string, unknown>; createdAt?: unknown; completedAt?: unknown }
> = {};

function makeRequestRecordRef(id: string) {
  return {
    id,
    create: jest.fn().mockImplementation(async (data: Record<string, unknown>) => {
      if (requestRecordState[id]) {
        const err = new Error("ALREADY_EXISTS") as Error & { code?: number };
        err.code = 6;
        throw err;
      }
      requestRecordState[id] = { ...data as { status: string }, status: "in_progress" };
    }),
    get: jest.fn().mockImplementation(async () => ({
      exists: !!requestRecordState[id],
      data: () => requestRecordState[id],
    })),
    set: jest.fn().mockImplementation(async (data: Record<string, unknown>, opts?: { merge?: boolean }) => {
      const existing = requestRecordState[id] ?? {};
      requestRecordState[id] = opts?.merge ? { ...existing, ...data } : { ...data } as typeof requestRecordState[string];
    }),
  };
}

jest.mock("../../db", () => ({
  userCollection: (...args: unknown[]) => mockUserCollection(...args),
  FieldValue: { serverTimestamp: () => ({ _serverTimestamp: true }) },
  withingsConnectedRegistryDoc: jest.fn(() => ({ delete: mockRegistryDelete })),
}));

jest.mock("../../lib/withingsSecrets", () => ({
  deleteRefreshToken: jest.fn().mockResolvedValue(undefined),
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
const withingsSecrets = require("../../lib/withingsSecrets");
const db = require("../../db");

describe("POST /integrations/withings/pull-now", () => {
  let appWithAuth: express.Express;
  let appWithoutAuth: express.Express;

  beforeAll(() => {
    appWithAuth = express();
    appWithAuth.use(express.json());
    appWithAuth.use((req, _res, next) => {
      (req as unknown as { uid: string; rid: string }).uid = "user_123";
      (req as unknown as { rid: string }).rid = "req-pull-now";
      next();
    });
    appWithAuth.use("/integrations/withings/pull-now", withingsPullNowRouter);

    appWithoutAuth = express();
    appWithoutAuth.use(express.json());
    appWithoutAuth.use((req, _res, next) => {
      (req as unknown as { rid: string }).rid = "req-unauth";
      next();
    });
    appWithoutAuth.use("/integrations/withings/pull-now", withingsPullNowRouter);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    mockRegistryDelete.mockResolvedValue(undefined);
    (withingsSecrets.deleteRefreshToken as jest.Mock).mockResolvedValue(undefined);
    (db.withingsConnectedRegistryDoc as jest.Mock).mockImplementation(() => ({
      delete: mockRegistryDelete,
    }));
    Object.keys(mockDocRefs).forEach((k) => delete mockDocRefs[k]);
    Object.keys(requestRecordState).forEach((k) => delete requestRecordState[k]);
    mockUserCollection.mockImplementation((uid: string, col: string) => {
      if (col === "requestRecords") {
        return {
          doc: (id: string) => makeRequestRecordRef(id),
        };
      }
      if (col !== "rawEvents") return { doc: jest.fn() };
      return {
        doc: (id: string) => {
          if (!mockDocRefs[id]) {
            mockDocRefs[id] = {
              id,
              get: jest.fn().mockResolvedValue({ exists: false }),
              create: jest.fn().mockResolvedValue(undefined),
            };
          }
          return mockDocRefs[id];
        },
      };
    });
  });

  describe("rejects unauth", () => {
    it("returns 401 and includes requestId when no uid", async () => {
      const res = await request(appWithoutAuth)
        .post("/integrations/withings/pull-now")
        .set("Idempotency-Key", "idem_unauth_1");
      expect(res.status).toBe(401);
      expect(res.body?.ok).toBe(false);
      expect(res.body?.error?.code).toBe("UNAUTHORIZED");
      expect(res.body?.error?.requestId).toBe("req-unauth");
    });
  });

  describe("Idempotency-Key required", () => {
    it("returns 400 BAD_REQUEST when Idempotency-Key header is missing and does not call fetchWithingsMeasures", async () => {
      const res = await request(appWithAuth).post("/integrations/withings/pull-now");
      expect(res.status).toBe(400);
      expect(res.body?.ok).toBe(false);
      expect(res.body?.error?.code).toBe("BAD_REQUEST");
      expect(res.body?.error?.message).toContain("Idempotency-Key");
      expect(res.body?.error?.requestId).toBe("req-pull-now");
      expect(withingsMeasures.fetchWithingsMeasures).not.toHaveBeenCalled();
    });
  });

  describe("success path", () => {
    it("returns ok with eventsCreated and eventsAlreadyExists when first create succeeds and second already exists", async () => {
      const key1 = "withings:weight:user_123:111";
      const key2 = "withings:weight:user_123:222";
      mockUserCollection.mockImplementation((uid: string, col: string) => {
        if (col === "requestRecords") {
          return { doc: (id: string) => makeRequestRecordRef(id) };
        }
        if (col === "integrations") {
          return { doc: () => ({ set: jest.fn().mockResolvedValue(undefined) }) };
        }
        if (col !== "rawEvents") return { doc: jest.fn() };
        return {
          doc: (id: string) => {
            const isSecond = id === key2;
            return {
              id,
              get: jest.fn().mockResolvedValue({ exists: isSecond }),
              create: jest.fn().mockImplementation(() =>
                isSecond ? Promise.reject(new Error("already exists")) : Promise.resolve(),
              ),
            };
          },
        };
      });

      withingsMeasures.fetchWithingsMeasures.mockResolvedValue([
        {
          measuredAtIso: "2025-01-15T12:00:00.000Z",
          weightKg: 75,
          bodyFatPercent: null,
          idempotencyKey: key1,
        },
        {
          measuredAtIso: "2025-01-15T14:00:00.000Z",
          weightKg: 76,
          bodyFatPercent: 20,
          idempotencyKey: key2,
        },
      ]);

      const res = await request(appWithAuth)
        .post("/integrations/withings/pull-now")
        .set("Idempotency-Key", "idem_pull_now_1");
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        ok: true,
        requestId: "req-pull-now",
        windowHours: 72,
        eventsCreated: 1,
        eventsAlreadyExists: 1,
        failuresWritten: 0,
        failureWriteErrors: 0,
      });
    });

    it("replay returns recorded result and does not refetch", async () => {
      const key1 = "withings:weight:user_123:111";
      const key2 = "withings:weight:user_123:222";
      const idemKey = "idem_replay_1";

      mockUserCollection.mockImplementation((uid: string, col: string) => {
        if (col === "requestRecords") {
          return { doc: (id: string) => makeRequestRecordRef(id) };
        }
        if (col === "integrations") {
          return { doc: () => ({ set: jest.fn().mockResolvedValue(undefined) }) };
        }
        if (col !== "rawEvents") return { doc: jest.fn() };
        return {
          doc: (id: string) => {
            const isSecond = id === key2;
            return {
              id,
              get: jest.fn().mockResolvedValue({ exists: isSecond }),
              create: jest.fn().mockImplementation(() =>
                isSecond ? Promise.reject(new Error("already exists")) : Promise.resolve(),
              ),
            };
          },
        };
      });

      withingsMeasures.fetchWithingsMeasures.mockResolvedValue([
        { measuredAtIso: "2025-01-15T12:00:00.000Z", weightKg: 75, bodyFatPercent: null, idempotencyKey: key1 },
        { measuredAtIso: "2025-01-15T14:00:00.000Z", weightKg: 76, bodyFatPercent: 20, idempotencyKey: key2 },
      ]);

      const firstRes = await request(appWithAuth)
        .post("/integrations/withings/pull-now")
        .set("Idempotency-Key", idemKey);
      expect(firstRes.status).toBe(200);
      expect(firstRes.body).toMatchObject({
        ok: true,
        requestId: "req-pull-now",
        windowHours: 72,
        eventsCreated: 1,
        eventsAlreadyExists: 1,
      });
      const fetchCountAfterFirst = withingsMeasures.fetchWithingsMeasures.mock.calls.length;
      expect(fetchCountAfterFirst).toBe(1);

      const replayRes = await request(appWithAuth)
        .post("/integrations/withings/pull-now")
        .set("Idempotency-Key", idemKey);
      expect(replayRes.status).toBe(200);
      expect(replayRes.body.requestId).toBe("req-pull-now");
      expect(replayRes.body).toMatchObject({
        ok: true,
        windowHours: 72,
        eventsCreated: 1,
        eventsAlreadyExists: 1,
        failuresWritten: 0,
        failureWriteErrors: 0,
      });
      expect(withingsMeasures.fetchWithingsMeasures).toHaveBeenCalledTimes(fetchCountAfterFirst);
      expect(writeFailure.writeFailure).not.toHaveBeenCalled();
    });
  });

  describe("Withings fetch error", () => {
    it("returns 502 with requestId and error.code and writes FailureEntry", async () => {
      allowConsoleForThisTest({ error: [/withings_pull_now_fetch_failed/] });
      withingsMeasures.fetchWithingsMeasures.mockRejectedValue(
        new withingsMeasures.WithingsMeasureError("API error", "WITHINGS_MEASURE_API_ERROR"),
      );

      const res = await request(appWithAuth)
        .post("/integrations/withings/pull-now")
        .set("Idempotency-Key", "idem_fetch_error_1");
      expect(res.status).toBe(502);
      expect(res.body?.ok).toBe(false);
      expect(res.body?.error?.code).toBe("WITHINGS_FETCH_FAILED");
      expect(res.body?.error?.requestId).toBe("req-pull-now");

      expect(writeFailure.writeFailure).toHaveBeenCalledTimes(1);
      expect(writeFailure.writeFailure).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user_123",
          source: "ingestion",
          stage: "withings.pullNow",
          reasonCode: "WITHINGS_MEASURE_API_ERROR",
          message: "API error",
          requestId: "req-pull-now",
        }),
      );
    });

    it("invalid refresh_token triggers reconnect cleanup and returns 502 WITHINGS_FETCH_FAILED with requestId", async () => {
      allowConsoleForThisTest({ error: [/withings_pull_now_fetch_failed/] });
      withingsMeasures.fetchWithingsMeasures.mockRejectedValue(
        new withingsMeasures.WithingsMeasureError(
          "Invalid Params: invalid refresh_token",
          "WITHINGS_TOKEN_REFRESH_FAILED",
        ),
      );

      const mockIntegrationsSet = jest.fn().mockResolvedValue(undefined);
      mockUserCollection.mockImplementation((_uid: string, col: string) => {
        if (col === "requestRecords") {
          return { doc: (id: string) => makeRequestRecordRef(id) };
        }
        if (col === "integrations") {
          return {
            doc: (docId: string) =>
              docId === "withings" ? { set: mockIntegrationsSet } : { set: jest.fn() },
          };
        }
        if (col !== "rawEvents") return { doc: jest.fn() };
        return {
          doc: (id: string) => {
            if (!mockDocRefs[id]) {
              mockDocRefs[id] = {
                id,
                get: jest.fn().mockResolvedValue({ exists: false }),
                create: jest.fn().mockResolvedValue(undefined),
              };
            }
            return mockDocRefs[id];
          },
        };
      });

      const res = await request(appWithAuth)
        .post("/integrations/withings/pull-now")
        .set("Idempotency-Key", "idem_refresh_invalid_1");

      expect(res.status).toBe(502);
      expect(res.body?.ok).toBe(false);
      expect(res.body?.error?.code).toBe("WITHINGS_FETCH_FAILED");
      expect(res.body?.error?.requestId).toBe("req-pull-now");

      expect(withingsSecrets.deleteRefreshToken).toHaveBeenCalledTimes(1);
      expect(withingsSecrets.deleteRefreshToken).toHaveBeenCalledWith("user_123");

      expect(db.withingsConnectedRegistryDoc).toHaveBeenCalledTimes(1);
      expect(db.withingsConnectedRegistryDoc).toHaveBeenCalledWith("user_123");
      expect(mockRegistryDelete).toHaveBeenCalledTimes(1);

      expect(mockIntegrationsSet).toHaveBeenCalledTimes(1);
      expect(mockIntegrationsSet).toHaveBeenCalledWith(
        expect.objectContaining({
          connected: false,
          revoked: false,
          failureState: expect.objectContaining({
            code: "WITHINGS_REFRESH_TOKEN_INVALID",
            message: "Withings connection expired. Please reconnect.",
          }),
        }),
        { merge: true },
      );
    });
  });
});
