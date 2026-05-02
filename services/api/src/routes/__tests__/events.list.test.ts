// services/api/src/routes/__tests__/events.list.test.ts
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

type DocSnap = { exists: boolean; id: string; data: () => unknown };

function createMockQuery(docs: DocSnap[]) {
  return {
    orderBy: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    startAfter: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ docs, size: docs.length }),
  };
}

describe("GET /users/me/events", () => {
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

  test("returns 200 with valid canonical events", async () => {
    const docs: DocSnap[] = [
      {
        exists: true,
        id: "evt_1",
        data: () => ({
          id: "evt_1",
          userId: "user_123",
          sourceId: "manual",
          kind: "sleep",
          start: "2025-01-02T06:00:00.000Z",
          end: "2025-01-02T07:30:00.000Z",
          day: "2025-01-02",
          timezone: "America/New_York",
          createdAt: "2025-01-02T12:00:00.000Z",
          updatedAt: "2025-01-02T12:00:00.000Z",
          schemaVersion: 1,
        }),
      },
    ];

    const q = createMockQuery(docs);
    (userCollection as jest.Mock).mockReturnValue({
      ...q,
      doc: () => ({ get: async () => ({ exists: false }) }),
    });

    const res = await fetch(`${baseUrl}/users/me/events?limit=10`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toHaveLength(1);
    expect(json.items[0].kind).toBe("sleep");
  });

  test("invalid query param fails closed with 400", async () => {
    const res = await fetch(`${baseUrl}/users/me/events?limit=99999`);
    expect(res.status).toBe(400);
  });

  test("accepts limit=500 for nutrition range queries", async () => {
    const q = createMockQuery([]);
    (userCollection as jest.Mock).mockReturnValue({
      ...q,
      doc: () => ({ get: async () => ({ exists: false }) }),
    });

    const res = await fetch(
      `${baseUrl}/users/me/events?kinds=nutrition&limit=500&start=2026-01-01&end=2026-05-01`,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toEqual([]);
    expect(json.nextCursor).toBeNull();
  });

  test("returns 200 with empty items when Firestore query fails (e.g. missing index)", async () => {
    allowConsoleForThisTest({ error: [/events_list_firestore_query_failed/] });
    const q = {
      orderBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      startAfter: jest.fn().mockReturnThis(),
      get: jest.fn().mockRejectedValue(new Error("FAILED_PRECONDITION: index")),
    };
    (userCollection as jest.Mock).mockReturnValue({
      ...q,
      doc: () => ({ get: async () => ({ exists: false }) }),
    });

    const res = await fetch(
      `${baseUrl}/users/me/events?kinds=nutrition&limit=100&start=2025-01-01&end=2025-01-31`,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toEqual([]);
    expect(json.nextCursor).toBeNull();
  });
});
