/**
 * POST /integrations/oura/sleep-day-refresh — Oura pull + derived-truth recompute for Sleep refresh.
 */

import express from "express";
import request from "supertest";

jest.mock("../../../db", () => ({
  db: {},
}));

const mockPerformOuraPullNowCore = jest.fn();
const mockRecompute = jest.fn().mockResolvedValue(undefined);

jest.mock("../ouraPullNow", () => ({
  performOuraPullNowCore: (...args: unknown[]) => mockPerformOuraPullNowCore(...args),
}));

jest.mock("../../../lib/loadRecomputeDerivedTruthForDay", () => ({
  getRecomputeDerivedTruthForDay: () => mockRecompute,
}));

import ouraSleepDayRefreshRouter from "../ouraSleepDayRefresh";

describe("POST /integrations/oura/sleep-day-refresh", () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as unknown as { uid: string; rid: string }).uid = "user_sleep_refresh";
      (req as unknown as { rid: string }).rid = "req-sleep-refresh";
      next();
    });
    app.use("/integrations/oura/sleep-day-refresh", ouraSleepDayRefreshRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformOuraPullNowCore.mockResolvedValue({
      statusCode: 202,
      body: { ok: true, requestId: "rid", windowDays: 30, eventsCreated: 1, eventsAlreadyExists: 0 },
    });
  });

  it("returns 400 without Idempotency-Key", async () => {
    const res = await request(app)
      .post("/integrations/oura/sleep-day-refresh")
      .set("Authorization", "Bearer test")
      .send({ day: "2026-04-06" });

    expect(res.status).toBe(400);
    expect(mockPerformOuraPullNowCore).not.toHaveBeenCalled();
    expect(mockRecompute).not.toHaveBeenCalled();
  });

  it("runs pull then recompute and returns 200", async () => {
    const res = await request(app)
      .post("/integrations/oura/sleep-day-refresh")
      .set("Authorization", "Bearer test")
      .set("Idempotency-Key", "idem-1")
      .send({ day: "2026-04-06" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(mockPerformOuraPullNowCore).toHaveBeenCalledWith("user_sleep_refresh", "req-sleep-refresh");
    expect(mockRecompute).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_sleep_refresh",
        dayKey: "2026-04-06",
        trigger: { type: "admin", source: "oura_sleep_day_refresh" },
      }),
    );
  });

  it("does not run recompute when pull fails", async () => {
    mockPerformOuraPullNowCore.mockResolvedValue({
      statusCode: 502,
      body: { ok: false, error: { code: "OURA_NOT_CONNECTED", message: "nope", requestId: "rid" } },
    });

    const res = await request(app)
      .post("/integrations/oura/sleep-day-refresh")
      .set("Authorization", "Bearer test")
      .set("Idempotency-Key", "idem-2")
      .send({ day: "2026-04-06" });

    expect(res.status).toBe(502);
    expect(mockRecompute).not.toHaveBeenCalled();
  });
});
