/**
 * Labs review candidate PATCH ownership / version / transition contract.
 */
import express from "express";
import type http from "http";
import { AddressInfo } from "net";

import labsReviewsMeRoutes from "../../routes/labsReviewsMe";
import { userCollection } from "../../db";
import { LABS_OS_SCHEMA_VERSION } from "@oli/contracts";

jest.mock("../../db", () => ({
  userCollection: jest.fn(),
}));

const UID = "user_owner_1";
const OTHER = "user_other_2";
const DOC_ID = "doc_patch_1";
const CAND_ID = "cand_patch_1";
const NOW = "2026-07-15T12:00:00.000Z";
const CHECKSUM = "a".repeat(64);

type DocSnap = { exists: boolean; id: string; data: () => unknown };

function makeCol(store: Map<string, Record<string, unknown>>) {
  return {
    doc: (id: string) => ({
      id,
      get: async (): Promise<DocSnap> => {
        const data = store.get(id);
        return { exists: data != null, id, data: () => data as unknown };
      },
      set: async (data: Record<string, unknown>) => {
        store.set(id, { ...(store.get(id) ?? {}), ...data });
      },
    }),
    where: () => ({
      limit: () => ({
        get: async () => ({
          docs: [...store.entries()].map(([id, data]) => ({
            id,
            data: () => data,
          })),
        }),
      }),
    }),
    limit: () => ({
      get: async () => ({
        docs: [...store.entries()].map(([id, data]) => ({
          id,
          data: () => data,
        })),
      }),
    }),
  };
}

function seedStores() {
  const reviews = new Map<string, Record<string, unknown>>();
  const drafts = new Map<string, Record<string, unknown>>();
  const documents = new Map<string, Record<string, unknown>>();

  drafts.set("draft_1", {
    schemaVersion: LABS_OS_SCHEMA_VERSION,
    id: "draft_1",
    documentId: DOC_ID,
    userId: UID,
    reportCandidate: { confidence: 0.9, laboratoryName: "Quest" },
    panels: [],
    results: [
      {
        id: CAND_ID,
        rawAnalyteLabel: "GLUCOSE",
        rawResult: "92",
        result: { kind: "numeric", value: 92, comparator: "eq" },
        unit: {
          rawUnit: "mg/dL",
          normalizedUnit: "mg/dL",
          unitRegistryVersion: "1.0.0",
          confidence: 1,
          known: true,
        },
        rawReferenceRange: "65-99",
        structuredReferenceRange: null,
        flag: { rawFlag: null, normalized: "none", source: "report_flag", confidence: 1 },
        panelId: null,
        aliasMatch: {
          canonicalMetricId: "glucose_fasting",
          matchMethod: "exact_alias",
          aliasVersion: "1.0.0",
          confidence: 0.95,
          requiresReview: false,
        },
        provenance: {
          sourceDocumentId: DOC_ID,
          sourcePage: 1,
          sourceLocator: "p1:L1",
          sourceChecksumSha256: CHECKSUM,
          parserId: "quest_text_pdf_v1",
          parserVersion: "1.0.0",
          extractionVersion: "1.0.0",
        },
        confidence: 0.95,
        warnings: [],
        reviewStatus: "pending_review",
      },
    ],
    unmatched: [],
    warnings: [],
    parser: { id: "quest_text_pdf_v1", version: "1.0.0", extractionVersion: "1.0.0" },
    sourceChecksumSha256: CHECKSUM,
    status: "review_needed",
    createdAt: NOW,
  });

  reviews.set(`review_${DOC_ID}`, {
    schemaVersion: LABS_OS_SCHEMA_VERSION,
    id: `review_${DOC_ID}`,
    documentId: DOC_ID,
    userId: UID,
    draftId: "draft_1",
    status: "not_started",
    reviewVersion: 0,
    candidateStatuses: { [CAND_ID]: "pending_review" },
    corrections: [],
    createdAt: NOW,
    updatedAt: NOW,
  });

  documents.set(DOC_ID, {
    safeDisplayFilename: "Quest.pdf",
    status: "review_needed",
  });

  return { reviews, drafts, documents };
}

describe("PATCH /users/me/labs/reviews/:documentId/candidates/:candidateId", () => {
  let server: http.Server;
  let baseUrl: string;
  let stores: ReturnType<typeof seedStores>;
  let authedUid = UID;

  beforeAll(async () => {
    stores = seedStores();
    (userCollection as jest.Mock).mockImplementation((uid: string, col: string) => {
      if (uid !== UID) {
        return makeCol(new Map());
      }
      if (col === "labReviews") return makeCol(stores.reviews);
      if (col === "labExtractionDrafts") return makeCol(stores.drafts);
      if (col === "documents") return makeCol(stores.documents);
      return makeCol(new Map());
    });

    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as { uid?: string }).uid = authedUid;
      (req as { rid?: string }).rid = "test-rid";
      next();
    });
    app.use("/users/me/labs/reviews", labsReviewsMeRoutes);
    server = await new Promise<http.Server>((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(() => {
    authedUid = UID;
    stores = seedStores();
  });

  it("accepts authenticated accept transition and returns safe DTO", async () => {
    const res = await fetch(
      `${baseUrl}/users/me/labs/reviews/${DOC_ID}/candidates/${CAND_ID}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewVersion: 0, reviewStatus: "user_accepted" }),
      },
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; reviewVersion: number };
    expect(json).toEqual({ ok: true, reviewVersion: 1 });
    const stored = stores.reviews.get(`review_${DOC_ID}`);
    expect(stored?.candidateStatuses).toEqual({ [CAND_ID]: "user_accepted" });
    expect(stored?.reviewVersion).toBe(1);
  });

  it("requires reviewVersion and rejects missing action", async () => {
    const missingVersion = await fetch(
      `${baseUrl}/users/me/labs/reviews/${DOC_ID}/candidates/${CAND_ID}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus: "user_accepted" }),
      },
    );
    expect(missingVersion.status).toBe(400);

    const missingAction = await fetch(
      `${baseUrl}/users/me/labs/reviews/${DOC_ID}/candidates/${CAND_ID}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewVersion: 0 }),
      },
    );
    expect(missingAction.status).toBe(400);
  });

  it("returns 409 on stale review version", async () => {
    const res = await fetch(
      `${baseUrl}/users/me/labs/reviews/${DOC_ID}/candidates/${CAND_ID}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewVersion: 99, reviewStatus: "user_accepted" }),
      },
    );
    expect(res.status).toBe(409);
  });

  it("denies cross-user access (empty owner store → 404)", async () => {
    authedUid = OTHER;
    const res = await fetch(
      `${baseUrl}/users/me/labs/reviews/${DOC_ID}/candidates/${CAND_ID}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewVersion: 0, reviewStatus: "user_accepted" }),
      },
    );
    expect(res.status).toBe(404);
  });
});
