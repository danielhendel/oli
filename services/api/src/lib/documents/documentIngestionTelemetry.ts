/**
 * Safe structured diagnostics for Document / Labs ingestion (server).
 * Never logs report text, analyte values, storage paths, UIDs, or filenames.
 */

import { createHash } from "crypto";
import { logger } from "../logger";

export function redactedDocumentToken(documentId: string): string {
  return createHash("sha256").update(`doc:${documentId}`).digest("hex").slice(0, 12);
}

export function logDocumentIngestionEvent(
  event:
    | "document_upload_completed"
    | "document_parser_eligibility_evaluated"
    | "document_parser_selected"
    | "document_parser_started"
    | "document_parser_terminal"
    | "lab_draft_persisted"
    | "lab_auto_publish_completed"
    | "document_status_reconciled",
  fields: {
    documentToken: string;
    domain?: string;
    parserId?: string | null;
    parserVersion?: string | null;
    formatFamily?: string | null;
    eligibility?: boolean;
    eligibilityReason?: string | null;
    pageCount?: number | null;
    candidateCount?: number | null;
    warningCount?: number | null;
    terminalStatus?: string | null;
    elapsedMs?: number | null;
    errorCode?: string | null;
    orchestrationErrorName?: string | null;
    orchestrationErrorCode?: string | null;
    requestId?: string | null;
    importedCount?: number | null;
    reviewNeededCount?: number | null;
    unmatchedCount?: number | null;
    reportImportStatus?: string | null;
  },
): void {
  logger.info({
    event,
    documentToken: fields.documentToken,
    ...(fields.domain != null ? { domain: fields.domain } : {}),
    ...(fields.parserId != null ? { parserId: fields.parserId } : {}),
    ...(fields.parserVersion != null ? { parserVersion: fields.parserVersion } : {}),
    ...(fields.formatFamily != null ? { formatFamily: fields.formatFamily } : {}),
    ...(fields.eligibility != null ? { eligibility: fields.eligibility } : {}),
    ...(fields.eligibilityReason != null ? { eligibilityReason: fields.eligibilityReason } : {}),
    ...(fields.pageCount != null ? { pageCount: fields.pageCount } : {}),
    ...(fields.candidateCount != null ? { candidateCount: fields.candidateCount } : {}),
    ...(fields.warningCount != null ? { warningCount: fields.warningCount } : {}),
    ...(fields.terminalStatus != null ? { terminalStatus: fields.terminalStatus } : {}),
    ...(fields.elapsedMs != null ? { elapsedMs: fields.elapsedMs } : {}),
    ...(fields.errorCode != null ? { errorCode: fields.errorCode } : {}),
    ...(fields.orchestrationErrorName != null
      ? { orchestrationErrorName: fields.orchestrationErrorName }
      : {}),
    ...(fields.orchestrationErrorCode != null
      ? { orchestrationErrorCode: fields.orchestrationErrorCode }
      : {}),
    ...(fields.requestId != null ? { requestId: fields.requestId } : {}),
    ...(fields.importedCount != null ? { importedCount: fields.importedCount } : {}),
    ...(fields.reviewNeededCount != null ? { reviewNeededCount: fields.reviewNeededCount } : {}),
    ...(fields.unmatchedCount != null ? { unmatchedCount: fields.unmatchedCount } : {}),
    ...(fields.reportImportStatus != null ? { reportImportStatus: fields.reportImportStatus } : {}),
  });
}
