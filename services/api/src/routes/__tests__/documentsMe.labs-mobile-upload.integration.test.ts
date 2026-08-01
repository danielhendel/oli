/**
 * Mobile Document OS upload route → Labs Quest parser → review_needed.
 * Exercises complete-upload + orchestration (not a direct parser call).
 */
import express from "express";
import type http from "http";
import { AddressInfo } from "net";
import { readFileSync } from "fs";
import { resolve } from "path";
import { createHash } from "crypto";

import usersMeRoutes from "../../routes/usersMe";
import { userCollection } from "../../db";

jest.mock("../../db", () => ({
  userCollection: jest.fn(),
}));

jest.mock("../../lib/labs/pdfTextExtraction", () => ({
  extractPdfTextPages: jest.fn(async () => ({
    pageCount: 1,
    textCharCount: 280,
    warningCodes: [] as string[],
    pages: [
      {
        pageNumber: 1,
        text: [
          "Quest Diagnostics",
          "DirectLabs Laboratory Report",
          "Report Status: FINAL",
          "Collected: 03/15/2024 08:30 AM",
          "Reported: 03/16/2024 09:00 AM",
          "Fasting: Yes",
          "LIPID PANEL",
          "LDL-CHOLESTEROL 98 <100 mg/dL",
          "HDL-CHOLESTEROL 55 >40 mg/dL",
          "TRIGLYCERIDES <4 mg/dL",
          "Reference Range",
        ].join("\n"),
      },
    ],
  })),
}));

jest.mock("../../firebaseAdmin", () => {
  const objects = new Map<string, Buffer>();
  return {
    admin: {
      storage: () => ({
        bucket: () => ({
          file: (objectPath: string) => ({
            save: jest.fn(async (bytes: Buffer | Uint8Array) => {
              objects.set(objectPath, Buffer.from(bytes));
            }),
            download: jest.fn(async () => [objects.get(objectPath) ?? Buffer.alloc(0)]),
            delete: jest.fn(async () => {
              objects.delete(objectPath);
            }),
          }),
        }),
      }),
    },
  };
});

jest.mock("../../lib/firebaseStorageBucketId", () => ({
  requireFirebaseStorageBucketId: () => "test-bucket",
}));

type QuerySnap = { docs: { id: string; data: () => unknown }[] };
type DocSnap = { exists: boolean; id: string; data: () => unknown };

function makeDocRef(store: Map<string, Record<string, unknown>>, id: string) {
  return {
    id,
    get: async (): Promise<DocSnap> => {
      const data = store.get(id);
      return { exists: data != null, id, data: () => data as unknown };
    },
    create: async (data: Record<string, unknown>) => {
      store.set(id, { ...data });
    },
    set: async (data: Record<string, unknown>, opts?: { merge?: boolean }) => {
      if (opts?.merge) {
        store.set(id, { ...(store.get(id) ?? {}), ...data });
      } else {
        store.set(id, { ...data });
      }
    },
    update: async (data: Record<string, unknown>) => {
      store.set(id, { ...(store.get(id) ?? {}), ...data });
    },
    delete: async () => {
      store.delete(id);
    },
  };
}

describe("mobile Labs upload route → Quest review_needed", () => {
  let server: http.Server;
  let baseUrl: string;
  let stores: Record<string, Map<string, Record<string, unknown>>>;
  let autoId = 0;

  beforeAll(async () => {
    const app = express();
    app.use(express.json({ limit: "5mb" }));
    app.use((req, _res, next) => {
      (req as unknown as { uid: string }).uid = "user_mobile_labs";
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
    jest.clearAllMocks();
    autoId = 0;
    stores = {
      documents: new Map(),
      documentIngestionJobs: new Map(),
      documentExtractions: new Map(),
      labUploads: new Map(),
      labExtractionDrafts: new Map(),
      labReviews: new Map(),
      labResults: new Map(),
    };

    (userCollection as jest.Mock).mockImplementation((_uid: string, col: string) => {
      const resolvedStore = stores[col] ?? stores.documentExtractions;
      const filterEntries = (field?: string, value?: unknown) => {
        const entries = [...resolvedStore.entries()];
        if (!field) return entries;
        return entries.filter(([, data]) => (data as Record<string, unknown>)[field] === value);
      };
      const makeQuery = (field?: string, value?: unknown) => ({
        where: (field2: string, _op2: string, value2: unknown) => makeQuery(field2, value2),
        limit: () => ({
          get: async (): Promise<QuerySnap> => ({
            docs: filterEntries(field, value).map(([id, data]) => ({ id, data: () => data })),
          }),
        }),
        get: async (): Promise<QuerySnap> => ({
          docs: filterEntries(field, value).map(([id, data]) => ({ id, data: () => data })),
        }),
      });
      return {
        doc: (id?: string) => makeDocRef(resolvedStore, id ?? `auto_${++autoId}`),
        orderBy: () => ({
          limit: () => ({
            get: async (): Promise<QuerySnap> => ({
              docs: [...resolvedStore.entries()].map(([id, data]) => ({ id, data: () => data })),
            }),
          }),
        }),
        where: (field: string, _op: string, value: unknown) => makeQuery(field, value),
      };
    });
  });

  it("complete-upload selects quest_text_pdf_v1 and reaches review_needed with draft+review", async () => {
    const pdfPath = resolve(
      __dirname,
      "../../../../../lib/labs/extraction/__fixtures__/quest_synthetic_lifecycle_v1.pdf",
    );
    const pdf = readFileSync(pdfPath);
    const checksum = createHash("sha256").update(pdf).digest("hex");

    const intentRes = await fetch(`${baseUrl}/users/me/documents/upload-intent`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        domain: "labs",
        documentType: "lab_report",
        originalFilename: "quest-synthetic.pdf",
        mediaType: "application/pdf",
        byteSize: pdf.length,
      }),
    });
    expect(intentRes.status).toBe(201);
    const intentJson = (await intentRes.json()) as { documentId: string };
    const documentId = intentJson.documentId;

    const completeRes = await fetch(
      `${baseUrl}/users/me/documents/${encodeURIComponent(documentId)}/complete-upload`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": `mobile-it-${documentId}`,
        },
        body: JSON.stringify({
          fileBase64: pdf.toString("base64"),
          originalFilename: "quest-synthetic.pdf",
          mediaType: "application/pdf",
          checksumSha256: checksum,
        }),
      },
    );
    expect(completeRes.status).toBe(202);
    const completeJson = (await completeRes.json()) as {
      status: string;
      duplicate?: boolean;
    };
    expect(completeJson.duplicate).toBeFalsy();
    expect(completeJson.status).toBe("review_needed");

    const doc = stores.documents.get(documentId);
    expect(doc?.status).toBe("review_needed");
    expect((doc?.parser as { id?: string } | undefined)?.id).toBe("quest_text_pdf_v1");
    expect(doc?.parser).not.toEqual(expect.objectContaining({ id: "unsupported_lab" }));

    expect(stores.labExtractionDrafts.size).toBeGreaterThan(0);
    expect(stores.labReviews.size).toBeGreaterThan(0);

    const detailRes = await fetch(`${baseUrl}/users/me/documents/${encodeURIComponent(documentId)}`);
    expect(detailRes.status).toBe(200);
    const detailJson = (await detailRes.json()) as {
      document: { status: string; canRetry: boolean };
    };
    expect(detailJson.document.status).toBe("review_needed");

    const reviewRes = await fetch(`${baseUrl}/users/me/labs/reviews/${encodeURIComponent(documentId)}`);
    expect(reviewRes.status).toBe(200);
  }, 60000);
});
