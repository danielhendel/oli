/**
 * POST /integrations/oura/ingest — Ingest Oura sleep and HRV as raw events.
 * Writes with provider "manual", sourceId "oura" for existing normalization.
 */
import express from "express";
import request from "supertest";
import ouraIngestRouter from "../ouraIngest";

const docRefs: Record<string, { create: jest.Mock; get: jest.Mock; set: jest.Mock }> = {};

function getDocRef(id: string) {
  if (!docRefs[id]) {
    docRefs[id] = {
      create: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue({ exists: false }),
      set: jest.fn().mockResolvedValue(undefined),
    };
  }
  return docRefs[id];
}

const mockUserCollection = jest.fn(() => ({
  doc: (id: string) => getDocRef(id),
}));

jest.mock("../../../db", () => ({
  userCollection: (...args: unknown[]) => mockUserCollection(...args),
}));

jest.mock("../../../lib/writeFailure", () => ({
  writeFailure: jest.fn().mockResolvedValue({ id: "fail_1" }),
}));

describe("POST /integrations/oura/ingest", () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as unknown as { uid: string; rid: string }).uid = "user_456";
      (req as unknown as { rid: string }).rid = "req-oura-ingest";
      next();
    });
    app.use("/integrations/oura/ingest", ouraIngestRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(docRefs).forEach((k) => delete docRefs[k]);
  });

  it("returns 401 when uid is missing", async () => {
    const appNoUid = express();
    appNoUid.use(express.json());
    appNoUid.use("/integrations/oura/ingest", ouraIngestRouter);
    const res = await request(appNoUid)
      .post("/integrations/oura/ingest")
      .send({ sleep: [{ idempotencyKey: "s1", start: "2025-03-13T22:00:00Z", end: "2025-03-14T06:00:00Z", timezone: "UTC", totalMinutes: 480, isMainSleep: true }] });
    expect(res.status).toBe(401);
  });

  it("returns 400 when Idempotency-Key header is missing", async () => {
    const res = await request(app)
      .post("/integrations/oura/ingest")
      .send({
        sleep: [
          {
            idempotencyKey: "s1",
            start: "2025-03-13T22:00:00Z",
            end: "2025-03-14T06:00:00Z",
            timezone: "UTC",
            totalMinutes: 480,
            isMainSleep: true,
          },
        ],
      });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error?.message).toContain("Idempotency-Key");
  });

  it("returns 400 when body has no sleep or hrv items", async () => {
    const res = await request(app)
      .post("/integrations/oura/ingest")
      .set("Idempotency-Key", "req-empty")
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("accepts valid sleep and writes raw event with provider manual sourceId oura", async () => {
    const res = await request(app)
      .post("/integrations/oura/ingest")
      .set("Idempotency-Key", "oura-ingest-sleep-1")
      .send({
        sleep: [
          {
            idempotencyKey: "oura_sleep_1",
            start: "2025-03-13T22:00:00.000Z",
            end: "2025-03-14T06:00:00.000Z",
            timezone: "America/Los_Angeles",
            totalMinutes: 480,
            isMainSleep: true,
          },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.eventsCreated).toBe(1);
    const docRef = getDocRef("oura_sleep_1");
    expect(docRef.set).toHaveBeenCalledTimes(1);
    const written = docRef.set.mock.calls[0][0];
    expect(written.provider).toBe("manual");
    expect(written.sourceId).toBe("oura");
    expect(written.sourceType).toBe("oura");
    expect(written.kind).toBe("sleep");
    expect(written.id).toBe("oura_sleep_1");
    expect(written.payload).toMatchObject({
      start: "2025-03-13T22:00:00.000Z",
      end: "2025-03-14T06:00:00.000Z",
      timezone: "America/Los_Angeles",
      totalMinutes: 480,
      isMainSleep: true,
    });
  });

  it("accepts valid hrv and writes raw event with provider manual sourceId oura", async () => {
    const res = await request(app)
      .post("/integrations/oura/ingest")
      .set("Idempotency-Key", "oura-ingest-hrv-1")
      .send({
        hrv: [
          {
            idempotencyKey: "oura_hrv_1",
            time: "2025-03-14T06:30:00.000Z",
            timezone: "UTC",
            rmssdMs: 45,
            measurementType: "nightly",
          },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.eventsCreated).toBe(1);
    const docRef = getDocRef("oura_hrv_1");
    const written = docRef.create.mock.calls[0][0];
    expect(written.provider).toBe("manual");
    expect(written.sourceId).toBe("oura");
    expect(written.kind).toBe("hrv");
    expect(written.payload).toMatchObject({
      time: "2025-03-14T06:30:00.000Z",
      timezone: "UTC",
      rmssdMs: 45,
      measurementType: "nightly",
    });
  });

  it("skips duplicate idempotency key (eventsAlreadyExists)", async () => {
    const docRef = getDocRef("dup_key");
    docRef.get.mockReset().mockResolvedValue({ exists: true });

    const res = await request(app)
      .post("/integrations/oura/ingest")
      .set("Idempotency-Key", "oura-ingest-dup")
      .send({
        sleep: [
          {
            idempotencyKey: "dup_key",
            start: "2025-03-13T22:00:00Z",
            end: "2025-03-14T06:00:00Z",
            timezone: "UTC",
            totalMinutes: 480,
            isMainSleep: true,
          },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.eventsCreated).toBe(0);
    expect(res.body.eventsAlreadyExists).toBe(1);
  });
});
