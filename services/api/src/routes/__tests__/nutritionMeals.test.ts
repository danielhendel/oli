// GET/POST/DELETE /users/me/nutrition/meals
import express from "express";
import type http from "http";
import { AddressInfo } from "net";

import nutritionMealsRoutes from "../nutritionMeals";
import { userMealsCollection } from "../../db";

jest.mock("../../db", () => ({
  userMealsCollection: jest.fn(),
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

const sampleMealItem = {
  id: "item-1",
  label: "Eggs",
  servings: 2,
  macrosPerServing: { caloriesKcal: 70, proteinG: 6, carbsG: 0.5, fatG: 5 },
};

const validBody = {
  name: "Breakfast",
  items: [sampleMealItem],
  defaultMealSlot: "breakfast" as const,
};

function storedMeal(id: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    name: "Breakfast",
    items: [sampleMealItem],
    totals: { caloriesKcal: 140, proteinG: 12, carbsG: 1, fatG: 10 },
    defaultMealSlot: "breakfast",
    createdAt: "2025-02-01T10:00:00.000Z",
    updatedAt: "2025-02-01T10:00:00.000Z",
    schemaVersion: 1,
    ...overrides,
  };
}

describe("/users/me/nutrition/meals", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as unknown as { uid: string }).uid = "meals_test_uid";
      next();
    });
    app.use("/users/me", nutritionMealsRoutes);
    server = app.listen(0);
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => jest.resetAllMocks());

  test("GET returns empty list when no meals", async () => {
    (userMealsCollection as jest.Mock).mockReturnValue({
      orderBy: jest.fn().mockReturnValue({
        get: jest.fn(async () => ({ docs: [] })),
      }),
    });

    const res = await fetch(`${baseUrl}/users/me/nutrition/meals`);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { schemaVersion: number; items: unknown[] };
    expect(json.schemaVersion).toBe(1);
    expect(json.items).toEqual([]);
  });

  test("POST returns 400 when Idempotency-Key header is missing", async () => {
    (userMealsCollection as jest.Mock).mockReturnValue({ doc: jest.fn() });

    const res = await fetch(`${baseUrl}/users/me/nutrition/meals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toMatchObject({ ok: false, error: { code: "MISSING_IDEMPOTENCY_KEY" } });
  });

  test("POST creates meal with deterministic id + computed totals and returns 202", async () => {
    const docRef = makeDocRef("idem_meal_1", { exists: false });
    const create = docRef.create;
    const doc = jest.fn().mockReturnValue(docRef);
    (userMealsCollection as jest.Mock).mockReturnValue({ doc });

    const res = await fetch(`${baseUrl}/users/me/nutrition/meals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": "idem_meal_1" },
      body: JSON.stringify(validBody),
    });

    expect(res.status).toBe(202);
    const json = (await res.json()) as { ok: boolean; id: string };
    expect(json.ok).toBe(true);
    expect(json.id).toBe("idem_meal_1");
    expect(doc).toHaveBeenCalledWith("idem_meal_1");
    expect(create).toHaveBeenCalledTimes(1);
    const written = create.mock.calls[0][0] as { totals: { caloriesKcal: number; proteinG: number } };
    expect(written.totals.caloriesKcal).toBe(140);
    expect(written.totals.proteinG).toBe(12);
  });

  test("POST with same key + identical content returns 202 idempotentReplay (no duplicate write)", async () => {
    const docRef = makeDocRef("idem_meal_1", { exists: true, data: storedMeal("idem_meal_1") });
    const doc = jest.fn().mockReturnValue(docRef);
    (userMealsCollection as jest.Mock).mockReturnValue({ doc });

    const res = await fetch(`${baseUrl}/users/me/nutrition/meals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": "idem_meal_1" },
      body: JSON.stringify(validBody),
    });

    expect(res.status).toBe(202);
    const json = (await res.json()) as { idempotentReplay?: boolean; id: string };
    expect(json.idempotentReplay).toBe(true);
    expect(docRef.create).not.toHaveBeenCalled();
  });

  test("POST with same key + different content returns 409 conflict", async () => {
    const docRef = makeDocRef("idem_meal_1", {
      exists: true,
      data: storedMeal("idem_meal_1", { name: "Dinner" }),
    });
    const doc = jest.fn().mockReturnValue(docRef);
    (userMealsCollection as jest.Mock).mockReturnValue({ doc });

    const res = await fetch(`${baseUrl}/users/me/nutrition/meals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": "idem_meal_1" },
      body: JSON.stringify(validBody),
    });

    expect(res.status).toBe(409);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe("IMMUTABLE_CONFLICT");
    expect(docRef.create).not.toHaveBeenCalled();
  });

  test("POST returns 400 for invalid body", async () => {
    const docRef = makeDocRef("idem_meal_1");
    (userMealsCollection as jest.Mock).mockReturnValue({ doc: jest.fn().mockReturnValue(docRef) });

    const res = await fetch(`${baseUrl}/users/me/nutrition/meals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": "idem_meal_1" },
      body: JSON.stringify({ name: "" }),
    });

    expect(res.status).toBe(400);
    expect(docRef.create).not.toHaveBeenCalled();
  });
});
