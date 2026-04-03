// GET /users/me/daily-facts — synthetic body when doc missing but raw exists
import express from "express";
import type http from "http";
import { AddressInfo } from "net";

import usersMeRoutes from "../usersMe";
import { userCollection, userDoc } from "../../db";

jest.mock("../../db", () => ({
  userCollection: jest.fn(),
  userDoc: jest.fn(),
  documentIdPath: { _: "documentId" },
}));

describe("GET /users/me/daily-facts", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use((req, _res, next) => {
      (req as unknown as { uid: string }).uid = "user_body_test";
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

  beforeEach(() => jest.resetAllMocks());

  test("returns 200 with synthesized body when dailyFacts missing and raw weight exists for day", async () => {
    const weightDoc = {
      kind: "weight",
      observedAt: "2026-04-01T14:00:00.000Z",
      sourceId: "apple_health",
      payload: {
        time: "2026-04-01T14:00:00.000Z",
        timezone: "UTC",
        weightKg: 81.2,
      },
    };

    (userCollection as jest.Mock).mockImplementation((uid: string, name: string) => {
      if (name === "dailyFacts") {
        return {
          doc: () => ({
            get: async () => ({ exists: false }),
          }),
        };
      }
      if (name === "rawEvents") {
        const rawQuery = {
          where: (): typeof rawQuery => rawQuery,
          get: async () => ({ docs: [{ data: () => weightDoc }] }),
        };
        return rawQuery;
      }
      return {};
    });

    (userDoc as jest.Mock).mockReturnValue({
      get: async () => ({
        data: () => ({ preferences: { metricSources: {} } }),
      }),
    });

    const res = await fetch(`${baseUrl}/users/me/daily-facts?day=2026-04-01`);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { body?: { weightKg?: number }; meta?: { source?: unknown } };
    expect(json.body?.weightKg).toBeCloseTo(81.2, 5);
    expect(json.meta?.source).toEqual(expect.objectContaining({ synthesizedFromRaw: true }));
  });

  test("returns 404 when dailyFacts missing and no raw body for day", async () => {
    (userCollection as jest.Mock).mockImplementation((_uid: string, name: string) => {
      if (name === "dailyFacts") {
        return {
          doc: () => ({
            get: async () => ({ exists: false }),
          }),
        };
      }
      if (name === "rawEvents") {
        const rawQuery = {
          where: (): typeof rawQuery => rawQuery,
          get: async () => ({ docs: [] }),
        };
        return rawQuery;
      }
      return {};
    });

    (userDoc as jest.Mock).mockReturnValue({
      get: async () => ({ data: () => ({}) }),
    });

    const res = await fetch(`${baseUrl}/users/me/daily-facts?day=2026-04-01`);
    expect(res.status).toBe(404);
  });
});
