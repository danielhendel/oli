// services/api/src/routes/__tests__/lineage.test.ts
import express from "express";
import type http from "http";
import { AddressInfo } from "net";

import usersMeRoutes from "../usersMe";
import { userCollection } from "../../db";

jest.mock("../../db", () => ({
  userCollection: jest.fn(),
  documentIdPath: { _: "documentId" },
}));

describe("GET /users/me/lineage", () => {
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

  test("returns 200 with lineage for canonicalEventId", async () => {
    (userCollection as jest.Mock).mockImplementation((_uid: string, name: string) => {
      if (name === "events") {
        return {
          doc: (id: string) => ({
            get: async () =>
              id === "evt_1"
                ? {
                    exists: true,
                    data: () => ({ id: "evt_1", day: "2025-01-02" }),
                  }
                : { exists: false },
          }),
        };
      }
      if (name === "derivedLedger") {
        return {
          doc: () => ({
            collection: () => ({
              orderBy: () => ({ limit: () => ({ get: async () => ({ docs: [] }) }) }),
            }),
          }),
        };
      }
      return {};
    });

    const res = await fetch(`${baseUrl}/users/me/lineage?canonicalEventId=evt_1`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("rawEventIds");
    expect(json).toHaveProperty("canonicalEventId", "evt_1");
  });

  test("invalid query (missing params) fails with 400", async () => {
    const res = await fetch(`${baseUrl}/users/me/lineage`);
    expect(res.status).toBe(400);
  });
});
