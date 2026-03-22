// services/api/src/routes/__tests__/workoutMonthSummaries.list.test.ts
import express from "express";
import type http from "http";
import { AddressInfo } from "net";

import usersMeRoutes from "../usersMe";
import { userCollection } from "../../db";

jest.mock("../../db", () => ({
  db: {},
  userCollection: jest.fn(),
  documentIdPath: { _: "documentId" },
}));

describe("GET /users/me/workout-month-summaries", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use((req, _res, next) => {
      (req as unknown as { uid: string }).uid = "user_123";
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
    jest.resetAllMocks();
  });

  const monthRow = (mk: string) => ({
    schemaVersion: 1,
    monthKey: mk,
    computedAt: "2026-01-01T00:00:00.000Z",
    reconcileVersion: "1",
    strengthSessionCount: 0,
    cardioSessionCount: 0,
    strengthWeekKeys: [] as string[],
    cardioWeekKeys: [] as string[],
    strengthDurationSumCapped: 0,
    strengthDurationCountCapped: 0,
    cardioDurationSumCapped: 0,
    cardioDurationCountCapped: 0,
  });

  it("returns complete true when all 12 months exist and validate", async () => {
    const months = Array.from({ length: 12 }, (_, i) => monthRow(`2026-${String(i + 1).padStart(2, "0")}`));

    (userCollection as jest.Mock).mockImplementation((_uid: string, name: string) => {
      if (name === "workoutMonthSummaries") {
        return {
          doc: (mk: string) => ({
            get: jest.fn(async () => {
              const row = months.find((m) => m.monthKey === mk);
              return row ? { exists: true, data: () => row } : { exists: false };
            }),
          }),
        };
      }
      return { doc: () => ({ get: async () => ({ exists: false }) }) };
    });

    const res = await fetch(`${baseUrl}/users/me/workout-month-summaries?year=2026`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.complete).toBe(true);
    expect(json.items).toHaveLength(12);
  });

  it("returns complete false when a month is missing", async () => {
    (userCollection as jest.Mock).mockImplementation((_uid: string, name: string) => {
      if (name === "workoutMonthSummaries") {
        return {
          doc: (mk: string) => ({
            get: jest.fn(async () =>
              mk === "2026-01"
                ? { exists: true, data: () => monthRow("2026-01") }
                : { exists: false },
            ),
          }),
        };
      }
      return { doc: () => ({ get: async () => ({ exists: false }) }) };
    });

    const res = await fetch(`${baseUrl}/users/me/workout-month-summaries?year=2026`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.complete).toBe(false);
  });
});
