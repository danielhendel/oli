/**
 * Document upload flow controller (client).
 * Uses Document OS upload-intent → complete-upload. No direct Firebase/Storage writes.
 */

import { useCallback, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { completeDocumentUpload, createDocumentUploadIntent, getDocumentDetail } from "@/lib/api/documents";
import type {
  DocumentDetailDto,
  DocumentDomain,
  DocumentMediaType,
  DocumentRecordStatus,
} from "@/lib/contracts";
import {
  DOCUMENT_PICKER_UNAVAILABLE_MESSAGE,
  pickLabPdfDocument,
} from "@/lib/labs/expoDocumentPicker";
import { readLocalUriAsBase64 } from "@/lib/labs/readLabPdfBase64";
import { DOCUMENT_MAX_BYTE_SIZE } from "@/lib/data/documents/documentValidation";
import { defaultDocumentTypeForDomain } from "@/lib/data/documents/documentTypes";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";

const TERMINAL_STATUSES = new Set<DocumentRecordStatus>([
  "review_needed",
  "structured",
  "unsupported",
  "failed",
]);

export type DocumentUploadImportSummary = {
  importedCount: number;
  reviewNeededCount: number;
  unmatchedCount: number;
  reportImportStatus: NonNullable<DocumentDetailDto["reportImportStatus"]>;
  hasAutoPublishedResults: boolean;
  hasReviewItems: boolean;
  withheldCount?: number;
  verifyingCount?: number;
  systemVerifiedCount?: number;
  reportContentCount?: number;
};

function importSummaryFromDetail(doc: DocumentDetailDto): DocumentUploadImportSummary | null {
  if (
    typeof doc.importedCount !== "number" ||
    typeof doc.reviewNeededCount !== "number" ||
    typeof doc.unmatchedCount !== "number" ||
    !doc.reportImportStatus
  ) {
    return null;
  }
  const extra = doc as DocumentDetailDto & {
    withheldCount?: number;
    verifyingCount?: number;
    systemVerifiedCount?: number;
    reportContentCount?: number;
  };
  const summary: DocumentUploadImportSummary = {
    importedCount: doc.importedCount,
    reviewNeededCount: doc.reviewNeededCount,
    unmatchedCount: doc.unmatchedCount,
    reportImportStatus: doc.reportImportStatus,
    hasAutoPublishedResults: doc.hasAutoPublishedResults === true,
    hasReviewItems: doc.hasReviewItems === true,
  };
  if (typeof extra.withheldCount === "number") summary.withheldCount = extra.withheldCount;
  if (typeof extra.verifyingCount === "number") summary.verifyingCount = extra.verifyingCount;
  if (typeof extra.systemVerifiedCount === "number") {
    summary.systemVerifiedCount = extra.systemVerifiedCount;
  }
  if (typeof extra.reportContentCount === "number") {
    summary.reportContentCount = extra.reportContentCount;
  }
  return summary;
}

async function pollDocumentTerminal(
  token: string,
  documentId: string,
  cancelled: () => boolean,
): Promise<{ status: DocumentRecordStatus | null; importSummary: DocumentUploadImportSummary | null }> {
  for (let i = 0; i < 30; i++) {
    if (cancelled()) return { status: null, importSummary: null };
    const detail = await getDocumentDetail(token, documentId, { cacheBust: `poll-${i}-${Date.now()}` });
    const outcome = truthOutcomeFromApiResult(detail);
    if (outcome.status === "ready") {
      const status = outcome.data.document.status;
      if (TERMINAL_STATUSES.has(status)) {
        return {
          status,
          importSummary: importSummaryFromDetail(outcome.data.document),
        };
      }
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return { status: null, importSummary: null };
}

export type DocumentUploadPhase =
  | "idle"
  | "picking"
  | "uploading"
  | "processing"
  | "success"
  | "duplicate"
  | "error";

export type DocumentUploadFlowState = {
  phase: DocumentUploadPhase;
  documentId: string | null;
  errorMessage: string | null;
  duplicate: boolean;
  /** Terminal document status when known (after awaited ingest or poll). */
  terminalStatus: string | null;
  reprocessAvailable: boolean;
  importSummary: DocumentUploadImportSummary | null;
};

const INITIAL: DocumentUploadFlowState = {
  phase: "idle",
  documentId: null,
  errorMessage: null,
  duplicate: false,
  terminalStatus: null,
  reprocessAvailable: false,
  importSummary: null,
};

function mediaTypeFromPicker(mimeType: string | undefined, name: string | undefined): DocumentMediaType | null {
  const mime = (mimeType ?? "").toLowerCase();
  if (mime === "application/pdf") return "application/pdf";
  if (mime === "image/jpeg" || mime === "image/jpg") return "image/jpeg";
  if (mime === "image/png") return "image/png";
  if (mime === "image/heic" || mime === "image/heif") return "image/heic";
  const lower = (name ?? "").toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".heic") || lower.endsWith(".heif")) return "image/heic";
  return null;
}

export function useDocumentUploadFlow(args: { domain: DocumentDomain }) {
  const { getIdToken } = useAuth();
  const [state, setState] = useState<DocumentUploadFlowState>(INITIAL);
  const cancelledRef = useRef(false);
  const counterRef = useRef(0);

  const reset = useCallback(() => {
    cancelledRef.current = false;
    setState(INITIAL);
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    setState(INITIAL);
  }, []);

  const startUpload = useCallback(async () => {
    cancelledRef.current = false;
    setState({
      phase: "picking",
      documentId: null,
      errorMessage: null,
      duplicate: false,
      terminalStatus: null,
      reprocessAvailable: false,
      importSummary: null,
    });

    const pickResult = await pickLabPdfDocument();
    if (cancelledRef.current) return;

    if (pickResult.status === "unavailable") {
      setState({
        phase: "error",
        documentId: null,
        errorMessage: DOCUMENT_PICKER_UNAVAILABLE_MESSAGE,
        duplicate: false,
        terminalStatus: null,
        reprocessAvailable: false,
        importSummary: null,
      });
      return;
    }
    if (pickResult.status === "canceled") {
      setState(INITIAL);
      return;
    }

    const asset = pickResult.asset;
    const mediaType = mediaTypeFromPicker(asset.mimeType, asset.name);
    if (!mediaType) {
      setState({
        phase: "error",
        documentId: null,
        errorMessage: "Unsupported file type. Use PDF, JPEG, or PNG.",
        duplicate: false,
        terminalStatus: null,
        reprocessAvailable: false,
        importSummary: null,
      });
      return;
    }

    setState({
      phase: "uploading",
      documentId: null,
      errorMessage: null,
      duplicate: false,
      terminalStatus: null,
      reprocessAvailable: false,
      importSummary: null,
    });

    let fileBase64: string;
    try {
      fileBase64 = await readLocalUriAsBase64(asset.uri);
    } catch {
      setState({
        phase: "error",
        documentId: null,
        errorMessage: "Could not read the selected file",
        duplicate: false,
        terminalStatus: null,
        reprocessAvailable: false,
        importSummary: null,
      });
      return;
    }
    if (cancelledRef.current) return;

    const byteSize = Math.floor((fileBase64.length * 3) / 4);
    if (byteSize > DOCUMENT_MAX_BYTE_SIZE) {
      setState({
        phase: "error",
        documentId: null,
        errorMessage: "File exceeds the maximum allowed size",
        duplicate: false,
        terminalStatus: null,
        reprocessAvailable: false,
        importSummary: null,
      });
      return;
    }

    const token = await getIdToken(false);
    if (!token) {
      setState({
        phase: "error",
        documentId: null,
        errorMessage: "Not signed in",
        duplicate: false,
        terminalStatus: null,
        reprocessAvailable: false,
        importSummary: null,
      });
      return;
    }

    const originalFilename = asset.name || "document.pdf";
    const intent = await createDocumentUploadIntent(token, {
      domain: args.domain,
      documentType: defaultDocumentTypeForDomain(args.domain),
      originalFilename,
      mediaType,
      byteSize: Math.max(byteSize, 32),
    });

    if (cancelledRef.current) return;
    const intentOutcome = truthOutcomeFromApiResult(intent);
    if (intentOutcome.status !== "ready") {
      setState({
        phase: "error",
        documentId: null,
        errorMessage: "Upload could not be started",
        duplicate: false,
        terminalStatus: null,
        reprocessAvailable: false,
        importSummary: null,
      });
      return;
    }

    counterRef.current += 1;
    const idempotencyKey = `doc-upload-${Date.now()}-${counterRef.current}`;
    setState({
      phase: "processing",
      documentId: intentOutcome.data.documentId,
      errorMessage: null,
      duplicate: false,
      terminalStatus: null,
      reprocessAvailable: false,
      importSummary: null,
    });

    const complete = await completeDocumentUpload(
      token,
      intentOutcome.data.documentId,
      {
        fileBase64,
        originalFilename,
        mediaType,
      },
      { idempotencyKey },
    );

    if (cancelledRef.current) return;
    const completeOutcome = truthOutcomeFromApiResult(complete);
    if (completeOutcome.status !== "ready") {
      setState({
        phase: "error",
        documentId: intentOutcome.data.documentId,
        errorMessage: "Upload failed",
        duplicate: false,
        terminalStatus: null,
        reprocessAvailable: false,
        importSummary: null,
      });
      return;
    }

    const activeDocumentId = completeOutcome.data.documentId;
    if (completeOutcome.data.duplicate) {
      const reprocessAvailable = completeOutcome.data.reprocessAvailable === true;
      setState({
        phase: "duplicate",
        documentId: activeDocumentId,
        errorMessage: reprocessAvailable
          ? "This report already exists in your account. Open it to reprocess with the current Labs parser."
          : "This report already exists in your account.",
        duplicate: true,
        terminalStatus: completeOutcome.data.status,
        reprocessAvailable,
        importSummary: null,
      });
      return;
    }

    let terminalStatus: DocumentRecordStatus | null = completeOutcome.data.status;
    let importSummary: DocumentUploadImportSummary | null = null;
    if (!TERMINAL_STATUSES.has(terminalStatus)) {
      const polled = await pollDocumentTerminal(token, activeDocumentId, () => cancelledRef.current);
      terminalStatus = polled.status;
      importSummary = polled.importSummary;
    } else {
      const detail = await getDocumentDetail(token, activeDocumentId, {
        cacheBust: `terminal-${Date.now()}`,
      });
      const detailOutcome = truthOutcomeFromApiResult(detail);
      if (detailOutcome.status === "ready") {
        importSummary = importSummaryFromDetail(detailOutcome.data.document);
      }
    }
    if (cancelledRef.current) return;

    setState({
      phase: "success",
      documentId: activeDocumentId,
      errorMessage: null,
      duplicate: false,
      terminalStatus,
      reprocessAvailable: false,
      importSummary,
    });
  }, [args.domain, getIdToken]);

  return { ...state, startUpload, reset, cancel };
}
