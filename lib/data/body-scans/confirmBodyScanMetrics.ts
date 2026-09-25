/**
 * Body Scan review → confirm (pure).
 *
 * Confirmation is always an explicit human act:
 * - every field the adapter flagged for review must be corrected or acknowledged;
 * - a field left without a value stays missing — it never becomes zero;
 * - corrections are recorded in provenance so a confirmed metric shows its own history.
 */

import type {
  BodyScanExtractionDraft,
  BodyScanFieldCorrectionDto,
  BodyScanMetric,
} from "@oli/contracts";
import { bodyScanComparabilityGroup } from "./bodyScanMetricCatalog";

export type ConfirmBodyScanInput = {
  draft: BodyScanExtractionDraft;
  corrections: readonly BodyScanFieldCorrectionDto[];
  acknowledgedFieldIds: readonly string[];
};

export type ConfirmBodyScanResult =
  | { ok: true; metrics: BodyScanMetric[]; correctionCount: number }
  | { ok: false; code: "UNACKNOWLEDGED_REVIEW_FIELDS"; fieldIds: string[] }
  | { ok: false; code: "UNKNOWN_FIELD"; fieldIds: string[] }
  | { ok: false; code: "NO_CONFIRMABLE_METRICS"; fieldIds: [] };

export function confirmBodyScanMetrics(input: ConfirmBodyScanInput): ConfirmBodyScanResult {
  const fieldsById = new Map(input.draft.fields.map((field) => [field.fieldId, field]));

  const unknown = input.corrections
    .map((c) => c.fieldId)
    .filter((fieldId) => !fieldsById.has(fieldId));
  if (unknown.length > 0) {
    return { ok: false, code: "UNKNOWN_FIELD", fieldIds: unknown };
  }

  const correctionByFieldId = new Map(input.corrections.map((c) => [c.fieldId, c]));
  const acknowledged = new Set(input.acknowledgedFieldIds);

  const unacknowledged = input.draft.fields
    .filter((field) => field.requiresReview)
    .filter((field) => !correctionByFieldId.has(field.fieldId) && !acknowledged.has(field.fieldId))
    .map((field) => field.fieldId);
  if (unacknowledged.length > 0) {
    return { ok: false, code: "UNACKNOWLEDGED_REVIEW_FIELDS", fieldIds: unacknowledged };
  }

  const metrics: BodyScanMetric[] = [];
  let correctionCount = 0;

  for (const field of input.draft.fields) {
    const correction = correctionByFieldId.get(field.fieldId);
    const corrected = correction != null && correction.value !== field.normalizedValue;
    const value = correction != null ? correction.value : field.normalizedValue;
    if (corrected) correctionCount += 1;
    // Missing is missing: a field with no value produces no metric at all.
    if (value == null) continue;

    metrics.push({
      metricId: field.metricId,
      region: field.region,
      value,
      unit: field.unit,
      method: input.draft.methodCandidate,
      comparabilityGroup: bodyScanComparabilityGroup({
        method: input.draft.methodCandidate,
        manufacturer: input.draft.device.manufacturer,
        metricId: field.metricId,
        region: field.region,
      }),
      provenance: {
        scanId: input.draft.scanId,
        documentId: input.draft.documentId,
        adapterId: input.draft.adapter.id,
        adapterVersion: input.draft.adapter.version,
        pageNumber: field.pageNumber,
        rawLabel: field.rawLabel,
        sourceLocator: field.sourceLocator,
        confidence: field.confidence,
        corrected,
      },
    });
  }

  if (metrics.length === 0) {
    return { ok: false, code: "NO_CONFIRMABLE_METRICS", fieldIds: [] };
  }

  return { ok: true, metrics, correctionCount };
}
