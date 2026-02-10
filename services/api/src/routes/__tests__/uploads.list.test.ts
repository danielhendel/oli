// services/api/src/routes/__tests__/uploads.list.test.ts
import express from "express";
import type http from "http";
import { AddressInfo } from "net";

import usersMeRoutes from "../usersMe";
import { userCollection } from "../../db";
import { allowConsoleForThisTest } from "../../../../../scripts/test/consoleGuard";

jest.mock("../../db", () => ({
  userCollection: jest.fn(),
}));

type QuerySnap = {
  docs: { id: string; data: () => unknown }[];
};

type QueryRef = {
  where: (field: string, op: string, value: unknown) => QueryRef;
  orderBy: (field: string, direction?: string) => QueryRef;
  limit: (n: number) => { get: () => Promise<QuerySnap> };
};

function makeQueryRef(docs: { id: string; data: () => unknown }[]): QueryRef {
  const chain: QueryRef = {
    where: () => chain,
    orderBy: () => chain,
    limit: () => ({
      get: async () => ({ docs }),
    }),
  };
  return chain;
}

function makeUploadRawEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: "idem_1",
    userId: "user_123",
    sourceId: "upload",
    provider: "manual",
    sourceType: "manual",
    kind: "file",
    receivedAt: "2025-01-02T10:00:00.000Z",
    observedAt: "2025-01-02T10:00:00.000Z",
    payload: {
      storageBucket: "bucket_1",
      storagePath: "uploads/user_123/sha256/test.pdf",
      sha256: "abc",
      mimeType: "application/pdf",
      originalFilename: "test.pdf",
      sizeBytes: 123,
    },
    ...overrides,
  };
}

describe("GET /users/me/uploads", () => {
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

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("returns 200 with count=0 and latest=null when no uploads", async () => {
    (userCollection as jest.Mock).mockReturnValue(
      makeQueryRef([]),
    );

    const res = await fetch(`${baseUrl}/users/me/uploads`);

    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json).toMatchObject({
      ok: true,
      count: 0,
      latest: null,
    });
  });

  test("returns latest as most recent when two file uploads exist", async () => {
    const older = makeUploadRawEvent({
      id: "idem_older",
      observedAt: "2025-01-01T09:00:00.000Z",
      receivedAt: "2025-01-01T09:00:00.000Z",
      payload: {
        storageBucket: "b",
        storagePath: "uploads/..",
        sha256: "xyz",
        mimeType: "application/pdf",
        originalFilename: "older.pdf",
        sizeBytes: 100,
      },
    });
    const newer = makeUploadRawEvent({
      id: "idem_newer",
      observedAt: "2025-01-02T10:00:00.000Z",
      receivedAt: "2025-01-02T10:00:00.000Z",
      payload: {
        storageBucket: "b",
        storagePath: "uploads/..",
        sha256: "def",
        mimeType: "image/png",
        originalFilename: "newer.png",
        sizeBytes: 200,
      },
    });

    const mockGet = jest.fn().mockResolvedValue({
      docs: [
        { id: "idem_newer", data: () => newer },
        { id: "idem_older", data: () => older },
      ],
    });

    (userCollection as jest.Mock).mockReturnValue({
      where: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => ({ get: mockGet }),
          }),
        }),
      }),
    });

    const res = await fetch(`${baseUrl}/users/me/uploads`);

    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json).toMatchObject({
      ok: true,
      count: 2,
      latest: {
        rawEventId: "idem_newer",
        observedAt: "2025-01-02T10:00:00.000Z",
        receivedAt: "2025-01-02T10:00:00.000Z",
        originalFilename: "newer.png",
        mimeType: "image/png",
      },
    });
  });

  test("excludes non-upload file (kind=file but sourceId != upload)", async () => {
    const uploadDoc = makeUploadRawEvent({ id: "idem_upload" });

    const mockGet = jest.fn().mockResolvedValue({
      docs: [
        { id: "idem_upload", data: () => uploadDoc },
      ],
    });

    (userCollection as jest.Mock).mockReturnValue({
      where: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => ({ get: mockGet }),
          }),
        }),
      }),
    });

    const res = await fetch(`${baseUrl}/users/me/uploads`);

    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.count).toBe(1);
    expect(json.latest.rawEventId).toBe("idem_upload");
  });

  test("excludes non-file rawEvent (kind != file)", async () => {
    const uploadDoc = makeUploadRawEvent({ id: "idem_upload" });

    const mockGet = jest.fn().mockResolvedValue({
      docs: [
        { id: "idem_upload", data: () => uploadDoc },
      ],
    });

    (userCollection as jest.Mock).mockReturnValue({
      where: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => ({ get: mockGet }),
          }),
        }),
      }),
    });

    const res = await fetch(`${baseUrl}/users/me/uploads`);

    expect(res.status).toBe(200);
    expect(res.json).toBeDefined();
  });

  test("returns 500 with INVALID_DOC when stored rawEvent fails validation", async () => {
    allowConsoleForThisTest({ error: [/invalid_firestore_doc/] });
    const invalidDoc = {
      schemaVersion: 1,
      id: "idem_bad",
      userId: "user_123",
      sourceId: "upload",
      provider: "manual",
      sourceType: "manual",
      kind: "file",
      receivedAt: "2025-01-02T10:00:00.000Z",
      observedAt: "2025-01-02T10:00:00.000Z",
      payload: {
        storageBucket: "",
        storagePath: "",
        sha256: "",
        mimeType: "",
        originalFilename: "",
        sizeBytes: -1,
      },
    };

    const mockGet = jest.fn().mockResolvedValue({
      docs: [{ id: "idem_bad", data: () => invalidDoc }],
    });

    (userCollection as jest.Mock).mockReturnValue({
      where: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => ({ get: mockGet }),
          }),
        }),
      }),
    });

    const res = await fetch(`${baseUrl}/users/me/uploads`);

    expect(res.status).toBe(500);
    const json = await res.json();

    expect(json).toMatchObject({
      ok: false,
      error: {
        code: "INVALID_DOC",
        message: expect.stringContaining("rawEvents"),
        requestId: expect.any(String),
      },
    });
  });

  test("accepts limit query param within bounds", async () => {
    (userCollection as jest.Mock).mockReturnValue(
      makeQueryRef([]),
    );

    const res = await fetch(`${baseUrl}/users/me/uploads?limit=25`);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.count).toBe(0);
  });
});
