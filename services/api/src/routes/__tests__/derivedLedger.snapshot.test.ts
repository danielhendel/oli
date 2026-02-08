// services/api/src/routes/__tests__/derivedLedger.snapshot.test.ts
import express from "express";
import type http from "http";
import { AddressInfo } from "net";

import usersMeRoutes from "../usersMe";
import { userCollection } from "../../db";

jest.mock("../../db", () => ({
  userCollection: jest.fn(),
  documentIdPath: { _: "documentId" },
}));

describe("GET /users/me/derived-ledger/snapshot", () => {
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

  test("snapshot alias behaves like replay - requires day param", async () => {
    (userCollection as jest.Mock).mockReturnValue({
      doc: () => ({
        get: async () => ({ exists: false }),
      }),
    });

    const res = await fetch(`${baseUrl}/users/me/derived-ledger/snapshot`);
    expect(res.status).toBe(400);
  });

  test("snapshot returns 404 when no derived ledger for day", async () => {
    (userCollection as jest.Mock).mockReturnValue({
      doc: () => ({
        get: async () => ({ exists: false }),
      }),
    });

    const res = await fetch(
      `${baseUrl}/users/me/derived-ledger/snapshot?day=2025-01-01`,
    );
    expect(res.status).toBe(404);
  });
});
