// services/api/src/routes/__tests__/bodyScansMe.test.ts
import express from "express";
import type http from "http";
import { AddressInfo } from "net";

import usersMeRoutes from "../usersMe";
import { userCollection } from "../../db";

jest.mock("../../db", () => ({
  userCollection: jest.fn(),
}));

jest.mock("../../firebaseAdmin", () => {
  const objects = new Map<string, Buffer>();
  const deletedPaths: string[] = [];
  return {
    admin: {
      storage: () => ({
        bucket: () => ({
          file: (objectPath: string) => ({
            delete: jest.fn(async () => {
              deletedPaths.push(objectPath);
              objects.delete(objectPath);
            }),
            download: jest.fn(async () => [objects.get(objectPath) ?? Buffer.alloc(0)]),
            exists: jest.fn(async () => [objects.has(objectPath)]),
          }),
        }),
      }),
      __objects: objects,
      __deletedPaths: deletedPaths,
      __reset: () => {
        objects.clear();
        deletedPaths.length = 0;
      },
    },
  };
});

jest.mock("../../lib/firebaseStorageBucketId", () => ({
  requireFirebaseStorageBucketId: () => "test-bucket",
}));

type Store = Map<string, Record<string, unknown>>;

function makeDocRef(store: Store, id: string) {
  return {
    id,
    get: async () => ({ exists: store.has(id), id, data: () => store.get(id) }),
    set: async (data: Record<string, unknown>, opts?: { merge?: boolean }) => {
      store.set(id, opts?.merge ? { ...(store.get(id) ?? {}), ...data } : { ...data });
    },
    create: async (data: Record<string, unknown>) => {
      store.set(id, { ...data });
    },
    update: async (data: Record<string, unknown>) => {
      store.set(id, { ...(store.get(id) ?? {}), ...data });
    },
    delete: async () => {
      store.delete(id);
    },
  };
}

const DOCUMENT = {
  schemaVersion: "1.0.0",
  id: "doc_1",
  userId: "user_123",
  domain: "scans",
  documentType: "dexa_report",
  originalFilename: "scan.pdf",
  safeDisplayFilename: "scan.pdf",
  mediaType: "application/pdf",
  byteSize: 2048,
  checksumSha256: "c".repeat(64),
  storageObjectId: "users/user_123/documents/doc_1/original",
  uploadedAt: "2026-03-05T12:00:00.000Z",
  source: "user_upload",
  status: "review_needed",
  retentionStatus: "active",
  createdAt: "2026-03-05T12:00:00.000Z",
  updatedAt: "2026-03-05T12:00:00.000Z",
};

const DRAFT = {
  schemaVersion: "1.0.0",
  id: "draft_doc_1_live_lean_rx_dxa",
  userId: "user_123",
  scanId: "doc_1",
  documentId: "doc_1",
  jobId: "job_1",
  adapter: { id: "live_lean_rx_dxa", version: "1.0.0" },
  status: "review_needed",
  scanTypeCandidate: "dxa",
  methodCandidate: "dxa",
  device: { manufacturer: "GE Lunar", model: "iDXA" },
  performedAtCandidate: "2026-03-04T00:00:00.000Z",
  pagesProcessed: 2,
  pageCount: 2,
  fields: [
    {
      fieldId: "total:fat_percent",
      metricId: "fat_percent",
      region: "total",
      rawLabel: "Total Body % Fat",
      rawValue: "21.4",
      normalizedValue: 21.4,
      unit: "percent",
      pageNumber: 1,
      sourceLocator: null,
      confidence: 0.95,
      requiresReview: false,
      warningCodes: [],
    },
    {
      fieldId: "total:lean_mass",
      metricId: "lean_mass",
      region: "total",
      rawLabel: "Total Body Lean Mass",
      rawValue: "58.2",
      normalizedValue: 58.2,
      unit: "kg",
      pageNumber: 1,
      sourceLocator: null,
      confidence: 0.55,
      requiresReview: true,
      warningCodes: [],
    },
  ],
  warnings: [],
  confidenceSummary: { overall: 0.75, lowConfidenceFieldCount: 1 },
  sourceDocumentChecksum: "c".repeat(64),
  superseded: false,
  createdAt: "2026-03-05T12:00:00.000Z",
  updatedAt: "2026-03-05T12:00:00.000Z",
};

const SCAN = {
  schemaVersion: "1.0.0",
  id: "doc_1",
  userId: "user_123",
  documentId: "doc_1",
  scanType: "dxa",
  method: "dxa",
  device: { manufacturer: "GE Lunar", model: "iDXA" },
  performedAt: "2026-03-04T00:00:00.000Z",
  status: "needs_review",
  adapter: { id: "live_lean_rx_dxa", version: "1.0.0" },
  extractionDraftId: DRAFT.id,
  metrics: [],
  reviewedAt: null,
  correctionCount: 0,
  failureCode: null,
  retentionStatus: "active",
  createdAt: "2026-03-05T12:00:00.000Z",
  updatedAt: "2026-03-05T12:00:00.000Z",
};

describe("Body Scans routes", () => {
  let server: http.Server;
  let baseUrl: string;
  let storesByUid: Map<string, Map<string, Store>>;
  let requestUid = "user_123";

  function storeFor(uid: string, name: string): Store {
    let byName = storesByUid.get(uid);
    if (!byName) {
      byName = new Map();
      storesByUid.set(uid, byName);
    }
    let store = byName.get(name);
    if (!store) {
      store = new Map();
      byName.set(name, store);
    }
    return store;
  }

  beforeAll(async () => {
    const app = express();
    app.use(express.json({ limit: "2mb" }));
    app.use((req, _res, next) => {
      (req as unknown as { uid: string }).uid = requestUid;
      next();
    });
    app.use("/users/me", usersMeRoutes);
    server = app.listen(0);
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    jest.resetAllMocks();
    storesByUid = new Map();
    requestUid = "user_123";

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { admin } = require("../../firebaseAdmin") as {
      admin: { __reset: () => void; __objects: Map<string, Buffer>; __deletedPaths: string[] };
    };
    admin.__reset();
    admin.__objects.set(DOCUMENT.storageObjectId, Buffer.from("%PDF-1.7\n"));

    (userCollection as jest.Mock).mockImplementation((uid: string, name: string) => {
      const store = storeFor(uid, name);
      const entries = (field?: string, value?: unknown) =>
        [...store.entries()].filter(([, data]) => (field ? data[field] === value : true));
      const query = (field?: string, value?: unknown) => ({
        where: (f2: string, _op: string, v2: unknown) => query(f2, v2),
        limit: () => ({
          get: async () => ({ docs: entries(field, value).map(([id, data]) => ({ id, data: () => data })) }),
        }),
        get: async () => ({ docs: entries(field, value).map(([id, data]) => ({ id, data: () => data })) }),
      });
      return {
        doc: (id?: string) => makeDocRef(store, id ?? `auto_${store.size + 1}`),
        where: (field: string, _op: string, value: unknown) => query(field, value),
        orderBy: () => ({
          limit: () => ({
            get: async () => ({ docs: entries().map(([id, data]) => ({ id, data: () => data })) }),
          }),
        }),
      };
    });
  });

  function seedOwnedScan() {
    storeFor("user_123", "documents").set("doc_1", { ...DOCUMENT });
    storeFor("user_123", "bodyScans").set("doc_1", { ...SCAN });
    storeFor("user_123", "bodyScanDrafts").set(DRAFT.id, { ...DRAFT });
  }

  it("lists the caller's scans with safe metadata only", async () => {
    seedOwnedScan();
    const res = await fetch(`${baseUrl}/users/me/body-scans`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toHaveLength(1);
    expect(json.items[0]).toMatchObject({ id: "doc_1", scanType: "dxa", status: "needs_review" });
    const serialized = JSON.stringify(json);
    expect(serialized).not.toContain("user_123");
    expect(serialized).not.toContain("storageObjectId");
    expect(serialized).not.toContain(DOCUMENT.checksumSha256);
  });

  it("does not expose another account's scan", async () => {
    storeFor("user_999", "bodyScans").set("doc_1", { ...SCAN, userId: "user_999" });
    const res = await fetch(`${baseUrl}/users/me/body-scans/doc_1`);
    expect(res.status).toBe(404);
  });

  it("returns review fields with confidence and review flags", async () => {
    seedOwnedScan();
    const res = await fetch(`${baseUrl}/users/me/body-scans/doc_1/review`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.confirmAvailable).toBe(true);
    expect(json.manualReviewOnly).toBe(false);
    expect(json.fields.map((f: { fieldId: string }) => f.fieldId)).toEqual([
      "total:fat_percent",
      "total:lean_mass",
    ]);
    expect(json.fields[1].requiresReview).toBe(true);
  });

  it("rejects confirm while a low-confidence field is unaddressed", async () => {
    seedOwnedScan();
    const res = await fetch(`${baseUrl}/users/me/body-scans/doc_1/confirm`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.code).toBe("UNACKNOWLEDGED_REVIEW_FIELDS");
    expect(storeFor("user_123", "bodyScans").get("doc_1")?.status).toBe("needs_review");
  });

  it("confirms into governed scan facts and never into continuous trends", async () => {
    seedOwnedScan();
    const res = await fetch(`${baseUrl}/users/me/body-scans/doc_1/confirm`, {
      method: "POST",
      headers: { "content-type": "application/json", "Idempotency-Key": "confirm-1" },
      body: JSON.stringify({ acknowledgedFieldIds: ["total:lean_mass"] }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ scanId: "doc_1", status: "verified", metricCount: 2 });

    const scan = storeFor("user_123", "bodyScans").get("doc_1") as Record<string, unknown>;
    expect(scan.status).toBe("verified");
    const fact = storeFor("user_123", "bodyScanFacts").get("fact_doc_1") as Record<string, unknown>;
    expect(fact.excludedFromContinuousTrends).toBe(true);

    // Nothing may be written to continuous or derived truth.
    for (const forbidden of ["rawEvents", "events", "dailyFacts", "bodyComposition"]) {
      expect(storeFor("user_123", forbidden).size).toBe(0);
    }
  });

  it("replays an already-confirmed scan idempotently", async () => {
    seedOwnedScan();
    const headers = { "content-type": "application/json", "Idempotency-Key": "confirm-1" };
    const body = JSON.stringify({ acknowledgedFieldIds: ["total:lean_mass"] });
    await fetch(`${baseUrl}/users/me/body-scans/doc_1/confirm`, { method: "POST", headers, body });
    const second = await fetch(`${baseUrl}/users/me/body-scans/doc_1/confirm`, {
      method: "POST",
      headers,
      body,
    });
    expect(second.status).toBe(200);
    const json = await second.json();
    expect(json.idempotentReplay).toBe(true);
    expect(json.metricCount).toBe(2);
  });

  it("deletes the scan, its draft, its facts, and the original bytes", async () => {
    seedOwnedScan();
    await fetch(`${baseUrl}/users/me/body-scans/doc_1/confirm`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ acknowledgedFieldIds: ["total:lean_mass"] }),
    });

    const res = await fetch(`${baseUrl}/users/me/body-scans/doc_1`, { method: "DELETE" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, scanId: "doc_1", deleted: true });

    expect(storeFor("user_123", "bodyScans").size).toBe(0);
    expect(storeFor("user_123", "bodyScanDrafts").size).toBe(0);
    expect(storeFor("user_123", "bodyScanFacts").size).toBe(0);
    expect(storeFor("user_123", "documents").size).toBe(0);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { admin } = require("../../firebaseAdmin") as { admin: { __deletedPaths: string[] } };
    expect(admin.__deletedPaths).toContain(DOCUMENT.storageObjectId);
  });

  it("treats a repeated delete as idempotent", async () => {
    seedOwnedScan();
    await fetch(`${baseUrl}/users/me/body-scans/doc_1`, { method: "DELETE" });
    const res = await fetch(`${baseUrl}/users/me/body-scans/doc_1`, { method: "DELETE" });
    expect(res.status).toBe(200);
    expect((await res.json()).deleted).toBe(true);
  });
});
