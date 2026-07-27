/**
 * GET /users/me/oura-readiness-range — bounded authenticated contributor history.
 */
import express from "express";
import type http from "http";
import { AddressInfo } from "net";

const mockGet = jest.fn();
const mockOrderBy = jest.fn(() => ({ get: mockGet }));
const mockWhere2 = jest.fn(() => ({ orderBy: mockOrderBy }));
const mockWhere1 = jest.fn(() => ({ where: mockWhere2 }));
const mockUserCollection = jest.fn(() => ({
  where: mockWhere1,
}));

jest.mock("../../db", () => ({
  userCollection: (...args: unknown[]) => mockUserCollection(...args),
  documentIdPath: { _: "documentId" },
}));

import usersMeRoutes from "../usersMe";

describe("GET /users/me/oura-readiness-range", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use((req, _res, next) => {
      (req as unknown as { uid: string }).uid = "user_oura_readiness_range";
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
    mockGet.mockReset();
    mockWhere1.mockClear();
    mockWhere2.mockClear();
    mockOrderBy.mockClear();
    mockUserCollection.mockClear();
  });

  it("auth isolation: no uid returns 401", async () => {
    const app = express();
    app.use((_req, _res, next) => {
      next();
    });
    app.use("/users/me", usersMeRoutes);
    const srv = require("http").createServer(app);
    await new Promise<void>((resolve) => srv.listen(0, () => resolve()));
    const addr = srv.address() as AddressInfo;
    const url = `http://127.0.0.1:${addr.port}`;
    try {
      const res = await fetch(
        `${url}/users/me/oura-readiness-range?start=2026-05-01&end=2026-05-07`,
      );
      expect(res.status).toBe(401);
    } finally {
      await new Promise<void>((r) => srv.close(() => r()));
    }
  });

  it("scopes Firestore reads to the authenticated user collection", async () => {
    mockGet.mockResolvedValue({ docs: [] });
    const res = await fetch(
      `${baseUrl}/users/me/oura-readiness-range?start=2026-05-01&end=2026-05-07`,
    );
    expect(res.status).toBe(200);
    expect(mockUserCollection).toHaveBeenCalledWith(
      "user_oura_readiness_range",
      "ouraVendorReadiness",
    );
  });

  it("returns 400 when start/end are missing", async () => {
    const res = await fetch(`${baseUrl}/users/me/oura-readiness-range`);
    expect(res.status).toBe(400);
  });

  it("returns 400 when dates are malformed", async () => {
    const res = await fetch(
      `${baseUrl}/users/me/oura-readiness-range?start=2026-5-1&end=2026-05-07`,
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when start > end", async () => {
    const res = await fetch(
      `${baseUrl}/users/me/oura-readiness-range?start=2026-05-10&end=2026-05-01`,
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when inclusive span exceeds 90 days", async () => {
    const res = await fetch(
      `${baseUrl}/users/me/oura-readiness-range?start=2026-01-01&end=2026-04-01`,
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 for a valid inclusive 90-day span", async () => {
    mockGet.mockResolvedValue({ docs: [] });
    const res = await fetch(
      `${baseUrl}/users/me/oura-readiness-range?start=2026-02-01&end=2026-05-01`,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.dayCount).toBe(90);
    expect(body.resolvedCount).toBe(0);
  });

  it("returns approved contributors only, exact-day sparse, no payload leakage", async () => {
    mockGet.mockResolvedValue({
      docs: [
        {
          id: "r2",
          data: () => ({
            id: "r2",
            day: "2026-05-03",
            score: 88,
            source: "oura",
            fetchedAt: "2026-05-03T12:00:00.000Z",
            contributors: {
              hrv_balance: 84.99,
              body_temperature: 90,
              recovery_index: 70,
              sleep_balance: 65,
              resting_heart_rate: 75,
              temperature_deviation: 0.15,
            },
            payload: { secret: true, temperature_deviation: 0.15 },
            lowestHeartRateBpm: 48,
          }),
        },
        {
          id: "r1",
          data: () => ({
            id: "r1",
            day: "2026-05-02",
            score: 70,
            source: "oura",
            fetchedAt: "2026-05-02T12:00:00.000Z",
            contributors: {
              hrv_balance: 101,
              recovery_index: "80",
              sleep_balance: 0,
            },
          }),
        },
        {
          // Duplicate day — first ascending wins (r1 already recorded for 2026-05-02 if order preserved).
          // Query is orderBy day asc; docs appear in array order here.
          id: "r1b",
          data: () => ({
            id: "r1b",
            day: "2026-05-02",
            score: 99,
            source: "oura",
            contributors: { sleep_balance: 99 },
          }),
        },
      ],
    });

    const res = await fetch(
      `${baseUrl}/users/me/oura-readiness-range?start=2026-05-01&end=2026-05-03`,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.dayCount).toBe(3);
    expect(body.resolvedCount).toBe(2);
    expect(body.days.map((d: { day: string }) => d.day)).toEqual(["2026-05-02", "2026-05-03"]);

    // First ascending duplicate wins — score 70 / sleep_balance 0 from r1, not r1b.
    expect(body.days[0]).toEqual({
      day: "2026-05-02",
      score: 70,
      source: "oura",
      contributors: { sleep_balance: 0 },
    });
    expect(body.days[1]).toEqual({
      day: "2026-05-03",
      score: 88,
      source: "oura",
      contributors: {
        hrv_balance: 84.99,
        body_temperature: 90,
        recovery_index: 70,
        sleep_balance: 65,
      },
    });

    const json = JSON.stringify(body);
    expect(json).not.toContain("payload");
    expect(json).not.toContain("secret");
    expect(json).not.toContain("fetchedAt");
    expect(json).not.toContain("resting_heart_rate");
    expect(json).not.toContain("temperature_deviation");
    expect(json).not.toContain("lowestHeartRateBpm");
    expect(json).not.toContain("user_oura_readiness_range");
  });

  it("does not densify missing days (no prior-night fallback)", async () => {
    mockGet.mockResolvedValue({
      docs: [
        {
          id: "only",
          data: () => ({
            id: "only",
            day: "2026-05-01",
            score: 60,
            source: "oura",
            contributors: { hrv_balance: 60 },
          }),
        },
      ],
    });
    const res = await fetch(
      `${baseUrl}/users/me/oura-readiness-range?start=2026-05-01&end=2026-05-03`,
    );
    const body = await res.json();
    expect(body.resolvedCount).toBe(1);
    expect(body.days).toHaveLength(1);
    expect(body.days[0].day).toBe("2026-05-01");
  });
});
