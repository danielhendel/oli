// services/api/src/routes/__tests__/documentsMe.test.ts
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
          delete: jest.fn(async () => undefined),
        }),
      }),
    }),
  },
}));

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
  let documentsStore: Map<string, Record<string, unknown>>;
  let jobsStore: Map<string, Record<string, unknown>>;
  let labUploadsStore: Map<string, Record<string, unknown>>;
  let extractedStore: Map<string, Record<string, unknown>>;
  let autoId = 0;

  beforeAll(async () => {
    const app = express();
    app.use(express.json({ limit: "2mb" }));
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
    documentsStore = new Map();
    jobsStore = new Map();
    labUploadsStore = new Map();
    extractedStore = new Map();
    autoId = 0;

    (userCollection as jest.Mock).mockImplementation((_uid: string, col: string) => {
      const resolvedStore =
        col === "documents"
          ? documentsStore
          : col === "documentIngestionJobs"
            ? jobsStore
            : col === "labUploads"
              ? labUploadsStore
              : extractedStore;

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
        where: () => ({
          limit: () => ({
            get: async (): Promise<QuerySnap> => ({
              docs: [...resolvedStore.entries()].map(([id, data]) => ({
                id,
                data: () => data,
              })),
            }),
          }),
          get: async (): Promise<QuerySnap> => ({
            docs: [...resolvedStore.entries()].map(([id, data]) => ({
              id,
              data: () => data,
            })),
          }),
        }),
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
    expect(json.document.canDelete).toBe(false);
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
});
