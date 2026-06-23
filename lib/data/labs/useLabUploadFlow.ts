// lib/data/labs/useLabUploadFlow.ts
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";
import { createLabUpload } from "@/lib/api/labs";
import {
  DOCUMENT_PICKER_UNAVAILABLE_MESSAGE,
  pickLabPdfDocument,
  probeExpoDocumentPickerAvailability,
} from "@/lib/labs/expoDocumentPicker";
import { readLocalUriAsBase64 } from "@/lib/labs/readLabPdfBase64";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import {
  LAB_UPLOAD_FLOW_INITIAL,
  type LabUploadFlowState,
} from "@/lib/data/labs/labUploadFlowTypes";

export type { LabUploadFlowPhase, LabUploadFlowState } from "@/lib/data/labs/labUploadFlowTypes";

export type DocumentPickerAvailability = "checking" | "available" | "unavailable";

export function useLabUploadFlow() {
  const { getIdToken } = useAuth();
  const [documentPickerAvailability, setDocumentPickerAvailability] =
    useState<DocumentPickerAvailability>("checking");
  const [state, setState] = useState<LabUploadFlowState>(LAB_UPLOAD_FLOW_INITIAL);
  const idempotencyRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    void probeExpoDocumentPickerAvailability().then((available) => {
      if (!cancelled) {
        setDocumentPickerAvailability(available ? "available" : "unavailable");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const reset = useCallback(() => setState(LAB_UPLOAD_FLOW_INITIAL), []);

  const pickAndUpload = useCallback(async () => {
    setState((s) => ({ ...s, phase: "picking", error: null }));

    const pickResult = await pickLabPdfDocument();
    if (pickResult.status === "unavailable") {
      setDocumentPickerAvailability("unavailable");
      setState({
        phase: "error",
        uploadId: null,
        error: DOCUMENT_PICKER_UNAVAILABLE_MESSAGE,
        fileName: null,
      });
      return;
    }

    if (pickResult.status === "canceled") {
      setState(LAB_UPLOAD_FLOW_INITIAL);
      return;
    }

    const asset = pickResult.asset;
    const mimeType = asset.mimeType ?? "application/pdf";
    if (mimeType !== "application/pdf") {
      setState({
        phase: "error",
        uploadId: null,
        error: "Only PDF files are supported.",
        fileName: asset.name ?? null,
      });
      return;
    }

    const fileName = asset.name ?? "lab-report.pdf";
    setState({ phase: "uploading", uploadId: null, error: null, fileName });

    try {
      const fileBase64 = await readLocalUriAsBase64(asset.uri);
      const token = await getIdToken(true);
      if (!token) {
        setState({ phase: "error", uploadId: null, error: "Sign in to upload lab reports.", fileName });
        return;
      }

      const idempotencyKey = `lab-upload-${Date.now()}-${++idempotencyRef.current}`;
      const res = await createLabUpload(
        token,
        { fileName, mimeType: "application/pdf", fileBase64 },
        { idempotencyKey },
      );

      const outcome = truthOutcomeFromApiResult(res);
      if (outcome.status !== "ready") {
        setState({
          phase: "error",
          uploadId: null,
          error: outcome.status === "error" ? outcome.error : "Upload failed",
          fileName,
        });
        return;
      }

      setState({
        phase: "processing",
        uploadId: outcome.data.id,
        error: null,
        fileName,
      });

      // Brief processing state — server mock parser runs async.
      await new Promise((r) => setTimeout(r, 800));

      setState({
        phase: "success",
        uploadId: outcome.data.id,
        error: null,
        fileName,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setState({ phase: "error", uploadId: null, error: message, fileName });
    }
  }, [getIdToken]);

  return { state, pickAndUpload, reset, documentPickerAvailability };
}
