// services/api/src/routes/__tests__/rawEvents.read.test.ts
import express from "express";
import type http from "http";
import { AddressInfo } from "net";

import usersMeRoutes from "../usersMe";
import { userCollection } from "../../db";

jest.mock("../../db", () => ({
  userCollection: jest.fn(),
}));

type DocSnap = {
  exists: boolean;
  data: () => unknown;
};

type DocRef = {
  get: () => Promise<DocSnap>;
};

type CollectionRef = {
  doc: () => DocRef;
};

describe("GET /users/me/rawEvents/:id", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();

    // Inject authenticated uid (bypass authMiddleware for this unit test)
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

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("returns 200 with a contract-valid RawEvent doc", async () => {
    const rawEventId = "idem_key_1";

    const rawEvent = {
      schemaVersion: 1,
      id: rawEventId,
      userId: "user_123",
      sourceId: "upload",
      provider: "manual",
      sourceType: "manual",
      kind: "file",
      receivedAt: "2025-01-02T00:00:00.000Z",
      observedAt: "2025-01-02T00:00:00.000Z",
      payload: {
        storageBucket: "bucket_1",
        storagePath: "uploads/user_123/sha256/test.pdf",
        sha256: "abc",
        mimeType: "application/pdf",
        originalFilename: "test.pdf",
        sizeBytes: 123,
      },
    };

    (userCollection as jest.Mock).mockReturnValue({
      doc: () => ({
        get: async () =>
          ({
            exists: true,
            data: () => rawEvent,
          }) satisfies DocSnap,
      }),
    } satisfies CollectionRef);

    const res = await fetch(`${baseUrl}/users/me/rawEvents/${rawEventId}`);

    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json).toMatchObject({
      id: rawEventId,
      userId: "user_123",
      kind: "file",
      provider: "manual",
      sourceType: "manual",
      sourceId: "upload",
      schemaVersion: 1,
    });
  });

  test("returns 404 when rawEvent does not exist", async () => {
    const rawEventId = "missing_1";

    (userCollection as jest.Mock).mockReturnValue({
      doc: () => ({
        get: async () =>
          ({
            exists: false,
            data: () => null,
          }) satisfies DocSnap,
      }),
    } satisfies CollectionRef);

    const res = await fetch(`${baseUrl}/users/me/rawEvents/${rawEventId}`);

    expect(res.status).toBe(404);
    const json = await res.json();

    expect(json).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
  });
});
