// services/api/src/routes/__tests__/preferences.test.ts
import express from "express";
import type http from "http";
import { AddressInfo } from "net";

import preferencesRoutes from "../preferences";
import { userDoc } from "../../db";

jest.mock("../../db", () => ({
  userDoc: jest.fn(),
}));

type DocSnap = {
  exists: boolean;
  data: () => unknown;
};

type DocRef = {
  get: () => Promise<DocSnap>;
  set: (data: unknown, opts: unknown) => Promise<void>;
};

describe("GET/PUT /preferences", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());

    // Inject authenticated uid (bypass authMiddleware for this unit test)
    app.use((req, _res, next) => {
      (req as unknown as { uid: string }).uid = "user_123";
      next();
    });

    app.use("/preferences", preferencesRoutes);

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

  test("GET materializes defaults when missing and persists them", async () => {
    const setMock = jest.fn(async () => undefined);

    (userDoc as jest.Mock).mockReturnValue({
      get: async () =>
        ({
          exists: false,
          data: () => null,
        }) satisfies DocSnap,
      set: setMock,
    } satisfies DocRef);

    const res = await fetch(`${baseUrl}/preferences`);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toMatchObject({
      units: { mass: "lb" },
      timezone: { mode: "recorded" },
    });

    expect(setMock).toHaveBeenCalledTimes(1);
  });

  test("PUT updates preferences (mass unit kg) and returns validated prefs", async () => {
    const setMock = jest.fn(async () => undefined);

    (userDoc as jest.Mock).mockReturnValue({
      get: async () =>
        ({
          exists: true,
          data: () => ({ preferences: { units: { mass: "lb" }, timezone: { mode: "recorded" } } }),
        }) satisfies DocSnap,
      set: setMock,
    } satisfies DocRef);

    const res = await fetch(`${baseUrl}/preferences`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ units: { mass: "kg" } }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json).toMatchObject({
      units: { mass: "kg" },
      timezone: { mode: "recorded" },
    });

    expect(setMock).toHaveBeenCalledTimes(1);
  });
});
