// services/api/src/routes/__tests__/rawEvents.list.test.ts
import express from "express";
import type http from "http";
import { AddressInfo } from "net";

import usersMeRoutes from "../usersMe";
import { userCollection } from "../../db";
import { allowConsoleForThisTest } from "../../../../../scripts/test/consoleGuard";

jest.mock("../../db", () => ({
  userCollection: jest.fn(),
  documentIdPath: { _: "documentId" },
}));

type DocSnap = {
  exists: boolean;
  id: string;
  data: () => unknown;
};

type QuerySnap = {
  docs: DocSnap[];
  size: number;
};

type QueryRef = {
  orderBy: jest.Mock;
  where: jest.Mock;
  limit: jest.Mock;
  startAfter: jest.Mock;
  get: () => Promise<QuerySnap>;
};

function createMockQuery(docs: DocSnap[]): QueryRef {
  const chain: QueryRef = {
    orderBy: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    startAfter: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ docs, size: docs.length }),
  };
  return chain;
}

describe("GET /users/me/raw-events", () => {
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

  test("returns 200 with valid items and validates response DTO", async () => {
    const docs: DocSnap[] = [
      {
        exists: true,
        id: "raw_1",
        data: () => ({
          schemaVersion: 1,
          id: "raw_1",
          userId: "user_123",
          sourceId: "manual",
          kind: "weight",
          observedAt: "2025-01-02T12:00:00.000Z",
          receivedAt: "2025-01-02T12:01:00.000Z",
        }),
      },
    ];

    const q = createMockQuery(docs);
    (userCollection as jest.Mock).mockReturnValue({
      orderBy: q.orderBy,
      where: q.where,
      limit: q.limit,
      startAfter: q.startAfter,
      get: q.get,
      doc: () => ({ get: async () => ({ exists: false }) }),
    });

    const res = await fetch(`${baseUrl}/users/me/raw-events?limit=10`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("items");
    expect(json).toHaveProperty("nextCursor");
    expect(Array.isArray(json.items)).toBe(true);
    expect(json.items).toHaveLength(1);
    expect(json.items[0]).toMatchObject({
      id: "raw_1",
      kind: "weight",
      observedAt: "2025-01-02T12:00:00.000Z",
    });
  });

  test("invalid query param fails closed with 400", async () => {
    const res = await fetch(`${baseUrl}/users/me/raw-events?limit=invalid`);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error?.code).toBe("INVALID_QUERY");
  });

  test("unknown query param fails with 400 INVALID_QUERY", async () => {
    const res = await fetch(`${baseUrl}/users/me/raw-events?foo=bar`);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error?.code).toBe("INVALID_QUERY");
  });

  test("query with benign cache-bust param _ returns 200", async () => {
    const docs: DocSnap[] = [];
    const q = createMockQuery(docs);
    (userCollection as jest.Mock).mockReturnValue({
      orderBy: q.orderBy,
      where: q.where,
      limit: q.limit,
      startAfter: q.startAfter,
      get: q.get,
      doc: () => ({ get: async () => ({ exists: false }) }),
    });
    const res = await fetch(`${baseUrl}/users/me/raw-events?kinds=weight&limit=50&_=123`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("items");
    expect(Array.isArray(json.items)).toBe(true);
  });

  test("alias kind and sourceId filter results (only matching items returned)", async () => {
    const docs: DocSnap[] = [
      {
        exists: true,
        id: "raw_weight_manual",
        data: () => ({
          schemaVersion: 1,
          id: "raw_weight_manual",
          userId: "user_123",
          sourceId: "manual",
          kind: "weight",
          observedAt: "2025-01-02T12:00:00.000Z",
          receivedAt: "2025-01-02T12:01:00.000Z",
        }),
      },
    ];

    const q = createMockQuery(docs);
    (userCollection as jest.Mock).mockReturnValue({
      orderBy: q.orderBy,
      where: q.where,
      limit: q.limit,
      startAfter: q.startAfter,
      get: q.get,
      doc: () => ({ get: async () => ({ exists: false }) }),
    });

    const res = await fetch(
      `${baseUrl}/users/me/raw-events?kind=weight&sourceId=manual`,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("items");
    expect(Array.isArray(json.items)).toBe(true);
    for (const item of json.items) {
      expect(item.kind).toBe("weight");
      expect(item.sourceId).toBe("manual");
    }
    expect(q.where).toHaveBeenCalledWith("kind", "==", "weight");
  });

  test("invalid Firestore doc fails closed with 500", async () => {
    allowConsoleForThisTest({ error: [/invalid_firestore_doc/] });
    const docs: DocSnap[] = [
      {
        exists: true,
        id: "raw_bad",
        data: () => ({
          schemaVersion: 1,
          id: "raw_bad",
          userId: "user_123",
          sourceId: "manual",
          kind: "weight",
          observedAt: "invalid-date",
          receivedAt: "2025-01-02T12:01:00.000Z",
        }),
      },
    ];

    const q = createMockQuery(docs);
    (userCollection as jest.Mock).mockReturnValue({
      orderBy: q.orderBy,
      where: q.where,
      limit: q.limit,
      startAfter: q.startAfter,
      get: q.get,
      doc: () => ({ get: async () => ({ exists: false }) }),
    });

    const res = await fetch(`${baseUrl}/users/me/raw-events`);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error?.code).toBe("INVALID_DOC");
  });

  test("auth isolation: no uid returns 401", async () => {
    const app = express();
    app.use((_req, _res, next) => {
      next();
    });
    app.use("/users/me", usersMeRoutes);
    const srv = require("http").createServer(app);
    srv.listen(0);
    const addr = srv.address() as AddressInfo;
    const url = `http://127.0.0.1:${addr.port}`;

    const res = await fetch(`${url}/users/me/raw-events`);
    expect(res.status).toBe(401);
    await new Promise<void>((r) => srv.close(() => r()));
  });

  test("stable ordering: observedAt desc then id", async () => {
    const docs: DocSnap[] = [
      {
        exists: true,
        id: "raw_b",
        data: () => ({
          schemaVersion: 1,
          id: "raw_b",
          userId: "user_123",
          sourceId: "manual",
          kind: "weight",
          observedAt: "2025-01-02T12:00:00.000Z",
          receivedAt: "2025-01-02T12:01:00.000Z",
        }),
      },
      {
        exists: true,
        id: "raw_a",
        data: () => ({
          schemaVersion: 1,
          id: "raw_a",
          userId: "user_123",
          sourceId: "manual",
          kind: "weight",
          observedAt: "2025-01-02T12:00:00.000Z",
          receivedAt: "2025-01-02T12:01:00.000Z",
        }),
      },
    ];

    const q = createMockQuery(docs);
    (userCollection as jest.Mock).mockReturnValue({
      orderBy: q.orderBy,
      where: q.where,
      limit: q.limit,
      startAfter: q.startAfter,
      get: q.get,
      doc: () => ({ get: async () => ({ exists: false }) }),
    });

    const res = await fetch(`${baseUrl}/users/me/raw-events?limit=5`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items.length).toBeGreaterThanOrEqual(1);
    expect(q.orderBy).toHaveBeenCalledWith("observedAt", "desc");
  });
});
