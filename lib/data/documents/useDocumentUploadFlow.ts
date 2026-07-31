/**
 * Document upload flow controller (client).
 * Uses Document OS upload-intent → complete-upload. No direct Firebase/Storage writes.
 */

import { useCallback, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { completeDocumentUpload, createDocumentUploadIntent } from "@/lib/api/documents";
import type { DocumentDomain, DocumentMediaType } from "@/lib/contracts";
import {
  DOCUMENT_PICKER_UNAVAILABLE_MESSAGE,
  pickLabPdfDocument,
} from "@/lib/labs/expoDocumentPicker";
import { readLocalUriAsBase64 } from "@/lib/labs/readLabPdfBase64";
import { DOCUMENT_MAX_BYTE_SIZE } from "@/lib/data/documents/documentValidation";
import { defaultDocumentTypeForDomain } from "@/lib/data/documents/documentTypes";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";

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
};

const INITIAL: DocumentUploadFlowState = {
  phase: "idle",
  documentId: null,
  errorMessage: null,
  duplicate: false,
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
    setState({ phase: "picking", documentId: null, errorMessage: null, duplicate: false });

    const pickResult = await pickLabPdfDocument();
    if (cancelledRef.current) return;

    if (pickResult.status === "unavailable") {
      setState({
        phase: "error",
        documentId: null,
        errorMessage: DOCUMENT_PICKER_UNAVAILABLE_MESSAGE,
        duplicate: false,
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
      });
      return;
    }

    setState({ phase: "uploading", documentId: null, errorMessage: null, duplicate: false });

    let fileBase64: string;
    try {
      fileBase64 = await readLocalUriAsBase64(asset.uri);
    } catch {
      setState({
        phase: "error",
        documentId: null,
        errorMessage: "Could not read the selected file",
        duplicate: false,
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
      });
      return;
    }

    counterRef.current += 1;
    const idempotencyKey = `doc-upload-${Date.now()}-${counterRef.current}`;
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
      });
      return;
    }

    if (completeOutcome.data.duplicate) {
      setState({
        phase: "duplicate",
        documentId: completeOutcome.data.documentId,
        errorMessage: "This report already exists in your account.",
        duplicate: true,
      });
      return;
    }

    setState({
      phase: "processing",
      documentId: completeOutcome.data.documentId,
      errorMessage: null,
      duplicate: false,
    });
    await new Promise((r) => setTimeout(r, 600));
    if (cancelledRef.current) return;
    setState({
      phase: "success",
      documentId: completeOutcome.data.documentId,
      errorMessage: null,
      duplicate: false,
    });
  }, [args.domain, getIdToken]);

  return { ...state, startUpload, reset, cancel };
}
