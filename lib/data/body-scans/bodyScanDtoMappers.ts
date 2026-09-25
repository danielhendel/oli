/**
 * Body Scan record → consumer DTO mappers (pure).
 *
 * Consumer payloads never carry storage object ids, UIDs, checksums, or adapter internals
 * beyond a human-readable label.
 */

import type {
  BodyScanAdapterRef,
  BodyScanDetailDto,
  BodyScanDevice,
  BodyScanExtractionDraft,
  BodyScanListItemDto,
  BodyScanRecord,
  BodyScanReviewFieldDto,
  BodyScanReviewResponseDto,
} from "@oli/contracts";
import { bodyScanMetricDisplayLabel } from "./bodyScanMetricCatalog";
import {
  bodyScanStatusLabel,
  canDeleteBodyScan,
  canReprocessBodyScan,
  canReviewBodyScan,
} from "./bodyScanStatusMachine";

const ADAPTER_DISPLAY_NAMES: Record<string, string> = {
  live_lean_rx_dxa: "Live Lean Rx DXA",
  manual_review: "Manual review",
};

export function bodyScanDeviceLabel(device: BodyScanDevice): string | null {
  const parts = [device.manufacturer, device.model].filter(
    (part): part is string => typeof part === "string" && part.trim().length > 0,
  );
  return parts.length > 0 ? parts.join(" ") : null;
}

export function bodyScanAdapterLabel(adapter: BodyScanAdapterRef | null): string | null {
  if (!adapter) return null;
  const name = ADAPTER_DISPLAY_NAMES[adapter.id] ?? adapter.id;
  return `${name} v${adapter.version}`;
}

function canViewOriginal(record: BodyScanRecord): boolean {
  return record.status !== "deleted" && record.status !== "deleting";
}

export function toBodyScanListItemDto(record: BodyScanRecord): BodyScanListItemDto {
  return {
    id: record.id,
    scanType: record.scanType,
    method: record.method,
    status: record.status,
    performedAt: record.performedAt,
    uploadedAt: record.createdAt,
    deviceLabel: bodyScanDeviceLabel(record.device),
    statusLabel: bodyScanStatusLabel(record.status),
    metricCount: record.metrics.length,
    canReview: canReviewBodyScan(record.status),
    canRetry: canReprocessBodyScan(record.status),
    canDelete: canDeleteBodyScan(record.status),
    canViewOriginal: canViewOriginal(record),
  };
}

export function toBodyScanDetailDto(args: {
  record: BodyScanRecord;
  sourceFilename: string;
  safeWarnings: readonly string[];
}): BodyScanDetailDto {
  const { record } = args;
  return {
    id: record.id,
    scanType: record.scanType,
    method: record.method,
    status: record.status,
    statusLabel: bodyScanStatusLabel(record.status),
    performedAt: record.performedAt,
    uploadedAt: record.createdAt,
    deviceLabel: bodyScanDeviceLabel(record.device),
    adapterLabel: bodyScanAdapterLabel(record.adapter),
    sourceFilename: args.sourceFilename,
    metrics: record.metrics.map((metric) => ({
      metricId: metric.metricId,
      region: metric.region,
      value: metric.value,
      unit: metric.unit,
      rawLabel: metric.provenance.rawLabel,
      corrected: metric.provenance.corrected,
    })),
    safeWarnings: [...args.safeWarnings],
    canReview: canReviewBodyScan(record.status),
    canRetry: canReprocessBodyScan(record.status),
    canDelete: canDeleteBodyScan(record.status),
    canViewOriginal: canViewOriginal(record),
  };
}

export function toBodyScanReviewFieldDto(
  field: BodyScanExtractionDraft["fields"][number],
): BodyScanReviewFieldDto {
  return {
    fieldId: field.fieldId,
    metricId: field.metricId,
    region: field.region,
    label: bodyScanMetricDisplayLabel({ metricId: field.metricId, region: field.region }),
    rawValue: field.rawValue,
    normalizedValue: field.normalizedValue,
    unit: field.unit,
    confidence: field.confidence,
    requiresReview: field.requiresReview,
  };
}

export function toBodyScanReviewResponseDto(args: {
  record: BodyScanRecord;
  draft: BodyScanExtractionDraft | null;
  safeWarnings: readonly string[];
}): Omit<BodyScanReviewResponseDto, "ok"> {
  const fields = (args.draft?.fields ?? []).map(toBodyScanReviewFieldDto);
  const manualReviewOnly = fields.length === 0;
  return {
    scanId: args.record.id,
    status: args.record.status,
    scanType: args.record.scanType,
    method: args.record.method,
    performedAt: args.record.performedAt,
    deviceLabel: bodyScanDeviceLabel(args.record.device),
    adapterLabel: bodyScanAdapterLabel(args.record.adapter),
    fields,
    safeWarnings: [...args.safeWarnings],
    manualReviewOnly,
    // Nothing to confirm when the adapter produced no candidate values.
    confirmAvailable: !manualReviewOnly && args.record.status === "needs_review",
  };
}

/**
 * Consumer-safe warning copy. Adapter warning codes are internal; only vetted,
 * non-diagnostic sentences reach the client.
 */
const SAFE_WARNING_COPY: Record<string, string> = {
  scanned_pdf_no_text:
    "This report has no readable text layer, so values could not be extracted automatically.",
  encrypted_pdf: "This report is password protected, so it could not be read.",
  unsupported_layout: "This report layout is not supported for automatic extraction yet.",
  unsupported_report_type:
    "Automatic extraction is not available for this report type yet. The original is stored.",
  partial_page_text: "Only part of this report could be read.",
  low_confidence_fields: "Some values need your review before they are saved.",
  page_count_mismatch: "Only the first pages of this report were read.",
};

export function safeBodyScanWarnings(warningCodes: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const code of warningCodes) {
    const copy = SAFE_WARNING_COPY[code];
    if (!copy || seen.has(copy)) continue;
    seen.add(copy);
    out.push(copy);
  }
  return out;
}
