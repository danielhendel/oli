// services/api/src/routes/__tests__/sources.registry.test.ts
import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import express from "express";

const mockUserCollection = jest.fn();

jest.mock("../../db", () => {
  return {
    userCollection: (...args: unknown[]) => mockUserCollection(...args),
  };
});

type JsonObject = Record<string, unknown>;
const isJsonObject = (v: unknown): v is JsonObject => typeof v === "object" && v !== null;

type SourceDoc = {
  id: string;
  userId: string;
  provider: string;
  sourceType: string;
  isActive: boolean;
  allowedKinds: string[];
  supportedSchemaVersions: number[];
  createdAt: string;
  updatedAt: string;
  capabilities?: Record<string, unknown>;
};

type DocSnap = { exists: boolean; data: () => unknown };
type DocRef = {
  id: string;
  get: () => Promise<DocSnap>;
  create: (data: unknown) => Promise<void>;
  set: (data: unknown) => Promise<void>;
};
type QueryDocSnap = { id: string; data: () => unknown };
type CollectionSnap = { docs: QueryDocSnap[] };
type CollectionRef = {
  doc: (id?: string) => DocRef;
  get: () => Promise<CollectionSnap>;
};

function makeInMemorySourcesDb() {
  // userId -> sourceId -> doc
  const store = new Map<string, Map<string, SourceDoc>>();

  const ensureUser = (uid: string) => {
    const existing = store.get(uid);
    if (existing) return existing;
    const next = new Map<string, SourceDoc>();
    store.set(uid, next);
    return next;
  };

  const sourcesCollectionForUser = (uid: string): CollectionRef => {
    const userMap = ensureUser(uid);

    const doc = (id?: string): DocRef => {
      const docId = id ?? `src_${userMap.size + 1}`;

      return {
        id: docId,
        get: async () => {
          const found = userMap.get(docId);
          return {
            exists: Boolean(found),
            data: () => found ?? null,
          };
        },
        create: async (data: unknown) => {
          if (userMap.has(docId)) {
            // Simulate Firestore create() failing when doc exists
            throw new Error("already-exists");
          }
          userMap.set(docId, data as SourceDoc);
        },
        set: async (data: unknown) => {
          userMap.set(docId, data as SourceDoc);
        },
      };
    };

    const get = async (): Promise<CollectionSnap> => {
      const docs: QueryDocSnap[] = [...userMap.entries()].map(([id, d]) => ({
        id,
        data: () => d,
      }));
      return { docs };
    };

    return { doc, get };
  };

  return { sourcesCollectionForUser };
}

describe("Step 4 — Source registry (user-scoped)", () => {
  const uidA = "user_a";
  const uidB = "user_b";

  let mem: ReturnType<typeof makeInMemorySourcesDb>;

  const makeApp = async (uid: string) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const router = require("../usersMe.sources").default as express.Router;

    const app = express();
    app.use(express.json());

    // Inject authenticated uid (bypass auth middleware)
    app.use((req, _res, next) => {
      (req as unknown as { uid?: string }).uid = uid;
      next();
    });

    app.use("/users/me/sources", router);

    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === "string") {
      server.close();
      throw new Error("Failed to bind test server");
    }
    const baseUrl = `http://127.0.0.1:${address.port}`;
    return { server, baseUrl };
  };

  beforeEach(() => {
    mem = makeInMemorySourcesDb();

    // Mock userCollection(uid, "sources") -> in-memory collection ref
    mockUserCollection.mockImplementation((uid: unknown, col: unknown) => {
      if (typeof uid !== "string") throw new Error("uid must be string");
      if (col !== "sources") throw new Error(`unexpected collection: ${String(col)}`);
      return mem.sourcesCollectionForUser(uid);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("allows a user to create and list their own sources", async () => {
    const { server, baseUrl } = await makeApp(uidA);

    try {
      const createRes = await fetch(`${baseUrl}/users/me/sources`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": "idem_sources_create_list_uidA_1",
        },
        body: JSON.stringify({
          provider: "manual",
          sourceType: "api",
          allowedKinds: ["sleep", "steps"],
          supportedSchemaVersions: [1],
          capabilities: { clientHint: "ignored" },
        }),
      });

      expect(createRes.status).toBe(201);

      const created: unknown = await createRes.json();
      expect(isJsonObject(created)).toBe(true);
      if (!isJsonObject(created)) throw new Error("Expected JSON object");

      expect(created["userId"]).toBe(uidA);
      expect(created["provider"]).toBe("manual");
      expect(created["sourceType"]).toBe("api");
      expect(created["isActive"]).toBe(true);

      const id = created["id"];
      expect(typeof id).toBe("string");
      expect((id as string).length).toBeGreaterThan(0);

      const listRes = await fetch(`${baseUrl}/users/me/sources`, { method: "GET" });
      expect(listRes.status).toBe(200);

      const listBody: unknown = await listRes.json();
      expect(isJsonObject(listBody)).toBe(true);
      if (!isJsonObject(listBody)) throw new Error("Expected JSON object");

      expect(listBody["ok"]).toBe(true);
      const sources = listBody["sources"];
      expect(Array.isArray(sources)).toBe(true);
      expect((sources as unknown[]).length).toBe(1);

      const first = (sources as unknown[])[0];
      expect(isJsonObject(first)).toBe(true);
      if (!isJsonObject(first)) throw new Error("Expected source object");

      expect(first["userId"]).toBe(uidA);
    } finally {
      server.close();
    }
  });

  it("denies cross-user access to sources (cannot read another user's source by id)", async () => {
    // Seed source for uidA directly into in-memory store by calling the route as uidA.
    const { server: serverA, baseUrl: baseUrlA } = await makeApp(uidA);

    let sourceId: string;

    try {
      const createRes = await fetch(`${baseUrlA}/users/me/sources`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": "idem_sources_cross_user_seed_uidA_1",
        },
        body: JSON.stringify({
          provider: "manual",
          sourceType: "api",
          allowedKinds: ["sleep"],
          supportedSchemaVersions: [1],
        }),
      });

      expect(createRes.status).toBe(201);
      const created: unknown = await createRes.json();
      expect(isJsonObject(created)).toBe(true);
      if (!isJsonObject(created)) throw new Error("Expected JSON object");
      const id = created["id"];
      expect(typeof id).toBe("string");
      sourceId = id as string;
    } finally {
      serverA.close();
    }

    // Now read as uidB (should be NOT_FOUND due to user scoping)
    const { server: serverB, baseUrl: baseUrlB } = await makeApp(uidB);

    try {
      const res = await fetch(`${baseUrlB}/users/me/sources/${sourceId}`, { method: "GET" });

      expect(res.status).toBe(404);

      const body: unknown = await res.json();
      expect(isJsonObject(body)).toBe(true);
      if (!isJsonObject(body)) throw new Error("Expected JSON object");

      expect(body["ok"]).toBe(false);

      const error = body["error"];
      expect(isJsonObject(error)).toBe(true);
      if (!isJsonObject(error)) throw new Error("Expected error object");

      expect(error["code"]).toBe("NOT_FOUND");
    } finally {
      serverB.close();
    }
  });

  it("fails closed if declared source capabilities are not supported by code-defined contracts", async () => {
    const { server, baseUrl } = await makeApp(uidA);

    try {
      const res = await fetch(`${baseUrl}/users/me/sources`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": "idem_sources_invalid_caps_uidA_1",
        },
        body: JSON.stringify({
          provider: "manual",
          sourceType: "upload",
          allowedKinds: ["sleep"], // invalid for upload (upload must be kind "file")
          supportedSchemaVersions: [1],
        }),
      });

      expect(res.status).toBe(400);

      const body: unknown = await res.json();
      expect(isJsonObject(body)).toBe(true);
      if (!isJsonObject(body)) throw new Error("Expected JSON object");

      const error = body["error"];
      expect(isJsonObject(error)).toBe(true);
      if (!isJsonObject(error)) throw new Error("Expected error object");

      expect(error["code"]).toBe("UNSUPPORTED_SOURCE_CAPABILITIES");
    } finally {
      server.close();
    }
  });

  it("allows patching isActive but rejects patching into unsupported capability declarations", async () => {
    const { server, baseUrl } = await makeApp(uidA);

    try {
      const createRes = await fetch(`${baseUrl}/users/me/sources`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": "idem_sources_patch_flow_uidA_1",
        },
        body: JSON.stringify({
          provider: "manual",
          sourceType: "upload",
          allowedKinds: ["file"],
          supportedSchemaVersions: [1],
        }),
      });

      expect(createRes.status).toBe(201);

      const created: unknown = await createRes.json();
      expect(isJsonObject(created)).toBe(true);
      if (!isJsonObject(created)) throw new Error("Expected JSON object");
      const id = created["id"];
      expect(typeof id).toBe("string");
      const sourceId = id as string;

      // Disable should succeed
      const disableRes = await fetch(`${baseUrl}/users/me/sources/${sourceId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });

      expect(disableRes.status).toBe(200);

      const disabled: unknown = await disableRes.json();
      expect(isJsonObject(disabled)).toBe(true);
      if (!isJsonObject(disabled)) throw new Error("Expected JSON object");
      expect(disabled["id"]).toBe(sourceId);
      expect(disabled["isActive"]).toBe(false);

      // Attempt invalid patch
      const invalidPatchRes = await fetch(`${baseUrl}/users/me/sources/${sourceId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ allowedKinds: ["sleep"] }),
      });

      expect(invalidPatchRes.status).toBe(400);

      const bad: unknown = await invalidPatchRes.json();
      expect(isJsonObject(bad)).toBe(true);
      if (!isJsonObject(bad)) throw new Error("Expected JSON object");

      const error = bad["error"];
      expect(isJsonObject(error)).toBe(true);
      if (!isJsonObject(error)) throw new Error("Expected error object");

      expect(error["code"]).toBe("UNSUPPORTED_SOURCE_CAPABILITIES");
    } finally {
      server.close();
    }
  });
});
