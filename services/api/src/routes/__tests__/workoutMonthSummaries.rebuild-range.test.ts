import express from "express";
import type http from "http";
import { AddressInfo } from "net";

jest.mock("../../db", () => ({
  db: {},
  userCollection: jest.fn(),
  documentIdPath: { _: "documentId" },
}));

import usersMeRoutes from "../usersMe";

describe("POST /users/me/workout-month-summaries/rebuild-range", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
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

  it("returns 400 when body is invalid", async () => {
    const res = await fetch(`${baseUrl}/users/me/workout-month-summaries/rebuild-range`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { ok?: boolean };
    expect(json.ok).toBe(false);
  });
});
