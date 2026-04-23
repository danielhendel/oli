import express from "express";
import type http from "http";
import { AddressInfo } from "net";

import exerciseDefinitionsRoutes from "../exerciseDefinitions";
import { userCollection } from "../../db";

jest.mock("../../db", () => ({
  userCollection: jest.fn(),
}));

type DocSnap = { exists: boolean; data: () => unknown };
type DocRef = { get: () => Promise<DocSnap>; set: (data: unknown, opts?: unknown) => Promise<void> };
type QuerySnap = { docs: { id: string; data: () => unknown }[] };
type ColRef = { get: () => Promise<QuerySnap>; doc: (id: string) => DocRef };

describe("exerciseDefinitions routes", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as unknown as { uid: string }).uid = "user_ab12cd34";
      next();
    });
    app.use("/exercise-definitions", exerciseDefinitionsRoutes);
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

  test("GET returns empty items when collection empty", async () => {
    (userCollection as jest.Mock).mockReturnValue({
      get: async () => ({ docs: [] }),
    } satisfies ColRef);

    const res = await fetch(`${baseUrl}/exercise-definitions`);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { items: unknown[] };
    expect(json.items).toEqual([]);
  });

  test("POST creates document with stable migrated id", async () => {
    const setMock = jest.fn(async () => undefined);
    (userCollection as jest.Mock).mockReturnValue({
      get: async () => ({ docs: [] }),
      doc: () => ({
        get: async () => ({ exists: false, data: () => null }),
        set: setMock,
      }),
    } satisfies ColRef);

    const body = {
      name: "Z Press",
      equipment: "Dumbbell",
      primary: "Shoulders",
      loggingType: "weight_reps",
      exerciseId: "custom_userab12_z_press",
    };

    const res = await fetch(`${baseUrl}/exercise-definitions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    expect(res.status).toBe(201);
    const json = (await res.json()) as { exerciseId: string; name: string };
    expect(json.exerciseId).toBe("custom_userab12_z_press");
    expect(setMock).toHaveBeenCalled();
  });

  test("PUT updates existing row", async () => {
    const existing = {
      schemaVersion: 1,
      exerciseId: "custom_userab12_z_press",
      name: "Z Press",
      equipment: "Dumbbell",
      primary: "Shoulders",
      loggingType: "weight_reps",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const setMock = jest.fn(async () => undefined);
    (userCollection as jest.Mock).mockReturnValue({
      doc: () => ({
        get: async () => ({ exists: true, data: () => existing }),
        set: setMock,
      }),
    } satisfies Pick<ColRef, "doc">);

    const res = await fetch(
      `${baseUrl}/exercise-definitions/${encodeURIComponent("custom_userab12_z_press")}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Z-Press" }),
      },
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { name: string };
    expect(json.name).toBe("Z-Press");
    expect(setMock).toHaveBeenCalled();
  });

  test("PUT updates taxonomy extension fields", async () => {
    const existing = {
      schemaVersion: 1,
      exerciseId: "custom_userab12_z_press",
      name: "Z Press",
      equipment: "Dumbbell",
      primary: "Shoulders",
      loggingType: "weight_reps",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const setMock = jest.fn(async () => undefined);
    (userCollection as jest.Mock).mockReturnValue({
      doc: () => ({
        get: async () => ({ exists: true, data: () => existing }),
        set: setMock,
      }),
    } satisfies Pick<ColRef, "doc">);

    const res = await fetch(
      `${baseUrl}/exercise-definitions/${encodeURIComponent("custom_userab12_z_press")}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movementPattern: "push",
          aliases: ["z press", "z-press"],
          primaryMusclesDetailed: ["DeltsAnterior"],
        }),
      },
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { movementPattern?: string; aliases?: string[] };
    expect(json.movementPattern).toBe("push");
    expect(json.aliases).toEqual(["z press", "z-press"]);
    expect(setMock).toHaveBeenCalled();
  });
});
