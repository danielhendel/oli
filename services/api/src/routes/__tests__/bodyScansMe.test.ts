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

      type DocSnap = { id: string; data: () => Record<string, unknown>; exists: boolean };

      function allDocs(): DocSnap[] {
        return [...store.entries()].map(([id, data]) => ({
          id,
          exists: true,
          data: () => data,
        }));
      }

      function buildQuery(state: {
        filters: { field: string; value: unknown }[];
        orderByField: string | null;
        orderDir: "asc" | "desc";
        startAfterId: string | null;
      }) {
        const run = (limitN?: number) => {
          let docs = allDocs();
          for (const f of state.filters) {
            docs = docs.filter((d) => d.data()[f.field] === f.value);
          }
          if (state.orderByField) {
            const field = state.orderByField;
            docs = [...docs].sort((a, b) => {
              const av = String(a.data()[field] ?? "");
              const bv = String(b.data()[field] ?? "");
              if (av === bv) return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
              const cmp = av < bv ? -1 : 1;
              return state.orderDir === "desc" ? -cmp : cmp;
            });
          }
          if (state.startAfterId) {
            const idx = docs.findIndex((d) => d.id === state.startAfterId);
            docs = idx >= 0 ? docs.slice(idx + 1) : [];
          }
          if (limitN != null) docs = docs.slice(0, limitN);
          return { docs, size: docs.length };
        };

        const api = {
          where: (field: string, _op: string, value: unknown) =>
            buildQuery({
              ...state,
              filters: [...state.filters, { field, value }],
            }),
          orderBy: (field: string, dir?: string) =>
            buildQuery({
              ...state,
              orderByField: field,
              orderDir: dir === "asc" ? "asc" : "desc",
            }),
          startAfter: (snap: { id: string }) =>
            buildQuery({
              ...state,
              startAfterId: snap.id,
            }),
          limit: (n: number) => ({
            get: async () => run(n),
          }),
          get: async () => run(),
        };
        return api;
      }

      return {
        doc: (id?: string) => makeDocRef(store, id ?? `auto_${store.size + 1}`),
        where: (field: string, _op: string, value: unknown) =>
          buildQuery({
            filters: [{ field, value }],
            orderByField: null,
            orderDir: "desc",
            startAfterId: null,
          }),
        orderBy: (field: string, dir?: string) =>
          buildQuery({
            filters: [],
            orderByField: field,
            orderDir: dir === "asc" ? "asc" : "desc",
            startAfterId: null,
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
    expect(json.hasMore).toBe(false);
    expect(json.nextCursor).toBeNull();
    expect(json.items[0]).toMatchObject({ id: "doc_1", scanType: "dxa", status: "needs_review" });
    const serialized = JSON.stringify(json);
    expect(serialized).not.toContain("user_123");
    expect(serialized).not.toContain("storageObjectId");
    expect(serialized).not.toContain(DOCUMENT.checksumSha256);
  });

  function seedScan(id: string, overrides: Record<string, unknown> = {}) {
    storeFor("user_123", "bodyScans").set(id, {
      ...SCAN,
      id,
      documentId: id,
      createdAt: overrides.createdAt ?? SCAN.createdAt,
      ...overrides,
    });
  }

  it("filters by scanType and paginates with nextCursor/hasMore", async () => {
    // 3 InBody + 2 DXA; request InBody limit=2 → hasMore, then page 2 empties.
    seedScan("ib_1", { scanType: "inbody", method: "other", createdAt: "2026-03-05T15:00:00.000Z" });
    seedScan("ib_2", { scanType: "inbody", method: "other", createdAt: "2026-03-05T14:00:00.000Z" });
    seedScan("ib_3", { scanType: "inbody", method: "other", createdAt: "2026-03-05T13:00:00.000Z" });
    seedScan("dx_1", { scanType: "dxa", method: "dxa", createdAt: "2026-03-05T16:00:00.000Z" });
    seedScan("dx_2", { scanType: "dxa", method: "dxa", createdAt: "2026-03-05T12:00:00.000Z" });

    const page1 = await fetch(`${baseUrl}/users/me/body-scans?scanType=inbody&limit=2`);
    expect(page1.status).toBe(200);
    const p1 = await page1.json();
    expect(p1.items.map((i: { id: string }) => i.id)).toEqual(["ib_1", "ib_2"]);
    expect(p1.hasMore).toBe(true);
    expect(typeof p1.nextCursor).toBe("string");
    expect(p1.items.every((i: { scanType: string }) => i.scanType === "inbody")).toBe(true);

    const page2 = await fetch(
      `${baseUrl}/users/me/body-scans?scanType=inbody&limit=2&cursor=${encodeURIComponent(p1.nextCursor)}`,
    );
    expect(page2.status).toBe(200);
    const p2 = await page2.json();
    expect(p2.items.map((i: { id: string }) => i.id)).toEqual(["ib_3"]);
    expect(p2.hasMore).toBe(false);
    expect(p2.nextCursor).toBeNull();

    // All three InBody reachable exactly once across pages.
    const allIds = [...p1.items, ...p2.items].map((i: { id: string }) => i.id);
    expect(allIds).toEqual(["ib_1", "ib_2", "ib_3"]);
  });

  it("rejects invalid scanType and malformed / mismatched cursors", async () => {
    seedScan("ib_1", { scanType: "inbody", method: "other", createdAt: "2026-03-05T15:00:00.000Z" });
    seedScan("ib_2", { scanType: "inbody", method: "other", createdAt: "2026-03-05T14:00:00.000Z" });

    const badType = await fetch(`${baseUrl}/users/me/body-scans?scanType=not_a_type`);
    expect(badType.status).toBe(400);
    expect((await badType.json()).error.code).toBe("INVALID_SCAN_TYPE");

    const badCursor = await fetch(`${baseUrl}/users/me/body-scans?cursor=not-opaque`);
    expect(badCursor.status).toBe(400);
    expect((await badCursor.json()).error.code).toBe("INVALID_CURSOR");

    const page = await fetch(`${baseUrl}/users/me/body-scans?scanType=inbody&limit=1`);
    const pageJson = await page.json();
    expect(pageJson.hasMore).toBe(true);
    expect(typeof pageJson.nextCursor).toBe("string");

    // Cursor bound to inbody must not continue a dxa filter.
    const mismatch = await fetch(
      `${baseUrl}/users/me/body-scans?scanType=dxa&limit=1&cursor=${encodeURIComponent(pageJson.nextCursor)}`,
    );
    expect(mismatch.status).toBe(400);
    expect((await mismatch.json()).error.code).toBe("INVALID_CURSOR");
  });

  it("category limit=1 summary returns newest in category (not mixed-page empty)", async () => {
    // Newest 50-equivalent: newest are DXA; older InBody still found by category query.
    for (let i = 0; i < 5; i++) {
      seedScan(`dx_${i}`, {
        scanType: "dxa",
        method: "dxa",
        createdAt: `2026-03-0${6 + (i % 3)}T1${i}:00:00.000Z`,
      });
    }
    seedScan("ib_old", {
      scanType: "inbody",
      method: "other",
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    const res = await fetch(`${baseUrl}/users/me/body-scans?scanType=inbody&limit=1`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toHaveLength(1);
    expect(json.items[0].id).toBe("ib_old");
    expect(json.items[0].scanType).toBe("inbody");
    expect(json.hasMore).toBe(false);
  });

  it("pages same-timestamp records without duplicate or skip (id tie-break)", async () => {
    const ts = "2026-03-05T12:00:00.000Z";
    seedScan("same_a", { scanType: "dxa", createdAt: ts });
    seedScan("same_b", { scanType: "dxa", createdAt: ts });
    seedScan("same_c", { scanType: "dxa", createdAt: ts });

    const p1 = await (await fetch(`${baseUrl}/users/me/body-scans?scanType=dxa&limit=2`)).json();
    expect(p1.items).toHaveLength(2);
    expect(p1.hasMore).toBe(true);
    const p2 = await (
      await fetch(
        `${baseUrl}/users/me/body-scans?scanType=dxa&limit=2&cursor=${encodeURIComponent(p1.nextCursor)}`,
      )
    ).json();
    expect(p2.items).toHaveLength(1);
    expect(p2.hasMore).toBe(false);
    const ids = [...p1.items, ...p2.items].map((i: { id: string }) => i.id);
    expect(new Set(ids).size).toBe(3);
    expect(ids.sort()).toEqual(["same_a", "same_b", "same_c"]);
  });

  it("detail uses a non-identifying Body Scan source label", async () => {
    storeFor("user_123", "documents").set("doc_1", {
      ...DOCUMENT,
      originalFilename: "Patient_LiveLean_Clinic_Report.pdf",
      safeDisplayFilename: "Patient_LiveLean_Clinic_Report.pdf",
    });
    storeFor("user_123", "bodyScans").set("doc_1", { ...SCAN });
    const res = await fetch(`${baseUrl}/users/me/body-scans/doc_1`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.scan.sourceFilename).toBe("Original DXA report");
    expect(JSON.stringify(json).toLowerCase()).not.toContain("patient");
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
