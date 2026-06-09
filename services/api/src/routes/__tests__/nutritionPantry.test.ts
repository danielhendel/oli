// GET/POST/DELETE /users/me/nutrition/pantry
import express from "express";
import type http from "http";
import { AddressInfo } from "net";

import nutritionPantryRoutes from "../nutritionPantry";
import { userPantryCollection } from "../../db";

jest.mock("../../db", () => ({
  userPantryCollection: jest.fn(),
}));

type DocSnap = { exists: boolean; data: () => unknown; id: string };

function makeDocRef(
  id: string,
  opts: { exists?: boolean; data?: unknown } = {},
): { id: string; get: () => Promise<DocSnap>; create: jest.Mock } {
  const { exists = false, data = null } = opts;
  return {
    id,
    get: async () => ({ exists, data: () => data, id }) satisfies DocSnap,
    create: jest.fn(async () => undefined),
  };
}

const validBody = {
  label: "Stop & Shop eggs",
  oliFoodId: "dev_stop_shop_eggs_12",
  storeId: "stop_and_shop",
  productType: "food" as const,
  servingLabel: "2 large eggs",
  defaultServings: 1,
  macrosPerServing: { caloriesKcal: 140, proteinG: 12, carbsG: 1, fatG: 10 },
};

function storedItem(id: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    ...validBody,
    addedAt: "2025-02-01T10:00:00.000Z",
    schemaVersion: 1,
    ...overrides,
  };
}

describe("/users/me/nutrition/pantry", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as unknown as { uid: string }).uid = "pantry_test_uid";
      next();
    });
    app.use("/users/me", nutritionPantryRoutes);
    server = app.listen(0);
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => jest.resetAllMocks());

  test("GET returns empty list when pantry is empty", async () => {
    (userPantryCollection as jest.Mock).mockReturnValue({
      orderBy: jest.fn().mockReturnValue({
        get: jest.fn(async () => ({ docs: [] })),
      }),
    });

    const res = await fetch(`${baseUrl}/users/me/nutrition/pantry`);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { schemaVersion: number; items: unknown[] };
    expect(json.schemaVersion).toBe(1);
    expect(json.items).toEqual([]);
  });

  test("POST returns 400 when Idempotency-Key header is missing", async () => {
    (userPantryCollection as jest.Mock).mockReturnValue({ doc: jest.fn() });

    const res = await fetch(`${baseUrl}/users/me/nutrition/pantry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toMatchObject({ ok: false, error: { code: "MISSING_IDEMPOTENCY_KEY" } });
  });

  test("POST creates pantry item with deterministic id and returns 202", async () => {
    const docRef = makeDocRef("idem_pantry_1", { exists: false });
    const doc = jest.fn().mockReturnValue(docRef);
    (userPantryCollection as jest.Mock).mockReturnValue({ doc });

    const res = await fetch(`${baseUrl}/users/me/nutrition/pantry`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": "idem_pantry_1" },
      body: JSON.stringify(validBody),
    });

    expect(res.status).toBe(202);
    const json = (await res.json()) as { ok: boolean; id: string };
    expect(json.ok).toBe(true);
    expect(json.id).toBe("idem_pantry_1");
    expect(doc).toHaveBeenCalledWith("idem_pantry_1");
    expect(docRef.create).toHaveBeenCalledTimes(1);
  });

  test("POST with same key + identical content returns 202 idempotentReplay (no duplicate write)", async () => {
    const docRef = makeDocRef("idem_pantry_1", { exists: true, data: storedItem("idem_pantry_1") });
    const doc = jest.fn().mockReturnValue(docRef);
    (userPantryCollection as jest.Mock).mockReturnValue({ doc });

    const res = await fetch(`${baseUrl}/users/me/nutrition/pantry`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": "idem_pantry_1" },
      body: JSON.stringify(validBody),
    });

    expect(res.status).toBe(202);
    const json = (await res.json()) as { ok: boolean; id: string; idempotentReplay?: boolean };
    expect(json.idempotentReplay).toBe(true);
    expect(json.id).toBe("idem_pantry_1");
    expect(docRef.create).not.toHaveBeenCalled();
  });

  test("POST with same key + different content returns 409 conflict", async () => {
    const docRef = makeDocRef("idem_pantry_1", {
      exists: true,
      data: storedItem("idem_pantry_1", { label: "Different label" }),
    });
    const doc = jest.fn().mockReturnValue(docRef);
    (userPantryCollection as jest.Mock).mockReturnValue({ doc });

    const res = await fetch(`${baseUrl}/users/me/nutrition/pantry`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": "idem_pantry_1" },
      body: JSON.stringify(validBody),
    });

    expect(res.status).toBe(409);
    const json = (await res.json()) as { ok: boolean; error: { code: string } };
    expect(json.error.code).toBe("IMMUTABLE_CONFLICT");
    expect(docRef.create).not.toHaveBeenCalled();
  });

  test("POST returns 400 for invalid body", async () => {
    const docRef = makeDocRef("idem_pantry_1");
    (userPantryCollection as jest.Mock).mockReturnValue({ doc: jest.fn().mockReturnValue(docRef) });

    const res = await fetch(`${baseUrl}/users/me/nutrition/pantry`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": "idem_pantry_1" },
      body: JSON.stringify({ bad: true }),
    });

    expect(res.status).toBe(400);
    expect(docRef.create).not.toHaveBeenCalled();
  });

  test("DELETE returns 404 when item missing", async () => {
    (userPantryCollection as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn(async () => ({ exists: false })),
        delete: jest.fn(),
      }),
    });

    const res = await fetch(`${baseUrl}/users/me/nutrition/pantry/missing-id`, { method: "DELETE" });
    expect(res.status).toBe(404);
  });
});
