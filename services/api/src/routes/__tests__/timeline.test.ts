// services/api/src/routes/__tests__/timeline.test.ts
import express from "express";
import type http from "http";
import { AddressInfo } from "net";

import usersMeRoutes from "../usersMe";
import { userCollection } from "../../db";

jest.mock("../../db", () => ({
  userCollection: jest.fn(),
  documentIdPath: { _: "documentId" },
}));

describe("GET /users/me/timeline", () => {
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

  beforeEach(() => jest.resetAllMocks());

  test("returns 200 with timeline days", async () => {
    (userCollection as jest.Mock).mockImplementation((_uid: string, name: string) => {
      if (name === "events") {
        return { where: () => ({ get: async () => ({ size: 0, docs: [] }) }) };
      }
      if (name === "dailyFacts" || name === "intelligenceContext" || name === "derivedLedger") {
        return { doc: () => ({ get: async () => ({ exists: false }) }) };
      }
      if (name === "insights") {
        return { where: () => ({ get: async () => ({ docs: [] }) }) };
      }
      return {};
    });

    const res = await fetch(`${baseUrl}/users/me/timeline?start=2025-01-01&end=2025-01-03`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.days).toHaveLength(3);
  });

  test("invalid query (start > end) fails with 400", async () => {
    const res = await fetch(`${baseUrl}/users/me/timeline?start=2025-01-03&end=2025-01-01`);
    expect(res.status).toBe(400);
  });
});
