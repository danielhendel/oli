/**
 * GET /users/me/sleep-night — canonical SleepNight read model.
 */
import express from "express";
import type http from "http";
import { AddressInfo } from "net";

jest.mock("../../lib/sleepNightRead", () => ({
  loadSleepNightView: jest.fn(),
}));

jest.mock("../../db", () => ({
  userCollection: jest.fn(),
  documentIdPath: { _: "documentId" },
}));

import { loadSleepNightView } from "../../lib/sleepNightRead";
import usersMeRoutes from "../usersMe";

const mockLoadSleepNightView = loadSleepNightView as jest.MockedFunction<typeof loadSleepNightView>;

describe("GET /users/me/sleep-night", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use((req, _res, next) => {
      (req as unknown as { uid: string }).uid = "user_sleep_night";
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
    mockLoadSleepNightView.mockReset();
  });

  it("returns 400 when day query is missing", async () => {
    const res = await fetch(`${baseUrl}/users/me/sleep-night`);
    expect(res.status).toBe(400);
  });

  it("returns 404 when no SleepNight", async () => {
    mockLoadSleepNightView.mockResolvedValue(null);
    const res = await fetch(`${baseUrl}/users/me/sleep-night?day=2026-05-10`);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error?.code).toBe("NOT_FOUND");
    expect(body.error?.resource).toBe("sleepNight");
  });

  it("returns 200 with sleepNight when exact anchor exists", async () => {
    mockLoadSleepNightView.mockResolvedValue({
      requestedDay: "2026-05-10",
      anchorDay: "2026-05-10",
      wakeDay: "2026-05-11",
      resolution: "exact_anchor",
      isFallback: false,
      sleepNight: {
        anchorDay: "2026-05-10",
        wakeDay: "2026-05-11",
        provider: "oura",
        source: "ouraVendorSleep",
        sourceDocumentId: "abc",
        score: 96,
        isComplete: true,
        totalSleepMinutes: 522,
        mainSleepMinutes: 522,
        efficiency: 94,
        remMinutes: 131,
        deepMinutes: 75,
        updatedAt: "2026-05-11T12:00:00.000Z",
      },
    });

    const res = await fetch(`${baseUrl}/users/me/sleep-night?day=2026-05-10`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.requestedDay).toBe("2026-05-10");
    expect(body.anchorDay).toBe("2026-05-10");
    expect(body.resolution).toBe("exact_anchor");
    expect(body.sleepNight.score).toBe(96);
  });

  it("parses string score from Firestore-shaped payload", async () => {
    const view = {
      requestedDay: "2026-05-10",
      anchorDay: "2026-05-10",
      wakeDay: "2026-05-10",
      resolution: "exact_anchor",
      isFallback: false,
      sleepNight: {
        anchorDay: "2026-05-10",
        wakeDay: "2026-05-10",
        provider: "oura",
        source: "ouraVendorSleep",
        sourceDocumentId: "abc",
        score: "82",
        isComplete: true,
        updatedAt: "2026-05-11T12:00:00.000Z",
      },
    };
    mockLoadSleepNightView.mockResolvedValue(view as never);

    const res = await fetch(`${baseUrl}/users/me/sleep-night?day=2026-05-10`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sleepNight.score).toBe(82);
  });

  it("returns 200 exact_anchor for 2026-05-14 with Oura headline metrics when SleepNight exists", async () => {
    mockLoadSleepNightView.mockResolvedValue({
      requestedDay: "2026-05-14",
      anchorDay: "2026-05-14",
      wakeDay: "2026-05-15",
      resolution: "exact_anchor",
      isFallback: false,
      sleepNight: {
        anchorDay: "2026-05-14",
        wakeDay: "2026-05-15",
        provider: "oura",
        source: "ouraVendorSleep",
        sourceDocumentId: "oura_sleep_1",
        score: 81,
        isComplete: true,
        totalSleepMinutes: 410,
        mainSleepMinutes: 410,
        efficiency: 91,
        remMinutes: 80,
        deepMinutes: 52,
        startedAt: "2026-05-14T01:00:00.000Z",
        endedAt: "2026-05-15T07:50:00.000Z",
        updatedAt: "2026-05-15T12:00:00.000Z",
      },
    });

    const res = await fetch(`${baseUrl}/users/me/sleep-night?day=2026-05-14`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.resolution).toBe("exact_anchor");
    expect(body.anchorDay).toBe("2026-05-14");
    expect(body.sleepNight.score).toBe(81);
    expect(body.sleepNight.totalSleepMinutes).toBe(410);
    expect(body.sleepNight.efficiency).toBe(91);
    expect(body.sleepNight.remMinutes).toBe(80);
    expect(body.sleepNight.deepMinutes).toBe(52);
  });

  it("returns 200 with lowest HR and average HRV for 2026-05-15 Dash physiology", async () => {
    mockLoadSleepNightView.mockResolvedValue({
      requestedDay: "2026-05-15",
      anchorDay: "2026-05-15",
      wakeDay: "2026-05-15",
      resolution: "exact_anchor",
      isFallback: false,
      sleepNight: {
        anchorDay: "2026-05-15",
        wakeDay: "2026-05-15",
        provider: "oura",
        source: "ouraVendorSleep",
        sourceDocumentId: "s_2026_05_15",
        score: 81,
        isComplete: true,
        totalSleepMinutes: 410,
        lowestHeartRateBpm: 50,
        averageHrvMs: 21,
        updatedAt: "2026-05-15T12:00:00.000Z",
      },
    });

    const res = await fetch(`${baseUrl}/users/me/sleep-night?day=2026-05-15`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sleepNight.lowestHeartRateBpm).toBe(50);
    expect(body.sleepNight.averageHrvMs).toBe(21);
  });
});
