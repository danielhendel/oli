/**
 * GET /users/me/oura-sleep-view and GET /users/me/oura-readiness-view — Tier 1 Oura vendor snapshot read.
 */
import express from "express";
import type http from "http";
import { AddressInfo } from "net";
import usersMeRoutes from "../usersMe";
import { userCollection } from "../../db";

jest.mock("../../db", () => ({
  userCollection: jest.fn(),
  documentIdPath: { _: "documentId" },
}));

describe("GET /users/me/oura-sleep-view and oura-readiness-view", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use((req, _res, next) => {
      (req as unknown as { uid: string }).uid = "user_oura_view";
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

  beforeEach(() => jest.clearAllMocks());

  it("oura-sleep-view returns 400 when day query is missing", async () => {
    const res = await fetch(`${baseUrl}/users/me/oura-sleep-view`);
    expect(res.status).toBe(400);
  });

  it("oura-sleep-view returns 404 when no snapshot in fallback window or collection", async () => {
    (userCollection as jest.Mock).mockImplementation(() => ({
      where: (field: string, op?: string) => {
        if (field === "day" && op === "==") {
          return { limit: () => ({ get: async () => ({ docs: [] }) }) };
        }
        if (field === "day" && op === ">=") {
          return {
            where: () => ({
              orderBy: () => ({
                limit: () => ({ get: async () => ({ docs: [] }) }),
              }),
            }),
          };
        }
        return { limit: () => ({ get: async () => ({ docs: [] }) }) };
      },
      orderBy: () => ({
        limit: () => ({ get: async () => ({ docs: [] }) }),
      }),
    }));

    const res = await fetch(`${baseUrl}/users/me/oura-sleep-view?day=2025-03-15`);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error?.code).toBe("NOT_FOUND");
  });

  it("oura-sleep-view returns 200 with requestedDay/resolvedDay/isFallback when exact day exists", async () => {
    const snapshotData = {
      id: "s1",
      day: "2025-03-15",
      score: 82,
      contributors: { total_sleep: 88, efficiency: 90 },
      source: "oura",
      fetchedAt: "2025-03-15T10:00:00Z",
      totalSleepDuration: 28800,
      efficiency: 0.92,
    };

    (userCollection as jest.Mock).mockReturnValue({
      where: () => ({
        limit: () => ({
          get: async () => ({
            docs: [
              {
                exists: true,
                data: () => snapshotData,
              },
            ],
          }),
        }),
      }),
    });

    const res = await fetch(`${baseUrl}/users/me/oura-sleep-view?day=2025-03-15`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.requestedDay).toBe("2025-03-15");
    expect(body.resolvedDay).toBe("2025-03-15");
    expect(body.isFallback).toBe(false);
    expect(body.day).toBe("2025-03-15");
    expect(body.sourceId).toBe("oura");
    expect(body.score).toBe(82);
    expect(body.contributors).toEqual({ total_sleep: 88, efficiency: 90 });
    expect(body.totalMinutes).toBe(480);
  });

  it("oura-sleep-view converts latency stored in seconds to latencyMinutes", async () => {
    const snapshotData = {
      id: "s1",
      day: "2025-03-15",
      contributors: { latency: 51 },
      source: "oura",
      fetchedAt: "2025-03-15T10:00:00Z",
      totalSleepDuration: 28800,
      latency: 1470,
      efficiency: 63,
      remSleep: 270,
      deepSleep: 150,
    };

    (userCollection as jest.Mock).mockReturnValue({
      where: () => ({
        limit: () => ({
          get: async () => ({
            docs: [{ exists: true, data: () => snapshotData }],
          }),
        }),
      }),
    });

    const res = await fetch(`${baseUrl}/users/me/oura-sleep-view?day=2025-03-15`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.latencyMinutes).toBe(25);
  });

  it("oura-sleep-view returns 200 with isFallback true when exact day missing but prior day exists", async () => {
    const snapshotData = {
      id: "s1",
      day: "2025-03-13",
      score: 78,
      contributors: { total_sleep: 85 },
      source: "oura",
      fetchedAt: "2025-03-14T10:00:00Z",
    };

    (userCollection as jest.Mock).mockImplementation(() => ({
      where: (field: string, op?: string) => {
        if (field === "day" && op === "==") {
          return { limit: () => ({ get: async () => ({ docs: [] }) }) };
        }
        if (field === "day" && op === ">=") {
          return {
            where: () => ({
              orderBy: () => ({
                limit: () => ({
                  get: async () => ({
                    docs: [{ exists: true, data: () => snapshotData }],
                  }),
                }),
              }),
            }),
          };
        }
        return { limit: () => ({ get: async () => ({ docs: [] }) }) };
      },
    }));

    const res = await fetch(`${baseUrl}/users/me/oura-sleep-view?day=2025-03-15`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.requestedDay).toBe("2025-03-15");
    expect(body.resolvedDay).toBe("2025-03-13");
    expect(body.isFallback).toBe(true);
    expect(body.day).toBe("2025-03-13");
    expect(body.score).toBe(78);
  });

  it("oura-readiness-view returns 404 when no snapshot in fallback window or collection", async () => {
    (userCollection as jest.Mock).mockImplementation(() => ({
      where: (field: string, op?: string) => {
        if (field === "day" && op === "==") {
          return { limit: () => ({ get: async () => ({ docs: [] }) }) };
        }
        if (field === "day" && op === ">=") {
          return {
            where: () => ({
              orderBy: () => ({
                limit: () => ({ get: async () => ({ docs: [] }) }),
              }),
            }),
          };
        }
        return { limit: () => ({ get: async () => ({ docs: [] }) }) };
      },
      orderBy: () => ({
        limit: () => ({ get: async () => ({ docs: [] }) }),
      }),
    }));

    const res = await fetch(`${baseUrl}/users/me/oura-readiness-view?day=2025-03-15`);
    expect(res.status).toBe(404);
  });

  it("oura-sleep-view returns 200 from last-resort when exact and 7-day fallback both empty", async () => {
    const snapshotData = {
      id: "s_old",
      day: "2025-02-20",
      score: 70,
      contributors: { total_sleep: 75 },
      source: "oura",
      fetchedAt: "2025-02-21T10:00:00Z",
    };

    (userCollection as jest.Mock).mockImplementation(() => ({
      where: (field: string, op?: string) => {
        if (field === "day" && op === "==") {
          return { limit: () => ({ get: async () => ({ docs: [] }) }) };
        }
        if (field === "day" && op === ">=") {
          return {
            where: () => ({
              orderBy: () => ({
                limit: () => ({ get: async () => ({ docs: [] }) }),
              }),
            }),
          };
        }
        return { limit: () => ({ get: async () => ({ docs: [] }) }) };
      },
      orderBy: () => ({
        limit: () => ({
          get: async () => ({
            docs: [{ exists: true, data: () => snapshotData }],
          }),
        }),
      }),
    }));

    const res = await fetch(`${baseUrl}/users/me/oura-sleep-view?day=2025-03-15`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.requestedDay).toBe("2025-03-15");
    expect(body.resolvedDay).toBe("2025-02-20");
    expect(body.isFallback).toBe(true);
    expect(body.score).toBe(70);
  });

  it("oura-sleep-view returns total_sleep for short sleep when contributor key is missing but totalSleepDuration exists", async () => {
    const snapshotData = {
      id: "s1",
      day: "2025-03-15",
      source: "oura",
      fetchedAt: "2025-03-15T10:00:00Z",
      totalSleepDuration: 2460,
      efficiency: 63,
      latency: 1470,
      remSleep: 270,
      deepSleep: 150,
      contributors: { deep_sleep: 3, efficiency: 63, latency: 51, rem_sleep: 4 },
    };

    (userCollection as jest.Mock).mockReturnValue({
      where: () => ({
        limit: () => ({
          get: async () => ({
            docs: [{ exists: true, data: () => snapshotData }],
          }),
        }),
      }),
    });

    const res = await fetch(`${baseUrl}/users/me/oura-sleep-view?day=2025-03-15`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.contributors).toBeDefined();
    expect(typeof body.contributors.total_sleep).toBe("number");
    expect(body.contributors.total_sleep).toBeGreaterThanOrEqual(0);
    expect(body.contributors.total_sleep).toBeLessThanOrEqual(100);
    expect(body.latencyMinutes).toBe(25);
  });

  it("oura-sleep-view preserves existing contributor values and only fills missing keys", async () => {
    const snapshotData = {
      id: "s1",
      day: "2025-03-15",
      source: "oura",
      fetchedAt: "2025-03-15T10:00:00Z",
      totalSleepDuration: 28800,
      efficiency: 90,
      restfulSleep: 85,
      latency: 600,
      remSleep: 7200,
      deepSleep: 3600,
      contributors: { efficiency: 99 },
    };

    (userCollection as jest.Mock).mockReturnValue({
      where: () => ({
        limit: () => ({
          get: async () => ({
            docs: [{ exists: true, data: () => snapshotData }],
          }),
        }),
      }),
    });

    const res = await fetch(`${baseUrl}/users/me/oura-sleep-view?day=2025-03-15`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.contributors.efficiency).toBe(99);
    expect(body.contributors.total_sleep).toBeDefined();
    expect(body.contributors.restfulness).toBeDefined();
    expect(body.contributors.rem_sleep).toBeDefined();
    expect(body.contributors.deep_sleep).toBeDefined();
    expect(body.contributors.latency).toBeDefined();
  });

  it("oura-sleep-view returns score when stored doc has score", async () => {
    const snapshotData = {
      id: "s1",
      day: "2025-03-15",
      score: 82,
      contributors: { total_sleep: 80 },
      source: "oura",
      fetchedAt: "2025-03-15T10:00:00Z",
    };

    (userCollection as jest.Mock).mockReturnValue({
      where: () => ({
        limit: () => ({
          get: async () => ({
            docs: [{ exists: true, data: () => snapshotData }],
          }),
        }),
      }),
    });

    const res = await fetch(`${baseUrl}/users/me/oura-sleep-view?day=2025-03-15`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.score).toBe(82);
  });

  it("oura-sleep-view returns score when stored doc has composite_score but not score", async () => {
    const snapshotData = {
      id: "s1",
      day: "2025-03-15",
      composite_score: 72,
      contributors: {},
      source: "oura",
      fetchedAt: "2025-03-15T10:00:00Z",
    };

    (userCollection as jest.Mock).mockReturnValue({
      where: () => ({
        limit: () => ({
          get: async () => ({
            docs: [{ exists: true, data: () => snapshotData }],
          }),
        }),
      }),
    });

    const res = await fetch(`${baseUrl}/users/me/oura-sleep-view?day=2025-03-15`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.score).toBe(72);
  });

  it("oura-sleep-view does not invent score when neither score nor composite_score exists", async () => {
    const snapshotData = {
      id: "s1",
      day: "2025-03-15",
      contributors: { total_sleep: 80 },
      source: "oura",
      fetchedAt: "2025-03-15T10:00:00Z",
    };

    (userCollection as jest.Mock).mockReturnValue({
      where: () => ({
        limit: () => ({
          get: async () => ({
            docs: [{ exists: true, data: () => snapshotData }],
          }),
        }),
      }),
    });

    const res = await fetch(`${baseUrl}/users/me/oura-sleep-view?day=2025-03-15`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.score).toBeUndefined();
  });

  it("oura-readiness-view returns 200 with requestedDay/resolvedDay/isFallback when exact day exists", async () => {
    const snapshotData = {
      id: "r1",
      day: "2025-03-15",
      score: 76,
      contributors: { resting_heart_rate: 80, hrv_balance: 72 },
      source: "oura",
      fetchedAt: "2025-03-15T10:00:00Z",
    };

    (userCollection as jest.Mock).mockReturnValue({
      where: () => ({
        limit: () => ({
          get: async () => ({
            docs: [{ exists: true, data: () => snapshotData }],
          }),
        }),
      }),
    });

    const res = await fetch(`${baseUrl}/users/me/oura-readiness-view?day=2025-03-15`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.requestedDay).toBe("2025-03-15");
    expect(body.resolvedDay).toBe("2025-03-15");
    expect(body.isFallback).toBe(false);
    expect(body.day).toBe("2025-03-15");
    expect(body.sourceId).toBe("oura");
    expect(body.score).toBe(76);
    expect(body.contributors).toEqual({ resting_heart_rate: 80, hrv_balance: 72 });
  });
});
