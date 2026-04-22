// services/api/src/routes/__tests__/events.delete.test.ts
import express from "express";
import type http from "http";
import { AddressInfo } from "net";

import eventsRoutes from "../events";
import { userCollection } from "../../db";

jest.mock("../../db", () => ({
  userCollection: jest.fn(),
}));

describe("DELETE /ingest/:rawEventId", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();

    app.use((req, _res, next) => {
      (req as unknown as { uid: string }).uid = "user_123";
      next();
    });

    app.use("/ingest", eventsRoutes);

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

  test("deletes a manual strength_workout raw event", async () => {
    const rawEventId = "manual_key_1";
    const rawEvent = {
      schemaVersion: 1,
      id: rawEventId,
      userId: "user_123",
      sourceId: "manual",
      provider: "manual",
      sourceType: "manual",
      kind: "strength_workout",
      receivedAt: "2025-01-02T00:00:00.000Z",
      observedAt: "2025-01-02T00:00:00.000Z",
      payload: {
        startedAt: "2025-01-02T00:00:00.000Z",
        timeZone: "America/New_York",
        exercises: [{ name: "Bench", sets: [{ reps: 5, load: 60, unit: "kg" as const }] }],
      },
    };

    const deleteMock = jest.fn(async () => undefined);
    const suppressSetMock = jest.fn(async () => undefined);

    (userCollection as jest.Mock).mockImplementation((_uid: string, name: string) => {
      if (name === "rawEventIngestSuppressions") {
        return { doc: () => ({ set: suppressSetMock }) };
      }
      return {
        doc: () => ({
          get: async () =>
            ({
              exists: true,
              data: () => rawEvent,
            }) as const,
          delete: deleteMock,
        }),
      };
    });

    const res = await fetch(`${baseUrl}/ingest/${rawEventId}`, { method: "DELETE" });

    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; rawEventId: string };
    expect(json.ok).toBe(true);
    expect(json.rawEventId).toBe(rawEventId);
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(suppressSetMock).not.toHaveBeenCalled();
  });

  test("deletes an apple_health strength_workout raw event (removes Oli record only)", async () => {
    const rawEventId = "appleHealth:v2:workout:2025-01-02T00_2025-01-02T01_50_com.example.app";
    const rawEvent = {
      schemaVersion: 1,
      id: rawEventId,
      userId: "user_123",
      sourceId: "healthkit",
      provider: "apple_health",
      sourceType: "apple_health",
      kind: "strength_workout",
      receivedAt: "2025-01-02T00:00:00.000Z",
      observedAt: "2025-01-02T00:00:00.000Z",
      payload: {
        startedAt: "2025-01-02T00:00:00.000Z",
        timeZone: "America/New_York",
        exercises: [{ name: "Squat", sets: [{ reps: 5, load: 60, unit: "kg" as const }] }],
      },
    };

    const deleteMock = jest.fn(async () => undefined);
    const suppressSetMock = jest.fn(async () => undefined);

    (userCollection as jest.Mock).mockImplementation((_uid: string, name: string) => {
      if (name === "rawEventIngestSuppressions") {
        return { doc: () => ({ set: suppressSetMock }) };
      }
      return {
        doc: () => ({
          get: async () =>
            ({
              exists: true,
              data: () => rawEvent,
            }) as const,
          delete: deleteMock,
        }),
      };
    });

    const res = await fetch(`${baseUrl}/ingest/${encodeURIComponent(rawEventId)}`, { method: "DELETE" });

    expect(res.status).toBe(200);
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(suppressSetMock).toHaveBeenCalledTimes(1);
  });

  test("404 delete still records Apple Health workout suppression for resurrection guard", async () => {
    const rawEventId = "appleHealth:v2:workout:gone_but_suppress_50_com.example.app";
    const suppressSetMock = jest.fn(async () => undefined);

    (userCollection as jest.Mock).mockImplementation((_uid: string, name: string) => {
      if (name === "rawEventIngestSuppressions") {
        return { doc: () => ({ set: suppressSetMock }) };
      }
      return {
        doc: () => ({
          get: async () => ({ exists: false }) as const,
          delete: jest.fn(),
        }),
      };
    });

    const res = await fetch(`${baseUrl}/ingest/${encodeURIComponent(rawEventId)}`, { method: "DELETE" });

    expect(res.status).toBe(404);
    expect(suppressSetMock).toHaveBeenCalledTimes(1);
  });

  test("rejects delete for unsupported workout provider", async () => {
    const rawEventId = "vendor_xyz_1";
    const rawEvent = {
      schemaVersion: 1,
      id: rawEventId,
      userId: "user_123",
      sourceId: "vendor_xyz",
      provider: "vendor_xyz",
      sourceType: "vendor_xyz",
      kind: "workout",
      receivedAt: "2025-01-02T00:00:00.000Z",
      observedAt: "2025-01-02T00:00:00.000Z",
      payload: {
        start: "2025-01-02T00:00:00.000Z",
        end: "2025-01-02T01:00:00.000Z",
        timezone: "America/New_York",
        sport: "running",
        durationMinutes: 30,
      },
    };

    const deleteMock = jest.fn(async () => undefined);
    const suppressSetMock = jest.fn(async () => undefined);

    (userCollection as jest.Mock).mockImplementation((_uid: string, name: string) => {
      if (name === "rawEventIngestSuppressions") {
        return { doc: () => ({ set: suppressSetMock }) };
      }
      return {
        doc: () => ({
          get: async () =>
            ({
              exists: true,
              data: () => rawEvent,
            }) as const,
          delete: deleteMock,
        }),
      };
    });

    const res = await fetch(`${baseUrl}/ingest/${rawEventId}`, { method: "DELETE" });

    expect(res.status).toBe(403);
    expect(deleteMock).not.toHaveBeenCalled();
    expect(suppressSetMock).not.toHaveBeenCalled();
  });
});
