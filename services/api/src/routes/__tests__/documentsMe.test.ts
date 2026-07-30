// services/api/src/routes/__tests__/documentsMe.test.ts
import express from "express";
import type http from "http";
import { AddressInfo } from "net";

import usersMeRoutes from "../usersMe";
import { userCollection } from "../../db";

jest.mock("../../db", () => ({
  userCollection: jest.fn(),
}));

jest.mock("../../firebaseAdmin", () => {
  const deletedPaths: string[] = [];
  return {
    admin: {
      storage: () => ({
        bucket: () => ({
          file: (objectPath: string) => ({
            save: jest.fn(async () => undefined),
            delete: jest.fn(async () => {
              deletedPaths.push(objectPath);
            }),
          }),
        }),
      }),
      __deletedStoragePaths: deletedPaths,
      __resetDeletedStoragePaths: () => {
        deletedPaths.length = 0;
      },
    },
  };
});

jest.mock("../../lib/firebaseStorageBucketId", () => ({
  requireFirebaseStorageBucketId: () => "test-bucket",
}));

type QuerySnap = { docs: { id: string; data: () => unknown }[]; size?: number };
type DocSnap = { exists: boolean; id: string; data: () => unknown };

function makeDocRef(store: Map<string, Record<string, unknown>>, id: string) {
  return {
    id,
    get: async (): Promise<DocSnap> => {
      const data = store.get(id);
      return {
        exists: data != null,
        id,
        data: () => data as unknown,
      };
    },
    create: async (data: Record<string, unknown>) => {
      if (store.has(id)) {
        const err = new Error("exists") as Error & { code: number };
        err.code = 6;
        throw err;
      }
      store.set(id, { ...data });
    },
    set: async (data: Record<string, unknown>) => {
      store.set(id, { ...data });
    },
    update: async (data: Record<string, unknown>) => {
      const prev = store.get(id) ?? {};
      store.set(id, { ...prev, ...data });
    },
    delete: async () => {
      store.delete(id);
    },
  };
}

describe("Document Ingestion OS routes", () => {
  let server: http.Server;
  let baseUrl: string;
  let storesByUid: Map<string, {
    documents: Map<string, Record<string, unknown>>;
    jobs: Map<string, Record<string, unknown>>;
    labUploads: Map<string, Record<string, unknown>>;
    extracted: Map<string, Record<string, unknown>>;
    labResults: Map<string, Record<string, unknown>>;
  }>;
  let documentsStore: Map<string, Record<string, unknown>>;
  let labUploadsStore: Map<string, Record<string, unknown>>;
  let labResultsStore: Map<string, Record<string, unknown>>;
  let deletedStoragePaths: string[];
  let autoId = 0;
  let requestUid = "user_123";

  function ensureUidStores(uid: string) {
    let bucket = storesByUid.get(uid);
    if (!bucket) {
      bucket = {
        documents: new Map(),
        jobs: new Map(),
        labUploads: new Map(),
        extracted: new Map(),
        labResults: new Map(),
      };
      storesByUid.set(uid, bucket);
    }
    return bucket;
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
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    jest.resetAllMocks();
    storesByUid = new Map();
    const owner = ensureUidStores("user_123");
    documentsStore = owner.documents;
    labUploadsStore = owner.labUploads;
    labResultsStore = owner.labResults;
    autoId = 0;
    requestUid = "user_123";

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { admin } = require("../../firebaseAdmin") as {
      admin: {
        __deletedStoragePaths: string[];
        __resetDeletedStoragePaths: () => void;
        storage: () => unknown;
      };
    };
    admin.__resetDeletedStoragePaths();
    deletedStoragePaths = admin.__deletedStoragePaths;
    // Restore default storage (partial-failure tests may override).
    admin.storage = () => ({
      bucket: () => ({
        file: (objectPath: string) => ({
          save: jest.fn(async () => undefined),
          delete: jest.fn(async () => {
            admin.__deletedStoragePaths.push(objectPath);
          }),
        }),
      }),
    });

    (userCollection as jest.Mock).mockImplementation((uid: string, col: string) => {
      const bucket = ensureUidStores(uid);
      const resolvedStore =
        col === "documents"
          ? bucket.documents
          : col === "documentIngestionJobs"
            ? bucket.jobs
            : col === "labUploads"
              ? bucket.labUploads
              : col === "labResults"
                ? bucket.labResults
                : bucket.extracted;

      const filterEntries = (field?: string, value?: unknown) => {
        const entries = [...resolvedStore.entries()];
        if (!field) return entries;
        return entries.filter(([, data]) => (data as Record<string, unknown>)[field] === value);
      };

      const makeQuery = (field?: string, value?: unknown) => ({
        where: (field2: string, _op2: string, value2: unknown) => makeQuery(field2, value2),
        limit: () => ({
          get: async (): Promise<QuerySnap> => ({
            docs: filterEntries(field, value).map(([id, data]) => ({
              id,
              data: () => data,
            })),
          }),
        }),
        get: async (): Promise<QuerySnap> => ({
          docs: filterEntries(field, value).map(([id, data]) => ({
            id,
            data: () => data,
          })),
        }),
      });

      return {
        doc: (id?: string) => {
          const docId = id ?? `auto_${++autoId}`;
          return makeDocRef(resolvedStore, docId);
        },
        orderBy: () => ({
          limit: () => ({
            get: async (): Promise<QuerySnap> => ({
              docs: [...resolvedStore.entries()].map(([id, data]) => ({
                id,
                data: () => data,
              })),
            }),
          }),
        }),
        where: (field: string, _op: string, value: unknown) => makeQuery(field, value),
        get: async (): Promise<QuerySnap> => ({
          docs: [...resolvedStore.entries()].map(([id, data]) => ({
            id,
            data: () => data,
          })),
          size: resolvedStore.size,
        }),
      };
    });
  });

  it("rejects unauthenticated upload-intent", async () => {
    const app = express();
    app.use(express.json());
    app.use("/users/me", usersMeRoutes);
    const s = app.listen(0);
    const addr = s.address() as AddressInfo;
    const url = `http://127.0.0.1:${addr.port}`;
    const res = await fetch(`${url}/users/me/documents/upload-intent`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        domain: "labs",
        originalFilename: "a.pdf",
        mediaType: "application/pdf",
        byteSize: 100,
      }),
    });
    expect(res.status).toBe(401);
    await new Promise<void>((resolve) => s.close(() => resolve()));
  });

  it("creates upload intent for labs PDF", async () => {
    const res = await fetch(`${baseUrl}/users/me/documents/upload-intent`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        domain: "labs",
        originalFilename: "DirectLabs.pdf",
        mediaType: "application/pdf",
        byteSize: 1200,
      }),
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.status).toBe("uploading");
    expect(json.documentId).toBeTruthy();
    expect(json.maxByteSize).toBeGreaterThan(0);
    expect(JSON.stringify(json)).not.toContain("users/user_123");
    expect(JSON.stringify(json)).not.toContain("storageObjectId");
  });

  it("lists documents without storage paths", async () => {
    documentsStore.set("doc1", {
      schemaVersion: "1.0.0",
      id: "doc1",
      userId: "user_123",
      domain: "labs",
      documentType: "lab_report",
      originalFilename: "DirectLabs.pdf",
      safeDisplayFilename: "DirectLabs.pdf",
      mediaType: "application/pdf",
      byteSize: 1000,
      checksumSha256: "a".repeat(64),
      storageObjectId: "users/user_123/documents/doc1/original",
      uploadedAt: "2026-07-01T00:00:00.000Z",
      source: "user_upload",
      status: "unsupported",
      retentionStatus: "active",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
    });

    const res = await fetch(`${baseUrl}/users/me/documents?domain=labs`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.items.length).toBeGreaterThanOrEqual(1);
    const serialized = JSON.stringify(json);
    expect(serialized).not.toContain("storageObjectId");
    expect(serialized).not.toContain("users/user_123/documents");
    expect(serialized).not.toContain("checksumSha256");
    expect(json.items[0].filename).toBe("DirectLabs.pdf");
  });

  it("returns document detail without internals", async () => {
    documentsStore.set("doc1", {
      schemaVersion: "1.0.0",
      id: "doc1",
      userId: "user_123",
      domain: "labs",
      documentType: "lab_report",
      originalFilename: "DirectLabs.pdf",
      safeDisplayFilename: "DirectLabs.pdf",
      mediaType: "application/pdf",
      byteSize: 1000,
      checksumSha256: "a".repeat(64),
      storageObjectId: "users/user_123/documents/doc1/original",
      uploadedAt: "2026-07-01T00:00:00.000Z",
      source: "user_upload",
      status: "unsupported",
      retentionStatus: "active",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
    });

    const res = await fetch(`${baseUrl}/users/me/documents/doc1`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.document.filename).toBe("DirectLabs.pdf");
    expect(json.document.canViewOriginal).toBe(false);
    const serialized = JSON.stringify(json);
    expect(serialized).not.toContain("checksum");
    expect(serialized).not.toContain("storageObjectId");
    expect(serialized).not.toContain("application/pdf");
  });

  it("bridges legacy lab upload detail", async () => {
    labUploadsStore.set("legacy1", {
      id: "legacy1",
      fileName: "DirectLabs.pdf",
      storagePath: "lab-uploads/user_123/abc/DirectLabs.pdf",
      mimeType: "application/pdf",
      uploadedAt: "2026-07-01T00:00:00.000Z",
      status: "unsupported",
      extractedCount: 0,
      matchedCount: 0,
      unmatchedCount: 0,
      errorMessage: "This report is stored, but structured extraction is not available yet.",
    });

    const res = await fetch(`${baseUrl}/users/me/documents/lab:legacy1`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.document.id).toBe("lab:legacy1");
    expect(json.document.filename).toBe("DirectLabs.pdf");
    expect(json.document.canDelete).toBe(true);
    expect(JSON.stringify(json)).not.toContain("lab-uploads/");
  });

  it("view-original returns not implemented without signed URL", async () => {
    documentsStore.set("doc1", {
      schemaVersion: "1.0.0",
      id: "doc1",
      userId: "user_123",
      domain: "labs",
      documentType: "lab_report",
      originalFilename: "a.pdf",
      safeDisplayFilename: "a.pdf",
      mediaType: "application/pdf",
      byteSize: 1000,
      checksumSha256: "b".repeat(64),
      storageObjectId: "users/user_123/documents/doc1/original",
      uploadedAt: "2026-07-01T00:00:00.000Z",
      source: "user_upload",
      status: "stored",
      retentionStatus: "active",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
    });

    const res = await fetch(`${baseUrl}/users/me/documents/doc1/view-original`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.available).toBe(false);
    expect(json.reasonCode).toBe("VIEW_ORIGINAL_NOT_IMPLEMENTED");
    expect(JSON.stringify(json)).not.toContain("http");
  });

  it("rejects deferred dna domain on upload-intent", async () => {
    const res = await fetch(`${baseUrl}/users/me/documents/upload-intent`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        domain: "dna",
        originalFilename: "genome.pdf",
        mediaType: "application/pdf",
        byteSize: 1200,
      }),
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("DOMAIN_DEFERRED");
  });

  it("rejects deferred scans and medical_history upload intents", async () => {
    for (const domain of ["scans", "medical_history"] as const) {
      const res = await fetch(`${baseUrl}/users/me/documents/upload-intent`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          domain,
          originalFilename: "report.pdf",
          mediaType: "application/pdf",
          byteSize: 1200,
        }),
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("DOMAIN_DEFERRED");
    }
  });

  it("does not let an unrelated user read another user's document", async () => {
    documentsStore.set("doc_owner_only", {
      schemaVersion: "1.0.0",
      id: "doc_owner_only",
      userId: "user_123",
      domain: "labs",
      documentType: "lab_report",
      originalFilename: "synthetic-owner.pdf",
      safeDisplayFilename: "synthetic-owner.pdf",
      mediaType: "application/pdf",
      byteSize: 1000,
      checksumSha256: "d".repeat(64),
      storageObjectId: "users/user_123/documents/doc_owner_only/original",
      uploadedAt: "2026-07-01T00:00:00.000Z",
      source: "user_upload",
      status: "unsupported",
      retentionStatus: "active",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
    });

    requestUid = "user_other";
    const res = await fetch(`${baseUrl}/users/me/documents/doc_owner_only`);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error.code).toBe("NOT_FOUND");
    expect(JSON.stringify(json)).not.toContain("synthetic-owner.pdf");
    expect(JSON.stringify(json)).not.toContain("storageObjectId");
  });

  it("does not let an unrelated user delete another user's document", async () => {
    documentsStore.set("doc_owner_delete", {
      schemaVersion: "1.0.0",
      id: "doc_owner_delete",
      userId: "user_123",
      domain: "labs",
      documentType: "lab_report",
      originalFilename: "synthetic-owner-delete.pdf",
      safeDisplayFilename: "synthetic-owner-delete.pdf",
      mediaType: "application/pdf",
      byteSize: 1000,
      checksumSha256: "e".repeat(64),
      storageObjectId: "users/user_123/documents/doc_owner_delete/original",
      uploadedAt: "2026-07-01T00:00:00.000Z",
      source: "user_upload",
      status: "unsupported",
      retentionStatus: "active",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
    });

    requestUid = "user_other";
    const res = await fetch(`${baseUrl}/users/me/documents/doc_owner_delete`, {
      method: "DELETE",
    });
    expect(res.status).toBe(404);
    expect(documentsStore.has("doc_owner_delete")).toBe(true);
  });

  it("owner delete removes document and mirrored lab upload; leaves other DirectLabs untouched", async () => {
    documentsStore.set("doc_jul30", {
      schemaVersion: "1.0.0",
      id: "doc_jul30",
      userId: "user_123",
      domain: "labs",
      documentType: "lab_report",
      originalFilename: "DirectLabs.pdf",
      safeDisplayFilename: "DirectLabs.pdf",
      mediaType: "application/pdf",
      byteSize: 1000,
      checksumSha256: "1".repeat(64),
      storageObjectId: "users/user_123/documents/doc_jul30/original",
      uploadedAt: "2026-07-30T12:00:00.000Z",
      source: "user_upload",
      status: "unsupported",
      retentionStatus: "active",
      legacyLabUploadId: "lab_jul30",
      createdAt: "2026-07-30T12:00:00.000Z",
      updatedAt: "2026-07-30T12:00:00.000Z",
    });
    documentsStore.set("doc_jul28", {
      schemaVersion: "1.0.0",
      id: "doc_jul28",
      userId: "user_123",
      domain: "labs",
      documentType: "lab_report",
      originalFilename: "DirectLabs.pdf",
      safeDisplayFilename: "DirectLabs.pdf",
      mediaType: "application/pdf",
      byteSize: 1100,
      checksumSha256: "2".repeat(64),
      storageObjectId: "users/user_123/documents/doc_jul28/original",
      uploadedAt: "2026-07-28T12:00:00.000Z",
      source: "user_upload",
      status: "unsupported",
      retentionStatus: "active",
      legacyLabUploadId: "lab_jul28",
      createdAt: "2026-07-28T12:00:00.000Z",
      updatedAt: "2026-07-28T12:00:00.000Z",
    });
    labUploadsStore.set("lab_jul30", {
      id: "lab_jul30",
      fileName: "DirectLabs.pdf",
      storagePath: "users/user_123/documents/doc_jul30/original",
      mimeType: "application/pdf",
      uploadedAt: "2026-07-30T12:00:00.000Z",
      status: "unsupported",
      extractedCount: 0,
      matchedCount: 0,
      unmatchedCount: 0,
    });
    labUploadsStore.set("lab_jul28", {
      id: "lab_jul28",
      fileName: "DirectLabs.pdf",
      storagePath: "users/user_123/documents/doc_jul28/original",
      mimeType: "application/pdf",
      uploadedAt: "2026-07-28T12:00:00.000Z",
      status: "unsupported",
      extractedCount: 0,
      matchedCount: 0,
      unmatchedCount: 0,
    });

    const res = await fetch(`${baseUrl}/users/me/documents/doc_jul30`, { method: "DELETE" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true, documentId: "doc_jul30", deleted: true });
    expect(documentsStore.has("doc_jul30")).toBe(false);
    expect(labUploadsStore.has("lab_jul30")).toBe(false);
    expect(documentsStore.has("doc_jul28")).toBe(true);
    expect(labUploadsStore.has("lab_jul28")).toBe(true);
  });

  it("complete-upload returns duplicate for same checksum without a second durable record", async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require("node:crypto") as typeof import("node:crypto");
    const pdf = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF\n");
    const checksum = crypto.createHash("sha256").update(pdf).digest("hex");

    documentsStore.set("doc_existing", {
      schemaVersion: "1.0.0",
      id: "doc_existing",
      userId: "user_123",
      domain: "labs",
      documentType: "lab_report",
      originalFilename: "DirectLabs.pdf",
      safeDisplayFilename: "DirectLabs.pdf",
      mediaType: "application/pdf",
      byteSize: pdf.length,
      checksumSha256: checksum,
      storageObjectId: "users/user_123/documents/doc_existing/original",
      uploadedAt: "2026-07-28T00:00:00.000Z",
      source: "user_upload",
      status: "unsupported",
      retentionStatus: "active",
      createdAt: "2026-07-28T00:00:00.000Z",
      updatedAt: "2026-07-28T00:00:00.000Z",
    });
    documentsStore.set("doc_intent", {
      schemaVersion: "1.0.0",
      id: "doc_intent",
      userId: "user_123",
      domain: "labs",
      documentType: "lab_report",
      originalFilename: "DirectLabs.pdf",
      safeDisplayFilename: "DirectLabs.pdf",
      mediaType: "application/pdf",
      byteSize: pdf.length,
      checksumSha256: "b".repeat(64),
      storageObjectId: "users/user_123/documents/doc_intent/original",
      uploadedAt: "2026-07-30T00:00:00.000Z",
      source: "user_upload",
      status: "uploading",
      retentionStatus: "active",
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:00:00.000Z",
    });

    const res = await fetch(`${baseUrl}/users/me/documents/doc_intent/complete-upload`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        originalFilename: "DirectLabs.pdf",
        mediaType: "application/pdf",
        fileBase64: pdf.toString("base64"),
        checksumSha256: checksum,
      }),
    });
    expect(res.status).toBe(202);
    const json = await res.json();
    expect(json.duplicate).toBe(true);
    expect(json.documentId).toBe("doc_existing");
    expect(documentsStore.get("doc_intent")?.status).toBe("failed");
    expect(documentsStore.get("doc_intent")?.retentionStatus).toBe("deleted");
    expect(documentsStore.has("doc_existing")).toBe(true);
  });

  it("does not list mirrored legacy lab upload twice alongside Document OS record", async () => {
    documentsStore.set("doc_mirrored", {
      schemaVersion: "1.0.0",
      id: "doc_mirrored",
      userId: "user_123",
      domain: "labs",
      documentType: "lab_report",
      originalFilename: "DirectLabs.pdf",
      safeDisplayFilename: "DirectLabs.pdf",
      mediaType: "application/pdf",
      byteSize: 1000,
      checksumSha256: "c".repeat(64),
      storageObjectId: "users/user_123/documents/doc_mirrored/original",
      uploadedAt: "2026-07-28T00:00:00.000Z",
      source: "user_upload",
      status: "unsupported",
      retentionStatus: "active",
      legacyLabUploadId: "lab_mirrored",
      createdAt: "2026-07-28T00:00:00.000Z",
      updatedAt: "2026-07-28T00:00:00.000Z",
    });
    labUploadsStore.set("lab_mirrored", {
      id: "lab_mirrored",
      fileName: "DirectLabs.pdf",
      storagePath: "users/user_123/documents/doc_mirrored/original",
      mimeType: "application/pdf",
      uploadedAt: "2026-07-28T00:00:00.000Z",
      status: "unsupported",
      extractedCount: 0,
      matchedCount: 0,
      unmatchedCount: 0,
    });

    const res = await fetch(`${baseUrl}/users/me/documents?domain=labs`);
    expect(res.status).toBe(200);
    const json = await res.json();
    const ids = json.items.map((i: { id: string }) => i.id);
    expect(ids).toEqual(["doc_mirrored"]);
    expect(ids).not.toContain("lab:lab_mirrored");
  });

  it("lists separate records when checksums differ even with the same filename", async () => {
    documentsStore.set("doc_a", {
      schemaVersion: "1.0.0",
      id: "doc_a",
      userId: "user_123",
      domain: "labs",
      documentType: "lab_report",
      originalFilename: "DirectLabs.pdf",
      safeDisplayFilename: "DirectLabs.pdf",
      mediaType: "application/pdf",
      byteSize: 1000,
      checksumSha256: "d".repeat(64),
      storageObjectId: "users/user_123/documents/doc_a/original",
      uploadedAt: "2026-07-30T00:00:00.000Z",
      source: "user_upload",
      status: "unsupported",
      retentionStatus: "active",
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:00:00.000Z",
    });
    documentsStore.set("doc_b", {
      schemaVersion: "1.0.0",
      id: "doc_b",
      userId: "user_123",
      domain: "labs",
      documentType: "lab_report",
      originalFilename: "DirectLabs.pdf",
      safeDisplayFilename: "DirectLabs.pdf",
      mediaType: "application/pdf",
      byteSize: 1100,
      checksumSha256: "e".repeat(64),
      storageObjectId: "users/user_123/documents/doc_b/original",
      uploadedAt: "2026-07-28T00:00:00.000Z",
      source: "user_upload",
      status: "unsupported",
      retentionStatus: "active",
      createdAt: "2026-07-28T00:00:00.000Z",
      updatedAt: "2026-07-28T00:00:00.000Z",
    });

    const res = await fetch(`${baseUrl}/users/me/documents?domain=labs`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items.map((i: { id: string }) => i.id).sort()).toEqual(["doc_a", "doc_b"]);
  });


  it("deletes legacy Lab report by stable lab: id without touching same-filename sibling", async () => {
    labUploadsStore.set("lab_jul28", {
      id: "lab_jul28",
      fileName: "DirectLabs.pdf",
      storagePath: "lab-uploads/user_123/hash28/DirectLabs.pdf",
      mimeType: "application/pdf",
      uploadedAt: "2026-07-28T12:00:00.000Z",
      status: "unsupported",
      extractedCount: 0,
      matchedCount: 0,
      unmatchedCount: 0,
    });
    labUploadsStore.set("lab_other", {
      id: "lab_other",
      fileName: "DirectLabs.pdf",
      storagePath: "lab-uploads/user_123/hashOther/DirectLabs.pdf",
      mimeType: "application/pdf",
      uploadedAt: "2026-07-01T12:00:00.000Z",
      status: "unsupported",
      extractedCount: 0,
      matchedCount: 0,
      unmatchedCount: 0,
    });
    labResultsStore.set("res_jul28", {
      id: "res_jul28",
      schemaVersion: 2,
      uploadId: "lab_jul28",
      metricKey: "glucose",
    });
    labResultsStore.set("res_other", {
      id: "res_other",
      schemaVersion: 2,
      uploadId: "lab_other",
      metricKey: "glucose",
    });

    const res = await fetch(`${baseUrl}/users/me/documents/lab:lab_jul28`, { method: "DELETE" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true, documentId: "lab:lab_jul28", deleted: true });
    expect(labUploadsStore.has("lab_jul28")).toBe(false);
    expect(labUploadsStore.has("lab_other")).toBe(true);
    expect(labResultsStore.has("res_jul28")).toBe(false);
    expect(labResultsStore.has("res_other")).toBe(true);
    expect(deletedStoragePaths).toContain("lab-uploads/user_123/hash28/DirectLabs.pdf");
    expect(deletedStoragePaths).not.toContain("lab-uploads/user_123/hashOther/DirectLabs.pdf");
  });

  it("deletes mirrored Document OS record when deleting legacy lab upload by linkage", async () => {
    labUploadsStore.set("lab_mirror", {
      id: "lab_mirror",
      fileName: "DirectLabs.pdf",
      storagePath: "lab-uploads/user_123/mhash/DirectLabs.pdf",
      mimeType: "application/pdf",
      uploadedAt: "2026-07-28T00:00:00.000Z",
      status: "unsupported",
      extractedCount: 0,
      matchedCount: 0,
      unmatchedCount: 0,
    });
    documentsStore.set("doc_mirror", {
      schemaVersion: "1.0.0",
      id: "doc_mirror",
      userId: "user_123",
      domain: "labs",
      documentType: "lab_report",
      originalFilename: "DirectLabs.pdf",
      safeDisplayFilename: "DirectLabs.pdf",
      mediaType: "application/pdf",
      byteSize: 1000,
      checksumSha256: "9".repeat(64),
      storageObjectId: "users/user_123/documents/doc_mirror/original",
      uploadedAt: "2026-07-28T00:00:00.000Z",
      source: "user_upload",
      status: "unsupported",
      retentionStatus: "active",
      legacyLabUploadId: "lab_mirror",
      createdAt: "2026-07-28T00:00:00.000Z",
      updatedAt: "2026-07-28T00:00:00.000Z",
    });

    const res = await fetch(`${baseUrl}/users/me/documents/lab:lab_mirror`, { method: "DELETE" });
    expect(res.status).toBe(200);
    expect(labUploadsStore.has("lab_mirror")).toBe(false);
    expect(documentsStore.has("doc_mirror")).toBe(false);
  });

  it("does not let another user delete a legacy Lab report", async () => {
    labUploadsStore.set("lab_owner", {
      id: "lab_owner",
      fileName: "DirectLabs.pdf",
      storagePath: "lab-uploads/user_123/ohash/DirectLabs.pdf",
      mimeType: "application/pdf",
      uploadedAt: "2026-07-28T00:00:00.000Z",
      status: "unsupported",
      extractedCount: 0,
      matchedCount: 0,
      unmatchedCount: 0,
    });
    requestUid = "user_other";
    const res = await fetch(`${baseUrl}/users/me/documents/lab:lab_owner`, { method: "DELETE" });
    expect(res.status).toBe(404);
    requestUid = "user_123";
    expect(ensureUidStores("user_123").labUploads.has("lab_owner")).toBe(true);
    const leak = await res.json();
    expect(JSON.stringify(leak)).not.toContain("DirectLabs");
    expect(JSON.stringify(leak)).not.toContain("lab-uploads/");
  });

  it("second legacy delete is safe (idempotent not-found)", async () => {
    const res = await fetch(`${baseUrl}/users/me/documents/lab:already_gone`, { method: "DELETE" });
    expect(res.status).toBe(404);
  });

  it("surfaces partial failure when storage delete fails and keeps metadata", async () => {
    labUploadsStore.set("lab_partial", {
      id: "lab_partial",
      fileName: "DirectLabs.pdf",
      storagePath: "lab-uploads/user_123/phash/DirectLabs.pdf",
      mimeType: "application/pdf",
      uploadedAt: "2026-07-28T00:00:00.000Z",
      status: "unsupported",
      extractedCount: 0,
      matchedCount: 0,
      unmatchedCount: 0,
    });
    const { admin } = require("../../firebaseAdmin");
    admin.storage = () => ({
      bucket: () => ({
        file: () => ({
          save: jest.fn(async () => undefined),
          delete: jest.fn(async () => {
            throw new Error("storage unavailable");
          }),
        }),
      }),
    });

    const res = await fetch(`${baseUrl}/users/me/documents/lab:lab_partial`, { method: "DELETE" });
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error.code).toBe("PARTIAL_DELETE_FAILED");
    expect(labUploadsStore.has("lab_partial")).toBe(true);
  });

  it("reconciles stale processing document status to unsupported from terminal job", async () => {
    documentsStore.set("doc_proc", {
      schemaVersion: "1.0.0",
      id: "doc_proc",
      userId: "user_123",
      domain: "labs",
      documentType: "lab_report",
      originalFilename: "a.pdf",
      safeDisplayFilename: "a.pdf",
      mediaType: "application/pdf",
      byteSize: 1000,
      checksumSha256: "8".repeat(64),
      storageObjectId: "users/user_123/documents/doc_proc/original",
      uploadedAt: "2026-07-30T00:00:00.000Z",
      source: "user_upload",
      status: "processing",
      retentionStatus: "active",
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:00:00.000Z",
    });
    ensureUidStores("user_123").jobs.set("job_proc", {
      schemaVersion: "1.0.0",
      id: "job_proc",
      documentId: "doc_proc",
      userId: "user_123",
      state: "extraction_unsupported",
      domain: "labs",
      documentType: "lab_report",
      dryRun: false,
      warningCodes: [],
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:01:00.000Z",
      stateHistory: [],
    });

    const res = await fetch(`${baseUrl}/users/me/documents/doc_proc`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.document.status).toBe("unsupported");
    expect(documentsStore.get("doc_proc")?.status).toBe("unsupported");
  });

});
