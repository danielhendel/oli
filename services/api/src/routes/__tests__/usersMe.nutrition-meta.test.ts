// GET/PUT /users/me/nutrition-meta — user nutrition UI metadata (API-only writes)
import express from "express";
import type http from "http";
import { AddressInfo } from "net";

import nutritionUserMetaRoutes from "../nutritionUserMeta";
import { userNutritionMetaStateDoc } from "../../db";
import { defaultNutritionMetaDto } from "@oli/contracts/nutritionMeta";

jest.mock("../../db", () => ({
  userNutritionMetaStateDoc: jest.fn(),
}));

describe("/users/me/nutrition-meta", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as unknown as { uid: string }).uid = "nutrition_meta_test_uid";
      next();
    });
    app.use("/users/me", nutritionUserMetaRoutes);
    server = app.listen(0);
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => jest.resetAllMocks());

  test("GET returns defaults when doc is missing", async () => {
    (userNutritionMetaStateDoc as jest.Mock).mockReturnValue({
      get: jest.fn(async () => ({ exists: false })),
    });

    const res = await fetch(`${baseUrl}/users/me/nutrition-meta`);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { schemaVersion: number; recentFoods: unknown[]; favoriteFoods: unknown[] };
    expect(json.schemaVersion).toBe(1);
    expect(json.recentFoods).toEqual([]);
    expect(json.favoriteFoods).toEqual([]);
  });

  test("GET returns stored doc when valid", async () => {
    const stored = defaultNutritionMetaDto();
    (userNutritionMetaStateDoc as jest.Mock).mockReturnValue({
      get: jest.fn(async () => ({
        exists: true,
        data: () => stored,
      })),
    });

    const res = await fetch(`${baseUrl}/users/me/nutrition-meta`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(stored);
  });

  test("PUT persists valid body and echoes JSON", async () => {
    const set = jest.fn(async () => undefined);
    (userNutritionMetaStateDoc as jest.Mock).mockReturnValue({ set });

    const body = defaultNutritionMetaDto();
    const res = await fetch(`${baseUrl}/users/me/nutrition-meta`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    expect(res.status).toBe(200);
    expect(set).toHaveBeenCalledWith(body);
    const json = await res.json();
    expect(json).toEqual(body);
  });

  test("PUT returns 400 for invalid body", async () => {
    const set = jest.fn();
    (userNutritionMetaStateDoc as jest.Mock).mockReturnValue({ set });

    const res = await fetch(`${baseUrl}/users/me/nutrition-meta`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bad: true }),
    });

    expect(res.status).toBe(400);
    expect(set).not.toHaveBeenCalled();
  });
});
