// GET /users/me/nutrition/stores
import express from "express";
import type http from "http";
import { AddressInfo } from "net";

import nutritionStoresRoutes from "../nutritionStores";

describe("/users/me/nutrition/stores", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as unknown as { uid: string }).uid = "stores_test_uid";
      next();
    });
    app.use("/users/me", nutritionStoresRoutes);
    server = app.listen(0);
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test("GET returns seeded store catalog", async () => {
    const res = await fetch(`${baseUrl}/users/me/nutrition/stores`);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { schemaVersion: number; items: { id: string; name: string }[] };
    expect(json.schemaVersion).toBe(1);
    expect(json.items.length).toBeGreaterThanOrEqual(5);
    const ids = json.items.map((s) => s.id);
    expect(ids).toContain("stop_and_shop");
    expect(ids).toContain("costco");
    expect(ids).toContain("vitamin_shoppe");
  });
});
