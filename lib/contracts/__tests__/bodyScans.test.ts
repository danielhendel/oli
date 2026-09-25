import { describe, expect, it } from "@jest/globals";

import {
  BODY_SCAN_SCHEMA_VERSION,
  bodyScanConfirmRequestDtoSchema,
  bodyScanDetailDtoSchema,
  bodyScanExtractedFieldSchema,
  bodyScanFactSchema,
  bodyScanRecordSchema,
} from "../bodyScans";
import { documentViewOriginalResponseDtoSchema } from "../documents";

const DEVICE = { manufacturer: "GE Lunar", model: "iDXA" };

const BASE_RECORD = {
  schemaVersion: BODY_SCAN_SCHEMA_VERSION,
  id: "scan_1",
  userId: "user_1",
  documentId: "doc_1",
  scanType: "dxa",
  method: "dxa",
  device: DEVICE,
  performedAt: "2026-03-04T00:00:00.000Z",
  status: "needs_review",
  adapter: { id: "live_lean_rx_dxa", version: "1.0.0" },
  extractionDraftId: "draft_1",
  metrics: [],
  reviewedAt: null,
  correctionCount: 0,
  failureCode: null,
  retentionStatus: "active",
  createdAt: "2026-03-05T12:00:00.000Z",
  updatedAt: "2026-03-05T12:00:00.000Z",
};

describe("body scan contracts", () => {
  it("accepts a durable scan record and strips unknown server fields", () => {
    const parsed = bodyScanRecordSchema.parse({ ...BASE_RECORD, storageObjectId: "users/u/x" });
    expect(parsed.id).toBe("scan_1");
    expect((parsed as Record<string, unknown>).storageObjectId).toBeUndefined();
  });

  it("keeps a missing extracted value null rather than zero", () => {
    const field = bodyScanExtractedFieldSchema.parse({
      fieldId: "total:fat_percent",
      metricId: "fat_percent",
      region: "total",
      rawLabel: "Total Body % Fat",
      rawValue: "--",
      normalizedValue: null,
      unit: "percent",
      pageNumber: 1,
      sourceLocator: null,
      confidence: null,
      requiresReview: true,
      warningCodes: ["value_unparsed"],
    });
    expect(field.normalizedValue).toBeNull();
  });

  it("allows a correction to explicitly clear a value", () => {
    const parsed = bodyScanConfirmRequestDtoSchema.parse({
      corrections: [{ fieldId: "total:fat_percent", value: null }],
    });
    expect(parsed.corrections?.[0]?.value).toBeNull();
  });

  it("requires confirmed facts to declare continuous-trend exclusion", () => {
    const fact = {
      schemaVersion: BODY_SCAN_SCHEMA_VERSION,
      id: "fact_1",
      userId: "user_1",
      scanId: "scan_1",
      documentId: "doc_1",
      scanType: "dxa",
      method: "dxa",
      performedAt: null,
      confirmedAt: "2026-03-06T12:00:00.000Z",
      metrics: [],
      excludedFromContinuousTrends: true,
    };
    expect(bodyScanFactSchema.parse(fact).excludedFromContinuousTrends).toBe(true);
    expect(
      bodyScanFactSchema.safeParse({ ...fact, excludedFromContinuousTrends: false }).success,
    ).toBe(false);
  });

  it("keeps consumer detail free of storage identifiers", () => {
    const detail = bodyScanDetailDtoSchema.parse({
      id: "scan_1",
      scanType: "dxa",
      method: "dxa",
      status: "verified",
      statusLabel: "Results available.",
      performedAt: null,
      uploadedAt: "2026-03-05T12:00:00.000Z",
      deviceLabel: "GE Lunar iDXA",
      adapterLabel: "Live Lean Rx DXA v1.0.0",
      sourceFilename: "body-scan.pdf",
      metrics: [],
      safeWarnings: [],
      canReview: true,
      canRetry: true,
      canDelete: true,
      canViewOriginal: true,
      storageObjectId: "users/u/documents/doc_1/original",
      userId: "user_1",
    });
    const keys = Object.keys(detail);
    expect(keys).not.toContain("storageObjectId");
    expect(keys).not.toContain("userId");
  });

  it("models view-original as either a short-lived grant or an explicit reason", () => {
    const granted = documentViewOriginalResponseDtoSchema.parse({
      ok: true,
      available: true,
      url: "https://storage.example.com/signed",
      expiresAt: "2026-03-05T12:02:00.000Z",
      mediaType: "application/pdf",
      filename: "body-scan.pdf",
    });
    expect(granted.available).toBe(true);

    const denied = documentViewOriginalResponseDtoSchema.parse({
      ok: true,
      available: false,
      reasonCode: "VIEW_ORIGINAL_NOT_STORED",
    });
    expect(denied.available).toBe(false);

    expect(
      documentViewOriginalResponseDtoSchema.safeParse({ ok: true, available: true }).success,
    ).toBe(false);
  });
});
