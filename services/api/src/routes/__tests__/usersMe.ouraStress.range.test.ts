/**
 * GET /users/me/oura-stress — bounded authenticated Oura Daily Stress range read.
 */
import express from "express";
import type http from "http";
import { AddressInfo } from "net";

const mockGet = jest.fn();
const mockOrderBy = jest.fn(() => ({ get: mockGet }));
const mockWhere2 = jest.fn(() => ({ orderBy: mockOrderBy }));
const mockWhere1 = jest.fn(() => ({ where: mockWhere2 }));

jest.mock("../../db", () => ({
  userCollection: jest.fn(() => ({
    where: mockWhere1,
  })),
  documentIdPath: { _: "documentId" },
}));

import usersMeRoutes from "../usersMe";

describe("GET /users/me/oura-stress", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use((req, _res, next) => {
      (req as unknown as { uid: string }).uid = "user_oura_stress_range";
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
      const res = await fetch(`${url}/users/me/oura-stress?start=2026-05-01&end=2026-05-07`);
      expect(res.status).toBe(401);
    } finally {
      await new Promise<void>((r) => srv.close(() => r()));
    }
  });

  it("returns 400 when start/end are missing", async () => {
    const res = await fetch(`${baseUrl}/users/me/oura-stress`);
    expect(res.status).toBe(400);
  });

  it("returns 400 when dates are malformed", async () => {
    const res = await fetch(`${baseUrl}/users/me/oura-stress?start=2026-5-1&end=2026-05-07`);
    expect(res.status).toBe(400);
  });

  it("returns 400 when start > end", async () => {
    const res = await fetch(`${baseUrl}/users/me/oura-stress?start=2026-05-10&end=2026-05-01`);
    expect(res.status).toBe(400);
  });

  it("returns 400 when inclusive span exceeds 90 days", async () => {
    const res = await fetch(`${baseUrl}/users/me/oura-stress?start=2026-01-01&end=2026-04-10`);
    expect(res.status).toBe(400);
  });

  it("returns 400 when inclusive span is 91 days", async () => {
    const res = await fetch(`${baseUrl}/users/me/oura-stress?start=2026-01-01&end=2026-04-01`);
    expect(res.status).toBe(400);
  });

  it("returns 200 with empty days when none resolve", async () => {
    mockGet.mockResolvedValue({ docs: [] });
    const res = await fetch(`${baseUrl}/users/me/oura-stress?start=2026-05-01&end=2026-05-07`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.dayCount).toBe(7);
    expect(body.resolvedCount).toBe(0);
    expect(body.days).toEqual([]);
    expect(body).not.toHaveProperty("payload");
  });

  it("returns 200 with sparse ascending days and no raw payload", async () => {
    mockGet.mockResolvedValue({
      docs: [
        {
          id: "st1",
          data: () => ({
            id: "st1",
            day: "2026-05-02",
            daySummary: "normal",
            stressHighSeconds: 100,
            recoveryHighSeconds: 40,
            source: "oura",
            fetchedAt: "2026-05-02T12:00:00.000Z",
            schemaVersion: 1,
            payload: { secret: true },
          }),
        },
        {
          id: "st2",
          data: () => ({
            id: "st2",
            day: "2026-05-03",
            daySummary: "stressful",
            stressHighSeconds: 200,
            recoveryHighSeconds: null,
            source: "oura",
            fetchedAt: "2026-05-03T12:00:00.000Z",
            schemaVersion: 1,
          }),
        },
      ],
    });
    const res = await fetch(`${baseUrl}/users/me/oura-stress?start=2026-05-01&end=2026-05-03`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.dayCount).toBe(3);
    expect(body.resolvedCount).toBe(2);
    expect(body.days).toHaveLength(2);
    expect(body.days.map((d: { day: string }) => d.day)).toEqual(["2026-05-02", "2026-05-03"]);
    expect(body.days[0]).toEqual({
      day: "2026-05-02",
      daySummary: "normal",
      stressHighSeconds: 100,
      recoveryHighSeconds: 40,
      source: "oura",
    });
    expect(JSON.stringify(body)).not.toContain("payload");
    expect(JSON.stringify(body)).not.toContain("fetchedAt");
    expect(JSON.stringify(body)).not.toContain("secret");
  });
});
