// services/api/src/routes/__tests__/labResults.v0.test.ts
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
  id: string;
};

type DocRef = {
  id: string;
  get: () => Promise<DocSnap>;
  create: jest.Mock<Promise<void>, [unknown]>;
};

type QueryRef = {
  orderBy: (field: string, direction?: string) => QueryRef;
  limit: (n: number) => { get: () => Promise<{ docs: { id: string; data: () => unknown }[] }> };
};

function makeDocRef(
  id: string,
  opts: { exists?: boolean; data?: unknown; createFails?: boolean } = {},
): DocRef {
  const { exists = false, data = null, createFails = false } = opts;

  const create = createFails
    ? jest.fn(async () => {
        throw new Error("create failed");
      })
    : jest.fn(async () => undefined);

  return {
    id,
    get: async () =>
      ({
        exists,
        data: () => data,
        id,
      }) satisfies DocSnap,
    create,
  };
}

function makeQueryRef(docs: { id: string; data: () => unknown }[]): QueryRef {
  return {
    orderBy: () => ({
      limit: () => ({
        get: async () => ({ docs }),
      }),
    }),
  };
}

function makeLabResultDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: "idem_1",
    userId: "user_123",
    collectedAt: "2025-02-01T10:00:00.000Z",
    biomarkers: [{ name: "Glucose", value: 95, unit: "mg/dL" }],
    createdAt: "2025-02-01T10:05:00.000Z",
    updatedAt: "2025-02-01T10:05:00.000Z",
    ...overrides,
  };
}

const validBody = {
  collectedAt: "2025-02-01T10:00:00.000Z",
  biomarkers: [{ name: "Glucose", value: 95, unit: "mg/dL" }],
};

describe("POST /users/me/labResults", () => {
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

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("returns 400 when Idempotency-Key header is missing", async () => {
    (userCollection as jest.Mock).mockReturnValue({});

    const res = await fetch(`${baseUrl}/users/me/labResults`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toMatchObject({
      ok: false,
      error: {
        code: "MISSING_IDEMPOTENCY_KEY",
        message: expect.stringContaining("Idempotency-Key"),
      },
    });
  });

  test("POST creates doc and returns 202 with id", async () => {
    const docRef = makeDocRef("idem_create_1", { exists: false });

    (userCollection as jest.Mock).mockImplementation((_uid: string, col: string) => {
      if (col === "labResults") {
        return {
          doc: (id: string) => (id === "idem_create_1" ? docRef : makeDocRef(id)),
        };
      }
      return {};
    });

    const res = await fetch(`${baseUrl}/users/me/labResults`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "idem_create_1",
      },
      body: JSON.stringify(validBody),
    });

    expect(res.status).toBe(202);
    const json = await res.json();
    expect(json).toMatchObject({
      ok: true,
      id: "idem_create_1",
    });
    expect(json.idempotentReplay).toBeUndefined();
    expect(docRef.create).toHaveBeenCalledTimes(1);
  });

  test("POST replay with identical body returns 202 idempotentReplay true", async () => {
    const existingDoc = makeLabResultDoc({
      id: "idem_replay_1",
      collectedAt: validBody.collectedAt,
      biomarkers: validBody.biomarkers,
    });
    const docRef = makeDocRef("idem_replay_1", { exists: true, data: existingDoc });

    (userCollection as jest.Mock).mockImplementation((_uid: string, col: string) => {
      if (col === "labResults") {
        return {
          doc: (id: string) => (id === "idem_replay_1" ? docRef : makeDocRef(id)),
        };
      }
      return {};
    });

    const res = await fetch(`${baseUrl}/users/me/labResults`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "idem_replay_1",
      },
      body: JSON.stringify(validBody),
    });

    expect(res.status).toBe(202);
    const json = await res.json();
    expect(json).toMatchObject({
      ok: true,
      id: "idem_replay_1",
      idempotentReplay: true,
    });
    expect(docRef.create).not.toHaveBeenCalled();
  });

  test("POST replay with different body returns 409 IMMUTABLE_CONFLICT", async () => {
    const existingDoc = makeLabResultDoc({
      id: "idem_conflict_1",
      collectedAt: validBody.collectedAt,
      biomarkers: validBody.biomarkers,
    });
    const docRef = makeDocRef("idem_conflict_1", { exists: true, data: existingDoc });

    (userCollection as jest.Mock).mockImplementation((_uid: string, col: string) => {
      if (col === "labResults") {
        return {
          doc: (id: string) => (id === "idem_conflict_1" ? docRef : makeDocRef(id)),
        };
      }
      return {};
    });

    const differentBody = {
      ...validBody,
      biomarkers: [{ name: "Glucose", value: 110, unit: "mg/dL" }],
    };

    const res = await fetch(`${baseUrl}/users/me/labResults`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "idem_conflict_1",
      },
      body: JSON.stringify(differentBody),
    });

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json).toMatchObject({
      ok: false,
      error: { code: "IMMUTABLE_CONFLICT" },
    });
    expect(docRef.create).not.toHaveBeenCalled();
  });
});

describe("GET /users/me/labResults", () => {
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

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("GET list returns items sorted desc", async () => {
    const older = makeLabResultDoc({
      id: "older",
      collectedAt: "2025-01-31T10:00:00.000Z",
      createdAt: "2025-01-31T10:05:00.000Z",
      updatedAt: "2025-01-31T10:05:00.000Z",
    });
    const newer = makeLabResultDoc({
      id: "newer",
      collectedAt: "2025-02-01T10:00:00.000Z",
      createdAt: "2025-02-01T10:05:00.000Z",
      updatedAt: "2025-02-01T10:05:00.000Z",
    });

    (userCollection as jest.Mock).mockReturnValue(
      makeQueryRef([
        { id: "newer", data: () => newer },
        { id: "older", data: () => older },
      ]),
    );

    const res = await fetch(`${baseUrl}/users/me/labResults`);
    expect(res.status).toBe(200);

    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(json.nextCursor).toBeNull();
    expect(Array.isArray(json.items)).toBe(true);

    expect(json.items).toHaveLength(2);
    expect(json.items[0].id).toBe("newer");
    expect(json.items[1].id).toBe("older");
    expect(json.items[0].collectedAt).toBe("2025-02-01T10:00:00.000Z");
    expect(json.items[1].collectedAt).toBe("2025-01-31T10:00:00.000Z");
  });

  test("GET list returns empty array when no docs", async () => {
    (userCollection as jest.Mock).mockReturnValue(makeQueryRef([]));

    const res = await fetch(`${baseUrl}/users/me/labResults`);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toMatchObject({
      ok: true,
      items: [],
      nextCursor: null,
    });
  });
});

describe("GET /users/me/labResults/:id", () => {
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

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("GET by id returns doc", async () => {
    const doc = makeLabResultDoc({ id: "lab_123" });
    const docRef = makeDocRef("lab_123", { exists: true, data: doc });

    (userCollection as jest.Mock).mockImplementation((_uid: string, col: string) => {
      if (col === "labResults") {
        return {
          doc: (id: string) => (id === "lab_123" ? docRef : makeDocRef(id)),
        };
      }
      return {};
    });

    const res = await fetch(`${baseUrl}/users/me/labResults/lab_123`);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      schemaVersion: 1,
      id: "lab_123",
      userId: "user_123",
      collectedAt: "2025-02-01T10:00:00.000Z",
      biomarkers: [{ name: "Glucose", value: 95, unit: "mg/dL" }],
    });
  });

  test("GET by id returns 404 when not found", async () => {
    const docRef = makeDocRef("missing_123", { exists: false });

    (userCollection as jest.Mock).mockImplementation((_uid: string, col: string) => {
      if (col === "labResults") {
        return {
          doc: (id: string) => (id === "missing_123" ? docRef : makeDocRef(id)),
        };
      }
      return {};
    });

    const res = await fetch(`${baseUrl}/users/me/labResults/missing_123`);

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND", resource: "labResults", id: "missing_123" },
    });
  });
});
