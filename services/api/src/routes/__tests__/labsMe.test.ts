// services/api/src/routes/__tests__/labsMe.test.ts
import express from "express";
import type http from "http";
import { AddressInfo } from "net";

import usersMeRoutes from "../usersMe";
import { userCollection } from "../../db";

jest.mock("../../db", () => ({
  userCollection: jest.fn(),
}));

jest.mock("../../firebaseAdmin", () => ({
  admin: {
    storage: () => ({
      bucket: () => ({
        file: () => ({
          save: jest.fn(async () => undefined),
        }),
      }),
    }),
    firestore: () => ({
      batch: () => ({
        set: jest.fn(),
        update: jest.fn(),
        commit: jest.fn(async () => undefined),
      }),
    }),
  },
}));

jest.mock("../../lib/firebaseStorageBucketId", () => ({
  requireFirebaseStorageBucketId: () => "test-bucket",
}));

type QuerySnap = { docs: { id: string; data: () => unknown }[] };
type QueryRef = {
  where: (field: string, op: string, value: unknown) => QueryRef;
  orderBy: (field: string, direction?: string) => QueryRef;
  limit: (n: number) => { get: () => Promise<QuerySnap> };
};

function makeQueryRef(docs: { id: string; data: () => unknown }[]): QueryRef {
  const chain: QueryRef = {
    where: () => chain,
    orderBy: () => chain,
    limit: () => ({ get: async () => ({ docs }) }),
  };
  return chain;
}

describe("GET /users/me/labs/summary", () => {
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

  it("returns empty summary when no metric results", async () => {
    (userCollection as jest.Mock).mockImplementation((_uid: string, col: string) => {
      if (col === "labResults") return makeQueryRef([]);
      if (col === "labUploads") {
        return {
          get: async () => ({ docs: [], size: 0 }),
        };
      }
      return makeQueryRef([]);
    });

    const res = await fetch(`${baseUrl}/users/me/labs/summary`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.uploadCount).toBe(0);
    expect(json.categories.length).toBeGreaterThan(0);
  });
});

describe("GET /users/me/labs/uploads", () => {
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

  it("returns uploads list", async () => {
    (userCollection as jest.Mock).mockReturnValue(
      makeQueryRef([
        {
          id: "up1",
          data: () => ({
            fileName: "labs.pdf",
            storagePath: "lab-uploads/user_123/hash/labs.pdf",
            mimeType: "application/pdf",
            uploadedAt: "2025-06-01T00:00:00.000Z",
            status: "parsed",
            extractedCount: 5,
            matchedCount: 4,
            unmatchedCount: 1,
          }),
        },
      ]),
    );

    const res = await fetch(`${baseUrl}/users/me/labs/uploads`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toHaveLength(1);
    expect(json.items[0].status).toBe("parsed");
  });
});
