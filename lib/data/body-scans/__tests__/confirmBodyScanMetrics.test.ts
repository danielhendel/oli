import { describe, expect, it } from "@jest/globals";
import {
  BODY_SCAN_SCHEMA_VERSION,
  type BodyScanExtractedField,
  type BodyScanExtractionDraft,
} from "@oli/contracts";

import { confirmBodyScanMetrics } from "../confirmBodyScanMetrics";

function field(overrides: Partial<BodyScanExtractedField> & Pick<BodyScanExtractedField, "fieldId">): BodyScanExtractedField {
  return {
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
    ...overrides,
  };
}

function draft(fields: BodyScanExtractedField[]): BodyScanExtractionDraft {
  return {
    schemaVersion: BODY_SCAN_SCHEMA_VERSION,
    id: "draft_1",
    userId: "user_1",
    scanId: "scan_1",
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
    fields,
    warnings: [],
    confidenceSummary: { overall: 0.9, lowConfidenceFieldCount: 0 },
    sourceDocumentChecksum: "a".repeat(64),
    superseded: false,
    createdAt: "2026-03-05T12:00:00.000Z",
    updatedAt: "2026-03-05T12:00:00.000Z",
  };
}

describe("confirmBodyScanMetrics", () => {
  it("confirms high-confidence fields with full provenance", () => {
    const result = confirmBodyScanMetrics({
      draft: draft([field({ fieldId: "total:fat_percent" })]),
      corrections: [],
      acknowledgedFieldIds: [],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.metrics).toHaveLength(1);
    expect(result.metrics[0]).toMatchObject({
      metricId: "fat_percent",
      region: "total",
      value: 21.4,
      method: "dxa",
      comparabilityGroup: "dxa:ge-lunar:fat_percent:total",
    });
    expect(result.metrics[0]?.provenance).toMatchObject({
      scanId: "scan_1",
      documentId: "doc_1",
      adapterId: "live_lean_rx_dxa",
      rawLabel: "Total Body % Fat",
      corrected: false,
    });
  });

  it("refuses to auto-confirm a field flagged for review", () => {
    const result = confirmBodyScanMetrics({
      draft: draft([field({ fieldId: "total:fat_percent", confidence: 0.4, requiresReview: true })]),
      corrections: [],
      acknowledgedFieldIds: [],
    });
    expect(result).toEqual({
      ok: false,
      code: "UNACKNOWLEDGED_REVIEW_FIELDS",
      fieldIds: ["total:fat_percent"],
    });
  });

  it("accepts a review field once the user acknowledges it", () => {
    const result = confirmBodyScanMetrics({
      draft: draft([field({ fieldId: "total:fat_percent", confidence: 0.4, requiresReview: true })]),
      corrections: [],
      acknowledgedFieldIds: ["total:fat_percent"],
    });
    expect(result.ok).toBe(true);
  });

  it("records a user correction and its provenance", () => {
    const result = confirmBodyScanMetrics({
      draft: draft([field({ fieldId: "total:fat_percent", requiresReview: true })]),
      corrections: [{ fieldId: "total:fat_percent", value: 22.1 }],
      acknowledgedFieldIds: [],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.correctionCount).toBe(1);
    expect(result.metrics[0]?.value).toBe(22.1);
    expect(result.metrics[0]?.provenance.corrected).toBe(true);
  });

  it("keeps a cleared field missing instead of storing zero", () => {
    const result = confirmBodyScanMetrics({
      draft: draft([
        field({ fieldId: "total:fat_percent" }),
        field({ fieldId: "total:lean_mass", metricId: "lean_mass", unit: "kg", normalizedValue: 58.2 }),
      ]),
      corrections: [{ fieldId: "total:lean_mass", value: null }],
      acknowledgedFieldIds: [],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.metrics.map((m) => m.metricId)).toEqual(["fat_percent"]);
    expect(result.metrics.some((m) => m.value === 0)).toBe(false);
  });

  it("drops unparsed fields rather than defaulting them", () => {
    const result = confirmBodyScanMetrics({
      draft: draft([
        field({ fieldId: "total:fat_percent" }),
        field({
          fieldId: "total:visceral_fat_mass",
          metricId: "visceral_fat_mass",
          unit: "kg",
          rawValue: "--",
          normalizedValue: null,
          confidence: null,
          requiresReview: true,
        }),
      ]),
      corrections: [],
      acknowledgedFieldIds: ["total:visceral_fat_mass"],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.metrics.map((m) => m.metricId)).toEqual(["fat_percent"]);
  });

  it("rejects corrections for fields the draft never produced", () => {
    const result = confirmBodyScanMetrics({
      draft: draft([field({ fieldId: "total:fat_percent" })]),
      corrections: [{ fieldId: "total:body_score", value: 99 }],
      acknowledgedFieldIds: [],
    });
    expect(result).toEqual({ ok: false, code: "UNKNOWN_FIELD", fieldIds: ["total:body_score"] });
  });

  it("refuses to confirm a scan with nothing left to save", () => {
    const result = confirmBodyScanMetrics({
      draft: draft([field({ fieldId: "total:fat_percent", normalizedValue: null, requiresReview: true })]),
      corrections: [],
      acknowledgedFieldIds: ["total:fat_percent"],
    });
    expect(result).toEqual({ ok: false, code: "NO_CONFIRMABLE_METRICS", fieldIds: [] });
  });
});
