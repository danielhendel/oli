/**
 * Safe audit/diagnostic events for Body Scans (server).
 *
 * Never logs metric values, patient identity, report text, filenames, storage paths,
 * or signed URLs. Scan identity is a one-way token so events can be correlated in
 * operations without re-identifying the document.
 */

import { createHash } from "crypto";
import { logger } from "../logger";

export function redactedBodyScanToken(scanId: string): string {
  return createHash("sha256").update(`body_scan:${scanId}`).digest("hex").slice(0, 12);
}

export type BodyScanAuditEvent =
  | "body_scan_created"
  | "body_scan_extraction_completed"
  | "body_scan_confirmed"
  | "body_scan_reprocess_requested"
  | "body_scan_deleted";

export function logBodyScanEvent(
  event: BodyScanAuditEvent,
  fields: {
    scanToken: string;
    scanType?: string | null;
    method?: string | null;
    adapterId?: string | null;
    adapterVersion?: string | null;
    status?: string | null;
    /** Counts only — never the values themselves. */
    fieldCount?: number | null;
    metricCount?: number | null;
    lowConfidenceFieldCount?: number | null;
    correctionCount?: number | null;
    warningCount?: number | null;
    pageCount?: number | null;
    elapsedMs?: number | null;
    errorCode?: string | null;
    requestId?: string | null;
    idempotent?: boolean;
  },
): void {
  logger.info({
    event,
    scanToken: fields.scanToken,
    ...(fields.scanType != null ? { scanType: fields.scanType } : {}),
    ...(fields.method != null ? { method: fields.method } : {}),
    ...(fields.adapterId != null ? { adapterId: fields.adapterId } : {}),
    ...(fields.adapterVersion != null ? { adapterVersion: fields.adapterVersion } : {}),
    ...(fields.status != null ? { status: fields.status } : {}),
    ...(fields.fieldCount != null ? { fieldCount: fields.fieldCount } : {}),
    ...(fields.metricCount != null ? { metricCount: fields.metricCount } : {}),
    ...(fields.lowConfidenceFieldCount != null
      ? { lowConfidenceFieldCount: fields.lowConfidenceFieldCount }
      : {}),
    ...(fields.correctionCount != null ? { correctionCount: fields.correctionCount } : {}),
    ...(fields.warningCount != null ? { warningCount: fields.warningCount } : {}),
    ...(fields.pageCount != null ? { pageCount: fields.pageCount } : {}),
    ...(fields.elapsedMs != null ? { elapsedMs: fields.elapsedMs } : {}),
    ...(fields.errorCode != null ? { errorCode: fields.errorCode } : {}),
    ...(fields.requestId != null ? { requestId: fields.requestId } : {}),
    ...(fields.idempotent != null ? { idempotent: fields.idempotent } : {}),
  });
}
