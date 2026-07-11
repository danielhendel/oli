/**
 * GET /users/me/sleep-nights — bounded authenticated SleepNight range read.
 */
import express from "express";
import type http from "http";
import { AddressInfo } from "net";

jest.mock("../../lib/sleepNightRead", () => ({
  loadSleepNightView: jest.fn(),
  loadSleepNightViewsForRange: jest.fn(),
}));

jest.mock("../../db", () => ({
  userCollection: jest.fn(),
  documentIdPath: { _: "documentId" },
}));

import { loadSleepNightViewsForRange } from "../../lib/sleepNightRead";
import usersMeRoutes from "../usersMe";

const mockLoadRange = loadSleepNightViewsForRange as jest.MockedFunction<typeof loadSleepNightViewsForRange>;

describe("GET /users/me/sleep-nights", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use((req, _res, next) => {
      (req as unknown as { uid: string }).uid = "user_sleep_night_range";
      next();
    });
    app.use("/users/me", usersMeRoutes);
    server = app.listen(0);
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    mockLoadRange.mockReset();
  });

  it("returns 400 when start/end are missing", async () => {
    const res = await fetch(`${baseUrl}/users/me/sleep-nights`);
    expect(res.status).toBe(400);
  });

  it("returns 400 when start > end", async () => {
    const res = await fetch(`${baseUrl}/users/me/sleep-nights?start=2026-05-10&end=2026-05-01`);
    expect(res.status).toBe(400);
  });

  it("returns 400 when inclusive span exceeds 90 days", async () => {
    const res = await fetch(`${baseUrl}/users/me/sleep-nights?start=2026-01-01&end=2026-04-10`);
    expect(res.status).toBe(400);
  });

  it("returns 200 with empty nights when none resolve", async () => {
    mockLoadRange.mockResolvedValue([]);
    const res = await fetch(`${baseUrl}/users/me/sleep-nights?start=2026-05-01&end=2026-05-07`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.dayCount).toBe(7);
    expect(body.resolvedCount).toBe(0);
    expect(body.nights).toEqual([]);
    expect(mockLoadRange).toHaveBeenCalledWith("user_sleep_night_range", "2026-05-01", "2026-05-07");
  });

  it("returns 200 with resolved nights (missing days omitted)", async () => {
    mockLoadRange.mockResolvedValue([
      {
        requestedDay: "2026-05-02",
        anchorDay: "2026-05-02",
        wakeDay: "2026-05-02",
        resolution: "exact_anchor",
        isFallback: false,
        sleepNight: {
          anchorDay: "2026-05-02",
          wakeDay: "2026-05-02",
          provider: "oura",
          source: "ouraVendorSleep",
          sourceDocumentId: "s1",
          score: 80,
          isComplete: true,
          totalSleepMinutes: 400,
        },
      },
    ]);
    const res = await fetch(`${baseUrl}/users/me/sleep-nights?start=2026-05-01&end=2026-05-03`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.dayCount).toBe(3);
    expect(body.resolvedCount).toBe(1);
    expect(body.nights).toHaveLength(1);
    expect(body.nights[0].requestedDay).toBe("2026-05-02");
  });
});
