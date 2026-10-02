import type { BodyScanExtractionDraft, UserDocumentRecord } from "@oli/contracts";

import { bodyScanCategoryAssociatedMethod } from "../../../../../../lib/data/body-scans/bodyScanCategoryCatalog";
import { buildBodyScanRecord } from "../persistBodyScan";

const baseDocument = (preferred?: UserDocumentRecord["preferredScanType"]): UserDocumentRecord => ({
  schemaVersion: "1.0.0",
  id: "doc_1",
  userId: "user_1",
  domain: "scans",
  documentType: "dexa_report",
  originalFilename: "report.pdf",
  safeDisplayFilename: "Original DXA report",
  mediaType: "application/pdf",
  byteSize: 1200,
  checksumSha256: "a".repeat(64),
  storageObjectId: "users/user_1/documents/doc_1/original",
  uploadedAt: "2026-09-28T12:00:00.000Z",
  source: "user_upload",
  status: "stored",
  retentionStatus: "active",
  createdAt: "2026-09-28T12:00:00.000Z",
  updatedAt: "2026-09-28T12:00:00.000Z",
  ...(preferred ? { preferredScanType: preferred } : {}),
});

describe("buildBodyScanRecord preferredScanType", () => {
  it("applies preferred category and associated method when no draft", () => {
    const record = buildBodyScanRecord({
      uid: "user_1",
      document: baseDocument("inbody"),
      draft: null,
      previous: null,
      now: "2026-09-28T13:00:00.000Z",
    });
    expect(record.scanType).toBe("inbody");
    expect(record.method).toBe("bia");
    expect(record.method).toBe(bodyScanCategoryAssociatedMethod("inbody"));
    expect(record.method).not.toBe("inbody");
  });

  it("prefers adapter draft candidates over preferredScanType", () => {
    const draft = {
      schemaVersion: "1.0.0",
      id: "draft_1",
      userId: "user_1",
      scanId: "doc_1",
      documentId: "doc_1",
      jobId: null,
      adapter: { id: "live_lean_rx_dxa", version: "1.0.0" },
      status: "partial",
      scanTypeCandidate: "dxa",
      methodCandidate: "dxa",
      device: { manufacturer: "GE", model: "Lunar" },
      performedAtCandidate: "2026-09-27T12:00:00.000Z",
      pagesProcessed: 1,
      pageCount: 1,
      fields: [],
      warnings: [],
      confidenceSummary: { overall: null, lowConfidenceFieldCount: 0 },
      sourceDocumentChecksum: "a".repeat(64),
      superseded: false,
      createdAt: "2026-09-28T12:00:00.000Z",
      updatedAt: "2026-09-28T12:00:00.000Z",
    } satisfies BodyScanExtractionDraft;

    const record = buildBodyScanRecord({
      uid: "user_1",
      document: baseDocument("inbody"),
      draft,
      previous: null,
      now: "2026-09-28T13:00:00.000Z",
    });
    expect(record.scanType).toBe("dxa");
    expect(record.method).toBe("dxa");
  });

  it("maps evolt preference to bia and bod_pod to air_displacement", () => {
    expect(
      buildBodyScanRecord({
        uid: "user_1",
        document: baseDocument("evolt"),
        draft: null,
        previous: null,
        now: "2026-09-28T13:00:00.000Z",
      }).method,
    ).toBe("bia");
    expect(
      buildBodyScanRecord({
        uid: "user_1",
        document: baseDocument("bod_pod"),
        draft: null,
        previous: null,
        now: "2026-09-28T13:00:00.000Z",
      }).method,
    ).toBe("air_displacement");
  });
});
