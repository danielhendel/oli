// services/api/src/lib/labs/mockLabPdfParser.ts
// Server-side mock parser hook — replaces with real PDF extraction pipeline.
import type { LabMetricResultDto } from "@oli/contracts";
import { findLabMetricByAlias } from "@/lib/labs/labMetricCatalog";

export type MockParseOutcome = {
  results: LabMetricResultDto[];
  matchedCount: number;
  unmatchedCount: number;
  status: "parsed" | "needs_review";
  labDate?: string;
};

const MOCK_BIOMARKERS: { rawName: string; value: number; unit: string; flag?: "low" | "normal" | "high" }[] = [
  { rawName: "LDL-C", value: 92, unit: "mg/dL", flag: "normal" },
  { rawName: "HDL-C", value: 58, unit: "mg/dL", flag: "normal" },
  { rawName: "Triglycerides", value: 71, unit: "mg/dL", flag: "normal" },
  { rawName: "ApoB", value: 74, unit: "mg/dL", flag: "normal" },
  { rawName: "Glucose", value: 89, unit: "mg/dL", flag: "normal" },
  { rawName: "HbA1c", value: 5.4, unit: "%", flag: "normal" },
  { rawName: "Unknown Marker XYZ", value: 12, unit: "units" },
];

/**
 * Mock PDF parse — maps known aliases to catalog metrics.
 * Production: replace with OCR/text extraction + alias resolution + confidence scoring.
 */
export function mockParseLabPdf(args: {
  uploadId: string;
  fileName: string;
  now: string;
}): MockParseOutcome {
  const { uploadId, fileName, now } = args;
  const results: LabMetricResultDto[] = [];
  let matchedCount = 0;
  let unmatchedCount = 0;

  for (const raw of MOCK_BIOMARKERS) {
    const catalog = findLabMetricByAlias(raw.rawName);
    const id = `${uploadId}_${raw.rawName.replace(/\s+/g, "_").toLowerCase()}`;

    if (!catalog) {
      unmatchedCount += 1;
      results.push({
        schemaVersion: 2,
        id,
        uploadId,
        metricKey: `unmatched_${unmatchedCount}`,
        displayName: raw.rawName,
        categoryKey: "unmatched",
        value: raw.value,
        unit: raw.unit,
        flag: "unknown",
        collectedAt: now,
        reportedAt: now,
        source: "lab_pdf",
        confidence: 0.3,
        rawName: raw.rawName,
        rawUnit: raw.unit,
        rawValueText: String(raw.value),
        createdAt: now,
      });
      continue;
    }

    matchedCount += 1;
    results.push({
      schemaVersion: 2,
      id,
      uploadId,
      metricKey: catalog.metricKey,
      displayName: catalog.displayName,
      categoryKey: catalog.categoryKey,
      value: raw.value,
      unit: raw.unit,
      flag: raw.flag ?? "unknown",
      collectedAt: now,
      reportedAt: now,
      source: "lab_pdf",
      confidence: 0.85,
      rawName: raw.rawName,
      rawUnit: raw.unit,
      rawValueText: String(raw.value),
      createdAt: now,
    });
  }

  void fileName;

  return {
    results,
    matchedCount,
    unmatchedCount,
    status: unmatchedCount > 0 ? "needs_review" : "parsed",
    labDate: now,
  };
}
