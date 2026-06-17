// services/api/src/routes/__tests__/events.delete.test.ts
import express from "express";
import type http from "http";
import { AddressInfo } from "net";

import eventsRoutes from "../events";
import { userCollection } from "../../db";
import { finalizeManualNutritionIngestDelete } from "../../lib/nutrition/manualNutritionIngestDelete";
import { finalizeManualWeightIngestDelete } from "../../lib/body/manualWeightIngestDelete";
import { allowConsoleForThisTest } from "../../../../../scripts/test/consoleGuard";

jest.mock("../../db", () => ({
  userCollection: jest.fn(),
}));

jest.mock("../../lib/nutrition/manualNutritionIngestDelete", () => ({
  finalizeManualNutritionIngestDelete: jest.fn(async () => ({
    dayKey: "2026-03-15",
    canonicalDeleted: true,
  })),
  nutritionDayKeyFromManualPayload: jest.requireActual("../../lib/nutrition/manualNutritionIngestDelete")
    .nutritionDayKeyFromManualPayload,
}));

jest.mock("../../lib/body/manualWeightIngestDelete", () => ({
  finalizeManualWeightIngestDelete: jest.fn(async () => ({
    dayKey: "2026-06-06",
    canonicalDeleted: true,
  })),
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
    (finalizeManualNutritionIngestDelete as jest.Mock).mockResolvedValue({
      dayKey: "2026-03-15",
      canonicalDeleted: true,
    });
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
    const json = (await res.json()) as { ok: boolean; rawEventId: string; suppressionWritten: boolean };
    expect(json.ok).toBe(true);
    expect(json.rawEventId).toBe(rawEventId);
    expect(json.suppressionWritten).toBe(false);
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(suppressSetMock).not.toHaveBeenCalled();
    expect(finalizeManualNutritionIngestDelete).not.toHaveBeenCalled();
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
    const json200 = (await res.json()) as { suppressionWritten: boolean };
    expect(json200.suppressionWritten).toBe(true);
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(suppressSetMock).toHaveBeenCalledTimes(1);
    expect(finalizeManualNutritionIngestDelete).not.toHaveBeenCalled();
  });

  test("deletes an apple_health weight raw event and records suppression tombstone", async () => {
    const rawEventId = "appleHealth:v2:bodyWeight:2026-06-06T14:30:00.000Z_apple_watch";
    const rawEvent = {
      schemaVersion: 1,
      id: rawEventId,
      userId: "user_123",
      sourceId: "apple_health",
      provider: "apple_health",
      sourceType: "apple_health",
      kind: "weight",
      receivedAt: "2026-06-06T14:30:01.000Z",
      observedAt: "2026-06-06T14:30:00.000Z",
      payload: {
        time: "2026-06-06T14:30:00.000Z",
        timezone: "America/New_York",
        weightKg: 72.8931,
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
    const json200 = (await res.json()) as { suppressionWritten: boolean };
    expect(json200.suppressionWritten).toBe(true);
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(suppressSetMock).toHaveBeenCalledTimes(1);
    expect(finalizeManualWeightIngestDelete).toHaveBeenCalledWith({
      userId: "user_123",
      rawEventId,
      payload: rawEvent.payload,
    });
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
    const json404 = (await res.json()) as { suppressionWritten: boolean; error?: { code: string } };
    expect(json404.suppressionWritten).toBe(true);
    expect(json404.error?.code).toBe("NOT_FOUND");
  });

  test("404 delete returns suppressionWritten false and does not write tombstone for non-Apple-workout doc ids", async () => {
    const rawEventId = "manual_missing_doc_1";
    const suppressSetMock = jest.fn(async () => undefined);
    (userCollection as jest.Mock).mockImplementation((_uid: string, name: string) => {
      if (name === "rawEventIngestSuppressions") {
        return { doc: () => ({ set: suppressSetMock }) };
      }
      return {
        doc: () => ({
          get: async () => ({ exists: false }) as const,
        }),
      };
    });

    const res = await fetch(`${baseUrl}/ingest/${encodeURIComponent(rawEventId)}`, { method: "DELETE" });
    expect(res.status).toBe(404);
    expect(suppressSetMock).not.toHaveBeenCalled();
    const body = (await res.json()) as { suppressionWritten: boolean };
    expect(body.suppressionWritten).toBe(false);
  });

  test("Apple Health workout DELETE 404 returns 500 when suppression set() throws (failure not swallowed)", async () => {
    allowConsoleForThisTest({ error: [/raw_event_suppression_write_failed/] });
    const rawEventId = "appleHealth:v2:workout:fail_suppress_write_50_com.example.app";
    const suppressSetMock = jest.fn(async () => {
      throw new Error("permission_denied");
    });

    (userCollection as jest.Mock).mockImplementation((_uid: string, name: string) => {
      if (name === "rawEventIngestSuppressions") {
        return { doc: () => ({ set: suppressSetMock }) };
      }
      return {
        doc: () => ({
          get: async () => ({ exists: false }) as const,
        }),
      };
    });

    const res = await fetch(`${baseUrl}/ingest/${encodeURIComponent(rawEventId)}`, { method: "DELETE" });
    expect(res.status).toBe(500);
    expect(suppressSetMock).toHaveBeenCalledTimes(1);
    const errBody = (await res.json()) as {
      suppressionWritten: boolean;
      error?: { code: string; details?: { message: string } };
    };
    expect(errBody.suppressionWritten).toBe(false);
    expect(errBody.error?.code).toBe("SUPPRESSION_WRITE_FAILED");
    expect(errBody.error?.details?.message).toContain("permission_denied");
  });

  test("DELETE 200 returns 500 when Apple suppression write fails after raw delete", async () => {
    allowConsoleForThisTest({ error: [/raw_event_suppression_write_failed/] });
    const rawEventId = "appleHealth:v2:workout:post_delete_suppress_fail_50_com.example.app";
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
    const suppressSetMock = jest.fn(async () => {
      throw new Error("after_delete_tombstone_failed");
    });

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
    expect(res.status).toBe(500);
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(suppressSetMock).toHaveBeenCalledTimes(1);
    const failBody = (await res.json()) as { suppressionWritten: boolean; error?: { code: string } };
    expect(failBody.suppressionWritten).toBe(false);
    expect(failBody.error?.code).toBe("SUPPRESSION_WRITE_FAILED");
  });

  test("deletes a manual nutrition raw event without writing workout suppression", async () => {
    const rawEventId = "nm_meal_1";
    const rawEvent = {
      schemaVersion: 1,
      id: rawEventId,
      userId: "user_123",
      sourceId: "manual",
      provider: "manual",
      sourceType: "manual",
      kind: "nutrition",
      receivedAt: "2026-03-15T18:22:00.000Z",
      observedAt: "2026-03-15T18:22:00.000Z",
      payload: {
        start: "2026-03-15T18:22:00.000Z",
        end: "2026-03-15T18:22:01.000Z",
        timezone: "America/New_York",
        day: "2026-03-15",
        totalKcal: 220,
        proteinG: 5,
        carbsG: 43,
        fatG: 2.5,
        logScope: "meal",
        foodLabel: "Jasmine Rice",
        mealSlot: "dinner",
      },
    };

    const deleteMock = jest.fn(async () => undefined);
    const suppressSetMock = jest.fn(async () => undefined);

    (userCollection as jest.Mock).mockImplementation((uid: string, name: string) => {
      if (name === "rawEventIngestSuppressions") {
        return { doc: () => ({ set: suppressSetMock }) };
      }
      return {
        doc: () => ({
          get: async () => ({ exists: true, data: () => rawEvent }) as const,
          delete: deleteMock,
        }),
      };
    });

    const res = await fetch(`${baseUrl}/ingest/${rawEventId}`, { method: "DELETE" });

    expect(res.status).toBe(200);
    expect(userCollection).toHaveBeenCalledWith("user_123", "rawEvents");
    const json = (await res.json()) as { ok: boolean; rawEventId: string; suppressionWritten: boolean };
    expect(json.ok).toBe(true);
    expect(json.rawEventId).toBe(rawEventId);
    expect(json.suppressionWritten).toBe(false);
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(suppressSetMock).not.toHaveBeenCalled();
    expect(finalizeManualNutritionIngestDelete).toHaveBeenCalledWith({
      userId: "user_123",
      rawEventId,
      payload: rawEvent.payload,
    });
  });

  test("returns 500 when nutrition derived-truth cleanup fails after raw delete", async () => {
    const rawEventId = "nm_meal_fail";
    const rawEvent = {
      schemaVersion: 1,
      id: rawEventId,
      userId: "user_123",
      sourceId: "manual",
      provider: "manual",
      sourceType: "manual",
      kind: "nutrition",
      receivedAt: "2026-03-15T18:22:00.000Z",
      observedAt: "2026-03-15T18:22:00.000Z",
      payload: {
        start: "2026-03-15T18:22:00.000Z",
        end: "2026-03-15T18:22:01.000Z",
        timezone: "America/New_York",
        day: "2026-03-15",
        totalKcal: 220,
        proteinG: 5,
        carbsG: 43,
        fatG: 2.5,
      },
    };

    const deleteMock = jest.fn(async () => undefined);
    (finalizeManualNutritionIngestDelete as jest.Mock).mockRejectedValueOnce(new Error("recompute_failed"));

    (userCollection as jest.Mock).mockImplementation((_uid: string, name: string) => {
      if (name === "rawEventIngestSuppressions") {
        return { doc: () => ({ set: jest.fn() }) };
      }
      return {
        doc: () => ({
          get: async () => ({ exists: true, data: () => rawEvent }) as const,
          delete: deleteMock,
        }),
      };
    });

    const res = await fetch(`${baseUrl}/ingest/${rawEventId}`, { method: "DELETE" });

    expect(res.status).toBe(500);
    expect(deleteMock).toHaveBeenCalledTimes(1);
    const body = (await res.json()) as { error?: { code: string } };
    expect(body.error?.code).toBe("DELETE_DERIVED_TRUTH_FAILED");
  });

  test("rejects delete for a non-manual nutrition provider", async () => {
    const rawEventId = "off_scan_1";
    const rawEvent = {
      schemaVersion: 1,
      id: rawEventId,
      userId: "user_123",
      sourceId: "open_food_facts",
      provider: "open_food_facts",
      sourceType: "barcode",
      kind: "nutrition",
      receivedAt: "2026-03-15T18:22:00.000Z",
      observedAt: "2026-03-15T18:22:00.000Z",
      payload: {
        start: "2026-03-15T18:22:00.000Z",
        end: "2026-03-15T18:22:01.000Z",
        timezone: "America/New_York",
        totalKcal: 100,
        proteinG: 1,
        carbsG: 1,
        fatG: 1,
      },
    };

    const deleteMock = jest.fn(async () => undefined);

    (userCollection as jest.Mock).mockImplementation((_uid: string, name: string) => {
      if (name === "rawEventIngestSuppressions") {
        return { doc: () => ({ set: jest.fn() }) };
      }
      return {
        doc: () => ({
          get: async () => ({ exists: true, data: () => rawEvent }) as const,
          delete: deleteMock,
        }),
      };
    });

    const res = await fetch(`${baseUrl}/ingest/${rawEventId}`, { method: "DELETE" });

    expect(res.status).toBe(403);
    expect(deleteMock).not.toHaveBeenCalled();
    expect(finalizeManualNutritionIngestDelete).not.toHaveBeenCalled();
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
