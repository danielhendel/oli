// services/api/src/routes/__tests__/workoutDaySummaries.list.test.ts
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

describe("GET /users/me/workout-day-summaries", () => {
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

  it("returns complete true when every day in range has a valid summary doc", async () => {
    const item = {
      schemaVersion: 2,
      day: "2026-03-10",
      computedAt: "2026-03-10T12:00:00.000Z",
      reconcileVersion: "2",
      hasStrength: false,
      hasCardio: true,
      rawWorkoutCount: 1,
      strengthSessionCount: 0,
      cardioSessionCount: 1,
    };

    (userCollection as jest.Mock).mockImplementation((_uid: string, name: string) => {
      if (name === "workoutDaySummaries") {
        return {
          doc: (day: string) => ({
            get: jest.fn(async () =>
              day === "2026-03-10"
                ? { exists: true, data: () => item }
                : { exists: false },
            ),
          }),
        };
      }
      return { doc: () => ({ get: async () => ({ exists: false }) }) };
    });

    const res = await fetch(
      `${baseUrl}/users/me/workout-day-summaries?start=2026-03-10&end=2026-03-10`,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.complete).toBe(true);
    expect(json.expectedDayCount).toBe(1);
    expect(json.items).toHaveLength(1);
    expect(json.items[0].day).toBe("2026-03-10");
    expect(json.items[0].cardioSessionCount).toBe(1);
    expect(json.items[0].strengthSessionCount).toBe(0);
  });

  it("returns complete false when a day is missing", async () => {
    (userCollection as jest.Mock).mockImplementation((_uid: string, name: string) => {
      if (name === "workoutDaySummaries") {
        return {
          doc: () => ({
            get: jest.fn(async () => ({ exists: false })),
          }),
        };
      }
      return { doc: () => ({ get: async () => ({ exists: false }) }) };
    });

    const res = await fetch(
      `${baseUrl}/users/me/workout-day-summaries?start=2026-03-10&end=2026-03-11`,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.complete).toBe(false);
    expect(json.items).toHaveLength(0);
  });
});
