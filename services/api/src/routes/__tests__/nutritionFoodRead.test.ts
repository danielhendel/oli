import express from "express";
import type http from "http";
import { AddressInfo } from "net";

jest.mock("../../db", () => ({
  userCollection: jest.fn(),
  userDoc: jest.fn(),
  documentIdPath: { _: "documentId" },
}));

import usersMeRoutes from "../usersMe";

describe("GET /users/me/nutrition/* (dev catalog)", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.NUTRITION_FOOD_GRAPH_DISABLED = "1";
    const app = express();
    app.use((req, _res, next) => {
      (req as unknown as { uid: string }).uid = "user_nutrition_read";
      next();
    });
    app.use("/users/me", usersMeRoutes);
    server = app.listen(0);
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    delete process.env.NUTRITION_FOOD_GRAPH_DISABLED;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("returns food-search results for query=oats", async () => {
    const res = await fetch(`${baseUrl}/users/me/nutrition/food-search?q=oats`);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { schemaVersion: number; items: { id: string }[] };
    expect(json.schemaVersion).toBe(1);
    expect(json.items.some((i) => i.id === "dev_oats_40g")).toBe(true);
  });

  it("returns at least one food for query=chicken (substring match)", async () => {
    const res = await fetch(`${baseUrl}/users/me/nutrition/food-search?q=chicken`);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { items: { id: string }[] };
    expect(json.items.some((i) => i.id === "dev_chicken_breast_100g")).toBe(true);
  });

  it("returns food detail by id", async () => {
    const res = await fetch(`${baseUrl}/users/me/nutrition/food/dev_greek_yogurt_170g`);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { id: string; name: string };
    expect(json.id).toBe("dev_greek_yogurt_170g");
    expect(json.name).toContain("Greek yogurt");
  });

  it("returns food by barcode", async () => {
    const res = await fetch(`${baseUrl}/users/me/nutrition/food-by-barcode/0085000427483`);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { id: string };
    expect(json.id).toBe("dev_oats_40g");
  });

  it("returns chicken by seeded dev barcode", async () => {
    const res = await fetch(`${baseUrl}/users/me/nutrition/food-by-barcode/0850040999123`);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { id: string; name: string };
    expect(json.id).toBe("dev_chicken_breast_100g");
    expect(json.name).toContain("Chicken");
  });

  it("returns 404 for unknown barcode", async () => {
    const res = await fetch(`${baseUrl}/users/me/nutrition/food-by-barcode/0000000000000`);
    expect(res.status).toBe(404);
  });
});
