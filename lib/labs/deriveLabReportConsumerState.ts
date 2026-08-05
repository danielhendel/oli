/**
 * Single deriver for Labs report consumer terminal state.
 * Structural counts override stale persisted review_needed.
 */

export const LAB_REPORT_CONSUMER_STATE_VERSION = "lab_report_consumer_state_v1" as const;

export type LabReportConsumerState =
  | "processing"
  | "imported"
  | "imported_with_notes"
  | "imported_with_withheld_results"
  | "review_available"
  | "unsupported"
  | "failed"
  | "deleted";

export type DeriveLabReportConsumerStateInput = {
  processingStatus: string | null | undefined;
  importedCount: number;
  genuinePendingDecisionCount: number;
  unmatchedGenuineAnalyteCount: number;
  withheldGenuineResultCount: number;
  classifiedReportRowCount: number;
  parserFailureCode?: string | null;
  sourceAvailable?: boolean;
};

export type LabReportConsumerPresentation = {
  consumerStatus: LabReportConsumerState;
  /** Persisted Document OS status when reconciliation should rewrite. */
  documentRecordStatus:
    | "processing"
    | "review_needed"
    | "structured"
    | "unsupported"
    | "failed"
    | null;
  statusLabel: string;
  consumerMessage: string | null;
  reviewActionAvailable: boolean;
  viewLabsActionAvailable: boolean;
  correctionActionAvailable: boolean;
};

const PROCESSING = new Set([
  "uploading",
  "stored",
  "processing",
  "created",
  "queued",
  "running",
  "extracting",
  "extracted",
  "validation_pending",
]);

/**
 * Derive consumer terminal state from structural truth.
 * Stale internal `review_needed` does not win when imports completed with zero pending.
 */
export function deriveLabReportConsumerState(
  input: DeriveLabReportConsumerStateInput,
): LabReportConsumerState {
  const status = (input.processingStatus ?? "").toLowerCase();
  if (status === "deleted" || status === "purged") return "deleted";
  if (status === "failed" || input.parserFailureCode) return "failed";
  if (status === "unsupported") return "unsupported";
  if (PROCESSING.has(status)) return "processing";

  const imported = Math.max(0, input.importedCount);
  const pending = Math.max(0, input.genuinePendingDecisionCount);
  const unmatchedGenuine = Math.max(0, input.unmatchedGenuineAnalyteCount);
  const withheld = Math.max(0, input.withheldGenuineResultCount);
  const classified = Math.max(0, input.classifiedReportRowCount);

  if (pending > 0) return "review_available";

  if (imported > 0) {
    if (withheld > 0) return "imported_with_withheld_results";
    if (classified > 0 || unmatchedGenuine > 0) return "imported_with_notes";
    return "imported";
  }

  // No imports: honor explicit unsupported/failed above; otherwise review or unsupported.
  if (status === "review_needed" || status === "structured") {
    return unmatchedGenuine > 0 ? "unsupported" : "review_available";
  }
  if (status === "imported" || status === "imported_with_exceptions" || status === "accepted") {
    return "imported";
  }
  return "review_available";
}

export function presentLabReportConsumerState(
  state: LabReportConsumerState,
  args?: { importedCount?: number },
): LabReportConsumerPresentation {
  const importedCount = args?.importedCount ?? 0;
  switch (state) {
    case "processing":
      return {
        consumerStatus: state,
        documentRecordStatus: "processing",
        statusLabel: "Processing",
        consumerMessage: "Processing this document…",
        reviewActionAvailable: false,
        viewLabsActionAvailable: false,
        correctionActionAvailable: false,
      };
    case "imported":
      return {
        consumerStatus: state,
        documentRecordStatus: "structured",
        statusLabel: "Imported",
        consumerMessage:
          importedCount > 0
            ? `${importedCount} results were added to Labs.\nNo review is required.`
            : "Results were added to Labs.\nNo review is required.",
        reviewActionAvailable: false,
        viewLabsActionAvailable: true,
        correctionActionAvailable: true,
      };
    case "imported_with_notes":
      return {
        consumerStatus: state,
        documentRecordStatus: "structured",
        statusLabel: "Imported",
        consumerMessage:
          importedCount > 0
            ? `${importedCount} results were added to Labs.\nNo review is required.`
            : "Results were added to Labs.\nNo review is required.",
        reviewActionAvailable: false,
        viewLabsActionAvailable: true,
        correctionActionAvailable: true,
      };
    case "imported_with_withheld_results":
      return {
        consumerStatus: state,
        documentRecordStatus: "structured",
        statusLabel: "Imported",
        consumerMessage:
          importedCount > 0
            ? `${importedCount} results were added to Labs.\nSome rows were safely withheld. No review is required.`
            : "Results were added to Labs.\nSome rows were safely withheld. No review is required.",
        reviewActionAvailable: false,
        viewLabsActionAvailable: true,
        correctionActionAvailable: true,
      };
    case "review_available":
      return {
        consumerStatus: state,
        documentRecordStatus: "review_needed",
        statusLabel: "Review needed",
        consumerMessage:
          "Structured extraction requires review before it can become trusted health data.",
        reviewActionAvailable: true,
        viewLabsActionAvailable: false,
        correctionActionAvailable: true,
      };
    case "unsupported":
      return {
        consumerStatus: state,
        documentRecordStatus: "unsupported",
        statusLabel: "Extraction unavailable",
        consumerMessage:
          "This document is stored, but structured extraction is not available yet. You can reprocess it if a supported Labs parser is available.",
        reviewActionAvailable: false,
        viewLabsActionAvailable: false,
        correctionActionAvailable: false,
      };
    case "failed":
      return {
        consumerStatus: state,
        documentRecordStatus: "failed",
        statusLabel: "Failed",
        consumerMessage: "Processing failed. You can retry when available.",
        reviewActionAvailable: false,
        viewLabsActionAvailable: false,
        correctionActionAvailable: false,
      };
    case "deleted":
      return {
        consumerStatus: state,
        documentRecordStatus: null,
        statusLabel: "Deleted",
        consumerMessage: null,
        reviewActionAvailable: false,
        viewLabsActionAvailable: false,
        correctionActionAvailable: false,
      };
  }
}

/**
 * Map consumer state (+ counts) into the presentation used by list/detail VMs.
 */
export function deriveLabReportConsumerPresentation(
  input: DeriveLabReportConsumerStateInput,
): LabReportConsumerPresentation {
  const state = deriveLabReportConsumerState(input);
  return presentLabReportConsumerState(state, { importedCount: input.importedCount });
}

/**
 * Whether a stale persisted document status should be rewritten.
 */
export function shouldPersistLabDocumentTerminalStatus(args: {
  currentDocumentStatus: string;
  presentation: LabReportConsumerPresentation;
}): boolean {
  const next = args.presentation.documentRecordStatus;
  if (!next) return false;
  if (args.currentDocumentStatus === next) return false;
  // Never overwrite failed/unsupported with structured unless structural imports prove success.
  if (
    (args.currentDocumentStatus === "failed" || args.currentDocumentStatus === "unsupported") &&
    next === "structured" &&
    args.presentation.consumerStatus !== "imported" &&
    args.presentation.consumerStatus !== "imported_with_notes" &&
    args.presentation.consumerStatus !== "imported_with_withheld_results"
  ) {
    return false;
  }
  // Promote stale review_needed → structured when imports completed with zero pending.
  if (args.currentDocumentStatus === "review_needed" && next === "structured") return true;
  // Demote only when genuine pending decisions exist.
  if (args.currentDocumentStatus === "structured" && next === "review_needed") return true;
  return false;
}
